/**
 * CYPHER AI Trading Agent - LP Execution Engine
 * Bridges LPStrategyEngine analysis → connector execution.
 *
 * Handles the full LP lifecycle:
 *   - Open new positions (createLPPosition)
 *   - Close positions (collectFees → closeLPPosition)
 *   - Rebalance (close → open at new range)
 *   - Reinvest fees (collectFees → increaseLiquidity)
 */

import { LPPosition } from '../../core/types';
import { BaseConnector, LPCreateParams, LPCollectResult } from '../../connectors/BaseConnector';
import { HyperliquidConnector } from '../../connectors/HyperliquidConnector';
import { LPStrategyEngine } from './LPStrategyEngine';
import { AgentEventBus } from '../../consensus/AgentEventBus';

export interface LPRiskConfig {
  maxPositionPct: number;   // max % of LP capital per position (e.g. 0.25 = 25%)
  maxILPct: number;         // max impermanent loss before forced close (e.g. 0.05 = 5%)
  maxOutOfRangeMinutes: number; // max time out of range before rebalance (e.g. 120)
}

export class LPExecutionEngine {
  private outOfRangeTimers: Map<string, number> = new Map(); // positionId → timestamp when went out of range

  constructor(
    private connectors: Map<string, BaseConnector | HyperliquidConnector>,
    private lpStrategy: LPStrategyEngine,
    private eventBus: AgentEventBus,
    private riskConfig: LPRiskConfig,
  ) {}

  // ========================================================================
  // Position Lifecycle
  // ========================================================================

  /**
   * Open a new LP position on the appropriate connector.
   */
  async openPosition(
    market: { pair: string; exchange: string },
    capitalUSD: number,
    currentPrice: number,
    volatility: number,
  ): Promise<LPPosition | null> {
    const connector = this.connectors.get(market.exchange);
    if (!connector || !('createLPPosition' in connector)) return null;

    try {
      // Use LPStrategyEngine for optimal range
      const range = this.lpStrategy.analyzeOptimalRange(currentPrice, volatility);

      // Split capital 50/50 into token amounts
      const amount0 = capitalUSD / 2 / currentPrice; // base token amount
      const amount1 = capitalUSD / 2;                 // quote token amount (USDC)

      const [token0, token1] = market.pair.split('/');

      const params: LPCreateParams = {
        token0: token0 || 'SOL',
        token1: token1 || 'USDC',
        amount0,
        amount1,
        feeTier: 0.003,
        tickLower: range.lower,
        tickUpper: range.upper,
      };

      const position = await connector.createLPPosition(params);

      this.eventBus.publish({
        type: 'execution_report',
        source: 'LPExecutionEngine',
        data: {
          action: 'lp_opened',
          pair: market.pair,
          exchange: market.exchange,
          positionId: position.id,
          range: { lower: range.lower, upper: range.upper },
          capitalUSD,
        },
        timestamp: Date.now(),
        priority: 'high',
      });

      return position;
    } catch (error) {
      console.error(`[LPExecutionEngine] openPosition error for ${market.pair}:`, error);
      return null;
    }
  }

  /**
   * Close an LP position: collect fees first, then remove all liquidity.
   */
  async closePosition(position: LPPosition, reason: string): Promise<boolean> {
    const connector = this.getConnectorForPosition(position);
    if (!connector) return false;

    try {
      // 1. Collect any unclaimed fees first
      if ('collectLPFees' in connector) {
        try {
          await connector.collectLPFees(position.id);
        } catch {
          // Fee collection failure is non-critical — proceed with close
        }
      }

      // 2. Close the position (removes all liquidity)
      const success = await connector.closeLPPosition(position.id);

      if (success) {
        this.outOfRangeTimers.delete(position.id);

        this.eventBus.publish({
          type: 'execution_report',
          source: 'LPExecutionEngine',
          data: {
            action: 'lp_closed',
            pair: position.pair,
            positionId: position.id,
            reason,
          },
          timestamp: Date.now(),
          priority: 'high',
        });
      }

      return success;
    } catch (error) {
      console.error(`[LPExecutionEngine] closePosition error for ${position.pair}:`, error);
      return false;
    }
  }

  /**
   * Rebalance: close existing position → open new one at optimal range.
   * Fees collected during close are added to the new position capital.
   */
  async rebalancePosition(
    position: LPPosition,
    market: { pair: string; exchange: string },
    currentPrice: number,
    volatility: number,
  ): Promise<LPPosition | null> {
    try {
      // 1. Collect fees before closing
      let collectedFees: LPCollectResult | null = null;
      const connector = this.getConnectorForPosition(position);
      if (connector && 'collectLPFees' in connector) {
        try {
          collectedFees = await connector.collectLPFees(position.id);
        } catch { /* non-critical */ }
      }

      // 2. Close existing position
      const closed = await this.closePosition(position, 'rebalance');
      if (!closed) return null;

      // 3. Calculate new capital (original + collected fees)
      const originalCapital = (position.token0Amount * currentPrice) + position.token1Amount;
      const feeCapital = collectedFees ? collectedFees.valueUSD : 0;
      const totalCapital = originalCapital + feeCapital;

      // 4. Open new position at optimal range
      const newPosition = await this.openPosition(market, totalCapital, currentPrice, volatility);

      if (newPosition) {
        this.eventBus.publish({
          type: 'execution_report',
          source: 'LPExecutionEngine',
          data: {
            action: 'lp_rebalanced',
            pair: market.pair,
            oldPositionId: position.id,
            newPositionId: newPosition.id,
            capitalUSD: totalCapital,
            feesReinvested: feeCapital,
          },
          timestamp: Date.now(),
          priority: 'medium',
        });
      }

      return newPosition;
    } catch (error) {
      console.error(`[LPExecutionEngine] rebalancePosition error for ${position.pair}:`, error);
      return null;
    }
  }

  /**
   * Reinvest accumulated fees back into an existing LP position.
   */
  async reinvestFees(position: LPPosition): Promise<boolean> {
    const connector = this.getConnectorForPosition(position);
    if (!connector) return false;

    try {
      // 1. Collect fees
      if (!('collectLPFees' in connector)) return false;
      const fees = await connector.collectLPFees(position.id);
      if (!fees || (fees.token0 <= 0 && fees.token1 <= 0)) return false;

      // 2. Increase liquidity with collected fees
      if (!('increaseLiquidity' in connector)) return false;
      const success = await connector.increaseLiquidity(position.id, fees.token0, fees.token1);

      if (success) {
        this.eventBus.publish({
          type: 'execution_report',
          source: 'LPExecutionEngine',
          data: {
            action: 'lp_fees_reinvested',
            pair: position.pair,
            positionId: position.id,
            token0Reinvested: fees.token0,
            token1Reinvested: fees.token1,
          },
          timestamp: Date.now(),
          priority: 'low',
        });
      }

      return success;
    } catch (error) {
      console.error(`[LPExecutionEngine] reinvestFees error for ${position.pair}:`, error);
      return false;
    }
  }

  // ========================================================================
  // Risk Checks
  // ========================================================================

  /**
   * Determine if a position should be closed based on risk criteria.
   */
  shouldClosePosition(
    position: LPPosition,
    currentPrice: number,
  ): { close: boolean; reason: string } {
    // 1. Check impermanent loss
    const entryPrice = (position.tickLower + position.tickUpper) / 2;
    const il = this.lpStrategy.calculateImpermanentLoss(entryPrice, currentPrice);
    if (Math.abs(il) > this.riskConfig.maxILPct) {
      return { close: true, reason: `IL ${(il * 100).toFixed(2)}% exceeds max ${(this.riskConfig.maxILPct * 100).toFixed(0)}%` };
    }

    // 2. Check out-of-range duration
    const inRange = currentPrice >= position.tickLower && currentPrice <= position.tickUpper;
    if (!inRange) {
      const now = Date.now();
      if (!this.outOfRangeTimers.has(position.id)) {
        this.outOfRangeTimers.set(position.id, now);
      }
      const outOfRangeSince = this.outOfRangeTimers.get(position.id)!;
      const outOfRangeMinutes = (now - outOfRangeSince) / 60_000;
      if (outOfRangeMinutes > this.riskConfig.maxOutOfRangeMinutes) {
        return { close: true, reason: `Out of range for ${Math.floor(outOfRangeMinutes)} minutes` };
      }
    } else {
      // Reset timer when back in range
      this.outOfRangeTimers.delete(position.id);
    }

    return { close: false, reason: '' };
  }

  /**
   * Calculate how much capital to allocate to a new LP position.
   */
  calculatePositionSize(totalLPCapitalUSD: number, existingPositions: LPPosition[]): number {
    const maxPerPosition = totalLPCapitalUSD * this.riskConfig.maxPositionPct;
    const existingValue = existingPositions.reduce((sum, p) => sum + p.valueUSD, 0);
    const availableCapital = totalLPCapitalUSD - existingValue;

    return Math.min(maxPerPosition, Math.max(0, availableCapital));
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private getConnectorForPosition(position: LPPosition): BaseConnector | null {
    // Map protocol to connector key
    const protocolMap: Record<string, string> = {
      'raydium': 'jupiter',
      'uniswap-v4': 'uniswap',
      'orca': 'jupiter',
    };
    const connectorKey = protocolMap[position.protocol] || position.protocol;
    return (this.connectors.get(connectorKey) as BaseConnector) || null;
  }
}
