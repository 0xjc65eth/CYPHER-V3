/**
 * CYPHER AI Trading Agent - Pair Registration Service
 * Evaluates newly discovered pairs for tradability and builds MarketConfig entries.
 */

import {
  HyperliquidPairMeta,
  PairClassification,
  MarketConfig,
  RiskLimits,
} from './types';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

export interface PairRegistrationConfig {
  minVolume24hUSD: number;
  minOpenInterestUSD: number;
  maxSpreadBps: number;
  cooldownMinutes: number;
  autoEnableClasses: PairClassification[];
  maxAutoEnabled: number;
  globalRiskLimits?: RiskLimits;
}

const DEFAULT_REGISTRATION_CONFIG: PairRegistrationConfig = {
  minVolume24hUSD: 50_000,
  minOpenInterestUSD: 100_000,
  maxSpreadBps: 50,
  cooldownMinutes: 15,
  autoEnableClasses: ['crypto_perp'],
  maxAutoEnabled: 30,
};

export class PairRegistrationService {
  private config: PairRegistrationConfig;
  private eventBus: AgentEventBus;
  private readyTimestamps: Map<string, number> = new Map();
  private enabledCount: number = 0;

  constructor(config: Partial<PairRegistrationConfig>, eventBus?: AgentEventBus) {
    this.config = { ...DEFAULT_REGISTRATION_CONFIG, ...config };
    this.eventBus = eventBus || getAgentEventBus();
  }

  /**
   * Evaluate new pairs and return MarketConfig entries for qualifying ones.
   */
  async evaluateNewPairs(pairs: HyperliquidPairMeta[]): Promise<MarketConfig[]> {
    const qualifying: MarketConfig[] = [];

    for (const meta of pairs) {
      // Skip spot pairs (we only auto-trade perps)
      if (meta.isSpot) continue;

      // Check volume threshold
      if ((meta.volume24h || 0) < this.config.minVolume24hUSD) continue;

      // Check open interest threshold
      if ((meta.openInterest || 0) < this.config.minOpenInterestUSD) continue;

      // Check cooldown
      if (!this.isPairReady(meta.pair)) continue;

      // Check auto-enable class
      if (!this.config.autoEnableClasses.includes(meta.classification)) continue;

      // Check max auto-enabled count
      if (this.enabledCount >= this.config.maxAutoEnabled) break;

      const marketConfig = this.buildMarketConfig(meta);
      qualifying.push(marketConfig);
      this.readyTimestamps.set(meta.pair, Date.now());
      this.enabledCount++;
    }

    return qualifying;
  }

  /**
   * Check if a pair has passed the cooldown period after discovery.
   */
  isPairReady(pairName: string): boolean {
    const lastReady = this.readyTimestamps.get(pairName);
    if (!lastReady) return true; // Never registered, can proceed
    return Date.now() - lastReady > this.config.cooldownMinutes * 60_000;
  }

  /**
   * Calculate a liquidity score (0-100) based on volume and OI.
   */
  calculateLiquidityScore(meta: HyperliquidPairMeta): number {
    const volume = meta.volume24h || 0;
    const oi = meta.openInterest || 0;

    let score = 0;

    // Volume scoring (0-50 points)
    if (volume >= 100_000_000) score += 50;       // $100M+
    else if (volume >= 10_000_000) score += 40;    // $10M+
    else if (volume >= 1_000_000) score += 30;     // $1M+
    else if (volume >= 100_000) score += 20;       // $100K+
    else if (volume >= 50_000) score += 10;        // $50K+

    // OI scoring (0-50 points)
    if (oi >= 50_000_000) score += 50;             // $50M+
    else if (oi >= 10_000_000) score += 40;        // $10M+
    else if (oi >= 1_000_000) score += 30;         // $1M+
    else if (oi >= 100_000) score += 20;           // $100K+
    else if (oi >= 50_000) score += 10;            // $50K+

    return Math.min(100, score);
  }

  /**
   * Suggest strategies based on pair characteristics.
   */
  suggestStrategy(meta: HyperliquidPairMeta): { strategies: ('scalp' | 'mm' | 'ipo')[] } {
    const volume = meta.volume24h || 0;
    const oi = meta.openInterest || 0;
    const ageMs = Date.now() - meta.discoveredAt;
    const ageHours = ageMs / 3_600_000;

    const strategies: ('scalp' | 'mm' | 'ipo')[] = [];

    // New listing with volume spike → IPO strategy
    if (ageHours < 24 && volume > 500_000) {
      strategies.push('ipo');
    }

    // High volume + high OI → scalp + mm
    if (volume > 5_000_000 && oi > 10_000_000) {
      strategies.push('scalp', 'mm');
    } else if (volume > 500_000) {
      strategies.push('scalp');
    }

    // Default to scalp only if nothing else matched and volume is adequate
    if (strategies.length === 0 && volume >= this.config.minVolume24hUSD) {
      strategies.push('scalp');
    }

    return { strategies };
  }

  /**
   * Build a MarketConfig entry from pair metadata.
   */
  buildMarketConfig(meta: HyperliquidPairMeta): MarketConfig {
    const riskLimits = this.calculateRiskLimits(meta);
    const liquidityScore = this.calculateLiquidityScore(meta);

    // Map classification to asset class and chain
    let assetClass: 'crypto' | 'forex' | 'stock' | 'commodity' = 'crypto';
    switch (meta.classification) {
      case 'synth_stock': assetClass = 'stock'; break;
      case 'synth_forex': assetClass = 'forex'; break;
      case 'synth_commodity': assetClass = 'commodity'; break;
    }

    return {
      pair: meta.pair,
      exchange: 'hyperliquid',
      type: meta.isSpot ? 'spot' : 'perp',
      enabled: true,
      chain: 'hyperliquid',
      assetClass,
      maxPositionUSD: riskLimits.maxPositionUSD,
      discoveredAt: meta.discoveredAt,
      volume24h: meta.volume24h,
      openInterest: meta.openInterest,
      liquidityScore,
    };
  }

  /**
   * Calculate risk limits based on pair liquidity.
   * Lower-volume pairs get tighter limits.
   */
  calculateRiskLimits(meta: HyperliquidPairMeta): { maxPositionUSD: number; maxLeverage: number } {
    const volume = meta.volume24h || 0;
    const globalMax = this.config.globalRiskLimits?.maxPositionSize || 250;
    const globalMaxLev = this.config.globalRiskLimits?.maxLeverage || 5;

    let maxPositionUSD: number;
    let maxLeverage: number;

    if (volume > 10_000_000) {
      // High volume: full limits
      maxPositionUSD = Math.min(globalMax, volume * 0.001);
      maxLeverage = Math.min(globalMaxLev, meta.maxLeverage);
    } else if (volume >= 1_000_000) {
      // Medium volume: half limits
      maxPositionUSD = Math.min(globalMax * 0.5, volume * 0.001);
      maxLeverage = Math.min(Math.floor(globalMaxLev * 0.7), meta.maxLeverage);
    } else {
      // Low volume: tight limits
      maxPositionUSD = Math.min(globalMax * 0.1, volume * 0.001);
      maxLeverage = Math.min(Math.floor(globalMaxLev * 0.4), meta.maxLeverage, 3);
    }

    // Ensure minimum viable position
    maxPositionUSD = Math.max(maxPositionUSD, 10);
    maxLeverage = Math.max(maxLeverage, 1);

    return { maxPositionUSD, maxLeverage };
  }

  /**
   * Reset the enabled count (call when orchestrator rebuilds market list).
   */
  resetEnabledCount(count: number): void {
    this.enabledCount = count;
  }
}
