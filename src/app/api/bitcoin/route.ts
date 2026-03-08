/**
 * Bitcoin Price API Route
 * Fornece dados de preço em tempo real via CoinGecko
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true',
      {
        signal: AbortSignal.timeout(10000),
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const data = await res.json();
    const btc = data.bitcoin;

    return NextResponse.json({
      success: true,
      data: {
        price: btc.usd,
        change24h: btc.usd_24h_change,
        volume24h: btc.usd_24h_vol,
        marketCap: btc.usd_market_cap,
        lastUpdate: new Date(btc.last_updated_at * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('[Bitcoin API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Bitcoin data', isFallback: true },
      { status: 503 }
    );
  }
}
