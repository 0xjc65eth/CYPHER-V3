import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

/**
 * Catch-all proxy for CoinGecko API.
 * Allows client-side code to call /api/coingecko/simple/price?ids=bitcoin&vs_currencies=usd
 * instead of hitting api.coingecko.com directly (which is blocked by CORS).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { path } = await params;
    const subPath = '/' + path.join('/');
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${COINGECKO_BASE}${subPath}${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[CoinGecko Proxy] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'CoinGecko proxy failed' },
      { status: 502 }
    );
  }
}
