/**
 * CYPHER AI Trading Agent - Perp-Spot Spread Alpha
 * Detects premium/discount between perpetual and spot prices.
 * Generates mean-reversion signals when spread deviates significantly.
 */

import { TradeSignal } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { MarketDataService } from '../data/MarketDataService';

// ============================================================================
// Types
// ============================================================================

export interface SpreadSnapshot {
  pair: string;
  perpPrice: number;
  spotPrice: number;
  spreadAbsolute: number;
  spreadBps: number;
  premium: boolean;        // perp > spot
  timestamp: number;
}

export interface SpreadAlphaSignal {
  pair: string;
  direction: 'long' | 'short';
  signalType: 'premium_reversion' | 'discount_reversion' | 'spread_expansion';
  confidence: number;
  currentSpreadBps: number;
  averageSpreadBps: number;
  zScore: number;
  reason: string;
  timestamp: number;
}

export interface SpreadAlphaConfig {
  minSpreadBps: number;           // min spread to consider (default: 20)
  zScoreThreshold: number;        // min z-score for signal (default: 2.0)
  lookbackPeriods: number;        // periods for average calculation (default: 100)
  maxHistoryPerPair: number;      // max spread history entries (default: 500)
  minConfidence: number;          // min confidence threshold (default: 0.4)
  enablePremiumReversion: boolean;
  enableDiscountReversion: boolean;
}

const DEFAULT_CONFIG: SpreadAlphaConfig = {
  minSpreadBps: 20,
  zScoreThreshold: 2.0,
  lookbackPeriods: 100,
  maxHistoryPerPair: 500,
  minConfidence: 0.4,
  enablePremiumReversion: true,
  enableDiscountReversion: true,
};

// ============================================================================
// PerpSpotSpreadAlpha
// ============================================================================

export class PerpSpotSpreadAlpha {
  private config: SpreadAlphaConfig;
  private eventBus: AgentEventBus;

  // pair -> spread history
  private spreadHistory: Map<string, SpreadSnapshot[]> = new Map();

  constructor(config?: Partial<SpreadAlphaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Data Ingestion
  // ============================================================================

  /** Record a spread observation */
  recordSpread(pair: string, perpPrice: number, spotPrice: number): void {
    if (perpPrice <= 0 || spotPrice <= 0) return;

    const mid = (perpPrice + spotPrice) / 2;
    const spreadAbsolute = perpPrice - spotPrice;
    const spreadBps = (spreadAbsolute / mid) * 10000;

    const snapshot: SpreadSnapshot = {
      pair,
      perpPrice,
      spotPrice,
      spreadAbsolute,
      spreadBps,
      premium: perpPrice > spotPrice,
      timestamp: Date.now(),
    };

    if (!this.spreadHistory.has(pair)) {
      this.spreadHistory.set(pair, []);
    }

    const history = this.spreadHistory.get(pair)!;
    history.push(snapshot);

    if (history.length > this.config.maxHistoryPerPair) {
      this.spreadHistory.set(pair, history.slice(-this.config.maxHistoryPerPair));
    }
  }

  // ============================================================================
  // Signal Generation
  // ============================================================================

  /** Scan for spread-based alpha signals */
  scan(pairs: string[]): SpreadAlphaSignal[] {
    const signals: SpreadAlphaSignal[] = [];

    for (const pair of pairs) {
      const signal = this.evaluateSpread(pair);
      if (signal) signals.push(signal);
    }

    for (const signal of signals) {
      this.eventBus.publish({
        type: 'alpha.spread',
        source: 'PerpSpotSpreadAlpha',
        data: signal,
        timestamp: Date.now(),
        priority: signal.confidence > 0.7 ? 'high' : 'medium',
      });
    }

    return signals;
  }

  private evaluateSpread(pair: string): SpreadAlphaSignal | null {
    const history = this.spreadHistory.get(pair);
    if (!history || history.length < this.config.lookbackPeriods) return null;

    const recent = history.slice(-this.config.lookbackPeriods);
    const spreads = recent.map(s => s.spreadBps);
    const currentSpread = spreads[spreads.length - 1];

    // Statistics
    const mean = spreads.reduce((s, v) => s + v, 0) / spreads.length;
    const variance = spreads.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / spreads.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null;

    const zScore = (currentSpread - mean) / stdDev;

    if (Math.abs(zScore) < this.config.zScoreThreshold) return null;
    if (Math.abs(currentSpread) < this.config.minSpreadBps) return null;

    let signalType: 'premium_reversion' | 'discount_reversion' | 'spread_expansion';
    let direction: 'long' | 'short';

    if (zScore > this.config.zScoreThreshold && this.config.enablePremiumReversion) {
      // Perp premium too high → expect reversion → short perp
      signalType = 'premium_reversion';
      direction = 'short';
    } else if (zScore < -this.config.zScoreThreshold && this.config.enableDiscountReversion) {
      // Perp discount too deep → expect reversion → long perp
      signalType = 'discount_reversion';
      direction = 'long';
    } else {
      return null;
    }

    // Confidence based on z-score magnitude and history length
    const zScoreConfidence = Math.min(1, Math.abs(zScore) / 4);
    const dataConfidence = Math.min(1, history.length / 200);
    const confidence = zScoreConfidence * 0.7 + dataConfidence * 0.3;

    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType,
      confidence,
      currentSpreadBps: currentSpread,
      averageSpreadBps: mean,
      zScore,
      reason: `${signalType}: spread ${currentSpread.toFixed(1)} bps vs avg ${mean.toFixed(1)} bps (z=${zScore.toFixed(2)})`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getCurrentSpread(pair: string): SpreadSnapshot | null {
    const history = this.spreadHistory.get(pair);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  getSpreadStats(pair: string): { mean: number; stdDev: number; current: number; zScore: number } | null {
    const history = this.spreadHistory.get(pair);
    if (!history || history.length < 10) return null;

    const spreads = history.map(s => s.spreadBps);
    const mean = spreads.reduce((s, v) => s + v, 0) / spreads.length;
    const variance = spreads.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / spreads.length;
    const stdDev = Math.sqrt(variance);
    const current = spreads[spreads.length - 1];
    const zScore = stdDev > 0 ? (current - mean) / stdDev : 0;

    return { mean, stdDev, current, zScore };
  }

  /** Convert to TradeSignal */
  toTradeSignal(alpha: SpreadAlphaSignal, currentPrice: number, positionSizeUSD: number): TradeSignal {
    const stopPct = 0.015;
    const tpPct = Math.abs(alpha.currentSpreadBps - alpha.averageSpreadBps) / 10000;

    const stopLoss = alpha.direction === 'long'
      ? currentPrice * (1 - stopPct)
      : currentPrice * (1 + stopPct);

    const takeProfit = alpha.direction === 'long'
      ? currentPrice * (1 + Math.max(tpPct, 0.005))
      : currentPrice * (1 - Math.max(tpPct, 0.005));

    return {
      id: `spread_${alpha.pair}_${Date.now()}`,
      direction: alpha.direction,
      pair: alpha.pair,
      exchange: 'hyperliquid',
      entry: currentPrice,
      stopLoss,
      takeProfit: [takeProfit],
      confidence: alpha.confidence,
      positionSize: positionSizeUSD,
      leverage: 2,
      strategy: 'scalp',
      reason: alpha.reason,
      timestamp: Date.now(),
    };
  }
}
