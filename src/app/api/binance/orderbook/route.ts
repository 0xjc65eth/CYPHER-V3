import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

// Proxy for Binance public API - orderbook and recent trades
// Binance public endpoints require no API key

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'orderbook';
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  try {
    let url: string;
    if (type === 'trades') {
      url = `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=${limit}`;
    } else {
      url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 5 } as any,
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(
      { success: true, data, source: 'binance' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    );
  } catch (error) {
    console.error('Binance proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        data: type === 'trades' ? [] : { bids: [], asks: [] },
        error: 'Failed to fetch from Binance',
      },
      { status: 503 }
    );
  }
}
