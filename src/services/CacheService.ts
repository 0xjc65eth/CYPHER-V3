/**
 * Advanced Caching Service
 * Provides intelligent caching with TTL, LRU eviction, and memory management
 */

import { logger } from '@/lib/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  serialize?: boolean; // Whether to serialize complex objects
  namespace?: string; // Cache namespace for isolation
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  oldestEntry?: number;
  newestEntry?: number;
  namespaces: string[];
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl || 300000; // 5 minutes default
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Generate cache key with namespace
   */
  private generateKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      return str.length * 2; // Rough estimate: 2 bytes per character
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entries to make space
   */
  private evictLRU(spaceNeeded: number = 1): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let removedCount = 0;
    for (const [key] of entries) {
      if (this.cache.size <= this.maxSize - spaceNeeded) {
        break;
      }
      this.cache.delete(key);
      removedCount++;
    }

    if (removedCount > 0) {
      logger.debug(`Evicted ${removedCount} LRU cache entries`);
    }
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const fullKey = this.generateKey(key, options.namespace);
    const ttl = options.ttl || this.defaultTTL;
    const now = Date.now();
    
    // Serialize if needed
    const processedData = options.serialize ? JSON.parse(JSON.stringify(data)) : data;
    
    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size: this.estimateSize(processedData),
    };

    // Check if we need space
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(fullKey, entry);
  }

  /**
   * Get cache entry
   */
  get<T>(key: string, namespace?: string): T | null {
    const fullKey = this.generateKey(key, namespace);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string, namespace?: string): boolean {
    const fullKey = this.generateKey(key, namespace);
    const entry = this.cache.get(fullKey);
    
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string, namespace?: string): boolean {
    const fullKey = this.generateKey(key, namespace);
    return this.cache.delete(fullKey);
  }

  /**
   * Clear all cache entries or entries in a specific namespace
   */
  clear(namespace?: string): void {
    if (namespace) {
      const keysToDelete = Array.from(this.cache.keys())
        .filter(key => key.startsWith(`${namespace}:`));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
      this.stats.hits = 0;
      this.stats.misses = 0;
    }
  }

  /**
   * Get or set with function (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key, options.namespace);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Cache fetcher failed:');
      throw error;
    }
  }

  /**
   * Get or compute with function (alias for getOrSet for compatibility)
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T> | T,
    ttlSeconds?: number
  ): Promise<T> {
    return this.getOrSet(key, computeFn, ttlSeconds !== undefined ? { ttl: ttlSeconds } : {});
  }

  /**
   * Batch get multiple keys
   */
  mget<T>(keys: string[], namespace?: string): (T | null)[] {
    return keys.map(key => this.get<T>(key, namespace));
  }

  /**
   * Batch set multiple key-value pairs
   */
  mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): void {
    entries.forEach(({ key, value, options = {} }) => {
      this.set(key, value, options);
    });
  }

  /**
   * Get all keys, optionally filtered by namespace
   */
  keys(namespace?: string): string[] {
    const allKeys = Array.from(this.cache.keys());
    
    if (namespace) {
      return allKeys
        .filter(key => key.startsWith(`${namespace}:`))
        .map(key => key.replace(`${namespace}:`, ''));
    }
    
    return allKeys;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map(entry => entry.timestamp);
    
    const namespaces = Array.from(new Set(
      Array.from(this.cache.keys())
        .filter(key => key.includes(':'))
        .map(key => key.split(':')[0])
    ));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      totalSize,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
      namespaces,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }

    return expiredKeys.length;
  }

  /**
   * Get entries by namespace
   */
  getNamespaceEntries<T>(namespace: string): Array<{ key: string; value: T; entry: CacheEntry<T> }> {
    const results: Array<{ key: string; value: T; entry: CacheEntry<T> }> = [];
    
    for (const [fullKey, entry] of this.cache.entries()) {
      if (fullKey.startsWith(`${namespace}:`)) {
        const key = fullKey.replace(`${namespace}:`, '');
        if (!this.isExpired(entry)) {
          results.push({ key, value: entry.data, entry });
        }
      }
    }
    
    return results;
  }

  /**
   * Update TTL for existing entry
   */
  updateTTL(key: string, newTTL: number, namespace?: string): boolean {
    const fullKey = this.generateKey(key, namespace);
    const entry = this.cache.get(fullKey);
    
    if (entry && !this.isExpired(entry)) {
      entry.ttl = newTTL;
      entry.timestamp = Date.now(); // Reset timestamp
      return true;
    }
    
    return false;
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): {
    totalEntries: number;
    estimatedSizeBytes: number;
    estimatedSizeMB: number;
    averageEntrySize: number;
    largestEntry: number;
    smallestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const sizes = entries.map(entry => entry.size);
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);

    return {
      totalEntries: entries.length,
      estimatedSizeBytes: totalSize,
      estimatedSizeMB: totalSize / (1024 * 1024),
      averageEntrySize: totalSize / entries.length || 0,
      largestEntry: Math.max(...sizes, 0),
      smallestEntry: Math.min(...sizes, 0),
    };
  }

  /**
   * Export cache data (for backup/debugging)
   */
  export(namespace?: string): any {
    const data: any = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (namespace && !key.startsWith(`${namespace}:`)) {
        continue;
      }
      
      if (!this.isExpired(entry)) {
        const exportKey = namespace ? key.replace(`${namespace}:`, '') : key;
        data[exportKey] = {
          data: entry.data,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          accessCount: entry.accessCount,
        };
      }
    }
    
    return data;
  }

  /**
   * Import cache data
   */
  import(data: any, namespace?: string): number {
    let imported = 0;
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && 'data' in value) {
        const entry = value as any;
        this.set(key, entry.data, {
          ttl: entry.ttl,
          namespace,
        });
        imported++;
      }
    }
    
    return imported;
  }
}

// Global cache instance
export const globalCache = new CacheService({
  maxSize: 2000,
  ttl: 300000, // 5 minutes
});

export default globalCache;