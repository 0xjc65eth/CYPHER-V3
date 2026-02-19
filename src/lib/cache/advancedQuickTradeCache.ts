import Redis from 'ioredis';

// Advanced caching system for QuickTrade with Redis clustering
interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  clustering: {
    enabled: boolean;
    nodes: Array<{ host: string; port: number }>;
  };
  ttl: {
    quotes: number;
    liquidity: number;
    gas: number;
    prices: number;
    analytics: number;
  };
  compression: {
    enabled: boolean;
    threshold: number; // bytes
  };
}

const DEFAULT_CONFIG: CacheConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  clustering: {
    enabled: process.env.REDIS_CLUSTER === 'true',
    nodes: [
      { host: process.env.REDIS_NODE_1_HOST || 'localhost', port: parseInt(process.env.REDIS_NODE_1_PORT || '6379') },
      { host: process.env.REDIS_NODE_2_HOST || 'localhost', port: parseInt(process.env.REDIS_NODE_2_PORT || '6380') },
      { host: process.env.REDIS_NODE_3_HOST || 'localhost', port: parseInt(process.env.REDIS_NODE_3_PORT || '6381') }
    ]
  },
  ttl: {
    quotes: 30,      // 30 seconds
    liquidity: 60,   // 1 minute
    gas: 15,         // 15 seconds
    prices: 10,      // 10 seconds
    analytics: 300   // 5 minutes
  },
  compression: {
    enabled: true,
    threshold: 1024 // 1KB
  }
};

class AdvancedQuickTradeCache {
  private redis: Redis | Redis.Cluster;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    compressionSaves: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      if (this.config.clustering.enabled) {
        // Redis Cluster setup
        this.redis = new Redis.Cluster(this.config.clustering.nodes, {
          redisOptions: {
            password: this.config.redis.password,
            connectTimeout: 5000,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableOfflineQueue: false
          },
          clusterRetryDelayOnFailover: 500,
          clusterRetryDelayOnClusterDown: 1000,
          clusterMaxRedirections: 3,
          scaleReads: 'slave'
        });

      } else {
        // Single Redis instance
        this.redis = new Redis({
          ...this.config.redis,
          connectTimeout: 5000,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableOfflineQueue: false
        });

      }

      // Event handlers
      this.redis.on('error', (error) => {
        console.error('❌ Redis cache error:', error);
      });

      this.redis.on('connect', () => {
      });

      this.redis.on('ready', () => {
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis cache:', error);
      // Fallback to memory cache
      this.initializeMemoryFallback();
    }
  }

  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  private initializeMemoryFallback() {
    
    // Clean memory cache periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.memoryCache) {
        if (now - value.timestamp > value.ttl * 1000) {
          this.memoryCache.delete(key);
        }
      }
    }, 30000);
  }

  // Generate cache keys with consistent formatting
  private generateKey(type: string, ...params: any[]): string {
    const sanitizedParams = params.map(p => 
      typeof p === 'string' ? p.toLowerCase() : String(p)
    );
    return `qt:${type}:${sanitizedParams.join(':')}`;
  }

  // Compress data if it's large enough
  private compressData(data: any): string {
    const jsonString = JSON.stringify(data);
    
    if (this.config.compression.enabled && jsonString.length > this.config.compression.threshold) {
      // Simple compression using gzip would go here
      // For now, just track that compression would be beneficial
      this.stats.compressionSaves++;
      return jsonString;
    }
    
    return jsonString;
  }

  private decompressData(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to decompress cache data:', error);
      return null;
    }
  }

  // Quote caching methods
  async cacheQuote(dex: string, tokenIn: string, tokenOut: string, amountIn: string, chainId: string | number, quote: any): Promise<void> {
    const key = this.generateKey('quote', dex, tokenIn, tokenOut, amountIn, chainId);
    await this.set(key, quote, this.config.ttl.quotes);
  }

  async getQuote(dex: string, tokenIn: string, tokenOut: string, amountIn: string, chainId: string | number): Promise<any | null> {
    const key = this.generateKey('quote', dex, tokenIn, tokenOut, amountIn, chainId);
    return await this.get(key);
  }

  // Liquidity caching
  async cacheLiquidity(dex: string, tokenPair: string, chainId: string | number, liquidity: any): Promise<void> {
    const key = this.generateKey('liquidity', dex, tokenPair, chainId);
    await this.set(key, liquidity, this.config.ttl.liquidity);
  }

  async getLiquidity(dex: string, tokenPair: string, chainId: string | number): Promise<any | null> {
    const key = this.generateKey('liquidity', dex, tokenPair, chainId);
    return await this.get(key);
  }

  // Gas estimation caching
  async cacheGasEstimate(chainId: string | number, dex: string, gasEstimate: any): Promise<void> {
    const key = this.generateKey('gas', chainId, dex);
    await this.set(key, gasEstimate, this.config.ttl.gas);
  }

  async getGasEstimate(chainId: string | number, dex: string): Promise<any | null> {
    const key = this.generateKey('gas', chainId, dex);
    return await this.get(key);
  }

  // Price caching
  async cachePrice(token: string, price: number): Promise<void> {
    const key = this.generateKey('price', token);
    await this.set(key, { price, timestamp: Date.now() }, this.config.ttl.prices);
  }

  async getPrice(token: string): Promise<number | null> {
    const key = this.generateKey('price', token);
    const cached = await this.get(key);
    return cached?.price || null;
  }

  // Analytics caching
  async cacheAnalytics(analysisId: string, analytics: any): Promise<void> {
    const key = this.generateKey('analytics', analysisId);
    await this.set(key, analytics, this.config.ttl.analytics);
  }

  async getAnalytics(analysisId: string): Promise<any | null> {
    const key = this.generateKey('analytics', analysisId);
    return await this.get(key);
  }

  // Generic cache operations
  private async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      this.stats.sets++;
      
      if (this.redis instanceof Redis || this.redis instanceof Redis.Cluster) {
        const compressedData = this.compressData(value);
        await this.redis.setex(key, ttlSeconds, compressedData);
      } else {
        // Memory fallback
        this.memoryCache.set(key, {
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds * 1000
        });
      }
    } catch (error) {
      console.error('❌ Cache set error:', error);
    }
  }

  private async get(key: string): Promise<any | null> {
    try {
      if (this.redis instanceof Redis || this.redis instanceof Redis.Cluster) {
        const cached = await this.redis.get(key);
        
        if (cached) {
          this.stats.hits++;
          return this.decompressData(cached);
        } else {
          this.stats.misses++;
          return null;
        }
      } else {
        // Memory fallback
        const cached = this.memoryCache.get(key);
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          this.stats.hits++;
          return cached.data;
        } else {
          this.stats.misses++;
          if (cached) {
            this.memoryCache.delete(key);
          }
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  // Cache invalidation strategies
  async invalidateQuotes(tokenIn?: string, tokenOut?: string, chainId?: string | number): Promise<void> {
    try {
      this.stats.invalidations++;
      
      let pattern: string;
      if (tokenIn && tokenOut && chainId) {
        pattern = this.generateKey('quote', '*', tokenIn, tokenOut, '*', chainId);
      } else if (chainId) {
        pattern = this.generateKey('quote', '*', '*', '*', '*', chainId);
      } else {
        pattern = this.generateKey('quote', '*');
      }

      await this.invalidateByPattern(pattern);
    } catch (error) {
      console.error('❌ Cache invalidation error:', error);
    }
  }

  async invalidateAllQuotes(): Promise<void> {
    await this.invalidateByPattern(this.generateKey('quote', '*'));
  }

  async invalidatePrices(): Promise<void> {
    await this.invalidateByPattern(this.generateKey('price', '*'));
  }

  async invalidateGasEstimates(chainId?: string | number): Promise<void> {
    const pattern = chainId 
      ? this.generateKey('gas', chainId, '*')
      : this.generateKey('gas', '*');
    await this.invalidateByPattern(pattern);
  }

  private async invalidateByPattern(pattern: string): Promise<void> {
    try {
      if (this.redis instanceof Redis || this.redis instanceof Redis.Cluster) {
        // For Redis Cluster, we need to scan all nodes
        if (this.redis instanceof Redis.Cluster) {
          const nodes = this.redis.nodes('master');
          for (const node of nodes) {
            const keys = await node.keys(pattern);
            if (keys.length > 0) {
              await node.del(...keys);
            }
          }
        } else {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        }
      } else {
        // Memory fallback
        const keysToDelete: string[] = [];
        for (const key of this.memoryCache.keys()) {
          if (this.matchesPattern(key, pattern)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => this.memoryCache.delete(key));
      }
    } catch (error) {
      console.error('❌ Pattern invalidation error:', error);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  // Cache warming strategies
  async warmCache(tokenPairs: Array<{ tokenIn: string; tokenOut: string; chainId: string | number }>): Promise<void> {
    
    for (const pair of tokenPairs) {
      try {
        // Pre-load commonly requested data
        await this.preloadPrices([pair.tokenIn, pair.tokenOut]);
        await this.preloadGasEstimates(pair.chainId);
      } catch (error) {
        console.error('❌ Cache warming error:', error);
      }
    }
    
  }

  private async preloadPrices(tokens: string[]): Promise<void> {
    // Implementation would fetch current prices and cache them
    // This is a placeholder for the actual price fetching logic
  }

  private async preloadGasEstimates(chainId: string | number): Promise<void> {
    // Implementation would fetch current gas estimates and cache them
    // This is a placeholder for the actual gas estimation logic
  }

  // Cache statistics and monitoring
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      compressionSaves: this.stats.compressionSaves,
      memoryFallback: !(this.redis instanceof Redis || this.redis instanceof Redis.Cluster)
    };
  }

  async getCacheSize(): Promise<number> {
    try {
      if (this.redis instanceof Redis) {
        const info = await this.redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        return match ? parseInt(match[1]) : 0;
      } else if (this.redis instanceof Redis.Cluster) {
        // Sum memory usage across all cluster nodes
        const nodes = this.redis.nodes('master');
        let totalMemory = 0;
        
        for (const node of nodes) {
          const info = await node.info('memory');
          const match = info.match(/used_memory:(\d+)/);
          if (match) {
            totalMemory += parseInt(match[1]);
          }
        }
        
        return totalMemory;
      } else {
        // Memory fallback - rough estimate
        return this.memoryCache.size * 1024; // Rough estimate
      }
    } catch (error) {
      console.error('❌ Failed to get cache size:', error);
      return 0;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      if (this.redis instanceof Redis || this.redis instanceof Redis.Cluster) {
        await this.redis.ping();
        
        const stats = this.getStats();
        const cacheSize = await this.getCacheSize();
        
        return {
          status: 'healthy',
          details: {
            connection: 'active',
            stats,
            cacheSize,
            clustering: this.config.clustering.enabled
          }
        };
      } else {
        return {
          status: 'degraded',
          details: {
            connection: 'memory_fallback',
            stats: this.getStats(),
            cacheSize: this.memoryCache.size
          }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          fallback: 'memory_cache_available'
        }
      };
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      if (this.redis instanceof Redis || this.redis instanceof Redis.Cluster) {
        await this.redis.disconnect();
      }
      this.memoryCache.clear();
    } catch (error) {
      console.error('❌ Cache disconnect error:', error);
    }
  }
}

// Export singleton instance
export const quickTradeCache = new AdvancedQuickTradeCache();

// Export class for custom configurations
export { AdvancedQuickTradeCache, type CacheConfig };