/**
 * CYPHER AI Trading Agent - Auto-Compound Engine
 * Automatically reinvests profits across all strategies.
 *
 * Wired to real connectors:
 *   - LP fees collected from Jupiter/Uniswap LP positions
 *   - MM profits tracked via exchange PnL
 *   - Scalp PnL from realized trade profits
 */

import { AutoCompoundConfig, CompoundResult, LPPosition } from './types';
import { BaseConnector } from '../connectors/BaseConnector';
import { HyperliquidConnector } from '../connectors/HyperliquidConnector';
import { getAgentPersistence } from '../persistence';

export class AutoCompoundEngine {
  private config: AutoCompoundConfig;
  private pendingProfits: Map<string, number> = new Map();
  private compoundHistory: CompoundResult[] = [];

  // Injected dependencies (set by orchestrator before each cycle)
  private connectors: Map<string, BaseConnector | HyperliquidConnector> = new Map();
  private lpPositions: LPPosition[] = [];
  private realizedPnlSinceLastCompound: number = 0;
  private mmPnlSinceLastCompound: number = 0;

  constructor(config: AutoCompoundConfig) {
    this.config = config;
  }

  /**
   * Inject connectors and state from the orchestrator.
   * Called before each compound cycle.
   */
  setContext(ctx: {
    connectors: Map<string, BaseConnector | HyperliquidConnector>;
    lpPositions: LPPosition[];
    realizedPnl: number;
    mmPnl: number;
  }): void {
    this.connectors = ctx.connectors;
    this.lpPositions = ctx.lpPositions;
    this.realizedPnlSinceLastCompound = ctx.realizedPnl;
    this.mmPnlSinceLastCompound = ctx.mmPnl;
  }

  async runCompoundCycle(): Promise<CompoundResult> {
    try {
      // 1. Collect profits from each strategy
      const lpFees = await this.collectLPFees();
      const mmProfits = await this.collectMMProfits();
      const scalpPnl = await this.collectScalpPnl();

      const totalProfits = lpFees + mmProfits + scalpPnl;

      // 2. Check if worth compounding (min amount)
      if (totalProfits < this.config.minAmountUSD) {
        return {
          skipped: true,
          reason: `Below minimum ($${totalProfits.toFixed(2)} < $${this.config.minAmountUSD})`,
          pending: totalProfits,
          timestamp: Date.now(),
        };
      }

      // 3. Check gas cost optimization
      if (this.config.gasOptimization) {
        const gasCost = await this.estimateCompoundGas();
        if (gasCost > totalProfits * this.config.maxGasCostPercent) {
          return {
            skipped: true,
            reason: `Gas too high ($${gasCost.toFixed(2)} > ${(this.config.maxGasCostPercent * 100).toFixed(0)}% of profits)`,
            pending: totalProfits,
            timestamp: Date.now(),
          };
        }
      }

      // 4. Distribute according to config
      const lpAlloc = totalProfits * this.config.distribution.lp;
      const mmAlloc = totalProfits * this.config.distribution.mm;
      const scalpAlloc = totalProfits * this.config.distribution.scalp;

      // 5. Reinvest in each strategy
      await Promise.allSettled([
        this.addToLP(lpAlloc),
        this.addToMM(mmAlloc),
        this.addToScalp(scalpAlloc),
      ]);

      const gasCost = this.config.gasOptimization ? await this.estimateCompoundGas() : 0;

      const result: CompoundResult = {
        skipped: false,
        totalCompounded: totalProfits,
        breakdown: { lpFees, mmProfits, scalpPnl },
        distribution: { lpAlloc, mmAlloc, scalpAlloc },
        gasCost,
        timestamp: Date.now(),
      };

      this.compoundHistory.push(result);

      // Persist compound event to database
      try {
        const persistence = getAgentPersistence();
        await persistence.recordCompound('', result);
      } catch {
        // DB persistence is optional
      }

      // Reset tracking counters
      this.realizedPnlSinceLastCompound = 0;
      this.mmPnlSinceLastCompound = 0;

      return result;
    } catch (error) {
      console.error('[AutoCompoundEngine] Error:', error);
      return {
        skipped: true,
        reason: error instanceof Error ? error.message : 'Unknown compound error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Collect fees from LP positions via real connectors.
   */
  private async collectLPFees(): Promise<number> {
    let totalFees = 0;

    for (const lpPos of this.lpPositions) {
      const connector = this.connectors.get(lpPos.protocol) || this.connectors.get('jupiter');
      if (!connector || !('collectLPFees' in connector)) continue;

      try {
        const result = await (connector as any).collectLPFees(lpPos.id || lpPos.pair);
        if (result && result.success) {
          totalFees += result.feesCollectedUSD || 0;
        }
      } catch (error) {
        console.error(`[AutoCompound] Failed to collect LP fees for ${lpPos.pair}:`, error);
      }
    }

    return totalFees;
  }

  /**
   * Collect profits from market making (tracked by orchestrator).
   */
  private async collectMMProfits(): Promise<number> {
    const profits = Math.max(0, this.mmPnlSinceLastCompound);
    return profits;
  }

  /**
   * Collect PnL from scalping (only positive realized PnL).
   */
  private async collectScalpPnl(): Promise<number> {
    const pnl = Math.max(0, this.realizedPnlSinceLastCompound);
    return pnl;
  }

  /**
   * Estimate gas cost for compound transactions per active chain.
   */
  private async estimateCompoundGas(): Promise<number> {
    let totalGas = 0;
    const activeChains = new Set<string>();

    for (const lpPos of this.lpPositions) {
      activeChains.add(lpPos.protocol);
    }

    for (const chain of activeChains) {
      if (chain === 'hyperliquid') totalGas += 0;
      else if (chain === 'jupiter' || chain === 'raydium') totalGas += 0.02;
      else if (chain === 'uniswap') totalGas += 2.00;
    }

    return totalGas || 0.50;
  }

  /**
   * Add profits to LP by increasing liquidity on the largest position.
   */
  private async addToLP(amount: number): Promise<void> {
    if (amount <= 1) return;

    const sortedLP = [...this.lpPositions].sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0));
    if (sortedLP.length === 0) {
      this.pendingProfits.set('lp', (this.pendingProfits.get('lp') || 0) + amount);
      return;
    }

    const targetLP = sortedLP[0];
    const connector = this.connectors.get(targetLP.protocol) || this.connectors.get('jupiter');

    if (connector && 'increaseLiquidity' in connector) {
      try {
        const result = await (connector as any).increaseLiquidity(targetLP.id || targetLP.pair, amount / 2, amount / 2);
        if (result?.success) {
          return;
        }
      } catch { /* fall through */ }
    }

    this.pendingProfits.set('lp', (this.pendingProfits.get('lp') || 0) + amount);
  }

  /**
   * Add profits to MM capital pool (orchestrator reads pending and adjusts).
   */
  private async addToMM(amount: number): Promise<void> {
    if (amount <= 0) return;
    this.pendingProfits.set('mm', (this.pendingProfits.get('mm') || 0) + amount);
  }

  /**
   * Add profits to scalping capital pool.
   */
  private async addToScalp(amount: number): Promise<void> {
    if (amount <= 0) return;
    this.pendingProfits.set('scalp', (this.pendingProfits.get('scalp') || 0) + amount);
  }

  /** Get pending profits not yet deployed by orchestrator. */
  getPendingProfits(): Map<string, number> {
    return new Map(this.pendingProfits);
  }

  /** Clear pending profits after orchestrator applies them. */
  clearPendingProfits(strategy: string): void {
    this.pendingProfits.delete(strategy);
  }

  updateConfig(config: Partial<AutoCompoundConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getHistory(): CompoundResult[] {
    return [...this.compoundHistory];
  }
}
