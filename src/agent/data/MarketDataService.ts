/**
 * CYPHER AI Trading Agent - Market Data Service
 * Central hub for all market data streams: prices, orderbooks, funding, liquidations, candles.
 * Subscribes to exchange WebSockets and publishes normalized events via EventBus.
 */

import { Candle } from '../core/types';
import { AgentEventBus, AgentEvent, getAgentEventBus } from '../consensus/AgentEventBus';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';

// ============================================================================
// Types
// ============================================================================

export interface MarketTick {
  pair: string;
  mid: number;
  bid: number;
  ask: number;
  spread: number;
  spreadBps: number;
  volume24h: number;
  timestamp: number;
}

export interface NormalizedOrderBook {
  pair: string;
  bids: Array<{ price: number; size: number; total: number }>;
  asks: Array<{ price: number; size: number; total: number }>;
  midPrice: number;
  spread: number;
  spreadBps: number;
  bidDepthUSD: number;
  askDepthUSD: number;
  imbalance: number; // -1 to 1, positive = more bid depth
  timestamp: number;
}

export interface FundingSnapshot {
  pair: string;
  rate: number;          // current funding rate
  annualized: number;    // annualized rate
  nextFundingTime: number;
  predictedRate?: number;
  premium: number;       // mark - index
  timestamp: number;
}

export interface LiquidationEvent {
  pair: string;
  side: 'long' | 'short';
  sizeUSD: number;
  price: number;
  exchange: string;
  timestamp: number;
}

export interface MarketDataConfig {
  tickIntervalMs: number;        // how often to emit aggregated ticks (default: 1000)
  orderbookDepth: number;        // levels to maintain (default: 20)
  fundingPollIntervalMs: number; // how often to poll funding (default: 30000)
  enableLiquidations: boolean;   // track liquidation events
  maxPairsSubscribed: number;    // limit subscriptions (default: 50)
}

const DEFAULT_CONFIG: MarketDataConfig = {
  tickIntervalMs: 1000,
  orderbookDepth: 20,
  fundingPollIntervalMs: 30000,
  enableLiquidations: true,
  maxPairsSubscribed: 50,
};

// ============================================================================
// MarketDataService
// ============================================================================

export class MarketDataService {
  private config: MarketDataConfig;
  private eventBus: AgentEventBus;
  private circuitBreaker: CircuitBreaker;

  // Price cache: pair -> latest tick
  private priceCache: Map<string, MarketTick> = new Map();
  // Orderbook cache: pair -> normalized orderbook
  private orderbookCache: Map<string, NormalizedOrderBook> = new Map();
  // Funding cache: pair -> funding snapshot
  private fundingCache: Map<string, FundingSnapshot> = new Map();
  // Recent liquidations (bounded circular buffer)
  private liquidations: LiquidationEvent[] = [];
  private maxLiquidations = 500;

  // Polling intervals
  private tickAggregatorInterval: NodeJS.Timeout | null = null;
  private fundingPollInterval: NodeJS.Timeout | null = null;

  // Raw price buffer for aggregation
  private rawPriceBuffer: Map<string, { mid: number; bid: number; ask: number; volume: number; ts: number }[]> = new Map();

  private subscribedPairs: Set<string> = new Set();
  private running = false;

  constructor(config?: Partial<MarketDataConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
    this.circuitBreaker = createAPICircuitBreaker('market-data-service', {
      failureThreshold: 5,
      recoveryTimeout: 15000,
      timeout: 10000,
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  start(): void {
    if (this.running) return;
    this.running = true;

    // Tick aggregator: consolidates raw price updates into periodic MarketTick events
    this.tickAggregatorInterval = setInterval(() => {
      this.emitAggregatedTicks();
    }, this.config.tickIntervalMs);

    // Funding rate polling
    this.fundingPollInterval = setInterval(() => {
      this.pollFundingRates();
    }, this.config.fundingPollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.tickAggregatorInterval) {
      clearInterval(this.tickAggregatorInterval);
      this.tickAggregatorInterval = null;
    }
    if (this.fundingPollInterval) {
      clearInterval(this.fundingPollInterval);
      this.fundingPollInterval = null;
    }
  }

  // ============================================================================
  // Ingestion — called by connectors/bridges
  // ============================================================================

  /** Ingest a raw price update from a WebSocket or REST poll */
  ingestPrice(pair: string, mid: number, bid: number, ask: number, volume: number = 0): void {
    if (!this.rawPriceBuffer.has(pair)) {
      this.rawPriceBuffer.set(pair, []);
    }
    this.rawPriceBuffer.get(pair)!.push({ mid, bid, ask, volume, ts: Date.now() });

    // Keep buffer bounded per pair
    const buf = this.rawPriceBuffer.get(pair)!;
    if (buf.length > 100) {
      this.rawPriceBuffer.set(pair, buf.slice(-50));
    }
  }

  /** Ingest a full orderbook snapshot */
  ingestOrderBook(pair: string, bids: Array<{ price: number; size: number }>, asks: Array<{ price: number; size: number }>): void {
    const depth = this.config.orderbookDepth;
    const topBids = bids.slice(0, depth);
    const topAsks = asks.slice(0, depth);

    let bidTotal = 0;
    const normalizedBids = topBids.map(b => {
      bidTotal += b.size;
      return { price: b.price, size: b.size, total: bidTotal };
    });

    let askTotal = 0;
    const normalizedAsks = topAsks.map(a => {
      askTotal += a.size;
      return { price: a.price, size: a.size, total: askTotal };
    });

    const bestBid = topBids[0]?.price || 0;
    const bestAsk = topAsks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadBps = midPrice > 0 ? (spread / midPrice) * 10000 : 0;

    const bidDepthUSD = topBids.reduce((sum, b) => sum + b.price * b.size, 0);
    const askDepthUSD = topAsks.reduce((sum, a) => sum + a.price * a.size, 0);
    const totalDepth = bidDepthUSD + askDepthUSD;
    const imbalance = totalDepth > 0 ? (bidDepthUSD - askDepthUSD) / totalDepth : 0;

    const normalized: NormalizedOrderBook = {
      pair,
      bids: normalizedBids,
      asks: normalizedAsks,
      midPrice,
      spread,
      spreadBps,
      bidDepthUSD,
      askDepthUSD,
      imbalance,
      timestamp: Date.now(),
    };

    this.orderbookCache.set(pair, normalized);

    this.eventBus.publish({
      type: 'orderbook.update',
      source: 'MarketDataService',
      data: normalized,
      timestamp: Date.now(),
      priority: 'medium',
    });
  }

  /** Ingest funding rate data */
  ingestFunding(pair: string, rate: number, nextFundingTime: number, premium: number = 0, predictedRate?: number): void {
    const annualized = rate * 3 * 365; // 8h funding = 3x per day

    const snapshot: FundingSnapshot = {
      pair,
      rate,
      annualized,
      nextFundingTime,
      predictedRate,
      premium,
      timestamp: Date.now(),
    };

    this.fundingCache.set(pair, snapshot);

    this.eventBus.publish({
      type: 'funding.update',
      source: 'MarketDataService',
      data: snapshot,
      timestamp: Date.now(),
      priority: 'low',
    });
  }

  /** Ingest a liquidation event */
  ingestLiquidation(event: LiquidationEvent): void {
    this.liquidations.push(event);
    if (this.liquidations.length > this.maxLiquidations) {
      this.liquidations = this.liquidations.slice(-this.maxLiquidations);
    }

    this.eventBus.publish({
      type: 'liquidation.detected',
      source: 'MarketDataService',
      data: event,
      timestamp: Date.now(),
      priority: event.sizeUSD > 100000 ? 'high' : 'medium',
    });
  }

  // ============================================================================
  // Aggregation
  // ============================================================================

  private emitAggregatedTicks(): void {
    for (const [pair, buffer] of this.rawPriceBuffer.entries()) {
      if (buffer.length === 0) continue;

      // Use latest values for mid/bid/ask
      const latest = buffer[buffer.length - 1];
      const totalVolume = buffer.reduce((sum, b) => sum + b.volume, 0);

      const spread = latest.ask - latest.bid;
      const spreadBps = latest.mid > 0 ? (spread / latest.mid) * 10000 : 0;

      const tick: MarketTick = {
        pair,
        mid: latest.mid,
        bid: latest.bid,
        ask: latest.ask,
        spread,
        spreadBps,
        volume24h: totalVolume,
        timestamp: Date.now(),
      };

      this.priceCache.set(pair, tick);

      this.eventBus.publish({
        type: 'market.tick',
        source: 'MarketDataService',
        data: tick,
        timestamp: Date.now(),
        priority: 'low',
      });

      // Clear buffer after aggregation
      buffer.length = 0;
    }
  }

  private async pollFundingRates(): Promise<void> {
    // Funding rates are polled by connectors and ingested via ingestFunding()
    // This method can be extended to poll from REST APIs as backup
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getPrice(pair: string): MarketTick | null {
    return this.priceCache.get(pair) || null;
  }

  getAllPrices(): Map<string, MarketTick> {
    return new Map(this.priceCache);
  }

  getOrderBook(pair: string): NormalizedOrderBook | null {
    return this.orderbookCache.get(pair) || null;
  }

  getFunding(pair: string): FundingSnapshot | null {
    return this.fundingCache.get(pair) || null;
  }

  getAllFunding(): Map<string, FundingSnapshot> {
    return new Map(this.fundingCache);
  }

  getRecentLiquidations(pair?: string, limit: number = 50): LiquidationEvent[] {
    let events = this.liquidations;
    if (pair) events = events.filter(e => e.pair === pair);
    return events.slice(-limit);
  }

  getLiquidationVolume(pair: string, windowMs: number = 300000): { longVolume: number; shortVolume: number; total: number } {
    const cutoff = Date.now() - windowMs;
    const recent = this.liquidations.filter(e => e.pair === pair && e.timestamp >= cutoff);

    const longVolume = recent.filter(e => e.side === 'long').reduce((sum, e) => sum + e.sizeUSD, 0);
    const shortVolume = recent.filter(e => e.side === 'short').reduce((sum, e) => sum + e.sizeUSD, 0);

    return { longVolume, shortVolume, total: longVolume + shortVolume };
  }

  getSpread(pair: string): number {
    const book = this.orderbookCache.get(pair);
    return book?.spreadBps || 0;
  }

  getMidPrice(pair: string): number {
    const tick = this.priceCache.get(pair);
    if (tick) return tick.mid;
    const book = this.orderbookCache.get(pair);
    return book?.midPrice || 0;
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  subscribePair(pair: string): void {
    if (this.subscribedPairs.size >= this.config.maxPairsSubscribed) {
      console.warn(`[MarketDataService] Max subscriptions (${this.config.maxPairsSubscribed}) reached, cannot subscribe to ${pair}`);
      return;
    }
    this.subscribedPairs.add(pair);
  }

  unsubscribePair(pair: string): void {
    this.subscribedPairs.delete(pair);
    this.rawPriceBuffer.delete(pair);
  }

  getSubscribedPairs(): string[] {
    return Array.from(this.subscribedPairs);
  }

  isRunning(): boolean {
    return this.running;
  }
}

// Singleton
let marketDataServiceInstance: MarketDataService | null = null;

export function getMarketDataService(config?: Partial<MarketDataConfig>): MarketDataService {
  if (!marketDataServiceInstance) {
    marketDataServiceInstance = new MarketDataService(config);
  }
  return marketDataServiceInstance;
}
