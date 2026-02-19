/**
 * CYPHER AI Trading Agent - Scalping Engine
 *
 * Combines SMC analysis with technical indicators (RSI, MACD)
 * to generate high-confidence scalping trade signals.
 */

import type { Candle, TradeSignal } from '../../core/types';
import { SMCDetector } from './SMCDetector';

interface ScalpingConfig {
  pair: string;
  exchange: string;
  maxPositionSize: number; // USD
  riskPerTrade: number; // percentage (0-1), e.g. 0.01 = 1%
  accountBalance?: number; // USD
}

interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

export class ScalpingEngine {
  private readonly config: ScalpingConfig;
  private readonly smc: SMCDetector;

  constructor(config: ScalpingConfig) {
    this.config = config;
    this.smc = new SMCDetector();
  }

  /**
   * Scan candles for a scalping entry using SMC confluence + technical indicators.
   *
   * Entry conditions (long example):
   *   Pattern A: Liquidity Grab + RSI oversold (<30) + MACD bullish crossover
   *   Pattern B: FVG + Order Block overlap + Bullish BOS
   *
   * Returns a TradeSignal if confluence is met, otherwise null.
   */
  async scanForEntry(candles: Candle[]): Promise<TradeSignal | null> {
    if (candles.length < 30) return null;

    const smcContext = await this.smc.getFullAnalysis(candles);
    const rsi = this.calculateRSI(candles, 14);
    const macd = this.calculateMACD(candles);
    const lastCandle = candles[candles.length - 1];

    // --- Pattern A: Liquidity Grab + RSI + MACD ---
    const recentBullishGrab = smcContext.liquidityGrabs.find(
      g => g.type === 'bullish_grab' && g.timestamp >= candles[candles.length - 5]?.timestamp
    );
    const recentBearishGrab = smcContext.liquidityGrabs.find(
      g => g.type === 'bearish_grab' && g.timestamp >= candles[candles.length - 5]?.timestamp
    );

    // Long via Pattern A
    if (recentBullishGrab && rsi < 30 && macd.histogram > 0 && macd.macdLine > macd.signalLine) {
      const stopLoss = recentBullishGrab.grabLevel * 0.998; // just below the grab
      const riskDistance = lastCandle.close - stopLoss;
      if (riskDistance <= 0) return null;

      return this.buildSignal({
        direction: 'long',
        entry: lastCandle.close,
        stopLoss,
        riskDistance,
        confidence: 0.75 + recentBullishGrab.strength * 0.15,
        reason: `Bullish liquidity grab at ${recentBullishGrab.grabLevel.toFixed(2)} + RSI oversold (${rsi.toFixed(1)}) + MACD bullish crossover`,
        timestamp: lastCandle.timestamp,
        smcContext,
      });
    }

    // Short via Pattern A
    if (recentBearishGrab && rsi > 70 && macd.histogram < 0 && macd.macdLine < macd.signalLine) {
      const stopLoss = recentBearishGrab.grabLevel * 1.002;
      const riskDistance = stopLoss - lastCandle.close;
      if (riskDistance <= 0) return null;

      return this.buildSignal({
        direction: 'short',
        entry: lastCandle.close,
        stopLoss,
        riskDistance,
        confidence: 0.75 + recentBearishGrab.strength * 0.15,
        reason: `Bearish liquidity grab at ${recentBearishGrab.grabLevel.toFixed(2)} + RSI overbought (${rsi.toFixed(1)}) + MACD bearish crossover`,
        timestamp: lastCandle.timestamp,
        smcContext,
      });
    }

    // --- Pattern B: FVG + Order Block overlap + BOS ---
    if (smcContext.breakOfStructure?.type === 'bullish') {
      const bullishFVGs = smcContext.fairValueGaps.filter(f => f.type === 'bullish' && !f.filled);
      const bullishOBs = smcContext.orderBlocks.filter(ob => ob.type === 'bullish' && !ob.mitigated);

      // Check for FVG/OB overlap
      for (const fvg of bullishFVGs) {
        const overlappingOB = bullishOBs.find(
          ob => ob.low <= fvg.top && ob.high >= fvg.bottom
        );
        if (overlappingOB) {
          const stopLoss = Math.min(fvg.bottom, overlappingOB.low) * 0.998;
          const riskDistance = lastCandle.close - stopLoss;
          if (riskDistance <= 0) continue;

          return this.buildSignal({
            direction: 'long',
            entry: lastCandle.close,
            stopLoss,
            riskDistance,
            confidence: 0.80 + overlappingOB.strength * 0.1,
            reason: `Bullish BOS at ${smcContext.breakOfStructure.brokenLevel.toFixed(2)} + FVG/OB confluence zone ${fvg.bottom.toFixed(2)}-${fvg.top.toFixed(2)}`,
            timestamp: lastCandle.timestamp,
            smcContext,
          });
        }
      }
    }

    if (smcContext.breakOfStructure?.type === 'bearish') {
      const bearishFVGs = smcContext.fairValueGaps.filter(f => f.type === 'bearish' && !f.filled);
      const bearishOBs = smcContext.orderBlocks.filter(ob => ob.type === 'bearish' && !ob.mitigated);

      for (const fvg of bearishFVGs) {
        const overlappingOB = bearishOBs.find(
          ob => ob.low <= fvg.top && ob.high >= fvg.bottom
        );
        if (overlappingOB) {
          const stopLoss = Math.max(fvg.top, overlappingOB.high) * 1.002;
          const riskDistance = stopLoss - lastCandle.close;
          if (riskDistance <= 0) continue;

          return this.buildSignal({
            direction: 'short',
            entry: lastCandle.close,
            stopLoss,
            riskDistance,
            confidence: 0.80 + overlappingOB.strength * 0.1,
            reason: `Bearish BOS at ${smcContext.breakOfStructure.brokenLevel.toFixed(2)} + FVG/OB confluence zone ${fvg.bottom.toFixed(2)}-${fvg.top.toFixed(2)}`,
            timestamp: lastCandle.timestamp,
            smcContext,
          });
        }
      }
    }

    return null;
  }

  /**
   * Calculate position size based on account balance and risk percentage.
   * Ensures the position does not exceed maxPositionSize.
   */
  calculatePositionSize(riskPercent: number): number {
    const balance = this.config.accountBalance ?? 5000;
    const riskAmount = balance * riskPercent;
    return Math.min(riskAmount, this.config.maxPositionSize);
  }

  /**
   * Calculate RSI (Relative Strength Index) using Wilder's smoothing.
   */
  calculateRSI(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 50; // neutral default

    const changes: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      changes.push(candles[i].close - candles[i - 1].close);
    }

    // Initial average gain/loss
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss += Math.abs(changes[i]);
    }
    avgGain /= period;
    avgLoss /= period;

    // Wilder's smoothing for remaining periods
    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence).
   * Uses EMA-12, EMA-26, and Signal EMA-9.
   */
  calculateMACD(candles: Candle[]): MACDResult {
    const closes = candles.map(c => c.close);
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);

    if (ema12.length === 0 || ema26.length === 0) {
      return { macdLine: 0, signalLine: 0, histogram: 0 };
    }

    // Align EMAs to same length (ema26 is shorter)
    const offset = ema12.length - ema26.length;
    const macdLine: number[] = [];
    for (let i = 0; i < ema26.length; i++) {
      macdLine.push(ema12[i + offset] - ema26[i]);
    }

    const signalLine = this.calculateEMA(macdLine, 9);

    if (signalLine.length === 0) {
      const lastMacd = macdLine[macdLine.length - 1];
      return { macdLine: lastMacd, signalLine: lastMacd, histogram: 0 };
    }

    const lastMacd = macdLine[macdLine.length - 1];
    const lastSignal = signalLine[signalLine.length - 1];

    return {
      macdLine: lastMacd,
      signalLine: lastSignal,
      histogram: lastMacd - lastSignal,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private calculateEMA(data: number[], period: number): number[] {
    if (data.length < period) return [];

    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    // SMA for initial value
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    ema.push(sum / period);

    for (let i = period; i < data.length; i++) {
      ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    return ema;
  }

  private buildSignal(params: {
    direction: 'long' | 'short';
    entry: number;
    stopLoss: number;
    riskDistance: number;
    confidence: number;
    reason: string;
    timestamp: number;
    smcContext: any;
  }): TradeSignal {
    const positionSize = this.calculatePositionSize(this.config.riskPerTrade);
    const { direction, entry, stopLoss, riskDistance, confidence, reason, timestamp, smcContext } = params;

    // Take profit at 1.5:1, 2:1, and 3:1 risk-reward
    const tpMultipliers = [1.5, 2.0, 3.0];
    const takeProfit = tpMultipliers.map(m =>
      direction === 'long' ? entry + riskDistance * m : entry - riskDistance * m
    );

    return {
      id: `scalp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      direction,
      pair: this.config.pair,
      exchange: this.config.exchange,
      entry,
      stopLoss,
      takeProfit,
      confidence: Math.min(confidence, 1),
      positionSize,
      leverage: 1,
      strategy: 'scalp',
      reason,
      timestamp,
      smcContext,
    };
  }
}
