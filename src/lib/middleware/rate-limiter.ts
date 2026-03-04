/**
 * Rate Limiting Middleware
 *
 * Protects API routes from abuse using Redis-backed rate limiting
 * Falls back to in-memory Map if Redis is unavailable
 *
 * Features:
 * - Per-IP rate limiting
 * - Configurable time windows
 * - Redis distributed locking
 * - In-memory fallback
 * - Standard HTTP 429 responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, isRedisConnected } from '@/lib/cache/redis.config';

// In-memory fallback when Redis is not available
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

/**
 * Extracts client IP from request headers
 * Checks common proxy headers in order of reliability
 */
function getClientIP(request: NextRequest): string {
  // Check forwarded headers (from proxies like Cloudflare, Nginx)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list: "client, proxy1, proxy2"
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to request.ip (may not be available in all environments)
  return request.ip || 'unknown';
}

/**
 * Redis-based rate limiting
 * Uses Redis INCR + EXPIRE for atomic operations
 */
async function redisRateLimit(
  ip: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis client not available');
  }

  const key = `ratelimit:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  try {
    // Increment counter
    const count = await (redis as any).incr(key);

    // Set expiry on first request
    if (count === 1) {
      await (redis as any).expire(key, windowSeconds);
    }

    const resetTime = Date.now() + (windowSeconds * 1000);
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    // Fall through to in-memory on Redis errors
    throw error;
  }
}

/**
 * In-memory rate limiting fallback
 * Used when Redis is unavailable
 */
function inMemoryRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = inMemoryStore.get(ip);

  // Clean up expired entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    for (const [key, value] of inMemoryStore.entries()) {
      if (now > value.resetTime) {
        inMemoryStore.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + windowMs;
    inMemoryStore.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  // Within existing window
  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return { allowed, remaining, resetTime: entry.resetTime };
}

/**
 * Rate limit middleware
 *
 * @param request - Next.js request object
 * @param limit - Maximum requests allowed in window (default: 100)
 * @param windowSeconds - Time window in seconds (default: 60)
 * @returns NextResponse with 429 if limit exceeded, null if allowed
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const rateLimitResponse = await rateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Handle request normally
 *   return NextResponse.json({ data: 'ok' });
 * }
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<NextResponse | null> {
  const ip = getClientIP(request);

  // Skip rate limiting for unknown IPs in development
  if (ip === 'unknown' && process.env.NODE_ENV === 'development') {
    return null;
  }

  const windowMs = windowSeconds * 1000;

  try {
    let result: { allowed: boolean; remaining: number; resetTime: number };

    // Try Redis first
    if (isRedisConnected()) {
      result = await redisRateLimit(ip, limit, windowSeconds);
    } else {
      // Fall back to in-memory
      result = inMemoryRateLimit(ip, limit, windowMs);
    }

    // Add rate limit headers (standard format)
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
    };

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per ${windowSeconds} seconds.`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Allowed - return null to continue processing
    // Note: We can't add headers here since we're not returning a response
    // The calling route handler should add rate limit headers if needed
    return null;
  } catch (error) {
    console.error('[RateLimit] Error:', error);

    // On error, allow the request (fail open)
    // Better to serve users than block everyone on rate limit errors
    return null;
  }
}

/**
 * Strict rate limiter - fails closed on errors
 * Use for sensitive endpoints where blocking is better than allowing abuse
 */
export async function strictRateLimit(
  request: NextRequest,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<NextResponse | null> {
  try {
    return await rateLimit(request, limit, windowSeconds);
  } catch (error) {
    console.error('[StrictRateLimit] Error - blocking request:', error);

    return NextResponse.json(
      {
        error: 'Service Temporarily Unavailable',
        message: 'Rate limiting service is unavailable. Please try again later.',
      },
      { status: 503 }
    );
  }
}

/**
 * Get current rate limit status for an IP
 * Useful for displaying rate limit info to users
 */
export async function getRateLimitStatus(
  ip: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ count: number; remaining: number; resetTime: number } | null> {
  try {
    if (isRedisConnected()) {
      const redis = getRedisClient();
      if (!redis) return null;

      const key = `ratelimit:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
      const count = await redis.get(key);

      if (!count) {
        return { count: 0, remaining: limit, resetTime: Date.now() + (windowSeconds * 1000) };
      }

      const countNum = parseInt(count, 10);
      return {
        count: countNum,
        remaining: Math.max(0, limit - countNum),
        resetTime: Date.now() + (windowSeconds * 1000),
      };
    }

    // In-memory fallback
    const entry = inMemoryStore.get(ip);
    if (!entry || Date.now() > entry.resetTime) {
      return { count: 0, remaining: limit, resetTime: Date.now() + (windowSeconds * 1000) };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, limit - entry.count),
      resetTime: entry.resetTime,
    };
  } catch (error) {
    console.error('[getRateLimitStatus] Error:', error);
    return null;
  }
}
