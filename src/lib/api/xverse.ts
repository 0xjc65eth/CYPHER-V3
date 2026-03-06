/**
 * Xverse API Client — CYPHER V3
 * Primary data source for Ordinals, Runes, BRC-20, and Bitcoin data.
 * Powered by the same API that backs the Xverse wallet (api.secretkeylabs.io).
 *
 * Rate limits (trial): 2 RPS / 100 RPM
 * Fallback order: Xverse → Hiro → OKX → UniSat → empty
 */

const XVERSE_BASE = 'https://api.secretkeylabs.io';
const XVERSE_API_KEY = process.env.XVERSE_API_KEY || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XverseCollection {
  collectionId: string;
  name: string;
  imageUrl: string | null;
  floorPrice: number;
  floorPriceUsd: number;
  totalVolume: number;
  volume: number;
  volumeUsd: number;
  volumePercentChange: number;
  totalSupply: number;
  listedCount: number;
  ownerCount: number;
  marketCapUsd: number;
  description?: string;
  links?: Record<string, string>;
}

export interface XverseCollectionDetail {
  collectionId: string;
  name: string;
  imageUrl: string | null;
  description: string;
  floorPrice: number;
  floorPriceUsd: number;
  marketCap: number;
  marketCapUsd: number;
  volume24h: number;
  volume24hUsd: number;
  totalVolume: number;
  totalSupply: number;
  ownerCount: number;
  listedCount: number;
  links: Record<string, string>;
}

export interface XverseHolder {
  address: string;
  tokenCount: number;
}

export interface XverseRune {
  runeId: string;
  runeName: string;
  spacedRuneName: string;
  runeNumber: number;
  symbol: string;
  imageUrl: string | null;
  floorPrice: number;
  floorPriceUsd: number;
  marketCap: number;
  marketCapUsd: number;
  volume: number;
  volumeUsd: number;
  volumePercentChange: number;
  totalSupply: string;
  holders: number;
  divisibility: number;
  mintable: boolean;
}

export interface XverseRuneDetail {
  runeId: string;
  runeName: string;
  spacedRuneName: string;
  runeNumber: number;
  symbol: string;
  imageUrl: string | null;
  floorPrice: number;
  floorPriceUsd: number;
  marketCap: number;
  marketCapUsd: number;
  volume24h: number;
  volume24hUsd: number;
  totalSupply: string;
  holders: number;
  divisibility: number;
  mintable: boolean;
  mintInfo?: Record<string, unknown>;
}

export interface XverseRuneGainerLoser {
  runeId: string;
  runeName: string;
  spacedRuneName: string;
  symbol: string;
  imageUrl: string | null;
  floorPrice: number;
  floorPriceUsd: number;
  priceChangePercent: number;
  volume: number;
}

export interface XverseRuneTrade {
  txId: string;
  runeId: string;
  runeName: string;
  priceSats: number;
  amount: string;
  timestamp: number;
  seller: string;
  buyer: string;
}

export interface XverseBRC20Token {
  ticker: string;
  floorPrice: number;
  floorPriceUsd: number;
  volume24h: number;
  lastSalePrice: number;
  marketplaceSource: string;
}

export interface XverseBitcoinPrice {
  usd: number;
  timestamp: number;
}

export interface XverseFeeEstimate {
  nextBlock: number;
  twoBlocks: number;
  threeBlocks: number;
}

export interface XverseHistoricalPrice {
  timestamp: number;
  price: number;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries = 500;

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Rate Limiter (token bucket: 2 RPS / 100 RPM)
// ---------------------------------------------------------------------------

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerSecond = 2;
  private readonly maxPerMinute = 100;

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    // Prune old timestamps
    this.timestamps = this.timestamps.filter(t => now - t < 60_000);

    // Check per-minute limit
    if (this.timestamps.length >= this.maxPerMinute) {
      const waitMs = 60_000 - (now - this.timestamps[0]);
      if (waitMs > 0) await this.sleep(waitMs);
    }

    // Check per-second limit
    const recentSecond = this.timestamps.filter(t => now - t < 1000);
    if (recentSecond.length >= this.maxPerSecond) {
      const waitMs = 1000 - (now - recentSecond[0]);
      if (waitMs > 0) await this.sleep(waitMs);
    }

    this.timestamps.push(Date.now());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Request deduplication
// ---------------------------------------------------------------------------

const pendingRequests = new Map<string, Promise<unknown>>();

// ---------------------------------------------------------------------------
// XverseAPI Client
// ---------------------------------------------------------------------------

class XverseAPI {
  private static instance: XverseAPI;
  private cache = new SimpleCache();
  private rateLimiter = new RateLimiter();
  private enabled: boolean;

  private constructor() {
    this.enabled = !!XVERSE_API_KEY;
    if (!this.enabled) {
      console.warn('[XverseAPI] XVERSE_API_KEY not set — Xverse data source disabled');
    }
  }

  static getInstance(): XverseAPI {
    if (!XverseAPI.instance) {
      XverseAPI.instance = new XverseAPI();
    }
    return XverseAPI.instance;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // -------------------------------------------------------------------------
  // Core fetch with cache, rate limiting, dedup, timeout
  // -------------------------------------------------------------------------

  private async fetch<T>(
    path: string,
    options: { ttlMs?: number; timeoutMs?: number; method?: string; body?: unknown } = {}
  ): Promise<T | null> {
    if (!this.enabled) return null;

    const { ttlMs = 60_000, timeoutMs = 8_000, method = 'GET', body } = options;
    const cacheKey = `xverse:${method}:${path}:${body ? JSON.stringify(body) : ''}`;

    // L1: Cache
    const cached = this.cache.get<T>(cacheKey);
    if (cached !== null) return cached;

    // L2: Dedup
    const pending = pendingRequests.get(cacheKey);
    if (pending) return pending as Promise<T | null>;

    const promise = (async (): Promise<T | null> => {
      await this.rateLimiter.waitForSlot();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `${XVERSE_BASE}${path}`;
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'x-api-key': XVERSE_API_KEY,
        };
        if (body) headers['Content-Type'] = 'application/json';

        const res = await globalThis.fetch(url, {
          method,
          headers,
          signal: controller.signal,
          ...(body ? { body: JSON.stringify(body) } : {}),
        });

        clearTimeout(timeout);

        if (!res.ok) {
          if (res.status === 429) {
            console.warn(`[XverseAPI] Rate limited on ${path}`);
          } else {
            console.error(`[XverseAPI] ${res.status} on ${path}`);
          }
          return null;
        }

        const data = (await res.json()) as T;
        this.cache.set(cacheKey, data, ttlMs);
        return data;
      } catch (err: unknown) {
        clearTimeout(timeout);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('aborted') || msg.includes('AbortError')) {
          console.warn(`[XverseAPI] Timeout on ${path}`);
        } else {
          console.error(`[XverseAPI] Error on ${path}:`, msg);
        }
        return null;
      }
    })();

    pendingRequests.set(cacheKey, promise);
    promise.finally(() => pendingRequests.delete(cacheKey));
    return promise;
  }

  // =========================================================================
  // ORDINALS
  // =========================================================================

  /** Top collections by volume (24h / 7d / 30d / all) */
  async getTopCollections(
    params: { limit?: number; timePeriod?: '24h' | '7d' | '30d' | 'all' } = {}
  ): Promise<XverseCollection[] | null> {
    const { limit = 20, timePeriod = '24h' } = params;
    const path = `/v1/ordinals/stats/collections/top-by-volume?limit=${limit}&timePeriod=${timePeriod}`;

    interface RawCollection {
      collectionId?: string;
      name?: string;
      logo?: string;
      tradingVolumeSats?: string;
      floorPrice?: {
        valueInSats?: string;
        valueInUsd?: string;
        percentageChange24h?: { valueInSats?: string; valueInUsd?: string };
      };
      totalSupply?: number;
      listedCount?: number;
      ownerCount?: number;
      description?: string;
      links?: Record<string, string>;
    }

    const result = await this.fetch<{ collections?: RawCollection[]; results?: RawCollection[] }>(path, { ttlMs: 60_000 });
    const rawItems = result?.collections ?? result?.results;
    if (!rawItems || rawItems.length === 0) return null;

    return rawItems.map((raw): XverseCollection => {
      const floorSats = parseFloat(raw.floorPrice?.valueInSats ?? '0') || 0;
      const floorUsd = parseFloat(raw.floorPrice?.valueInUsd ?? '0') || 0;
      const volumeSats = parseFloat(raw.tradingVolumeSats ?? '0') || 0;
      const pctChange = parseFloat(raw.floorPrice?.percentageChange24h?.valueInSats ?? '0') || 0;
      return {
        collectionId: raw.collectionId ?? '',
        name: raw.name ?? '',
        imageUrl: raw.logo ?? null,
        floorPrice: floorSats,
        floorPriceUsd: floorUsd,
        totalVolume: volumeSats,
        volume: volumeSats,
        volumeUsd: 0,
        volumePercentChange: pctChange,
        totalSupply: raw.totalSupply ?? 0,
        listedCount: raw.listedCount ?? 0,
        ownerCount: raw.ownerCount ?? 0,
        marketCapUsd: floorUsd * (raw.totalSupply ?? 0),
        description: raw.description,
        links: raw.links,
      };
    });
  }

  /** Full collection detail */
  async getCollectionDetail(collectionId: string): Promise<XverseCollectionDetail | null> {
    interface RawDetail {
      id?: string;
      symbol?: string;
      name?: string;
      description?: string;
      supply?: string | number;
      floorPrice?: { valueInSats?: string; valueInUsd?: string; percentageChange24h?: { valueInSats?: string; valueInUsd?: string } };
      volume24h?: { valueInSats?: string; valueInUsd?: string; percentageChange?: { valueInSats?: string; valueInUsd?: string } };
      marketCap?: { valueInSats?: string; valueInUsd?: string };
      totalVolume?: { valueInSats?: string; valueInUsd?: string };
      ownerCount?: number;
      listedCount?: number;
      links?: Record<string, string>;
    }

    const raw = await this.fetch<RawDetail>(
      `/v1/ordinals/collections/${encodeURIComponent(collectionId)}`,
      { ttlMs: 60_000 }
    );
    if (!raw) return null;

    const floorSats = parseFloat(raw.floorPrice?.valueInSats ?? '0') || 0;
    const floorUsd = parseFloat(raw.floorPrice?.valueInUsd ?? '0') || 0;
    const vol24hSats = parseFloat(raw.volume24h?.valueInSats ?? '0') || 0;
    const vol24hUsd = parseFloat(raw.volume24h?.valueInUsd ?? '0') || 0;
    const mcSats = parseFloat(raw.marketCap?.valueInSats ?? '0') || 0;
    const mcUsd = parseFloat(raw.marketCap?.valueInUsd ?? '0') || 0;
    const totalVolSats = parseFloat(
      (raw.totalVolume as unknown as { valueInSats?: string })?.valueInSats ??
      raw.volume24h?.valueInSats ?? '0'
    ) || 0;
    const supply = typeof raw.supply === 'string' ? parseInt(raw.supply) || 0 : (raw.supply || 0);

    return {
      collectionId: raw.id || raw.symbol || collectionId,
      name: raw.name || collectionId,
      imageUrl: null,
      description: raw.description || '',
      floorPrice: floorSats,
      floorPriceUsd: floorUsd,
      marketCap: mcSats,
      marketCapUsd: mcUsd,
      volume24h: vol24hSats,
      volume24hUsd: vol24hUsd,
      totalVolume: totalVolSats,
      totalSupply: supply,
      ownerCount: raw.ownerCount || 0,
      listedCount: raw.listedCount || 0,
      links: raw.links || {},
    };
  }

  /** Collection holders */
  async getCollectionHolders(
    collectionId: string,
    limit = 50
  ): Promise<XverseHolder[] | null> {
    const result = await this.fetch<{ results: XverseHolder[] }>(
      `/v1/ordinals/collections/${encodeURIComponent(collectionId)}/holders?limit=${limit}`,
      { ttlMs: 300_000 }
    );
    return result?.results ?? null;
  }

  /** Collection historical floor prices */
  async getCollectionFloorHistory(collectionId: string): Promise<XverseHistoricalPrice[] | null> {
    const result = await this.fetch<{ results: XverseHistoricalPrice[] }>(
      `/v1/ordinals/collections/${encodeURIComponent(collectionId)}/historical-floor-prices`,
      { ttlMs: 300_000 }
    );
    return result?.results ?? null;
  }

  /** User's inscriptions */
  async getAddressInscriptions(address: string): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      `/v1/ordinals/address/${address}/inscriptions`,
      { ttlMs: 120_000 }
    );
    return result?.results ?? null;
  }

  /** User's collections */
  async getAddressCollections(address: string): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      `/v1/ordinals/address/${address}/collections`,
      { ttlMs: 120_000 }
    );
    return result?.results ?? null;
  }

  // =========================================================================
  // RUNES
  // =========================================================================

  /** Top runes by volume */
  async getTopRunes(
    params: { limit?: number; timePeriod?: '24h' | '7d' | '30d' | 'all' } = {}
  ): Promise<XverseRune[] | null> {
    const { limit = 50, timePeriod = '24h' } = params;
    const path = `/v1/runes/stats/top-by-volume?limit=${limit}&timePeriod=${timePeriod}`;
    interface RawRune {
      runeId?: string;
      name?: string;
      spacedName?: string;
      runeNumber?: number;
      symbol?: string;
      inscriptionRenderUrl?: string;
      tradingVolumeSats?: string;
      floorPrice?: { valueInSats?: string; valueInUsd?: string };
      marketCap?: { valueInSats?: string; valueInUsd?: string };
      totalSupply?: string;
      holders?: number;
      divisibility?: number;
      mintable?: boolean;
    }

    const result = await this.fetch<{ runes?: RawRune[]; results?: RawRune[] }>(path, { ttlMs: 60_000 });
    const rawItems = result?.runes ?? result?.results;
    if (!rawItems || rawItems.length === 0) return null;

    return rawItems.map((raw): XverseRune => {
      const floorSats = parseFloat(raw.floorPrice?.valueInSats ?? '0') || 0;
      const floorUsd = parseFloat(raw.floorPrice?.valueInUsd ?? '0') || 0;
      const mcapSats = parseFloat(raw.marketCap?.valueInSats ?? '0') || 0;
      const mcapUsd = parseFloat(raw.marketCap?.valueInUsd ?? '0') || 0;
      const volumeSats = parseFloat(raw.tradingVolumeSats ?? '0') || 0;
      return {
        runeId: raw.runeId ?? '',
        runeName: raw.name ?? '',
        spacedRuneName: raw.spacedName ?? raw.name ?? '',
        runeNumber: raw.runeNumber ?? 0,
        symbol: raw.symbol ?? '',
        imageUrl: raw.inscriptionRenderUrl ?? null,
        floorPrice: floorSats,
        floorPriceUsd: floorUsd,
        marketCap: mcapSats,
        marketCapUsd: mcapUsd,
        volume: volumeSats,
        volumeUsd: 0,
        volumePercentChange: 0,
        totalSupply: raw.totalSupply ?? '0',
        holders: raw.holders ?? 0,
        divisibility: raw.divisibility ?? 0,
        mintable: raw.mintable ?? false,
      };
    });
  }

  /** Top gainers and losers */
  async getRuneGainersLosers(
    timeFrame: '24h' | '7d' | '30d' = '24h'
  ): Promise<{ gainers: XverseRuneGainerLoser[]; losers: XverseRuneGainerLoser[] } | null> {
    return this.fetch(
      `/v1/runes/stats/top-gainers-losers?timeFrame=${timeFrame}`,
      { ttlMs: 60_000 }
    );
  }

  /** Full rune detail */
  async getRuneDetail(runeId: string): Promise<XverseRuneDetail | null> {
    return this.fetch<XverseRuneDetail>(
      `/v1/runes/${encodeURIComponent(runeId)}`,
      { ttlMs: 90_000 }
    );
  }

  /** Rune holders */
  async getRuneHolders(runeId: string, limit = 50): Promise<XverseHolder[] | null> {
    const result = await this.fetch<{ results: XverseHolder[] }>(
      `/v1/runes/${encodeURIComponent(runeId)}/holders?limit=${limit}`,
      { ttlMs: 300_000 }
    );
    return result?.results ?? null;
  }

  /** Rune activity (trades + transfers) */
  async getRuneActivity(runeId: string): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      `/v1/runes/${encodeURIComponent(runeId)}/activity`,
      { ttlMs: 60_000 }
    );
    return result?.results ?? null;
  }

  /** Rune historical floor prices */
  async getRuneFloorHistory(runeId: string): Promise<XverseHistoricalPrice[] | null> {
    const result = await this.fetch<{ results: XverseHistoricalPrice[] }>(
      `/v1/runes/${encodeURIComponent(runeId)}/historical-floor-prices`,
      { ttlMs: 300_000 }
    );
    return result?.results ?? null;
  }

  /** Batch rune info (for arbitrage — up to 100 IDs) */
  async getRunesBatchInfo(runeIds: string[]): Promise<Record<string, XverseRuneDetail> | null> {
    if (runeIds.length === 0) return null;
    return this.fetch(
      `/v1/runes/batch-info?runeIds=${runeIds.join(',')}`,
      { ttlMs: 30_000 }
    );
  }

  /** Real-time rune trades (latest block) */
  async getRecentRuneTrades(limit = 20): Promise<XverseRuneTrade[] | null> {
    const result = await this.fetch<{ results: XverseRuneTrade[] }>(
      `/v1/block/runes/trades?limit=${limit}`,
      { ttlMs: 15_000 }
    );
    return result?.results ?? null;
  }

  /** Real-time rune transfers (latest block) */
  async getRecentRuneTransfers(limit = 20): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      `/v1/block/runes/transfers?limit=${limit}`,
      { ttlMs: 15_000 }
    );
    return result?.results ?? null;
  }

  /** User's rune UTXOs */
  async getAddressRuneUtxos(address: string): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      `/v1/runes/address/${address}/utxo`,
      { ttlMs: 120_000 }
    );
    return result?.results ?? null;
  }

  // =========================================================================
  // BRC-20
  // =========================================================================

  /** Single BRC-20 ticker info */
  async getBRC20Ticker(ticker: string): Promise<XverseBRC20Token | null> {
    return this.fetch<XverseBRC20Token>(
      `/v1/brc20/ticker/${encodeURIComponent(ticker)}`,
      { ttlMs: 60_000 }
    );
  }

  /** Batch BRC-20 tickers (up to 100) */
  async getBRC20BatchTickers(tickers: string[]): Promise<Record<string, XverseBRC20Token> | null> {
    if (tickers.length === 0) return null;

    interface RawBRC20Item {
      ticker?: string;
      prices?: {
        floorPrice?: { valueInSats?: string; valueInUsd?: string; marketplace?: string };
        lastSalePrice?: { valueInSats?: string; valueInUsd?: string; marketplace?: string };
      };
      volume24h?: { valueInSats?: string; valueInUsd?: string };
    }

    const result = await this.fetch<{ items?: RawBRC20Item[] }>(
      '/v1/brc20/batch/tickers',
      { ttlMs: 60_000, method: 'POST', body: { tickers } }
    );
    const rawItems = result?.items;
    if (!rawItems || rawItems.length === 0) return null;

    const record: Record<string, XverseBRC20Token> = {};
    for (const raw of rawItems) {
      const tick = raw.ticker ?? '';
      if (!tick) continue;
      record[tick] = {
        ticker: tick,
        floorPrice: parseFloat(raw.prices?.floorPrice?.valueInSats ?? '0') || 0,
        floorPriceUsd: parseFloat(raw.prices?.floorPrice?.valueInUsd ?? '0') || 0,
        volume24h: parseFloat(raw.volume24h?.valueInSats ?? '0') || 0,
        lastSalePrice: parseFloat(raw.prices?.lastSalePrice?.valueInSats ?? '0') || 0,
        marketplaceSource: raw.prices?.floorPrice?.marketplace ?? raw.prices?.lastSalePrice?.marketplace ?? '',
      };
    }
    return Object.keys(record).length > 0 ? record : null;
  }

  /** User's BRC-20 balances */
  async getAddressBRC20(address: string): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      `/v1/ordinals/address/${address}/brc20`,
      { ttlMs: 120_000 }
    );
    return result?.results ?? null;
  }

  // =========================================================================
  // BITCOIN CORE
  // =========================================================================

  /** BTC/USD price */
  async getBitcoinPrice(): Promise<XverseBitcoinPrice | null> {
    return this.fetch<XverseBitcoinPrice>(
      '/v1/bitcoin/price',
      { ttlMs: 15_000 }
    );
  }

  /** Mempool fee estimates */
  async getFeeEstimates(): Promise<XverseFeeEstimate | null> {
    return this.fetch<XverseFeeEstimate>(
      '/v1/bitcoin/mempool/fee-estimates',
      { ttlMs: 30_000 }
    );
  }

  /** Address balance (confirmed + unconfirmed) */
  async getAddressBalance(address: string): Promise<{ confirmed: number; unconfirmed: number } | null> {
    return this.fetch(
      `/v1/bitcoin/address/${address}/balance`,
      { ttlMs: 30_000 }
    );
  }

  // =========================================================================
  // SWAP AGGREGATOR
  // =========================================================================

  /** Get swap quotes from multiple sources */
  async getSwapQuotes(params: {
    sourceToken: string;
    destinationToken: string;
    amount: string;
  }): Promise<unknown | null> {
    return this.fetch(
      '/v1/swaps/get-quotes',
      { ttlMs: 10_000, method: 'POST', body: params }
    );
  }

  /** Get available swap destination tokens */
  async getSwapDestinationTokens(sourceToken: string): Promise<unknown[] | null> {
    const result = await this.fetch<{ results: unknown[] }>(
      '/v1/swaps/get-destination-tokens',
      { ttlMs: 300_000, method: 'POST', body: { sourceToken } }
    );
    return result?.results ?? null;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const xverseAPI = XverseAPI.getInstance();
