import { NextRequest, NextResponse } from 'next/server';
import { newsAPIService } from '@/services/newsapi/NewsAPIService';
import { getRedisClient } from '@/lib/cache/redis.config';

const CACHE_KEY = 'market:financial-news';
const CACHE_TTL = 1800; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient();

    // Check cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached as string), {
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
    await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });
  } catch (error) {
    console.error('[financial-news] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
