/**
 * CYPHER AI Trading Agent - Volatility Regime Detector
 * Classifies current volatility state using realized vol, ATR, and vol-of-vol.
 */

import { Candle } from '../core/types';

// ============================================================================
// Types
// ============================================================================

export type VolatilityState = 'low' | 'normal' | 'high' | 'extreme';

export interface VolatilityRegimeResult {
  state: VolatilityState;
  realizedVol: number;         // annualized realized volatility
  atr: number;                 // current ATR
  atrPercentile: number;       // ATR percentile over lookback (0-1)
  volOfVol: number;            // volatility of volatility
  expanding: boolean;          // vol increasing
  contracting: boolean;        // vol decreasing
  confidence: number;          // 0-1
  timestamp: number;
}

export interface VolatilityRegimeConfig {
  atrPeriod: number;           // ATR calculation period (default: 14)
  volLookback: number;         // candles for realized vol (default: 20)
  percentileLookback: number;  // candles for ATR percentile (default: 100)
  lowVolThreshold: number;     // percentile below this = low vol (default: 0.25)
  highVolThreshold: number;    // percentile above this = high vol (default: 0.75)
  extremeVolThreshold: number; // percentile above this = extreme (default: 0.95)
}

const DEFAULT_CONFIG: VolatilityRegimeConfig = {
  atrPeriod: 14,
  volLookback: 20,
  percentileLookback: 100,
  lowVolThreshold: 0.25,
  highVolThreshold: 0.75,
  extremeVolThreshold: 0.95,
};

// ============================================================================
// VolatilityRegime
// ============================================================================

export class VolatilityRegime {
  private config: VolatilityRegimeConfig;

  constructor(config?: Partial<VolatilityRegimeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Analyze volatility regime from candle data */
  analyze(candles: Candle[]): VolatilityRegimeResult | null {
    if (candles.length < Math.max(this.config.percentileLookback, this.config.volLookback) + 1) {
      return null;
    }

    // Calculate ATR series
    const atrSeries = this.computeATRSeries(candles, this.config.atrPeriod);
    if (atrSeries.length < this.config.percentileLookback) return null;

    const currentATR = atrSeries[atrSeries.length - 1];
    const currentPrice = candles[candles.length - 1].close;

    // ATR percentile
    const atrPercentile = this.computePercentile(
      atrSeries.slice(-this.config.percentileLookback),
      currentATR
    );

    // Realized volatility (annualized)
    const realizedVol = this.computeRealizedVol(candles, this.config.volLookback);

    // Vol-of-vol (volatility of ATR changes)
    const volOfVol = this.computeVolOfVol(atrSeries.slice(-this.config.volLookback));

    // Determine if expanding or contracting
    const recentATRs = atrSeries.slice(-5);
    const olderATRs = atrSeries.slice(-10, -5);
    const recentAvg = recentATRs.reduce((s, v) => s + v, 0) / recentATRs.length;
    const olderAvg = olderATRs.length > 0
      ? olderATRs.reduce((s, v) => s + v, 0) / olderATRs.length
      : recentAvg;

    const expanding = recentAvg > olderAvg * 1.1;
    const contracting = recentAvg < olderAvg * 0.9;

    // Classify state
    let state: VolatilityState;
    if (atrPercentile >= this.config.extremeVolThreshold) {
      state = 'extreme';
    } else if (atrPercentile >= this.config.highVolThreshold) {
      state = 'high';
    } else if (atrPercentile <= this.config.lowVolThreshold) {
      state = 'low';
    } else {
      state = 'normal';
    }

    // Confidence based on how far from thresholds
    let confidence = 0.5;
    if (state === 'extreme') {
      confidence = 0.7 + (atrPercentile - this.config.extremeVolThreshold) * 3;
    } else if (state === 'high') {
      confidence = 0.6 + (atrPercentile - this.config.highVolThreshold) * 2;
    } else if (state === 'low') {
      confidence = 0.6 + (this.config.lowVolThreshold - atrPercentile) * 2;
    } else {
      // Normal — distance from both thresholds
      const distFromHigh = this.config.highVolThreshold - atrPercentile;
      const distFromLow = atrPercentile - this.config.lowVolThreshold;
      confidence = 0.5 + Math.min(distFromHigh, distFromLow);
    }
    confidence = Math.min(1, Math.max(0, confidence));

    return {
      state,
      realizedVol,
      atr: currentATR,
      atrPercentile,
      volOfVol,
      expanding,
      contracting,
      confidence,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  private computeATRSeries(candles: Candle[], period: number): number[] {
    if (candles.length < period + 1) return [];

    const trValues: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trValues.push(tr);
    }

    // Wilder's smoothed ATR
    const atrSeries: number[] = [];
    let atr = trValues.slice(0, period).reduce((s, v) => s + v, 0) / period;
    atrSeries.push(atr);

    for (let i = period; i < trValues.length; i++) {
      atr = (atr * (period - 1) + trValues[i]) / period;
      atrSeries.push(atr);
    }

    return atrSeries;
  }

  private computeRealizedVol(candles: Candle[], lookback: number): number {
    const recent = candles.slice(-lookback - 1);
    if (recent.length < 2) return 0;

    const logReturns: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      if (recent[i - 1].close > 0 && recent[i].close > 0) {
        logReturns.push(Math.log(recent[i].close / recent[i - 1].close));
      }
    }

    if (logReturns.length === 0) return 0;

    const mean = logReturns.reduce((s, r) => s + r, 0) / logReturns.length;
    const variance = logReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / logReturns.length;

    // Annualize (assuming daily candles = 365, hourly = 8760, etc.)
    // Use sqrt(365) as approximation for crypto (24/7)
    return Math.sqrt(variance) * Math.sqrt(365);
  }

  private computeVolOfVol(atrSeries: number[]): number {
    if (atrSeries.length < 3) return 0;

    const changes: number[] = [];
    for (let i = 1; i < atrSeries.length; i++) {
      if (atrSeries[i - 1] > 0) {
        changes.push(Math.abs(atrSeries[i] - atrSeries[i - 1]) / atrSeries[i - 1]);
      }
    }

    if (changes.length === 0) return 0;

    const mean = changes.reduce((s, c) => s + c, 0) / changes.length;
    const variance = changes.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / changes.length;

    return Math.sqrt(variance);
  }

  private computePercentile(values: number[], target: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = sorted.findIndex(v => v >= target);
    if (idx === -1) return 1;
    return idx / sorted.length;
  }
}
