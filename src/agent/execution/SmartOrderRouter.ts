/**
 * CYPHER AI Trading Agent - Smart Order Router
 * Routes orders to optimal venue based on liquidity, fees, and latency.
 * Supports order splitting across multiple venues for large orders.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import { SlippageController, SlippageEstimate } from './SlippageController';

// ============================================================================
// Types
// ============================================================================

export interface Venue {
  id: string;
  name: string;
  type: 'perp' | 'spot' | 'dex';
  makerFeeBps: number;
  takerFeeBps: number;
  avgLatencyMs: number;
  isAvailable: boolean;
  supportedPairs: Set<string>;
  executeFn: (pair: string, side: 'buy' | 'sell', sizeUSD: number, limitPrice: number) => Promise<VenueExecutionResult>;
  getOrderbookFn?: (pair: string) => Promise<{ bids: [number, number][]; asks: [number, number][] }>;
  getMidPriceFn?: (pair: string) => Promise<number>;
}

export interface VenueExecutionResult {
  success: boolean;
  orderId?: string;
  fillPrice: number;
  filledSize: number;
  feePaid: number;
  latencyMs: number;
  error?: string;
}

export interface RoutingDecision {
  venue: string;
  pair: string;
  side: 'buy' | 'sell';
  sizeUSD: number;
  estimatedSlippageBps: number;
  estimatedFeeBps: number;
  estimatedTotalCostBps: number;
  reason: string;
}

export interface SplitRoutingDecision {
  splits: RoutingDecision[];
  totalSizeUSD: number;
  estimatedTotalCostBps: number;
  splitReason: string;
}

export interface RouterConfig {
  maxVenues: number;                // max venues to split across (default: 3)
  minSplitSizeUSD: number;          // min size per venue split (default: 100)
  splitThresholdUSD: number;        // order size above which to consider splitting (default: 5000)
  preferredVenueWeight: number;     // bonus weight for primary venue (default: 0.1)
  latencyPenaltyPerMs: number;      // cost penalty per ms latency (default: 0.01 bps/ms)
  venueHealthCheckIntervalMs: number; // how often to check venue health (default: 60000)
}

const DEFAULT_CONFIG: RouterConfig = {
  maxVenues: 3,
  minSplitSizeUSD: 100,
  splitThresholdUSD: 5000,
  preferredVenueWeight: 0.1,
  latencyPenaltyPerMs: 0.01,
  venueHealthCheckIntervalMs: 60_000,
};

// ============================================================================
// SmartOrderRouter
// ============================================================================

export class SmartOrderRouter {
  private config: RouterConfig;
  private eventBus: AgentEventBus;
  private venues: Map<string, Venue> = new Map();
  private slippageController: SlippageController;
  private venueStats: Map<string, { fills: number; failures: number; avgSlippageBps: number; avgLatencyMs: number }> = new Map();
  private preferredVenue: string | null = null;

  constructor(slippageController: SlippageController, config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
    this.slippageController = slippageController;
  }

  // ============================================================================
  // Venue Management
  // ============================================================================

  /** Register an execution venue */
  registerVenue(venue: Venue): void {
    this.venues.set(venue.id, venue);
    this.venueStats.set(venue.id, { fills: 0, failures: 0, avgSlippageBps: 0, avgLatencyMs: venue.avgLatencyMs });
  }

  /** Remove a venue */
  removeVenue(venueId: string): void {
    this.venues.delete(venueId);
    this.venueStats.delete(venueId);
  }

  /** Set preferred venue (gets a small routing bonus) */
  setPreferredVenue(venueId: string): void {
    this.preferredVenue = venueId;
  }

  /** Mark venue as unavailable */
  setVenueAvailability(venueId: string, available: boolean): void {
    const venue = this.venues.get(venueId);
    if (venue) venue.isAvailable = available;
  }

  // ============================================================================
  // Routing
  // ============================================================================

  /** Route a single order to best venue */
  routeOrder(pair: string, side: 'buy' | 'sell', sizeUSD: number, midPrice: number): RoutingDecision | null {
    const candidates = this.getCandidateVenues(pair);
    if (candidates.length === 0) return null;

    let bestDecision: RoutingDecision | null = null;
    let bestCost = Infinity;

    for (const venue of candidates) {
      // Estimate slippage
      const slippageEstimate = this.slippageController.estimateSlippage(pair, sizeUSD, side, midPrice);
      const slippageBps = slippageEstimate.estimatedSlippageBps;

      // Fee cost
      const feeBps = side === 'buy' ? venue.takerFeeBps : venue.makerFeeBps;

      // Latency penalty
      const stats = this.venueStats.get(venue.id);
      const latencyBps = (stats?.avgLatencyMs || venue.avgLatencyMs) * this.config.latencyPenaltyPerMs;

      // Reliability penalty (more failures = higher cost)
      const reliabilityPenalty = stats && stats.fills + stats.failures > 10
        ? (stats.failures / (stats.fills + stats.failures)) * 20  // up to 20bps penalty
        : 0;

      // Preferred venue bonus
      const preferredBonus = venue.id === this.preferredVenue ? this.config.preferredVenueWeight * 10 : 0;

      const totalCost = slippageBps + feeBps + latencyBps + reliabilityPenalty - preferredBonus;

      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestDecision = {
          venue: venue.id,
          pair,
          side,
          sizeUSD,
          estimatedSlippageBps: slippageBps,
          estimatedFeeBps: feeBps,
          estimatedTotalCostBps: Math.round(totalCost * 100) / 100,
          reason: `Best cost: ${totalCost.toFixed(1)}bps (slip ${slippageBps.toFixed(1)} + fee ${feeBps} + lat ${latencyBps.toFixed(1)})`,
        };
      }
    }

    return bestDecision;
  }

  /** Route a large order with potential venue splitting */
  routeWithSplitting(pair: string, side: 'buy' | 'sell', sizeUSD: number, midPrice: number): SplitRoutingDecision {
    // If order is small, just route to single venue
    if (sizeUSD <= this.config.splitThresholdUSD) {
      const single = this.routeOrder(pair, side, sizeUSD, midPrice);
      if (!single) return { splits: [], totalSizeUSD: sizeUSD, estimatedTotalCostBps: 0, splitReason: 'No venues available' };
      return { splits: [single], totalSizeUSD: sizeUSD, estimatedTotalCostBps: single.estimatedTotalCostBps, splitReason: 'Single venue' };
    }

    const candidates = this.getCandidateVenues(pair);
    if (candidates.length <= 1) {
      // Only one venue, can't split
      const single = this.routeOrder(pair, side, sizeUSD, midPrice);
      if (!single) return { splits: [], totalSizeUSD: sizeUSD, estimatedTotalCostBps: 0, splitReason: 'No venues available' };
      return { splits: [single], totalSizeUSD: sizeUSD, estimatedTotalCostBps: single.estimatedTotalCostBps, splitReason: 'Only one venue available' };
    }

    // Score each venue for this order
    const venueScores: Array<{ venue: Venue; score: number; maxSizeUSD: number }> = [];

    for (const venue of candidates) {
      const slippage = this.slippageController.estimateSlippage(pair, sizeUSD / 2, side, midPrice);
      const fee = venue.takerFeeBps;
      const score = 1 / (slippage.estimatedSlippageBps + fee + 1); // higher = better
      venueScores.push({ venue, score, maxSizeUSD: sizeUSD }); // could be refined with per-venue depth
    }

    // Sort by score (best first) and take top N
    venueScores.sort((a, b) => b.score - a.score);
    const topVenues = venueScores.slice(0, this.config.maxVenues);

    // Allocate proportionally to scores
    const totalScore = topVenues.reduce((s, v) => s + v.score, 0);
    const splits: RoutingDecision[] = [];

    for (const vs of topVenues) {
      const allocation = totalScore > 0 ? (vs.score / totalScore) * sizeUSD : sizeUSD / topVenues.length;
      if (allocation < this.config.minSplitSizeUSD) continue;

      const slippage = this.slippageController.estimateSlippage(pair, allocation, side, midPrice);

      splits.push({
        venue: vs.venue.id,
        pair,
        side,
        sizeUSD: Math.round(allocation * 100) / 100,
        estimatedSlippageBps: slippage.estimatedSlippageBps,
        estimatedFeeBps: vs.venue.takerFeeBps,
        estimatedTotalCostBps: slippage.estimatedSlippageBps + vs.venue.takerFeeBps,
        reason: `Split ${((vs.score / totalScore) * 100).toFixed(0)}% to ${vs.venue.name}`,
      });
    }

    const totalCost = splits.length > 0
      ? splits.reduce((s, sp) => s + sp.estimatedTotalCostBps * sp.sizeUSD, 0) / sizeUSD
      : 0;

    return {
      splits,
      totalSizeUSD: splits.reduce((s, sp) => s + sp.sizeUSD, 0),
      estimatedTotalCostBps: Math.round(totalCost * 100) / 100,
      splitReason: `Split across ${splits.length} venues for reduced market impact`,
    };
  }

  // ============================================================================
  // Execution
  // ============================================================================

  /** Execute a routing decision */
  async executeDecision(decision: RoutingDecision, limitPrice: number): Promise<VenueExecutionResult> {
    const venue = this.venues.get(decision.venue);
    if (!venue || !venue.isAvailable) {
      return { success: false, fillPrice: 0, filledSize: 0, feePaid: 0, latencyMs: 0, error: `Venue ${decision.venue} unavailable` };
    }

    const startTime = Date.now();

    try {
      const result = await venue.executeFn(decision.pair, decision.side, decision.sizeUSD, limitPrice);
      const latencyMs = Date.now() - startTime;

      // Update venue stats
      this.updateVenueStats(decision.venue, result.success, result.fillPrice, limitPrice, latencyMs);

      // Record fill in slippage controller
      if (result.success && result.fillPrice > 0) {
        this.slippageController.recordFill({
          pair: decision.pair,
          side: decision.side,
          sizeUSD: decision.sizeUSD,
          expectedPrice: limitPrice,
          actualFillPrice: result.fillPrice,
          timestamp: Date.now(),
        });
      }

      return { ...result, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      this.updateVenueStats(decision.venue, false, 0, limitPrice, latencyMs);
      return {
        success: false,
        fillPrice: 0,
        filledSize: 0,
        feePaid: 0,
        latencyMs,
        error: err instanceof Error ? err.message : 'Execution error',
      };
    }
  }

  /** Execute a split routing decision (all splits in parallel) */
  async executeSplitDecision(decision: SplitRoutingDecision, limitPrice: number): Promise<VenueExecutionResult[]> {
    const results = await Promise.allSettled(
      decision.splits.map(split => this.executeDecision(split, limitPrice))
    );

    return results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, fillPrice: 0, filledSize: 0, feePaid: 0, latencyMs: 0, error: r.reason?.message || 'Unknown' }
    );
  }

  // ============================================================================
  // Stats
  // ============================================================================

  /** Update venue performance stats */
  private updateVenueStats(venueId: string, success: boolean, fillPrice: number, expectedPrice: number, latencyMs: number): void {
    const stats = this.venueStats.get(venueId);
    if (!stats) return;

    if (success) {
      stats.fills++;
      if (expectedPrice > 0) {
        const slippageBps = Math.abs(fillPrice - expectedPrice) / expectedPrice * 10000;
        // Exponential moving average
        stats.avgSlippageBps = stats.avgSlippageBps * 0.9 + slippageBps * 0.1;
      }
    } else {
      stats.failures++;
    }

    stats.avgLatencyMs = stats.avgLatencyMs * 0.9 + latencyMs * 0.1;
  }

  /** Get available candidate venues for a pair */
  private getCandidateVenues(pair: string): Venue[] {
    return Array.from(this.venues.values()).filter(v =>
      v.isAvailable && v.supportedPairs.has(pair)
    );
  }

  /** Get venue statistics */
  getVenueStats(): Map<string, { fills: number; failures: number; avgSlippageBps: number; avgLatencyMs: number }> {
    return new Map(this.venueStats);
  }

  /** Get all registered venues */
  getVenues(): Venue[] {
    return Array.from(this.venues.values());
  }
}
