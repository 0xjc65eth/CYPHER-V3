/**
 * CYPHER AI Trading Agent - Liquidity Pool Strategy Engine
 *
 * Manages concentrated liquidity positions with dynamic range
 * optimization, impermanent loss monitoring, and rebalancing logic.
 */

import type { LPPosition } from '../../core/types';

interface LPConfig {
  protocol: 'uniswap-v4' | 'raydium' | 'orca';
  pair: string;
  rangeWidth: number; // percentage width of range around current price (e.g. 0.05 = 5%)
  rebalanceThreshold: number; // how far out of range before rebalance (0-1)
  feeTier: number; // e.g. 0.003 = 0.3%
  maxImpermanentLoss: number; // max tolerable IL as decimal (e.g. 0.05 = 5%)
}

interface RangeResult {
  lower: number;
  upper: number;
}

interface PositionMonitorResult {
  action: 'hold' | 'rebalance' | 'withdraw' | 'compound';
  reason: string;
}

export class LPStrategyEngine {
  private readonly config: LPConfig;

  constructor(config: LPConfig) {
    this.config = config;
  }

  /**
   * Calculate the optimal LP range given current price and volatility.
   *
   * Wider range for higher volatility to stay in-range longer.
   * If SMC zones (order blocks, FVGs) are provided, bias the range
   * toward support/resistance levels.
   */
  analyzeOptimalRange(
    currentPrice: number,
    volatility: number,
    smcZones?: { supportLevels?: number[]; resistanceLevels?: number[] }
  ): RangeResult {
    // Volatility-adjusted range: higher vol -> wider range
    const volMultiplier = Math.max(1, volatility / 0.01);
    const adjustedWidth = this.config.rangeWidth * volMultiplier;

    let lower = currentPrice * (1 - adjustedWidth);
    let upper = currentPrice * (1 + adjustedWidth);

    // Snap to SMC support/resistance if available
    if (smcZones?.supportLevels?.length) {
      const nearestSupport = this.findNearest(smcZones.supportLevels, lower);
      if (nearestSupport && Math.abs(nearestSupport - lower) / currentPrice < 0.02) {
        lower = nearestSupport;
      }
    }

    if (smcZones?.resistanceLevels?.length) {
      const nearestResistance = this.findNearest(smcZones.resistanceLevels, upper);
      if (nearestResistance && Math.abs(nearestResistance - upper) / currentPrice < 0.02) {
        upper = nearestResistance;
      }
    }

    // Ensure lower < upper
    if (lower >= upper) {
      lower = currentPrice * (1 - this.config.rangeWidth);
      upper = currentPrice * (1 + this.config.rangeWidth);
    }

    return { lower, upper };
  }

  /**
   * Calculate impermanent loss for a position.
   *
   * IL formula: IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
   * where priceRatio = currentPrice / entryPrice.
   *
   * Returns a negative number representing percentage loss.
   */
  calculateImpermanentLoss(entryPrice: number, currentPrice: number): number {
    if (entryPrice <= 0) return 0;
    const priceRatio = currentPrice / entryPrice;
    const sqrtRatio = Math.sqrt(priceRatio);
    return 2 * sqrtRatio / (1 + priceRatio) - 1;
  }

  /**
   * Check if a position should be rebalanced.
   *
   * Rebalance triggers:
   * 1. Price has moved outside the position's range
   * 2. Impermanent loss exceeds the configured maximum
   */
  shouldRebalance(position: LPPosition, currentPrice: number): boolean {
    // Check if price is out of range (using tick boundaries as price range)
    const isOutOfRange = currentPrice < position.tickLower || currentPrice > position.tickUpper;

    if (isOutOfRange) return true;

    // Check proximity to range boundaries
    const rangeSize = position.tickUpper - position.tickLower;
    if (rangeSize <= 0) return true;

    const distToLower = currentPrice - position.tickLower;
    const distToUpper = position.tickUpper - currentPrice;
    const minDist = Math.min(distToLower, distToUpper);
    const edgeProximity = minDist / rangeSize;

    // Rebalance if we're within the threshold distance of range edge
    if (edgeProximity < this.config.rebalanceThreshold) return true;

    // Check impermanent loss
    const entryPrice = (position.tickLower + position.tickUpper) / 2;
    const il = Math.abs(this.calculateImpermanentLoss(entryPrice, currentPrice));
    if (il > this.config.maxImpermanentLoss) return true;

    return false;
  }

  /**
   * Monitor a position and return an action recommendation.
   */
  monitorPosition(position: LPPosition, currentPrice: number): PositionMonitorResult {
    const entryPrice = (position.tickLower + position.tickUpper) / 2;
    const il = this.calculateImpermanentLoss(entryPrice, currentPrice);
    const absIL = Math.abs(il);
    const isOutOfRange = currentPrice < position.tickLower || currentPrice > position.tickUpper;

    // Critical: IL exceeds max tolerance
    if (absIL > this.config.maxImpermanentLoss) {
      return {
        action: 'withdraw',
        reason: `Impermanent loss (${(absIL * 100).toFixed(2)}%) exceeds maximum tolerance (${(this.config.maxImpermanentLoss * 100).toFixed(1)}%)`,
      };
    }

    // Out of range: no fees being earned
    if (isOutOfRange) {
      return {
        action: 'rebalance',
        reason: `Price ${currentPrice.toFixed(2)} is outside range [${position.tickLower.toFixed(2)}, ${position.tickUpper.toFixed(2)}]`,
      };
    }

    // Check if fees are worth compounding
    const totalFees = position.unclaimedFees.token0 + position.unclaimedFees.token1;
    if (totalFees > 0 && position.valueUSD > 0) {
      const feePercent = totalFees / position.valueUSD;
      if (feePercent > 0.01) {
        return {
          action: 'compound',
          reason: `Unclaimed fees (${(feePercent * 100).toFixed(2)}% of position) worth compounding`,
        };
      }
    }

    // Near edge: warn about potential rebalance
    if (this.shouldRebalance(position, currentPrice)) {
      return {
        action: 'rebalance',
        reason: `Price approaching range boundary, proactive rebalance recommended`,
      };
    }

    return {
      action: 'hold',
      reason: `Position in range, IL at ${(absIL * 100).toFixed(2)}%`,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private findNearest(levels: number[], target: number): number | null {
    if (levels.length === 0) return null;
    let nearest = levels[0];
    let minDist = Math.abs(levels[0] - target);
    for (let i = 1; i < levels.length; i++) {
      const dist = Math.abs(levels[i] - target);
      if (dist < minDist) {
        minDist = dist;
        nearest = levels[i];
      }
    }
    return nearest;
  }
}
