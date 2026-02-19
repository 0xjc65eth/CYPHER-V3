/**
 * 🔄 Advanced Cache System
 * Redis cache with memory fallback
 */

import Redis from 'ioredis';
import { cacheService } from '../cache';

export interface CacheConfig {
  redisUrl?: string;
  ttl: number; // seconds
  namespace: string;
}

class AdvancedCache {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: any; expires: number }> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeRedis();
  }

  private initializeRedis() {
    const url = this.config.redisUrl;
    if (url && !url.includes('your_redis') && !url.includes('placeholder') && url.length >= 10) {
      try {
        this.redis = new Redis(url);
        
        this.redis.on('connect', () => {
        });

        this.redis.on('error', (err) => {
          console.error('Redis error:', err);
          // Fallback to memory cache
          this.redis = null;
        });
      } catch (error) {
        console.error('Failed to initialize Redis:', error);
        this.redis = null;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.config.namespace}:${key}`;

    // Try Redis first
    if (this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        if (value) {
          return JSON.parse(value);
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(fullKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // Clean up expired entry
    if (cached) {
      this.memoryCache.delete(fullKey);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = `${this.config.namespace}:${key}`;
    const ttlSeconds = ttl || this.config.ttl;

    // Set in Redis
    if (this.redis) {
      try {
        await this.redis.set(
          fullKey,
          JSON.stringify(value),
          'EX',
          ttlSeconds
        );
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    // Always set in memory cache as backup
    this.memoryCache.set(fullKey, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async delete(key: string): Promise<void> {
    const fullKey = `${this.config.namespace}:${key}`;

    // Delete from Redis
    if (this.redis) {
      try {
        await this.redis.del(fullKey);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }

    // Delete from memory cache
    this.memoryCache.delete(fullKey);
  }

  async clear(): Promise<void> {
    // Clear Redis keys with namespace
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${this.config.namespace}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }

    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(this.config.namespace)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Clean up expired entries periodically
  startCleanup(intervalMs: number = 60000) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.memoryCache.entries()) {
        if (cached.expires <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, intervalMs);
  }
}

// Cache instances
const caches: Map<string, AdvancedCache> = new Map();

export function getCache(namespace: string = 'default'): AdvancedCache {
  if (!caches.has(namespace)) {
    const cache = new AdvancedCache({
      redisUrl: process.env.REDIS_URL,
      ttl: 300, // 5 minutes default
      namespace
    });
    cache.startCleanup();
    caches.set(namespace, cache);
  }
  
  return caches.get(namespace)!;
}

// Export cache instances for backward compatibility
export const cacheInstances = {
  default: getCache('default'),
  memory: cacheService,
  
  // Helper methods
  get: async (key: string) => getCache('default').get(key),
  set: async (key: string, data: any, ttl?: number) => 
    getCache('default').set(key, data, ttl),
  delete: async (key: string) => getCache('default').delete(key),
  clear: async () => getCache('default').clear(),
};