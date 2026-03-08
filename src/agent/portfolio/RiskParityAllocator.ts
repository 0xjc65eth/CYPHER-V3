/**
 * CYPHER AI Trading Agent - Risk Parity Allocator
 * Allocates capital across assets using risk parity principles.
 * Each asset contributes equally to total portfolio risk.
 */

import type { CorrelationMatrix } from './CorrelationMatrix';

// ============================================================================
// Types
// ============================================================================

export interface AssetRiskProfile {
  pair: string;
  volatility: number;       // annualized volatility
  currentWeight: number;    // current portfolio weight (0-1)
  targetWeight: number;     // computed target weight (0-1)
  maxWeight: number;        // max allowed weight (0-1)
  minWeight: number;        // min allowed weight (0-1)
}

export interface AllocationResult {
  allocations: Map<string, number>;  // pair -> weight (0-1)
  totalRisk: number;                 // portfolio volatility
  diversificationRatio: number;      // >1 = diversification benefit
  maxDrawdownEstimate: number;       // estimated max drawdown
  rebalanceNeeded: boolean;
  rebalanceTrades: Array<{
    pair: string;
    currentWeight: number;
    targetWeight: number;
    deltaWeight: number;
    deltaUSD: number;
  }>;
  timestamp: number;
}

export interface RiskParityConfig {
  maxIterations: number;           // optimization iterations (default: 100)
  convergenceThreshold: number;    // weight change threshold (default: 0.001)
  maxSingleAssetWeight: number;    // max weight per asset (default: 0.25)
  minSingleAssetWeight: number;    // min weight per asset (default: 0.02)
  rebalanceThreshold: number;      // min weight deviation to trigger rebalance (default: 0.05)
  riskBudgetEqual: boolean;        // true = equal risk, false = allow custom budgets
}

const DEFAULT_CONFIG: RiskParityConfig = {
  maxIterations: 100,
  convergenceThreshold: 0.001,
  maxSingleAssetWeight: 0.25,
  minSingleAssetWeight: 0.02,
  rebalanceThreshold: 0.05,
  riskBudgetEqual: true,
};

// ============================================================================
// RiskParityAllocator
// ============================================================================

export class RiskParityAllocator {
  private config: RiskParityConfig;

  constructor(config?: Partial<RiskParityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Allocation
  // ============================================================================

  /** Compute risk parity allocation */
  allocate(
    assets: AssetRiskProfile[],
    correlationMatrix: CorrelationMatrix,
    totalCapitalUSD: number
  ): AllocationResult {
    if (assets.length === 0) {
      return this.emptyResult();
    }

    if (assets.length === 1) {
      return this.singleAssetResult(assets[0], totalCapitalUSD);
    }

    // Step 1: Compute inverse-volatility weights (starting point)
    const invVolWeights = this.inverseVolatilityWeights(assets);

    // Step 2: Iteratively adjust for correlations
    const adjustedWeights = this.adjustForCorrelations(assets, invVolWeights, correlationMatrix);

    // Step 3: Apply constraints (min/max weights)
    const constrainedWeights = this.applyConstraints(assets, adjustedWeights);

    // Step 4: Compute portfolio metrics
    const portfolioVol = this.computePortfolioVolatility(assets, constrainedWeights, correlationMatrix);
    const equalWeightVol = this.computePortfolioVolatility(
      assets,
      new Array(assets.length).fill(1 / assets.length),
      correlationMatrix
    );
    const diversificationRatio = equalWeightVol > 0 ? portfolioVol / equalWeightVol : 1;

    // Step 5: Build allocation map
    const allocations = new Map<string, number>();
    for (let i = 0; i < assets.length; i++) {
      allocations.set(assets[i].pair, constrainedWeights[i]);
    }

    // Step 6: Determine rebalance trades
    const rebalanceTrades = this.computeRebalanceTrades(assets, constrainedWeights, totalCapitalUSD);
    const rebalanceNeeded = rebalanceTrades.some(
      t => Math.abs(t.deltaWeight) >= this.config.rebalanceThreshold
    );

    return {
      allocations,
      totalRisk: portfolioVol,
      diversificationRatio,
      maxDrawdownEstimate: portfolioVol * 2.5, // rough 99% VaR estimate
      rebalanceNeeded,
      rebalanceTrades,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Inverse Volatility Weights
  // ============================================================================

  private inverseVolatilityWeights(assets: AssetRiskProfile[]): number[] {
    const invVols = assets.map(a => a.volatility > 0 ? 1 / a.volatility : 0);
    const sum = invVols.reduce((s, v) => s + v, 0);

    if (sum === 0) return new Array(assets.length).fill(1 / assets.length);
    return invVols.map(v => v / sum);
  }

  // ============================================================================
  // Correlation Adjustment (simplified risk parity)
  // ============================================================================

  private adjustForCorrelations(
    assets: AssetRiskProfile[],
    initialWeights: number[],
    correlationMatrix: CorrelationMatrix
  ): number[] {
    const n = assets.length;
    let weights = [...initialWeights];

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      const newWeights = new Array(n);
      let changed = false;

      for (let i = 0; i < n; i++) {
        // Marginal risk contribution of asset i
        const mrc = this.marginalRiskContribution(i, assets, weights, correlationMatrix);

        // Target: equal risk contribution
        const targetMRC = 1 / n;

        // Adjust weight
        const adjustment = mrc > 0 ? targetMRC / mrc : 1;
        newWeights[i] = weights[i] * Math.sqrt(adjustment); // damped adjustment

        if (Math.abs(newWeights[i] - weights[i]) > this.config.convergenceThreshold) {
          changed = true;
        }
      }

      // Normalize
      const sum = newWeights.reduce((s: number, v: number) => s + v, 0);
      for (let i = 0; i < n; i++) {
        newWeights[i] = sum > 0 ? newWeights[i] / sum : 1 / n;
      }

      weights = newWeights;
      if (!changed) break;
    }

    return weights;
  }

  private marginalRiskContribution(
    assetIdx: number,
    assets: AssetRiskProfile[],
    weights: number[],
    correlationMatrix: CorrelationMatrix
  ): number {
    const n = assets.length;
    let contribution = 0;

    for (let j = 0; j < n; j++) {
      const corr = assetIdx === j ? 1 : correlationMatrix.getCorrelation(assets[assetIdx].pair, assets[j].pair);
      contribution += weights[j] * assets[j].volatility * corr;
    }

    return weights[assetIdx] * assets[assetIdx].volatility * contribution;
  }

  // ============================================================================
  // Constraints
  // ============================================================================

  private applyConstraints(assets: AssetRiskProfile[], weights: number[]): number[] {
    const constrained = weights.map((w, i) => {
      const maxW = assets[i].maxWeight || this.config.maxSingleAssetWeight;
      const minW = assets[i].minWeight || this.config.minSingleAssetWeight;
      return Math.max(minW, Math.min(maxW, w));
    });

    // Re-normalize after constraints
    const sum = constrained.reduce((s, v) => s + v, 0);
    return constrained.map(w => sum > 0 ? w / sum : 1 / assets.length);
  }

  // ============================================================================
  // Portfolio Metrics
  // ============================================================================

  private computePortfolioVolatility(
    assets: AssetRiskProfile[],
    weights: number[],
    correlationMatrix: CorrelationMatrix
  ): number {
    const n = assets.length;
    let variance = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corr = i === j ? 1 : correlationMatrix.getCorrelation(assets[i].pair, assets[j].pair);
        variance += weights[i] * weights[j] * assets[i].volatility * assets[j].volatility * corr;
      }
    }

    return Math.sqrt(Math.max(0, variance));
  }

  private computeRebalanceTrades(
    assets: AssetRiskProfile[],
    targetWeights: number[],
    totalCapitalUSD: number
  ): AllocationResult['rebalanceTrades'] {
    return assets.map((asset, i) => {
      const deltaWeight = targetWeights[i] - asset.currentWeight;
      return {
        pair: asset.pair,
        currentWeight: asset.currentWeight,
        targetWeight: targetWeights[i],
        deltaWeight,
        deltaUSD: deltaWeight * totalCapitalUSD,
      };
    });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private emptyResult(): AllocationResult {
    return {
      allocations: new Map(),
      totalRisk: 0,
      diversificationRatio: 1,
      maxDrawdownEstimate: 0,
      rebalanceNeeded: false,
      rebalanceTrades: [],
      timestamp: Date.now(),
    };
  }

  private singleAssetResult(asset: AssetRiskProfile, totalCapitalUSD: number): AllocationResult {
    const allocations = new Map<string, number>();
    allocations.set(asset.pair, 1);

    return {
      allocations,
      totalRisk: asset.volatility,
      diversificationRatio: 1,
      maxDrawdownEstimate: asset.volatility * 2.5,
      rebalanceNeeded: Math.abs(asset.currentWeight - 1) > this.config.rebalanceThreshold,
      rebalanceTrades: [{
        pair: asset.pair,
        currentWeight: asset.currentWeight,
        targetWeight: 1,
        deltaWeight: 1 - asset.currentWeight,
        deltaUSD: (1 - asset.currentWeight) * totalCapitalUSD,
      }],
      timestamp: Date.now(),
    };
  }
}
