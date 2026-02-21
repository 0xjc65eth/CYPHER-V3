import { NextRequest, NextResponse } from 'next/server';
import { duneService } from '@/services/DuneAnalyticsService';
import { getRedisClient } from '@/lib/cache/redis.config';

export const dynamic = 'force-dynamic';

const REDIS_TTL: Record<string, number> = {
  'ordinals-trends': 1800, // 30 min
  'dex-volume': 900,       // 15 min
  'dex-candles': 300,      // 5 min
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');

  if (!query || !['ordinals-trends', 'dex-volume', 'dex-candles'].includes(query)) {
    return NextResponse.json(
      { error: 'Invalid query parameter. Use: ordinals-trends, dex-volume, dex-candles', source: 'dune' },
      { status: 400 }
    );
  }

  try {
    // Check Redis cache first
    const redis = getRedisClient();
    const cacheKey = `dune:${query}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return NextResponse.json(
        { data, source: 'cache', query },
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

    // Store in Redis
    const ttl = REDIS_TTL[query] || 300;
    await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Dune data', source: 'dune' },
      { status: 500 }
    );
  }
}
