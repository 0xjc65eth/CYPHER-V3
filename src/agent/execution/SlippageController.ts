/**
 * CYPHER AI Trading Agent - Slippage Controller
 * Estimates and controls slippage for order execution.
 * Uses orderbook depth, historical fill data, and market impact models.
 */

import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

// ============================================================================
// Types
// ============================================================================

export interface SlippageEstimate {
  pair: string;
  sizeUSD: number;
  side: 'buy' | 'sell';
  estimatedSlippageBps: number;    // basis points
  estimatedPriceImpact: number;    // percentage
  estimatedFillPrice: number;      // expected avg fill
  midPrice: number;
  confidence: number;              // 0-1, how reliable the estimate is
  breakdown: {
    spreadCostBps: number;         // half-spread cost
    depthImpactBps: number;        // orderbook depth impact
    volatilityBps: number;         // vol-adjusted component
  };
  timestamp: number;
}

export interface FillRecord {
  pair: string;
  side: 'buy' | 'sell';
  sizeUSD: number;
  expectedPrice: number;
  actualFillPrice: number;
  slippageBps: number;
  timestamp: number;
}

export interface SlippageControllerConfig {
  maxSlippageBps: number;            // max acceptable slippage (default: 50 = 0.5%)
  warningSlippageBps: number;        // warning threshold (default: 20 = 0.2%)
  historicalLookback: number;        // fill records to keep (default: 500)
  volatilityWeight: number;          // how much volatility affects estimate (default: 0.3)
  depthLookbackPct: number;          // how deep into book to analyze (default: 0.02 = 2%)
}

const DEFAULT_CONFIG: SlippageControllerConfig = {
  maxSlippageBps: 50,
  warningSlippageBps: 20,
  historicalLookback: 500,
  volatilityWeight: 0.3,
  depthLookbackPct: 0.02,
};

// ============================================================================
// SlippageController
// ============================================================================

export class SlippageController {
  private config: SlippageControllerConfig;
  private eventBus: AgentEventBus;
  private fillHistory: FillRecord[] = [];
  private orderbookSnapshots: Map<string, { bids: [number, number][]; asks: [number, number][]; timestamp: number }> = new Map();
  private volatilities: Map<string, number> = new Map(); // pair -> annualized vol

  constructor(config?: Partial<SlippageControllerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Orderbook Data Ingestion
  // ============================================================================

  /** Update orderbook snapshot for a pair */
  updateOrderbook(pair: string, bids: [number, number][], asks: [number, number][]): void {
    this.orderbookSnapshots.set(pair, { bids, asks, timestamp: Date.now() });
  }

  /** Update volatility estimate */
  updateVolatility(pair: string, annualizedVol: number): void {
    this.volatilities.set(pair, annualizedVol);
  }

  // ============================================================================
  // Slippage Estimation
  // ============================================================================

  /** Estimate slippage for a hypothetical order */
  estimateSlippage(pair: string, sizeUSD: number, side: 'buy' | 'sell', midPrice: number): SlippageEstimate {
    const book = this.orderbookSnapshots.get(pair);
    const vol = this.volatilities.get(pair) || 0.5;

    // Component 1: Spread cost (half-spread)
    let spreadCostBps = 5; // default 0.05%
    if (book && book.bids.length > 0 && book.asks.length > 0) {
      const bestBid = book.bids[0][0];
      const bestAsk = book.asks[0][0];
      const spread = bestAsk - bestBid;
      const mid = (bestBid + bestAsk) / 2;
      spreadCostBps = mid > 0 ? (spread / mid / 2) * 10000 : 5;
    }

    // Component 2: Depth impact (walk the book)
    let depthImpactBps = 0;
    if (book) {
      const levels = side === 'buy' ? book.asks : book.bids;
      depthImpactBps = this.walkBook(levels, sizeUSD, midPrice);
    } else {
      // No orderbook: estimate from size and typical crypto market depth
      depthImpactBps = Math.sqrt(sizeUSD / 10000) * 2; // rough heuristic
    }

    // Component 3: Volatility component
    // Higher vol = wider expected slippage
    const hourlyVol = vol / Math.sqrt(8760); // annualized -> hourly
    const volatilityBps = hourlyVol * 10000 * this.config.volatilityWeight;

    // Component 4: Historical adjustment
    const historicalAdj = this.getHistoricalAdjustment(pair, side);

    const totalBps = (spreadCostBps + depthImpactBps + volatilityBps) * historicalAdj;

    const estimatedPriceImpact = totalBps / 10000;
    const fillPriceMultiplier = side === 'buy' ? (1 + estimatedPriceImpact) : (1 - estimatedPriceImpact);
    const estimatedFillPrice = midPrice * fillPriceMultiplier;

    // Confidence based on data availability
    const hasBook = book !== undefined && (Date.now() - book.timestamp) < 10000;
    const hasHistory = this.fillHistory.filter(f => f.pair === pair).length >= 5;
    const confidence = (hasBook ? 0.5 : 0.2) + (hasHistory ? 0.3 : 0.1) + (vol > 0 ? 0.2 : 0);

    return {
      pair,
      sizeUSD,
      side,
      estimatedSlippageBps: Math.round(totalBps * 100) / 100,
      estimatedPriceImpact,
      estimatedFillPrice,
      midPrice,
      confidence: Math.min(1, confidence),
      breakdown: {
        spreadCostBps: Math.round(spreadCostBps * 100) / 100,
        depthImpactBps: Math.round(depthImpactBps * 100) / 100,
        volatilityBps: Math.round(volatilityBps * 100) / 100,
      },
      timestamp: Date.now(),
    };
  }

  /** Check if order would exceed max slippage */
  isSlippageAcceptable(estimate: SlippageEstimate): { acceptable: boolean; reason: string } {
    if (estimate.estimatedSlippageBps > this.config.maxSlippageBps) {
      return {
        acceptable: false,
        reason: `Estimated slippage ${estimate.estimatedSlippageBps.toFixed(1)}bps exceeds max ${this.config.maxSlippageBps}bps`,
      };
    }

    if (estimate.estimatedSlippageBps > this.config.warningSlippageBps) {
      return {
        acceptable: true,
        reason: `Warning: slippage ${estimate.estimatedSlippageBps.toFixed(1)}bps above warning threshold ${this.config.warningSlippageBps}bps`,
      };
    }

    return { acceptable: true, reason: 'OK' };
  }

  /** Compute limit price with slippage protection */
  computeLimitPrice(midPrice: number, side: 'buy' | 'sell', maxSlippageBps: number): number {
    const slippagePct = maxSlippageBps / 10000;
    return side === 'buy'
      ? midPrice * (1 + slippagePct)
      : midPrice * (1 - slippagePct);
  }

  // ============================================================================
  // Fill Recording & Historical Analysis
  // ============================================================================

  /** Record an actual fill for calibration */
  recordFill(fill: Omit<FillRecord, 'slippageBps'>): void {
    const slippageBps = fill.expectedPrice > 0
      ? Math.abs(fill.actualFillPrice - fill.expectedPrice) / fill.expectedPrice * 10000
      : 0;

    const record: FillRecord = { ...fill, slippageBps };
    this.fillHistory.push(record);

    if (this.fillHistory.length > this.config.historicalLookback) {
      this.fillHistory = this.fillHistory.slice(-this.config.historicalLookback);
    }

    // Emit if slippage was high
    if (slippageBps > this.config.warningSlippageBps) {
      this.eventBus.publish({
        type: 'execution.slippage_warning',
        source: 'SlippageController',
        data: { pair: fill.pair, slippageBps, sizeUSD: fill.sizeUSD, side: fill.side },
        timestamp: Date.now(),
        priority: slippageBps > this.config.maxSlippageBps ? 'high' : 'medium',
      });
    }
  }

  /** Get fill statistics for a pair */
  getFillStats(pair?: string): { avgSlippageBps: number; maxSlippageBps: number; fillCount: number; recentSlippageBps: number } {
    const fills = pair ? this.fillHistory.filter(f => f.pair === pair) : this.fillHistory;
    if (fills.length === 0) return { avgSlippageBps: 0, maxSlippageBps: 0, fillCount: 0, recentSlippageBps: 0 };

    const slippages = fills.map(f => f.slippageBps);
    const recent = fills.slice(-10).map(f => f.slippageBps);

    return {
      avgSlippageBps: slippages.reduce((s, v) => s + v, 0) / slippages.length,
      maxSlippageBps: Math.max(...slippages),
      fillCount: fills.length,
      recentSlippageBps: recent.length > 0 ? recent.reduce((s, v) => s + v, 0) / recent.length : 0,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /** Walk orderbook to estimate price impact */
  private walkBook(levels: [number, number][], sizeUSD: number, midPrice: number): number {
    if (levels.length === 0 || midPrice <= 0) return 10; // conservative default

    let remainingUSD = sizeUSD;
    let totalCost = 0;
    let totalSize = 0;

    for (const [price, qty] of levels) {
      const levelUSD = price * qty;
      const fillUSD = Math.min(remainingUSD, levelUSD);
      const fillQty = fillUSD / price;

      totalCost += fillQty * price;
      totalSize += fillQty;
      remainingUSD -= fillUSD;

      if (remainingUSD <= 0) break;
    }

    if (totalSize === 0) return 20; // thin book

    const avgFillPrice = totalCost / totalSize;
    const impactBps = Math.abs(avgFillPrice - midPrice) / midPrice * 10000;

    // If couldn't fill entirely, add penalty
    if (remainingUSD > 0) {
      const unfillablePct = remainingUSD / sizeUSD;
      return impactBps + unfillablePct * 100; // 1% penalty per unfillable portion
    }

    return impactBps;
  }

  /** Get historical adjustment factor (calibration) */
  private getHistoricalAdjustment(pair: string, side: 'buy' | 'sell'): number {
    const fills = this.fillHistory.filter(f => f.pair === pair && f.side === side).slice(-20);
    if (fills.length < 3) return 1.0; // not enough data

    // Compare predicted vs actual
    // If actual is consistently higher, adjustment > 1
    const avgSlippage = fills.reduce((s, f) => s + f.slippageBps, 0) / fills.length;
    if (avgSlippage <= 0) return 1.0;

    // Clamp between 0.5 and 2.0
    return Math.max(0.5, Math.min(2.0, avgSlippage / 10));
  }
}

// Singleton
let slippageControllerInstance: SlippageController | null = null;

export function getSlippageController(config?: Partial<SlippageControllerConfig>): SlippageController {
  if (!slippageControllerInstance) {
    slippageControllerInstance = new SlippageController(config);
  }
  return slippageControllerInstance;
}
