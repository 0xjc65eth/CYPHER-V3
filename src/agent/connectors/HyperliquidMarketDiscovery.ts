/**
 * CYPHER AI Trading Agent - Hyperliquid Market Discovery
 * Dynamically discovers ALL available pairs on Hyperliquid (perps + spot).
 * Polls periodically for new listings and delistings.
 */

import { HyperliquidPairMeta, PairClassification, PairDiscoveryEvent } from '../core/types';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';
import { AgentEventBus, getAgentEventBus } from '../consensus/AgentEventBus';

// Known forex pairs on Hyperliquid
const FOREX_NAMES = new Set(['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'SEK', 'NOK', 'SGD', 'HKD', 'CNH', 'KRW', 'INR', 'BRL', 'MXN', 'ZAR', 'TRY', 'PLN', 'CZK']);

// Known commodity names on Hyperliquid
const COMMODITY_NAMES = new Set(['GOLD', 'SILVER', 'OIL', 'GAS', 'COPPER', 'PLATINUM', 'PALLADIUM', 'WHEAT', 'CORN', 'SOYBEAN', 'SUGAR', 'COFFEE', 'COTTON', 'LUMBER']);

export interface MarketDiscoveryConfig {
  apiUrl: string;
  pollIntervalMs?: number;
  contextPollIntervalMs?: number;
}

export class HyperliquidMarketDiscovery {
  private knownPairs: Map<string, HyperliquidPairMeta> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private contextPollInterval: NodeJS.Timeout | null = null;
  private circuitBreaker: CircuitBreaker;
  private eventBus: AgentEventBus;
  private apiUrl: string;
  private readonly pollIntervalMs: number;
  private readonly contextPollIntervalMs: number;

  constructor(config: MarketDiscoveryConfig) {
    this.apiUrl = config.apiUrl || 'https://api.hyperliquid.xyz';
    this.pollIntervalMs = config.pollIntervalMs || 60_000;
    this.contextPollIntervalMs = config.contextPollIntervalMs || 30_000;
    this.circuitBreaker = createAPICircuitBreaker('hl-discovery', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 15000,
    });
    this.eventBus = getAgentEventBus();
  }

  async start(): Promise<void> {
    // Initial discovery
    await this.discoverPairs();

    // Poll for new pairs every 60s
    this.pollInterval = setInterval(async () => {
      try {
        await this.discoverPairs();
      } catch (error) {
        console.error('[HyperliquidMarketDiscovery] Poll error:', error);
      }
    }, this.pollIntervalMs);

    // Poll for context data (volume, OI, funding) every 30s
    this.contextPollInterval = setInterval(async () => {
      try {
        await this.refreshContextData();
      } catch (error) {
        console.error('[HyperliquidMarketDiscovery] Context poll error:', error);
      }
    }, this.contextPollIntervalMs);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.contextPollInterval) {
      clearInterval(this.contextPollInterval);
      this.contextPollInterval = null;
    }
  }

  async discoverPairs(): Promise<HyperliquidPairMeta[]> {
    const currentPairs = new Map<string, HyperliquidPairMeta>();

    // Fetch perp universe
    const perpAssets = await this.fetchPerpsUniverse();
    for (let i = 0; i < perpAssets.length; i++) {
      const asset = perpAssets[i];
      const name = asset.name as string;
      const pair = `${name}-PERP`;
      const maxLeverage = asset.maxLeverage ? Number(asset.maxLeverage) : 50;

      currentPairs.set(pair, {
        name,
        pair,
        assetIndex: i,
        szDecimals: asset.szDecimals ?? 0,
        maxLeverage,
        classification: this.classifyPair(name, maxLeverage),
        isSpot: false,
        discoveredAt: this.knownPairs.get(pair)?.discoveredAt || Date.now(),
      });
    }

    // Fetch spot universe
    const spotAssets = await this.fetchSpotMeta();
    for (const token of spotAssets) {
      const name = token.name as string;
      const pair = `${name}-SPOT`;
      currentPairs.set(pair, {
        name,
        pair,
        assetIndex: token.index ?? 10000 + spotAssets.indexOf(token),
        szDecimals: token.szDecimals ?? 0,
        maxLeverage: 1,
        classification: 'spot',
        isSpot: true,
        discoveredAt: this.knownPairs.get(pair)?.discoveredAt || Date.now(),
      });
    }

    // Detect new listings and delistings
    const newPairs = this.detectNewListings(currentPairs);
    const delistedPairs = this.detectDelistings(currentPairs);

    // Enrich with context data (volume, OI, funding)
    await this.enrichWithContextData(currentPairs);

    // Update known pairs
    this.knownPairs = currentPairs;

    // Emit event if there are changes
    if (newPairs.length > 0 || delistedPairs.length > 0) {
      const event: PairDiscoveryEvent = {
        newPairs,
        delistedPairs,
        totalPairs: currentPairs.size,
        timestamp: Date.now(),
      };

      this.eventBus.publish({
        type: 'market_update',
        source: 'HyperliquidMarketDiscovery',
        data: event,
        timestamp: Date.now(),
        priority: newPairs.length > 0 ? 'high' : 'low',
      });
    }

    return Array.from(currentPairs.values());
  }

  /**
   * Classify a pair based on name and leverage constraints.
   * - Stocks: 1-5 uppercase letters, no numbers, low leverage (≤5x)
   * - Forex: known currency codes
   * - Commodities: known commodity names
   * - Everything else: crypto perp
   */
  classifyPair(name: string, maxLeverage: number): PairClassification {
    const upper = name.toUpperCase();

    if (FOREX_NAMES.has(upper)) return 'synth_forex';
    if (COMMODITY_NAMES.has(upper)) return 'synth_commodity';

    // Stock tickers: 1-5 uppercase, no numbers, leverage ≤ 5
    if (/^[A-Z]{1,5}$/.test(name) && maxLeverage <= 5 && !this.isKnownCrypto(name)) {
      return 'synth_stock';
    }

    return 'crypto_perp';
  }

  private isKnownCrypto(name: string): boolean {
    const CRYPTO_TOKENS = new Set([
      'BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'AVAX', 'MATIC', 'LINK', 'UNI',
      'OP', 'APT', 'WLD', 'INJ', 'SUI', 'SEI', 'TIA', 'BLUR', 'STX',
      'ORDI', 'PEPE', 'WIF', 'JUP', 'STRK', 'BONK', 'ATOM', 'DOT', 'ADA',
      'XRP', 'BNB', 'NEAR', 'FTM', 'MANA', 'SAND', 'AXS', 'CRV', 'AAVE',
      'MKR', 'COMP', 'SNX', 'LDO', 'RPL', 'FXS', 'PENDLE', 'GMX', 'DYDX',
      'RNDR', 'FIL', 'ICP', 'HBAR', 'VET', 'ALGO', 'EGLD', 'RUNE', 'ENS',
      'IMX', 'MINA', 'ZK', 'W', 'ENA', 'PYTH', 'ONDO', 'TAO', 'RENDER',
      'TRX', 'TON', 'POL', 'MOVE',
    ]);
    return CRYPTO_TOKENS.has(name);
  }

  // ========================================================================
  // Queries
  // ========================================================================

  getAllPairs(): HyperliquidPairMeta[] {
    return Array.from(this.knownPairs.values());
  }

  getPairsByClass(cls: PairClassification): HyperliquidPairMeta[] {
    return this.getAllPairs().filter(p => p.classification === cls);
  }

  getNewPairsSince(timestamp: number): HyperliquidPairMeta[] {
    return this.getAllPairs().filter(p => p.discoveredAt >= timestamp);
  }

  getPairMeta(name: string): HyperliquidPairMeta | null {
    // Try exact match first
    const exact = this.knownPairs.get(name);
    if (exact) return exact;

    // Try with -PERP suffix
    const perp = this.knownPairs.get(`${name}-PERP`);
    if (perp) return perp;

    // Try extracting coin name from "BTC-PERP" format
    const coin = name.replace('-PERP', '').replace('-SPOT', '');
    for (const [, meta] of this.knownPairs) {
      if (meta.name === coin) return meta;
    }

    return null;
  }

  getAssetIndex(pairName: string): number {
    const meta = this.getPairMeta(pairName);
    if (meta) return meta.assetIndex;
    throw new Error(`[HyperliquidMarketDiscovery] Unknown pair: ${pairName}`);
  }

  getPairCount(): number {
    return this.knownPairs.size;
  }

  // ========================================================================
  // Internal API calls
  // ========================================================================

  private async fetchPerpsUniverse(): Promise<any[]> {
    try {
      const data = await this.apiRequest({ type: 'meta' });
      return data?.universe || [];
    } catch {
      return [];
    }
  }

  private async fetchSpotMeta(): Promise<any[]> {
    try {
      const data = await this.apiRequest({ type: 'spotMeta' });
      return data?.tokens || [];
    } catch {
      return [];
    }
  }

  private async fetchAssetContexts(): Promise<any[]> {
    try {
      const data = await this.apiRequest({ type: 'metaAndAssetCtxs' });
      if (Array.isArray(data) && data.length >= 2) {
        return data[1] || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  private async enrichWithContextData(pairs: Map<string, HyperliquidPairMeta>): Promise<void> {
    const contexts = await this.fetchAssetContexts();
    if (contexts.length === 0) return;

    // Also fetch allMids for mid prices
    let mids: Record<string, string> = {};
    try {
      mids = await this.apiRequest({ type: 'allMids' }) || {};
    } catch { /* non-critical */ }

    // Contexts are ordered by asset index (perps only)
    let perpIndex = 0;
    for (const [, meta] of pairs) {
      if (meta.isSpot) continue;

      const ctx = contexts[perpIndex];
      if (ctx) {
        meta.funding = parseFloat(ctx.funding || '0');
        meta.openInterest = parseFloat(ctx.openInterest || '0');
        meta.volume24h = parseFloat(ctx.dayNtlVlm || '0');
      }

      // Mid price from allMids
      if (mids[meta.name]) {
        meta.midPrice = parseFloat(mids[meta.name]);
      }

      perpIndex++;
    }
  }

  private async refreshContextData(): Promise<void> {
    if (this.knownPairs.size === 0) return;
    await this.enrichWithContextData(this.knownPairs);
  }

  private detectNewListings(current: Map<string, HyperliquidPairMeta>): HyperliquidPairMeta[] {
    const newPairs: HyperliquidPairMeta[] = [];
    for (const [pair, meta] of current) {
      if (!this.knownPairs.has(pair)) {
        newPairs.push(meta);
      }
    }
    return newPairs;
  }

  private detectDelistings(current: Map<string, HyperliquidPairMeta>): string[] {
    const delisted: string[] = [];
    for (const pair of this.knownPairs.keys()) {
      if (!current.has(pair)) {
        delisted.push(pair);
      }
    }
    return delisted;
  }

  private async apiRequest(body: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(`${this.apiUrl}/info`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });
  }
}
