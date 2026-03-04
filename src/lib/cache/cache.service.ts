import { redis, CACHE_CONFIG } from './redis.config';
import { devLogger } from '@/lib/logger';

/**
 * Serviço de Cache CYPHER AI v3.1.0 - CORRIGIDO
 * Cache robusto com fallback para memória local
 */

// Cache em memória mais robusto
interface CacheEntry {
  value: any;
  expiry: number;
  accessCount: number;
  lastAccess: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 1000;

// Limpeza automática do cache
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry < now) {
      memoryCache.delete(key);
      cleanedCount++;
    }
  }
  
  // LRU eviction se cache muito grande
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort(([,a], [,b]) => a.lastAccess - b.lastAccess);
    
    const toRemove = entries.slice(0, memoryCache.size - MAX_MEMORY_CACHE_SIZE);
    toRemove.forEach(([key]) => memoryCache.delete(key));
    
    cleanedCount += toRemove.length;
  }
  
  if (cleanedCount > 0) {
    devLogger.log('CACHE', `Cleaned ${cleanedCount} expired entries`);
  }
}, 5 * 60 * 1000); // A cada 5 minutos

export class CacheService {
  private redis = redis;
  private isRedisAvailable = false;

  constructor() {
    this.checkRedisConnection();
  }

  private async checkRedisConnection() {
    try {
      if (this.redis) {
        // Simple check if redis is available
        await this.redis.set('test', 'test', { ex: 1 });
        this.isRedisAvailable = true;
        devLogger.log('CACHE', 'Redis conectado com sucesso');
      }
    } catch (error) {
      this.isRedisAvailable = false;
      devLogger.log('CACHE', 'Redis indisponível - usando cache em memória');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Redis primeiro se disponível
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(key);
        if (value !== null) {
          devLogger.performance(`Cache Hit (Redis): ${key}`, Date.now() - startTime);
          return value as T;
        }
      }

      // Fallback para memória
      const cached = memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        // Atualizar estatísticas de acesso
        cached.accessCount++;
        cached.lastAccess = Date.now();
        
        devLogger.performance(`Cache Hit (Memory): ${key}`, Date.now() - startTime);
        return cached.value;
      }

      devLogger.log('CACHE', `Cache Miss: ${key}`);
      return null;
    } catch (error) {
      devLogger.error(error as Error, `Erro ao buscar cache: ${key}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || CACHE_CONFIG.TTL.DEFAULT;
    
    try {
      // Redis se disponível
      if (this.isRedisAvailable && this.redis) {
        await this.redis.set(key, value, { ex: ttl });
      }

      // Sempre salvar na memória
      memoryCache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000),
        accessCount: 1,
        lastAccess: Date.now()
      });
      
      devLogger.log('CACHE', `Cached: ${key} por ${ttl}s`);
      
    } catch (error) {
      devLogger.error(error as Error, `Erro ao salvar cache: ${key}`);
      // Continuar com cache em memória mesmo se Redis falhar
      memoryCache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000),
        accessCount: 1,
        lastAccess: Date.now()
      });
    }
  }

  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    devLogger.log('CACHE', `Computing value for: ${key}`);
    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  getStatus() {
    return {
      redis: this.isRedisAvailable,
      memorySize: memoryCache.size,
      memoryKeys: Array.from(memoryCache.keys()).slice(0, 10), // Apenas os primeiros 10
    };
  }
}

export const cacheService = new CacheService();

export const cacheKeys = {
  bitcoinPrice: () => 'bitcoin:price:current',
  ordinals: (page: number) => `ordinals:list:page:${page}`,
  miningData: () => 'mining:stats:current',
  marketOverview: () => 'market:overview',
  portfolio: (userId: string) => `portfolio:${userId}`,
  analytics: (metric: string) => `analytics:${metric}`,
  arbitrage: () => 'arbitrage:opportunities',
};

export const cacheTTL = {
  default: CACHE_CONFIG.TTL.DEFAULT,
  prices: CACHE_CONFIG.TTL.PRICE,
  marketData: CACHE_CONFIG.TTL.MARKET_DATA,
  ordinals: CACHE_CONFIG.TTL.ORDINALS,
  runes: CACHE_CONFIG.TTL.RUNES,
  userData: CACHE_CONFIG.TTL.USER_DATA
};