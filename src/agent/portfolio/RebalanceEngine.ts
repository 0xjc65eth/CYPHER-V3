/**
 * CYPHER AI Trading Agent - Rebalance Engine
 * Orchestrates portfolio rebalancing by generating optimal trade sequences
 * to move from current allocation to target allocation.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { AllocationResult } from './RiskParityAllocator';

// ============================================================================
// Types
// ============================================================================

export interface RebalanceOrder {
  pair: string;
  side: 'buy' | 'sell';
  sizeUSD: number;
  priority: number;        // 1 = first, higher = later
  reason: string;
  isReduce: boolean;       // true = reducing position
}

export interface RebalanceResult {
  orders: RebalanceOrder[];
  estimatedSlippage: number;
  estimatedFees: number;
  netCostUSD: number;
  executed: boolean;
  timestamp: number;
}

export interface RebalanceConfig {
  minTradeUSD: number;             // min trade size to bother executing (default: 10)
  maxRebalancePct: number;         // max portfolio % to rebalance at once (default: 0.20)
  sellBeforeBuy: boolean;          // reduce first, then add (default: true)
  estimatedSlippageBps: number;    // estimated slippage per trade (default: 5)
  estimatedFeeBps: number;         // estimated fee per trade (default: 2)
  cooldownMs: number;              // min time between rebalances (default: 3600000 = 1h)
}

const DEFAULT_CONFIG: RebalanceConfig = {
  minTradeUSD: 10,
  maxRebalancePct: 0.20,
  sellBeforeBuy: true,
  estimatedSlippageBps: 5,
  estimatedFeeBps: 2,
  cooldownMs: 3_600_000,
};

// ============================================================================
// RebalanceEngine
// ============================================================================

export class RebalanceEngine {
  private config: RebalanceConfig;
  private eventBus: AgentEventBus;
  private lastRebalanceTime = 0;
  private rebalanceHistory: RebalanceResult[] = [];
  private maxHistory = 50;

  constructor(config?: Partial<RebalanceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Generate Rebalance Orders
  // ============================================================================

  /** Generate rebalance orders from allocation result */
  generateOrders(
    allocation: AllocationResult,
    totalCapitalUSD: number
  ): RebalanceResult {
    // Check cooldown
    if (Date.now() - this.lastRebalanceTime < this.config.cooldownMs) {
      return {
        orders: [],
        estimatedSlippage: 0,
        estimatedFees: 0,
        netCostUSD: 0,
        executed: false,
        timestamp: Date.now(),
      };
    }

    if (!allocation.rebalanceNeeded) {
      return {
        orders: [],
        estimatedSlippage: 0,
        estimatedFees: 0,
        netCostUSD: 0,
        executed: false,
        timestamp: Date.now(),
      };
    }

    const sells: RebalanceOrder[] = [];
    const buys: RebalanceOrder[] = [];

    for (const trade of allocation.rebalanceTrades) {
      const absSize = Math.abs(trade.deltaUSD);

      // Skip tiny trades
      if (absSize < this.config.minTradeUSD) continue;

      // Cap rebalance size
      const maxSize = totalCapitalUSD * this.config.maxRebalancePct;
      const cappedSize = Math.min(absSize, maxSize);

      if (trade.deltaWeight < 0) {
        // Reduce position
        sells.push({
          pair: trade.pair,
          side: 'sell',
          sizeUSD: cappedSize,
          priority: 0, // sells first
          reason: `Rebalance: reduce ${trade.pair} from ${(trade.currentWeight * 100).toFixed(1)}% to ${(trade.targetWeight * 100).toFixed(1)}%`,
          isReduce: true,
        });
      } else if (trade.deltaWeight > 0) {
        // Increase position
        buys.push({
          pair: trade.pair,
          side: 'buy',
          sizeUSD: cappedSize,
          priority: 1, // buys second
          reason: `Rebalance: increase ${trade.pair} from ${(trade.currentWeight * 100).toFixed(1)}% to ${(trade.targetWeight * 100).toFixed(1)}%`,
          isReduce: false,
        });
      }
    }

    // Order: sells first (to free up capital), then buys
    const orders = this.config.sellBeforeBuy
      ? [...sells, ...buys]
      : [...buys, ...sells];

    // Assign priorities
    orders.forEach((order, i) => { order.priority = i + 1; });

    // Estimate costs
    const totalTradeVolume = orders.reduce((s, o) => s + o.sizeUSD, 0);
    const estimatedSlippage = totalTradeVolume * (this.config.estimatedSlippageBps / 10000);
    const estimatedFees = totalTradeVolume * (this.config.estimatedFeeBps / 10000);

    const result: RebalanceResult = {
      orders,
      estimatedSlippage,
      estimatedFees,
      netCostUSD: estimatedSlippage + estimatedFees,
      executed: false,
      timestamp: Date.now(),
    };

    return result;
  }

  /** Mark a rebalance as executed */
  markExecuted(result: RebalanceResult): void {
    result.executed = true;
    this.lastRebalanceTime = Date.now();

    this.rebalanceHistory.push(result);
    if (this.rebalanceHistory.length > this.maxHistory) {
      this.rebalanceHistory = this.rebalanceHistory.slice(-this.maxHistory);
    }

    this.eventBus.publish({
      type: 'portfolio.rebalance',
      source: 'RebalanceEngine',
      data: {
        orderCount: result.orders.length,
        totalVolume: result.orders.reduce((s, o) => s + o.sizeUSD, 0),
        estimatedCost: result.netCostUSD,
      },
      timestamp: Date.now(),
      priority: 'medium',
    });
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getRebalanceHistory(limit: number = 10): RebalanceResult[] {
    return this.rebalanceHistory.slice(-limit);
  }

  getTimeSinceLastRebalance(): number {
    return this.lastRebalanceTime > 0 ? Date.now() - this.lastRebalanceTime : Infinity;
  }

  canRebalance(): boolean {
    return Date.now() - this.lastRebalanceTime >= this.config.cooldownMs;
  }

  /** Estimate if rebalance is worth the cost */
  isRebalanceWorthwhile(allocation: AllocationResult, totalCapitalUSD: number): boolean {
    const totalDelta = allocation.rebalanceTrades.reduce(
      (s, t) => s + Math.abs(t.deltaUSD), 0
    );

    // Estimate cost
    const costBps = this.config.estimatedSlippageBps + this.config.estimatedFeeBps;
    const estimatedCost = totalDelta * (costBps / 10000);

    // Compare cost to expected improvement
    // Rule: don't rebalance if cost > 0.5% of portfolio
    return estimatedCost < totalCapitalUSD * 0.005;
  }
}
