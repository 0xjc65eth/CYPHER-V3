/**
 * CYPHER AI Trading Agent - Technical Analyst Agent
 * Analyzes price action using SMC concepts and technical indicators
 * Reuses existing SMCDetector and ScalpingEngine patterns
 */

import { Candle, ConsensusVote, SMCContext } from '../core/types';

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  ema200: number;
  atr: number;
  volume: { current: number; average: number; ratio: number };
  bollingerBands: { upper: number; middle: number; lower: number };
}

export class TechnicalAnalystAgent {
  private name = 'TechnicalAnalyst';

  async analyze(pair: string, candles: Candle[], smcContext?: SMCContext): Promise<ConsensusVote> {
    if (!candles || candles.length < 50) {
      return this.abstainVote('Insufficient candle data');
    }

    try {
      const indicators = this.calculateIndicators(candles);
      const smcSignals = this.analyzeSMC(smcContext);
      const priceAction = this.analyzePriceAction(candles);

      // Scoring system: -1 (bearish) to +1 (bullish)
      let score = 0;
      let reasons: string[] = [];

      // RSI analysis (weight: 0.15)
      if (indicators.rsi < 30) {
        score += 0.15;
        reasons.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
      } else if (indicators.rsi > 70) {
        score -= 0.15;
        reasons.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
      }

      // EMA alignment (weight: 0.20)
      if (indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema200) {
        score += 0.20;
        reasons.push('Bullish EMA alignment (20>50>200)');
      } else if (indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema200) {
        score -= 0.20;
        reasons.push('Bearish EMA alignment (20<50<200)');
      }

      // MACD analysis (weight: 0.15)
      if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
        score += 0.15;
        reasons.push('MACD bullish crossover');
      } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
        score -= 0.15;
        reasons.push('MACD bearish crossover');
      }

      // Volume confirmation (weight: 0.10)
      if (indicators.volume.ratio > 1.5) {
        score += Math.sign(score) * 0.10; // Amplify current direction
        reasons.push(`High volume (${indicators.volume.ratio.toFixed(1)}x avg)`);
      }

      // SMC analysis (weight: 0.25)
      if (smcSignals.score !== 0) {
        score += smcSignals.score * 0.25;
        reasons.push(...smcSignals.reasons);
      }

      // Price action (weight: 0.15)
      score += priceAction.score * 0.15;
      if (priceAction.reasons.length > 0) reasons.push(...priceAction.reasons);

      // Convert score to vote
      const confidence = Math.min(Math.abs(score), 1);
      let direction: ConsensusVote['direction'];

      if (score > 0.1) direction = 'long';
      else if (score < -0.1) direction = 'short';
      else direction = 'neutral';

      return {
        agent: this.name,
        direction,
        confidence,
        positionSize: undefined, // Let risk manager decide
        reasoning: reasons.join('; '),
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.abstainVote(`Analysis error: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  private calculateIndicators(candles: Candle[]): TechnicalIndicators {
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    return {
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      ema20: this.calculateEMA(closes, 20),
      ema50: this.calculateEMA(closes, 50),
      ema200: closes.length >= 200 ? this.calculateEMA(closes, 200) : this.calculateEMA(closes, Math.min(closes.length, 50)),
      atr: this.calculateATR(candles, 14),
      volume: {
        current: volumes[volumes.length - 1] || 0,
        average: volumes.slice(-20).reduce((a, b) => a + b, 0) / 20,
        ratio: volumes[volumes.length - 1] / (volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 || 1),
      },
      bollingerBands: this.calculateBollinger(closes, 20, 2),
    };
  }

  private analyzeSMC(context?: SMCContext): { score: number; reasons: string[] } {
    if (!context) return { score: 0, reasons: [] };

    let score = 0;
    const reasons: string[] = [];

    // Break of structure is the strongest signal
    if (context.breakOfStructure) {
      if (context.breakOfStructure.type === 'bullish') {
        score += 0.4;
        reasons.push('Bullish break of structure');
      } else {
        score -= 0.4;
        reasons.push('Bearish break of structure');
      }
    }

    // Order blocks
    const unmitigatedBullish = context.orderBlocks.filter(ob => ob.type === 'bullish' && !ob.mitigated);
    const unmitigatedBearish = context.orderBlocks.filter(ob => ob.type === 'bearish' && !ob.mitigated);

    if (unmitigatedBullish.length > unmitigatedBearish.length) {
      score += 0.2;
      reasons.push(`${unmitigatedBullish.length} bullish order blocks`);
    } else if (unmitigatedBearish.length > unmitigatedBullish.length) {
      score -= 0.2;
      reasons.push(`${unmitigatedBearish.length} bearish order blocks`);
    }

    // Fair value gaps
    const bullishFVGs = context.fairValueGaps.filter(f => f.type === 'bullish' && !f.filled);
    const bearishFVGs = context.fairValueGaps.filter(f => f.type === 'bearish' && !f.filled);

    if (bullishFVGs.length > 0) {
      score += 0.15;
      reasons.push(`${bullishFVGs.length} unfilled bullish FVGs`);
    }
    if (bearishFVGs.length > 0) {
      score -= 0.15;
      reasons.push(`${bearishFVGs.length} unfilled bearish FVGs`);
    }

    // Liquidity grabs
    const recentGrabs = context.liquidityGrabs.filter(g => Date.now() - g.timestamp < 3600_000);
    for (const grab of recentGrabs) {
      if (grab.type === 'bullish_grab') {
        score += 0.25;
        reasons.push('Recent bullish liquidity grab');
      } else {
        score -= 0.25;
        reasons.push('Recent bearish liquidity grab');
      }
    }

    return { score: Math.max(-1, Math.min(1, score)), reasons };
  }

  private analyzePriceAction(candles: Candle[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const recent = candles.slice(-5);

    // Check for momentum
    const priceChange = (recent[recent.length - 1].close - recent[0].open) / recent[0].open;
    if (priceChange > 0.02) {
      score += 0.5;
      reasons.push(`Strong upward momentum (+${(priceChange * 100).toFixed(1)}%)`);
    } else if (priceChange < -0.02) {
      score -= 0.5;
      reasons.push(`Strong downward momentum (${(priceChange * 100).toFixed(1)}%)`);
    }

    // Check for rejection wicks (reversal signals)
    const lastCandle = recent[recent.length - 1];
    const body = Math.abs(lastCandle.close - lastCandle.open);
    const upperWick = lastCandle.high - Math.max(lastCandle.close, lastCandle.open);
    const lowerWick = Math.min(lastCandle.close, lastCandle.open) - lastCandle.low;

    if (lowerWick > body * 2 && lastCandle.close > lastCandle.open) {
      score += 0.3;
      reasons.push('Bullish hammer/pin bar');
    } else if (upperWick > body * 2 && lastCandle.close < lastCandle.open) {
      score -= 0.3;
      reasons.push('Bearish shooting star');
    }

    return { score: Math.max(-1, Math.min(1, score)), reasons };
  }

  // ============================================================================
  // Technical indicator calculations
  // ============================================================================

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdValue = ema12 - ema26;

    // Simplified signal line
    const recentPrices = prices.slice(-9);
    const signal = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length * 0.001;

    return {
      value: macdValue,
      signal,
      histogram: macdValue - signal,
    };
  }

  private calculateATR(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    let atr = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      atr += tr;
    }
    return atr / period;
  }

  private calculateBollinger(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    const slice = prices.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / slice.length;
    const sd = Math.sqrt(variance);

    return {
      upper: middle + sd * stdDev,
      middle,
      lower: middle - sd * stdDev,
    };
  }

  private abstainVote(reason: string): ConsensusVote {
    return {
      agent: this.name,
      direction: 'abstain',
      confidence: 0,
      reasoning: reason,
      timestamp: Date.now(),
    };
  }
}
