/**
 * CYPHER AI Trading Agent - VWAP Executor
 * Volume-Weighted Average Price execution algorithm.
 * Distributes order slices proportional to historical volume profile.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

// ============================================================================
// Types
// ============================================================================

export interface VWAPOrder {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  totalSizeUSD: number;
  durationMs: number;
  maxSlippageBps: number;
  status: VWAPStatus;
  slices: VWAPSlice[];
  volumeProfile: number[];      // relative volume weights per bucket
  startTime: number;
  endTime: number;
  filledSizeUSD: number;
  avgFillPrice: number;
  vwapBenchmark: number;        // market VWAP during execution window
  totalSlippageBps: number;
}

export type VWAPStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'failed';

export interface VWAPSlice {
  index: number;
  scheduledTime: number;
  executedTime?: number;
  targetSizeUSD: number;       // volume-weighted target
  actualSizeUSD: number;       // what was actually filled
  fillPrice?: number;
  status: 'pending' | 'filled' | 'partial' | 'failed' | 'skipped';
  volumeWeight: number;        // this slice's share of total volume
  error?: string;
}

export interface VolumeProfileBucket {
  hourOfDay: number;           // 0-23 UTC
  relativeVolume: number;      // normalized 0-1, where sum = 1
  avgSpreadBps: number;
  sampleCount: number;
}

export interface VWAPConfig {
  minSliceUSD: number;           // default: 50
  maxSlices: number;             // default: 50
  defaultDurationMs: number;     // default: 600000 = 10min
  participationRate: number;     // max % of market volume to consume (default: 0.05 = 5%)
  useHistoricalProfile: boolean; // use intraday volume profile (default: true)
  bucketCount: number;           // volume profile buckets (default: 24)
}

const DEFAULT_CONFIG: VWAPConfig = {
  minSliceUSD: 50,
  maxSlices: 50,
  defaultDurationMs: 600_000,
  participationRate: 0.05,
  useHistoricalProfile: true,
  bucketCount: 24,
};

// ============================================================================
// VWAPExecutor
// ============================================================================

export class VWAPExecutor {
  private config: VWAPConfig;
  private eventBus: AgentEventBus;
  private activeOrders: Map<string, VWAPOrder> = new Map();
  private timers: Map<string, NodeJS.Timeout[]> = new Map();
  private volumeProfiles: Map<string, VolumeProfileBucket[]> = new Map();
  private volumeHistory: Map<string, { timestamp: number; volumeUSD: number }[]> = new Map();
  private executeFn: ((pair: string, side: 'buy' | 'sell', sizeUSD: number, maxSlippageBps: number) => Promise<{ success: boolean; fillPrice: number; error?: string }>) | null = null;

  constructor(config?: Partial<VWAPConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  /** Set execution function */
  setExecutor(fn: (pair: string, side: 'buy' | 'sell', sizeUSD: number, maxSlippageBps: number) => Promise<{ success: boolean; fillPrice: number; error?: string }>): void {
    this.executeFn = fn;
  }

  // ============================================================================
  // Volume Profile
  // ============================================================================

  /** Record a volume observation for profile building */
  recordVolume(pair: string, volumeUSD: number, timestamp?: number): void {
    if (!this.volumeHistory.has(pair)) {
      this.volumeHistory.set(pair, []);
    }
    const history = this.volumeHistory.get(pair)!;
    history.push({ timestamp: timestamp || Date.now(), volumeUSD });

    // Keep last 7 days
    const cutoff = Date.now() - 7 * 24 * 3600_000;
    if (history.length > 1000) {
      this.volumeHistory.set(pair, history.filter(h => h.timestamp > cutoff));
    }
  }

  /** Build intraday volume profile from historical data */
  buildVolumeProfile(pair: string): VolumeProfileBucket[] {
    const history = this.volumeHistory.get(pair) || [];
    const buckets: VolumeProfileBucket[] = [];

    // Initialize hourly buckets
    for (let h = 0; h < 24; h++) {
      buckets.push({ hourOfDay: h, relativeVolume: 0, avgSpreadBps: 0, sampleCount: 0 });
    }

    // Aggregate volume by hour
    for (const entry of history) {
      const hour = new Date(entry.timestamp).getUTCHours();
      buckets[hour].relativeVolume += entry.volumeUSD;
      buckets[hour].sampleCount++;
    }

    // Normalize
    const totalVol = buckets.reduce((s, b) => s + b.relativeVolume, 0);
    if (totalVol > 0) {
      for (const bucket of buckets) {
        bucket.relativeVolume /= totalVol;
      }
    } else {
      // Uniform if no data
      for (const bucket of buckets) {
        bucket.relativeVolume = 1 / 24;
      }
    }

    this.volumeProfiles.set(pair, buckets);
    return buckets;
  }

  /** Get volume weights for time window slices */
  private getVolumeWeights(pair: string, startTime: number, endTime: number, sliceCount: number): number[] {
    let profile = this.volumeProfiles.get(pair);
    if (!profile || !this.config.useHistoricalProfile) {
      // Uniform weights
      return new Array(sliceCount).fill(1 / sliceCount);
    }

    const weights: number[] = [];
    const sliceDuration = (endTime - startTime) / sliceCount;

    for (let i = 0; i < sliceCount; i++) {
      const sliceStart = startTime + i * sliceDuration;
      const sliceMid = sliceStart + sliceDuration / 2;
      const hour = new Date(sliceMid).getUTCHours();
      weights.push(profile[hour].relativeVolume);
    }

    // Normalize weights
    const sum = weights.reduce((s, w) => s + w, 0);
    return sum > 0 ? weights.map(w => w / sum) : new Array(sliceCount).fill(1 / sliceCount);
  }

  // ============================================================================
  // Create & Execute VWAP
  // ============================================================================

  /** Create a VWAP order */
  createOrder(params: {
    pair: string;
    side: 'buy' | 'sell';
    totalSizeUSD: number;
    durationMs?: number;
    maxSlippageBps?: number;
    slicesCount?: number;
  }): VWAPOrder {
    const durationMs = params.durationMs || this.config.defaultDurationMs;
    const slicesCount = Math.min(params.slicesCount || 20, this.config.maxSlices);
    const now = Date.now();
    const endTime = now + durationMs;

    // Get volume-weighted distribution
    const volumeWeights = this.getVolumeWeights(params.pair, now, endTime, slicesCount);
    const intervalMs = durationMs / slicesCount;

    const slices: VWAPSlice[] = volumeWeights.map((weight, i) => {
      const targetSize = Math.max(this.config.minSliceUSD, params.totalSizeUSD * weight);
      return {
        index: i,
        scheduledTime: now + i * intervalMs,
        targetSizeUSD: targetSize,
        actualSizeUSD: 0,
        volumeWeight: weight,
        status: 'pending' as const,
      };
    });

    const order: VWAPOrder = {
      id: `vwap_${params.pair}_${now}`,
      pair: params.pair,
      side: params.side,
      totalSizeUSD: params.totalSizeUSD,
      durationMs,
      maxSlippageBps: params.maxSlippageBps || 30,
      status: 'pending',
      slices,
      volumeProfile: volumeWeights,
      startTime: now,
      endTime,
      filledSizeUSD: 0,
      avgFillPrice: 0,
      vwapBenchmark: 0,
      totalSlippageBps: 0,
    };

    this.activeOrders.set(order.id, order);
    return order;
  }

  /** Start VWAP execution */
  async startExecution(orderId: string): Promise<void> {
    const order = this.activeOrders.get(orderId);
    if (!order || order.status !== 'pending') return;
    if (!this.executeFn) {
      order.status = 'failed';
      return;
    }

    order.status = 'active';
    const orderTimers: NodeJS.Timeout[] = [];

    for (const slice of order.slices) {
      const delay = Math.max(0, slice.scheduledTime - Date.now());
      const timer = setTimeout(() => this.executeSlice(orderId, slice.index), delay);
      orderTimers.push(timer);
    }

    this.timers.set(orderId, orderTimers);

    this.eventBus.publish({
      type: 'execution.vwap_started',
      source: 'VWAPExecutor',
      data: { orderId, pair: order.pair, totalSizeUSD: order.totalSizeUSD, slices: order.slices.length },
      timestamp: Date.now(),
      priority: 'medium',
    });
  }

  /** Cancel VWAP order */
  cancelOrder(orderId: string): void {
    const order = this.activeOrders.get(orderId);
    if (!order || order.status !== 'active') return;

    const orderTimers = this.timers.get(orderId) || [];
    orderTimers.forEach(t => clearTimeout(t));
    this.timers.delete(orderId);

    order.slices.filter(s => s.status === 'pending').forEach(s => { s.status = 'skipped'; });
    order.status = 'cancelled';
  }

  // ============================================================================
  // Slice Execution
  // ============================================================================

  private async executeSlice(orderId: string, sliceIndex: number): Promise<void> {
    const order = this.activeOrders.get(orderId);
    if (!order || order.status !== 'active' || !this.executeFn) return;

    const slice = order.slices[sliceIndex];
    if (!slice || slice.status !== 'pending') return;

    try {
      const result = await this.executeFn(order.pair, order.side, slice.targetSizeUSD, order.maxSlippageBps);

      if (result.success) {
        slice.status = 'filled';
        slice.fillPrice = result.fillPrice;
        slice.actualSizeUSD = slice.targetSizeUSD;
        slice.executedTime = Date.now();
        order.filledSizeUSD += slice.targetSizeUSD;

        // Recompute avg fill
        const filled = order.slices.filter(s => s.status === 'filled' && s.fillPrice);
        const totalWeighted = filled.reduce((s, sl) => s + (sl.fillPrice! * sl.actualSizeUSD), 0);
        order.avgFillPrice = order.filledSizeUSD > 0 ? totalWeighted / order.filledSizeUSD : 0;
      } else {
        slice.status = 'failed';
        slice.error = result.error;
      }
    } catch (err) {
      slice.status = 'failed';
      slice.error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Check completion
    const allDone = order.slices.every(s => s.status !== 'pending');
    if (allDone) {
      const filledCount = order.slices.filter(s => s.status === 'filled').length;
      order.status = filledCount > 0 ? 'completed' : 'failed';

      this.eventBus.publish({
        type: 'execution.vwap_completed',
        source: 'VWAPExecutor',
        data: {
          orderId,
          pair: order.pair,
          filledSizeUSD: order.filledSizeUSD,
          avgFillPrice: order.avgFillPrice,
          slippageVsVWAP: order.totalSlippageBps,
        },
        timestamp: Date.now(),
        priority: 'medium',
      });

      this.timers.delete(orderId);
    }
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getOrder(orderId: string): VWAPOrder | null {
    return this.activeOrders.get(orderId) || null;
  }

  getActiveOrders(): VWAPOrder[] {
    return Array.from(this.activeOrders.values()).filter(o => o.status === 'active');
  }

  getVolumeProfile(pair: string): VolumeProfileBucket[] | null {
    return this.volumeProfiles.get(pair) || null;
  }

  /** Stop all active orders */
  stopAll(): void {
    for (const [orderId] of this.activeOrders) {
      this.cancelOrder(orderId);
    }
    for (const timers of this.timers.values()) {
      timers.forEach(t => clearTimeout(t));
    }
    this.timers.clear();
  }
}
