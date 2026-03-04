/**
 * Redis Cache System for CYPHER ORDi Future V3
 * High-performance caching with Redis backend
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';


interface CacheOptions {
  ttl?: number; // Time to live in seconds
  serialize?: boolean; // Whether to JSON serialize values
  prefix?: string; // Key prefix
  namespace?: string; // Cache namespace
}

interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
  connections: number;
  operations: {
    get: number;
    set: number;
    del: number;
    flush: number;
  };
}

interface CacheEntry {
  value: any;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class RedisCache extends EventEmitter {
  private client: any = null;
  private isConnected = false;
  private stats: CacheStats;
  private config: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetries: number;
    retryDelay: number;
    keyPrefix: string;
  };
  
  // Fallback in-memory cache when Redis is unavailable
  private memoryCache = new Map<string, CacheEntry>();
  private memoryTtlTimeouts = new Map<string, ReturnType<typeof setInterval>>();
  private usingFallback = false;

  constructor(config: Partial<RedisCache['config']> = {}) {
    super();
    
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || parseInt(process.env.REDIS_DB || '0'),
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      keyPrefix: config.keyPrefix || 'cypher:',
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      connections: 0,
      operations: {
        get: 0,
        set: 0,
        del: 0,
        flush: 0
      }
    };

    this.setupCleanupInterval();
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    try {
      // Mock Redis client - would use actual Redis client in production
      this.client = new MockRedisClient(this.config);
      await this.client.connect();
      
      this.isConnected = true;
      this.usingFallback = false;
      
      EnhancedLogger.info('Redis cache initialized', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      this.emit('connected');
    } catch (error) {
      EnhancedLogger.warn('Redis connection failed, using memory fallback', error);
      this.usingFallback = true;
      this.emit('fallback');
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
      }
      
      this.isConnected = false;
      this.clearMemoryCache();
      
      EnhancedLogger.info('Redis cache disconnected');
      this.emit('disconnected');
    } catch (error) {
      EnhancedLogger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options);
      this.stats.operations.get++;

      if (this.usingFallback || !this.isConnected) {
        return this.getFromMemory<T>(fullKey);
      }

      const value = await this.client.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      const parsed = options.serialize !== false ? JSON.parse(value) : value;
      
      EnhancedLogger.debug('Cache hit', { key: fullKey });
      return parsed;

    } catch (error) {
      EnhancedLogger.error('Cache get error:', { key, error });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options);
      const ttl = options.ttl || 3600; // Default 1 hour
      this.stats.operations.set++;

      if (this.usingFallback || !this.isConnected) {
        return this.setInMemory(fullKey, value, ttl);
      }

      const serialized = options.serialize !== false ? JSON.stringify(value) : value;
      
      if (ttl > 0) {
        await this.client.setex(fullKey, ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      EnhancedLogger.debug('Cache set', { key: fullKey, ttl });
      return true;

    } catch (error) {
      EnhancedLogger.error('Cache set error:', { key, error });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options);
      this.stats.operations.del++;

      if (this.usingFallback || !this.isConnected) {
        return this.deleteFromMemory(fullKey);
      }

      const result = await this.client.del(fullKey);
      
      EnhancedLogger.debug('Cache delete', { key: fullKey, deleted: result > 0 });
      return result > 0;

    } catch (error) {
      EnhancedLogger.error('Cache delete error:', { key, error });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options);

      if (this.usingFallback || !this.isConnected) {
        return this.memoryCache.has(fullKey);
      }

      const result = await this.client.exists(fullKey);
      return result === 1;

    } catch (error) {
      EnhancedLogger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  /**
   * Set with expiration
   */
  async setex(key: string, ttl: number, value: any, options: CacheOptions = {}): Promise<boolean> {
    return this.set(key, value, { ...options, ttl });
  }

  /**
   * Get multiple keys
   */
  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, options));

      if (this.usingFallback || !this.isConnected) {
        return fullKeys.map(key => this.getFromMemorySync<T>(key));
      }

      const values = await this.client.mget(fullKeys);
      
      return values.map((value: any) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        return options.serialize !== false ? JSON.parse(value) : value;
      });

    } catch (error) {
      EnhancedLogger.error('Cache mget error:', { keys, error });
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys
   */
  async mset(entries: Record<string, any>, options: CacheOptions = {}): Promise<boolean> {
    try {
      const pipeline = [];
      
      for (const [key, value] of Object.entries(entries)) {
        const fullKey = this.buildKey(key, options);
        const serialized = options.serialize !== false ? JSON.stringify(value) : value;
        pipeline.push([fullKey, serialized]);
      }

      if (this.usingFallback || !this.isConnected) {
        const ttl = options.ttl || 3600;
        for (const [key, value] of Object.entries(entries)) {
          const fullKey = this.buildKey(key, options);
          this.setInMemory(fullKey, value, ttl);
        }
        return true;
      }

      await this.client.mset(pipeline.flat());
      
      // Set TTL for each key if specified
      if (options.ttl) {
        const ttlPromises = pipeline.map(([key]) => 
          this.client.expire(key, options.ttl)
        );
        await Promise.all(ttlPromises);
      }

      return true;

    } catch (error) {
      EnhancedLogger.error('Cache mset error:', { entries: Object.keys(entries), error });
      return false;
    }
  }

  /**
   * Increment numeric value
   */
  async incr(key: string, by: number = 1, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options);

      if (this.usingFallback || !this.isConnected) {
        const current = this.getFromMemorySync<number>(fullKey) || 0;
        const newValue = current + by;
        this.setInMemory(fullKey, newValue, options.ttl || 3600);
        return newValue;
      }

      const result = by === 1 ? 
        await this.client.incr(fullKey) : 
        await this.client.incrby(fullKey, by);

      if (options.ttl) {
        await this.client.expire(fullKey, options.ttl);
      }

      return result;

    } catch (error) {
      EnhancedLogger.error('Cache incr error:', { key, by, error });
      return 0;
    }
  }

  /**
   * Flush cache (delete all keys with prefix)
   */
  async flush(pattern?: string): Promise<boolean> {
    try {
      this.stats.operations.flush++;

      if (this.usingFallback || !this.isConnected) {
        if (pattern) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
              this.deleteFromMemory(key);
            }
          }
        } else {
          this.clearMemoryCache();
        }
        return true;
      }

      const searchPattern = pattern || `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }

      EnhancedLogger.info('Cache flushed', { pattern: searchPattern, deleted: keys.length });
      return true;

    } catch (error) {
      EnhancedLogger.error('Cache flush error:', { pattern, error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0;

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate.toFixed(2)),
      isConnected: this.isConnected,
      usingFallback: this.usingFallback,
      memoryKeys: this.memoryCache.size
    } as any;
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      connections: 0,
      operations: {
        get: 0,
        set: 0,
        del: 0,
        flush: 0
      }
    };
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string, options: CacheOptions): string {
    const parts = [this.config.keyPrefix];
    
    if (options.namespace) {
      parts.push(options.namespace);
    }
    
    if (options.prefix) {
      parts.push(options.prefix);
    }
    
    parts.push(key);
    
    return parts.join(':');
  }

  /**
   * Memory cache operations
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.ttl) {
      this.deleteFromMemory(key);
      this.stats.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.memoryCache.set(key, entry);
    this.stats.hits++;
    
    return entry.value;
  }

  private getFromMemorySync<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry || Date.now() > entry.ttl) {
      return null;
    }
    return entry.value;
  }

  private setInMemory(key: string, value: any, ttl: number): boolean {
    try {
      const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + (365 * 24 * 60 * 60 * 1000);
      
      const entry: CacheEntry = {
        value,
        ttl: expiresAt,
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      };

      this.memoryCache.set(key, entry);

      // Set timeout for automatic cleanup
      if (ttl > 0) {
        const timeout = setTimeout(() => {
          this.deleteFromMemory(key);
        }, ttl * 1000);
        
        this.memoryTtlTimeouts.set(key, timeout);
      }

      return true;
    } catch (error) {
      EnhancedLogger.error('Memory cache set error:', { key, error });
      return false;
    }
  }

  private deleteFromMemory(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    
    const timeout = this.memoryTtlTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.memoryTtlTimeouts.delete(key);
    }
    
    return deleted;
  }

  private clearMemoryCache(): void {
    this.memoryCache.clear();
    
    for (const timeout of this.memoryTtlTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.memoryTtlTimeouts.clear();
  }

  /**
   * Setup cleanup interval for memory cache
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      if (this.usingFallback || this.memoryCache.size === 0) return;

      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.memoryCache.entries()) {
        if (now > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.deleteFromMemory(key);
      }

      if (expiredKeys.length > 0) {
        EnhancedLogger.debug('Memory cache cleanup', { expired: expiredKeys.length });
      }
    }, 60000); // Every minute
  }
}

/**
 * Mock Redis client for development/fallback
 */
class MockRedisClient {
  private data = new Map<string, any>();
  private ttls = new Map<string, number>();
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Mock connection
    return Promise.resolve();
  }

  async quit(): Promise<void> {
    this.data.clear();
    this.ttls.clear();
  }

  async get(key: string): Promise<string | null> {
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.data.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.data.get(key) || null;
  }

  async set(key: string, value: any): Promise<string> {
    this.data.set(key, value);
    return 'OK';
  }

  async setex(key: string, ttl: number, value: any): Promise<string> {
    this.data.set(key, value);
    this.ttls.set(key, Date.now() + (ttl * 1000));
    return 'OK';
  }

  async del(keys: string | string[]): Promise<number> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    let deleted = 0;
    
    for (const key of keyArray) {
      if (this.data.delete(key)) deleted++;
      this.ttls.delete(key);
    }
    
    return deleted;
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(pairs: any[]): Promise<string> {
    for (let i = 0; i < pairs.length; i += 2) {
      this.data.set(pairs[i], pairs[i + 1]);
    }
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.data.get(key) || '0');
    const newValue = current + 1;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async incrby(key: string, increment: number): Promise<number> {
    const current = parseInt(this.data.get(key) || '0');
    const newValue = current + increment;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, ttl: number): Promise<number> {
    if (this.data.has(key)) {
      this.ttls.set(key, Date.now() + (ttl * 1000));
      return 1;
    }
    return 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }
}

// Singleton instance
export const redisCache = new RedisCache();