/**
 * Rate-Limited Fetch for CoinGecko API
 *
 * Features:
 * - In-memory cache with TTL (5 minutes default)
 * - Request throttling (max 10 requests per minute for free tier)
 * - Automatic retry with exponential backoff
 * - Error handling and logging
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface RateLimitedFetchOptions {
  cacheTTL?: number; // milliseconds, default 5 minutes
  retries?: number; // number of retries, default 3
  retryDelay?: number; // milliseconds, default 1000
}

class CoinGeckoRateLimiter {
  private cache: Map<string, CacheEntry> = new Map();
  private requestQueue: number[] = [];
  private readonly maxRequestsPerMinute = 10; // CoinGecko free tier limit
  private readonly minuteInMs = 60000;

  /**
   * Check if we can make a request without hitting rate limit
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    // Remove requests older than 1 minute
    this.requestQueue = this.requestQueue.filter(time => now - time < this.minuteInMs);

    return this.requestQueue.length < this.maxRequestsPerMinute;
  }

  /**
   * Wait until we can make a request
   */
  private async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = this.minuteInMs - (Date.now() - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 1000)));
    }
  }

  /**
   * Record a request
   */
  private recordRequest(): void {
    this.requestQueue.push(Date.now());
  }

  /**
   * Get cached data if available and not expired
   */
  private getFromCache(url: string): any | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(url);
      return null;
    }

    // Cache hit - no verbose logging
    return entry.data;
  }

  /**
   * Store data in cache
   */
  private setCache(url: string, data: any, ttl: number): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * Perform rate-limited fetch with caching and retry
   */
  async fetch(
    url: string,
    options: RateLimitedFetchOptions = {}
  ): Promise<any> {
    const {
      cacheTTL = 300000, // 5 minutes default
      retries = 3,
      retryDelay = 1000
    } = options;

    // Check cache first
    const cached = this.getFromCache(url);
    if (cached !== null) {
      return cached;
    }

    // Clean expired cache entries periodically
    if (Math.random() < 0.1) {
      this.cleanCache();
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Wait for rate limit slot
        await this.waitForSlot();

        // Record the request
        this.recordRequest();


        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit hit - wait longer
            const waitTime = retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful response
        this.setCache(url, data, cacheTTL);

        return data;

      } catch (error) {
        lastError = error as Error;
        console.error(`[CoinGecko] Error on attempt ${attempt + 1}:`, error);

        if (attempt < retries) {
          const waitTime = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    console.error(`[CoinGecko] All ${retries + 1} attempts failed for ${url}`);
    throw lastError || new Error('Unknown error');
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      requestsInLastMinute: this.requestQueue.length
    };
  }
}

// Singleton instance
const rateLimiter = new CoinGeckoRateLimiter();

/**
 * Rate-limited fetch for CoinGecko API
 *
 * @param url - Full CoinGecko API URL
 * @param options - Cache TTL, retries, and retry delay options
 * @returns Promise with the API response data
 *
 * @example
 * const data = await rateLimitedFetch(
 *   'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
 * );
 */
export async function rateLimitedFetch(
  url: string,
  options?: RateLimitedFetchOptions
): Promise<any> {
  return rateLimiter.fetch(url, options);
}

/**
 * Clear the CoinGecko API cache
 */
export function clearCoinGeckoCache(): void {
  rateLimiter.clearCache();
}

/**
 * Get CoinGecko API cache statistics
 */
export function getCoinGeckoCacheStats() {
  return rateLimiter.getCacheStats();
}
