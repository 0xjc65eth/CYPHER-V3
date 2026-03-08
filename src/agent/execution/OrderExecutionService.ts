/**
 * CYPHER AI Trading Agent - Order Execution Service
 * Central coordinator for all order execution.
 * Integrates SmartOrderRouter, TWAP/VWAP executors, and SlippageController.
 */

import { TradeSignal, Position } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import { SlippageController, getSlippageController, SlippageEstimate } from './SlippageController';
import { SmartOrderRouter, RoutingDecision, VenueExecutionResult } from './SmartOrderRouter';
import { TWAPExecutor, TWAPOrder } from './TWAPExecutor';
import { VWAPExecutor, VWAPOrder } from './VWAPExecutor';

// ============================================================================
// Types
// ============================================================================

export type ExecutionAlgorithm = 'market' | 'limit' | 'twap' | 'vwap';

export interface ExecutionRequest {
  signal: TradeSignal;
  algorithm: ExecutionAlgorithm;
  maxSlippageBps: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  durationMs?: number;            // for TWAP/VWAP
  slicesCount?: number;           // for TWAP/VWAP
}

export interface ExecutionResult {
  requestId: string;
  signal: TradeSignal;
  algorithm: ExecutionAlgorithm;
  status: 'filled' | 'partial' | 'rejected' | 'failed';
  venue: string;
  avgFillPrice: number;
  filledSizeUSD: number;
  totalFeesUSD: number;
  slippageBps: number;
  latencyMs: number;
  algoOrderId?: string;          // TWAP/VWAP order ID
  reason: string;
  timestamp: number;
}

export interface ExecutionServiceConfig {
  defaultAlgorithm: ExecutionAlgorithm;
  defaultMaxSlippageBps: number;
  largeOrderThresholdUSD: number;   // above this, use algo execution (default: 2000)
  twapDefaultDurationMs: number;    // default TWAP window (default: 300000)
  vwapDefaultDurationMs: number;    // default VWAP window (default: 600000)
  maxConcurrentAlgoOrders: number;  // max simultaneous TWAP/VWAP (default: 5)
  enableAutoAlgoSelection: boolean; // auto-choose algo based on size (default: true)
  cooldownMs: number;               // min time between executions on same pair (default: 5000)
}

const DEFAULT_CONFIG: ExecutionServiceConfig = {
  defaultAlgorithm: 'market',
  defaultMaxSlippageBps: 30,
  largeOrderThresholdUSD: 2000,
  twapDefaultDurationMs: 300_000,
  vwapDefaultDurationMs: 600_000,
  maxConcurrentAlgoOrders: 5,
  enableAutoAlgoSelection: true,
  cooldownMs: 5_000,
};

// ============================================================================
// OrderExecutionService
// ============================================================================

export class OrderExecutionService {
  private config: ExecutionServiceConfig;
  private eventBus: AgentEventBus;
  private slippageController: SlippageController;
  private router: SmartOrderRouter;
  private twapExecutor: TWAPExecutor;
  private vwapExecutor: VWAPExecutor;

  private executionHistory: ExecutionResult[] = [];
  private maxHistory = 200;
  private lastExecutionByPair: Map<string, number> = new Map();
  private connectorExecuteFn: ((pair: string, side: 'buy' | 'sell', sizeUSD: number, limitPrice: number) => Promise<VenueExecutionResult>) | null = null;
  private connectorMidPriceFn: ((pair: string) => Promise<number>) | null = null;

  constructor(config?: Partial<ExecutionServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
    this.slippageController = getSlippageController();
    this.router = new SmartOrderRouter(this.slippageController);
    this.twapExecutor = new TWAPExecutor();
    this.vwapExecutor = new VWAPExecutor();
  }

  // ============================================================================
  // Connector Wiring
  // ============================================================================

  /** Set the exchange connector execution function */
  setConnectorExecutor(fn: (pair: string, side: 'buy' | 'sell', sizeUSD: number, limitPrice: number) => Promise<VenueExecutionResult>): void {
    this.connectorExecuteFn = fn;

    // Wire into TWAP/VWAP executors
    const wrappedFn = async (pair: string, side: 'buy' | 'sell', sizeUSD: number, maxSlippageBps: number) => {
      const midPrice = this.connectorMidPriceFn ? await this.connectorMidPriceFn(pair) : 0;
      const limitPrice = this.slippageController.computeLimitPrice(midPrice, side, maxSlippageBps);
      const result = await fn(pair, side, sizeUSD, limitPrice);
      return { success: result.success, fillPrice: result.fillPrice, error: result.error };
    };

    this.twapExecutor.setExecutor(wrappedFn);
    this.vwapExecutor.setExecutor(wrappedFn);
  }

  /** Set mid-price provider */
  setMidPriceProvider(fn: (pair: string) => Promise<number>): void {
    this.connectorMidPriceFn = fn;
    this.twapExecutor.setMidPriceProvider(fn);
  }

  /** Get the smart order router (for venue registration) */
  getRouter(): SmartOrderRouter {
    return this.router;
  }

  /** Get the slippage controller */
  getSlippageController(): SlippageController {
    return this.slippageController;
  }

  // ============================================================================
  // Execute Trade Signal
  // ============================================================================

  /** Execute a trade signal with full pipeline */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const { signal } = request;
    const requestId = `exec_${signal.pair}_${Date.now()}`;
    const startTime = Date.now();

    // Cooldown check
    const lastExec = this.lastExecutionByPair.get(signal.pair) || 0;
    if (Date.now() - lastExec < this.config.cooldownMs) {
      return this.makeResult(requestId, signal, request.algorithm, 'rejected', 'Cooldown active', startTime);
    }

    // Get mid price
    let midPrice = signal.entry;
    if (this.connectorMidPriceFn) {
      try {
        midPrice = await this.connectorMidPriceFn(signal.pair);
      } catch { /* use signal entry as fallback */ }
    }

    // Slippage pre-check
    const slippageEstimate = this.slippageController.estimateSlippage(
      signal.pair, signal.positionSize, signal.direction === 'long' ? 'buy' : 'sell', midPrice
    );
    const slippageCheck = this.slippageController.isSlippageAcceptable(slippageEstimate);

    if (!slippageCheck.acceptable) {
      this.eventBus.publish({
        type: 'execution.rejected',
        source: 'OrderExecutionService',
        data: { pair: signal.pair, reason: slippageCheck.reason, slippageBps: slippageEstimate.estimatedSlippageBps },
        timestamp: Date.now(),
        priority: 'high',
      });
      return this.makeResult(requestId, signal, request.algorithm, 'rejected', slippageCheck.reason, startTime);
    }

    // Select execution algorithm
    const algorithm = this.selectAlgorithm(request, slippageEstimate);

    // Execute
    let result: ExecutionResult;
    switch (algorithm) {
      case 'twap':
        result = await this.executeTWAP(requestId, signal, request, midPrice, startTime);
        break;
      case 'vwap':
        result = await this.executeVWAP(requestId, signal, request, midPrice, startTime);
        break;
      case 'limit':
        result = await this.executeLimit(requestId, signal, request, midPrice, startTime);
        break;
      case 'market':
      default:
        result = await this.executeMarket(requestId, signal, request, midPrice, startTime);
        break;
    }

    // Record
    this.executionHistory.push(result);
    if (this.executionHistory.length > this.maxHistory) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistory);
    }
    this.lastExecutionByPair.set(signal.pair, Date.now());

    // Emit
    this.eventBus.publish({
      type: result.status === 'filled' ? 'execution.filled' : 'execution.failed',
      source: 'OrderExecutionService',
      data: {
        requestId: result.requestId,
        pair: signal.pair,
        direction: signal.direction,
        algorithm,
        fillPrice: result.avgFillPrice,
        sizeUSD: result.filledSizeUSD,
        slippageBps: result.slippageBps,
        latencyMs: result.latencyMs,
      },
      timestamp: Date.now(),
      priority: result.status === 'filled' ? 'medium' : 'high',
    });

    return result;
  }

  // ============================================================================
  // Algorithm Selection
  // ============================================================================

  private selectAlgorithm(request: ExecutionRequest, slippage: SlippageEstimate): ExecutionAlgorithm {
    if (!this.config.enableAutoAlgoSelection) return request.algorithm;

    const sizeUSD = request.signal.positionSize;

    // Critical urgency → always market
    if (request.urgency === 'critical') return 'market';

    // Small orders → market
    if (sizeUSD < this.config.largeOrderThresholdUSD) return 'market';

    // Large orders with low urgency → VWAP
    if (request.urgency === 'low' && sizeUSD > this.config.largeOrderThresholdUSD * 3) return 'vwap';

    // Large orders with medium urgency → TWAP
    if (sizeUSD > this.config.largeOrderThresholdUSD) return 'twap';

    // High slippage → TWAP to reduce impact
    if (slippage.estimatedSlippageBps > 20) return 'twap';

    return request.algorithm;
  }

  // ============================================================================
  // Market Execution
  // ============================================================================

  private async executeMarket(requestId: string, signal: TradeSignal, request: ExecutionRequest, midPrice: number, startTime: number): Promise<ExecutionResult> {
    if (!this.connectorExecuteFn) {
      return this.makeResult(requestId, signal, 'market', 'failed', 'No executor configured', startTime);
    }

    const side = signal.direction === 'long' ? 'buy' : 'sell';
    const maxSlip = request.maxSlippageBps || this.config.defaultMaxSlippageBps;
    const limitPrice = this.slippageController.computeLimitPrice(midPrice, side as 'buy' | 'sell', maxSlip);

    try {
      // Try smart routing first
      const routing = this.router.routeOrder(signal.pair, side as 'buy' | 'sell', signal.positionSize, midPrice);

      let result: VenueExecutionResult;
      if (routing) {
        result = await this.router.executeDecision(routing, limitPrice);
      } else {
        // Direct execution
        result = await this.connectorExecuteFn(signal.pair, side as 'buy' | 'sell', signal.positionSize, limitPrice);
      }

      const latencyMs = Date.now() - startTime;
      const slippageBps = midPrice > 0 ? Math.abs(result.fillPrice - midPrice) / midPrice * 10000 : 0;

      if (result.success) {
        this.slippageController.recordFill({
          pair: signal.pair,
          side: side as 'buy' | 'sell',
          sizeUSD: signal.positionSize,
          expectedPrice: midPrice,
          actualFillPrice: result.fillPrice,
          timestamp: Date.now(),
        });
      }

      return {
        requestId,
        signal,
        algorithm: 'market',
        status: result.success ? 'filled' : 'failed',
        venue: routing?.venue || 'direct',
        avgFillPrice: result.fillPrice,
        filledSizeUSD: result.success ? signal.positionSize : 0,
        totalFeesUSD: result.feePaid,
        slippageBps: Math.round(slippageBps * 100) / 100,
        latencyMs,
        reason: result.success ? 'Market order filled' : (result.error || 'Execution failed'),
        timestamp: Date.now(),
      };
    } catch (err) {
      return this.makeResult(requestId, signal, 'market', 'failed', err instanceof Error ? err.message : 'Unknown error', startTime);
    }
  }

  // ============================================================================
  // Limit Execution
  // ============================================================================

  private async executeLimit(requestId: string, signal: TradeSignal, request: ExecutionRequest, midPrice: number, startTime: number): Promise<ExecutionResult> {
    if (!this.connectorExecuteFn) {
      return this.makeResult(requestId, signal, 'limit', 'failed', 'No executor configured', startTime);
    }

    const side = signal.direction === 'long' ? 'buy' : 'sell';
    const limitPrice = signal.entry; // Use signal's entry as limit price

    try {
      const result = await this.connectorExecuteFn(signal.pair, side as 'buy' | 'sell', signal.positionSize, limitPrice);
      const latencyMs = Date.now() - startTime;
      const slippageBps = midPrice > 0 ? Math.abs(result.fillPrice - midPrice) / midPrice * 10000 : 0;

      return {
        requestId,
        signal,
        algorithm: 'limit',
        status: result.success ? 'filled' : 'failed',
        venue: 'direct',
        avgFillPrice: result.fillPrice,
        filledSizeUSD: result.success ? signal.positionSize : 0,
        totalFeesUSD: result.feePaid,
        slippageBps: Math.round(slippageBps * 100) / 100,
        latencyMs,
        reason: result.success ? 'Limit order filled' : (result.error || 'Not filled'),
        timestamp: Date.now(),
      };
    } catch (err) {
      return this.makeResult(requestId, signal, 'limit', 'failed', err instanceof Error ? err.message : 'Unknown error', startTime);
    }
  }

  // ============================================================================
  // TWAP Execution
  // ============================================================================

  private async executeTWAP(requestId: string, signal: TradeSignal, request: ExecutionRequest, midPrice: number, startTime: number): Promise<ExecutionResult> {
    const activeAlgoOrders = this.twapExecutor.getActiveOrders().length + this.vwapExecutor.getActiveOrders().length;
    if (activeAlgoOrders >= this.config.maxConcurrentAlgoOrders) {
      return this.makeResult(requestId, signal, 'twap', 'rejected', 'Max concurrent algo orders reached', startTime);
    }

    const twapOrder = this.twapExecutor.createOrder({
      pair: signal.pair,
      side: signal.direction === 'long' ? 'buy' : 'sell',
      totalSizeUSD: signal.positionSize,
      durationMs: request.durationMs || this.config.twapDefaultDurationMs,
      slicesCount: request.slicesCount,
      maxSlippageBps: request.maxSlippageBps || this.config.defaultMaxSlippageBps,
    });

    await this.twapExecutor.startExecution(twapOrder.id);

    return {
      requestId,
      signal,
      algorithm: 'twap',
      status: 'partial',
      venue: 'twap',
      avgFillPrice: midPrice,
      filledSizeUSD: 0,
      totalFeesUSD: 0,
      slippageBps: 0,
      latencyMs: Date.now() - startTime,
      algoOrderId: twapOrder.id,
      reason: `TWAP started: ${twapOrder.slicesCount} slices over ${twapOrder.durationMs / 1000}s`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // VWAP Execution
  // ============================================================================

  private async executeVWAP(requestId: string, signal: TradeSignal, request: ExecutionRequest, midPrice: number, startTime: number): Promise<ExecutionResult> {
    const activeAlgoOrders = this.twapExecutor.getActiveOrders().length + this.vwapExecutor.getActiveOrders().length;
    if (activeAlgoOrders >= this.config.maxConcurrentAlgoOrders) {
      return this.makeResult(requestId, signal, 'vwap', 'rejected', 'Max concurrent algo orders reached', startTime);
    }

    const vwapOrder = this.vwapExecutor.createOrder({
      pair: signal.pair,
      side: signal.direction === 'long' ? 'buy' : 'sell',
      totalSizeUSD: signal.positionSize,
      durationMs: request.durationMs || this.config.vwapDefaultDurationMs,
      maxSlippageBps: request.maxSlippageBps || this.config.defaultMaxSlippageBps,
      slicesCount: request.slicesCount,
    });

    await this.vwapExecutor.startExecution(vwapOrder.id);

    return {
      requestId,
      signal,
      algorithm: 'vwap',
      status: 'partial',
      venue: 'vwap',
      avgFillPrice: midPrice,
      filledSizeUSD: 0,
      totalFeesUSD: 0,
      slippageBps: 0,
      latencyMs: Date.now() - startTime,
      algoOrderId: vwapOrder.id,
      reason: `VWAP started: ${vwapOrder.slices.length} slices over ${vwapOrder.durationMs / 1000}s`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getExecutionHistory(limit: number = 20): ExecutionResult[] {
    return this.executionHistory.slice(-limit);
  }

  getExecutionStats(): {
    totalExecutions: number;
    fillRate: number;
    avgSlippageBps: number;
    avgLatencyMs: number;
    byAlgorithm: Record<string, { count: number; avgSlippageBps: number }>;
  } {
    const filled = this.executionHistory.filter(e => e.status === 'filled');
    const slippages = filled.map(e => e.slippageBps);
    const latencies = filled.map(e => e.latencyMs);

    const byAlgorithm: Record<string, { count: number; avgSlippageBps: number }> = {};
    for (const exec of this.executionHistory) {
      if (!byAlgorithm[exec.algorithm]) {
        byAlgorithm[exec.algorithm] = { count: 0, avgSlippageBps: 0 };
      }
      const entry = byAlgorithm[exec.algorithm];
      entry.avgSlippageBps = (entry.avgSlippageBps * entry.count + exec.slippageBps) / (entry.count + 1);
      entry.count++;
    }

    return {
      totalExecutions: this.executionHistory.length,
      fillRate: this.executionHistory.length > 0 ? filled.length / this.executionHistory.length : 0,
      avgSlippageBps: slippages.length > 0 ? slippages.reduce((s, v) => s + v, 0) / slippages.length : 0,
      avgLatencyMs: latencies.length > 0 ? latencies.reduce((s, v) => s + v, 0) / latencies.length : 0,
      byAlgorithm,
    };
  }

  /** Get TWAP order progress */
  getTWAPProgress(orderId: string) {
    return this.twapExecutor.getProgress(orderId);
  }

  /** Get VWAP order */
  getVWAPOrder(orderId: string) {
    return this.vwapExecutor.getOrder(orderId);
  }

  /** Stop all algo orders and cleanup */
  stop(): void {
    this.twapExecutor.stopAll();
    this.vwapExecutor.stopAll();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private makeResult(
    requestId: string,
    signal: TradeSignal,
    algorithm: ExecutionAlgorithm,
    status: ExecutionResult['status'],
    reason: string,
    startTime: number
  ): ExecutionResult {
    return {
      requestId,
      signal,
      algorithm,
      status,
      venue: 'none',
      avgFillPrice: 0,
      filledSizeUSD: 0,
      totalFeesUSD: 0,
      slippageBps: 0,
      latencyMs: Date.now() - startTime,
      reason,
      timestamp: Date.now(),
    };
  }
}

// Singleton
let executionServiceInstance: OrderExecutionService | null = null;

export function getOrderExecutionService(config?: Partial<ExecutionServiceConfig>): OrderExecutionService {
  if (!executionServiceInstance) {
    executionServiceInstance = new OrderExecutionService(config);
  }
  return executionServiceInstance;
}
