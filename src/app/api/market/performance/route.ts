import { NextRequest, NextResponse } from 'next/server';
import { rateLimitedFetch } from '@/lib/rateLimitedFetch';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Use daily interval (free tier supports daily for 365 days) with rate limiting
    let data;
    try {
      data = await rateLimitedFetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily',
        { cacheTTL: 120000 } // 2 minutes cache
      );
    } catch (error) {
      // Fallback: use Binance klines for recent performance
      try {
        const binRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365');
        if (binRes.ok) {
          const klines = await binRes.json();
          const binPrices: [number, number][] = klines.map((k: unknown[]) => [Number(k[0]), Number(k[4])]);
          const currentPrice = binPrices[binPrices.length - 1][1];
          const now = Date.now();

          const findPriceAt = (msAgo: number): number | null => {
            const target = now - msAgo;
            let closest: [number, number] | null = null;
            let minDiff = Infinity;
            for (const p of binPrices) {
              const diff = Math.abs(p[0] - target);
              if (diff < minDiff) { minDiff = diff; closest = p; }
            }
            return closest ? closest[1] : null;
          };

          const calcChange = (pastPrice: number | null): number | null => {
            if (pastPrice === null || pastPrice === 0) return null;
            return ((currentPrice - pastPrice) / pastPrice) * 100;
          };

          return NextResponse.json({
            currentPrice,
            performance: {
              '1h': null, '24h': calcChange(findPriceAt(24*60*60*1000)),
              '7d': calcChange(findPriceAt(7*24*60*60*1000)), '14d': calcChange(findPriceAt(14*24*60*60*1000)),
              '30d': calcChange(findPriceAt(30*24*60*60*1000)), '90d': calcChange(findPriceAt(90*24*60*60*1000)),
              '1y': calcChange(findPriceAt(365*24*60*60*1000)), ytd: null,
            },
            timestamp: Date.now(), source: 'binance_fallback',
          }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } });
        }
      } catch { /* ignore fallback error */ }

      return NextResponse.json(
        { error: 'Failed to fetch performance data' },
        { status: 502 }
      );
    }

    const prices: [number, number][] = data.prices;

    if (!prices || prices.length === 0) {
      return NextResponse.json({ error: 'No price data available' }, { status: 502 });
    }

    const currentPrice = prices[prices.length - 1][1];
    const now = Date.now();

    const findPriceAt = (msAgo: number): number | null => {
      const target = now - msAgo;
      let closest: [number, number] | null = null;
      let minDiff = Infinity;
      for (const p of prices) {
        const diff = Math.abs(p[0] - target);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      return closest ? closest[1] : null;
    };

    const calcChange = (pastPrice: number | null): number | null => {
      if (pastPrice === null || pastPrice === 0) return null;
      return ((currentPrice - pastPrice) / pastPrice) * 100;
    };

    const hour1 = findPriceAt(1 * 60 * 60 * 1000);
    const hour24 = findPriceAt(24 * 60 * 60 * 1000);
    const day7 = findPriceAt(7 * 24 * 60 * 60 * 1000);
    const day14 = findPriceAt(14 * 24 * 60 * 60 * 1000);
    const day30 = findPriceAt(30 * 24 * 60 * 60 * 1000);
    const day90 = findPriceAt(90 * 24 * 60 * 60 * 1000);
    const day365 = findPriceAt(365 * 24 * 60 * 60 * 1000);

    // YTD: find price closest to Jan 1 of current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    let ytdPrice: number | null = null;
    let ytdDiff = Infinity;
    for (const p of prices) {
      const diff = Math.abs(p[0] - yearStart);
      if (diff < ytdDiff) {
        ytdDiff = diff;
        ytdPrice = p[1];
      }
    }

    return NextResponse.json(
      {
        currentPrice,
        performance: {
          '1h': calcChange(hour1),
          '24h': calcChange(hour24),
          '7d': calcChange(day7),
          '14d': calcChange(day14),
          '30d': calcChange(day30),
          '90d': calcChange(day90),
          '1y': calcChange(day365),
          ytd: calcChange(ytdPrice),
        },
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
