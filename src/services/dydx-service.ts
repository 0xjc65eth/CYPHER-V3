/**
 * dYdX v4 Service - CYPHER ORDi Future V3
 * Integration with dYdX v4 Indexer API for perpetual markets data
 */

import type {
  DYdXMarket,
  DYdXOrderbook,
  DYdXCandle,
  DYdXTrade,
  DYdXFundingRate,
  DYdXCandleResolution,
} from '@/types/dydx';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class DYdXService {
  private baseUrl = 'https://indexer.dydx.trade/v4';
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 30_000; // 30 seconds
  private requestTimeout = 10_000; // 10 seconds

  // ── Markets ────────────────────────────────────────────────────────

  async getMarkets(): Promise<DYdXMarket[]> {
    const cacheKey = 'markets';
    const cached = this.getFromCache<DYdXMarket[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<{ markets: Record<string, DYdXMarket> }>(
        '/perpetualMarkets'
      );
      const markets = Object.values(data.markets);
      this.setCache(cacheKey, markets, 30_000);
      return markets;
    } catch (error) {
      console.error('[dYdX] Failed to fetch markets:', error);
      return [];
    }
  }

  // ── Orderbook ──────────────────────────────────────────────────────

  async getOrderbook(ticker: string): Promise<DYdXOrderbook> {
    const cacheKey = `orderbook:${ticker}`;
    const cached = this.getFromCache<DYdXOrderbook>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<DYdXOrderbook>(
        `/orderbooks/perpetualMarket/${encodeURIComponent(ticker)}`
      );
      this.setCache(cacheKey, data, 5_000);
      return data;
    } catch (error) {
      console.error(`[dYdX] Failed to fetch orderbook for ${ticker}:`, error);
      return { bids: [], asks: [] };
    }
  }

  // ── Candles ────────────────────────────────────────────────────────

  async getCandles(
    ticker: string,
    resolution: DYdXCandleResolution = '1HOUR'
  ): Promise<DYdXCandle[]> {
    const cacheKey = `candles:${ticker}:${resolution}`;
    const cached = this.getFromCache<DYdXCandle[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<{ candles: DYdXCandle[] }>(
        `/candles/perpetualMarket/${encodeURIComponent(ticker)}?resolution=${resolution}`
      );
      const candles = data.candles || [];
      this.setCache(cacheKey, candles, 15_000);
      return candles;
    } catch (error) {
      console.error(`[dYdX] Failed to fetch candles for ${ticker}:`, error);
      return [];
    }
  }

  // ── Trades ─────────────────────────────────────────────────────────

  async getTrades(ticker: string): Promise<DYdXTrade[]> {
    const cacheKey = `trades:${ticker}`;
    const cached = this.getFromCache<DYdXTrade[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<{ trades: DYdXTrade[] }>(
        `/trades/perpetualMarket/${encodeURIComponent(ticker)}`
      );
      const trades = data.trades || [];
      this.setCache(cacheKey, trades, 10_000);
      return trades;
    } catch (error) {
      console.error(`[dYdX] Failed to fetch trades for ${ticker}:`, error);
      return [];
    }
  }

  // ── Funding Rates ──────────────────────────────────────────────────

  async getFundingRates(ticker: string): Promise<DYdXFundingRate[]> {
    const cacheKey = `funding:${ticker}`;
    const cached = this.getFromCache<DYdXFundingRate[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<{ historicalFunding: DYdXFundingRate[] }>(
        `/historicalFunding/${encodeURIComponent(ticker)}`
      );
      const rates = data.historicalFunding || [];
      this.setCache(cacheKey, rates, 60_000);
      return rates;
    } catch (error) {
      console.error(`[dYdX] Failed to fetch funding rates for ${ticker}:`, error);
      return [];
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────

  private async fetch<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await globalThis.fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`dYdX API ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }
}

export const dydxService = new DYdXService();
export default DYdXService;
