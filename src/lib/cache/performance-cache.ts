/**
 * 🚀 Performance-Optimized Cache System
 * High-performance caching with intelligent invalidation and memory management
 */

import { LRUCache } from 'lru-cache';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  dependencies?: string[];
  tags?: string[];
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
  enableMetrics?: boolean;
  persistToDisk?: boolean;
  compressionLevel?: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsage: number;
  avgResponseTime: number;
  hitRate: number;
}

class PerformanceCache<T = any> {
  private cache: LRUCache<string, CacheEntry<T>>;
  private metrics: CacheMetrics;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private tagMap: Map<string, Set<string>> = new Map();
  private dependencyMap: Map<string, Set<string>> = new Map();
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      enableMetrics: options.enableMetrics ?? true,
      persistToDisk: options.persistToDisk ?? false,
      compressionLevel: options.compressionLevel || 0
    };

    this.cache = new LRUCache<string, CacheEntry<T>>({
      max: this.options.maxSize,
      ttl: this.options.defaultTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      dispose: (value, key) => {
        this.handleEviction(key, value);
      }
    });

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      avgResponseTime: 0,
      hitRate: 0
    };

    this.startCleanup();
  }

  async get(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.updateMetrics('miss');
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.updateMetrics('miss');
        return null;
      }

      // Update access statistics
      entry.hits++;
      entry.lastAccessed = Date.now();
      
      this.updateMetrics('hit', performance.now() - startTime);
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      this.updateMetrics('miss');
      return null;
    }
  }

  async set(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      tags?: string[];
      dependencies?: string[];
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<void> {
    try {
      const ttl = options?.ttl || this.options.defaultTTL;
      const now = Date.now();

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl,
        hits: 0,
        lastAccessed: now,
        dependencies: options?.dependencies,
        tags: options?.tags
      };

      // Handle tags
      if (options?.tags) {
        for (const tag of options.tags) {
          if (!this.tagMap.has(tag)) {
            this.tagMap.set(tag, new Set());
          }
          this.tagMap.get(tag)!.add(key);
        }
      }

      // Handle dependencies
      if (options?.dependencies) {
        for (const dep of options.dependencies) {
          if (!this.dependencyMap.has(dep)) {
            this.dependencyMap.set(dep, new Set());
          }
          this.dependencyMap.get(dep)!.add(key);
        }
      }

      this.cache.set(key, entry);
      this.updateMetrics('set');
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      
      if (entry) {
        // Clean up tags
        if (entry.tags) {
          for (const tag of entry.tags) {
            this.tagMap.get(tag)?.delete(key);
          }
        }

        // Clean up dependencies
        if (entry.dependencies) {
          for (const dep of entry.dependencies) {
            this.dependencyMap.get(dep)?.delete(key);
          }
        }
      }

      const deleted = this.cache.delete(key);
      if (deleted) {
        this.updateMetrics('delete');
      }
      
      return deleted;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagMap.get(tag);
    if (!keys) return 0;

    let invalidated = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        invalidated++;
      }
    }

    this.tagMap.delete(tag);
    return invalidated;
  }

  async invalidateByDependency(dependency: string): Promise<number> {
    const keys = this.dependencyMap.get(dependency);
    if (!keys) return 0;

    let invalidated = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        invalidated++;
      }
    }

    this.dependencyMap.delete(dependency);
    return invalidated;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.tagMap.clear();
    this.dependencyMap.clear();
    this.resetMetrics();
  }

  // Batch operations for better performance
  async mget(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key);
        result.set(key, value);
      })
    );

    return result;
  }

  async mset(entries: Array<{ key: string; data: T; options?: any }>): Promise<void> {
    await Promise.all(
      entries.map(async ({ key, data, options }) => {
        await this.set(key, data, options);
      })
    );
  }

  // Cache warming - preload frequently accessed data
  async warm(
    loaders: Array<{
      key: string;
      loader: () => Promise<T>;
      options?: any;
    }>
  ): Promise<void> {
    
    await Promise.all(
      loaders.map(async ({ key, loader, options }) => {
        try {
          if (!this.cache.has(key)) {
            const data = await loader();
            await this.set(key, data, options);
          }
        } catch (error) {
          console.error(`Cache warming failed for key ${key}:`, error);
        }
      })
    );
  }

  // Get cache statistics
  getMetrics(): CacheMetrics & { size: number; tags: number; dependencies: number } {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    
    return {
      ...this.metrics,
      hitRate: totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0,
      size: this.cache.size,
      tags: this.tagMap.size,
      dependencies: this.dependencyMap.size
    };
  }

  // Memory optimization
  async optimize(): Promise<void> {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToRemove.push(key);
      }
    }

    // Remove least accessed entries if cache is near capacity
    if (this.cache.size > this.options.maxSize * 0.9) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
        .slice(0, Math.floor(this.options.maxSize * 0.1));

      keysToRemove.push(...entries.map(([key]) => key));
    }

    // Batch delete for better performance
    await Promise.all(keysToRemove.map(key => this.delete(key)));

  }

  // Persistence (basic implementation)
  async persist(): Promise<void> {
    if (!this.options.persistToDisk) return;

    try {
      const data = JSON.stringify({
        entries: Array.from(this.cache.entries()),
        tags: Array.from(this.tagMap.entries()).map(([tag, keys]) => [tag, Array.from(keys)]),
        dependencies: Array.from(this.dependencyMap.entries()).map(([dep, keys]) => [dep, Array.from(keys)]),
        metrics: this.metrics
      });

      // In a real implementation, you'd write to disk or send to a service
      localStorage.setItem('performance-cache', data);
    } catch (error) {
      console.error('Cache persistence error:', error);
    }
  }

  async restore(): Promise<void> {
    if (!this.options.persistToDisk) return;

    try {
      const data = localStorage.getItem('performance-cache');
      if (!data) return;

      const parsed = JSON.parse(data);
      
      // Restore entries
      for (const [key, entry] of parsed.entries) {
        if (!this.isExpired(entry)) {
          this.cache.set(key, entry);
        }
      }

      // Restore tags
      for (const [tag, keys] of parsed.tags) {
        this.tagMap.set(tag, new Set(keys));
      }

      // Restore dependencies
      for (const [dep, keys] of parsed.dependencies) {
        this.dependencyMap.set(dep, new Set(keys));
      }

      // Restore metrics
      this.metrics = { ...this.metrics, ...parsed.metrics };
    } catch (error) {
      console.error('Cache restoration error:', error);
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateMetrics(operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction', responseTime?: number): void {
    if (!this.options.enableMetrics) return;

    const keyMap: Record<string, keyof CacheMetrics> = {
      hit: 'hits',
      miss: 'misses',
      set: 'sets',
      delete: 'deletes',
      eviction: 'evictions'
    };
    const metricKey = keyMap[operation];
    if (metricKey) {
      (this.metrics[metricKey] as number)++;
    }
    
    if (responseTime) {
      const totalRequests = this.metrics.hits + this.metrics.misses;
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }

    // Update memory usage estimation
    this.metrics.memoryUsage = this.cache.size * 100; // Rough estimation
  }

  private handleEviction(key: string, entry: CacheEntry<T>): void {
    this.metrics.evictions++;
    
    // Clean up tags and dependencies
    if (entry.tags) {
      for (const tag of entry.tags) {
        this.tagMap.get(tag)?.delete(key);
      }
    }

    if (entry.dependencies) {
      for (const dep of entry.dependencies) {
        this.dependencyMap.get(dep)?.delete(key);
      }
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.optimize();
      if (this.options.persistToDisk) {
        await this.persist();
      }
    }, this.options.cleanupInterval);
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      avgResponseTime: 0,
      hitRate: 0
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    this.tagMap.clear();
    this.dependencyMap.clear();
  }
}

// Create cache instances for different data types
export const performanceCaches = {
  // Market data cache - short TTL, high frequency
  market: new PerformanceCache({
    maxSize: 500,
    defaultTTL: 30000, // 30 seconds
    enableMetrics: true
  }),

  // Price data cache - very short TTL
  prices: new PerformanceCache({
    maxSize: 200,
    defaultTTL: 10000, // 10 seconds
    enableMetrics: true
  }),

  // User data cache - medium TTL
  user: new PerformanceCache({
    maxSize: 100,
    defaultTTL: 300000, // 5 minutes
    enableMetrics: true,
    persistToDisk: true
  }),

  // Static data cache - long TTL
  static: new PerformanceCache({
    maxSize: 1000,
    defaultTTL: 3600000, // 1 hour
    enableMetrics: true,
    persistToDisk: true
  }),

  // API response cache - medium TTL with dependencies
  api: new PerformanceCache({
    maxSize: 800,
    defaultTTL: 180000, // 3 minutes
    enableMetrics: true
  })
};

// Cache manager for coordinating multiple caches
export class CacheManager {
  private caches: Map<string, PerformanceCache> = new Map();

  constructor() {
    // Register default caches
    Object.entries(performanceCaches).forEach(([name, cache]) => {
      this.caches.set(name, cache);
    });
  }

  getCache(name: string): PerformanceCache | undefined {
    return this.caches.get(name);
  }

  async invalidateAll(): Promise<void> {
    await Promise.all(
      Array.from(this.caches.values()).map(cache => cache.clear())
    );
  }

  async optimizeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.caches.values()).map(cache => cache.optimize())
    );
  }

  getAllMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      metrics[name] = cache.getMetrics();
    }

    return metrics;
  }

  async warmAllCaches(): Promise<void> {
    
    // Warm market data cache
    await performanceCaches.market.warm([
      {
        key: 'btc-price',
        loader: async () => {
          const response = await fetch('/api/prices/btc/');
          return response.json();
        },
        options: { tags: ['prices', 'btc'] }
      }
    ]);
  }

  destroy(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}

export const cacheManager = new CacheManager();

// Utility functions
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

export function withCache<T>(
  cache: PerformanceCache<T>,
  key: string,
  loader: () => Promise<T>,
  options?: any
): Promise<T> {
  return cache.get(key).then(async (cached) => {
    if (cached !== null) {
      return cached;
    }

    const data = await loader();
    await cache.set(key, data, options);
    return data;
  });
}

export default PerformanceCache;