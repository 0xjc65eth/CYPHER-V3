import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * SECURITY: Global rate limiter for all API routes (Edge Runtime compatible).
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory Map otherwise (resets on cold start - not ideal for prod).
 *
 * To enable persistent rate limiting on Vercel:
 * 1. Create free account at https://upstash.com
 * 2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 200;
const RATE_LIMIT_MAX_REQUESTS_SENSITIVE = 20;

const SENSITIVE_PATHS = [
  '/api/trade',
  '/api/trading/',
  '/api/arbitrage/execute',
  '/api/arbitrage/auto-trade',
  '/api/agent/session-keys',
  '/api/auth/',
  '/api/admin/',
  '/api/ai/',
  '/api/swap/',
  '/api/portfolio/execute-transaction',
  '/api/fees/distribute',
  '/api/fees/collect',
];

// Upstash rate limiters (persistent across Vercel instances)
let upstashGlobalLimiter: Ratelimit | null = null;
let upstashSensitiveLimiter: Ratelimit | null = null;

function getUpstashLimiters(): { global: Ratelimit; sensitive: Ratelimit } | null {
  if (upstashGlobalLimiter && upstashSensitiveLimiter) {
    return { global: upstashGlobalLimiter, sensitive: upstashSensitiveLimiter };
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redis = new Redis({ url, token });
    upstashGlobalLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS, '1 m'),
      prefix: 'rl:global',
    });
    upstashSensitiveLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQUESTS_SENSITIVE, '1 m'),
      prefix: 'rl:sensitive',
    });
    return { global: upstashGlobalLimiter, sensitive: upstashSensitiveLimiter };
  } catch {
    return null;
  }
}

// In-memory fallback rate limit store
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS * 2) return;
  lastCleanup = now;
  for (const [key, value] of rateLimitStore) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}

async function checkRateLimit(ip: string, isSensitive: boolean): Promise<{ allowed: boolean; remaining: number }> {
  // Try Upstash first (persistent, shared across instances)
  const upstash = getUpstashLimiters();
  if (upstash) {
    const limiter = isSensitive ? upstash.sensitive : upstash.global;
    const key = isSensitive ? `${ip}:sensitive` : ip;
    const result = await limiter.limit(key);
    return { allowed: result.success, remaining: result.remaining };
  }

  // Fallback to in-memory (resets on cold start)
  cleanupRateLimitStore();
  const now = Date.now();
  const maxRequests = isSensitive ? RATE_LIMIT_MAX_REQUESTS_SENSITIVE : RATE_LIMIT_MAX_REQUESTS;
  const key = isSensitive ? `${ip}:sensitive` : ip;
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}

export async function middleware(request: NextRequest) {
  // Redirect /quicktrade to canonical /quick-trade
  if (request.nextUrl.pathname === '/quicktrade' || request.nextUrl.pathname.startsWith('/quicktrade/')) {
    const url = request.nextUrl.clone();
    url.pathname = url.pathname.replace(/^\/quicktrade/, '/quick-trade');
    return NextResponse.redirect(url, 308);
  }

  // SECURITY: Rate limiting global para todas as API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const pathname = request.nextUrl.pathname;
    const isSensitive = SENSITIVE_PATHS.some(p => pathname.startsWith(p));

    const { allowed } = await checkRateLimit(ip, isSensitive);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later.',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(RATE_LIMIT_WINDOW_MS / 1000).toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  const response = NextResponse.next();

  // CORS headers for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');

    // Same-origin detection: compare origin with the Host header.
    // request.nextUrl.origin can differ from the actual host (e.g. port mismatch
    // in dev), so we build the expected origin from the Host header instead.
    const hostHeader = request.headers.get('host') || request.nextUrl.host;
    const protocol = request.nextUrl.protocol || 'http:';
    const expectedOrigin = `${protocol}//${hostHeader}`;
    const isSameOrigin = !origin || origin === expectedOrigin
      || origin === `http://${hostHeader}` || origin === `https://${hostHeader}`;

    const allowedOrigins = [
      'https://cypherordifuture.xyz',
      'https://www.cypherordifuture.xyz',
      'http://localhost:4444',
      'https://localhost:4444',
      'http://127.0.0.1:4444',
      process.env.NEXTAUTH_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ].filter(Boolean) as string[];

    // Normalize origin — strip www. and trailing slashes for matching
    const normalizeUrl = (u: string) => u.replace(/^(https?:\/\/)www\./, '$1').replace(/\/+$/, '');

    const isAllowedOrigin = origin && (
      allowedOrigins.includes(origin) ||
      allowedOrigins.map(normalizeUrl).includes(normalizeUrl(origin))
    );

    if (isSameOrigin || isAllowedOrigin) {
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      // Cross-origin request from unknown origin — deny mutating methods
      const method = request.method.toUpperCase();
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        return NextResponse.json({ error: 'Forbidden', origin }, { status: 403 });
      }
    }
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
  }

  // Security headers for all routes
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  // SECURITY: 'unsafe-eval' REMOVIDO - era vetor critico de XSS.
  // TradingView charts funcionam via iframe (frame-src adicionado).
  // 'unsafe-inline' mantido pois Next.js hydration requer.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://api.coingecko.com https://assets.coingecko.com https://coin-images.coingecko.com https://ordinals.com https://ordinals.hiro.so https://img-cdn.magiceden.dev https://creator-hub-prod.s3.us-east-2.amazonaws.com https://bis-ord-content.fra1.cdn.digitaloceanspaces.com",
      "connect-src 'self' https://cypherordifuture.xyz https://*.vercel.app https://api.coingecko.com https://pro-api.coingecko.com https://mempool.space https://api.hiro.so https://open-api.unisat.io https://api.bestinslot.xyz https://api.hyperliquid.xyz https://api.binance.com https://data-api.binance.vision https://api.coinbase.com https://api.kraken.com https://api.bybit.com https://www.okx.com https://api-pub.bitfinex.com https://api.kucoin.com https://api.gateio.ws https://api.alternative.me wss://stream.binance.com wss://ws-feed.exchange.coinbase.com https://query1.finance.yahoo.com https://api.worldbank.org https://api.bls.gov https://api.fiscaldata.treasury.gov",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'self' https://s3.tradingview.com https://*.tradingview.com",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match only API routes and pages, exclude static assets
     */
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.js$|.*\\.css$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.woff$|.*\\.woff2$|.*\\.ttf$|.*\\.eot$).*)'
  ],
};
