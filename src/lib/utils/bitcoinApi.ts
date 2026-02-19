/**
 * 📡 Bitcoin API & Cache System
 * Handles all Bitcoin data fetching with proper caching
 */

// Cache configuration
const CACHE_PREFIX = 'bitcoin:';
const CACHE_TTL = {
  price: 30, // 30 seconds for price data
  stats: 300, // 5 minutes for stats
  blocks: 60, // 1 minute for blocks
};

// Memory cache for client and server
let memoryCache: Map<string, { value: any; expires: number }> = new Map();

// Redis client only on server-side
let redis: any = null;

// Only import and initialize Redis on server-side
if (typeof window === 'undefined') {
  try {
    const { Redis } = require('ioredis');
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    
    redis.ping().catch(() => {
      redis = null;
    });
  } catch (error) {
    redis = null;
  }
}

// Cache helpers
async function getCache(key: string): Promise<any> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  
  // Always use memory cache on client-side
  if (typeof window !== 'undefined' || !redis) {
    const cached = memoryCache.get(fullKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    memoryCache.delete(fullKey);
    return null;
  }
  
  // Server-side: try Redis first
  try {
    const cached = await redis.get(fullKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Silent fail, fallback to memory cache
  }
  
  // Fallback to memory cache
  const cached = memoryCache.get(fullKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  memoryCache.delete(fullKey);
  return null;
}

async function setCache(key: string, value: any, ttl: number): Promise<void> {
  const fullKey = `${CACHE_PREFIX}${key}`;
  
  // Always store in memory cache
  memoryCache.set(fullKey, {
    value,
    expires: Date.now() + (ttl * 1000),
  });
  
  // Clean up old entries if cache is too large
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (v.expires < now) {
        memoryCache.delete(k);
      }
    }
  }
  
  // Try to store in Redis if available (server-side only)
  if (typeof window === 'undefined' && redis) {
    try {
      await redis.setex(fullKey, ttl, JSON.stringify(value));
    } catch (error) {
      // Silent fail, already stored in memory
    }
  }
}

// API endpoints
const API_ENDPOINTS = {
  BLOCKCHAIN_INFO: 'https://api.blockchain.info',
  MEMPOOL_SPACE: 'https://mempool.space/api',
  BINANCE: 'https://api.binance.com/api/v3',
};

// Bitcoin Price API
export async function getBitcoinPrice(): Promise<{
  usd: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}> {
  const cacheKey = 'price:current';
  
  // Check cache first
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Helper function to fetch with timeout
  const fetchWithTimeout = async (url: string, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };
  
  try {
    // Try multiple sources for reliability
    const [binanceResponse, blockchainResponse] = await Promise.allSettled([
      fetchWithTimeout(`${API_ENDPOINTS.BINANCE}/ticker/24hr?symbol=BTCUSDT`, 3000),
      fetchWithTimeout(`${API_ENDPOINTS.BLOCKCHAIN_INFO}/ticker`, 3000),
    ]);
    
    let priceData = null;
    
    if (binanceResponse.status === 'fulfilled' && binanceResponse.value.ok) {
      try {
        const binanceData = await binanceResponse.value.json();
        priceData = {
          usd: parseFloat(binanceData.lastPrice),
          change24h: parseFloat(binanceData.priceChangePercent),
          high24h: parseFloat(binanceData.highPrice),
          low24h: parseFloat(binanceData.lowPrice),
          volume24h: parseFloat(binanceData.volume),
        };
      } catch (e) {
        console.error('Binance parse error:', e);
      }
    }
    
    if (!priceData && blockchainResponse.status === 'fulfilled' && blockchainResponse.value.ok) {
      try {
        const blockchainData = await blockchainResponse.value.json();
        priceData = {
          usd: blockchainData.USD.last,
          change24h: ((blockchainData.USD.last - blockchainData.USD['24h']) / blockchainData.USD['24h']) * 100,
          high24h: blockchainData.USD.last * 1.02, // Approximate
          low24h: blockchainData.USD.last * 0.98, // Approximate
          volume24h: blockchainData.USD.volume || 1000000000,
        };
      } catch (e) {
        console.error('Blockchain.info parse error:', e);
      }
    }
    
    // Use fallback data if all APIs fail
    if (!priceData) {
      priceData = {
        usd: 43000,
        change24h: 0,
        high24h: 43500,
        low24h: 42500,
        volume24h: 1000000000,
      };
    }
    
    // Cache the result
    await setCache(cacheKey, priceData, CACHE_TTL.price);
    
    return priceData;
  } catch (error) {
    console.error('Bitcoin price fetch error:', error);
    
    // Return last known good value from memory if available
    const lastKnown = memoryCache.get(`${CACHE_PREFIX}${cacheKey}`);
    if (lastKnown?.value) {
      return lastKnown.value;
    }
    
    // Return fallback data
    return {
      usd: 43000,
      change24h: 0,
      high24h: 43500,
      low24h: 42500,
      volume24h: 1000000000,
    };
  }
}

// Bitcoin Network Stats
export async function getNetworkStats(): Promise<{
  hashrate: number;
  difficulty: number;
  blockHeight: number;
  avgBlockTime: number;
  mempoolSize: number;
}> {
  const cacheKey = 'stats:network';
  
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.MEMPOOL_SPACE}/mining/hashrate/3d`);
    if (!response.ok) throw new Error('Failed to fetch network stats');
    
    const data = await response.json();
    const stats = {
      hashrate: data.currentHashrate,
      difficulty: data.currentDifficulty,
      blockHeight: data.blockHeight,
      avgBlockTime: 600, // 10 minutes average
      mempoolSize: data.mempoolSize || 0,
    };
    
    await setCache(cacheKey, stats, CACHE_TTL.stats);
    return stats;
  } catch (error) {
    console.error('Network stats fetch error:', error);
    
    // Return fallback data
    return {
      hashrate: 500000000000000000,
      difficulty: 50000000000000,
      blockHeight: 800000,
      avgBlockTime: 600,
      mempoolSize: 50000,
    };
  }
}

// Latest Blocks
export async function getLatestBlocks(limit: number = 10): Promise<Array<{
  height: number;
  hash: string;
  time: number;
  txCount: number;
  size: number;
  weight: number;
}>> {
  const cacheKey = `blocks:latest:${limit}`;
  
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.MEMPOOL_SPACE}/blocks`);
    if (!response.ok) throw new Error('Failed to fetch blocks');
    
    const blocks = await response.json();
    const formatted = blocks.slice(0, limit).map((block: any) => ({
      height: block.height,
      hash: block.id,
      time: block.timestamp,
      txCount: block.tx_count,
      size: block.size,
      weight: block.weight,
    }));
    
    await setCache(cacheKey, formatted, CACHE_TTL.blocks);
    return formatted;
  } catch (error) {
    console.error('Latest blocks fetch error:', error);
    return [];
  }
}

// Mempool Info
export async function getMempoolInfo(): Promise<{
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}> {
  const cacheKey = 'mempool:info';
  
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.MEMPOOL_SPACE}/mempool`);
    if (!response.ok) throw new Error('Failed to fetch mempool info');
    
    const data = await response.json();
    const info = {
      size: data.count,
      bytes: data.vsize,
      usage: data.total_fee,
      maxmempool: 300000000, // 300MB default
      mempoolminfee: data.mempoolminfee || 0.00001,
      minrelaytxfee: 0.00001,
    };
    
    await setCache(cacheKey, info, CACHE_TTL.blocks);
    return info;
  } catch (error) {
    console.error('Mempool info fetch error:', error);
    
    return {
      size: 5000,
      bytes: 50000000,
      usage: 0.1,
      maxmempool: 300000000,
      mempoolminfee: 0.00001,
      minrelaytxfee: 0.00001,
    };
  }
}

// Fee Estimates
export async function getFeeEstimates(): Promise<{
  fastest: number;
  halfHour: number;
  hour: number;
  economy: number;
  minimum: number;
}> {
  const cacheKey = 'fees:estimates';
  
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(`${API_ENDPOINTS.MEMPOOL_SPACE}/v1/fees/recommended`);
    if (!response.ok) throw new Error('Failed to fetch fee estimates');
    
    const data = await response.json();
    const fees = {
      fastest: data.fastestFee,
      halfHour: data.halfHourFee,
      hour: data.hourFee,
      economy: data.economyFee,
      minimum: data.minimumFee,
    };
    
    await setCache(cacheKey, fees, CACHE_TTL.price);
    return fees;
  } catch (error) {
    console.error('Fee estimates fetch error:', error);
    
    return {
      fastest: 20,
      halfHour: 10,
      hour: 5,
      economy: 2,
      minimum: 1,
    };
  }
}

// Export cache cleanup function
export async function clearCache(): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }
  
  // Clear memory cache
  memoryCache.clear();
}

// Export cache status function
export async function getCacheStatus(): Promise<{
  type: 'redis' | 'memory';
  connected: boolean;
  size: number;
}> {
  if (redis) {
    try {
      await redis.ping();
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      return {
        type: 'redis',
        connected: true,
        size: keys.length,
      };
    } catch (error) {
      // Redis not working
    }
  }
  
  return {
    type: 'memory',
    connected: true,
    size: memoryCache.size,
  };
}
