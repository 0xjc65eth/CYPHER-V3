import { NextRequest, NextResponse } from 'next/server';

// In-memory cache
const klinesCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30s

const VALID_INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval. Valid: ${VALID_INTERVALS.join(', ')}` },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${symbol}-${interval}-${limit}`;
    const cached = klinesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        symbol,
        interval,
        timestamp: cached.timestamp,
        source: 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
        { signal: controller.signal }
      );

      if (!res.ok) throw new Error(`Binance klines ${res.status}`);

      const rawData = await res.json();
      const candles = rawData.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000), // Convert to seconds for lightweight-charts
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      // Update cache
      klinesCache.set(cacheKey, { data: candles, timestamp: Date.now() });

      return NextResponse.json({
        success: true,
        data: candles,
        symbol,
        interval,
        count: candles.length,
        timestamp: Date.now(),
        source: 'binance',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[Klines] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch klines',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
