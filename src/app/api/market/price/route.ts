import { NextResponse } from 'next/server';
import { coinGeckoService } from '@/lib/api/coingecko-service';

export async function GET() {
  try {
    const data = await coinGeckoService.getBitcoinPrice();

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

    // Return fallback data instead of error
    return NextResponse.json(
      {
        price: 98750,
        change24h: 2.5,
        volume24h: 45000000000,
        marketCap: 1920000000000,
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
