import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter'

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000; // 60 seconds

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Check cache first
    const cached = cache.get('runes-top');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT' },
      });
    }


    // Strategy 1: Hiro API (primary source)
    try {
      const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
      if (process.env.HIRO_API_KEY) hiroHeaders['x-hiro-api-key'] = process.env.HIRO_API_KEY;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const hiroRes = await fetch(
        'https://api.hiro.so/runes/v1/etchings?limit=30&offset=0',
        { headers: hiroHeaders, signal: controller.signal }
      );
      clearTimeout(timeout);

      if (hiroRes.ok) {
        const hiroData = await hiroRes.json();
        const results = hiroData.results || [];

        const processed = results.map((rune: any, index: number) => {
          const supply = rune.supply || {};
          return {
            rank: index + 1,
            name: rune.name || '',
            formatted_name: rune.spaced_name || rune.name || '',
            price: 0,
            price_usd: 0,
            volume_24h: 0,
            market_cap: 0,
            holders: 0,
            supply: supply.current || supply.total || '0',
            change_24h: 0,
            verified: true,
            source: 'hiro',
          };
        });

        cache.set('runes-top', { data: processed, timestamp: Date.now() });
        return NextResponse.json(processed);
      }
    } catch (error) {
      console.error('[runes-top] Hiro API error:', error);
    }

    // All sources failed - return structured error
    console.error('[runes-top] All data sources failed');
    return NextResponse.json({
      error: 'Failed to fetch top runes data from all sources',
      sources_tried: ['hiro'],
      timestamp: Date.now(),
    }, { status: 502 });
  } catch (error) {
    console.error('Error in runes-top API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top runes data' },
      { status: 500 }
    );
  }
}
