import { NextRequest, NextResponse } from 'next/server';
import { duneService } from '@/services/DuneAnalyticsService';
import { getRedisClient } from '@/lib/cache/redis.config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REDIS_TTL: Record<string, number> = {
  'ordinals-trends': 1800, // 30 min
  'dex-volume': 900,       // 15 min
  'dex-candles': 300,      // 5 min
};

// In-memory fallback cache for when Redis is unavailable
// Keeps data even when expired so we can serve stale
const memCache = new Map<string, { data: any; expiresAt: number }>();

function memGet(key: string): { data: any; stale: boolean } | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  return { data: entry.data, stale: Date.now() > entry.expiresAt };
}

function memSet(key: string, data: any, ttlSeconds: number): void {
  memCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// Get from Redis or memory cache, returns stale indicator
async function getCached(cacheKey: string): Promise<{ data: any; stale: boolean } | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey) as string | null;
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return { data, stale: false };
    }
  } catch {
    // Redis unavailable, fall through to memory cache
  }
  return memGet(cacheKey);
}

// Set to all available cache layers
async function setCached(cacheKey: string, data: any, ttl: number): Promise<void> {
  memSet(cacheKey, data, ttl);
  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
  } catch {
    // Redis unavailable, memory cache already set
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');

  if (!query || !['ordinals-trends', 'dex-volume', 'dex-candles'].includes(query)) {
    return NextResponse.json(
      { error: 'Invalid query parameter. Use: ordinals-trends, dex-volume, dex-candles', source: 'dune' },
      { status: 400 }
    );
  }

  const cacheKey = `dune:${query}`;

  try {
    // Check cache first
    const cached = await getCached(cacheKey);

    if (cached && !cached.stale) {
      return NextResponse.json(
        { data: cached.data, source: 'cache', query },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Fetch from Dune
    let data: unknown;

    switch (query) {
      case 'ordinals-trends':
        data = await duneService.getOrdinalsInscriptionTrends();
        break;
      case 'dex-volume':
        data = await duneService.getDEXVolumeRankings();
        break;
      case 'dex-candles':
        data = await duneService.getDEXPriceCandles();
        break;
    }

    // Store in cache
    const ttl = REDIS_TTL[query] || 300;
    await setCached(cacheKey, data, ttl);

    return NextResponse.json(
      { data, source: 'dune', query },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error(`[Dune API] Error fetching ${query}:`, error);

    // Stale-while-revalidate: serve stale/expired cache on error
    const stale = await getCached(cacheKey);
    if (stale) {
      return NextResponse.json(
        { data: stale.data, source: 'cache', query, stale: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
          },
        }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Dune data', source: 'dune' },
      { status: 500 }
    );
  }
}
