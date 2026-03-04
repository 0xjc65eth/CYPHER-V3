/**
 * APIService - Centralized API service with retry logic, caching, and error handling
 */

import { safe } from '../utils/SafeDataAccess';

interface RequestOptions extends Omit<RequestInit, 'cache'> {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  cache?: boolean;
  cacheTime?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class APIServiceClass {
  private cache: Map<string, CacheEntry> = new Map();
  private ongoingRequests: Map<string, Promise<any>> = new Map();
  private defaultOptions: RequestOptions = {
    retries: 3,
    retryDelay: 1000,
    timeout: 30000,
    cache: true,
    cacheTime: 60000, // 1 minute default cache
  };

  /**
   * Make a GET request with retry logic and caching
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request with retry logic
   */
  async post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a PUT request with retry logic
   */
  async put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a DELETE request with retry logic
   */
  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Core request method with retry logic and caching
   */
  private async request<T>(url: string, options?: RequestOptions): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    const cacheKey = this.getCacheKey(url, config);

    // Check cache first for GET requests
    if (config.method === 'GET' && config.cache) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Check if there's already an ongoing request for this URL
      const ongoing = this.ongoingRequests.get(cacheKey);
      if (ongoing) {
        return ongoing;
      }
    }

    // Create the request promise
    const requestPromise = this.executeRequest<T>(url, config);

    // Store ongoing request to prevent duplicate requests
    if (config.method === 'GET') {
      this.ongoingRequests.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;
      
      // Cache successful GET requests
      if (config.method === 'GET' && config.cache) {
        this.setCache(cacheKey, result, config.cacheTime!);
      }

      return result;
    } finally {
      // Clean up ongoing request
      this.ongoingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(url: string, config: RequestOptions): Promise<T> {
    let lastError: Error | null = null;
    const maxRetries = config.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
          ...config as RequestInit,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.message && error.message.includes('status: 4')) {
          throw error;
        }

        // Log retry attempt
        if (attempt < maxRetries) {
          console.warn(
            `Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
            url,
            error.message
          );
          
          // Wait before retry with exponential backoff
          const delay = config.retryDelay! * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Request failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any, cacheTime: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + cacheTime,
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(url: string, config: RequestOptions): string {
    const method = config.method || 'GET';
    const body = config.body || '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific URL pattern
   */
  clearCacheForPattern(pattern: string | RegExp): void {
    const entries = Array.from(this.cache.keys());
    
    for (const key of entries) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const APIService = new APIServiceClass();

// Helper function for safe API calls with error handling
export async function safeAPICall<T>(
  apiCall: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error(errorMessage || 'API call failed:', error);
    return fallback;
  }
}

// Bitcoin-specific API helpers
export const BitcoinAPI = {
  async getPrice(): Promise<number> {
    try {
      const data = await APIService.get('/api/bitcoin-price', {
        cacheTime: 30000, // 30 seconds cache for price
      });
      return safe.number(safe.get(data, 'price'), 0);
    } catch (error) {
      console.error('Failed to fetch Bitcoin price:', error);
      return 0;
    }
  },

  async getMarketData(): Promise<any> {
    return safeAPICall(
      () => APIService.get('/api/market-data'),
      { price: 0, change24h: 0, volume: 0 },
      'Failed to fetch market data'
    );
  },

  async getHistoricalData(days: number = 7): Promise<any[]> {
    return safeAPICall(
      () => APIService.get(`/api/historical?days=${days}`),
      [],
      'Failed to fetch historical data'
    );
  },
};

// Ordinals-specific API helpers
export const OrdinalsAPI = {
  async getCollections(): Promise<any[]> {
    return safeAPICall(
      () => APIService.get('/api/ordinals/collections'),
      [],
      'Failed to fetch Ordinals collections'
    );
  },

  async getInscription(id: string): Promise<any> {
    return safeAPICall(
      () => APIService.get(`/api/ordinals/inscription/${id}`),
      null,
      `Failed to fetch inscription ${id}`
    );
  },
};

// Mining-specific API helpers
export const MiningAPI = {
  async getStats(): Promise<any> {
    return safeAPICall(
      () => APIService.get('/api/mining/stats'),
      { hashrate: 0, difficulty: 0, blockHeight: 0 },
      'Failed to fetch mining stats'
    );
  },

  async getPools(): Promise<any[]> {
    return safeAPICall(
      () => APIService.get('/api/mining/pools'),
      [],
      'Failed to fetch mining pools'
    );
  },
};