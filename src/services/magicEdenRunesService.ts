/**
 * Runes API Service - CYPHER V3
 * Hiro-first with Magic Eden fallback for read endpoints.
 * ME-only for marketplace trading endpoints (orders, PSBT, swap).
 *
 * Migration status (Magic Eden deprecation):
 * - Market Info: Hiro primary ✅, ME fallback
 * - Activities: Hiro primary ✅, ME fallback
 * - Wallet Balances: Hiro primary ✅, ME fallback
 * - Collection Stats: Hiro primary ✅, ME fallback
 * - Orders/UTXOs: ME only (marketplace-specific)
 * - Trading (PSBT/Swap): ME only (marketplace-specific)
 */

import { HiroRunesAPI } from '@/lib/api/hiro/runes';

// Hiro runes API singleton (primary data source for read operations)
const hiroRunesApi = new HiroRunesAPI();

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  BASE_URL: 'https://api-mainnet.magiceden.dev',
  CACHE_TTL: 30_000,           // 30 seconds default
  CACHE_TTL_MARKET: 15_000,    // 15 seconds for market data
  CACHE_MAX_ENTRIES: 200,
  REQUEST_TIMEOUT: 15_000,     // 15 seconds
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 1_000,    // 1 second base for exponential backoff
  RATE_LIMIT_QPM: 30,         // 30 queries per minute
  RATE_LIMIT_INTERVAL: 60_000 / 30, // ~2000ms between requests
};

// ============================================================================
// TypeScript Interfaces - Runes Info
// ============================================================================

/** Rune market info response from GET /v2/ord/btc/runes/market/{rune}/info */
export interface RuneMarketInfo {
  rune: string;
  runeName?: string;
  spacedRune?: string;
  symbol?: string;
  floorUnitPrice?: {
    formatted?: string;
    value?: number;
  };
  marketCap?: number;
  totalVolume?: number;
  volume24h?: number;
  holders?: number;
  totalSupply?: string;
  listedCount?: number;
  txnCount24h?: number;
  mintProgress?: number;
  imageURI?: string;
  divisibility?: number;
  priceChange24h?: number;
}

/** Query parameters for rune orders */
export interface RuneOrdersParams {
  rune: string;
  side?: 'sell' | 'buy';
  sortBy?: 'unitPriceAsc' | 'unitPriceDesc' | 'totalPriceAsc' | 'totalPriceDesc';
  limit?: number;
  offset?: number;
  minPrice?: number;
  maxPrice?: number;
}

/** Single rune order */
export interface RuneOrder {
  id: string;
  side: 'sell' | 'buy';
  rune: string;
  maker: string;
  unitPrice: {
    formatted?: string;
    value?: number;
  };
  amount: string;
  totalPrice: {
    formatted?: string;
    value?: number;
  };
  formattedAmount?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  txId?: string;
  location?: string;
}

/** Response for GET /v2/ord/btc/runes/orders/{rune} */
export interface RuneOrdersResponse {
  orders: RuneOrder[];
  total: number;
  offset: number;
  limit: number;
}

/** Query params for rune UTXOs */
export interface RuneUtxosParams {
  walletAddress: string;
  rune?: string;
  limit?: number;
  offset?: number;
}

/** Single rune UTXO */
export interface RuneUtxo {
  txId: string;
  vout: number;
  satoshis: number;
  address: string;
  rune: string;
  amount: string;
  formattedAmount?: string;
  unitPrice?: {
    formatted?: string;
    value?: number;
  };
  listed?: boolean;
  location?: string;
}

/** Response for GET /v2/ord/btc/runes/utxos/{wallet-address} */
export interface RuneUtxosResponse {
  utxos: RuneUtxo[];
  total: number;
  offset: number;
  limit: number;
}

/** Query params for rune activities */
export interface RuneActivitiesParams {
  rune: string;
  type?: 'listing' | 'buying' | 'delisting' | 'mint' | 'transfer';
  limit?: number;
  offset?: number;
}

/** Single rune activity */
export interface RuneActivity {
  id: string;
  type: string;
  rune: string;
  from?: string;
  to?: string;
  amount?: string;
  formattedAmount?: string;
  unitPrice?: {
    formatted?: string;
    value?: number;
  };
  totalPrice?: {
    formatted?: string;
    value?: number;
  };
  txId?: string;
  blockHeight?: number;
  timestamp?: string;
  createdAt?: string;
}

/** Response for GET /v2/ord/btc/runes/activities/{rune} */
export interface RuneActivitiesResponse {
  activities: RuneActivity[];
  total: number;
  offset: number;
  limit: number;
}

/** Query params for wallet activities */
export interface RuneWalletActivitiesParams {
  address: string;
  rune?: string;
  type?: 'listing' | 'buying' | 'delisting' | 'mint' | 'transfer';
  limit?: number;
  offset?: number;
}

/** Response for GET /v2/ord/btc/runes/wallet/{address}/activities */
export interface RuneWalletActivitiesResponse {
  activities: RuneActivity[];
  total: number;
  offset: number;
  limit: number;
}

/** Query params for wallet rune balances */
export interface RuneWalletBalancesParams {
  address: string;
  rune: string;
}

/** Response for GET /v2/ord/btc/runes/wallet/{address}/balances/{rune} */
export interface RuneWalletBalance {
  rune: string;
  runeName?: string;
  spacedRune?: string;
  symbol?: string;
  amount: string;
  formattedAmount?: string;
  divisibility?: number;
  address: string;
  utxos?: RuneUtxo[];
}

/** Query params for collection stats */
export interface RuneCollectionStatsParams {
  window?: '1h' | '6h' | '1d' | '7d' | '30d';
  limit?: number;
  offset?: number;
  sortBy?: 'volume' | 'floorPrice' | 'sales' | 'holders' | 'marketCap';
  sortDirection?: 'asc' | 'desc';
}

/** Single rune collection stat */
export interface RuneCollectionStat {
  rune: string;
  runeName?: string;
  spacedRune?: string;
  symbol?: string;
  imageURI?: string;
  floorUnitPrice?: {
    formatted?: string;
    value?: number;
  };
  marketCap?: number;
  volume?: number;
  volumeChange?: number;
  sales?: number;
  holders?: number;
  listedCount?: number;
  totalSupply?: string;
  ownerCount?: number;
}

/** Response for GET /v2/ord/btc/runes/collection-stats */
export interface RuneCollectionStatsResponse {
  runes: RuneCollectionStat[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================================================
// TypeScript Interfaces - Runes Listing (Trading)
// ============================================================================

/** Request body for POST /v2/ord/btc/runes/psbt/order/create */
export interface CreateOrderPsbtRequest {
  side: 'sell' | 'buy';
  rune: string;
  maker: string;
  amount: string;
  unitPrice: string;
  expiresAt?: string;
  /** UTXO locations to use for the order */
  utxos?: Array<{
    txId: string;
    vout: number;
  }>;
  feeRate?: number;
}

/** Response for POST /v2/ord/btc/runes/psbt/order/create */
export interface CreateOrderPsbtResponse {
  psbt: string;
  orderId: string;
  expiresAt?: string;
  inputsToSign: Array<{
    index: number;
    address: string;
    sigHash?: number;
  }>;
}

/** Request body for POST /v2/ord/btc/runes/order/create */
export interface SubmitOrderRequest {
  orderId: string;
  psbt: string;
  /** Signed PSBT */
  signedPsbt?: string;
}

/** Response for POST /v2/ord/btc/runes/order/create */
export interface SubmitOrderResponse {
  orderId: string;
  txId?: string;
  status: string;
  message?: string;
}

/** Request body for POST /v2/ord/btc/runes/psbt/order/cancel */
export interface CancelOrderPsbtRequest {
  orderId: string;
  maker: string;
}

/** Response for POST /v2/ord/btc/runes/psbt/order/cancel */
export interface CancelOrderPsbtResponse {
  message: string;
  orderId: string;
  inputsToSign?: Array<{
    index: number;
    address: string;
    sigHash?: number;
  }>;
}

/** Request body for POST /v2/ord/btc/runes/order/cancel */
export interface CancelOrderRequest {
  orderId: string;
  signedMessage: string;
  maker: string;
}

/** Response for POST /v2/ord/btc/runes/order/cancel */
export interface CancelOrderResponse {
  orderId: string;
  status: string;
  message?: string;
}

// ============================================================================
// TypeScript Interfaces - Runes Sweeping (Buying)
// ============================================================================

/** Request body for POST /v2/ord/btc/runes/psbt/sweeping */
export interface SweepingPsbtRequest {
  rune: string;
  buyer: string;
  /** Order IDs to sweep */
  orderIds: string[];
  feeRate?: number;
  /** Funding UTXO overrides */
  fundingUtxos?: Array<{
    txId: string;
    vout: number;
  }>;
}

/** Response for POST /v2/ord/btc/runes/psbt/sweeping */
export interface SweepingPsbtResponse {
  psbt: string;
  totalPrice: {
    formatted?: string;
    value?: number;
  };
  totalAmount: string;
  orderIds: string[];
  inputsToSign: Array<{
    index: number;
    address: string;
    sigHash?: number;
  }>;
  networkFee?: number;
}

/** Request body for POST /v2/ord/btc/runes/sweeping */
export interface SubmitSweepingRequest {
  psbt: string;
  signedPsbt?: string;
  orderIds: string[];
  buyer: string;
}

/** Response for POST /v2/ord/btc/runes/sweeping */
export interface SubmitSweepingResponse {
  txId: string;
  status: string;
  orderIds: string[];
  message?: string;
}

// ============================================================================
// TypeScript Interfaces - Runes Market Sell
// ============================================================================

/** Request body for POST /v2/ord/btc/runes/psbt/market-sell */
export interface MarketSellPsbtRequest {
  rune: string;
  seller: string;
  amount: string;
  /** Optional: specific UTXOs to sell from */
  utxos?: Array<{
    txId: string;
    vout: number;
  }>;
  feeRate?: number;
  /** Minimum acceptable price */
  minPrice?: string;
}

/** Response for POST /v2/ord/btc/runes/psbt/market-sell */
export interface MarketSellPsbtResponse {
  psbt: string;
  totalPrice: {
    formatted?: string;
    value?: number;
  };
  amount: string;
  matchedOrderIds: string[];
  inputsToSign: Array<{
    index: number;
    address: string;
    sigHash?: number;
  }>;
  networkFee?: number;
}

/** Request body for POST /v2/ord/btc/runes/market-sell */
export interface SubmitMarketSellRequest {
  psbt: string;
  signedPsbt?: string;
  seller: string;
  matchedOrderIds: string[];
}

/** Response for POST /v2/ord/btc/runes/market-sell */
export interface SubmitMarketSellResponse {
  txId: string;
  status: string;
  matchedOrderIds: string[];
  message?: string;
}

// ============================================================================
// TypeScript Interfaces - Runes Swap
// ============================================================================

/** Query params for GET /v2/ord/btc/runes/quote */
export interface RuneSwapQuoteParams {
  from: string;
  to: string;
  amount: string;
}

/** Response for GET /v2/ord/btc/runes/quote */
export interface RuneSwapQuoteResponse {
  from: string;
  to: string;
  inputAmount: string;
  outputAmount: string;
  exchangeRate: string;
  priceImpact?: number;
  fees?: {
    network?: number;
    service?: number;
    total?: number;
  };
  route?: Array<{
    rune: string;
    amount: string;
  }>;
  expiresAt?: string;
  quoteId?: string;
}

/** Request body for POST /v2/ord/btc/runes/psbt/swap */
export interface SwapPsbtRequest {
  quoteId: string;
  from: string;
  to: string;
  amount: string;
  userAddress: string;
  feeRate?: number;
}

/** Response for POST /v2/ord/btc/runes/psbt/swap */
export interface SwapPsbtResponse {
  psbt: string;
  quoteId: string;
  inputAmount: string;
  outputAmount: string;
  inputsToSign: Array<{
    index: number;
    address: string;
    sigHash?: number;
  }>;
  networkFee?: number;
  expiresAt?: string;
}

/** Request body for POST /v2/ord/btc/runes/swap */
export interface SubmitSwapRequest {
  psbt: string;
  signedPsbt?: string;
  quoteId: string;
  userAddress: string;
}

/** Response for POST /v2/ord/btc/runes/swap */
export interface SubmitSwapResponse {
  txId: string;
  status: string;
  quoteId: string;
  inputAmount: string;
  outputAmount: string;
  message?: string;
}

// ============================================================================
// Generic / Shared Types
// ============================================================================

/** Generic API error response */
export interface MagicEdenApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

/** Cache entry */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class MagicEdenRunesService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private requestTimestamps: number[] = [];
  private requestQueue: Promise<unknown> = Promise.resolve();

  private getApiKey(): string {
    return process.env.MAGIC_EDEN_API_KEY || '';
  }

  private getHeaders(): Record<string, string> {
    const apiKey = this.getApiKey();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  /**
   * Enforce rate limit of 30 QPM by tracking timestamps and delaying if needed.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < 60_000
    );

    if (this.requestTimestamps.length >= CONFIG.RATE_LIMIT_QPM) {
      // Wait until the oldest request in the window expires
      const oldestTs = this.requestTimestamps[0];
      const waitTime = 60_000 - (now - oldestTs) + 50; // +50ms buffer
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }

    this.requestTimestamps.push(Date.now());
  }

  // ==========================================================================
  // Core Fetch with Retry + Rate Limiting
  // ==========================================================================

  /**
   * Queue-based fetch with rate limiting, retry, and exponential backoff.
   */
  private async fetchApi<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST';
      body?: unknown;
      cacheTtl?: number;
      cacheKey?: string;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      cacheTtl = CONFIG.CACHE_TTL,
      cacheKey,
      skipCache = false,
    } = options;

    const effectiveCacheKey = cacheKey || `${method}:${path}:${body ? JSON.stringify(body) : ''}`;

    // Check cache for GET requests
    if (!skipCache && method === 'GET') {
      const cached = this.getCached<T>(effectiveCacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Queue the request to serialize and rate limit
    const result: T = await (this.requestQueue = this.requestQueue
      .catch(() => {})
      .then(() => this.executeWithRetry<T>(path, method, body))) as T;

    // Cache the result for GET requests
    if (!skipCache && method === 'GET') {
      this.setCache(effectiveCacheKey, result, cacheTtl);
    }

    return result;
  }

  /**
   * Execute a single request with retry and exponential backoff.
   */
  private async executeWithRetry<T>(
    path: string,
    method: string,
    body: unknown,
    attempt: number = 0
  ): Promise<T> {
    await this.enforceRateLimit();

    const url = `${CONFIG.BASE_URL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: this.getHeaders(),
        signal: controller.signal,
      };

      if (body && method === 'POST') {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt);
          if (attempt < CONFIG.MAX_RETRIES) {
            await this.sleep(waitMs);
            return this.executeWithRetry<T>(path, method, body, attempt + 1);
          }
        }

        // Parse error body if possible
        let errorBody: MagicEdenApiError | null = null;
        try {
          errorBody = await response.json();
        } catch {
          // ignore parse error
        }

        const errorMessage = errorBody?.message || errorBody?.error || response.statusText;

        // Retry on 5xx server errors
        if (response.status >= 500 && attempt < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt);
          await this.sleep(delay);
          return this.executeWithRetry<T>(path, method, body, attempt + 1);
        }

        throw new Error(
          `Magic Eden API error ${response.status}: ${errorMessage}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const isAbort = error instanceof Error && error.name === 'AbortError';
      const isNetwork =
        error instanceof TypeError && error.message.includes('fetch');

      if ((isAbort || isNetwork) && attempt < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt);
        await this.sleep(delay);
        return this.executeWithRetry<T>(path, method, body, attempt + 1);
      }

      throw error;
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data as T;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = CONFIG.CACHE_TTL): void {
    if (this.cache.size >= CONFIG.CACHE_MAX_ENTRIES) {
      this.cleanCache();
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private cleanCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    });
    toDelete.forEach((key) => this.cache.delete(key));

    // If still at limit, remove oldest entries
    if (this.cache.size >= CONFIG.CACHE_MAX_ENTRIES) {
      const sorted = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const removeCount = Math.floor(CONFIG.CACHE_MAX_ENTRIES * 0.2);
      sorted.slice(0, removeCount).forEach(([key]) => this.cache.delete(key));
    }
  }

  /** Clear all cached data */
  clearCache(): void {
    this.cache.clear();
  }

  /** Get cache statistics */
  getCacheStats(): { size: number; keys: string[] } {
    return { size: this.cache.size, keys: Array.from(this.cache.keys()) };
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildQueryString(params: object): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  // ==========================================================================
  // 1. Runes Info Endpoints (7 GET endpoints)
  // ==========================================================================

  /**
   * Get rune market information
   * Hiro primary, Magic Eden fallback
   */
  async getRuneMarketInfo(rune: string): Promise<RuneMarketInfo> {
    // Try Hiro first
    try {
      const etching = await hiroRunesApi.getEtching(rune);
      return {
        rune: etching.rune_id || rune,
        runeName: etching.name,
        symbol: etching.symbol,
        totalSupply: etching.total_supply,
        holders: etching.total_mints, // approximate
        divisibility: etching.divisibility,
      } as RuneMarketInfo;
    } catch {
      // Hiro failed, fall back to Magic Eden
    }

    const encodedRune = encodeURIComponent(rune);
    return this.fetchApi<RuneMarketInfo>(
      `/v2/ord/btc/runes/market/${encodedRune}/info`,
      { cacheTtl: CONFIG.CACHE_TTL_MARKET }
    );
  }

  /**
   * GET /v2/ord/btc/runes/orders/{rune}
   * Get orders for a specific rune
   */
  async getRuneOrders(params: RuneOrdersParams): Promise<RuneOrdersResponse> {
    const { rune, ...query } = params;
    const encodedRune = encodeURIComponent(rune);
    const qs = this.buildQueryString(query);
    return this.fetchApi<RuneOrdersResponse>(
      `/v2/ord/btc/runes/orders/${encodedRune}${qs}`,
      { cacheTtl: CONFIG.CACHE_TTL_MARKET }
    );
  }

  /**
   * GET /v2/ord/btc/runes/utxos/wallet/{wallet-address}
   * Get rune UTXOs by wallet address
   */
  async getRuneUtxos(params: RuneUtxosParams): Promise<RuneUtxosResponse> {
    const { walletAddress, ...query } = params;
    const encodedAddress = encodeURIComponent(walletAddress);
    const qs = this.buildQueryString(query);
    return this.fetchApi<RuneUtxosResponse>(
      `/v2/ord/btc/runes/utxos/wallet/${encodedAddress}${qs}`
    );
  }

  /**
   * Get activities for a rune
   * Hiro primary, Magic Eden fallback
   */
  async getRuneActivities(params: RuneActivitiesParams): Promise<RuneActivitiesResponse> {
    // Try Hiro first
    try {
      const hiroResult = await hiroRunesApi.getActivity(params.rune, {
        limit: params.limit,
        offset: params.offset,
        operation: params.type === 'mint' ? 'mint' : params.type === 'transfer' ? 'transfer' : undefined,
      });
      return {
        activities: (hiroResult.results || []).map((a: any) => ({
          id: a.tx_id || '',
          type: a.operation || 'transfer',
          rune: params.rune,
          from: a.sender,
          to: a.receiver,
          amount: a.amount,
          txId: a.tx_id,
          blockHeight: a.block_height,
          timestamp: a.timestamp ? new Date(a.timestamp * 1000).toISOString() : undefined,
        })),
        total: hiroResult.total || 0,
        offset: hiroResult.offset || params.offset || 0,
        limit: hiroResult.limit || params.limit || 20,
      } as RuneActivitiesResponse;
    } catch {
      // Hiro failed, fall back to Magic Eden
    }

    const { rune, ...query } = params;
    const encodedRune = encodeURIComponent(rune);
    const qs = this.buildQueryString(query);
    return this.fetchApi<RuneActivitiesResponse>(
      `/v2/ord/btc/runes/activities/${encodedRune}${qs}`,
      { cacheTtl: CONFIG.CACHE_TTL_MARKET }
    );
  }

  /**
   * Get rune activities by wallet address
   * Hiro primary, Magic Eden fallback
   */
  async getWalletRuneActivities(
    params: RuneWalletActivitiesParams
  ): Promise<RuneWalletActivitiesResponse> {
    // Try Hiro first (filter by address)
    if (params.rune) {
      try {
        const hiroResult = await hiroRunesApi.getActivity(params.rune, {
          limit: params.limit,
          offset: params.offset,
          address: params.address,
        });
        return {
          activities: (hiroResult.results || []).map((a: any) => ({
            id: a.tx_id || '',
            type: a.operation || 'transfer',
            rune: params.rune!,
            from: a.sender,
            to: a.receiver,
            amount: a.amount,
            txId: a.tx_id,
            blockHeight: a.block_height,
            timestamp: a.timestamp ? new Date(a.timestamp * 1000).toISOString() : undefined,
          })),
          total: hiroResult.total || 0,
          offset: hiroResult.offset || params.offset || 0,
          limit: hiroResult.limit || params.limit || 20,
        } as RuneWalletActivitiesResponse;
      } catch {
        // Hiro failed, fall back to Magic Eden
      }
    }

    const { address, ...query } = params;
    const encodedAddress = encodeURIComponent(address);
    const qs = this.buildQueryString(query);
    return this.fetchApi<RuneWalletActivitiesResponse>(
      `/v2/ord/btc/runes/wallet/activities/${encodedAddress}${qs}`
    );
  }

  /**
   * Get rune balances for a wallet
   * Hiro primary, Magic Eden fallback
   */
  async getWalletRuneBalances(
    params: RuneWalletBalancesParams
  ): Promise<RuneWalletBalance> {
    // Try Hiro first
    try {
      const balance = await hiroRunesApi.getBalance(params.address, params.rune);
      if (balance) {
        return {
          rune: balance.rune_id || params.rune,
          runeName: balance.name,
          symbol: balance.symbol,
          amount: balance.balance || '0',
          address: params.address,
          divisibility: balance.divisibility,
        } as RuneWalletBalance;
      }
    } catch {
      // Hiro failed, fall back to Magic Eden
    }

    const encodedAddress = encodeURIComponent(params.address);
    const encodedRune = encodeURIComponent(params.rune);
    return this.fetchApi<RuneWalletBalance>(
      `/v2/ord/btc/runes/wallet/balances/${encodedAddress}/${encodedRune}`
    );
  }

  /**
   * Get rune collection statistics
   * Hiro primary, Magic Eden fallback
   */
  async getRuneCollectionStats(
    params: RuneCollectionStatsParams = {}
  ): Promise<RuneCollectionStatsResponse> {
    // Try Hiro first
    try {
      const hiroResult = await hiroRunesApi.getEtchings({
        limit: params.limit,
        offset: params.offset,
      });
      return {
        runes: (hiroResult.results || []).map((etching: any) => ({
          rune: etching.rune_id || etching.name,
          runeName: etching.name,
          symbol: etching.symbol,
          totalSupply: etching.total_supply,
        })),
        total: hiroResult.total || 0,
        offset: hiroResult.offset || params.offset || 0,
        limit: hiroResult.limit || params.limit || 20,
      } as RuneCollectionStatsResponse;
    } catch {
      // Hiro failed, fall back to Magic Eden
    }

    const qs = this.buildQueryString(params);
    return this.fetchApi<RuneCollectionStatsResponse>(
      `/v2/ord/btc/runes/collection_stats/search${qs}`,
      { cacheTtl: CONFIG.CACHE_TTL_MARKET }
    );
  }

  // ==========================================================================
  // 2. Runes Listing Endpoints (4 POST endpoints)
  // ==========================================================================

  /**
   * POST /v2/ord/btc/runes/psbt/order-create
   * Get unsigned PSBT for creating a rune sell order
   */
  async createOrderPsbt(
    request: CreateOrderPsbtRequest
  ): Promise<CreateOrderPsbtResponse> {
    return this.fetchApi<CreateOrderPsbtResponse>(
      '/v2/ord/btc/runes/psbt/order-create',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  /**
   * POST /v2/ord/btc/runes/order-create
   * Submit signed PSBT for rune sell order
   */
  async submitOrder(request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
    return this.fetchApi<SubmitOrderResponse>(
      '/v2/ord/btc/runes/order-create',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  /**
   * POST /v2/ord/btc/runes/psbt/order-cancel
   * Get unsigned message to cancel an order
   */
  async cancelOrderPsbt(
    request: CancelOrderPsbtRequest
  ): Promise<CancelOrderPsbtResponse> {
    return this.fetchApi<CancelOrderPsbtResponse>(
      '/v2/ord/btc/runes/psbt/order-cancel',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  /**
   * POST /v2/ord/btc/runes/order-cancel
   * Submit signed message to cancel an order
   */
  async cancelOrder(
    request: CancelOrderRequest
  ): Promise<CancelOrderResponse> {
    return this.fetchApi<CancelOrderResponse>(
      '/v2/ord/btc/runes/order-cancel',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  // ==========================================================================
  // 3. Runes Sweeping Endpoints (2 POST endpoints)
  // ==========================================================================

  /**
   * POST /v2/ord/btc/runes/psbt/get-sweeping
   * Get unsigned PSBT for buying (sweeping) runes
   */
  async getSweepingPsbt(
    request: SweepingPsbtRequest
  ): Promise<SweepingPsbtResponse> {
    return this.fetchApi<SweepingPsbtResponse>(
      '/v2/ord/btc/runes/psbt/get-sweeping',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  /**
   * POST /v2/ord/btc/runes/sweeping
   * Submit signed PSBT for buying (sweeping) runes
   */
  async submitSweeping(
    request: SubmitSweepingRequest
  ): Promise<SubmitSweepingResponse> {
    return this.fetchApi<SubmitSweepingResponse>(
      '/v2/ord/btc/runes/sweeping',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  // ==========================================================================
  // 4. Runes Market Sell Endpoints (2 POST endpoints)
  // ==========================================================================

  /**
   * POST /v2/ord/btc/runes/psbt/get-market-sell
   * Get unsigned PSBT for market selling runes
   */
  async getMarketSellPsbt(
    request: MarketSellPsbtRequest
  ): Promise<MarketSellPsbtResponse> {
    return this.fetchApi<MarketSellPsbtResponse>(
      '/v2/ord/btc/runes/psbt/get-market-sell',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  /**
   * POST /v2/ord/btc/runes/market-sell
   * Submit signed PSBT for market selling runes
   */
  async submitMarketSell(
    request: SubmitMarketSellRequest
  ): Promise<SubmitMarketSellResponse> {
    return this.fetchApi<SubmitMarketSellResponse>(
      '/v2/ord/btc/runes/market-sell',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  // ==========================================================================
  // 5. Runes Swap Endpoints (3 endpoints)
  // ==========================================================================

  /**
   * GET /v2/ord/btc/runes/quote
   * Get available rune quotes for swapping
   */
  async getSwapQuote(
    params: RuneSwapQuoteParams
  ): Promise<RuneSwapQuoteResponse> {
    const qs = this.buildQueryString(params);
    return this.fetchApi<RuneSwapQuoteResponse>(
      `/v2/ord/btc/runes/quote${qs}`,
      { cacheTtl: 10_000 } // Quotes expire quickly
    );
  }

  /**
   * POST /v2/ord/btc/runes/psbt/swap
   * Get unsigned PSBT for rune swap
   */
  async getSwapPsbt(request: SwapPsbtRequest): Promise<SwapPsbtResponse> {
    return this.fetchApi<SwapPsbtResponse>(
      '/v2/ord/btc/runes/psbt/swap',
      { method: 'POST', body: request, skipCache: true }
    );
  }

  /**
   * POST /v2/ord/btc/runes/swap
   * Submit signed PSBT for rune swap
   */
  async submitSwap(request: SubmitSwapRequest): Promise<SubmitSwapResponse> {
    return this.fetchApi<SubmitSwapResponse>(
      '/v2/ord/btc/runes/swap',
      { method: 'POST', body: request, skipCache: true }
    );
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const magicEdenRunesService = new MagicEdenRunesService();
