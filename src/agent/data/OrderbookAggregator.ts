/**
 * CYPHER AI Trading Agent - Orderbook Aggregator
 * Maintains local orderbook state with incremental updates,
 * computes depth metrics, imbalance signals, and liquidity walls.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { NormalizedOrderBook } from './MarketDataService';

// ============================================================================
// Types
// ============================================================================

export interface OrderBookLevel {
  price: number;
  size: number;
  orderCount?: number;
}

export interface DepthMetrics {
  pair: string;
  bidDepthUSD_1pct: number;   // bid depth within 1% of mid
  askDepthUSD_1pct: number;   // ask depth within 1% of mid
  bidDepthUSD_5pct: number;   // bid depth within 5% of mid
  askDepthUSD_5pct: number;   // ask depth within 5% of mid
  imbalance_1pct: number;     // -1 to 1
  imbalance_5pct: number;     // -1 to 1
  bidWalls: LiquidityWall[];  // large bid clusters
  askWalls: LiquidityWall[];  // large ask clusters
  vwapBid: number;            // volume-weighted average bid
  vwapAsk: number;            // volume-weighted average ask
  timestamp: number;
}

export interface LiquidityWall {
  price: number;
  sizeUSD: number;
  distanceFromMid: number; // percentage
}

export interface OrderBookSnapshot {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  sequence: number;
  timestamp: number;
}

// ============================================================================
// OrderbookAggregator
// ============================================================================

export class OrderbookAggregator {
  private books: Map<string, OrderBookSnapshot> = new Map();
  private depthCache: Map<string, DepthMetrics> = new Map();
  private eventBus: AgentEventBus;

  // Track orderbook changes for delta analysis
  private prevMidPrices: Map<string, number> = new Map();
  private midPriceHistory: Map<string, Array<{ price: number; ts: number }>> = new Map();
  private maxHistoryLength = 300; // 5 minutes at 1s intervals

  // Wall detection thresholds
  private wallMultiplier = 5; // orders 5x average size = wall
  private maxDepthLevels = 50;

  constructor() {
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Ingestion
  // ============================================================================

  /** Process a full orderbook snapshot */
  processSnapshot(pair: string, bids: OrderBookLevel[], asks: OrderBookLevel[], sequence?: number): void {
    const snapshot: OrderBookSnapshot = {
      pair,
      bids: bids.slice(0, this.maxDepthLevels),
      asks: asks.slice(0, this.maxDepthLevels),
      sequence: sequence || Date.now(),
      timestamp: Date.now(),
    };

    this.books.set(pair, snapshot);

    // Track mid price history
    const mid = this.getMidPrice(pair);
    if (mid > 0) {
      if (!this.midPriceHistory.has(pair)) {
        this.midPriceHistory.set(pair, []);
      }
      const history = this.midPriceHistory.get(pair)!;
      history.push({ price: mid, ts: Date.now() });
      if (history.length > this.maxHistoryLength) {
        this.midPriceHistory.set(pair, history.slice(-this.maxHistoryLength));
      }
      this.prevMidPrices.set(pair, mid);
    }

    // Recompute depth metrics
    this.computeDepthMetrics(pair);
  }

  /** Process incremental orderbook update (delta) */
  processUpdate(pair: string, bidUpdates: OrderBookLevel[], askUpdates: OrderBookLevel[]): void {
    const book = this.books.get(pair);
    if (!book) {
      // No snapshot yet — treat as snapshot
      this.processSnapshot(pair, bidUpdates, askUpdates);
      return;
    }

    // Apply bid updates
    for (const update of bidUpdates) {
      if (update.size === 0) {
        // Remove level
        book.bids = book.bids.filter(b => b.price !== update.price);
      } else {
        const existing = book.bids.find(b => b.price === update.price);
        if (existing) {
          existing.size = update.size;
        } else {
          book.bids.push(update);
          book.bids.sort((a, b) => b.price - a.price); // descending for bids
        }
      }
    }

    // Apply ask updates
    for (const update of askUpdates) {
      if (update.size === 0) {
        book.asks = book.asks.filter(a => a.price !== update.price);
      } else {
        const existing = book.asks.find(a => a.price === update.price);
        if (existing) {
          existing.size = update.size;
        } else {
          book.asks.push(update);
          book.asks.sort((a, b) => a.price - b.price); // ascending for asks
        }
      }
    }

    // Trim to max depth
    book.bids = book.bids.slice(0, this.maxDepthLevels);
    book.asks = book.asks.slice(0, this.maxDepthLevels);
    book.sequence++;
    book.timestamp = Date.now();

    this.computeDepthMetrics(pair);
  }

  // ============================================================================
  // Depth Metrics
  // ============================================================================

  private computeDepthMetrics(pair: string): void {
    const book = this.books.get(pair);
    if (!book || book.bids.length === 0 || book.asks.length === 0) return;

    const midPrice = (book.bids[0].price + book.asks[0].price) / 2;
    if (midPrice <= 0) return;

    // Compute depth within percentage bands
    const bidDepth1pct = this.computeDepthWithinBand(book.bids, midPrice, 0.01, 'bid');
    const askDepth1pct = this.computeDepthWithinBand(book.asks, midPrice, 0.01, 'ask');
    const bidDepth5pct = this.computeDepthWithinBand(book.bids, midPrice, 0.05, 'bid');
    const askDepth5pct = this.computeDepthWithinBand(book.asks, midPrice, 0.05, 'ask');

    const total1 = bidDepth1pct + askDepth1pct;
    const total5 = bidDepth5pct + askDepth5pct;

    // Detect liquidity walls
    const bidWalls = this.detectWalls(book.bids, midPrice, 'bid');
    const askWalls = this.detectWalls(book.asks, midPrice, 'ask');

    // VWAP bid/ask
    const vwapBid = this.computeVWAP(book.bids);
    const vwapAsk = this.computeVWAP(book.asks);

    const metrics: DepthMetrics = {
      pair,
      bidDepthUSD_1pct: bidDepth1pct,
      askDepthUSD_1pct: askDepth1pct,
      bidDepthUSD_5pct: bidDepth5pct,
      askDepthUSD_5pct: askDepth5pct,
      imbalance_1pct: total1 > 0 ? (bidDepth1pct - askDepth1pct) / total1 : 0,
      imbalance_5pct: total5 > 0 ? (bidDepth5pct - askDepth5pct) / total5 : 0,
      bidWalls,
      askWalls,
      vwapBid,
      vwapAsk,
      timestamp: Date.now(),
    };

    this.depthCache.set(pair, metrics);
  }

  private computeDepthWithinBand(levels: OrderBookLevel[], midPrice: number, bandPct: number, side: 'bid' | 'ask'): number {
    let depth = 0;
    for (const level of levels) {
      const distance = Math.abs(level.price - midPrice) / midPrice;
      if (distance > bandPct) break;
      depth += level.price * level.size;
    }
    return depth;
  }

  private detectWalls(levels: OrderBookLevel[], midPrice: number, side: 'bid' | 'ask'): LiquidityWall[] {
    if (levels.length < 3) return [];

    const avgSize = levels.reduce((sum, l) => sum + l.size, 0) / levels.length;
    const threshold = avgSize * this.wallMultiplier;
    const walls: LiquidityWall[] = [];

    for (const level of levels) {
      if (level.size >= threshold) {
        walls.push({
          price: level.price,
          sizeUSD: level.price * level.size,
          distanceFromMid: Math.abs(level.price - midPrice) / midPrice,
        });
      }
    }

    return walls.slice(0, 5); // top 5 walls
  }

  private computeVWAP(levels: OrderBookLevel[]): number {
    let volumeSum = 0;
    let priceVolumeSum = 0;

    for (const level of levels) {
      volumeSum += level.size;
      priceVolumeSum += level.price * level.size;
    }

    return volumeSum > 0 ? priceVolumeSum / volumeSum : 0;
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getMidPrice(pair: string): number {
    const book = this.books.get(pair);
    if (!book || book.bids.length === 0 || book.asks.length === 0) return 0;
    return (book.bids[0].price + book.asks[0].price) / 2;
  }

  getSpread(pair: string): { absolute: number; bps: number } {
    const book = this.books.get(pair);
    if (!book || book.bids.length === 0 || book.asks.length === 0) {
      return { absolute: 0, bps: 0 };
    }
    const spread = book.asks[0].price - book.bids[0].price;
    const mid = (book.bids[0].price + book.asks[0].price) / 2;
    return {
      absolute: spread,
      bps: mid > 0 ? (spread / mid) * 10000 : 0,
    };
  }

  getDepthMetrics(pair: string): DepthMetrics | null {
    return this.depthCache.get(pair) || null;
  }

  getOrderBook(pair: string): OrderBookSnapshot | null {
    return this.books.get(pair) || null;
  }

  getBestBidAsk(pair: string): { bid: number; ask: number } | null {
    const book = this.books.get(pair);
    if (!book || book.bids.length === 0 || book.asks.length === 0) return null;
    return { bid: book.bids[0].price, ask: book.asks[0].price };
  }

  /** Get price impact for a given order size */
  estimatePriceImpact(pair: string, sizeUSD: number, side: 'buy' | 'sell'): number {
    const book = this.books.get(pair);
    if (!book) return 0;

    const levels = side === 'buy' ? book.asks : book.bids;
    let remaining = sizeUSD;
    let totalCost = 0;

    for (const level of levels) {
      const levelValue = level.price * level.size;
      if (remaining <= levelValue) {
        totalCost += remaining;
        break;
      }
      totalCost += levelValue;
      remaining -= levelValue;
    }

    const avgPrice = totalCost / (sizeUSD / levels[0]?.price || 1);
    const mid = this.getMidPrice(pair);

    return mid > 0 ? Math.abs(avgPrice - mid) / mid : 0;
  }

  getMidPriceHistory(pair: string, windowMs: number = 60000): Array<{ price: number; ts: number }> {
    const history = this.midPriceHistory.get(pair) || [];
    const cutoff = Date.now() - windowMs;
    return history.filter(h => h.ts >= cutoff);
  }
}

// Singleton
let orderbookAggregatorInstance: OrderbookAggregator | null = null;

export function getOrderbookAggregator(): OrderbookAggregator {
  if (!orderbookAggregatorInstance) {
    orderbookAggregatorInstance = new OrderbookAggregator();
  }
  return orderbookAggregatorInstance;
}
