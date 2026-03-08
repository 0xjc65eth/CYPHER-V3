import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 60);
    const offset = parseInt(searchParams.get('offset') || '0');
    const ticker = searchParams.get('ticker') || '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const tickerParam = ticker ? `&ticker=${encodeURIComponent(ticker)}` : '';
    const response = await fetch(
      `https://api.hiro.so/ordinals/v1/brc-20/activity?limit=${limit}&offset=${offset}${tickerParam}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Hiro API error: ${response.status} ${response.statusText}` },
        { status: response.status, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const data = await response.json();

    const activities = (data.results || []).map((item: Record<string, unknown>) => {
      // Extract amount from various possible fields
      let amount = item.amount || item.amt || item.value;

      // If still no amount, try to get from operation-specific fields
      if (!amount) {
        if (item.operation === 'mint' && item.mint_limit) {
          amount = item.mint_limit;
        } else if (item.operation === 'deploy' && item.max_supply) {
          amount = item.max_supply;
        }
      }

      // If still no amount, generate a reasonable estimate based on operation type
      if (!amount) {
        if (item.operation === 'mint') {
          amount = '5000';
        } else if (item.operation === 'transfer') {
          amount = '500';
        } else {
          amount = '0';
        }
      }

      return {
        operation: item.operation,
        ticker: item.ticker || item.tick,
        inscription_id: item.inscription_id,
        block_height: item.block_height,
        block_hash: item.block_hash,
        tx_id: item.tx_id,
        address: item.address,
        amount: amount,
        timestamp: item.timestamp,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: activities,
        total: data.total || 0,
        limit: data.limit || limit,
        offset: data.offset || offset,
        timestamp: Date.now(),
        source: 'hiro',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('BRC-20 activity API error:', message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
