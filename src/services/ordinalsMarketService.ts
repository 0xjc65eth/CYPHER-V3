/**
 * Ordinals API Service - CYPHER V3
 * OKX-first with Hiro fallback for Bitcoin Ordinals, Collections, Tokens,
 * Block Activities, and Rare Sats.
 *
 * Migration status (OKX primary with Hiro fallback):
 * - Collections: OKX primary ✅, Hiro fallback
 * - Statistics: OKX primary ✅, Hiro fallback
 * - Tokens/Inscriptions: OKX primary ✅, Hiro fallback
 * - Activities: OKX primary ✅, Hiro fallback
 * - Rare Sats: Hiro fallback (no OKX equivalent)
 * - Rate limiting, caching, retry logic preserved
 */

import { OKXOrdinalsAPI } from './ordinals/integrations/OKXOrdinalsAPI';

// OKX adapter singleton (used as primary data source)
const okxApi = new OKXOrdinalsAPI();

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface OrdinalsCollectionDetail {
  symbol: string;
  name: string;
  description?: string;
  imageURI?: string;
  chain?: string;
  supply?: number;
  twitterLink?: string;
  discordLink?: string;
  websiteLink?: string;
  categories?: string[];
  inscriptionIcon?: string;
  totalVolume?: number;
  floorPrice?: number;
  listedCount?: number;
  owners?: number;
  createdAt?: string;
}

export interface OrdinalsCollectionStats {
  symbol: string;
  floorPrice: number;
  listedCount: number;
  totalVolume: number;
  totalListed: number;
  owners: number;
  supply: number;
  pendingTransactions?: number;
}

export interface OrdinalsToken {
  id: string;
  contentURI?: string;
  contentType?: string;
  contentBody?: string;
  contentPreviewURI?: string;
  meta?: {
    name?: string;
    collection?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  owner?: string;
  location?: string;
  inscriptionNumber?: number;
  collectionSymbol?: string;
  listed?: boolean;
  listedPrice?: number;
  listedAt?: string;
  listedMakerFeeBp?: number;
  listedTakerFeeBp?: number;
  satRarity?: string;
  satBlockHeight?: number;
  satBlockTime?: string;
  domain?: string;
  collection?: string;
}

export interface OrdinalsTokensResponse {
  tokens: OrdinalsToken[];
  total?: number;
}

export interface OrdinalsBlockActivity {
  kind: string;
  tokenId: string;
  inscriptionNumber?: number;
  collectionSymbol?: string;
  chain?: string;
  oldOwner?: string;
  newOwner?: string;
  txId?: string;
  price?: number;
  listedPrice?: number;
  sellerPaymentReceiverAddress?: string;
  buyerPaymentAddress?: string;
  createdAt?: string;
  blockHeight?: number;
  tokenMeta?: {
    name?: string;
    contentType?: string;
    contentURI?: string;
  };
}

export interface OrdinalsBlockActivitiesResponse {
  activities: OrdinalsBlockActivity[];
  total?: number;
}

export interface OrdinalsRareSatListing {
  id: string;
  utxo?: string;
  price?: number;
  seller?: string;
  satRanges?: Array<{
    start: string;
    end: string;
    size: number;
    satributes: string[];
  }>;
  createdAt?: string;
  expiresAt?: string;
  token?: {
    inscriptionId?: string;
    contentType?: string;
    contentURI?: string;
  };
}

export interface OrdinalsRareSatListingsResponse {
  listings: OrdinalsRareSatListing[];
  total?: number;
}

export interface OrdinalsRareSatUtxo {
  txid: string;
  vout: number;
  value: number;
  satRanges: Array<{
    start: string;
    end: string;
    size: number;
    satributes: string[];
  }>;
  inscriptions?: Array<{
    id: string;
    contentType?: string;
  }>;
}

export interface OrdinalsRareSatUtxosResponse {
  utxos: OrdinalsRareSatUtxo[];
  total?: number;
}

export interface OrdinalsBatchListingPSBTRequest {
  listings: Array<{
    utxo: string;
    price: number;
    sellerPaymentAddress: string;
    sellerOrdinalAddress: string;
  }>;
  makerFeeBp?: number;
}

export interface OrdinalsBatchListingPSBTResponse {
  psbt: string;
  signIndexes: number[];
  expiration?: string;
}

export interface OrdinalsBatchListingSubmitRequest {
  psbt: string;
  signatures: string[];
}

export interface OrdinalsBatchListingSubmitResponse {
  txId?: string;
  listingIds?: string[];
  success: boolean;
  message?: string;
}

export interface OrdinalsTokensParams {
  collectionSymbol?: string;
  ownerAddress?: string;
  inscriptionMin?: number;
  inscriptionMax?: number;
  tokenIds?: string[];
  parentTokenIds?: string[];
  satRarity?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface OrdinalsBlockActivitiesParams {
  kind?: string;
  collectionSymbol?: string;
  limit?: number;
  offset?: number;
}

export interface OrdinalsRareSatListingsParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface OrdinalsMarketServiceError {
  status: number;
  message: string;
  endpoint: string;
  timestamp: number;
}

// ─── Cache Entry ─────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  BASE_URL: 'https://api.hiro.so',
  
  CACHE_TTL: 30000,          // 30 seconds
  REQUEST_TIMEOUT: 15000,    // 15 seconds
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000, // 1 second
  MAX_REQUESTS_PER_MINUTE: 60,
  RATE_LIMIT_WINDOW: 60000,  // 1 minute
  MAX_CACHE_ENTRIES: 200,
} as const;

// ─── Service Implementation ──────────────────────────────────────────────────

export class OrdinalsMarketService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private requestTimestamps: number[] = [];
  private requestQueue: Promise<unknown> = Promise.resolve();

  // ── Collections ──────────────────────────────────────────────────────────

  /**
   * Get collection details by symbol.
   * OKX primary → ME fallback
   */
  async getCollectionDetails(symbol: string): Promise<OrdinalsCollectionDetail | null> {
    const cacheKey = `collection-detail-${symbol}`;
    const cached = this.getCached<OrdinalsCollectionDetail>(cacheKey);
    if (cached) return cached;

    // Try OKX first
    try {
      const okxData = await okxApi.getCollection(symbol);
      if (okxData) {
        const adapted: OrdinalsCollectionDetail = {
          symbol: okxData.symbol || symbol,
          name: okxData.name,
          description: okxData.description,
          imageURI: okxData.logoUrl,
          supply: okxData.totalSupply,
          totalVolume: parseFloat(okxData.volumeTotal || '0'),
          floorPrice: parseFloat(okxData.floorPrice || '0'),
          owners: okxData.ownerCount,
          websiteLink: okxData.websiteUrl,
          twitterLink: okxData.twitterUrl,
          discordLink: okxData.discordUrl,
        };
        this.setCache(cacheKey, adapted);
        return adapted;
      }
    } catch (err) {
      console.warn(`[OrdinalsService] OKX failed for collection "${symbol}", trying ME fallback`);
    }

    // ME fallback
    try {
      const data = await this.request<OrdinalsCollectionDetail>(
        `/v2/ord/btc/collections/${encodeURIComponent(symbol)}`
      );
      if (data) {
        this.setCache(cacheKey, data);
      }
      return data;
    } catch (error) {
      console.error(`[OrdinalsService] All sources failed for collection "${symbol}":`, error);
      return null;
    }
  }

  /**
   * Get collection statistics.
   * OKX primary → ME fallback
   */
  async getCollectionStats(collectionSymbol: string): Promise<OrdinalsCollectionStats | null> {
    const cacheKey = `collection-stats-${collectionSymbol}`;
    const cached = this.getCached<OrdinalsCollectionStats>(cacheKey);
    if (cached) return cached;

    // Try OKX first
    try {
      const okxStats = await okxApi.getCollectionStats(collectionSymbol, '24h');
      if (okxStats) {
        const adapted: OrdinalsCollectionStats = {
          symbol: collectionSymbol,
          floorPrice: parseFloat(okxStats.floorPrice || '0'),
          listedCount: okxStats.listedCount,
          totalVolume: parseFloat(okxStats.totalVolume || '0'),
          totalListed: okxStats.totalListings,
          owners: okxStats.ownerCount,
          supply: okxStats.itemCount,
        };
        this.setCache(cacheKey, adapted);
        return adapted;
      }
    } catch (err) {
      console.warn(`[OrdinalsService] OKX stats failed for "${collectionSymbol}", trying ME fallback`);
    }

    // ME fallback
    try {
      const data = await this.request<OrdinalsCollectionStats>(
        `/v2/ord/btc/stat?collectionSymbol=${encodeURIComponent(collectionSymbol)}`
      );
      if (data) {
        this.setCache(cacheKey, data);
      }
      return data;
    } catch (error) {
      console.error(`[OrdinalsService] All sources failed for stats "${collectionSymbol}":`, error);
      return null;
    }
  }

  // ── Tokens ───────────────────────────────────────────────────────────────

  /**
   * Get tokens/inscriptions with filter parameters.
   * OKX primary → ME fallback
   */
  async getTokens(params: OrdinalsTokensParams = {}): Promise<OrdinalsTokensResponse> {
    const cacheKey = `tokens-${JSON.stringify(params)}`;
    const cached = this.getCached<OrdinalsTokensResponse>(cacheKey);
    if (cached) return cached;

    // Try OKX first (for collection-based queries)
    if (params.collectionSymbol) {
      try {
        const okxResult = await okxApi.getInscriptions(
          params.collectionSymbol,
          undefined,
          undefined,
          undefined,
          'newest',
          params.limit || 20
        );
        if (okxResult.inscriptions.length > 0) {
          const adapted: OrdinalsTokensResponse = {
            tokens: okxResult.inscriptions.map((insc: any) => ({
              id: insc.inscriptionId,
              contentURI: insc.content,
              contentType: insc.contentType,
              contentPreviewURI: insc.preview,
              meta: {
                name: `#${insc.inscriptionNumber}`,
                collection: params.collectionSymbol,
              },
              owner: insc.address,
              listedPrice: insc.listingInfo ? parseFloat(insc.listingInfo.price) : undefined,
              listed: !!insc.listingInfo,
              inscriptionNumber: parseInt(insc.inscriptionNumber || '0'),
            })),
          };
          this.setCache(cacheKey, adapted);
          return adapted;
        }
      } catch (err) {
        console.warn('[OrdinalsService] OKX tokens failed, trying ME fallback');
      }
    }

    // ME fallback (full query support)
    const queryParts: string[] = [];
    if (params.collectionSymbol) queryParts.push(`collectionSymbol=${encodeURIComponent(params.collectionSymbol)}`);
    if (params.ownerAddress) queryParts.push(`ownerAddress=${encodeURIComponent(params.ownerAddress)}`);
    if (params.inscriptionMin !== undefined) queryParts.push(`inscriptionMin=${params.inscriptionMin}`);
    if (params.inscriptionMax !== undefined) queryParts.push(`inscriptionMax=${params.inscriptionMax}`);
    if (params.tokenIds?.length) queryParts.push(`tokenIds=${params.tokenIds.map(encodeURIComponent).join(',')}`);
    if (params.parentTokenIds?.length) queryParts.push(`parentTokenIds=${params.parentTokenIds.map(encodeURIComponent).join(',')}`);
    if (params.satRarity) queryParts.push(`satRarity=${encodeURIComponent(params.satRarity)}`);
    if (params.limit !== undefined) {
      const clampedLimit = Math.min(100, Math.max(20, Math.round(params.limit / 20) * 20));
      queryParts.push(`limit=${clampedLimit}`);
    }
    if (params.offset !== undefined) queryParts.push(`offset=${params.offset}`);
    if (params.sortBy) queryParts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
    if (params.sortDirection) queryParts.push(`sortDirection=${params.sortDirection}`);

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    try {
      const data = await this.request<OrdinalsTokensResponse>(`/v2/ord/btc/tokens${query}`);
      const result = data || { tokens: [] };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[OrdinalsService] All sources failed for tokens:', error);
      return { tokens: [] };
    }
  }

  // ── Block Activities ─────────────────────────────────────────────────────

  /**
   * Get block/market activities (recent on-chain events).
   * OKX primary → ME fallback
   */
  async getBlockActivities(params: OrdinalsBlockActivitiesParams = {}): Promise<OrdinalsBlockActivitiesResponse> {
    const cacheKey = `block-activities-${JSON.stringify(params)}`;
    const cached = this.getCached<OrdinalsBlockActivitiesResponse>(cacheKey);
    if (cached) return cached;

    // Try OKX first (if collection specified)
    if (params.collectionSymbol) {
      try {
        const okxActivities = await okxApi.getCollectionActivity(
          params.collectionSymbol,
          undefined,
          params.limit || 20
        );
        if (okxActivities.activities.length > 0) {
          const adapted: OrdinalsBlockActivitiesResponse = {
            activities: okxActivities.activities.map((a: any) => ({
              kind: a.type?.toLowerCase() || 'unknown',
              tokenId: a.inscriptionId,
              collectionSymbol: params.collectionSymbol,
              seller: a.fromAddress,
              buyer: a.toAddress,
              price: a.price ? parseFloat(a.price) : undefined,
              txId: a.txHash,
              blockTime: a.timestamp,
              createdAt: a.timestamp,
            })),
          };
          this.setCache(cacheKey, adapted);
          return adapted;
        }
      } catch (err) {
        console.warn('[OrdinalsService] OKX activities failed, trying ME fallback');
      }
    }

    // ME fallback
    const queryParts: string[] = [];
    if (params.kind) queryParts.push(`kind=${encodeURIComponent(params.kind)}`);
    if (params.collectionSymbol) queryParts.push(`collectionSymbol=${encodeURIComponent(params.collectionSymbol)}`);
    if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    if (params.offset !== undefined) queryParts.push(`offset=${params.offset}`);

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    try {
      const data = await this.request<OrdinalsBlockActivitiesResponse>(`/v2/ord/btc/block/activities${query}`);
      const result = data || { activities: [] };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[OrdinalsService] All sources failed for activities:', error);
      return { activities: [] };
    }
  }

  // ── Collection Activities ────────────────────────────────────────────────

  /**
   * Get collection-specific activities (sales, listings, etc.)
   * OKX primary → ME fallback
   */
  async getCollectionActivities(params: OrdinalsBlockActivitiesParams = {}): Promise<OrdinalsBlockActivitiesResponse> {
    // Delegate to getBlockActivities which already has OKX adapter
    return this.getBlockActivities(params);
  }

  // ── Rare Sats ────────────────────────────────────────────────────────────

  /**
   * GET /v2/ord/btc/raresats/listings
   * Get rare sats listings.
   */
  async getRareSatListings(params: OrdinalsRareSatListingsParams = {}): Promise<OrdinalsRareSatListingsResponse> {
    const queryParts: string[] = [];

    if (params.limit !== undefined) {
      queryParts.push(`limit=${params.limit}`);
    }
    if (params.offset !== undefined) {
      queryParts.push(`offset=${params.offset}`);
    }
    if (params.sortBy) {
      queryParts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
    }
    if (params.sortDirection) {
      queryParts.push(`sortDirection=${params.sortDirection}`);
    }

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const cacheKey = `raresats-listings-${query}`;
    const cached = this.getCached<OrdinalsRareSatListingsResponse>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request<OrdinalsRareSatListingsResponse>(
        `/v2/ord/btc/raresats/listings${query}`
      );
      const result = data || { listings: [] };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[OrdinalsMarketService] Failed to get rare sat listings:', error);
      return { listings: [] };
    }
  }

  /**
   * GET /v2/ord/btc/raresats/wallet/{address}/utxos
   * Get rare sats UTXOs for a wallet address.
   */
  async getRareSatsByWallet(address: string): Promise<OrdinalsRareSatUtxosResponse> {
    const cacheKey = `raresats-wallet-${address}`;
    const cached = this.getCached<OrdinalsRareSatUtxosResponse>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request<OrdinalsRareSatUtxosResponse>(
        `/v2/ord/btc/raresats/wallet/${encodeURIComponent(address)}/utxos`
      );
      const result = data || { utxos: [] };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`[OrdinalsMarketService] Failed to get rare sats for wallet "${address}":`, error);
      return { utxos: [] };
    }
  }

  /**
   * POST /v2/ord/btc/raresats/listing/psbt
   * Get a batch listing PSBT for signing.
   */
  async getBatchListingPSBT(
    body: OrdinalsBatchListingPSBTRequest
  ): Promise<OrdinalsBatchListingPSBTResponse | null> {
    try {
      const data = await this.request<OrdinalsBatchListingPSBTResponse>(
        '/v2/ord/btc/raresats/listing/psbt',
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      return data;
    } catch (error) {
      console.error('[OrdinalsMarketService] Failed to get batch listing PSBT:', error);
      return null;
    }
  }

  /**
   * POST /v2/ord/btc/raresats/listing
   * Submit a signed batch listing.
   */
  async submitBatchListing(
    body: OrdinalsBatchListingSubmitRequest
  ): Promise<OrdinalsBatchListingSubmitResponse> {
    try {
      const data = await this.request<OrdinalsBatchListingSubmitResponse>(
        '/v2/ord/btc/raresats/listing',
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      return data || { success: false, message: 'No response from API' };
    } catch (error) {
      console.error('[OrdinalsMarketService] Failed to submit batch listing:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ── Core HTTP / Infrastructure ───────────────────────────────────────────

  /**
   * Central request method with rate limiting, retries, and auth.
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    return this.executeRequest<T>(path, options);
  }

  private async executeRequest<T>(
    path: string,
    options: RequestInit,
    retryCount: number = 0
  ): Promise<T | null> {
    // Enforce rate limit: max 30 requests per minute
    await this.waitForRateLimit();

    const url = `${CONFIG.BASE_URL}${path}`;
    const hiroApiKey = process.env.HIRO_API_KEY || '';

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'CYPHER-V3-Terminal/1.0',
      ...(options.headers as Record<string, string> || {}),
    };

    if (hiroApiKey) {
      headers['x-hiro-api-key'] = hiroApiKey;
    }

    if (options.method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      this.recordRequest();

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
          const cappedRetryAfter = Math.min(retryAfter, 60);
          const waitMs = cappedRetryAfter * 1000;
          console.warn(
            `[OrdinalsService] Rate limited (429). Waiting ${cappedRetryAfter}s before retry.`
          );
          await this.sleep(waitMs);
          if (retryCount < CONFIG.MAX_RETRIES) {
            return this.executeRequest<T>(path, options, retryCount + 1);
          }
          throw new Error(`Rate limited after ${CONFIG.MAX_RETRIES} retries`);
        }

        if (response.status === 404) {
          return null;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (retryCount < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(
          `[OrdinalsService] Request failed (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES}), retrying in ${delay}ms: ${path}`
        );
        await this.sleep(delay);
        return this.executeRequest<T>(path, options, retryCount + 1);
      }

      throw error;
    }
  }

  // ── Rate Limiting ────────────────────────────────────────────────────────

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < CONFIG.RATE_LIMIT_WINDOW
    );

    if (this.requestTimestamps.length >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      // Calculate how long to wait until the oldest request exits the window
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = CONFIG.RATE_LIMIT_WINDOW - (now - oldestInWindow) + 50; // +50ms buffer
      await this.sleep(waitMs);
      // Recursively check again after waiting
      return this.waitForRateLimit();
    }
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  // ── Caching ──────────────────────────────────────────────────────────────

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = CONFIG.CACHE_TTL): void {
    if (this.cache.size >= CONFIG.MAX_CACHE_ENTRIES) {
      this.evictStaleEntries();
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private evictStaleEntries(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp >= entry.ttl) {
        toDelete.push(key);
      }
    });

    for (const key of toDelete) {
      this.cache.delete(key);
    }

    // If still over limit, remove oldest entries
    if (this.cache.size >= CONFIG.MAX_CACHE_ENTRIES) {
      const sorted = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const removeCount = Math.ceil(this.cache.size * 0.25);
      for (let i = 0; i < removeCount; i++) {
        this.cache.delete(sorted[i][0]);
      }
    }
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // ── Utilities ────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const ordinalsMarketService = new OrdinalsMarketService();
