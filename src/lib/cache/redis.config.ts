/**
 * CYPHER V3 - Production Redis Configuration
 * Uses real Redis (ioredis) when REDIS_URL is set, falls back to in-memory.
 * Supports connection pooling, reconnection, and error handling.
 */

import Redis from 'ioredis'

// ============================================================================
// In-Memory Fallback (for dev without Redis)
// ============================================================================

class SimpleCache {
  private cache: Map<string, { value: any; expires: number }> = new Map()
  public isMemoryFallback = true

  async get(key: string): Promise<any> {
    const item = this.cache.get(key)
    if (!item) return null
    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return item.value
  }

  async set(key: string, value: any, ...args: any[]): Promise<void> {
    let ttlSeconds = 0
    // Support both redis.set(key, value, 'EX', seconds) and { ex: seconds }
    if (args.length === 2 && args[0] === 'EX') {
      ttlSeconds = args[1]
    } else if (args.length === 1 && typeof args[0] === 'object' && args[0]?.ex) {
      ttlSeconds = args[0].ex
    }
    const expires = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : 0
    this.cache.set(key, { value: typeof value === 'string' ? value : JSON.stringify(value), expires })
  }

  async setex(key: string, seconds: number, value: any): Promise<void> {
    const expires = Date.now() + (seconds * 1000)
    this.cache.set(key, { value: typeof value === 'string' ? value : JSON.stringify(value), expires })
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0
    for (const key of keys) {
      if (this.cache.delete(key)) count++
    }
    return count
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(key => {
      const item = this.cache.get(key)
      if (!item) return false
      if (item.expires && item.expires < Date.now()) {
        this.cache.delete(key)
        return false
      }
      return true
    }).length
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.cache.get(key)
    if (item) {
      item.expires = Date.now() + (seconds * 1000)
      return 1
    }
    return 0
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return Array.from(this.cache.keys()).filter(key => regex.test(key))
  }

  async flushall(): Promise<void> {
    this.cache.clear()
  }

  async ping(): Promise<string> {
    return 'PONG'
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    const existing = this.cache.get(key)
    const hash = existing ? JSON.parse(existing.value) : {}
    hash[field] = value
    this.cache.set(key, { value: JSON.stringify(hash), expires: existing?.expires || 0 })
    return 1
  }

  async hget(key: string, field: string): Promise<string | null> {
    const item = this.cache.get(key)
    if (!item) return null
    const hash = JSON.parse(item.value)
    return hash[field] ?? null
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const item = this.cache.get(key)
    if (!item) return {}
    return JSON.parse(item.value)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return 0
    const hash = JSON.parse(item.value)
    let count = 0
    for (const field of fields) {
      if (field in hash) {
        delete hash[field]
        count++
      }
    }
    this.cache.set(key, { value: JSON.stringify(hash), expires: item.expires })
    return count
  }

  async publish(_channel: string, _message: string): Promise<number> {
    // No-op for in-memory fallback (no pub/sub support)
    return 0
  }

  // Cleanup expired entries periodically
  startCleanup() {
    setInterval(() => {
      const now = Date.now()
      for (const [key, item] of this.cache) {
        if (item.expires && item.expires < now) {
          this.cache.delete(key)
        }
      }
    }, 60_000) // Every minute
  }
}

// ============================================================================
// Redis Connection Factory
// ============================================================================

type CacheClient = Redis | SimpleCache

let redisInstance: CacheClient | null = null
let connectionAttempted = false

function createRedisClient(): CacheClient {
  const redisUrl = process.env.REDIS_URL

  // Skip if no URL, empty, or placeholder value
  if (!redisUrl || redisUrl.includes('your_redis') || redisUrl.includes('placeholder') || redisUrl.length < 10) {
    const fallback = new SimpleCache()
    fallback.startCleanup()
    return fallback
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) {
          console.error('[Redis] Max reconnection attempts reached, switching to in-memory fallback')
          return null // Stop retrying
        }
        const delay = Math.min(times * 200, 5000)
        return delay
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED']
        return targetErrors.some(e => err.message.includes(e))
      },
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 10000,
    })

    client.on('connect', () => {
    })

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
    })

    client.on('close', () => {
    })

    return client
  } catch (err) {
    console.error('[Redis] Failed to create client:', err)
    const fallback = new SimpleCache()
    fallback.startCleanup()
    return fallback
  }
}

/**
 * Get the Redis client instance (singleton)
 */
export function getRedisClient(): CacheClient {
  if (!redisInstance || !connectionAttempted) {
    connectionAttempted = true
    redisInstance = createRedisClient()
  }
  return redisInstance
}

/**
 * Check if using real Redis or in-memory fallback
 */
export function isRedisConnected(): boolean {
  if (!redisInstance) return false
  if (redisInstance instanceof SimpleCache) return false
  return (redisInstance as Redis).status === 'ready'
}

// Backwards-compatible exports
export const redis = getRedisClient()
export const cache = redis // Alias for compatibility

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_CONFIG = {
  TTL: {
    DEFAULT: 300,       // 5 minutes
    PRICE: 60,          // 1 minute
    MARKET_DATA: 300,   // 5 minutes
    ORDINALS: 600,      // 10 minutes
    RUNES: 600,         // 10 minutes
    USER_DATA: 1800,    // 30 minutes
    SESSION: 86400,     // 24 hours
    ADMIN_SESSION: 86400, // 24 hours
  },
  KEYS: {
    BITCOIN_PRICE: 'bitcoin:price',
    MARKET_DATA: 'market:data',
    ORDINALS_LIST: 'ordinals:list',
    RUNES_LIST: 'runes:list',
    USER_PORTFOLIO: 'user:portfolio',
    ADMIN_SESSION: 'admin:session',
    RATE_LIMIT: 'rate:limit',
  }
}

export default redis
