/**
 * CYPHER AI Trading Agent - Liquidation Cascade Alpha
 * Generates alpha signals from liquidation cascade events.
 * Detects overextended positions being force-closed and trades the reversal.
 */

import { TradeSignal } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { LiquidationTracker, CascadeAlert } from '../data/LiquidationTracker';
import type { MarketDataService } from '../data/MarketDataService';

// ============================================================================
// Types
// ============================================================================

export interface LiquidationAlphaSignal {
  pair: string;
  direction: 'long' | 'short';
  signalType: 'cascade_reversal' | 'cascade_continuation' | 'liquidation_wall';
  confidence: number;
  cascadeVolume: number;
  priceDeviation: number;
  reason: string;
  timestamp: number;
}

export interface LiquidationAlphaConfig {
  minCascadeVolumeUSD: number;     // min cascade volume to trigger signal (default: 1M)
  minPriceDeviation: number;       // min price move during cascade (default: 0.02 = 2%)
  reversalDelay: number;           // ms to wait after cascade before reversal (default: 30000)
  maxActiveCascades: number;       // max simultaneous cascade signals (default: 3)
  minConfidence: number;           // min confidence threshold (default: 0.45)
  volumeDecayThreshold: number;    // volume decay ratio to confirm reversal (default: 0.3)
}

const DEFAULT_CONFIG: LiquidationAlphaConfig = {
  minCascadeVolumeUSD: 1_000_000,
  minPriceDeviation: 0.02,
  reversalDelay: 30000,
  maxActiveCascades: 3,
  minConfidence: 0.45,
  volumeDecayThreshold: 0.3,
};

// ============================================================================
// LiquidationCascadeAlpha
// ============================================================================

export class LiquidationCascadeAlpha {
  private config: LiquidationAlphaConfig;
  private eventBus: AgentEventBus;
  private activeSignals: Map<string, LiquidationAlphaSignal> = new Map();
  private recentCascadeTimestamps: Map<string, number> = new Map();

  constructor(config?: Partial<LiquidationAlphaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  /** Scan for liquidation-based alpha signals */
  scan(
    liquidationTracker: LiquidationTracker,
    marketData: MarketDataService,
    pairs: string[]
  ): LiquidationAlphaSignal[] {
    const signals: LiquidationAlphaSignal[] = [];

    for (const pair of pairs) {
      // Check cascade alerts
      const cascadeSignal = this.evaluateCascade(pair, liquidationTracker, marketData);
      if (cascadeSignal) signals.push(cascadeSignal);

      // Check liquidation walls (potential support/resistance)
      const wallSignal = this.evaluateLiquidationWalls(pair, liquidationTracker, marketData);
      if (wallSignal) signals.push(wallSignal);
    }

    // Limit active signals
    const topSignals = signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxActiveCascades);

    for (const signal of topSignals) {
      this.eventBus.publish({
        type: 'alpha.liquidation_cascade',
        source: 'LiquidationCascadeAlpha',
        data: signal,
        timestamp: Date.now(),
        priority: signal.confidence > 0.7 ? 'high' : 'medium',
      });
    }

    return topSignals;
  }

  // ============================================================================
  // Cascade Analysis
  // ============================================================================

  private evaluateCascade(
    pair: string,
    liquidationTracker: LiquidationTracker,
    marketData: MarketDataService
  ): LiquidationAlphaSignal | null {
    const cascades = liquidationTracker.getActiveCascades().filter(c => c.pair === pair);
    if (cascades.length === 0) return null;

    // Find the largest active cascade
    const biggest = cascades.reduce((max, c) => c.totalSizeUSD > max.totalSizeUSD ? c : max, cascades[0]);

    if (biggest.totalSizeUSD < this.config.minCascadeVolumeUSD) return null;

    // Check price deviation
    const currentPrice = marketData.getMidPrice(pair);
    if (currentPrice <= 0) return null;

    const priceRange = biggest.priceRange;
    const priceDeviation = Math.abs(priceRange.high - priceRange.low) / ((priceRange.high + priceRange.low) / 2);

    if (priceDeviation < this.config.minPriceDeviation) return null;

    // Cooldown check
    const lastCascadeTime = this.recentCascadeTimestamps.get(pair) || 0;
    if (Date.now() - lastCascadeTime < this.config.reversalDelay) return null;

    // Check if cascade is decaying (volume dropping = potential reversal)
    const recentVol = liquidationTracker.getLiquidationVolume(pair, 30000); // last 30s
    const olderVol = liquidationTracker.getLiquidationVolume(pair, 120000); // last 2min
    const decayRatio = olderVol.total > 0 ? recentVol.total / olderVol.total : 1;

    let signalType: 'cascade_reversal' | 'cascade_continuation';
    let direction: 'long' | 'short';

    if (decayRatio < this.config.volumeDecayThreshold) {
      // Cascade is dying down → trade the reversal
      signalType = 'cascade_reversal';
      // If longs were liquidated, price has dropped → buy the dip
      direction = biggest.side === 'long' ? 'long' : 'short';
    } else {
      // Cascade still active → continuation
      signalType = 'cascade_continuation';
      // Continue in the direction of the cascade
      direction = biggest.side === 'long' ? 'short' : 'long';
    }

    // Confidence factors
    const volumeScore = Math.min(1, biggest.totalSizeUSD / 10_000_000);
    const deviationScore = Math.min(1, priceDeviation / 0.05);
    const decayScore = signalType === 'cascade_reversal'
      ? Math.min(1, (1 - decayRatio) * 2)
      : Math.min(1, decayRatio);

    const confidence = volumeScore * 0.4 + deviationScore * 0.3 + decayScore * 0.3;

    if (confidence < this.config.minConfidence) return null;

    this.recentCascadeTimestamps.set(pair, Date.now());

    return {
      pair,
      direction,
      signalType,
      confidence,
      cascadeVolume: biggest.totalSizeUSD,
      priceDeviation,
      reason: `${signalType}: ${biggest.side} cascade $${(biggest.totalSizeUSD / 1e6).toFixed(1)}M, ${biggest.eventCount} events, price moved ${(priceDeviation * 100).toFixed(1)}%, decay ratio ${(decayRatio * 100).toFixed(0)}%`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Liquidation Wall Analysis
  // ============================================================================

  private evaluateLiquidationWalls(
    pair: string,
    liquidationTracker: LiquidationTracker,
    marketData: MarketDataService
  ): LiquidationAlphaSignal | null {
    const currentPrice = marketData.getMidPrice(pair);
    if (currentPrice <= 0) return null;

    const walls = liquidationTracker.getLiquidationWalls(pair, currentPrice, 0.05);

    // Check for significant nearby walls that could act as support/resistance
    const significantBidWalls = walls.longWalls.filter(w => w.estimatedSizeUSD > 500_000);
    const significantAskWalls = walls.shortWalls.filter(w => w.estimatedSizeUSD > 500_000);

    if (significantBidWalls.length === 0 && significantAskWalls.length === 0) return null;

    // If large long liquidation wall above price → shorts will get squeezed above it
    // If large short liquidation wall below price → longs will get stopped below it
    const closestBidWall = significantBidWalls[0];
    const closestAskWall = significantAskWalls[0];

    let direction: 'long' | 'short';
    let wallSize: number;
    let reason: string;

    if (closestBidWall && (!closestAskWall || closestBidWall.estimatedSizeUSD > closestAskWall.estimatedSizeUSD)) {
      // Large liquidation cluster below → likely support zone
      direction = 'long';
      wallSize = closestBidWall.estimatedSizeUSD;
      reason = `Liquidation wall support at $${closestBidWall.price.toFixed(2)} ($${(wallSize / 1e6).toFixed(1)}M)`;
    } else if (closestAskWall) {
      // Large liquidation cluster above → likely resistance
      direction = 'short';
      wallSize = closestAskWall.estimatedSizeUSD;
      reason = `Liquidation wall resistance at $${closestAskWall.price.toFixed(2)} ($${(wallSize / 1e6).toFixed(1)}M)`;
    } else {
      return null;
    }

    const confidence = Math.min(0.6, wallSize / 5_000_000);
    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType: 'liquidation_wall',
      confidence,
      cascadeVolume: wallSize,
      priceDeviation: 0,
      reason,
      timestamp: Date.now(),
    };
  }

  /** Convert to TradeSignal for consensus */
  toTradeSignal(
    alpha: LiquidationAlphaSignal,
    currentPrice: number,
    positionSizeUSD: number
  ): TradeSignal {
    // Tighter stops for cascade trades (high vol environment)
    const stopPct = alpha.signalType === 'cascade_reversal' ? 0.025 : 0.02;
    const tpPct = alpha.signalType === 'cascade_reversal' ? 0.03 : 0.015;

    const stopLoss = alpha.direction === 'long'
      ? currentPrice * (1 - stopPct)
      : currentPrice * (1 + stopPct);

    const tp1 = alpha.direction === 'long'
      ? currentPrice * (1 + tpPct)
      : currentPrice * (1 - tpPct);

    const tp2 = alpha.direction === 'long'
      ? currentPrice * (1 + tpPct * 2)
      : currentPrice * (1 - tpPct * 2);

    return {
      id: `liq_${alpha.pair}_${Date.now()}`,
      direction: alpha.direction,
      pair: alpha.pair,
      exchange: 'hyperliquid',
      entry: currentPrice,
      stopLoss,
      takeProfit: [tp1, tp2],
      confidence: alpha.confidence,
      positionSize: positionSizeUSD,
      leverage: 3,
      strategy: 'scalp',
      reason: alpha.reason,
      timestamp: Date.now(),
    };
  }
}
