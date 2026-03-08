/**
 * CYPHER AI Trading Agent - TWAP Executor
 * Time-Weighted Average Price execution algorithm.
 * Splits large orders into equal-sized child orders spread over time.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

// ============================================================================
// Types
// ============================================================================

export interface TWAPOrder {
  id: string;
  pair: string;
  side: 'buy' | 'sell';
  totalSizeUSD: number;
  durationMs: number;          // total execution window
  slicesCount: number;         // number of child orders
  maxSlippageBps: number;      // max slippage per slice
  status: TWAPStatus;
  slices: TWAPSlice[];
  startTime: number;
  endTime: number;
  filledSizeUSD: number;
  avgFillPrice: number;
  totalSlippageBps: number;
}

export type TWAPStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'failed';

export interface TWAPSlice {
  index: number;
  scheduledTime: number;
  executedTime?: number;
  sizeUSD: number;
  fillPrice?: number;
  status: 'pending' | 'filled' | 'failed' | 'skipped';
  error?: string;
}

export interface TWAPConfig {
  minSliceUSD: number;           // min child order size (default: 50)
  maxSlices: number;             // max number of slices (default: 100)
  defaultDurationMs: number;     // default execution window (default: 300000 = 5min)
  randomizeTimingPct: number;    // randomize slice timing by ±% (default: 0.2)
  skipOnHighVolatility: boolean; // pause during high vol (default: true)
  volatilityThreshold: number;  // vol threshold to skip (default: 0.05 = 5% hourly)
}

const DEFAULT_CONFIG: TWAPConfig = {
  minSliceUSD: 50,
  maxSlices: 100,
  defaultDurationMs: 300_000,
  randomizeTimingPct: 0.2,
  skipOnHighVolatility: true,
  volatilityThreshold: 0.05,
};

// ============================================================================
// TWAPExecutor
// ============================================================================

export class TWAPExecutor {
  private config: TWAPConfig;
  private eventBus: AgentEventBus;
  private activeOrders: Map<string, TWAPOrder> = new Map();
  private timers: Map<string, NodeJS.Timeout[]> = new Map();
  private executeFn: ((pair: string, side: 'buy' | 'sell', sizeUSD: number, maxSlippageBps: number) => Promise<{ success: boolean; fillPrice: number; error?: string }>) | null = null;
  private getMidPriceFn: ((pair: string) => Promise<number>) | null = null;

  constructor(config?: Partial<TWAPConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  /** Set the execution function (called for each child order) */
  setExecutor(fn: (pair: string, side: 'buy' | 'sell', sizeUSD: number, maxSlippageBps: number) => Promise<{ success: boolean; fillPrice: number; error?: string }>): void {
    this.executeFn = fn;
  }

  /** Set mid-price function for computing fill quality */
  setMidPriceProvider(fn: (pair: string) => Promise<number>): void {
    this.getMidPriceFn = fn;
  }

  // ============================================================================
  // Create & Execute TWAP
  // ============================================================================

  /** Create and start a TWAP order */
  createOrder(params: {
    pair: string;
    side: 'buy' | 'sell';
    totalSizeUSD: number;
    durationMs?: number;
    slicesCount?: number;
    maxSlippageBps?: number;
  }): TWAPOrder {
    const durationMs = params.durationMs || this.config.defaultDurationMs;
    const sizePerSlice = params.totalSizeUSD / (params.slicesCount || 10);
    const slicesCount = Math.min(
      params.slicesCount || Math.max(2, Math.ceil(params.totalSizeUSD / Math.max(sizePerSlice, this.config.minSliceUSD))),
      this.config.maxSlices
    );

    const sliceSize = params.totalSizeUSD / slicesCount;
    const intervalMs = durationMs / slicesCount;

    const now = Date.now();
    const slices: TWAPSlice[] = [];

    for (let i = 0; i < slicesCount; i++) {
      // Randomize timing slightly to avoid detection
      const jitter = intervalMs * this.config.randomizeTimingPct * (Math.random() * 2 - 1);
      const scheduledTime = now + i * intervalMs + jitter;

      slices.push({
        index: i,
        scheduledTime: Math.max(now, scheduledTime),
        sizeUSD: sliceSize,
        status: 'pending',
      });
    }

    const order: TWAPOrder = {
      id: `twap_${params.pair}_${now}`,
      pair: params.pair,
      side: params.side,
      totalSizeUSD: params.totalSizeUSD,
      durationMs,
      slicesCount,
      maxSlippageBps: params.maxSlippageBps || 30,
      status: 'pending',
      slices,
      startTime: now,
      endTime: now + durationMs,
      filledSizeUSD: 0,
      avgFillPrice: 0,
      totalSlippageBps: 0,
    };

    this.activeOrders.set(order.id, order);
    return order;
  }

  /** Start executing a TWAP order */
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
      type: 'execution.twap_started',
      source: 'TWAPExecutor',
      data: { orderId, pair: order.pair, totalSizeUSD: order.totalSizeUSD, slices: order.slicesCount, durationMs: order.durationMs },
      timestamp: Date.now(),
      priority: 'medium',
    });
  }

  /** Cancel a running TWAP */
  cancelOrder(orderId: string): void {
    const order = this.activeOrders.get(orderId);
    if (!order || order.status !== 'active') return;

    // Clear pending timers
    const orderTimers = this.timers.get(orderId) || [];
    orderTimers.forEach(t => clearTimeout(t));
    this.timers.delete(orderId);

    // Mark pending slices as skipped
    order.slices.filter(s => s.status === 'pending').forEach(s => { s.status = 'skipped'; });
    order.status = 'cancelled';

    this.eventBus.publish({
      type: 'execution.twap_cancelled',
      source: 'TWAPExecutor',
      data: { orderId, filledSizeUSD: order.filledSizeUSD, filledPct: order.filledSizeUSD / order.totalSizeUSD },
      timestamp: Date.now(),
      priority: 'medium',
    });
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
      const result = await this.executeFn(order.pair, order.side, slice.sizeUSD, order.maxSlippageBps);

      if (result.success) {
        slice.status = 'filled';
        slice.fillPrice = result.fillPrice;
        slice.executedTime = Date.now();
        order.filledSizeUSD += slice.sizeUSD;

        // Recompute avg fill price
        const filledSlices = order.slices.filter(s => s.status === 'filled' && s.fillPrice);
        const totalWeightedPrice = filledSlices.reduce((s, sl) => s + (sl.fillPrice! * sl.sizeUSD), 0);
        order.avgFillPrice = totalWeightedPrice / order.filledSizeUSD;
      } else {
        slice.status = 'failed';
        slice.error = result.error;
      }
    } catch (err) {
      slice.status = 'failed';
      slice.error = err instanceof Error ? err.message : 'Unknown error';
    }

    // Check if order is complete
    const allDone = order.slices.every(s => s.status !== 'pending');
    if (allDone) {
      const filledCount = order.slices.filter(s => s.status === 'filled').length;
      order.status = filledCount > 0 ? 'completed' : 'failed';

      // Compute total slippage
      if (this.getMidPriceFn && order.avgFillPrice > 0) {
        try {
          const midPrice = await this.getMidPriceFn(order.pair);
          if (midPrice > 0) {
            order.totalSlippageBps = Math.abs(order.avgFillPrice - midPrice) / midPrice * 10000;
          }
        } catch { /* ignore */ }
      }

      this.eventBus.publish({
        type: 'execution.twap_completed',
        source: 'TWAPExecutor',
        data: {
          orderId,
          pair: order.pair,
          filledSizeUSD: order.filledSizeUSD,
          avgFillPrice: order.avgFillPrice,
          filledSlices: filledCount,
          totalSlices: order.slicesCount,
          slippageBps: order.totalSlippageBps,
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

  getOrder(orderId: string): TWAPOrder | null {
    return this.activeOrders.get(orderId) || null;
  }

  getActiveOrders(): TWAPOrder[] {
    return Array.from(this.activeOrders.values()).filter(o => o.status === 'active');
  }

  getProgress(orderId: string): { filledPct: number; filledSlices: number; totalSlices: number; elapsedPct: number } | null {
    const order = this.activeOrders.get(orderId);
    if (!order) return null;

    const elapsed = Date.now() - order.startTime;
    return {
      filledPct: order.totalSizeUSD > 0 ? order.filledSizeUSD / order.totalSizeUSD : 0,
      filledSlices: order.slices.filter(s => s.status === 'filled').length,
      totalSlices: order.slicesCount,
      elapsedPct: order.durationMs > 0 ? Math.min(1, elapsed / order.durationMs) : 1,
    };
  }

  /** Cleanup completed orders older than given age */
  cleanup(maxAgeMs: number = 3_600_000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, order] of this.activeOrders) {
      if ((order.status === 'completed' || order.status === 'cancelled' || order.status === 'failed') && order.endTime < cutoff) {
        this.activeOrders.delete(id);
      }
    }
  }

  /** Stop all active orders and clear timers */
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
