/**
 * CYPHER AI Trading Agent - Memecoin Scalping Strategy
 * Detects new tokens via Pump.fun, validates, enters with aggressive SL/TP
 */

import { PumpFunToken } from '../../connectors/PumpFunConnector';

export interface MemeTradeSignal {
  id: string;
  mint: string;
  symbol: string;
  action: 'buy' | 'sell';
  amountSol: number;
  confidence: number; // 0-1
  reason: string;
  stopLossPercent: number; // e.g. 0.15 = -15%
  takeProfitLevels: number[]; // e.g. [0.20, 0.50, 1.00] = +20%, +50%, +100%
  maxHoldMs: number; // max hold time before forced exit
  timestamp: number;
}

export interface MemePosition {
  mint: string;
  symbol: string;
  entryPriceSol: number;
  tokenAmount: number;
  solInvested: number;
  enteredAt: number;
  stopLossPercent: number;
  takeProfitLevels: number[];
  maxHoldMs: number;
  realized: boolean;
}

interface MemeScalpingConfig {
  maxPositionSol: number; // Max SOL per trade
  maxPortfolioPercent: number; // Max % of portfolio per memecoin (0.10 = 10%)
  stopLossPercent: number; // Default -15%
  takeProfitLevels: number[]; // Default [0.20, 0.50, 1.00]
  maxHoldMs: number; // Default 30 min
  minLiquiditySol: number; // Min bonding curve liquidity
  minHolders: number; // Min holders before entry
  maxBondingCurveProgress: number; // Max bonding curve % (e.g. 80 = before graduation)
  volumeSpikeMultiplier: number; // Volume must be Nx above baseline
}

const DEFAULT_MEME_CONFIG: MemeScalpingConfig = {
  maxPositionSol: 0.5,
  maxPortfolioPercent: 0.10,
  stopLossPercent: 0.15,
  takeProfitLevels: [0.20, 0.50, 1.00],
  maxHoldMs: 30 * 60 * 1000, // 30 minutes
  minLiquiditySol: 5,
  minHolders: 50,
  maxBondingCurveProgress: 80,
  volumeSpikeMultiplier: 5,
};

export class MemeScalpingEngine {
  private config: MemeScalpingConfig;
  private positions: Map<string, MemePosition> = new Map();
  private recentVolumes: Map<string, number[]> = new Map(); // mint -> [volume snapshots]

  constructor(config?: Partial<MemeScalpingConfig>) {
    this.config = { ...DEFAULT_MEME_CONFIG, ...config };
  }

  /**
   * Evaluate a newly detected token for entry
   */
  evaluateToken(token: PumpFunToken, portfolioValueSol: number): MemeTradeSignal | null {
    // Already have a position
    if (this.positions.has(token.mint)) return null;

    // Basic filters
    if (token.graduated) return null; // Already on Raydium, different dynamics
    if (token.liquiditySol < this.config.minLiquiditySol) return null;
    if (token.holders < this.config.minHolders) return null;
    if (token.bondingCurveProgress > this.config.maxBondingCurveProgress) return null;
    if (token.mintAuthority === 'active') return null; // Rug risk

    // Volume spike detection
    const volumeHistory = this.recentVolumes.get(token.mint) || [];
    const hasVolumeSpike = this.detectVolumeSpike(token, volumeHistory);

    // Calculate confidence
    let confidence = 0.5; // base

    // Holder growth bonus
    if (token.holders > 100) confidence += 0.05;
    if (token.holders > 200) confidence += 0.05;

    // Liquidity bonus
    if (token.liquiditySol > 10) confidence += 0.05;
    if (token.liquiditySol > 20) confidence += 0.05;

    // Bonding curve progress (mid-range is ideal)
    if (token.bondingCurveProgress > 20 && token.bondingCurveProgress < 60) confidence += 0.10;

    // Volume spike bonus
    if (hasVolumeSpike) confidence += 0.15;

    // Mint authority renounced bonus
    if (token.mintAuthority === 'renounced') confidence += 0.05;

    // Minimum confidence threshold
    if (confidence < 0.60) return null;

    // Calculate position size
    const maxSol = Math.min(
      this.config.maxPositionSol,
      portfolioValueSol * this.config.maxPortfolioPercent,
    );

    return {
      id: `meme_${token.mint.slice(0, 8)}_${Date.now()}`,
      mint: token.mint,
      symbol: token.symbol,
      action: 'buy',
      amountSol: maxSol,
      confidence,
      reason: this.buildReason(token, hasVolumeSpike),
      stopLossPercent: this.config.stopLossPercent,
      takeProfitLevels: this.config.takeProfitLevels,
      maxHoldMs: this.config.maxHoldMs,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if an existing position should be exited
   */
  shouldExit(position: MemePosition, currentPriceSol: number): {
    shouldExit: boolean;
    reason: string;
    exitPercent: number; // % of position to exit
  } {
    const pnlPercent = (currentPriceSol - position.entryPriceSol) / position.entryPriceSol;
    const holdTime = Date.now() - position.enteredAt;

    // Stop loss hit
    if (pnlPercent <= -position.stopLossPercent) {
      return { shouldExit: true, reason: `Stop loss hit: ${(pnlPercent * 100).toFixed(1)}%`, exitPercent: 1.0 };
    }

    // Max hold time exceeded
    if (holdTime >= position.maxHoldMs) {
      return { shouldExit: true, reason: `Max hold time exceeded (${Math.floor(holdTime / 60000)}min)`, exitPercent: 1.0 };
    }

    // Take profit levels (scaled exit)
    for (let i = position.takeProfitLevels.length - 1; i >= 0; i--) {
      if (pnlPercent >= position.takeProfitLevels[i]) {
        const exitPct = i === position.takeProfitLevels.length - 1 ? 1.0 : 0.33;
        return {
          shouldExit: true,
          reason: `Take profit level ${i + 1} hit: +${(pnlPercent * 100).toFixed(1)}%`,
          exitPercent: exitPct,
        };
      }
    }

    return { shouldExit: false, reason: '', exitPercent: 0 };
  }

  /**
   * Record a new volume snapshot for a token
   */
  recordVolume(mint: string, volumeSol: number): void {
    const history = this.recentVolumes.get(mint) || [];
    history.push(volumeSol);
    // Keep last 12 snapshots (1 hour at 5min intervals)
    if (history.length > 12) history.shift();
    this.recentVolumes.set(mint, history);
  }

  /**
   * Track a new position
   */
  addPosition(pos: MemePosition): void {
    this.positions.set(pos.mint, pos);
  }

  /**
   * Remove a closed position
   */
  removePosition(mint: string): void {
    this.positions.delete(mint);
  }

  getPositions(): MemePosition[] {
    return Array.from(this.positions.values());
  }

  private detectVolumeSpike(_token: PumpFunToken, history: number[]): boolean {
    if (history.length < 3) return false;
    const baseline = history.slice(0, -1).reduce((a, b) => a + b, 0) / (history.length - 1);
    const latest = history[history.length - 1];
    return baseline > 0 && latest >= baseline * this.config.volumeSpikeMultiplier;
  }

  private buildReason(token: PumpFunToken, hasVolumeSpike: boolean): string {
    const parts: string[] = [];
    parts.push(`${token.symbol} on Pump.fun`);
    parts.push(`liquidity: ${token.liquiditySol.toFixed(1)} SOL`);
    parts.push(`holders: ${token.holders}`);
    parts.push(`bonding: ${token.bondingCurveProgress.toFixed(0)}%`);
    if (hasVolumeSpike) parts.push('VOLUME SPIKE');
    if (token.mintAuthority === 'renounced') parts.push('mint renounced');
    return parts.join(' | ');
  }
}
