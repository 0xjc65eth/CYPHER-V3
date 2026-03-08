import { NextRequest, NextResponse } from 'next/server';
import { coinGeckoService } from '@/lib/api/coingecko-service';
import { rateLimit } from '@/lib/middleware/rate-limiter';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const json = await withTimeout(coinGeckoService.getGlobal(), 12000);
    const d = json.data;

    return NextResponse.json(
      {
        totalMarketCap: d.total_market_cap?.usd ?? null,
        totalVolume24h: d.total_volume?.usd ?? null,
        btcDominance: d.market_cap_percentage?.btc ?? null,
        ethDominance: d.market_cap_percentage?.eth ?? null,
        activeCryptocurrencies: d.active_cryptocurrencies,
        markets: d.markets,
        marketCapChange24h: d.market_cap_change_percentage_24h_usd,
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Return fallback data instead of error
    return NextResponse.json(
      {
        totalMarketCap: 2600000000000,
        totalVolume24h: 111000000000,
        btcDominance: 51.2,
        ethDominance: 14.8,
        activeCryptocurrencies: 9500,
        markets: 750,
        marketCapChange24h: 1.23,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-Fallback-Data': 'true',
        },
      }
    );
  }
}
