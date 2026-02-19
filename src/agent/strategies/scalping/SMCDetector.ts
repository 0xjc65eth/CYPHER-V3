/**
 * CYPHER AI Trading Agent - Smart Money Concepts (SMC) Detector
 *
 * Detects institutional order flow patterns:
 * - Order Blocks (OB)
 * - Fair Value Gaps (FVG)
 * - Liquidity Grabs
 * - Break of Structure (BOS)
 */

import type {
  Candle,
  SMCContext,
  OrderBlock,
  FairValueGap,
  LiquidityGrab,
  BreakOfStructure,
} from '../../core/types';

interface SwingPoint {
  index: number;
  price: number;
  timestamp: number;
}

export class SMCDetector {
  private readonly minImpulsePercent = 0.005; // 0.5% minimum impulse move
  private readonly defaultLookback = 5;

  /**
   * Find swing high points - a candle whose high is higher than
   * `lookback` candles on each side.
   */
  findSwingHighs(candles: Candle[], lookback: number = this.defaultLookback): SwingPoint[] {
    const swings: SwingPoint[] = [];
    if (candles.length < lookback * 2 + 1) return swings;

    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingHigh = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
          isSwingHigh = false;
          break;
        }
      }
      if (isSwingHigh) {
        swings.push({ index: i, price: candles[i].high, timestamp: candles[i].timestamp });
      }
    }
    return swings;
  }

  /**
   * Find swing low points - a candle whose low is lower than
   * `lookback` candles on each side.
   */
  findSwingLows(candles: Candle[], lookback: number = this.defaultLookback): SwingPoint[] {
    const swings: SwingPoint[] = [];
    if (candles.length < lookback * 2 + 1) return swings;

    for (let i = lookback; i < candles.length - lookback; i++) {
      let isSwingLow = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
          isSwingLow = false;
          break;
        }
      }
      if (isSwingLow) {
        swings.push({ index: i, price: candles[i].low, timestamp: candles[i].timestamp });
      }
    }
    return swings;
  }

  /**
   * Detect Order Blocks.
   *
   * Bullish OB: last bearish candle before a strong bullish impulse move.
   * Bearish OB: last bullish candle before a strong bearish impulse move.
   * Impulse must exceed `minImpulsePercent` to qualify.
   */
  detectOrderBlocks(candles: Candle[]): OrderBlock[] {
    const orderBlocks: OrderBlock[] = [];
    if (candles.length < 3) return orderBlocks;

    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const next = candles[i + 1];

      // Bullish OB: bearish candle followed by bullish impulse
      const isBearishCandle = curr.close < curr.open;
      if (isBearishCandle) {
        const impulse = (next.close - curr.close) / curr.close;
        if (impulse > this.minImpulsePercent) {
          const strength = Math.min(impulse / this.minImpulsePercent, 3) / 3;
          orderBlocks.push({
            type: 'bullish',
            high: curr.high,
            low: curr.low,
            strength,
            timestamp: curr.timestamp,
            mitigated: false,
          });
        }
      }

      // Bearish OB: bullish candle followed by bearish impulse
      const isBullishCandle = curr.close > curr.open;
      if (isBullishCandle) {
        const impulse = (curr.close - next.close) / curr.close;
        if (impulse > this.minImpulsePercent) {
          const strength = Math.min(impulse / this.minImpulsePercent, 3) / 3;
          orderBlocks.push({
            type: 'bearish',
            high: curr.high,
            low: curr.low,
            strength,
            timestamp: curr.timestamp,
            mitigated: false,
          });
        }
      }
    }

    // Mark mitigated OBs: price has returned into the OB zone
    const lastCandle = candles[candles.length - 1];
    for (const ob of orderBlocks) {
      if (ob.type === 'bullish' && lastCandle.low <= ob.high) {
        ob.mitigated = true;
      } else if (ob.type === 'bearish' && lastCandle.high >= ob.low) {
        ob.mitigated = true;
      }
    }

    return orderBlocks;
  }

  /**
   * Detect Fair Value Gaps (FVG).
   *
   * Bullish FVG: 3-candle pattern where candle[i+2].low > candle[i].high
   *   (gap between candle 1 high and candle 3 low, unfilled).
   * Bearish FVG: candle[i+2].high < candle[i].low
   *   (gap between candle 1 low and candle 3 high, unfilled).
   */
  detectFVGs(candles: Candle[]): FairValueGap[] {
    const fvgs: FairValueGap[] = [];
    if (candles.length < 3) return fvgs;

    for (let i = 0; i < candles.length - 2; i++) {
      const c1 = candles[i];
      const c3 = candles[i + 2];

      // Bullish FVG
      if (c3.low > c1.high) {
        const top = c3.low;
        const bottom = c1.high;
        fvgs.push({
          type: 'bullish',
          top,
          bottom,
          midpoint: (top + bottom) / 2,
          filled: false,
        });
      }

      // Bearish FVG
      if (c3.high < c1.low) {
        const top = c1.low;
        const bottom = c3.high;
        fvgs.push({
          type: 'bearish',
          top,
          bottom,
          midpoint: (top + bottom) / 2,
          filled: false,
        });
      }
    }

    // Mark filled FVGs: subsequent price action has traded through the gap
    const lastCandle = candles[candles.length - 1];
    for (const fvg of fvgs) {
      if (fvg.type === 'bullish' && lastCandle.low <= fvg.bottom) {
        fvg.filled = true;
      } else if (fvg.type === 'bearish' && lastCandle.high >= fvg.top) {
        fvg.filled = true;
      }
    }

    return fvgs;
  }

  /**
   * Detect Liquidity Grabs.
   *
   * Bullish grab: price dips below a recent swing low then recovers above it.
   * Bearish grab: price spikes above a recent swing high then drops below it.
   */
  detectLiquidityGrabs(candles: Candle[]): LiquidityGrab[] {
    const grabs: LiquidityGrab[] = [];
    if (candles.length < 15) return grabs;

    const swingLows = this.findSwingLows(candles);
    const swingHighs = this.findSwingHighs(candles);

    // Check recent candles for grabs of swing lows (bullish grab)
    for (const swing of swingLows) {
      for (let i = swing.index + 1; i < candles.length; i++) {
        const candle = candles[i];
        // Price dipped below swing low but closed above it
        if (candle.low < swing.price && candle.close > swing.price) {
          const grabDepth = (swing.price - candle.low) / swing.price;
          grabs.push({
            type: 'bullish_grab',
            grabLevel: swing.price,
            recoveryPrice: candle.close,
            strength: Math.min(grabDepth * 100, 1), // normalize
            timestamp: candle.timestamp,
          });
          break; // only count first grab per swing
        }
      }
    }

    // Check recent candles for grabs of swing highs (bearish grab)
    for (const swing of swingHighs) {
      for (let i = swing.index + 1; i < candles.length; i++) {
        const candle = candles[i];
        // Price spiked above swing high but closed below it
        if (candle.high > swing.price && candle.close < swing.price) {
          const grabDepth = (candle.high - swing.price) / swing.price;
          grabs.push({
            type: 'bearish_grab',
            grabLevel: swing.price,
            recoveryPrice: candle.close,
            strength: Math.min(grabDepth * 100, 1),
            timestamp: candle.timestamp,
          });
          break;
        }
      }
    }

    return grabs;
  }

  /**
   * Detect Break of Structure (BOS).
   *
   * Bullish BOS: current close breaks above the last swing high.
   * Bearish BOS: current close breaks below the last swing low.
   * Returns the most recent BOS or null.
   */
  detectBOS(candles: Candle[]): BreakOfStructure | null {
    if (candles.length < 15) return null;

    const swingHighs = this.findSwingHighs(candles);
    const swingLows = this.findSwingLows(candles);
    const lastCandle = candles[candles.length - 1];

    const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null;
    const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : null;

    // Check bullish BOS
    if (lastSwingHigh && lastCandle.close > lastSwingHigh.price) {
      return {
        type: 'bullish',
        brokenLevel: lastSwingHigh.price,
        timestamp: lastCandle.timestamp,
      };
    }

    // Check bearish BOS
    if (lastSwingLow && lastCandle.close < lastSwingLow.price) {
      return {
        type: 'bearish',
        brokenLevel: lastSwingLow.price,
        timestamp: lastCandle.timestamp,
      };
    }

    return null;
  }

  /**
   * Run all SMC detectors and return a full analysis context.
   */
  async getFullAnalysis(candles: Candle[]): Promise<SMCContext> {
    if (candles.length < 3) {
      return {
        structureDirection: 'neutral',
        orderBlocks: [],
        fairValueGaps: [],
        liquidityGrabs: [],
        breakOfStructure: null,
      };
    }

    const orderBlocks = this.detectOrderBlocks(candles);
    const fairValueGaps = this.detectFVGs(candles);
    const liquidityGrabs = this.detectLiquidityGrabs(candles);
    const breakOfStructure = this.detectBOS(candles);

    // Determine overall structure direction from BOS and recent OB bias
    let structureDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (breakOfStructure) {
      structureDirection = breakOfStructure.type;
    } else {
      const recentOBs = orderBlocks.slice(-5);
      const bullishCount = recentOBs.filter(ob => ob.type === 'bullish').length;
      const bearishCount = recentOBs.filter(ob => ob.type === 'bearish').length;
      if (bullishCount > bearishCount) structureDirection = 'bullish';
      else if (bearishCount > bullishCount) structureDirection = 'bearish';
    }

    return {
      structureDirection,
      orderBlocks,
      fairValueGaps,
      liquidityGrabs,
      breakOfStructure,
    };
  }
}
