/**
 * CYPHER AI Trading Agent - Market Regime Detector
 * Combines volatility and trend analysis to classify the overall market regime.
 * Publishes regime change events for strategy adaptation.
 */

import { Candle } from '../core/types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';
import { VolatilityRegime, VolatilityRegimeResult, VolatilityState } from './VolatilityRegime';
import { TrendRegime, TrendRegimeResult, TrendState } from './TrendRegime';

// ============================================================================
// Types
// ============================================================================

export type MarketRegime =
  | 'trending_low_vol'    // Strong trend, low volatility — optimal for trend following
  | 'trending_high_vol'   // Strong trend, high volatility — trend following with wider stops
  | 'ranging_low_vol'     // No trend, low volatility — optimal for mean reversion / MM
  | 'ranging_high_vol'    // No trend, high volatility — dangerous, reduce size
  | 'breakout'            // Transitioning from low vol to high vol — potential opportunity
  | 'crisis'              // Extreme volatility + liquidation cascades — defensive mode
  | 'unknown';            // Insufficient data

export interface MarketRegimeAnalysis {
  regime: MarketRegime;
  volatility: VolatilityRegimeResult;
  trend: TrendRegimeResult;
  confidence: number;                // 0-1
  recommendedStrategies: string[];   // strategies that work in this regime
  riskMultiplier: number;            // position size multiplier (0.1 - 1.5)
  suggestedLeverage: number;         // max recommended leverage
  timestamp: number;
}

export interface RegimeHistory {
  regime: MarketRegime;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

// ============================================================================
// MarketRegimeDetector
// ============================================================================

export class MarketRegimeDetector {
  private volatilityRegime: VolatilityRegime;
  private trendRegime: TrendRegime;
  private eventBus: AgentEventBus;

  // Per-pair regime tracking
  private currentRegimes: Map<string, MarketRegime> = new Map();
  private regimeHistory: Map<string, RegimeHistory[]> = new Map();
  private lastAnalysis: Map<string, MarketRegimeAnalysis> = new Map();
  private maxHistoryLength = 100;

  constructor() {
    this.volatilityRegime = new VolatilityRegime();
    this.trendRegime = new TrendRegime();
    this.eventBus = getAgentEventBus();
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /** Run full regime analysis for a pair */
  analyze(pair: string, candles: Candle[]): MarketRegimeAnalysis | null {
    const volResult = this.volatilityRegime.analyze(candles);
    const trendResult = this.trendRegime.analyze(candles);

    if (!volResult || !trendResult) return null;

    // Classify regime from volatility + trend combination
    const regime = this.classifyRegime(volResult, trendResult);

    // Strategy recommendations
    const recommendedStrategies = this.getRecommendedStrategies(regime);

    // Risk adjustments
    const riskMultiplier = this.getRiskMultiplier(regime, volResult);
    const suggestedLeverage = this.getSuggestedLeverage(regime, volResult);

    // Composite confidence
    const confidence = (volResult.confidence + trendResult.confidence) / 2;

    const analysis: MarketRegimeAnalysis = {
      regime,
      volatility: volResult,
      trend: trendResult,
      confidence,
      recommendedStrategies,
      riskMultiplier,
      suggestedLeverage,
      timestamp: Date.now(),
    };

    // Detect regime change
    const prevRegime = this.currentRegimes.get(pair);
    if (prevRegime && prevRegime !== regime) {
      this.onRegimeChange(pair, prevRegime, regime, analysis);
    }

    this.currentRegimes.set(pair, regime);
    this.lastAnalysis.set(pair, analysis);

    return analysis;
  }

  // ============================================================================
  // Regime Classification
  // ============================================================================

  private classifyRegime(vol: VolatilityRegimeResult, trend: TrendRegimeResult): MarketRegime {
    const isTrending = trend.state !== 'ranging';
    const isHighVol = vol.state === 'high' || vol.state === 'extreme';
    const isLowVol = vol.state === 'low';

    // Crisis: extreme volatility
    if (vol.state === 'extreme' && vol.expanding) {
      return 'crisis';
    }

    // Breakout: vol expanding from low state
    if (vol.expanding && (isLowVol || vol.state === 'normal') && vol.atrPercentile > 0.5) {
      return 'breakout';
    }

    // Trending combinations
    if (isTrending && isLowVol) return 'trending_low_vol';
    if (isTrending && isHighVol) return 'trending_high_vol';
    if (isTrending) return 'trending_low_vol'; // normal vol + trending

    // Ranging combinations
    if (!isTrending && isHighVol) return 'ranging_high_vol';
    if (!isTrending && isLowVol) return 'ranging_low_vol';
    if (!isTrending) return 'ranging_low_vol'; // normal vol + ranging

    return 'unknown';
  }

  // ============================================================================
  // Strategy Recommendations
  // ============================================================================

  private getRecommendedStrategies(regime: MarketRegime): string[] {
    switch (regime) {
      case 'trending_low_vol':
        return ['scalp', 'mm']; // trend following + market making (tight spreads)
      case 'trending_high_vol':
        return ['scalp']; // trend following only, wider stops
      case 'ranging_low_vol':
        return ['mm', 'lp']; // mean reversion + liquidity provision
      case 'ranging_high_vol':
        return []; // reduce exposure, wait for clarity
      case 'breakout':
        return ['scalp', 'ipo']; // momentum + IPO-style aggressive entries
      case 'crisis':
        return []; // defensive mode only
      default:
        return ['mm']; // conservative default
    }
  }

  private getRiskMultiplier(regime: MarketRegime, vol: VolatilityRegimeResult): number {
    switch (regime) {
      case 'trending_low_vol':  return 1.2;   // slightly above normal
      case 'trending_high_vol': return 0.7;   // reduce for high vol
      case 'ranging_low_vol':   return 1.0;   // normal
      case 'ranging_high_vol':  return 0.4;   // significantly reduce
      case 'breakout':          return 0.8;   // moderate
      case 'crisis':            return 0.1;   // minimal exposure
      default:                  return 0.5;
    }
  }

  private getSuggestedLeverage(regime: MarketRegime, vol: VolatilityRegimeResult): number {
    switch (regime) {
      case 'trending_low_vol':  return 5;
      case 'trending_high_vol': return 3;
      case 'ranging_low_vol':   return 5;
      case 'ranging_high_vol':  return 2;
      case 'breakout':          return 3;
      case 'crisis':            return 1;
      default:                  return 2;
    }
  }

  // ============================================================================
  // Regime Change Events
  // ============================================================================

  private onRegimeChange(pair: string, from: MarketRegime, to: MarketRegime, analysis: MarketRegimeAnalysis): void {
    // Record in history
    if (!this.regimeHistory.has(pair)) this.regimeHistory.set(pair, []);
    const history = this.regimeHistory.get(pair)!;

    // Close previous regime
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (!last.endTime) {
        last.endTime = Date.now();
        last.durationMs = last.endTime - last.startTime;
      }
    }

    // Open new regime
    history.push({ regime: to, startTime: Date.now() });

    // Trim history
    if (history.length > this.maxHistoryLength) {
      this.regimeHistory.set(pair, history.slice(-this.maxHistoryLength));
    }

    // Emit event
    this.eventBus.publish({
      type: 'regime.change',
      source: 'MarketRegimeDetector',
      data: {
        pair,
        from,
        to,
        analysis,
      },
      timestamp: Date.now(),
      priority: to === 'crisis' ? 'critical' : 'high',
    });

    // Emit volatility shift if applicable
    if (analysis.volatility.expanding || analysis.volatility.contracting) {
      this.eventBus.publish({
        type: 'regime.volatility_shift',
        source: 'MarketRegimeDetector',
        data: {
          pair,
          direction: analysis.volatility.expanding ? 'expanding' : 'contracting',
          currentVol: analysis.volatility.realizedVol,
          atrPercentile: analysis.volatility.atrPercentile,
        },
        timestamp: Date.now(),
        priority: 'medium',
      });
    }
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getCurrentRegime(pair: string): MarketRegime {
    return this.currentRegimes.get(pair) || 'unknown';
  }

  getLastAnalysis(pair: string): MarketRegimeAnalysis | null {
    return this.lastAnalysis.get(pair) || null;
  }

  getRegimeHistory(pair: string, limit: number = 20): RegimeHistory[] {
    const history = this.regimeHistory.get(pair) || [];
    return history.slice(-limit);
  }

  getAllRegimes(): Map<string, MarketRegime> {
    return new Map(this.currentRegimes);
  }

  /** Check if a specific strategy is recommended in current regime */
  isStrategyRecommended(pair: string, strategy: string): boolean {
    const analysis = this.lastAnalysis.get(pair);
    if (!analysis) return true; // allow if no regime data yet
    return analysis.recommendedStrategies.includes(strategy);
  }

  /** Get regime-adjusted risk multiplier for a pair */
  getRegimeRiskMultiplier(pair: string): number {
    const analysis = this.lastAnalysis.get(pair);
    return analysis?.riskMultiplier || 1.0;
  }
}

// Singleton
let marketRegimeDetectorInstance: MarketRegimeDetector | null = null;

export function getMarketRegimeDetector(): MarketRegimeDetector {
  if (!marketRegimeDetectorInstance) {
    marketRegimeDetectorInstance = new MarketRegimeDetector();
  }
  return marketRegimeDetectorInstance;
}
