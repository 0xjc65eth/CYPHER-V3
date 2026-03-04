/**
 * UniSat Runes + Marketplace Service
 * Complete integration with UniSat Open API for Runes indexer and marketplace operations.
 * Base URL: https://open-api.unisat.io
 * Auth: Bearer token via UNISAT_API_KEY env variable
 */

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/** Standard UniSat API response wrapper */
export interface UniSatApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

/** Pagination parameters */
export interface PaginationParams {
  start?: number;
  limit?: number;
}

// --- Runes Indexer Types ---

export interface RuneInfo {
  runeid: string;
  rune: string;
  spacedRune: string;
  number: number;
  height: number;
  txidx: number;
  timestamp: number;
  divisibility: number;
  symbol: string;
  etching: string;
  premine: string;
  terms?: RuneTerms;
  mints: string;
  burned: string;
  holders: number;
  transactions: number;
  supply: string;
  mintable: boolean;
  remaining: string;
  start?: number;
  end?: number;
  cap: string;
  amount?: string;
}

export interface RuneTerms {
  amount: string;
  cap: string;
  heightStart?: number;
  heightEnd?: number;
  offsetStart?: number;
  offsetEnd?: number;
}

export interface RuneInfoListData {
  list: RuneInfo[];
  total: number;
}

export interface RuneIndexerStatus {
  height: number;
  hash: string;
  runesCount: number;
  synced: boolean;
  lastUpdateTime: number;
}

export interface RuneHolder {
  address: string;
  amount: string;
  percentage: number;
}

export interface RuneHoldersData {
  list: RuneHolder[];
  total: number;
}

export interface RuneHistoryEntry {
  txid: string;
  type: string;
  valid: boolean;
  height: number;
  timestamp: number;
  address?: string;
  amount?: string;
  runeid: string;
}

export interface RuneHistoryData {
  list: RuneHistoryEntry[];
  total: number;
}

export interface AddressRuneBalance {
  runeid: string;
  rune: string;
  spacedRune: string;
  amount: string;
  symbol: string;
  divisibility: number;
}

export interface AddressRuneBalanceListData {
  list: AddressRuneBalance[];
  total: number;
}

export interface AddressRuneBalanceData {
  runeid: string;
  rune: string;
  spacedRune: string;
  amount: string;
  symbol: string;
  divisibility: number;
}

export interface UtxoRuneBalance {
  runeid: string;
  rune: string;
  spacedRune: string;
  amount: string;
  symbol: string;
  divisibility: number;
}

export interface UtxoRuneBalanceData {
  balances: UtxoRuneBalance[];
}

// --- Runes Marketplace Types ---

export interface RunesAuctionItem {
  auctionId: string;
  runeid: string;
  rune: string;
  spacedRune: string;
  symbol: string;
  divisibility: number;
  amount: string;
  unitPrice: string;
  totalPrice: string;
  seller: string;
  buyer?: string;
  status: 'listed' | 'sold' | 'cancelled' | 'pending';
  txid?: string;
  createTime: number;
  updateTime: number;
}

export interface RunesAuctionListData {
  list: RunesAuctionItem[];
  total: number;
}

export interface RunesAuctionListParams {
  runeid?: string;
  sort?: 'priceAsc' | 'priceDesc' | 'timeDesc' | 'timeAsc';
  start?: number;
  limit?: number;
  status?: string;
}

export interface RunesAuctionDetailData {
  auctionId: string;
  runeid: string;
  rune: string;
  spacedRune: string;
  symbol: string;
  divisibility: number;
  amount: string;
  unitPrice: string;
  totalPrice: string;
  seller: string;
  buyer?: string;
  status: string;
  txid?: string;
  createTime: number;
  updateTime: number;
  psbt?: string;
  signedPsbt?: string;
}

export interface CreatePutOnRequest {
  runeid: string;
  amount: string;
  unitPrice: string;
  address: string;
  pubkey: string;
  psbt: string;
  signedPsbt: string;
}

export interface CreatePutOnResponse {
  auctionId: string;
  status: string;
}

export interface CreateBidRequest {
  auctionId: string;
  address: string;
  pubkey: string;
  bidPrice: string;
  psbt: string;
  signedPsbt: string;
}

export interface CreateBidResponse {
  bidId: string;
  auctionId: string;
  status: string;
}

export interface ConfirmAuctionRequest {
  auctionId: string;
  signedPsbt: string;
}

export interface ConfirmAuctionResponse {
  txid: string;
  status: string;
}

// --- General Marketplace Types ---

export interface MarketCollection {
  collectionId: string;
  name: string;
  description: string;
  imageUrl: string;
  bannerUrl?: string;
  supply: number;
  listed: number;
  floorPrice: string;
  totalVolume: string;
  volume24h: string;
  owners: number;
  verified: boolean;
  type: string;
}

export interface MarketCollectionListData {
  list: MarketCollection[];
  total: number;
}

export interface CollectionListParams {
  type?: string;
  sort?: string;
  start?: number;
  limit?: number;
  keyword?: string;
}

export interface CollectionAuctionItem {
  auctionId: string;
  collectionId: string;
  inscriptionId: string;
  inscriptionNumber: number;
  price: string;
  seller: string;
  buyer?: string;
  status: string;
  createTime: number;
  updateTime: number;
}

export interface CollectionAuctionListData {
  list: CollectionAuctionItem[];
  total: number;
}

export interface CollectionAuctionListParams {
  collectionId?: string;
  sort?: string;
  start?: number;
  limit?: number;
  status?: string;
}

// ============================================================================
// Cache Entry
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class UniSatRunesService {
  private readonly baseUrl = 'https://open-api.unisat.io';
  private readonly apiKey: string;
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultCacheTTL = 30_000; // 30 seconds
  private readonly longCacheTTL = 120_000; // 2 minutes
  private readonly maxRetries = 3;
  private readonly retryBaseDelay = 1000; // 1 second

  // Rate limiting state
  private requestTimestamps: number[] = [];
  private readonly rateLimit = 10; // requests per window
  private readonly rateLimitWindow = 1000; // 1 second window

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.UNISAT_API_KEY || '';
    if (!this.apiKey) {
    }
  }

  // ==========================================================================
  // Core Request Infrastructure
  // ==========================================================================

  /**
   * Enforce rate limiting by waiting if too many requests in the window.
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < this.rateLimitWindow
    );

    if (this.requestTimestamps.length >= this.rateLimit) {
      const oldest = this.requestTimestamps[0];
      const waitTime = this.rateLimitWindow - (now - oldest) + 10;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requestTimestamps.push(Date.now());
  }

  /**
   * Check cache for a valid entry.
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Store data in cache.
   */
  private setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultCacheTTL,
    });
  }

  /**
   * Build full URL with query params.
   */
  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /**
   * Core fetch with retry logic, rate limiting, and error handling.
   */
  private async fetchWithRetry<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, string | number | undefined>;
      body?: unknown;
      cacheTTL?: number;
      cacheKey?: string;
    } = {}
  ): Promise<T> {
    const { method = 'GET', params, body, cacheTTL, cacheKey } = options;

    // Check cache for GET requests
    const resolvedCacheKey = cacheKey || `${method}:${path}:${JSON.stringify(params || {})}`;
    if (method === 'GET') {
      const cached = this.getFromCache<T>(resolvedCacheKey);
      if (cached !== null) return cached;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();

        const url = this.buildUrl(path, method === 'GET' ? params : undefined);
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        };

        const fetchOptions: RequestInit = { method, headers };
        if (body && method === 'POST') {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);

        if (response.status === 429) {
          // Rate limited by server - exponential backoff
          const backoff = this.retryBaseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        if (!response.ok) {
          throw new Error(`UniSat API error: ${response.status} ${response.statusText}`);
        }

        const json: UniSatApiResponse<T> = await response.json();

        if (json.code !== 0) {
          throw new Error(`UniSat API returned error code ${json.code}: ${json.msg}`);
        }

        const data = json.data;

        // Cache successful GET responses
        if (method === 'GET') {
          this.setCache(resolvedCacheKey, data, cacheTTL);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries - 1) {
          const backoff = this.retryBaseDelay * Math.pow(2, attempt);
          console.warn(
            `[UniSatRunesService] Request failed (attempt ${attempt + 1}/${this.maxRetries}): ${lastError.message}. Retrying in ${backoff}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    throw lastError || new Error('UniSat API request failed after all retries');
  }

  // ==========================================================================
  // Runes Indexer Endpoints
  // ==========================================================================

  /**
   * GET /v1/indexer/runes/info-list
   * Get list of runes with basic info.
   */
  async getRunesInfoList(params?: PaginationParams): Promise<RuneInfoListData> {
    return this.fetchWithRetry<RuneInfoListData>('/v1/indexer/runes/info-list', {
      params: {
        start: params?.start,
        limit: params?.limit,
      },
      cacheTTL: this.defaultCacheTTL,
    });
  }

  /**
   * GET /v1/indexer/runes/{runeid}/info
   * Get detailed info for a specific rune by runeid.
   */
  async getRuneInfo(runeid: string): Promise<RuneInfo> {
    return this.fetchWithRetry<RuneInfo>(`/v1/indexer/runes/${encodeURIComponent(runeid)}/info`, {
      cacheTTL: this.defaultCacheTTL,
    });
  }

  /**
   * GET /v1/indexer/runes/status
   * Get current status of the runes indexer.
   */
  async getRunesIndexerStatus(): Promise<RuneIndexerStatus> {
    return this.fetchWithRetry<RuneIndexerStatus>('/v1/indexer/runes/status', {
      cacheTTL: this.longCacheTTL,
    });
  }

  /**
   * GET /v1/indexer/runes/{runeid}/holders
   * Get holders for a specific rune.
   */
  async getRuneHolders(
    runeid: string,
    params?: PaginationParams
  ): Promise<RuneHoldersData> {
    return this.fetchWithRetry<RuneHoldersData>(
      `/v1/indexer/runes/${encodeURIComponent(runeid)}/holders`,
      {
        params: {
          start: params?.start,
          limit: params?.limit,
        },
        cacheTTL: this.defaultCacheTTL,
      }
    );
  }

  /**
   * GET /v1/indexer/runes/{runeid}/history
   * Get transaction history for a specific rune.
   */
  async getRuneHistory(
    runeid: string,
    params?: PaginationParams
  ): Promise<RuneHistoryData> {
    return this.fetchWithRetry<RuneHistoryData>(
      `/v1/indexer/runes/${encodeURIComponent(runeid)}/history`,
      {
        params: {
          start: params?.start,
          limit: params?.limit,
        },
        cacheTTL: this.defaultCacheTTL,
      }
    );
  }

  /**
   * GET /v1/indexer/address/{address}/runes/balance-list
   * Get all runes balances for an address.
   */
  async getAddressRunesBalanceList(
    address: string,
    params?: PaginationParams
  ): Promise<AddressRuneBalanceListData> {
    return this.fetchWithRetry<AddressRuneBalanceListData>(
      `/v1/indexer/address/${encodeURIComponent(address)}/runes/balance-list`,
      {
        params: {
          start: params?.start,
          limit: params?.limit,
        },
        cacheTTL: this.defaultCacheTTL,
      }
    );
  }

  /**
   * GET /v1/indexer/address/{address}/runes/{runeid}/balance
   * Get specific rune balance for an address.
   */
  async getAddressRuneBalance(
    address: string,
    runeid: string
  ): Promise<AddressRuneBalanceData> {
    return this.fetchWithRetry<AddressRuneBalanceData>(
      `/v1/indexer/address/${encodeURIComponent(address)}/runes/${encodeURIComponent(runeid)}/balance`,
      {
        cacheTTL: this.defaultCacheTTL,
      }
    );
  }

  /**
   * GET /v1/indexer/runes/utxo/{txid}/{index}/balance
   * Get rune balance for a specific UTXO.
   */
  async getUtxoRuneBalance(txid: string, index: number): Promise<UtxoRuneBalanceData> {
    return this.fetchWithRetry<UtxoRuneBalanceData>(
      `/v1/indexer/runes/utxo/${encodeURIComponent(txid)}/${index}/balance`,
      {
        cacheTTL: this.defaultCacheTTL,
      }
    );
  }

  // ==========================================================================
  // Runes Marketplace Endpoints
  // ==========================================================================

  /**
   * GET /v3/market/runes/auction/list
   * List runes market auction orders with filtering and sorting.
   */
  async getRunesAuctionList(params?: RunesAuctionListParams): Promise<RunesAuctionListData> {
    return this.fetchWithRetry<RunesAuctionListData>('/v3/market/runes/auction/list', {
      params: {
        runeid: params?.runeid,
        sort: params?.sort,
        start: params?.start,
        limit: params?.limit,
        status: params?.status,
      },
      cacheTTL: this.defaultCacheTTL,
    });
  }

  /**
   * GET /v3/market/runes/auction/{auctionId}
   * Get details for a specific auction order.
   */
  async getRunesAuctionDetail(auctionId: string): Promise<RunesAuctionDetailData> {
    return this.fetchWithRetry<RunesAuctionDetailData>(
      `/v3/market/runes/auction/${encodeURIComponent(auctionId)}`,
      {
        cacheTTL: this.defaultCacheTTL,
      }
    );
  }

  /**
   * POST /v3/market/runes/auction/create_put_on
   * Create a sell listing for runes on the marketplace.
   */
  async createRunesSellListing(request: CreatePutOnRequest): Promise<CreatePutOnResponse> {
    return this.fetchWithRetry<CreatePutOnResponse>('/v3/market/runes/auction/create_put_on', {
      method: 'POST',
      body: request,
    });
  }

  /**
   * POST /v3/market/runes/auction/create_bid
   * Create a buy/bid order for runes on the marketplace.
   */
  async createRunesBid(request: CreateBidRequest): Promise<CreateBidResponse> {
    return this.fetchWithRetry<CreateBidResponse>('/v3/market/runes/auction/create_bid', {
      method: 'POST',
      body: request,
    });
  }

  /**
   * POST /v3/market/runes/auction/confirm
   * Confirm an auction order (finalize the trade).
   */
  async confirmRunesAuction(request: ConfirmAuctionRequest): Promise<ConfirmAuctionResponse> {
    return this.fetchWithRetry<ConfirmAuctionResponse>('/v3/market/runes/auction/confirm', {
      method: 'POST',
      body: request,
    });
  }

  // ==========================================================================
  // General Marketplace Endpoints
  // ==========================================================================

  /**
   * GET /v3/market/collection/list
   * List marketplace collections with filtering and sorting.
   */
  async getMarketCollectionList(params?: CollectionListParams): Promise<MarketCollectionListData> {
    return this.fetchWithRetry<MarketCollectionListData>('/v3/market/collection/list', {
      params: {
        type: params?.type,
        sort: params?.sort,
        start: params?.start,
        limit: params?.limit,
        keyword: params?.keyword,
      },
      cacheTTL: this.defaultCacheTTL,
    });
  }

  /**
   * GET /v3/market/collection/auction/list
   * List auctions within a collection.
   */
  async getCollectionAuctionList(
    params?: CollectionAuctionListParams
  ): Promise<CollectionAuctionListData> {
    return this.fetchWithRetry<CollectionAuctionListData>('/v3/market/collection/auction/list', {
      params: {
        collectionId: params?.collectionId,
        sort: params?.sort,
        start: params?.start,
        limit: params?.limit,
        status: params?.status,
      },
      cacheTTL: this.defaultCacheTTL,
    });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /** Clear the entire cache */
  clearCache(): void {
    this.cache.clear();
  }

  /** Clear cache entries matching a prefix */
  clearCacheByPrefix(prefix: string): void {
    Array.from(this.cache.keys()).forEach(key => {
      if (key.includes(prefix)) {
        this.cache.delete(key);
      }
    });
  }

  /** Get cache statistics */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const unisatRunesService = new UniSatRunesService();
