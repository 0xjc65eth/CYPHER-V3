/**
 * CYPHER AI Trading Agent - Whale Flow Alpha
 * Detects large order flow patterns to identify institutional activity.
 * Tracks whale entries/exits and generates directional signals.
 */

import { TradeSignal } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

// ============================================================================
// Types
// ============================================================================

export interface WhaleOrder {
  pair: string;
  side: 'buy' | 'sell';
  sizeUSD: number;
  price: number;
  exchange: string;
  timestamp: number;
}

export interface WhaleFlowSignal {
  pair: string;
  direction: 'long' | 'short';
  signalType: 'whale_accumulation' | 'whale_distribution' | 'whale_wall' | 'smart_money_divergence';
  confidence: number;
  totalWhaleVolume: number;
  buyRatio: number;           // 0-1, whale buy volume / total whale volume
  whaleOrderCount: number;
  reason: string;
  timestamp: number;
}

export interface WhaleFlowConfig {
  whaleThresholdUSD: number;      // min order size to classify as whale (default: 100000)
  scanWindowMs: number;           // time window for analysis (default: 300000 = 5min)
  minWhaleOrders: number;         // min whale orders to generate signal (default: 3)
  minBuyRatioBias: number;        // min buy ratio for bullish signal (default: 0.65)
  maxBuyRatioBias: number;        // max buy ratio for bearish signal (default: 0.35)
  minConfidence: number;          // min confidence threshold (default: 0.4)
  historyRetentionMs: number;     // how long to keep orders (default: 1h)
  smartMoneyDivergencePct: number; // price move threshold for divergence (default: 0.01)
}

const DEFAULT_CONFIG: WhaleFlowConfig = {
  whaleThresholdUSD: 100_000,
  scanWindowMs: 300_000,
  minWhaleOrders: 3,
  minBuyRatioBias: 0.65,
  maxBuyRatioBias: 0.35,
  minConfidence: 0.4,
  historyRetentionMs: 3_600_000,
  smartMoneyDivergencePct: 0.01,
};

// ============================================================================
// WhaleFlowAlpha
// ============================================================================

export class WhaleFlowAlpha {
  private config: WhaleFlowConfig;
  private eventBus: AgentEventBus;

  // pair -> whale orders
  private whaleOrders: Map<string, WhaleOrder[]> = new Map();
  // pair -> price history for divergence detection
  private priceHistory: Map<string, Array<{ price: number; ts: number }>> = new Map();
  private maxHistory = 1000;

  constructor(config?: Partial<WhaleFlowConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Data Ingestion
  // ============================================================================

  /** Record a trade that may be a whale order */
  recordTrade(pair: string, side: 'buy' | 'sell', sizeUSD: number, price: number, exchange: string = 'hyperliquid'): void {
    // Track price regardless of size
    if (!this.priceHistory.has(pair)) this.priceHistory.set(pair, []);
    const priceHist = this.priceHistory.get(pair)!;
    priceHist.push({ price, ts: Date.now() });
    if (priceHist.length > this.maxHistory) {
      this.priceHistory.set(pair, priceHist.slice(-this.maxHistory));
    }

    // Only track whale-sized orders
    if (sizeUSD < this.config.whaleThresholdUSD) return;

    if (!this.whaleOrders.has(pair)) this.whaleOrders.set(pair, []);
    const orders = this.whaleOrders.get(pair)!;

    orders.push({
      pair,
      side,
      sizeUSD,
      price,
      exchange,
      timestamp: Date.now(),
    });

    // Trim old orders
    const cutoff = Date.now() - this.config.historyRetentionMs;
    this.whaleOrders.set(pair, orders.filter(o => o.timestamp >= cutoff));
  }

  // ============================================================================
  // Signal Generation
  // ============================================================================

  /** Scan for whale flow signals */
  scan(pairs: string[]): WhaleFlowSignal[] {
    const signals: WhaleFlowSignal[] = [];

    for (const pair of pairs) {
      const flowSignal = this.evaluateWhaleFlow(pair);
      if (flowSignal) signals.push(flowSignal);

      const divergenceSignal = this.evaluateSmartMoneyDivergence(pair);
      if (divergenceSignal) signals.push(divergenceSignal);
    }

    for (const signal of signals) {
      this.eventBus.publish({
        type: 'alpha.whale_flow',
        source: 'WhaleFlowAlpha',
        data: signal,
        timestamp: Date.now(),
        priority: signal.confidence > 0.7 ? 'high' : 'medium',
      });
    }

    return signals;
  }

  private evaluateWhaleFlow(pair: string): WhaleFlowSignal | null {
    const orders = this.whaleOrders.get(pair) || [];
    const cutoff = Date.now() - this.config.scanWindowMs;
    const recent = orders.filter(o => o.timestamp >= cutoff);

    if (recent.length < this.config.minWhaleOrders) return null;

    const buyVolume = recent.filter(o => o.side === 'buy').reduce((s, o) => s + o.sizeUSD, 0);
    const sellVolume = recent.filter(o => o.side === 'sell').reduce((s, o) => s + o.sizeUSD, 0);
    const totalVolume = buyVolume + sellVolume;

    if (totalVolume === 0) return null;

    const buyRatio = buyVolume / totalVolume;

    let direction: 'long' | 'short';
    let signalType: 'whale_accumulation' | 'whale_distribution';
    let biasStrength: number;

    if (buyRatio >= this.config.minBuyRatioBias) {
      direction = 'long';
      signalType = 'whale_accumulation';
      biasStrength = (buyRatio - 0.5) * 2; // 0-1 scale
    } else if (buyRatio <= this.config.maxBuyRatioBias) {
      direction = 'short';
      signalType = 'whale_distribution';
      biasStrength = (0.5 - buyRatio) * 2;
    } else {
      return null;
    }

    // Confidence based on volume, order count, and bias strength
    const volumeScore = Math.min(1, totalVolume / 1_000_000);
    const countScore = Math.min(1, recent.length / 10);
    const confidence = biasStrength * 0.4 + volumeScore * 0.35 + countScore * 0.25;

    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType,
      confidence,
      totalWhaleVolume: totalVolume,
      buyRatio,
      whaleOrderCount: recent.length,
      reason: `${signalType}: ${recent.length} whale orders, buy ratio ${(buyRatio * 100).toFixed(0)}%, total $${(totalVolume / 1e6).toFixed(1)}M`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Smart Money Divergence
  // ============================================================================

  private evaluateSmartMoneyDivergence(pair: string): WhaleFlowSignal | null {
    const orders = this.whaleOrders.get(pair) || [];
    const priceHist = this.priceHistory.get(pair) || [];

    const windowMs = this.config.scanWindowMs;
    const cutoff = Date.now() - windowMs;

    const recentOrders = orders.filter(o => o.timestamp >= cutoff);
    const recentPrices = priceHist.filter(p => p.ts >= cutoff);

    if (recentOrders.length < 3 || recentPrices.length < 5) return null;

    // Check price direction
    const priceStart = recentPrices[0].price;
    const priceEnd = recentPrices[recentPrices.length - 1].price;
    const priceChange = (priceEnd - priceStart) / priceStart;

    if (Math.abs(priceChange) < this.config.smartMoneyDivergencePct) return null;

    // Check whale flow direction
    const buyVol = recentOrders.filter(o => o.side === 'buy').reduce((s, o) => s + o.sizeUSD, 0);
    const sellVol = recentOrders.filter(o => o.side === 'sell').reduce((s, o) => s + o.sizeUSD, 0);
    const totalVol = buyVol + sellVol;
    if (totalVol === 0) return null;

    const buyRatio = buyVol / totalVol;
    const whaleDirection = buyRatio > 0.5 ? 'up' : 'down';
    const priceDirection = priceChange > 0 ? 'up' : 'down';

    // Divergence: price going one way, whales going the other
    if (whaleDirection === priceDirection) return null;

    // Whales are right — follow them
    const direction: 'long' | 'short' = whaleDirection === 'up' ? 'long' : 'short';
    const biasStrength = Math.abs(buyRatio - 0.5) * 2;

    const confidence = Math.min(0.7, biasStrength * 0.5 + Math.abs(priceChange) * 10);
    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType: 'smart_money_divergence',
      confidence,
      totalWhaleVolume: totalVol,
      buyRatio,
      whaleOrderCount: recentOrders.length,
      reason: `Smart money divergence: price ${priceDirection} ${(Math.abs(priceChange) * 100).toFixed(1)}% but whales ${whaleDirection} (buy ratio ${(buyRatio * 100).toFixed(0)}%)`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getRecentWhaleOrders(pair: string, limit: number = 20): WhaleOrder[] {
    const orders = this.whaleOrders.get(pair) || [];
    return orders.slice(-limit);
  }

  getWhaleStats(pair: string, windowMs: number = 300000): {
    buyVolume: number;
    sellVolume: number;
    buyRatio: number;
    orderCount: number;
  } {
    const orders = this.whaleOrders.get(pair) || [];
    const cutoff = Date.now() - windowMs;
    const recent = orders.filter(o => o.timestamp >= cutoff);

    const buyVol = recent.filter(o => o.side === 'buy').reduce((s, o) => s + o.sizeUSD, 0);
    const sellVol = recent.filter(o => o.side === 'sell').reduce((s, o) => s + o.sizeUSD, 0);
    const total = buyVol + sellVol;

    return {
      buyVolume: buyVol,
      sellVolume: sellVol,
      buyRatio: total > 0 ? buyVol / total : 0.5,
      orderCount: recent.length,
    };
  }

  /** Convert to TradeSignal */
  toTradeSignal(alpha: WhaleFlowSignal, currentPrice: number, positionSizeUSD: number): TradeSignal {
    const stopPct = alpha.signalType === 'smart_money_divergence' ? 0.02 : 0.015;
    const tpPct = 0.02;

    return {
      id: `whale_${alpha.pair}_${Date.now()}`,
      direction: alpha.direction,
      pair: alpha.pair,
      exchange: 'hyperliquid',
      entry: currentPrice,
      stopLoss: alpha.direction === 'long'
        ? currentPrice * (1 - stopPct)
        : currentPrice * (1 + stopPct),
      takeProfit: [
        alpha.direction === 'long' ? currentPrice * (1 + tpPct) : currentPrice * (1 - tpPct),
      ],
      confidence: alpha.confidence,
      positionSize: positionSizeUSD,
      leverage: 3,
      strategy: 'scalp',
      reason: alpha.reason,
      timestamp: Date.now(),
    };
  }
}
