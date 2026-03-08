/**
 * CYPHER AI Trading Agent - Order Flow Imbalance Alpha
 * Detects significant order flow imbalances in the order book
 * to predict short-term price direction.
 */

import { TradeSignal } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { OrderbookAggregator, DepthMetrics } from '../data/OrderbookAggregator';

// ============================================================================
// Types
// ============================================================================

export interface OrderFlowSignal {
  pair: string;
  direction: 'long' | 'short';
  signalType: 'depth_imbalance' | 'absorption' | 'wall_break';
  confidence: number;
  imbalance: number;        // -1 to 1
  bidDepthUSD: number;
  askDepthUSD: number;
  reason: string;
  timestamp: number;
}

export interface OrderFlowConfig {
  imbalanceThreshold: number;      // min imbalance for signal (default: 0.4)
  wallBreakThreshold: number;      // min wall size being consumed (default: 500000)
  absorptionWindowMs: number;      // time window for absorption detection (default: 60000)
  minDepthUSD: number;             // min depth to consider (default: 50000)
  minConfidence: number;           // min confidence (default: 0.4)
  maxSignalsPerPair: number;       // max concurrent signals per pair (default: 2)
}

const DEFAULT_CONFIG: OrderFlowConfig = {
  imbalanceThreshold: 0.4,
  wallBreakThreshold: 500_000,
  absorptionWindowMs: 60_000,
  minDepthUSD: 50_000,
  minConfidence: 0.4,
  maxSignalsPerPair: 2,
};

// ============================================================================
// OrderFlowImbalanceAlpha
// ============================================================================

export class OrderFlowImbalanceAlpha {
  private config: OrderFlowConfig;
  private eventBus: AgentEventBus;

  // Historical imbalance tracking for absorption detection
  private imbalanceHistory: Map<string, Array<{ imbalance: number; bidDepth: number; askDepth: number; ts: number }>> = new Map();
  private maxHistory = 200;

  constructor(config?: Partial<OrderFlowConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Signal Generation
  // ============================================================================

  /** Scan for order flow imbalance signals */
  scan(orderbookAggregator: OrderbookAggregator, pairs: string[]): OrderFlowSignal[] {
    const signals: OrderFlowSignal[] = [];

    for (const pair of pairs) {
      const metrics = orderbookAggregator.getDepthMetrics(pair);
      if (!metrics) continue;

      // Record imbalance history
      this.recordImbalance(pair, metrics);

      // Check depth imbalance
      const imbalanceSignal = this.evaluateDepthImbalance(pair, metrics);
      if (imbalanceSignal) signals.push(imbalanceSignal);

      // Check absorption pattern
      const absorptionSignal = this.evaluateAbsorption(pair, metrics, orderbookAggregator);
      if (absorptionSignal) signals.push(absorptionSignal);

      // Check wall breaks
      const wallSignal = this.evaluateWallBreak(pair, metrics);
      if (wallSignal) signals.push(wallSignal);
    }

    // Limit per pair
    const pairSignalCounts = new Map<string, number>();
    const filteredSignals = signals.filter(s => {
      const count = pairSignalCounts.get(s.pair) || 0;
      if (count >= this.config.maxSignalsPerPair) return false;
      pairSignalCounts.set(s.pair, count + 1);
      return true;
    });

    for (const signal of filteredSignals) {
      this.eventBus.publish({
        type: 'alpha.orderflow',
        source: 'OrderFlowImbalanceAlpha',
        data: signal,
        timestamp: Date.now(),
        priority: signal.confidence > 0.7 ? 'high' : 'medium',
      });
    }

    return filteredSignals;
  }

  // ============================================================================
  // Depth Imbalance
  // ============================================================================

  private evaluateDepthImbalance(pair: string, metrics: DepthMetrics): OrderFlowSignal | null {
    const totalDepth = metrics.bidDepthUSD_1pct + metrics.askDepthUSD_1pct;
    if (totalDepth < this.config.minDepthUSD) return null;

    const imbalance = metrics.imbalance_1pct;
    if (Math.abs(imbalance) < this.config.imbalanceThreshold) return null;

    // Strong bid depth → price likely to go up
    const direction: 'long' | 'short' = imbalance > 0 ? 'long' : 'short';

    // Confidence: based on imbalance magnitude and depth size
    const imbalanceScore = Math.min(1, Math.abs(imbalance) / 0.8);
    const depthScore = Math.min(1, totalDepth / 500_000);
    const confidence = imbalanceScore * 0.6 + depthScore * 0.4;

    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType: 'depth_imbalance',
      confidence,
      imbalance,
      bidDepthUSD: metrics.bidDepthUSD_1pct,
      askDepthUSD: metrics.askDepthUSD_1pct,
      reason: `Orderbook imbalance ${(imbalance * 100).toFixed(0)}% (bid $${(metrics.bidDepthUSD_1pct / 1000).toFixed(0)}K vs ask $${(metrics.askDepthUSD_1pct / 1000).toFixed(0)}K within 1%)`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Absorption Detection
  // ============================================================================

  private evaluateAbsorption(pair: string, metrics: DepthMetrics, aggregator: OrderbookAggregator): OrderFlowSignal | null {
    const history = this.imbalanceHistory.get(pair) || [];
    if (history.length < 10) return null;

    const cutoff = Date.now() - this.config.absorptionWindowMs;
    const windowHistory = history.filter(h => h.ts >= cutoff);
    if (windowHistory.length < 5) return null;

    // Absorption: one side's depth is being consumed (decreasing) while price doesn't move much
    const firstEntry = windowHistory[0];
    const lastEntry = windowHistory[windowHistory.length - 1];

    // Check if bid depth is being absorbed (sold into)
    const bidChange = (lastEntry.bidDepth - firstEntry.bidDepth) / (firstEntry.bidDepth || 1);
    const askChange = (lastEntry.askDepth - firstEntry.askDepth) / (firstEntry.askDepth || 1);

    // Significant one-sided absorption
    const bidAbsorbed = bidChange < -0.3 && askChange > -0.1;
    const askAbsorbed = askChange < -0.3 && bidChange > -0.1;

    if (!bidAbsorbed && !askAbsorbed) return null;

    // Bid being absorbed → large seller → bearish
    // Ask being absorbed → large buyer → bullish
    const direction: 'long' | 'short' = askAbsorbed ? 'long' : 'short';
    const absorptionRate = askAbsorbed ? Math.abs(askChange) : Math.abs(bidChange);

    const confidence = Math.min(0.7, absorptionRate * 0.5 + 0.3);
    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType: 'absorption',
      confidence,
      imbalance: metrics.imbalance_1pct,
      bidDepthUSD: metrics.bidDepthUSD_1pct,
      askDepthUSD: metrics.askDepthUSD_1pct,
      reason: `Order absorption detected: ${askAbsorbed ? 'ask' : 'bid'} side depleted ${(absorptionRate * 100).toFixed(0)}% in ${((Date.now() - cutoff) / 1000).toFixed(0)}s`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Wall Break Detection
  // ============================================================================

  private evaluateWallBreak(pair: string, metrics: DepthMetrics): OrderFlowSignal | null {
    const allWalls = [...metrics.bidWalls, ...metrics.askWalls];
    if (allWalls.length === 0) return null;

    // Check if a significant wall is close to being consumed
    // This requires tracking wall size over time
    const history = this.imbalanceHistory.get(pair) || [];
    if (history.length < 5) return null;

    // Look for walls that have shrunk significantly
    // (This is a simplified version - full impl would track individual wall levels)
    const hasBigBidWall = metrics.bidWalls.some(w => w.sizeUSD > this.config.wallBreakThreshold);
    const hasBigAskWall = metrics.askWalls.some(w => w.sizeUSD > this.config.wallBreakThreshold);

    if (!hasBigBidWall && !hasBigAskWall) return null;

    // If big ask wall is being consumed → bullish (price breaking through resistance)
    // If big bid wall is being consumed → bearish (price breaking through support)
    // This simplified version just flags the wall's existence as a level to watch
    const biggestWall = allWalls.reduce((max, w) => w.sizeUSD > max.sizeUSD ? w : max, allWalls[0]);

    if (biggestWall.sizeUSD < this.config.wallBreakThreshold) return null;
    if (biggestWall.distanceFromMid > 0.02) return null; // too far from current price

    const isBidWall = metrics.bidWalls.some(w => w.price === biggestWall.price);
    const direction: 'long' | 'short' = isBidWall ? 'long' : 'short'; // wall provides support/resistance

    const confidence = Math.min(0.6, biggestWall.sizeUSD / 2_000_000);
    if (confidence < this.config.minConfidence) return null;

    return {
      pair,
      direction,
      signalType: 'wall_break',
      confidence,
      imbalance: metrics.imbalance_1pct,
      bidDepthUSD: metrics.bidDepthUSD_1pct,
      askDepthUSD: metrics.askDepthUSD_1pct,
      reason: `Liquidity wall ${isBidWall ? 'support' : 'resistance'} at ${(biggestWall.distanceFromMid * 100).toFixed(1)}% from mid, $${(biggestWall.sizeUSD / 1000).toFixed(0)}K`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private recordImbalance(pair: string, metrics: DepthMetrics): void {
    if (!this.imbalanceHistory.has(pair)) this.imbalanceHistory.set(pair, []);
    const history = this.imbalanceHistory.get(pair)!;

    history.push({
      imbalance: metrics.imbalance_1pct,
      bidDepth: metrics.bidDepthUSD_1pct,
      askDepth: metrics.askDepthUSD_1pct,
      ts: Date.now(),
    });

    if (history.length > this.maxHistory) {
      this.imbalanceHistory.set(pair, history.slice(-this.maxHistory));
    }
  }

  /** Convert to TradeSignal */
  toTradeSignal(alpha: OrderFlowSignal, currentPrice: number, positionSizeUSD: number): TradeSignal {
    // Tight stops for order flow signals (short-term)
    const stopPct = 0.01;
    const tpPct = 0.012;

    return {
      id: `oflow_${alpha.pair}_${Date.now()}`,
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
