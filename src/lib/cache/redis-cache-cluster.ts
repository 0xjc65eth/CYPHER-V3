import Redis from 'ioredis'
import { EventEmitter } from 'events'

interface CacheConfig {
  ttl: number
  maxSize: number
  evictionPolicy: 'lru' | 'lfu' | 'ttl'
}

interface CachedData<T> {
  data: T
  timestamp: number
  hits: number
  lastAccess: number
}

export class RedisCacheCluster extends EventEmitter {
  private cluster: Redis.Cluster
  private localCache: Map<string, CachedData<any>> = new Map()
  private cacheConfig: Map<string, CacheConfig> = new Map()
  
  constructor() {
    super()
    
    // Redis Cluster configuration
    this.cluster = new Redis.Cluster([
      { host: 'localhost', port: 7000 },
      { host: 'localhost', port: 7001 },
      { host: 'localhost', port: 7002 },
      { host: 'localhost', port: 7003 },
      { host: 'localhost', port: 7004 },
      { host: 'localhost', port: 7005 }
    ], {
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        enableOfflineQueue: false,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: false
      },
      clusterRetryStrategy: (times: number) => {
        return Math.min(times * 100, 3000)
      }
    })
    
    this.setupCacheConfigs()
    this.preloadCriticalData()
    this.startEvictionWorker()
  }
  
  private setupCacheConfigs() {
    // Different TTLs for different data types
    this.cacheConfig.set('orderbook:', {
      ttl: 1000, // 1 second for order books
      maxSize: 1000,
      evictionPolicy: 'lru'
    })
    
    this.cacheConfig.set('price:', {
      ttl: 500, // 500ms for prices
      maxSize: 10000,
      evictionPolicy: 'ttl'
    })
    
    this.cacheConfig.set('user:', {
      ttl: 300000, // 5 minutes for user data
      maxSize: 5000,
      evictionPolicy: 'lru'
    })
    
    this.cacheConfig.set('trades:', {
      ttl: 60000, // 1 minute for trade history
      maxSize: 50000,
      evictionPolicy: 'lfu'
    })
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Check local cache first (L1)
    const local = this.localCache.get(key)
    if (local && Date.now() - local.timestamp < this.getConfigForKey(key).ttl) {
      local.hits++
      local.lastAccess = Date.now()
      this.emit('cache:hit', { key, level: 'L1' })
      return local.data
    }
    
    // Check Redis cluster (L2)
    try {
      const data = await this.cluster.get(key)
      if (data) {
        const parsed = JSON.parse(data)
        
        // Update local cache
        this.localCache.set(key, {
          data: parsed,
          timestamp: Date.now(),
          hits: 1,
          lastAccess: Date.now()
        })
        
        this.emit('cache:hit', { key, level: 'L2' })
        return parsed
      }
    } catch (error) {
      this.emit('cache:error', { key, error })
    }
    
    this.emit('cache:miss', { key })
    return null
  }
  
  async set<T>(key: string, value: T, customTtl?: number): Promise<void> {
    const config = this.getConfigForKey(key)
    const ttl = customTtl || config.ttl
    
    // Update local cache
    this.localCache.set(key, {
      data: value,
      timestamp: Date.now(),
      hits: 0,
      lastAccess: Date.now()
    })
    
    // Update Redis with TTL
    try {
      await this.cluster.setex(
        key,
        Math.floor(ttl / 1000),
        JSON.stringify(value)
      )
      
      this.emit('cache:set', { key, ttl })
    } catch (error) {
      this.emit('cache:error', { key, error })
    }
  }
  
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = []
    const missingKeys: string[] = []
    
    // Check local cache for all keys
    for (const key of keys) {
      const local = this.localCache.get(key)
      if (local && Date.now() - local.timestamp < this.getConfigForKey(key).ttl) {
        results.push(local.data)
        local.hits++
        local.lastAccess = Date.now()
      } else {
        results.push(null)
        missingKeys.push(key)
      }
    }
    
    // Batch get missing keys from Redis
    if (missingKeys.length > 0) {
      try {
        const redisResults = await this.cluster.mget(...missingKeys)
        
        let missingIndex = 0
        for (let i = 0; i < keys.length; i++) {
          if (results[i] === null && missingIndex < redisResults.length) {
            const data = redisResults[missingIndex]
            if (data) {
              const parsed = JSON.parse(data)
              results[i] = parsed
              
              // Update local cache
              this.localCache.set(keys[i], {
                data: parsed,
                timestamp: Date.now(),
                hits: 1,
                lastAccess: Date.now()
              })
            }
            missingIndex++
          }
        }
      } catch (error) {
        this.emit('cache:error', { keys: missingKeys, error })
      }
    }
    
    return results
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Invalidate local cache
    const keysToDelete = Array.from(this.localCache.keys())
      .filter(key => key.startsWith(pattern))
    
    keysToDelete.forEach(key => this.localCache.delete(key))
    
    // Invalidate Redis keys
    try {
      const stream = this.cluster.scanStream({
        match: pattern + '*',
        count: 100
      })
      
      stream.on('data', async (keys: string[]) => {
        if (keys.length) {
          await this.cluster.del(...keys)
        }
      })
      
      stream.on('end', () => {
        this.emit('cache:invalidated', { pattern })
      })
    } catch (error) {
      this.emit('cache:error', { pattern, error })
    }
  }
  
  private getConfigForKey(key: string): CacheConfig {
    for (const [prefix, config] of this.cacheConfig) {
      if (key.startsWith(prefix)) {
        return config
      }
    }
    
    // Default config
    return {
      ttl: 60000,
      maxSize: 1000,
      evictionPolicy: 'lru'
    }
  }
  
  private startEvictionWorker() {
    setInterval(() => {
      // Evict expired entries from local cache
      const now = Date.now()
      const toEvict: string[] = []
      
      this.localCache.forEach((value, key) => {
        const config = this.getConfigForKey(key)
        if (now - value.timestamp > config.ttl) {
          toEvict.push(key)
        }
      })
      
      toEvict.forEach(key => this.localCache.delete(key))
      
      // Check cache size limits
      this.cacheConfig.forEach((config, prefix) => {
        const prefixKeys = Array.from(this.localCache.keys())
          .filter(key => key.startsWith(prefix))
        
        if (prefixKeys.length > config.maxSize) {
          const toRemove = prefixKeys.length - config.maxSize
          
          if (config.evictionPolicy === 'lru') {
            // Sort by last access time and remove oldest
            prefixKeys
              .sort((a, b) => {
                const aData = this.localCache.get(a)!
                const bData = this.localCache.get(b)!
                return aData.lastAccess - bData.lastAccess
              })
              .slice(0, toRemove)
              .forEach(key => this.localCache.delete(key))
          } else if (config.evictionPolicy === 'lfu') {
            // Sort by hits and remove least frequently used
            prefixKeys
              .sort((a, b) => {
                const aData = this.localCache.get(a)!
                const bData = this.localCache.get(b)!
                return aData.hits - bData.hits
              })
              .slice(0, toRemove)
              .forEach(key => this.localCache.delete(key))
          }
        }
      })
      
      this.emit('cache:eviction', { 
        evicted: toEvict.length,
        size: this.localCache.size 
      })
    }, 10000) // Run every 10 seconds
  }
  
  private async preloadCriticalData() {
    
    // Preload trading pairs
    const tradingPairs = ['BTCUSDT', 'ETHUSDT', 'ORDIUSDT', 'SATSUSDT', 'RUNEUSDT']
    for (const pair of tradingPairs) {
      await this.set(`price:${pair}`, { price: 0, volume: 0 }, 3600000) // 1 hour
    }
    
  }
  
  getCacheStats() {
    const stats: any = {
      localCacheSize: this.localCache.size,
      byPrefix: {}
    }
    
    this.cacheConfig.forEach((config, prefix) => {
      const keys = Array.from(this.localCache.keys())
        .filter(key => key.startsWith(prefix))
      
      const totalHits = keys.reduce((sum, key) => {
        const data = this.localCache.get(key)
        return sum + (data?.hits || 0)
      }, 0)
      
      stats.byPrefix[prefix] = {
        count: keys.length,
        maxSize: config.maxSize,
        totalHits,
        hitRate: keys.length > 0 ? (totalHits / keys.length).toFixed(2) : 0
      }
    })
    
    return stats
  }
}

// Export singleton
export const cacheCluster = new RedisCacheCluster()