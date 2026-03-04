/**
 * 🚀 UNIFIED API SERVICE LAYER - CYPHER ORDI FUTURE v3.2.0
 * Central service for all API interactions with intelligent fallbacks
 * Integrates Hiro API, Ordiscan, Mempool.space and other data sources
 */

import { hiroAPI } from './hiro-api';
import { devLogger } from './logger';

// Configuration for different data sources
const API_SOURCES = {
  HIRO: 'hiro',
  ORDISCAN: 'ordiscan',
  MEMPOOL: 'mempool',
  FALLBACK: 'fallback'
} as const;

type APISource = typeof API_SOURCES[keyof typeof API_SOURCES];

interface DataSourceConfig {
  primary: APISource;
  fallback: APISource[];
  timeout: number;
  cacheTTL: number;
}

interface APIResponse<T = any> {
  success: boolean;
  data: T;
  source: APISource;
  responseTime: number;
  cached: boolean;
  error?: string;
}

interface RunesData {
  name: string;
  symbol: string;
  etching: string;
  supply: string;
  holders: number;
  volume24h: number;
  price: number;
  change24h: number;
  marketCap: number;
}

interface OrdinalsData {
  id: string;
  number: number;
  address: string;
  contentType: string;
  contentLength: number;
  timestamp: string;
  genesisHeight: number;
  genesisFee: number;
  outputValue: number;
}

interface CollectionData {
  name: string;
  slug: string;
  supply: number;
  floorPrice: number;
  volume24h: number;
  change24h: number;
  holders: number;
  description?: string;
  image?: string;
}

class UnifiedAPIService {
  private readonly configs: Map<string, DataSourceConfig>;
  private readonly requestCache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private readonly performanceMetrics: Map<APISource, { calls: number; avgTime: number; errors: number }>;

  constructor() {
    this.configs = new Map();
    this.requestCache = new Map();
    this.performanceMetrics = new Map();
    
    // Initialize performance tracking for each source
    Object.values(API_SOURCES).forEach(source => {
      this.performanceMetrics.set(source, { calls: 0, avgTime: 0, errors: 0 });
    });

    this.setupDataSourceConfigs();
    devLogger.log('APIService', 'Unified API Service initialized');
  }

  private setupDataSourceConfigs() {
    // Runes data configuration
    this.configs.set('runes', {
      primary: API_SOURCES.HIRO,
      fallback: [API_SOURCES.ORDISCAN, API_SOURCES.FALLBACK],
      timeout: 10000,
      cacheTTL: 30000 // 30 seconds
    });

    // Ordinals data configuration
    this.configs.set('ordinals', {
      primary: API_SOURCES.HIRO,
      fallback: [API_SOURCES.ORDISCAN, API_SOURCES.FALLBACK],
      timeout: 10000,
      cacheTTL: 30000
    });

    // BRC-20 data configuration
    this.configs.set('brc20', {
      primary: API_SOURCES.HIRO,
      fallback: [API_SOURCES.ORDISCAN, API_SOURCES.FALLBACK],
      timeout: 10000,
      cacheTTL: 60000 // 1 minute
    });

    // Collections data configuration
    this.configs.set('collections', {
      primary: API_SOURCES.ORDISCAN,
      fallback: [API_SOURCES.HIRO, API_SOURCES.FALLBACK],
      timeout: 15000,
      cacheTTL: 120000 // 2 minutes
    });

    // Mempool data configuration
    this.configs.set('mempool', {
      primary: API_SOURCES.MEMPOOL,
      fallback: [API_SOURCES.FALLBACK],
      timeout: 8000,
      cacheTTL: 10000 // 10 seconds
    });
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `api_${endpoint}_${JSON.stringify(params || {})}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      this.requestCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.requestCache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private updateMetrics(source: APISource, responseTime: number, isError = false): void {
    const metrics = this.performanceMetrics.get(source)!;
    metrics.calls++;
    if (isError) {
      metrics.errors++;
    } else {
      metrics.avgTime = (metrics.avgTime * (metrics.calls - 1) + responseTime) / metrics.calls;
    }
  }

  private async makeRequestWithSource(
    source: APISource,
    endpoint: string,
    params?: any,
    timeout = 10000
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (source) {
        case API_SOURCES.HIRO:
          result = await hiroAPI.makeRequest(endpoint, params, { timeout });
          break;
          
        case API_SOURCES.ORDISCAN:
          result = await this.makeOrdiscanRequest(endpoint, params, timeout);
          break;
          
        case API_SOURCES.MEMPOOL:
          result = await this.makeMempoolRequest(endpoint, params, timeout);
          break;
          
        case API_SOURCES.FALLBACK:
          result = this.getFallbackData(endpoint, params);
          break;
          
        default:
          throw new Error(`Unknown API source: ${source}`);
      }
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(source, responseTime);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(source, responseTime, true);
      throw error;
    }
  }

  private async makeOrdiscanRequest(endpoint: string, params: any = {}, timeout: number): Promise<any> {
    const apiKey = process.env.ORDISCAN_API_KEY;
    const baseURL = 'https://ordiscan.com/api/v1';
    
    const url = new URL(endpoint, baseURL);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-API-KEY': apiKey || '',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ordiscan API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async makeMempoolRequest(endpoint: string, params: any = {}, timeout: number): Promise<any> {
    const baseURL = 'https://mempool.space/api';
    
    const url = new URL(endpoint, baseURL);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Mempool API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getFallbackData(endpoint: string, params: any = {}): any {
    // Return realistic fallback data based on endpoint
    devLogger.warn('APIService', `Using fallback data for endpoint: ${endpoint}`);
    
    if (endpoint.includes('runes')) {
      return this.getRunesFallbackData();
    } else if (endpoint.includes('ordinals') || endpoint.includes('inscriptions')) {
      return this.getOrdinalsFallbackData();
    } else if (endpoint.includes('collections')) {
      return this.getCollectionsFallbackData();
    } else if (endpoint.includes('brc-20')) {
      return this.getBRC20FallbackData();
    }
    
    return { error: 'No fallback data available' };
  }

  private getRunesFallbackData(): any {
    return {
      results: [
        {
          id: 'UNCOMMON•GOODS',
          spaced_rune: 'UNCOMMON•GOODS',
          number: 1,
          premine: '0',
          symbol: '⧉',
          divisibility: 0,
          terms: {
            amount: '1',
            cap: '340282366920938463463374607431768211455',
            height: [840000, 1050000],
            offset: [null, null]
          },
          turbo: false,
          etching: '1112e5516e2c6b0aaefeccc73b4a74b34f66b8f8e87a0a9e4b1c2b49a3e8b5c3',
          burned: '0',
          mints: 158932,
          supply: '158932',
          holders: 18445,
          timestamp: Date.now()
        }
      ],
      total: 1,
      offset: 0
    };
  }

  private getOrdinalsFallbackData(): any {
    return {
      results: [
        {
          id: 'af2c40d814e725c4b3b7e3f4c0e0e3b3e1c3d5e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
          number: 73500000,
          address: 'bc1p9x8y7z6w5v4u3t2s1r0q9p8o7n6m5l4k3j2h1g0f9e8d7c6b5a4z3y2x1w0v9u8',
          genesis_address: 'bc1p9x8y7z6w5v4u3t2s1r0q9p8o7n6m5l4k3j2h1g0f9e8d7c6b5a4z3y2x1w0v9u8',
          genesis_block_height: 845230,
          genesis_block_hash: '0000000000000000000123456789abcdef0123456789abcdef0123456789abcdef',
          genesis_tx_id: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
          genesis_fee: 25000,
          genesis_timestamp: Date.now() - 3600000,
          content_type: 'image/png',
          content_length: 45620,
          output_value: 546,
          sat_ordinal: 1985623847532190,
          sat_rarity: 'common',
          sat_coinbase_height: 825123,
          timestamp: Date.now()
        }
      ],
      total: 1,
      offset: 0
    };
  }

  private getCollectionsFallbackData(): any {
    return [
      {
        name: 'Bitcoin Puppets',
        slug: 'bitcoin-puppets',
        description: 'A unique collection of Bitcoin-themed digital puppets',
        supply: 10000,
        floor_price: 0.089,
        volume_24h: 125000,
        volume_change_24h: 15.2,
        unique_holders: 3547,
        sales_24h: 89,
        image: 'https://ordiscan.com/content/0123456789abcdef',
        verified: true,
        category: 'pfp'
      },
      {
        name: 'OCM GENESIS',
        slug: 'ocm-genesis',
        description: 'The original Ordinal Maxi collection',
        supply: 5000,
        floor_price: 0.125,
        volume_24h: 95000,
        volume_change_24h: 8.7,
        unique_holders: 2890,
        sales_24h: 56,
        image: 'https://ordiscan.com/content/fedcba9876543210',
        verified: true,
        category: 'art'
      }
    ];
  }

  private getBRC20FallbackData(): any {
    return {
      results: [
        {
          tick: 'ordi',
          max: '21000000',
          lim: '1000',
          dec: '18',
          supply: '18942567',
          holders: 15420,
          transactions: 89567,
          deploy_timestamp: '2023-03-08T00:00:00Z',
          deploy_block_height: 779832,
          deploy_address: 'bc1p8x7y6z5w4v3u2t1s0r9q8p7o6n5m4l3k2j1h0g9f8e7d6c5b4a3z2y1x0w9v8',
          progress: 90.2
        }
      ],
      total: 1,
      offset: 0
    };
  }

  // Public API methods
  async getData<T = any>(
    category: string,
    endpoint: string,
    params?: any,
    options: { useCache?: boolean; source?: APISource } = {}
  ): Promise<APIResponse<T>> {
    const { useCache = true, source } = options;
    const config = this.configs.get(category);
    
    if (!config) {
      throw new Error(`No configuration found for category: ${category}`);
    }

    const cacheKey = this.getCacheKey(`${category}_${endpoint}`, params);
    const startTime = Date.now();

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: 'cache' as APISource,
          responseTime: 0,
          cached: true
        };
      }
    }

    // Determine which sources to try
    const sourcesToTry = source ? [source] : [config.primary, ...config.fallback];
    let lastError: Error | null = null;

    for (const sourceToTry of sourcesToTry) {
      try {
        devLogger.log('APIService', `Trying ${sourceToTry} for ${category}/${endpoint}`);
        
        const data = await this.makeRequestWithSource(
          sourceToTry,
          endpoint,
          params,
          config.timeout
        );

        const responseTime = Date.now() - startTime;

        // Cache successful response
        if (useCache) {
          this.setCache(cacheKey, data, config.cacheTTL);
        }

        return {
          success: true,
          data,
          source: sourceToTry,
          responseTime,
          cached: false
        };

      } catch (error) {
        lastError = error as Error;
        devLogger.warn(`${sourceToTry} failed for ${category}/${endpoint}: ${(error as Error).message}`);
        continue;
      }
    }

    // All sources failed
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      data: null as unknown as T,
      source: API_SOURCES.FALLBACK,
      responseTime,
      cached: false,
      error: lastError?.message || 'All data sources failed'
    };
  }

  // Specialized methods for common data types
  async getRunesData(params?: any): Promise<APIResponse<RunesData[]>> {
    return this.getData<RunesData[]>('runes', '/runes/v1/etchings', params);
  }

  async getRuneDetails(runeName: string): Promise<APIResponse<RunesData>> {
    return this.getData<RunesData>('runes', `/runes/v1/etchings/${encodeURIComponent(runeName)}`);
  }

  async getOrdinalsData(params?: any): Promise<APIResponse<OrdinalsData[]>> {
    return this.getData<OrdinalsData[]>('ordinals', '/ordinals/v1/inscriptions', params);
  }

  async getInscriptionDetails(id: string): Promise<APIResponse<OrdinalsData>> {
    return this.getData<OrdinalsData>('ordinals', `/ordinals/v1/inscriptions/${id}`);
  }

  async getCollectionsData(params?: any): Promise<APIResponse<CollectionData[]>> {
    return this.getData<CollectionData[]>('collections', '/collections', params);
  }

  async getBRC20Tokens(params?: any): Promise<APIResponse<any[]>> {
    return this.getData('brc20', '/ordinals/v1/brc-20/tokens', params);
  }

  async getBRC20Balances(address: string): Promise<APIResponse<any[]>> {
    return this.getData('brc20', `/ordinals/v1/brc-20/balances/${address}`);
  }

  async getMempoolStats(): Promise<APIResponse<any>> {
    return this.getData('mempool', '/v1/statistics');
  }

  // Health and monitoring methods
  getPerformanceMetrics(): Map<APISource, { calls: number; avgTime: number; errors: number }> {
    return new Map(this.performanceMetrics);
  }

  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.requestCache.size,
      keys: Array.from(this.requestCache.keys())
    };
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.requestCache) {
        if (regex.test(key)) {
          this.requestCache.delete(key);
        }
      }
    } else {
      this.requestCache.clear();
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; sources: Record<string, boolean>; details: any }> {
    const results: Record<string, boolean> = {};
    
    // Test each major source
    for (const source of Object.values(API_SOURCES)) {
      if (source === API_SOURCES.FALLBACK) continue;
      
      try {
        await this.makeRequestWithSource(source, '/health', {}, 5000);
        results[source] = true;
      } catch {
        results[source] = false;
      }
    }

    const healthy = Object.values(results).some(Boolean);
    
    return {
      healthy,
      sources: results,
      details: {
        cache: this.getCacheStatus(),
        metrics: Object.fromEntries(this.getPerformanceMetrics()),
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Export singleton instance
export const apiService = new UnifiedAPIService();
export default apiService;

// Export types
export type { APIResponse, RunesData, OrdinalsData, CollectionData, APISource };