/**
 * CYPHER AI Trading Agent - Funding Arbitrage Alpha
 * Generates alpha signals from funding rate differentials.
 * Identifies carry trades and cross-exchange funding arbitrage.
 */

import { TradeSignal } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { FundingRateTracker, FundingArbitrageOpportunity } from '../data/FundingRateTracker';
import type { MarketDataService } from '../data/MarketDataService';

// ============================================================================
// Types
// ============================================================================

export interface FundingAlphaSignal {
  type: 'carry_trade' | 'cross_exchange_arb';
  pair: string;
  direction: 'long' | 'short';
  confidence: number;
  annualizedYield: number;
  fundingRate: number;
  exchange?: string;
  counterExchange?: string;
  holdingPeriodHours: number;
  reason: string;
  timestamp: number;
}

export interface FundingAlphaConfig {
  minAnnualizedYield: number;         // min yield to generate signal (default: 0.10 = 10%)
  minCarryFundingRate: number;        // min absolute funding rate for carry (default: 0.001)
  maxCarryHoldingHours: number;       // max holding period for carry trade (default: 72)
  minConfidence: number;              // min confidence to emit signal (default: 0.4)
  crossExchangeMinSpreadBps: number;  // min spread for cross-exchange arb (default: 15)
  lookbackPeriods: number;            // funding rate periods to analyze (default: 24)
  enableCarryTrades: boolean;
  enableCrossExchangeArb: boolean;
}

const DEFAULT_CONFIG: FundingAlphaConfig = {
  minAnnualizedYield: 0.10,
  minCarryFundingRate: 0.001,
  maxCarryHoldingHours: 72,
  minConfidence: 0.4,
  crossExchangeMinSpreadBps: 15,
  lookbackPeriods: 24,
  enableCarryTrades: true,
  enableCrossExchangeArb: true,
};

// ============================================================================
// FundingArbitrageAlpha
// ============================================================================

export class FundingArbitrageAlpha {
  private config: FundingAlphaConfig;
  private eventBus: AgentEventBus;

  constructor(config?: Partial<FundingAlphaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  /** Scan for funding-based alpha signals */
  scan(
    fundingTracker: FundingRateTracker,
    marketData: MarketDataService,
    pairs: string[]
  ): FundingAlphaSignal[] {
    const signals: FundingAlphaSignal[] = [];

    // 1. Carry trades (extreme single-exchange funding)
    if (this.config.enableCarryTrades) {
      for (const pair of pairs) {
        const carrySignal = this.evaluateCarryTrade(pair, fundingTracker);
        if (carrySignal) signals.push(carrySignal);
      }
    }

    // 2. Cross-exchange funding arbitrage
    if (this.config.enableCrossExchangeArb) {
      const arbOpps = fundingTracker.getArbitrageOpportunities();
      for (const opp of arbOpps) {
        const arbSignal = this.evaluateCrossExchangeArb(opp, marketData);
        if (arbSignal) signals.push(arbSignal);
      }
    }

    // Emit signals
    for (const signal of signals) {
      this.eventBus.publish({
        type: 'alpha.funding_arb',
        source: 'FundingArbitrageAlpha',
        data: signal,
        timestamp: Date.now(),
        priority: signal.confidence > 0.7 ? 'high' : 'medium',
      });
    }

    return signals;
  }

  // ============================================================================
  // Carry Trade Analysis
  // ============================================================================

  private evaluateCarryTrade(pair: string, fundingTracker: FundingRateTracker): FundingAlphaSignal | null {
    const currentRate = fundingTracker.getCurrentRate(pair);
    if (!currentRate) return null;

    const absRate = Math.abs(currentRate.rate);
    if (absRate < this.config.minCarryFundingRate) return null;

    const history = fundingTracker.getFundingHistory(pair);
    if (!history) return null;

    // Check if funding is consistently in one direction
    const consistency = this.checkFundingConsistency(history.rates.slice(-this.config.lookbackPeriods));
    if (consistency < 0.6) return null; // need 60%+ consistency

    const annualizedYield = Math.abs(currentRate.annualized);
    if (annualizedYield < this.config.minAnnualizedYield) return null;

    // Direction: take the opposite side of funding payers
    // Positive funding = longs pay shorts → go short to receive funding
    // Negative funding = shorts pay longs → go long to receive funding
    const direction: 'long' | 'short' = currentRate.rate > 0 ? 'short' : 'long';

    // Confidence based on consistency and magnitude
    const magnitudeScore = Math.min(1, annualizedYield / 0.5); // cap at 50% annualized
    const confidence = (consistency * 0.6 + magnitudeScore * 0.4);

    if (confidence < this.config.minConfidence) return null;

    // Determine holding period based on trend
    let holdingPeriodHours = 8; // one funding period
    if (history.trend === 'stable' && consistency > 0.8) {
      holdingPeriodHours = Math.min(this.config.maxCarryHoldingHours, 48);
    }

    return {
      type: 'carry_trade',
      pair,
      direction,
      confidence,
      annualizedYield,
      fundingRate: currentRate.rate,
      holdingPeriodHours,
      reason: `Funding rate ${(currentRate.rate * 100).toFixed(4)}% (${(annualizedYield * 100).toFixed(1)}% annualized), consistency ${(consistency * 100).toFixed(0)}%, trend: ${history.trend}`,
      timestamp: Date.now(),
    };
  }

  private checkFundingConsistency(rates: Array<{ rate: number; timestamp: number }>): number {
    if (rates.length < 3) return 0;

    const direction = rates[rates.length - 1].rate > 0 ? 'positive' : 'negative';
    let consistent = 0;

    for (const entry of rates) {
      if ((direction === 'positive' && entry.rate > 0) ||
          (direction === 'negative' && entry.rate < 0)) {
        consistent++;
      }
    }

    return consistent / rates.length;
  }

  // ============================================================================
  // Cross-Exchange Arbitrage
  // ============================================================================

  private evaluateCrossExchangeArb(
    opp: FundingArbitrageOpportunity,
    marketData: MarketDataService
  ): FundingAlphaSignal | null {
    if (opp.spreadBps < this.config.crossExchangeMinSpreadBps) return null;

    // Check that we can actually trade on both exchanges
    const price = marketData.getMidPrice(opp.pair);
    if (price <= 0) return null;

    // Direction for the primary exchange (we receive funding)
    const direction: 'long' | 'short' = opp.longRate < opp.shortRate ? 'long' : 'short';

    const confidence = Math.min(0.9, opp.confidence);
    if (confidence < this.config.minConfidence) return null;

    return {
      type: 'cross_exchange_arb',
      pair: opp.pair,
      direction,
      confidence,
      annualizedYield: opp.spread,
      fundingRate: direction === 'long' ? opp.longRate : opp.shortRate,
      exchange: direction === 'long' ? opp.longExchange : opp.shortExchange,
      counterExchange: direction === 'long' ? opp.shortExchange : opp.longExchange,
      holdingPeriodHours: 8,
      reason: `Cross-exchange funding arb: ${opp.longExchange} (${(opp.longRate * 100).toFixed(4)}%) vs ${opp.shortExchange} (${(opp.shortRate * 100).toFixed(4)}%), spread ${opp.spreadBps.toFixed(1)} bps`,
      timestamp: Date.now(),
    };
  }

  /** Convert an alpha signal to a TradeSignal for the consensus system */
  toTradeSignal(
    alpha: FundingAlphaSignal,
    currentPrice: number,
    positionSizeUSD: number
  ): TradeSignal {
    // For carry trades, stop loss is wider (vol-based)
    const stopPct = alpha.type === 'carry_trade' ? 0.02 : 0.015;
    const tpPct = alpha.type === 'carry_trade' ? 0.01 : 0.008;

    const stopLoss = alpha.direction === 'long'
      ? currentPrice * (1 - stopPct)
      : currentPrice * (1 + stopPct);

    const takeProfit = alpha.direction === 'long'
      ? currentPrice * (1 + tpPct)
      : currentPrice * (1 - tpPct);

    return {
      id: `funding_${alpha.pair}_${Date.now()}`,
      direction: alpha.direction,
      pair: alpha.pair,
      exchange: alpha.exchange || 'hyperliquid',
      entry: currentPrice,
      stopLoss,
      takeProfit: [takeProfit],
      confidence: alpha.confidence,
      positionSize: positionSizeUSD,
      leverage: 2, // conservative for funding trades
      strategy: 'scalp', // uses scalp execution path
      reason: alpha.reason,
      timestamp: Date.now(),
    };
  }
}
