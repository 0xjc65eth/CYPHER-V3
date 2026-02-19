/**
 * Smart Money Concepts (SMC) Detector
 * Identifies institutional trading patterns:
 * - Order Blocks (OB): Areas where institutions accumulated/distributed
 * - Fair Value Gaps (FVG): Price gaps that may fill later
 * - Liquidity Zones: Areas with clustered stop losses
 * - Market Structure: Higher highs, lower lows, break of structure
 */

import { dbService } from '@/lib/database/db-service';
import { cache } from '@/lib/cache/redis.config';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlock {
  id: string;
  asset: string;
  timeframe: string;
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  price: number; // Center price
  strength: number; // 1-10
  volume: number;
  timestamp: number;
  expiresAt: number;
  distancePercent: number;
  fillProbability: number; // 0-100
}

export interface FairValueGap {
  id: string;
  asset: string;
  timeframe: string;
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  gapSize: number;
  fillPercentage: number; // 0-100 (how much has been filled)
  timestamp: number;
  fillProbability: number;
}

export interface LiquidityZone {
  id: string;
  asset: string;
  price: number;
  type: 'buy_stops' | 'sell_stops';
  strength: number;
  timestamp: number;
}

export interface MarketStructure {
  trend: 'bullish' | 'bearish' | 'neutral';
  lastBreak: 'break_of_structure' | 'change_of_character' | null;
  higherHighs: number[];
  lowerLows: number[];
  swingHighs: number[];
  swingLows: number[];
}

class SMCDetector {
  /**
   * Detect Order Blocks from candlestick data
   * An Order Block is formed when a strong candle is followed by a series
   * of candles that don't break the original candle's high/low
   */
  detectOrderBlocks(candles: Candle[], asset: string, timeframe: string): OrderBlock[] {
    const orderBlocks: OrderBlock[] = [];
    const minVolume = this.calculateAverageVolume(candles) * 1.5; // 1.5x average

    for (let i = 2; i < candles.length - 1; i++) {
      const prevCandle = candles[i - 1];
      const currentCandle = candles[i];
      const nextCandle = candles[i + 1];

      // Bullish Order Block: Strong green candle followed by pullback
      if (
        currentCandle.close > currentCandle.open && // Green candle
        currentCandle.volume > minVolume && // High volume
        currentCandle.close - currentCandle.open > (currentCandle.high - currentCandle.low) * 0.6 && // Strong body
        nextCandle.low > currentCandle.low // Price respects the low
      ) {
        const strength = this.calculateOrderBlockStrength(candles, i, 'bullish');
        const currentPrice = candles[candles.length - 1].close;
        const distancePercent = ((currentCandle.low - currentPrice) / currentPrice) * 100;

        orderBlocks.push({
          id: crypto.randomUUID(),
          asset,
          timeframe,
          type: 'bullish',
          high: currentCandle.high,
          low: currentCandle.low,
          price: (currentCandle.high + currentCandle.low) / 2,
          strength,
          volume: currentCandle.volume,
          timestamp: currentCandle.timestamp,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
          distancePercent: Math.abs(distancePercent),
          fillProbability: this.calculateFillProbability(distancePercent, strength)
        });
      }

      // Bearish Order Block: Strong red candle followed by retest
      if (
        currentCandle.close < currentCandle.open && // Red candle
        currentCandle.volume > minVolume &&
        currentCandle.open - currentCandle.close > (currentCandle.high - currentCandle.low) * 0.6 &&
        nextCandle.high < currentCandle.high
      ) {
        const strength = this.calculateOrderBlockStrength(candles, i, 'bearish');
        const currentPrice = candles[candles.length - 1].close;
        const distancePercent = ((currentCandle.high - currentPrice) / currentPrice) * 100;

        orderBlocks.push({
          id: crypto.randomUUID(),
          asset,
          timeframe,
          type: 'bearish',
          high: currentCandle.high,
          low: currentCandle.low,
          price: (currentCandle.high + currentCandle.low) / 2,
          strength,
          volume: currentCandle.volume,
          timestamp: currentCandle.timestamp,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          distancePercent: Math.abs(distancePercent),
          fillProbability: this.calculateFillProbability(distancePercent, strength)
        });
      }
    }

    return orderBlocks;
  }

  /**
   * Detect Fair Value Gaps (FVG)
   * A FVG occurs when there's a gap between candle 1's high and candle 3's low
   */
  detectFairValueGaps(candles: Candle[], asset: string, timeframe: string): FairValueGap[] {
    const gaps: FairValueGap[] = [];

    for (let i = 0; i < candles.length - 2; i++) {
      const candle1 = candles[i];
      const candle2 = candles[i + 1];
      const candle3 = candles[i + 2];

      // Bullish FVG: Gap between candle1 high and candle3 low
      if (candle3.low > candle1.high) {
        const gapSize = candle3.low - candle1.high;
        const gapSizePercent = (gapSize / candle1.high) * 100;

        if (gapSizePercent > 0.1) { // Only significant gaps (> 0.1%)
          gaps.push({
            id: crypto.randomUUID(),
            asset,
            timeframe,
            type: 'bullish',
            high: candle3.low,
            low: candle1.high,
            gapSize,
            fillPercentage: 0,
            timestamp: candle3.timestamp,
            fillProbability: 75 // Historical fill rate ~75%
          });
        }
      }

      // Bearish FVG: Gap between candle1 low and candle3 high
      if (candle3.high < candle1.low) {
        const gapSize = candle1.low - candle3.high;
        const gapSizePercent = (gapSize / candle1.low) * 100;

        if (gapSizePercent > 0.1) {
          gaps.push({
            id: crypto.randomUUID(),
            asset,
            timeframe,
            type: 'bearish',
            high: candle1.low,
            low: candle3.high,
            gapSize,
            fillPercentage: 0,
            timestamp: candle3.timestamp,
            fillProbability: 75
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Detect Market Structure (Higher Highs, Lower Lows)
   */
  detectMarketStructure(candles: Candle[]): MarketStructure {
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    // Identify swing highs and lows (simple pivot detection)
    for (let i = 2; i < candles.length - 2; i++) {
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const current = candles[i];
      const next1 = candles[i + 1];
      const next2 = candles[i + 2];

      // Swing High: current high > surrounding highs
      if (
        current.high > prev2.high &&
        current.high > prev1.high &&
        current.high > next1.high &&
        current.high > next2.high
      ) {
        swingHighs.push(current.high);
      }

      // Swing Low: current low < surrounding lows
      if (
        current.low < prev2.low &&
        current.low < prev1.low &&
        current.low < next1.low &&
        current.low < next2.low
      ) {
        swingLows.push(current.low);
      }
    }

    // Determine trend based on swing points
    const higherHighs: number[] = [];
    const lowerLows: number[] = [];

    for (let i = 1; i < swingHighs.length; i++) {
      if (swingHighs[i] > swingHighs[i - 1]) higherHighs.push(swingHighs[i]);
    }

    for (let i = 1; i < swingLows.length; i++) {
      if (swingLows[i] < swingLows[i - 1]) lowerLows.push(swingLows[i]);
    }

    const trend: 'bullish' | 'bearish' | 'neutral' =
      higherHighs.length > lowerLows.length ? 'bullish' :
      lowerLows.length > higherHighs.length ? 'bearish' : 'neutral';

    return {
      trend,
      lastBreak: null, // Simplified - would need more complex logic
      higherHighs,
      lowerLows,
      swingHighs,
      swingLows
    };
  }

  /**
   * Save SMC signals to database
   */
  async saveSignals(orderBlocks: OrderBlock[], fairValueGaps: FairValueGap[]): Promise<void> {
    try {
      // Save Order Blocks
      for (const ob of orderBlocks) {
        await dbService.query(
          `INSERT INTO smc_signals
          (id, asset, timeframe, signal_type, direction, price, high, low, strength, volume, fill_probability, distance_percent, expires_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, to_timestamp($13 / 1000), to_timestamp($14 / 1000))
          ON CONFLICT (id) DO NOTHING`,
          [
            ob.id,
            ob.asset,
            ob.timeframe,
            'order_block',
            ob.type,
            ob.price,
            ob.high,
            ob.low,
            ob.strength,
            ob.volume,
            ob.fillProbability,
            ob.distancePercent,
            ob.expiresAt,
            ob.timestamp
          ]
        );
      }

      // Save Fair Value Gaps
      for (const fvg of fairValueGaps) {
        await dbService.query(
          `INSERT INTO smc_signals
          (id, asset, timeframe, signal_type, direction, price, high, low, fill_probability, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000))
          ON CONFLICT (id) DO NOTHING`,
          [
            fvg.id,
            fvg.asset,
            fvg.timeframe,
            'fair_value_gap',
            fvg.type,
            (fvg.high + fvg.low) / 2,
            fvg.high,
            fvg.low,
            fvg.fillProbability,
            fvg.timestamp
          ]
        );
      }

      // Saved SMC signals to database
    } catch (error) {
      console.error('Error saving SMC signals:', error);
    }
  }

  /**
   * Helper: Calculate average volume
   */
  private calculateAverageVolume(candles: Candle[]): number {
    const sum = candles.reduce((acc, c) => acc + c.volume, 0);
    return sum / candles.length;
  }

  /**
   * Helper: Calculate Order Block strength (1-10)
   */
  private calculateOrderBlockStrength(candles: Candle[], index: number, type: 'bullish' | 'bearish'): number {
    const currentCandle = candles[index];
    const avgVolume = this.calculateAverageVolume(candles);

    // Factors:
    // 1. Volume (30%)
    // 2. Candle size (30%)
    // 3. Number of retests (40%)

    const volumeRatio = currentCandle.volume / avgVolume;
    const candleSize = currentCandle.high - currentCandle.low;
    const avgCandleSize = candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
    const sizeRatio = candleSize / avgCandleSize;

    // Count retests
    let retests = 0;
    for (let i = index + 1; i < Math.min(index + 20, candles.length); i++) {
      if (type === 'bullish' && candles[i].low <= currentCandle.high && candles[i].low >= currentCandle.low) {
        retests++;
      } else if (type === 'bearish' && candles[i].high >= currentCandle.low && candles[i].high <= currentCandle.high) {
        retests++;
      }
    }

    const volumeScore = Math.min(volumeRatio * 3, 3);
    const sizeScore = Math.min(sizeRatio * 3, 3);
    const retestScore = Math.min(retests / 2, 4);

    return Math.round(volumeScore + sizeScore + retestScore);
  }

  /**
   * Helper: Calculate fill probability based on distance and strength
   */
  private calculateFillProbability(distancePercent: number, strength: number): number {
    // Closer = higher probability, stronger = higher probability
    const distanceFactor = Math.max(0, 100 - Math.abs(distancePercent) * 10);
    const strengthFactor = strength * 10;

    return Math.min(100, Math.round((distanceFactor + strengthFactor) / 2));
  }
}

// Export singleton
export const smcDetector = new SMCDetector();
