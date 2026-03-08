import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://api.blockchain.info/stats', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Blockchain.com API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(
      {
        market_price_usd: data.market_price_usd,
        hash_rate: data.hash_rate,
        difficulty: data.difficulty,
        n_tx: data.n_tx,
        n_blocks_mined: data.n_blocks_mined,
        minutes_between_blocks: data.minutes_between_blocks,
        totalbc: data.totalbc,
        n_blocks_total: data.n_blocks_total,
        estimated_transaction_volume_usd: data.estimated_transaction_volume_usd,
        miners_revenue_usd: data.miners_revenue_usd,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to fetch blockchain stats' }, { status: 500 });
  }
}
