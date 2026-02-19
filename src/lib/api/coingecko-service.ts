/**
 * Centralized CoinGecko API Service
 * Handles rate limiting, caching, retry with exponential backoff
 * Prevents 429 rate limit errors across the application
 */

import { logger } from '@/lib/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestQueueItem {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  fn: () => Promise<any>;
  endpoint: string;
  retryCount: number;
}

class CoinGeckoService {
  private cache = new Map<string, CacheEntry<any>>();
  private requestQueue: RequestQueueItem[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;

  // Rate limiting configuration for free tier
  private readonly MIN_REQUEST_INTERVAL = 800; // 800ms between requests (CoinGecko allows ~30/min)
  private readonly MAX_REQUESTS_PER_MINUTE = 25; // Free tier allows ~30, leave headroom
  private readonly CACHE_TTL = 60000; // 60 seconds cache (reduces total requests)
  private readonly MAX_RETRIES = 2; // Fail faster to avoid cascading timeouts
  private readonly BASE_BACKOFF = 1000; // 1 second base backoff

  private requestTimestamps: number[] = [];

  constructor() {
    logger.info('🦎 CoinGecko Service initialized with rate limiting');
  }

  /**
   * Check if we can make a request without hitting rate limits
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    // Clean old timestamps (older than 1 minute)
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );

    // Check if we're within rate limit
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    // Check minimum interval between requests
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      return false;
    }

    return true;
  }

  /**
   * Wait for next available request slot
   */
  private async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const waitTime = Math.max(
        this.MIN_REQUEST_INTERVAL - timeSinceLastRequest,
        100
      );

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get data from cache if available and not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug(`Cache hit for ${key}`);
    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(retryCount: number): number {
    const delay = this.BASE_BACKOFF * Math.pow(2, retryCount);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, 60000); // Max 60 seconds
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    url: string,
    retryCount: number = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CYPHER-ORDi-Future/3.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle rate limit (429)
      if (response.status === 429) {
        if (retryCount >= this.MAX_RETRIES) {
          throw new Error('Rate limit exceeded - max retries reached');
        }

        const retryAfter = response.headers.get('Retry-After');
        const backoffDelay = retryAfter
          ? parseInt(retryAfter) * 1000
          : this.getBackoffDelay(retryCount);

        logger.warn(
          `Rate limit hit (429) - retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`
        );

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest<T>(url, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      // Record successful request
      this.lastRequestTime = Date.now();
      this.requestTimestamps.push(this.lastRequestTime);

      return data;
    } catch (error) {
      // Retry on network errors (but not on 4xx errors except 429)
      if (
        retryCount < this.MAX_RETRIES &&
        (error instanceof TypeError || (error as any).name === 'AbortError')
      ) {
        const backoffDelay = this.getBackoffDelay(retryCount);
        logger.warn(
          `Network error - retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`
        );

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest<T>(url, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift()!;

      try {
        await this.waitForSlot();
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Queue a request for processing
   */
  private queueRequest<T>(
    fn: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        fn,
        endpoint,
        retryCount: 0
      });

      this.processQueue();
    });
  }

  /**
   * Generic API call with caching and rate limiting
   */
  private async apiCall<T>(
    endpoint: string,
    params: Record<string, string> = {},
    cacheTTL: number = this.CACHE_TTL
  ): Promise<T> {
    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.coingecko.com/api/v3${endpoint}${queryString ? `?${queryString}` : ''}`;
    const cacheKey = `${endpoint}:${queryString}`;

    // Try cache first
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Queue the request
    const data = await this.queueRequest<T>(
      () => this.makeRequest<T>(url),
      endpoint
    );

    // Cache the result
    this.setCache(cacheKey, data, cacheTTL);

    return data;
  }

  /**
   * Get simple price for multiple coins
   */
  async getSimplePrice(
    ids: string[],
    vsCurrencies: string[] = ['usd'],
    options: {
      include24hrChange?: boolean;
      include24hrVol?: boolean;
      includeMarketCap?: boolean;
    } = {}
  ): Promise<Record<string, any>> {
    const params: Record<string, string> = {
      ids: ids.join(','),
      vs_currencies: vsCurrencies.join(','),
    };

    if (options.include24hrChange) params.include_24hr_change = 'true';
    if (options.include24hrVol) params.include_24hr_vol = 'true';
    if (options.includeMarketCap) params.include_market_cap = 'true';

    return this.apiCall('/simple/price', params);
  }

  /**
   * Get Bitcoin price (most commonly used)
   */
  async getBitcoinPrice(): Promise<{
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
  }> {
    try {
      const data = await this.getSimplePrice(
        ['bitcoin'],
        ['usd'],
        {
          include24hrChange: true,
          include24hrVol: true,
          includeMarketCap: true
        }
      );

      const btc = data.bitcoin;
      return {
        price: btc.usd,
        change24h: btc.usd_24h_change,
        volume24h: btc.usd_24h_vol,
        marketCap: btc.usd_market_cap,
      };
    } catch (error) {
      logger.error('Failed to get Bitcoin price', error);
      // Return fallback data
      return {
        price: 98750,
        change24h: 2.5,
        volume24h: 45000000000,
        marketCap: 1920000000000,
      };
    }
  }

  /**
   * Get coins market data
   */
  async getCoinsMarkets(
    vsCurrency: string = 'usd',
    options: {
      perPage?: number;
      page?: number;
      ids?: string[];
    } = {}
  ): Promise<any[]> {
    const params: Record<string, string> = {
      vs_currency: vsCurrency,
      order: 'market_cap_desc',
      per_page: (options.perPage || 20).toString(),
      page: (options.page || 1).toString(),
      sparkline: 'false',
    };

    if (options.ids && options.ids.length > 0) {
      params.ids = options.ids.join(',');
    }

    return this.apiCall('/coins/markets', params, 60000); // 1 minute cache
  }

  /**
   * Get global market data
   */
  async getGlobal(): Promise<any> {
    return this.apiCall('/global', {}, 60000); // 1 minute cache
  }

  /**
   * Get market chart for a coin
   */
  async getMarketChart(
    coinId: string = 'bitcoin',
    vsCurrency: string = 'usd',
    days: number = 7
  ): Promise<any> {
    return this.apiCall(
      `/coins/${coinId}/market_chart`,
      {
        vs_currency: vsCurrency,
        days: days.toString(),
      },
      300000 // 5 minutes cache for charts
    );
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('CoinGecko cache cleared');
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      queueLength: this.requestQueue.length,
      recentRequests: this.requestTimestamps.length,
      isProcessing: this.isProcessing,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

// Export singleton instance
export const coinGeckoService = new CoinGeckoService();
export default coinGeckoService;
