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
    const data = await withTimeout(coinGeckoService.getBitcoinPrice(), 12000);

    return NextResponse.json(
      {
        ...data,
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Return fallback data instead of error - atualizado 2026-02-24
    return NextResponse.json(
      {
        price: 63500,
        change24h: 0,
        volume24h: 25000000000,
        marketCap: 1250000000000,
        timestamp: Date.now(),
        isFallback: true,
        warning: 'Dados de fallback - API indisponível',
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
