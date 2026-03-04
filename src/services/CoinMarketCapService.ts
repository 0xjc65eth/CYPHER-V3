/**
 * CoinMarketCap API Service
 * Provides comprehensive cryptocurrency market data including prices, market cap, trading volume, and more
 */

import { logger } from '@/lib/logger';
import { enhancedRateLimiter } from '@/lib/api/enhanced-rate-limiter';
import { priceCache, marketCache, EnhancedAPICache } from '@/lib/cache/enhanced-api-cache';

export interface CoinMarketCapConfig {
  apiKey: string;
  baseUrl?: string;
  version?: string;
  sandbox?: boolean;
}

export interface CryptocurrencyListing {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  num_market_pairs: number;
  date_added: string;
  tags: string[];
  max_supply: number | null;
  circulating_supply: number;
  total_supply: number;
  platform: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    token_address: string;
  } | null;
  cmc_rank: number;
  self_reported_circulating_supply: number | null;
  self_reported_market_cap: number | null;
  tvl_ratio: number | null;
  last_updated: string;
  quote: {
    [key: string]: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_60d: number;
      percent_change_90d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      tvl: number | null;
      last_updated: string;
    };
  };
}

export interface GlobalMetrics {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  total_exchanges: number;
  eth_dominance: number;
  btc_dominance: number;
  eth_dominance_yesterday: number;
  btc_dominance_yesterday: number;
  eth_dominance_24h_percentage_change: number;
  btc_dominance_24h_percentage_change: number;
  defi_volume_24h: number;
  defi_volume_24h_reported: number;
  defi_market_cap: number;
  defi_24h_percentage_change: number;
  stablecoin_volume_24h: number;
  stablecoin_volume_24h_reported: number;
  stablecoin_market_cap: number;
  stablecoin_24h_percentage_change: number;
  derivatives_volume_24h: number;
  derivatives_volume_24h_reported: number;
  derivatives_24h_percentage_change: number;
  quote: {
    [key: string]: {
      total_market_cap: number;
      total_volume_24h: number;
      total_volume_24h_reported: number;
      altcoin_volume_24h: number;
      altcoin_volume_24h_reported: number;
      altcoin_market_cap: number;
      defi_volume_24h: number;
      defi_volume_24h_reported: number;
      defi_24h_percentage_change: number;
      defi_market_cap: number;
      stablecoin_volume_24h: number;
      stablecoin_volume_24h_reported: number;
      stablecoin_24h_percentage_change: number;
      stablecoin_market_cap: number;
      derivatives_volume_24h: number;
      derivatives_volume_24h_reported: number;
      derivatives_24h_percentage_change: number;
      total_market_cap_yesterday: number;
      total_volume_24h_yesterday: number;
      total_market_cap_yesterday_percentage_change: number;
      total_volume_24h_yesterday_percentage_change: number;
      last_updated: string;
    };
  };
  last_updated: string;
}

export interface PriceConversionResult {
  symbol: string;
  id: string;
  name: string;
  amount: number;
  last_updated: string;
  quote: {
    [key: string]: {
      price: number;
      last_updated: string;
    };
  };
}

export interface HistoricalData {
  time_open: string;
  time_close: string;
  time_high: string;
  time_low: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap: number;
  timestamp: string;
}

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

export class CoinMarketCapService {
  private config: CoinMarketCapConfig;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 60000; // 1 minute
  private rateLimitCount = 0;
  private rateLimitResetTime = 0;
  private readonly rateLimitPerMinute = 10; // Conservative rate limiting

  constructor(config: CoinMarketCapConfig) {
    this.config = {
      baseUrl: 'https://pro-api.coinmarketcap.com',
      version: 'v1',
      sandbox: false,
      ...config,
    };
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset rate limit counter every minute
    if (now >= this.rateLimitResetTime) {
      this.rateLimitCount = 0;
      this.rateLimitResetTime = now + 60000; // Next minute
    }

    if (this.rateLimitCount >= this.rateLimitPerMinute) {
      logger.warn('CoinMarketCap rate limit reached');
      return false;
    }

    this.rateLimitCount++;
    return true;
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Cache data with TTL
   */
  private setCachedData(key: string, data: any, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Make API request with enhanced rate limiting and caching
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}, ttl = this.defaultTTL): Promise<T> {
    const cacheKey = EnhancedAPICache.createKey(`cmc${endpoint}`, params);
    
    // Determine appropriate cache based on endpoint
    const cache = endpoint.includes('quotes') ? priceCache : marketCache;
    
    // Check enhanced cache first
    const cachedData = cache.get<T>(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for CoinMarketCap ${endpoint}`);
      return cachedData;
    }

    // Check enhanced rate limiting for both daily and minute limits
    const dailyStatus = enhancedRateLimiter.checkLimit('coinmarketcap');
    const minuteStatus = enhancedRateLimiter.checkLimit('coinmarketcap-minute');
    
    if (!dailyStatus.allowed) {
      const waitTime = Math.ceil((dailyStatus.retryAfter || 0) / 1000);
      throw new Error(`CoinMarketCap daily rate limit exceeded. Retry after ${waitTime} seconds.`);
    }
    
    if (!minuteStatus.allowed) {
      const waitTime = Math.ceil((minuteStatus.retryAfter || 0) / 1000);
      throw new Error(`CoinMarketCap minute rate limit exceeded. Retry after ${waitTime} seconds.`);
    }

    // Record the request attempt
    const dailyRecorded = enhancedRateLimiter.recordRequest('coinmarketcap');
    const minuteRecorded = enhancedRateLimiter.recordRequest('coinmarketcap-minute');
    
    if (!dailyRecorded || !minuteRecorded) {
      throw new Error('Rate limit exceeded during request recording');
    }

    const url = new URL(`${this.config.baseUrl}/${this.config.version}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      logger.info(`Making CoinMarketCap API request: ${endpoint}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-CMC_PRO_API_KEY': this.config.apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'deflate, gzip',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`CoinMarketCap API HTTP error: ${response.status} - ${errorText}`);
        throw new Error(`CoinMarketCap API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.status?.error_code !== 0) {
        logger.error(`CoinMarketCap API status error:`, data.status);
        throw new Error(`CoinMarketCap API error: ${data.status?.error_message || 'Unknown error'}`);
      }

      // Cache successful response in enhanced cache
      cache.set(cacheKey, data.data, ttl, 'coinmarketcap');
      
      logger.info(`CoinMarketCap API request successful: ${endpoint}`);
      return data.data as T;
      
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'CoinMarketCap API request failed');
      throw error;
    }
  }

  /**
   * Get cryptocurrency listings with market data
   */
  async getCryptocurrencyListings(options: {
    start?: number;
    limit?: number;
    sort?: 'market_cap' | 'name' | 'symbol' | 'date_added' | 'market_cap_strict' | 'price' | 'circulating_supply' | 'total_supply' | 'max_supply' | 'num_market_pairs' | 'volume_24h' | 'percent_change_1h' | 'percent_change_24h' | 'percent_change_7d' | 'market_cap_by_total_supply_strict' | 'volume_7d' | 'volume_30d';
    sort_dir?: 'asc' | 'desc';
    cryptocurrency_type?: 'all' | 'coins' | 'tokens';
    tag?: string;
    convert?: string;
  } = {}): Promise<CryptocurrencyListing[]> {
    const params = {
      start: options.start || 1,
      limit: options.limit || 100,
      sort: options.sort || 'market_cap',
      sort_dir: options.sort_dir || 'desc',
      cryptocurrency_type: options.cryptocurrency_type || 'all',
      convert: options.convert || 'USD',
      ...(options.tag && { tag: options.tag }),
    };

    return this.makeRequest<CryptocurrencyListing[]>('/cryptocurrency/listings/latest', params, 300000); // 5 minutes cache
  }

  /**
   * Get specific cryptocurrency data by ID or symbol
   */
  async getCryptocurrencyQuotes(options: {
    id?: string;
    symbol?: string;
    slug?: string;
    convert?: string;
    aux?: string;
  }): Promise<{ [key: string]: CryptocurrencyListing }> {
    if (!options.id && !options.symbol && !options.slug) {
      throw new Error('Must provide either id, symbol, or slug');
    }

    const params = {
      convert: options.convert || 'USD',
      aux: options.aux || 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply',
      ...(options.id && { id: options.id }),
      ...(options.symbol && { symbol: options.symbol }),
      ...(options.slug && { slug: options.slug }),
    };

    return this.makeRequest<{ [key: string]: CryptocurrencyListing }>('/cryptocurrency/quotes/latest', params, 60000); // 1 minute cache
  }

  /**
   * Get global cryptocurrency market metrics
   */
  async getGlobalMetrics(convert = 'USD'): Promise<GlobalMetrics> {
    return this.makeRequest<GlobalMetrics>('/global-metrics/quotes/latest', { convert }, 300000); // 5 minutes cache
  }

  /**
   * Convert cryptocurrency amounts
   */
  async convertCryptocurrency(options: {
    amount: number;
    id?: string;
    symbol?: string;
    time?: string;
    convert: string;
  }): Promise<PriceConversionResult> {
    if (!options.id && !options.symbol) {
      throw new Error('Must provide either id or symbol');
    }

    const params = {
      amount: options.amount,
      convert: options.convert,
      ...(options.id && { id: options.id }),
      ...(options.symbol && { symbol: options.symbol }),
      ...(options.time && { time: options.time }),
    };

    return this.makeRequest<PriceConversionResult>('/tools/price-conversion', params, 60000); // 1 minute cache
  }

  /**
   * Get historical OHLCV data
   */
  async getHistoricalData(options: {
    id?: string;
    symbol?: string;
    time_start?: string;
    time_end?: string;
    count?: number;
    interval?: '1d' | '7d' | '14d' | '15d' | '30d' | '90d' | '365d';
    convert?: string;
  }): Promise<{ quotes: HistoricalData[] }> {
    if (!options.id && !options.symbol) {
      throw new Error('Must provide either id or symbol');
    }

    const params = {
      interval: options.interval || '1d',
      convert: options.convert || 'USD',
      count: options.count || 30,
      ...(options.id && { id: options.id }),
      ...(options.symbol && { symbol: options.symbol }),
      ...(options.time_start && { time_start: options.time_start }),
      ...(options.time_end && { time_end: options.time_end }),
    };

    return this.makeRequest<{ quotes: HistoricalData[] }>('/cryptocurrency/quotes/historical', params, 3600000); // 1 hour cache for historical data
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCryptocurrencies(options: {
    start?: number;
    limit?: number;
    time_period?: '1h' | '24h' | '7d' | '30d';
    convert?: string;
  } = {}): Promise<CryptocurrencyListing[]> {
    const params = {
      start: options.start || 1,
      limit: options.limit || 10,
      time_period: options.time_period || '24h',
      convert: options.convert || 'USD',
    };

    return this.makeRequest<CryptocurrencyListing[]>('/cryptocurrency/trending/latest', params, 300000); // 5 minutes cache
  }

  /**
   * Get Fear & Greed Index (if available through CMC)
   */
  async getFearGreedIndex(): Promise<FearGreedData | null> {
    try {
      // Note: This might not be directly available through CMC API
      // You might need to use Alternative.me API for Fear & Greed Index
      const response = await fetch('https://api.alternative.me/fng/');
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data[0] as FearGreedData;
    } catch (error) {
      logger.warn('Failed to fetch Fear & Greed Index:', error);
      return null;
    }
  }

  /**
   * Get top cryptocurrencies by market cap
   */
  async getTopCryptocurrencies(limit = 10, convert = 'USD'): Promise<CryptocurrencyListing[]> {
    return this.getCryptocurrencyListings({
      limit,
      convert,
      sort: 'market_cap',
      sort_dir: 'desc',
    });
  }

  /**
   * Get Bitcoin-specific data
   */
  async getBitcoinData(convert = 'USD'): Promise<CryptocurrencyListing> {
    const data = await this.getCryptocurrencyQuotes({
      symbol: 'BTC',
      convert,
    });
    return data.BTC;
  }

  /**
   * Search cryptocurrencies by name or symbol
   */
  async searchCryptocurrencies(query: string): Promise<any[]> {
    // Note: CMC doesn't have a direct search endpoint in the basic plan
    // This would require implementing client-side search on the listings
    const listings = await this.getCryptocurrencyListings({ limit: 5000 });
    
    const queryLower = query.toLowerCase();
    return listings.filter(crypto => 
      crypto.name.toLowerCase().includes(queryLower) ||
      crypto.symbol.toLowerCase().includes(queryLower) ||
      crypto.slug.toLowerCase().includes(queryLower)
    ).slice(0, 20);
  }

  /**
   * Get DeFi cryptocurrencies
   */
  async getDeFiCryptocurrencies(options: {
    start?: number;
    limit?: number;
    convert?: string;
  } = {}): Promise<CryptocurrencyListing[]> {
    return this.getCryptocurrencyListings({
      start: options.start || 1,
      limit: options.limit || 50,
      convert: options.convert || 'USD',
      tag: 'defi',
    });
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    size: number; 
    entries: string[];
    priceCache: any;
    marketCache: any;
    rateLimiterStatus: any;
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      priceCache: priceCache.getStats(),
      marketCache: marketCache.getStats(),
      rateLimiterStatus: enhancedRateLimiter.getAllStatus()
    };
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus(): {
    daily: any;
    minute: any;
    allStatus: Map<string, any>;
  } {
    return {
      daily: enhancedRateLimiter.getStatus('coinmarketcap'),
      minute: enhancedRateLimiter.getStatus('coinmarketcap-minute'),
      allStatus: enhancedRateLimiter.getAllStatus()
    };
  }

  /**
   * Clear enhanced caches
   */
  clearEnhancedCache(): void {
    priceCache.clear();
    marketCache.clear();
    logger.info('CoinMarketCap enhanced caches cleared');
  }

  /**
   * Reset rate limiters
   */
  resetRateLimit(): void {
    enhancedRateLimiter.reset('coinmarketcap');
    enhancedRateLimiter.reset('coinmarketcap-minute');
    logger.info('CoinMarketCap rate limiters reset');
  }
}

// Default instance with environment configuration
export const coinMarketCapService = new CoinMarketCapService({
  apiKey: process.env.CMC_API_KEY || '',
  sandbox: process.env.NODE_ENV === 'development',
});

export default coinMarketCapService;