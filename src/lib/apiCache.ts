/**
 * CYPHER ORDI FUTURE v3.1.0 - API Cache Sistema Inteligente
 * Sistema de cache avançado para APIs de carteira com rate limiting e fallbacks
 */

import { cacheService } from './cache';
import { devLogger } from './logger';

// Rate Limiting Store
interface RateLimitEntry {
  requests: number;
  resetTime: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate Limiting Configuration
export const RATE_LIMITS = {
  // Hiro API - 500 requests per 10 minutes
  hiro: {
    maxRequests: 500,
    windowMs: 10 * 60 * 1000,
    priority: 1
  },
  // Mempool Space - 10 requests per minute  
  mempool: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    priority: 2
  },
  // Blockstream - 100 requests per minute
  blockstream: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    priority: 3
  },
  // OrdScan - 300 requests per hour
  ordscan: {
    maxRequests: 300,
    windowMs: 60 * 60 * 1000,
    priority: 4
  }
};

// Cache TTL Configuration
export const CACHE_TTL = {
  balance: 30, // 30 seconds for balance data
  ordinals: 300, // 5 minutes for ordinals
  runes: 180, // 3 minutes for runes
  transactions: 60, // 1 minute for transaction history
  utxos: 120, // 2 minutes for UTXOs
  inscriptions: 600, // 10 minutes for inscription details
  collections: 1800, // 30 minutes for collection data
  prices: 15, // 15 seconds for price data
  metadata: 3600 // 1 hour for metadata
};

// Cache Keys Factory
export const CacheKeys = {
  bitcoinBalance: (address: string) => `wallet:bitcoin:balance:${address}`,
  bitcoinUtxos: (address: string) => `wallet:bitcoin:utxos:${address}`,
  bitcoinTransactions: (address: string, page = 0) => `wallet:bitcoin:tx:${address}:${page}`,
  ordinalsBalance: (address: string) => `wallet:ordinals:balance:${address}`,
  ordinalsInscriptions: (address: string, page = 0) => `wallet:ordinals:inscriptions:${address}:${page}`,
  ordinalsCollection: (address: string, collectionId: string) => `wallet:ordinals:collection:${address}:${collectionId}`,
  runesBalance: (address: string) => `wallet:runes:balance:${address}`,
  runesTokens: (address: string) => `wallet:runes:tokens:${address}`,
  runesActivity: (address: string, page = 0) => `wallet:runes:activity:${address}:${page}`,
  inscriptionDetails: (inscriptionId: string) => `inscription:details:${inscriptionId}`,
  collectionFloor: (collectionSlug: string) => `collection:floor:${collectionSlug}`,
  runePrice: (runeName: string) => `rune:price:${runeName}`,
  apiHealth: (provider: string) => `api:health:${provider}`,
  rateLimitCounter: (provider: string, endpoint: string) => `ratelimit:${provider}:${endpoint}`
};

/**
 * Rate Limiter Class
 */
export class RateLimiter {
  private provider: string;
  private config: typeof RATE_LIMITS.hiro;

  constructor(provider: keyof typeof RATE_LIMITS) {
    this.provider = provider;
    this.config = RATE_LIMITS[provider];
  }

  async checkLimit(endpoint: string): Promise<boolean> {
    const key = `${this.provider}:${endpoint}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry) {
      rateLimitStore.set(key, {
        requests: 1,
        resetTime: now + this.config.windowMs,
        windowStart: now
      });
      return true;
    }

    // Check if window has expired
    if (now >= entry.resetTime) {
      rateLimitStore.set(key, {
        requests: 1,
        resetTime: now + this.config.windowMs,
        windowStart: now
      });
      return true;
    }

    // Check if limit exceeded
    if (entry.requests >= this.config.maxRequests) {
      devLogger.log('RATE_LIMIT', `Rate limit exceeded for ${key}. Next reset: ${new Date(entry.resetTime).toISOString()}`);
      return false;
    }

    // Increment counter
    entry.requests++;
    return true;
  }

  getStatus(endpoint: string) {
    const key = `${this.provider}:${endpoint}`;
    const entry = rateLimitStore.get(key);
    
    if (!entry) {
      return {
        requests: 0,
        remaining: this.config.maxRequests,
        resetTime: null,
        blocked: false
      };
    }

    const now = Date.now();
    const isBlocked = entry.requests >= this.config.maxRequests && now < entry.resetTime;

    return {
      requests: entry.requests,
      remaining: Math.max(0, this.config.maxRequests - entry.requests),
      resetTime: entry.resetTime,
      blocked: isBlocked
    };
  }
}

/**
 * API Cache Manager
 */
export class ApiCacheManager {
  private rateLimiters: Map<string, RateLimiter>;

  constructor() {
    this.rateLimiters = new Map();
    
    // Initialize rate limiters
    Object.keys(RATE_LIMITS).forEach(provider => {
      this.rateLimiters.set(provider, new RateLimiter(provider as keyof typeof RATE_LIMITS));
    });
  }

  /**
   * Get cached data or fetch with fallback providers with enhanced timeout handling
   */
  async getWithFallback<T>(
    cacheKey: string,
    providers: Array<{
      name: keyof typeof RATE_LIMITS;
      endpoint: string;
      fetchFn: () => Promise<T>;
    }>,
    ttl = CACHE_TTL.balance
  ): Promise<T> {
    // Try to get from cache first
    const cached = await cacheService.get<T>(cacheKey);
    if (cached) {
      devLogger.debug(`[API_CACHE] Cache hit for ${cacheKey}`);
      return cached;
    }

    // Sort providers by priority (lower number = higher priority)
    const sortedProviders = providers.sort((a, b) => 
      RATE_LIMITS[a.name].priority - RATE_LIMITS[b.name].priority
    );

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of sortedProviders) {
      try {
        const rateLimiter = this.rateLimiters.get(provider.name);
        if (!rateLimiter) continue;

        // Check rate limit
        const canProceed = await rateLimiter.checkLimit(provider.endpoint);
        if (!canProceed) {
          devLogger.log('API_CACHE', `Rate limited: ${provider.name}:${provider.endpoint}`);
          continue;
        }

        devLogger.log('API_CACHE', `Fetching from ${provider.name}:${provider.endpoint}`);
        
        const startTime = Date.now();
        
        // Add timeout wrapper for each provider
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Provider timeout')), 10000); // 10 second timeout per provider
        });
        
        const data = await Promise.race([
          provider.fetchFn(),
          timeoutPromise
        ]);
        
        const duration = Date.now() - startTime;

        // Cache the result
        await cacheService.set(cacheKey, data, ttl);
        
        // Track API health
        await this.trackApiHealth(provider.name, provider.endpoint, true, duration);
        
        devLogger.performance(`API Success: ${provider.name}:${provider.endpoint}`, duration);
        return data;

      } catch (error) {
        lastError = error as Error;
        devLogger.error(lastError, `API Error: ${provider.name}:${provider.endpoint}`);
        
        // Track API health
        await this.trackApiHealth(provider.name, provider.endpoint, false);
        
        continue;
      }
    }

    // If all providers failed, throw the last error
    throw new Error(`All API providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Track API health and performance
   */
  private async trackApiHealth(
    provider: keyof typeof RATE_LIMITS,
    endpoint: string,
    success: boolean,
    responseTime?: number
  ) {
    const healthKey = CacheKeys.apiHealth(`${provider}:${endpoint}`);
    
    try {
      const existing = await cacheService.get<{
        totalRequests: number;
        successfulRequests: number;
        averageResponseTime: number;
        lastSuccess: number;
        lastFailure: number;
      }>(healthKey);

      const stats = existing || {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        lastSuccess: 0,
        lastFailure: 0
      };

      stats.totalRequests++;
      
      if (success) {
        stats.successfulRequests++;
        stats.lastSuccess = Date.now();
        
        if (responseTime) {
          // Calculate moving average
          const currentAvg = stats.averageResponseTime;
          const currentCount = stats.successfulRequests;
          stats.averageResponseTime = ((currentAvg * (currentCount - 1)) + responseTime) / currentCount;
        }
      } else {
        stats.lastFailure = Date.now();
      }

      await cacheService.set(healthKey, stats, 3600); // Cache for 1 hour
      
    } catch (error) {
      devLogger.error(error as Error, `Failed to track API health for ${provider}:${endpoint}`);
    }
  }

  /**
   * Get API health status
   */
  async getApiHealth(provider?: keyof typeof RATE_LIMITS) {
    const healthData: Record<string, any> = {};

    if (provider) {
      const healthKey = CacheKeys.apiHealth(provider);
      healthData[provider] = await cacheService.get(healthKey);
    } else {
      // Get health for all providers
      for (const providerName of Object.keys(RATE_LIMITS) as Array<keyof typeof RATE_LIMITS>) {
        const healthKey = CacheKeys.apiHealth(providerName);
        healthData[providerName] = await cacheService.get(healthKey);
      }
    }

    return healthData;
  }

  /**
   * Get rate limit status for all providers
   */
  getRateLimitStatus() {
    const status: Record<string, any> = {};

    this.rateLimiters.forEach((limiter, provider) => {
      status[provider] = limiter.getStatus('*');
    });

    return status;
  }

  /**
   * Clear cache for specific patterns
   */
  async clearCache(pattern: string) {
    try {
      await cacheService.clearPattern(pattern);
      devLogger.log('API_CACHE', `Cleared cache pattern: ${pattern}`);
    } catch (error) {
      devLogger.error(error as Error, `Failed to clear cache pattern: ${pattern}`);
    }
  }

  /**
   * Warmup cache for an address
   */
  async warmupCache(address: string) {
    devLogger.log('API_CACHE', `Warming up cache for address: ${address}`);
    
    const warmupTasks = [
      CacheKeys.bitcoinBalance(address),
      CacheKeys.bitcoinUtxos(address),
      CacheKeys.bitcoinTransactions(address),
      CacheKeys.ordinalsBalance(address),
      CacheKeys.runesBalance(address)
    ];

    // Note: This would typically trigger actual API calls to populate cache
    // Implementation depends on specific API endpoints
    
    return Promise.all(warmupTasks.map(key => 
      cacheService.get(key).catch(() => null)
    ));
  }
}

// Export singleton instance
export const apiCache = new ApiCacheManager();

// Export utility functions
export const isValidBitcoinAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  
  // Clean the address
  const cleanAddress = address.trim();
  
  // Bitcoin address patterns
  const patterns = [
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // P2PKH and P2SH Legacy addresses
    /^bc1[a-z0-9]{39,59}$/, // Bech32 native segwit (P2WPKH and P2WSH)
    /^bc1p[a-z0-9]{58}$/, // Bech32m Taproot (P2TR)
    /^tb1[a-z0-9]{39,59}$/, // Testnet Bech32
    /^tb1p[a-z0-9]{58}$/, // Testnet Bech32m Taproot
    /^2[a-km-zA-HJ-NP-Z1-9]{33}$/, // Testnet P2SH
    /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Testnet P2PKH
  ];
  
  return patterns.some(pattern => pattern.test(cleanAddress));
};

export const sanitizeAddress = (address: string): string => {
  if (!address || typeof address !== 'string') return '';
  
  const cleaned = address.trim();
  
  // For Bitcoin addresses, preserve case for legacy addresses but lowercase bech32
  if (cleaned.startsWith('bc1') || cleaned.startsWith('tb1')) {
    return cleaned.toLowerCase();
  }
  
  // For legacy addresses, preserve original case as they're case-sensitive
  return cleaned;
};

export const getOptimalCacheTTL = (dataType: keyof typeof CACHE_TTL): number => {
  return CACHE_TTL[dataType];
};