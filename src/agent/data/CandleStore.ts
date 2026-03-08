/**
 * CYPHER AI Trading Agent - Candle Store
 * In-memory OHLCV storage with multi-timeframe aggregation.
 * Stores raw candles and computes higher timeframes on the fly.
 */

import { Candle } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

// ============================================================================
// Types
// ============================================================================

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface CandleStoreConfig {
  maxCandlesPerPair: number;        // max candles per pair per timeframe (default: 1000)
  baseTimeFrame: TimeFrame;         // lowest resolution stored (default: '1m')
  aggregatedTimeFrames: TimeFrame[]; // timeframes to auto-aggregate (default: ['5m','15m','1h','4h'])
}

const DEFAULT_CONFIG: CandleStoreConfig = {
  maxCandlesPerPair: 1000,
  baseTimeFrame: '1m',
  aggregatedTimeFrames: ['5m', '15m', '1h', '4h'],
};

const TIMEFRAME_MS: Record<TimeFrame, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

// ============================================================================
// CandleStore
// ============================================================================

export class CandleStore {
  private config: CandleStoreConfig;
  private eventBus: AgentEventBus;

  // pair -> timeframe -> candles (sorted by timestamp ascending)
  private store: Map<string, Map<TimeFrame, Candle[]>> = new Map();

  // In-progress candle for real-time tick aggregation
  // pair -> current building candle
  private buildingCandles: Map<string, Candle> = new Map();

  constructor(config?: Partial<CandleStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Ingestion
  // ============================================================================

  /** Append a completed candle (from exchange API or WebSocket) */
  appendCandle(pair: string, timeframe: TimeFrame, candle: Candle): void {
    this.ensurePairStore(pair);

    const tfCandles = this.store.get(pair)!.get(timeframe) || [];

    // Avoid duplicates
    if (tfCandles.length > 0 && tfCandles[tfCandles.length - 1].timestamp === candle.timestamp) {
      // Update existing candle (in-place)
      tfCandles[tfCandles.length - 1] = candle;
    } else {
      tfCandles.push(candle);
    }

    // Trim to max
    if (tfCandles.length > this.config.maxCandlesPerPair) {
      this.store.get(pair)!.set(timeframe, tfCandles.slice(-this.config.maxCandlesPerPair));
    } else {
      this.store.get(pair)!.set(timeframe, tfCandles);
    }

    // Auto-aggregate to higher timeframes
    if (timeframe === this.config.baseTimeFrame) {
      this.aggregateHigherTimeFrames(pair);
    }

    this.eventBus.publish({
      type: 'candle.update',
      source: 'CandleStore',
      data: { pair, timeframe, candle },
      timestamp: Date.now(),
      priority: 'low',
    });
  }

  /** Append multiple candles (bulk load from REST API) */
  appendCandles(pair: string, timeframe: TimeFrame, candles: Candle[]): void {
    if (candles.length === 0) return;

    this.ensurePairStore(pair);

    const tfCandles = this.store.get(pair)!.get(timeframe) || [];
    const existingTimestamps = new Set(tfCandles.map(c => c.timestamp));

    // Merge only new candles
    const newCandles = candles.filter(c => !existingTimestamps.has(c.timestamp));
    const merged = [...tfCandles, ...newCandles].sort((a, b) => a.timestamp - b.timestamp);

    // Trim
    const trimmed = merged.length > this.config.maxCandlesPerPair
      ? merged.slice(-this.config.maxCandlesPerPair)
      : merged;

    this.store.get(pair)!.set(timeframe, trimmed);

    // Aggregate if base timeframe
    if (timeframe === this.config.baseTimeFrame) {
      this.aggregateHigherTimeFrames(pair);
    }
  }

  /** Ingest a real-time tick to build the current candle */
  ingestTick(pair: string, price: number, volume: number = 0): void {
    const now = Date.now();
    const tfMs = TIMEFRAME_MS[this.config.baseTimeFrame];
    const candleStart = Math.floor(now / tfMs) * tfMs;

    const building = this.buildingCandles.get(pair);

    if (building && building.timestamp === candleStart) {
      // Update existing building candle
      building.high = Math.max(building.high, price);
      building.low = Math.min(building.low, price);
      building.close = price;
      building.volume += volume;
    } else {
      // Close previous candle if exists
      if (building) {
        this.appendCandle(pair, this.config.baseTimeFrame, { ...building });
      }

      // Start new candle
      this.buildingCandles.set(pair, {
        timestamp: candleStart,
        open: price,
        high: price,
        low: price,
        close: price,
        volume,
      });
    }
  }

  // ============================================================================
  // Aggregation
  // ============================================================================

  private aggregateHigherTimeFrames(pair: string): void {
    const baseCandles = this.getCandles(pair, this.config.baseTimeFrame);
    if (baseCandles.length === 0) return;

    for (const tf of this.config.aggregatedTimeFrames) {
      const aggregated = this.aggregateToTimeFrame(baseCandles, tf);
      if (aggregated.length > 0) {
        this.ensurePairStore(pair);
        const trimmed = aggregated.length > this.config.maxCandlesPerPair
          ? aggregated.slice(-this.config.maxCandlesPerPair)
          : aggregated;
        this.store.get(pair)!.set(tf, trimmed);
      }
    }
  }

  private aggregateToTimeFrame(candles: Candle[], targetTf: TimeFrame): Candle[] {
    const tfMs = TIMEFRAME_MS[targetTf];
    const aggregated: Candle[] = [];
    let current: Candle | null = null;

    for (const candle of candles) {
      const bucketStart = Math.floor(candle.timestamp / tfMs) * tfMs;

      if (current && current.timestamp === bucketStart) {
        // Extend current bucket
        current.high = Math.max(current.high, candle.high);
        current.low = Math.min(current.low, candle.low);
        current.close = candle.close;
        current.volume += candle.volume;
      } else {
        // Start new bucket
        if (current) aggregated.push(current);
        current = {
          timestamp: bucketStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
      }
    }

    if (current) aggregated.push(current);
    return aggregated;
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /** Get candles for a pair and timeframe */
  getCandles(pair: string, timeframe: TimeFrame, limit?: number): Candle[] {
    const tfCandles = this.store.get(pair)?.get(timeframe) || [];
    if (limit) return tfCandles.slice(-limit);
    return [...tfCandles];
  }

  /** Get the latest candle */
  getLatestCandle(pair: string, timeframe: TimeFrame): Candle | null {
    const candles = this.store.get(pair)?.get(timeframe);
    if (!candles || candles.length === 0) return null;
    return candles[candles.length - 1];
  }

  /** Get the building (incomplete) candle */
  getBuildingCandle(pair: string): Candle | null {
    return this.buildingCandles.get(pair) || null;
  }

  /** Get candles within a time range */
  getCandlesInRange(pair: string, timeframe: TimeFrame, startMs: number, endMs: number): Candle[] {
    const candles = this.store.get(pair)?.get(timeframe) || [];
    return candles.filter(c => c.timestamp >= startMs && c.timestamp <= endMs);
  }

  /** Check if we have enough data for analysis */
  hasMinimumData(pair: string, timeframe: TimeFrame, minCandles: number): boolean {
    const candles = this.store.get(pair)?.get(timeframe);
    return !!candles && candles.length >= minCandles;
  }

  /** Get available timeframes for a pair */
  getAvailableTimeFrames(pair: string): TimeFrame[] {
    const pairStore = this.store.get(pair);
    if (!pairStore) return [];

    const available: TimeFrame[] = [];
    for (const [tf, candles] of pairStore) {
      if (candles.length > 0) available.push(tf);
    }
    return available;
  }

  /** Get all pairs with data */
  getPairsWithData(): string[] {
    return Array.from(this.store.keys());
  }

  /** Compute basic statistics */
  getStats(pair: string, timeframe: TimeFrame, period: number = 20): {
    sma: number;
    ema: number;
    atr: number;
    volatility: number;
    volumeAvg: number;
  } | null {
    const candles = this.getCandles(pair, timeframe, period + 1);
    if (candles.length < period) return null;

    const recent = candles.slice(-period);
    const closes = recent.map(c => c.close);

    // SMA
    const sma = closes.reduce((s, c) => s + c, 0) / closes.length;

    // EMA (exponential moving average)
    const multiplier = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < closes.length; i++) {
      ema = (closes[i] - ema) * multiplier + ema;
    }

    // ATR (average true range)
    let atrSum = 0;
    for (let i = 1; i < recent.length; i++) {
      const tr = Math.max(
        recent[i].high - recent[i].low,
        Math.abs(recent[i].high - recent[i - 1].close),
        Math.abs(recent[i].low - recent[i - 1].close)
      );
      atrSum += tr;
    }
    const atr = atrSum / (recent.length - 1);

    // Volatility (standard deviation of returns)
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Average volume
    const volumeAvg = recent.reduce((s, c) => s + c.volume, 0) / recent.length;

    return { sma, ema, atr, volatility, volumeAvg };
  }

  // ============================================================================
  // Maintenance
  // ============================================================================

  private ensurePairStore(pair: string): void {
    if (!this.store.has(pair)) {
      this.store.set(pair, new Map());
    }
  }

  /** Remove all data for a pair */
  removePair(pair: string): void {
    this.store.delete(pair);
    this.buildingCandles.delete(pair);
  }

  /** Clear all data */
  clear(): void {
    this.store.clear();
    this.buildingCandles.clear();
  }
}

// Singleton
let candleStoreInstance: CandleStore | null = null;

export function getCandleStore(config?: Partial<CandleStoreConfig>): CandleStore {
  if (!candleStoreInstance) {
    candleStoreInstance = new CandleStore(config);
  }
  return candleStoreInstance;
}
