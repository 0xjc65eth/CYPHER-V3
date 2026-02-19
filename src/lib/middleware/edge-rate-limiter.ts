/**
 * Edge Runtime Compatible Rate Limiter
 *
 * Lightweight rate limiting for Edge Runtime (middleware)
 * Uses only in-memory Map - no Redis, no Node.js APIs
 *
 * ⚠️ LIMITATION: In-memory only means:
 * - Resets on server restart
 * - Not shared across multiple instances
 * - Best for development and single-instance deployments
 *
 * For production with multiple instances, use the full rate-limiter
 * inside API routes (which run in Node.js runtime, not Edge).
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Global in-memory store (persists across requests within same instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Extracts client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;

  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;

  return request.ip || 'unknown';
}

/**
 * Clean up expired entries (called periodically)
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Edge-compatible rate limiter
 *
 * @param request - Next.js request
 * @param limit - Max requests per window (default: 100)
 * @param windowSeconds - Time window in seconds (default: 60)
 * @returns NextResponse with 429 if exceeded, null if allowed
 *
 * @example
 * ```typescript
 * // In middleware.ts (Edge Runtime):
 * import { edgeRateLimit } from '@/lib/middleware/edge-rate-limiter';
 *
 * export function middleware(request: NextRequest) {
 *   const rateLimitResponse = edgeRateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   return NextResponse.next();
 * }
 * ```
 */
export function edgeRateLimit(
  request: NextRequest,
  limit: number = 100,
  windowSeconds: number = 60
): NextResponse | null {
  const ip = getClientIP(request);

  // Skip for unknown IPs in development
  if (ip === 'unknown' && process.env.NODE_ENV === 'development') {
    return null;
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Create unique key per IP per time window
  const windowKey = Math.floor(now / windowMs);
  const key = `${ip}:${windowKey}`;

  // Periodic cleanup (1% chance per request)
  if (Math.random() < 0.01) {
    cleanupExpired();
  }

  const entry = rateLimitStore.get(key);

  if (!entry) {
    // First request in this window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });

    return null; // Allow
  }

  // Increment counter
  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  if (!allowed) {
    // Rate limit exceeded
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${limit} requests per ${windowSeconds} seconds.`,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
        },
      }
    );
  }

  // Allowed
  return null;
}

/**
 * Get current rate limit status
 */
export function getEdgeRateLimitStatus(ip: string): {
  count: number;
  limit: number;
  remaining: number;
} | null {
  const now = Date.now();

  // Find entry for this IP
  for (const [key, entry] of rateLimitStore.entries()) {
    if (key.startsWith(ip + ':') && now < entry.resetTime) {
      return {
        count: entry.count,
        limit: 100, // Default limit
        remaining: Math.max(0, 100 - entry.count),
      };
    }
  }

  return null;
}
