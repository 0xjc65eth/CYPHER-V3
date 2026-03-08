/**
 * CYPHER AI Trading Agent - Funding Rate Tracker
 * Tracks funding rates across exchanges, detects arbitrage opportunities,
 * and maintains historical funding for strategy optimization.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import type { FundingSnapshot } from './MarketDataService';

// ============================================================================
// Types
// ============================================================================

export interface FundingHistory {
  pair: string;
  rates: Array<{ rate: number; timestamp: number }>;
  avgRate8h: number;
  avgRate24h: number;
  avgRate7d: number;
  volatility: number;      // standard deviation of rates
  trend: 'rising' | 'falling' | 'stable';
}

export interface FundingArbitrageOpportunity {
  pair: string;
  longExchange: string;
  shortExchange: string;
  longRate: number;
  shortRate: number;
  spread: number;          // annualized spread
  spreadBps: number;       // basis points
  estimatedPnlPerDay: number;
  confidence: number;      // 0-1
  timestamp: number;
}

export interface FundingTrackerConfig {
  historyWindowMs: number;      // how long to keep history (default: 7 days)
  arbThresholdBps: number;      // minimum spread for arb alert (default: 10)
  maxPairs: number;             // max pairs to track (default: 100)
  anomalyStdDevMultiplier: number; // flag rates > N stddev from mean (default: 2)
}

const DEFAULT_CONFIG: FundingTrackerConfig = {
  historyWindowMs: 7 * 24 * 60 * 60 * 1000,
  arbThresholdBps: 10,
  maxPairs: 100,
  anomalyStdDevMultiplier: 2,
};

// ============================================================================
// FundingRateTracker
// ============================================================================

export class FundingRateTracker {
  private config: FundingTrackerConfig;
  private eventBus: AgentEventBus;

  // pair -> exchange -> history
  private history: Map<string, Map<string, Array<{ rate: number; timestamp: number }>>> = new Map();
  // pair -> latest snapshot per exchange
  private latest: Map<string, Map<string, FundingSnapshot>> = new Map();
  // Detected arb opportunities
  private arbOpportunities: FundingArbitrageOpportunity[] = [];

  constructor(config?: Partial<FundingTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Ingestion
  // ============================================================================

  /** Record a funding rate observation */
  recordRate(pair: string, exchange: string, rate: number, nextFundingTime: number, premium: number = 0): void {
    const now = Date.now();

    // Update latest
    if (!this.latest.has(pair)) this.latest.set(pair, new Map());
    this.latest.get(pair)!.set(exchange, {
      pair,
      rate,
      annualized: rate * 3 * 365,
      nextFundingTime,
      premium,
      timestamp: now,
    });

    // Append to history
    if (!this.history.has(pair)) this.history.set(pair, new Map());
    if (!this.history.get(pair)!.has(exchange)) this.history.get(pair)!.set(exchange, []);

    const hist = this.history.get(pair)!.get(exchange)!;
    hist.push({ rate, timestamp: now });

    // Trim history outside window
    const cutoff = now - this.config.historyWindowMs;
    const trimIdx = hist.findIndex(h => h.timestamp >= cutoff);
    if (trimIdx > 0) {
      this.history.get(pair)!.set(exchange, hist.slice(trimIdx));
    }

    // Check for anomalies
    this.checkAnomalies(pair, exchange, rate);

    // Check for arb opportunities across exchanges
    this.scanForArbitrage(pair);
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /** Get aggregated funding history for a pair (across all exchanges) */
  getFundingHistory(pair: string, exchange?: string): FundingHistory | null {
    const pairHistory = this.history.get(pair);
    if (!pairHistory) return null;

    let allRates: Array<{ rate: number; timestamp: number }> = [];

    if (exchange) {
      const exHist = pairHistory.get(exchange);
      if (!exHist) return null;
      allRates = exHist;
    } else {
      for (const exHist of pairHistory.values()) {
        allRates.push(...exHist);
      }
      allRates.sort((a, b) => a.timestamp - b.timestamp);
    }

    if (allRates.length === 0) return null;

    const now = Date.now();
    const rates8h = allRates.filter(r => r.timestamp >= now - 8 * 60 * 60 * 1000);
    const rates24h = allRates.filter(r => r.timestamp >= now - 24 * 60 * 60 * 1000);
    const rates7d = allRates;

    const avg = (arr: Array<{ rate: number }>) =>
      arr.length > 0 ? arr.reduce((s, r) => s + r.rate, 0) / arr.length : 0;

    const avgRate = avg(allRates);
    const variance = allRates.reduce((s, r) => s + Math.pow(r.rate - avgRate, 2), 0) / (allRates.length || 1);
    const volatility = Math.sqrt(variance);

    // Determine trend from recent rates
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (rates8h.length >= 3) {
      const recentAvg = avg(rates8h.slice(-3));
      const olderAvg = avg(rates8h.slice(0, 3));
      if (recentAvg > olderAvg * 1.1) trend = 'rising';
      else if (recentAvg < olderAvg * 0.9) trend = 'falling';
    }

    return {
      pair,
      rates: allRates,
      avgRate8h: avg(rates8h),
      avgRate24h: avg(rates24h),
      avgRate7d: avg(rates7d),
      volatility,
      trend,
    };
  }

  /** Get current funding rate for a pair */
  getCurrentRate(pair: string, exchange?: string): FundingSnapshot | null {
    const pairLatest = this.latest.get(pair);
    if (!pairLatest) return null;

    if (exchange) return pairLatest.get(exchange) || null;

    // Return the most recent across all exchanges
    let newest: FundingSnapshot | null = null;
    for (const snap of pairLatest.values()) {
      if (!newest || snap.timestamp > newest.timestamp) {
        newest = snap;
      }
    }
    return newest;
  }

  /** Get all active arb opportunities */
  getArbitrageOpportunities(): FundingArbitrageOpportunity[] {
    return [...this.arbOpportunities];
  }

  /** Get pairs sorted by absolute funding rate (most extreme first) */
  getExtremeFundingPairs(limit: number = 10): Array<{ pair: string; rate: number; annualized: number }> {
    const result: Array<{ pair: string; rate: number; annualized: number }> = [];

    for (const [pair, exchangeMap] of this.latest) {
      for (const snap of exchangeMap.values()) {
        result.push({
          pair,
          rate: snap.rate,
          annualized: snap.annualized,
        });
      }
    }

    return result
      .sort((a, b) => Math.abs(b.annualized) - Math.abs(a.annualized))
      .slice(0, limit);
  }

  // ============================================================================
  // Anomaly Detection
  // ============================================================================

  private checkAnomalies(pair: string, exchange: string, rate: number): void {
    const hist = this.history.get(pair)?.get(exchange);
    if (!hist || hist.length < 10) return;

    const rates = hist.map(h => h.rate);
    const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
    const stdDev = Math.sqrt(rates.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / rates.length);

    if (stdDev > 0 && Math.abs(rate - mean) > stdDev * this.config.anomalyStdDevMultiplier) {
      this.eventBus.publish({
        type: 'funding.update',
        source: 'FundingRateTracker',
        data: {
          type: 'anomaly',
          pair,
          exchange,
          rate,
          mean,
          stdDev,
          deviations: Math.abs(rate - mean) / stdDev,
        },
        timestamp: Date.now(),
        priority: 'high',
      });
    }
  }

  // ============================================================================
  // Arbitrage Detection
  // ============================================================================

  private scanForArbitrage(pair: string): void {
    const pairLatest = this.latest.get(pair);
    if (!pairLatest || pairLatest.size < 2) return;

    const exchanges = Array.from(pairLatest.entries());
    const newOpps: FundingArbitrageOpportunity[] = [];

    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const [exA, snapA] = exchanges[i];
        const [exB, snapB] = exchanges[j];

        const spread = Math.abs(snapA.annualized - snapB.annualized);
        const spreadBps = spread * 10000;

        if (spreadBps >= this.config.arbThresholdBps) {
          const longExchange = snapA.rate < snapB.rate ? exA : exB;
          const shortExchange = snapA.rate < snapB.rate ? exB : exA;
          const longRate = Math.min(snapA.rate, snapB.rate);
          const shortRate = Math.max(snapA.rate, snapB.rate);

          newOpps.push({
            pair,
            longExchange,
            shortExchange,
            longRate,
            shortRate,
            spread,
            spreadBps,
            estimatedPnlPerDay: spread / 365,
            confidence: Math.min(0.9, spreadBps / 100),
            timestamp: Date.now(),
          });
        }
      }
    }

    // Update opportunities for this pair
    this.arbOpportunities = [
      ...this.arbOpportunities.filter(o => o.pair !== pair),
      ...newOpps,
    ];

    // Emit arb event
    for (const opp of newOpps) {
      this.eventBus.publish({
        type: 'alpha.funding_arb',
        source: 'FundingRateTracker',
        data: opp,
        timestamp: Date.now(),
        priority: 'medium',
      });
    }
  }

  /** Clean up stale data */
  cleanup(): void {
    const cutoff = Date.now() - this.config.historyWindowMs;

    for (const [pair, exchangeMap] of this.history) {
      for (const [exchange, hist] of exchangeMap) {
        const trimmed = hist.filter(h => h.timestamp >= cutoff);
        if (trimmed.length === 0) {
          exchangeMap.delete(exchange);
        } else {
          exchangeMap.set(exchange, trimmed);
        }
      }
      if (exchangeMap.size === 0) this.history.delete(pair);
    }

    // Remove stale arb opportunities (older than 5 minutes)
    this.arbOpportunities = this.arbOpportunities.filter(o => Date.now() - o.timestamp < 300000);
  }
}

// Singleton
let fundingTrackerInstance: FundingRateTracker | null = null;

export function getFundingRateTracker(config?: Partial<FundingTrackerConfig>): FundingRateTracker {
  if (!fundingTrackerInstance) {
    fundingTrackerInstance = new FundingRateTracker(config);
  }
  return fundingTrackerInstance;
}
