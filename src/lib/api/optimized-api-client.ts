/**
 * 🚀 Optimized API Client
 * High-performance API client with intelligent caching, request deduplication, and error handling
 */

import { performanceCaches, withCache, createCacheKey } from '../cache/performance-cache';
import { requestDeduplicator } from './request-deduplicator';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  cacheTags?: string[];
  cacheDependencies?: string[];
  deduplicationKey?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface APIResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  cached: boolean;
  responseTime: number;
  fromCache: boolean;
}

class OptimizedAPIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(baseURL: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const startTime = performance.now();
    
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      retries = 3,
      retryDelay = 1000,
      cache = method === 'GET',
      cacheTTL = 180000, // 3 minutes
      cacheKey,
      cacheTags = [],
      cacheDependencies = [],
      deduplicationKey,
      priority = 'normal'
    } = options;

    const url = this.buildURL(endpoint);
    const finalCacheKey = cacheKey || this.generateCacheKey(method, url, body);
    const dedupKey = deduplicationKey || finalCacheKey;

    // Check cache first for GET requests
    if (cache && method === 'GET') {
      const cached = await performanceCaches.api.get(finalCacheKey);
      if (cached) {
        const responseTime = performance.now() - startTime;
        return {
          data: cached,
          status: 200,
          headers: new Headers(),
          cached: true,
          responseTime,
          fromCache: true
        };
      }
    }

    // Use request deduplication for concurrent identical requests
    if (this.requestQueue.has(dedupKey)) {
      const cachedResponse = await this.requestQueue.get(dedupKey);
      return {
        ...cachedResponse,
        responseTime: performance.now() - startTime,
        fromCache: false
      };
    }

    // Check rate limiting
    if (this.isRateLimited(url)) {
      throw new Error(`Rate limit exceeded for ${url}`);
    }

    // Create the actual request
    const requestPromise = this.executeRequest<T>(
      url,
      method,
      { ...this.defaultHeaders, ...headers },
      body,
      timeout,
      retries,
      retryDelay
    );

    this.requestQueue.set(dedupKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Cache successful GET responses
      if (cache && method === 'GET' && response.status >= 200 && response.status < 300) {
        await performanceCaches.api.set(finalCacheKey, response.data, {
          ttl: cacheTTL,
          tags: cacheTags,
          dependencies: cacheDependencies,
          priority
        });
      }

      const responseTime = performance.now() - startTime;
      
      return {
        ...response,
        responseTime,
        fromCache: false,
        cached: cache
      };
    } finally {
      // Clean up request queue
      this.requestQueue.delete(dedupKey);
    }
  }

  // Convenient method wrappers
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  async put<T = any>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Batch requests for better performance
  async batch<T = any>(
    requests: Array<{ 
      endpoint: string; 
      options?: RequestOptions;
      key?: string;
    }>
  ): Promise<Record<string, APIResponse<T>>> {
    const promises = requests.map(async ({ endpoint, options, key }) => {
      const response = await this.request<T>(endpoint, options);
      return { key: key || endpoint, response };
    });

    const responses = await Promise.allSettled(promises);
    const result: Record<string, APIResponse<T>> = {};

    responses.forEach((response, index) => {
      const requestKey = requests[index].key || requests[index].endpoint;
      
      if (response.status === 'fulfilled') {
        result[requestKey] = response.value.response;
      } else {
        // Handle failed requests
        result[requestKey] = {
          data: null as any,
          status: 500,
          headers: new Headers(),
          cached: false,
          responseTime: 0,
          fromCache: false
        };
      }
    });

    return result;
  }

  // Stream data for real-time updates
  async stream<T = any>(
    endpoint: string,
    callback: (data: T) => void,
    options: RequestOptions = {}
  ): Promise<() => void> {
    const url = this.buildURL(endpoint);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Stream parsing error:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  // WebSocket connection for real-time data
  connectWebSocket(
    endpoint: string,
    callbacks: {
      onMessage?: (data: any) => void;
      onOpen?: () => void;
      onClose?: () => void;
      onError?: (error: Event) => void;
    }
  ): WebSocket {
    const wsURL = this.buildURL(endpoint).replace(/^http/, 'ws');
    const ws = new WebSocket(wsURL);

    ws.onopen = () => {
      callbacks.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onMessage?.(data);
      } catch (error) {
        console.error('WebSocket parsing error:', error);
      }
    };

    ws.onclose = () => {
      callbacks.onClose?.();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      callbacks.onError?.(error);
    };

    return ws;
  }

  // Cache management
  async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      // Invalidate specific pattern
      await performanceCaches.api.invalidateByTag(pattern);
    } else {
      // Clear entire API cache
      await performanceCaches.api.clear();
    }
  }

  async warmCache(endpoints: Array<{ endpoint: string; options?: RequestOptions }>): Promise<void> {
    
    await Promise.all(
      endpoints.map(async ({ endpoint, options }) => {
        try {
          await this.get(endpoint, options);
        } catch (error) {
          console.error(`Cache warming failed for ${endpoint}:`, error);
        }
      })
    );
  }

  // Performance monitoring
  getMetrics(): any {
    return {
      api: performanceCaches.api.getMetrics(),
      queueSize: this.requestQueue.size,
      rateLimits: Array.from(this.rateLimiter.entries())
    };
  }

  private async executeRequest<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    timeout: number,
    retries: number,
    retryDelay: number
  ): Promise<{ data: T; status: number; headers: Headers }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        // Update rate limiting
        this.updateRateLimit(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        let data: T;

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text() as any;
        }

        return {
          data,
          status: response.status,
          headers: response.headers
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error('Request failed after all retries');
  }

  private buildURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const base = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${base}${path}`;
  }

  private generateCacheKey(method: string, url: string, body?: any): string {
    const bodyHash = body ? btoa(JSON.stringify(body)).slice(0, 8) : '';
    return createCacheKey('api', method.toLowerCase(), url, bodyHash);
  }

  private isRateLimited(url: string): boolean {
    const limit = this.rateLimiter.get(url);
    if (!limit) return false;

    const now = Date.now();
    if (now > limit.resetTime) {
      this.rateLimiter.delete(url);
      return false;
    }

    return limit.count > 100; // 100 requests per minute
  }

  private updateRateLimit(url: string): void {
    const now = Date.now();
    const minuteFromNow = now + 60000;

    const existing = this.rateLimiter.get(url);
    if (existing && now < existing.resetTime) {
      existing.count++;
    } else {
      this.rateLimiter.set(url, { count: 1, resetTime: minuteFromNow });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create optimized API client instances
export const apiClient = new OptimizedAPIClient(process.env.NEXT_PUBLIC_API_BASE_URL || '');

// Specialized clients for different services
export const coinGeckoClient = new OptimizedAPIClient('https://api.coingecko.com/api/v3', {
  'User-Agent': 'CYPHER-ORDI-APP/3.0'
});

export const binanceClient = new OptimizedAPIClient('https://api.binance.com/api/v3', {
  'User-Agent': 'CYPHER-ORDI-APP/3.0'
});

export const mempoolClient = new OptimizedAPIClient('https://mempool.space/api', {
  'User-Agent': 'CYPHER-ORDI-APP/3.0'
});

// API hooks for React components
export function useOptimizedAPI() {
  return {
    client: apiClient,
    coinGecko: coinGeckoClient,
    binance: binanceClient,
    mempool: mempoolClient,
    
    // Helper functions
    async getMarketData(symbol: string) {
      return coinGeckoClient.get(`/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true`, {
        cacheTTL: 30000, // 30 seconds
        cacheTags: ['market', symbol]
      });
    },

    async getBitcoinPrice() {
      return coinGeckoClient.get('/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
        cacheTTL: 10000, // 10 seconds
        cacheTags: ['prices', 'bitcoin']
      });
    },

    async getMempoolStats() {
      return mempoolClient.get('/mempool', {
        cacheTTL: 60000, // 1 minute
        cacheTags: ['mempool', 'bitcoin']
      });
    }
  };
}

export default OptimizedAPIClient;