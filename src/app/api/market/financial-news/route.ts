import { NextRequest, NextResponse } from 'next/server';
import { newsAPIService } from '@/services/newsapi/NewsAPIService';
import { getRedisClient } from '@/lib/cache/redis.config';

const CACHE_KEY = 'market:financial-news';
const CACHE_TTL = 1800; // 30 minutes

// In-memory fallback cache
const memCache = new Map<string, { data: unknown; expiresAt: number }>();
function memGet(key: string) {
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { memCache.delete(key); return null; }
  return e.data;
}
function memSet(key: string, data: unknown, ttl: number) {
  memCache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
}

// Get from any available cache layer (Redis first, then memory)
async function getCached(): Promise<unknown | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached as string);
  } catch {
    // Redis unavailable, fall through to memory cache
  }
  return memGet(CACHE_KEY);
}

// Set to all available cache layers
async function setCached(data: unknown): Promise<void> {
  memSet(CACHE_KEY, data, CACHE_TTL);
  try {
    const redis = getRedisClient();
    await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);
  } catch {
    // Redis unavailable, memory cache already set
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cached = await getCached();
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
      });
    }

    // Fetch market news
    const articles = await newsAPIService.getMarketNews();

    const data = {
      articles,
      count: articles.length,
      timestamp: Date.now(),
    };

    // Cache the result
    await setCached(data);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });
  } catch (error) {
    console.error('[financial-news] Route error:', error);

    // On 429 or any error, try to serve stale cached data
    const stale = await getCached();
    if (stale) {
      return NextResponse.json(stale, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=1800' },
      });
    }

    // No cache available at all — return empty articles with warning instead of 500
    return NextResponse.json(
      {
        articles: [],
        count: 0,
        timestamp: Date.now(),
        warning: 'News temporarily unavailable. Please try again later.',
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-cache' },
      }
    );
  }
}
