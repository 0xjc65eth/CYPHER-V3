/**
 * CYPHER AI Trading Agent - Trend Regime Detector
 * Classifies market trend state using multiple indicators:
 * ADX, moving average alignment, higher-highs/lower-lows.
 */

import { Candle } from '../core/types';

// ============================================================================
// Types
// ============================================================================

export type TrendState = 'strong_uptrend' | 'weak_uptrend' | 'ranging' | 'weak_downtrend' | 'strong_downtrend';

export interface TrendRegimeResult {
  state: TrendState;
  direction: 'up' | 'down' | 'neutral';
  strength: number;          // 0-1, higher = stronger trend
  adx: number;               // average directional index
  plusDI: number;             // +DI
  minusDI: number;            // -DI
  maAlignment: number;        // -1 to 1, MA alignment score
  hhll: number;               // higher-highs/lower-lows score (-1 to 1)
  confidence: number;         // 0-1
  trendAge: number;           // candles since trend started
  timestamp: number;
}

export interface TrendRegimeConfig {
  adxPeriod: number;         // ADX calculation period (default: 14)
  shortMAPeriod: number;     // short MA (default: 9)
  mediumMAPeriod: number;    // medium MA (default: 21)
  longMAPeriod: number;      // long MA (default: 50)
  hhllLookback: number;      // candles for HH/LL analysis (default: 20)
  strongTrendADX: number;    // ADX above this = strong trend (default: 25)
  weakTrendADX: number;      // ADX above this = weak trend (default: 15)
}

const DEFAULT_CONFIG: TrendRegimeConfig = {
  adxPeriod: 14,
  shortMAPeriod: 9,
  mediumMAPeriod: 21,
  longMAPeriod: 50,
  hhllLookback: 20,
  strongTrendADX: 25,
  weakTrendADX: 15,
};

// ============================================================================
// TrendRegime
// ============================================================================

export class TrendRegime {
  private config: TrendRegimeConfig;

  constructor(config?: Partial<TrendRegimeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Analyze trend regime from candle data */
  analyze(candles: Candle[]): TrendRegimeResult | null {
    const minRequired = Math.max(this.config.longMAPeriod, this.config.adxPeriod * 2, this.config.hhllLookback) + 5;
    if (candles.length < minRequired) return null;

    // 1. ADX and DI
    const adxResult = this.computeADX(candles, this.config.adxPeriod);
    if (!adxResult) return null;

    // 2. Moving average alignment
    const maAlignment = this.computeMAAlignment(candles);

    // 3. Higher-highs / Lower-lows
    const hhll = this.computeHHLL(candles, this.config.hhllLookback);

    // 4. Composite direction
    const directionScore = (maAlignment * 0.4) + (hhll * 0.3) +
      ((adxResult.plusDI > adxResult.minusDI ? 1 : -1) * 0.3);

    const direction: 'up' | 'down' | 'neutral' =
      directionScore > 0.15 ? 'up' :
      directionScore < -0.15 ? 'down' : 'neutral';

    // 5. Classify state
    let state: TrendState;
    const { adx } = adxResult;

    if (adx >= this.config.strongTrendADX) {
      state = direction === 'up' ? 'strong_uptrend' :
              direction === 'down' ? 'strong_downtrend' : 'ranging';
    } else if (adx >= this.config.weakTrendADX) {
      state = direction === 'up' ? 'weak_uptrend' :
              direction === 'down' ? 'weak_downtrend' : 'ranging';
    } else {
      state = 'ranging';
    }

    // 6. Trend strength (0-1)
    const strength = Math.min(1, adx / 50);

    // 7. Estimate trend age
    const trendAge = this.estimateTrendAge(candles, direction);

    // 8. Confidence
    const adxConfidence = Math.min(1, adx / 40);
    const alignmentConfidence = Math.abs(maAlignment);
    const hhllConfidence = Math.abs(hhll);
    const confidence = (adxConfidence * 0.4 + alignmentConfidence * 0.3 + hhllConfidence * 0.3);

    return {
      state,
      direction,
      strength,
      adx,
      plusDI: adxResult.plusDI,
      minusDI: adxResult.minusDI,
      maAlignment,
      hhll,
      confidence: Math.min(1, Math.max(0, confidence)),
      trendAge,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // ADX Calculation (Wilder's method)
  // ============================================================================

  private computeADX(candles: Candle[], period: number): { adx: number; plusDI: number; minusDI: number } | null {
    if (candles.length < period * 2 + 1) return null;

    // Calculate +DM, -DM, TR
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];
    const trs: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const highDiff = candles[i].high - candles[i - 1].high;
      const lowDiff = candles[i - 1].low - candles[i].low;

      plusDMs.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDMs.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trs.push(tr);
    }

    // Wilder's smoothing
    let smoothPlusDM = plusDMs.slice(0, period).reduce((s, v) => s + v, 0);
    let smoothMinusDM = minusDMs.slice(0, period).reduce((s, v) => s + v, 0);
    let smoothTR = trs.slice(0, period).reduce((s, v) => s + v, 0);

    const dxValues: number[] = [];

    for (let i = period; i < plusDMs.length; i++) {
      smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDMs[i];
      smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDMs[i];
      smoothTR = smoothTR - (smoothTR / period) + trs[i];

      const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
      const diSum = plusDI + minusDI;
      const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

      dxValues.push(dx);
    }

    if (dxValues.length < period) return null;

    // First ADX = average of first period DX values
    let adx = dxValues.slice(0, period).reduce((s, v) => s + v, 0) / period;

    // Smooth subsequent ADX
    for (let i = period; i < dxValues.length; i++) {
      adx = ((adx * (period - 1)) + dxValues[i]) / period;
    }

    // Final +DI and -DI
    const finalPlusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const finalMinusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

    return { adx, plusDI: finalPlusDI, minusDI: finalMinusDI };
  }

  // ============================================================================
  // Moving Average Alignment
  // ============================================================================

  private computeMAAlignment(candles: Candle[]): number {
    const closes = candles.map(c => c.close);

    const shortMA = this.sma(closes, this.config.shortMAPeriod);
    const mediumMA = this.sma(closes, this.config.mediumMAPeriod);
    const longMA = this.sma(closes, this.config.longMAPeriod);

    if (shortMA === 0 || mediumMA === 0 || longMA === 0) return 0;

    // Score: +1 if perfectly aligned bullish (short > medium > long)
    //        -1 if perfectly aligned bearish (short < medium < long)
    //        0 if mixed
    let score = 0;

    if (shortMA > mediumMA) score += 0.33;
    else if (shortMA < mediumMA) score -= 0.33;

    if (mediumMA > longMA) score += 0.33;
    else if (mediumMA < longMA) score -= 0.33;

    if (shortMA > longMA) score += 0.34;
    else if (shortMA < longMA) score -= 0.34;

    return score;
  }

  private sma(data: number[], period: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  }

  // ============================================================================
  // Higher-Highs / Lower-Lows Analysis
  // ============================================================================

  private computeHHLL(candles: Candle[], lookback: number): number {
    const recent = candles.slice(-lookback);
    if (recent.length < 6) return 0;

    // Find swing highs and lows (simple pivot detection)
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    for (let i = 2; i < recent.length - 2; i++) {
      if (recent[i].high > recent[i - 1].high &&
          recent[i].high > recent[i - 2].high &&
          recent[i].high > recent[i + 1].high &&
          recent[i].high > recent[i + 2].high) {
        swingHighs.push(recent[i].high);
      }
      if (recent[i].low < recent[i - 1].low &&
          recent[i].low < recent[i - 2].low &&
          recent[i].low < recent[i + 1].low &&
          recent[i].low < recent[i + 2].low) {
        swingLows.push(recent[i].low);
      }
    }

    if (swingHighs.length < 2 && swingLows.length < 2) return 0;

    let hhScore = 0;
    let llScore = 0;

    // Higher highs
    if (swingHighs.length >= 2) {
      let hh = 0;
      let lh = 0;
      for (let i = 1; i < swingHighs.length; i++) {
        if (swingHighs[i] > swingHighs[i - 1]) hh++;
        else lh++;
      }
      hhScore = (hh - lh) / (hh + lh);
    }

    // Higher lows / Lower lows
    if (swingLows.length >= 2) {
      let hl = 0;
      let ll = 0;
      for (let i = 1; i < swingLows.length; i++) {
        if (swingLows[i] > swingLows[i - 1]) hl++;
        else ll++;
      }
      llScore = (hl - ll) / (hl + ll);
    }

    return (hhScore + llScore) / 2;
  }

  // ============================================================================
  // Trend Age Estimation
  // ============================================================================

  private estimateTrendAge(candles: Candle[], direction: 'up' | 'down' | 'neutral'): number {
    if (direction === 'neutral' || candles.length < 10) return 0;

    const shortPeriod = Math.min(9, candles.length - 1);
    let age = 0;

    // Count candles back until short MA crosses the opposite direction
    for (let i = candles.length - 1; i >= shortPeriod; i--) {
      const maSlice = candles.slice(i - shortPeriod, i + 1);
      const ma = maSlice.reduce((s, c) => s + c.close, 0) / maSlice.length;
      const price = candles[i].close;

      if (direction === 'up' && price < ma) break;
      if (direction === 'down' && price > ma) break;
      age++;
    }

    return age;
  }
}
