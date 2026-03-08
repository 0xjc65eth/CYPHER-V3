/**
 * CYPHER AI Trading Agent - IPO Strategy Engine
 * Specialized strategy for newly listed / high-volatility launch pairs.
 * Uses 1-minute candles for faster signal detection.
 *
 * Entry: Listing age 2min-24h, volume spike ≥ 3x, directional momentum.
 * Exit: 15min max hold, 2% profit target, 1.5% stop loss, volume collapse.
 */

import type { Candle, TradeSignal, HyperliquidPairMeta } from '../../core/types';

export interface IPOStrategyConfig {
  pair: string;
  exchange: string;
  maxPositionSize: number;
  accountBalance: number;
  volumeSpikeMultiplier?: number;
  profitTargetPct?: number;
  stopLossPct?: number;
  maxHoldMinutes?: number;
  minListingAgeMinutes?: number;
  maxListingAgeHours?: number;
}

interface Position {
  pair: string;
  direction: 'long' | 'short';
  entryPrice: number;
  size: number;
  entryTime: number;
  unrealizedPnl: number;
}

export class IPOStrategyEngine {
  private config: IPOStrategyConfig;
  private readonly volumeSpikeMultiplier: number;
  private readonly profitTargetPct: number;
  private readonly stopLossPct: number;
  private readonly maxHoldMinutes: number;
  private readonly minListingAgeMinutes: number;
  private readonly maxListingAgeHours: number;

  constructor(config: IPOStrategyConfig) {
    this.config = config;
    this.volumeSpikeMultiplier = config.volumeSpikeMultiplier ?? 3;
    this.profitTargetPct = config.profitTargetPct ?? 0.02;
    this.stopLossPct = config.stopLossPct ?? 0.015;
    this.maxHoldMinutes = config.maxHoldMinutes ?? 15;
    this.minListingAgeMinutes = config.minListingAgeMinutes ?? 2;
    this.maxListingAgeHours = config.maxListingAgeHours ?? 24;
  }

  /**
   * Scan 1-minute candles for an IPO entry signal.
   */
  async scanForEntry(candles: Candle[], meta: HyperliquidPairMeta): Promise<TradeSignal | null> {
    if (candles.length < 5) return null;

    // Check listing age
    const ageMs = Date.now() - meta.discoveredAt;
    const ageMinutes = ageMs / 60_000;
    const ageHours = ageMs / 3_600_000;

    if (ageMinutes < this.minListingAgeMinutes) return null; // Too early
    if (ageHours > this.maxListingAgeHours) return null;     // Too old for IPO

    // Check volume spike
    const spike = this.detectVolumeSpike(candles);
    if (!spike.isSpike) return null;

    // Check price discovery direction
    const discovery = this.detectPriceDiscovery(candles);
    if (discovery.direction === 'neutral') return null;

    const lastCandle = candles[candles.length - 1];
    const direction = discovery.direction === 'up' ? 'long' : 'short';
    const entry = lastCandle.close;

    // Calculate volatility for stop/target
    const volatility = this.calculateVolatility(candles);
    const stopLoss = this.calculateStopLoss(entry, direction, volatility);
    const takeProfit = direction === 'long'
      ? entry * (1 + this.profitTargetPct)
      : entry * (1 - this.profitTargetPct);

    // Position size: conservative for IPO (smaller due to high volatility)
    const riskPerTrade = 0.005; // 0.5% risk for IPO
    const positionSize = Math.min(
      this.config.maxPositionSize,
      this.config.accountBalance * riskPerTrade,
    );

    // Confidence based on volume spike strength + price momentum alignment
    const confidence = Math.min(0.85, 0.55 + spike.multiplier * 0.05 + (discovery.expanding ? 0.1 : 0));

    return {
      id: `ipo_${this.config.pair}_${Date.now().toString(36)}`,
      direction,
      pair: this.config.pair,
      exchange: this.config.exchange,
      entry,
      stopLoss,
      takeProfit: [takeProfit],
      confidence,
      positionSize,
      leverage: 2, // Conservative leverage for IPO
      strategy: 'ipo',
      reason: `IPO entry: ${spike.multiplier.toFixed(1)}x volume spike, ${discovery.direction} momentum, listing age ${ageMinutes.toFixed(0)}min`,
      timestamp: Date.now(),
    };
  }

  /**
   * Detect volume spike: compare last 3 candles vs prior average.
   */
  detectVolumeSpike(candles: Candle[]): { isSpike: boolean; multiplier: number } {
    if (candles.length < 10) return { isSpike: false, multiplier: 1 };

    const recentVolume = candles.slice(-3).reduce((sum, c) => sum + c.volume, 0) / 3;
    const priorCandles = candles.slice(-10, -3);
    const priorVolume = priorCandles.reduce((sum, c) => sum + c.volume, 0) / priorCandles.length;

    if (priorVolume === 0) return { isSpike: recentVolume > 0, multiplier: recentVolume > 0 ? 10 : 0 };

    const multiplier = recentVolume / priorVolume;
    return {
      isSpike: multiplier >= this.volumeSpikeMultiplier,
      multiplier,
    };
  }

  /**
   * Detect price discovery phase: expanding ranges with directional bias.
   */
  detectPriceDiscovery(candles: Candle[]): { expanding: boolean; direction: 'up' | 'down' | 'neutral' } {
    if (candles.length < 5) return { expanding: false, direction: 'neutral' };

    const recent = candles.slice(-5);

    // Check if 3+ consecutive candles in same direction
    let upCount = 0;
    let downCount = 0;
    for (const c of recent) {
      if (c.close > c.open) upCount++;
      else if (c.close < c.open) downCount++;
    }

    // Check range expansion (higher highs + lower lows or vice versa)
    const ranges = recent.map(c => c.high - c.low);
    const expanding = ranges[ranges.length - 1] > ranges[0] * 1.2;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (upCount >= 3) direction = 'up';
    else if (downCount >= 3) direction = 'down';

    return { expanding, direction };
  }

  /**
   * Determine if an existing position should be exited.
   */
  shouldExit(position: Position, candles: Candle[]): { exit: boolean; reason: string } {
    const lastCandle = candles[candles.length - 1];
    const holdTime = Date.now() - position.entryTime;
    const holdMinutes = holdTime / 60_000;

    // Time-based exit
    if (holdMinutes >= this.maxHoldMinutes) {
      return { exit: true, reason: `Max hold time exceeded (${holdMinutes.toFixed(0)}min)` };
    }

    // Profit target
    const pnlPct = position.direction === 'long'
      ? (lastCandle.close - position.entryPrice) / position.entryPrice
      : (position.entryPrice - lastCandle.close) / position.entryPrice;

    if (pnlPct >= this.profitTargetPct) {
      return { exit: true, reason: `Profit target hit (${(pnlPct * 100).toFixed(2)}%)` };
    }

    // Stop loss
    if (pnlPct <= -this.stopLossPct) {
      return { exit: true, reason: `Stop loss hit (${(pnlPct * 100).toFixed(2)}%)` };
    }

    // Volume collapse (momentum dying)
    if (candles.length >= 5) {
      const spike = this.detectVolumeSpike(candles);
      if (!spike.isSpike && spike.multiplier < 1.5 && holdMinutes > 5) {
        return { exit: true, reason: `Volume collapsed (${spike.multiplier.toFixed(1)}x)` };
      }
    }

    return { exit: false, reason: '' };
  }

  /**
   * Calculate stop loss price based on entry, direction, and volatility.
   */
  calculateStopLoss(entry: number, direction: 'long' | 'short', volatility: number): number {
    // Use max of configured stop loss % or 2x volatility
    const stopPct = Math.max(this.stopLossPct, volatility * 2);

    return direction === 'long'
      ? entry * (1 - stopPct)
      : entry * (1 + stopPct);
  }

  private calculateVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 0.01;

    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      if (candles[i - 1].close > 0) {
        returns.push(Math.log(candles[i].close / candles[i - 1].close));
      }
    }

    if (returns.length === 0) return 0.01;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance);
  }
}
