/**
 * CYPHER ORDI FUTURE v3.1.0 - Cache Service
 * Sistema de cache avançado para aplicação
 */

import { devLogger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Máximo de entradas no cache

  set<T>(key: string, data: T, ttlSeconds: number): void {
    // Limpar cache se estiver muito grande
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    };

    this.cache.set(key, entry);
    devLogger.log('Cache', `Set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar se expirou
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      devLogger.log('Cache', `Expired: ${key}`);
      return null;
    }

    devLogger.log('Cache', `Hit: ${key}`);
    return entry.data as T;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      devLogger.log('Cache', `Deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    devLogger.log('Cache', 'Cleared all entries');
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Se ainda estiver cheio, remover os mais antigos
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.floor(this.maxSize * 0.2); // Remove 20%
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      devLogger.log('Cache', `Cleanup: removed ${cleaned} entries`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Fallback Provider Interface
interface FallbackProvider<T> {
  name: string;
  endpoint: string;
  fetchFn: () => Promise<T>;
}

class CacheService {
  private cache = new MemoryCache();

  async get<T>(key: string, fetchFn?: () => Promise<T>, config?: { ttl?: number; staleWhileRevalidate?: boolean }): Promise<T | null> {
    const cached = this.cache.get<T>(key);
    if (cached !== null) return cached;

    // If a fetch function is provided, use it as a cache-aside pattern
    if (fetchFn) {
      try {
        const data = await fetchFn();
        const ttl = config?.ttl ?? 300;
        this.cache.set(key, data, ttl);
        return data;
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  async set<T>(key: string, data: T, ttlOrOptions: number | { ttl?: number; staleWhileRevalidate?: boolean } = 300): Promise<void> {
    const ttlSeconds = typeof ttlOrOptions === 'number' ? ttlOrOptions : (ttlOrOptions.ttl ? ttlOrOptions.ttl / 1000 : 300);
    this.cache.set(key, data, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async clearPattern(pattern: string): Promise<void> {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Busca dados com sistema de fallback inteligente
   */
  async getWithFallback<T>(
    key: string,
    providers: FallbackProvider<T>[],
    ttlSeconds: number
  ): Promise<T> {
    // Tentar cache primeiro
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Ordenar providers por prioridade (pode ser customizado)
    const sortedProviders = [...providers];

    let lastError: Error | null = null;

    for (const provider of sortedProviders) {
      try {
        devLogger.log('API', `Trying provider: ${provider.name} for ${provider.endpoint}`);
        
        const data = await provider.fetchFn();
        
        // Cache o resultado
        await this.set(key, data, ttlSeconds);
        
        devLogger.log('API', `Success with provider: ${provider.name}`);
        return data;

      } catch (error) {
        lastError = error as Error;
        devLogger.error(lastError, `Provider ${provider.name} failed`);
        continue;
      }
    }

    // Todos os providers falharam
    throw lastError || new Error('All providers failed');
  }

  /**
   * Get or compute: cache-aside pattern
   * Returns cached value if available, otherwise computes and caches it
   */
  async getOrCompute<T>(key: string, computeFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const value = await computeFn();
    await this.set(key, value, ttlSeconds ?? 300);
    return value;
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Export cache TTL and keys configurations
export const cacheTTL = {
  BITCOIN_PRICE: 30, // 30 seconds
  MARKET_DATA: 60, // 1 minute
  ORDINALS_DATA: 300, // 5 minutes
  RUNES_DATA: 300, // 5 minutes
  MINING_DATA: 600, // 10 minutes
  NEWS_DATA: 1800, // 30 minutes
  STATIC_DATA: 3600, // 1 hour
  LONG_TERM: 86400, // 24 hours
};

export const cacheKeys: Record<string, any> & {
  BITCOIN_PRICE: string;
  MARKET_DATA: string;
  ORDINALS_COLLECTIONS: string;
  ORDINALS_ACTIVITY: string;
  RUNES_LIST: string;
  RUNES_ACTIVITY: string;
  MINING_POOLS: string;
  MINING_DIFFICULTY: string;
  NEWS_FEED: string;
  NETWORK_HEALTH: string;
  MEMPOOL_DATA: string;
  gamma: (key: string) => string;
  quicknode: (key: string) => string;
  glassnode: (key: string) => string;
  binance: (key: string) => string;
  bitcoinPrice: () => string;
} = {
  BITCOIN_PRICE: 'bitcoin:price',
  MARKET_DATA: 'market:data',
  ORDINALS_COLLECTIONS: 'ordinals:collections',
  ORDINALS_ACTIVITY: 'ordinals:activity',
  RUNES_LIST: 'runes:list',
  RUNES_ACTIVITY: 'runes:activity',
  MINING_POOLS: 'mining:pools',
  MINING_DIFFICULTY: 'mining:difficulty',
  NEWS_FEED: 'news:feed',
  NETWORK_HEALTH: 'network:health',
  MEMPOOL_DATA: 'mempool:data',
  gamma: (key: string) => `gamma:${key}`,
  quicknode: (key: string) => `quicknode:${key}`,
  glassnode: (key: string) => `glassnode:${key}`,
  binance: (key: string) => `binance:${key}`,
  bitcoinPrice: () => 'bitcoin:price',
};

// Cache configuration presets used by API services
export const cacheConfigs = {
  short: { ttl: 30, staleWhileRevalidate: true },     // 30s - real-time data
  medium: { ttl: 300, staleWhileRevalidate: true },    // 5min - market data
  long: { ttl: 3600, staleWhileRevalidate: false },    // 1h - static data
  day: { ttl: 86400, staleWhileRevalidate: false },    // 24h - rarely changing
};