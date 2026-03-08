/**
 * CYPHER AI Trading Agent - Portfolio Manager
 * Central coordinator for portfolio state, allocation, and risk exposure.
 * Integrates CorrelationMatrix, RiskParityAllocator, and RebalanceEngine.
 */

import { Position, RiskLimits } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import { CorrelationMatrix } from './CorrelationMatrix';
import { RiskParityAllocator, AssetRiskProfile, AllocationResult } from './RiskParityAllocator';
import { RebalanceEngine, RebalanceResult } from './RebalanceEngine';

// ============================================================================
// Types
// ============================================================================

export interface PortfolioState {
  totalEquity: number;
  availableMargin: number;
  usedMargin: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
  positions: PortfolioPosition[];
  exposure: PortfolioExposure;
  timestamp: number;
}

export interface PortfolioPosition {
  pair: string;
  direction: 'long' | 'short';
  sizeUSD: number;
  weight: number;           // percentage of portfolio (0-1)
  unrealizedPnl: number;
  leverage: number;
  marginUsed: number;
}

export interface PortfolioExposure {
  grossExposure: number;     // total |long| + |short|
  netExposure: number;       // long - short
  longExposure: number;
  shortExposure: number;
  leverageRatio: number;     // gross / equity
  concentrationRisk: number; // 0-1, 1 = all in one asset
  pairsCount: number;
}

export interface ExposureCheck {
  allowed: boolean;
  reason: string;
  currentGrossExposure: number;
  maxGrossExposure: number;
  currentConcentration: number;
}

export interface PortfolioManagerConfig {
  maxGrossExposureMultiple: number;  // max gross exposure / equity (default: 3)
  maxNetExposureMultiple: number;    // max net exposure / equity (default: 2)
  maxConcentration: number;          // max single pair weight (default: 0.25)
  correlationThreshold: number;      // correlation threshold for concentration (default: 0.7)
  rebalanceIntervalMs: number;       // how often to check rebalance (default: 3600000)
  enableAutoRebalance: boolean;      // auto-execute rebalance (default: false)
}

const DEFAULT_CONFIG: PortfolioManagerConfig = {
  maxGrossExposureMultiple: 3,
  maxNetExposureMultiple: 2,
  maxConcentration: 0.25,
  correlationThreshold: 0.7,
  rebalanceIntervalMs: 3_600_000,
  enableAutoRebalance: false,
};

// ============================================================================
// PortfolioManager
// ============================================================================

export class PortfolioManager {
  private config: PortfolioManagerConfig;
  private eventBus: AgentEventBus;
  private correlationMatrix: CorrelationMatrix;
  private allocator: RiskParityAllocator;
  private rebalancer: RebalanceEngine;

  private currentState: PortfolioState | null = null;
  private lastAllocation: AllocationResult | null = null;
  private volatilities: Map<string, number> = new Map(); // pair -> volatility

  constructor(config?: Partial<PortfolioManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
    this.correlationMatrix = new CorrelationMatrix();
    this.allocator = new RiskParityAllocator({
      maxSingleAssetWeight: this.config.maxConcentration,
    });
    this.rebalancer = new RebalanceEngine();
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /** Update portfolio state from current positions */
  updateState(totalEquity: number, positions: Position[]): PortfolioState {
    const portfolioPositions: PortfolioPosition[] = positions.map(p => ({
      pair: p.pair,
      direction: p.direction,
      sizeUSD: p.size * p.currentPrice,
      weight: totalEquity > 0 ? (p.size * p.currentPrice) / totalEquity : 0,
      unrealizedPnl: p.unrealizedPnl,
      leverage: p.leverage,
      marginUsed: p.marginUsed,
    }));

    const longExposure = portfolioPositions
      .filter(p => p.direction === 'long')
      .reduce((s, p) => s + p.sizeUSD, 0);

    const shortExposure = portfolioPositions
      .filter(p => p.direction === 'short')
      .reduce((s, p) => s + p.sizeUSD, 0);

    const grossExposure = longExposure + shortExposure;
    const netExposure = longExposure - shortExposure;
    const usedMargin = positions.reduce((s, p) => s + p.marginUsed, 0);

    // Concentration: max single-pair weight
    const pairWeights = new Map<string, number>();
    for (const pos of portfolioPositions) {
      const current = pairWeights.get(pos.pair) || 0;
      pairWeights.set(pos.pair, current + pos.weight);
    }
    const maxPairWeight = Math.max(0, ...Array.from(pairWeights.values()));

    const exposure: PortfolioExposure = {
      grossExposure,
      netExposure,
      longExposure,
      shortExposure,
      leverageRatio: totalEquity > 0 ? grossExposure / totalEquity : 0,
      concentrationRisk: maxPairWeight,
      pairsCount: pairWeights.size,
    };

    this.currentState = {
      totalEquity,
      availableMargin: totalEquity - usedMargin,
      usedMargin,
      unrealizedPnl: positions.reduce((s, p) => s + p.unrealizedPnl, 0),
      realizedPnlToday: 0, // set externally
      positions: portfolioPositions,
      exposure,
      timestamp: Date.now(),
    };

    // Update correlation matrix with current prices
    for (const pos of positions) {
      this.correlationMatrix.recordPrice(pos.pair, pos.currentPrice);
    }

    // Check exposure limits
    this.checkExposureLimits(exposure, totalEquity);

    return this.currentState;
  }

  // ============================================================================
  // Exposure Checks
  // ============================================================================

  /** Check if a new trade would breach exposure limits */
  checkNewTradeExposure(
    pair: string,
    direction: 'long' | 'short',
    sizeUSD: number,
    leverage: number
  ): ExposureCheck {
    if (!this.currentState) {
      return { allowed: true, reason: 'No portfolio state', currentGrossExposure: 0, maxGrossExposure: 0, currentConcentration: 0 };
    }

    const { exposure, totalEquity } = this.currentState;
    const maxGross = totalEquity * this.config.maxGrossExposureMultiple;
    const maxNet = totalEquity * this.config.maxNetExposureMultiple;

    // Gross exposure check
    const newGross = exposure.grossExposure + sizeUSD;
    if (newGross > maxGross) {
      return {
        allowed: false,
        reason: `Gross exposure $${newGross.toFixed(0)} would exceed max $${maxGross.toFixed(0)} (${this.config.maxGrossExposureMultiple}x equity)`,
        currentGrossExposure: exposure.grossExposure,
        maxGrossExposure: maxGross,
        currentConcentration: exposure.concentrationRisk,
      };
    }

    // Net exposure check
    const deltaNet = direction === 'long' ? sizeUSD : -sizeUSD;
    const newNet = Math.abs(exposure.netExposure + deltaNet);
    if (newNet > maxNet) {
      return {
        allowed: false,
        reason: `Net exposure $${newNet.toFixed(0)} would exceed max $${maxNet.toFixed(0)}`,
        currentGrossExposure: exposure.grossExposure,
        maxGrossExposure: maxGross,
        currentConcentration: exposure.concentrationRisk,
      };
    }

    // Concentration check
    const currentPairExposure = this.currentState.positions
      .filter(p => p.pair === pair)
      .reduce((s, p) => s + p.sizeUSD, 0);

    const newPairWeight = totalEquity > 0
      ? (currentPairExposure + sizeUSD) / totalEquity
      : 0;

    if (newPairWeight > this.config.maxConcentration) {
      return {
        allowed: false,
        reason: `${pair} concentration ${(newPairWeight * 100).toFixed(0)}% would exceed max ${(this.config.maxConcentration * 100).toFixed(0)}%`,
        currentGrossExposure: exposure.grossExposure,
        maxGrossExposure: maxGross,
        currentConcentration: newPairWeight,
      };
    }

    // Correlation check
    const existingPairs = this.currentState.positions.map(p => p.pair);
    if (this.correlationMatrix.wouldIncreaseConcentration(pair, existingPairs, this.config.correlationThreshold)) {
      // Allow but reduce confidence
      return {
        allowed: true,
        reason: `Warning: ${pair} is highly correlated with existing positions`,
        currentGrossExposure: exposure.grossExposure,
        maxGrossExposure: maxGross,
        currentConcentration: newPairWeight,
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      currentGrossExposure: exposure.grossExposure,
      maxGrossExposure: maxGross,
      currentConcentration: newPairWeight,
    };
  }

  // ============================================================================
  // Allocation & Rebalancing
  // ============================================================================

  /** Compute optimal allocation */
  computeAllocation(pairs: string[]): AllocationResult | null {
    if (pairs.length === 0 || !this.currentState) return null;

    const assets: AssetRiskProfile[] = pairs.map(pair => {
      const currentWeight = this.currentState!.positions
        .filter(p => p.pair === pair)
        .reduce((s, p) => s + p.weight, 0);

      return {
        pair,
        volatility: this.volatilities.get(pair) || 0.5, // default 50% annualized
        currentWeight,
        targetWeight: 0,
        maxWeight: this.config.maxConcentration,
        minWeight: 0.02,
      };
    });

    this.lastAllocation = this.allocator.allocate(
      assets,
      this.correlationMatrix,
      this.currentState.totalEquity
    );

    return this.lastAllocation;
  }

  /** Generate rebalance orders */
  generateRebalanceOrders(): RebalanceResult | null {
    if (!this.lastAllocation || !this.currentState) return null;

    if (!this.rebalancer.isRebalanceWorthwhile(this.lastAllocation, this.currentState.totalEquity)) {
      return null;
    }

    return this.rebalancer.generateOrders(this.lastAllocation, this.currentState.totalEquity);
  }

  /** Update volatility estimate for a pair */
  updateVolatility(pair: string, volatility: number): void {
    this.volatilities.set(pair, volatility);
  }

  // ============================================================================
  // Exposure Limit Events
  // ============================================================================

  private checkExposureLimits(exposure: PortfolioExposure, totalEquity: number): void {
    const maxGross = totalEquity * this.config.maxGrossExposureMultiple;

    // Warn at 80% of limit
    if (exposure.grossExposure > maxGross * 0.8) {
      this.eventBus.publish({
        type: 'portfolio.exposure_breach',
        source: 'PortfolioManager',
        data: {
          type: 'warning',
          grossExposure: exposure.grossExposure,
          maxGrossExposure: maxGross,
          utilization: exposure.grossExposure / maxGross,
        },
        timestamp: Date.now(),
        priority: 'high',
      });
    }

    // Concentration warning
    if (exposure.concentrationRisk > this.config.maxConcentration * 0.9) {
      this.eventBus.publish({
        type: 'portfolio.exposure_breach',
        source: 'PortfolioManager',
        data: {
          type: 'concentration_warning',
          concentrationRisk: exposure.concentrationRisk,
          maxConcentration: this.config.maxConcentration,
        },
        timestamp: Date.now(),
        priority: 'high',
      });
    }
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getState(): PortfolioState | null {
    return this.currentState;
  }

  getExposure(): PortfolioExposure | null {
    return this.currentState?.exposure || null;
  }

  getCorrelationMatrix(): CorrelationMatrix {
    return this.correlationMatrix;
  }

  getLastAllocation(): AllocationResult | null {
    return this.lastAllocation;
  }

  /** Get position-size recommendation for a new trade */
  getRecommendedPositionSize(
    pair: string,
    totalEquity: number,
    riskLimits: RiskLimits
  ): number {
    // Start with max from risk limits
    let maxSize = riskLimits.maxPositionSize;

    // Apply concentration limit
    const concentrationMax = totalEquity * this.config.maxConcentration;
    const currentPairExposure = this.currentState?.positions
      .filter(p => p.pair === pair)
      .reduce((s, p) => s + p.sizeUSD, 0) || 0;

    const availableForPair = concentrationMax - currentPairExposure;
    maxSize = Math.min(maxSize, availableForPair);

    // Apply allocation weight if available
    if (this.lastAllocation) {
      const targetWeight = this.lastAllocation.allocations.get(pair) || 0.05;
      const allocationMax = totalEquity * targetWeight;
      maxSize = Math.min(maxSize, allocationMax);
    }

    // Apply volatility scaling
    const vol = this.volatilities.get(pair) || 0.5;
    if (vol > 1) {
      maxSize *= 0.5 / vol; // reduce for high-vol assets
    }

    return Math.max(0, maxSize);
  }
}

// Singleton
let portfolioManagerInstance: PortfolioManager | null = null;

export function getPortfolioManager(config?: Partial<PortfolioManagerConfig>): PortfolioManager {
  if (!portfolioManagerInstance) {
    portfolioManagerInstance = new PortfolioManager(config);
  }
  return portfolioManagerInstance;
}
