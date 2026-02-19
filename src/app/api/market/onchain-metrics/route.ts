import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface OnChainMetrics {
  mvrvRatio: number;
  nvtRatio: number;
  stockToFlow: { actual: number; model: number };
  exchangeReserves: { btc: number; change24h: number };
  whaleTransactions: { count24h: number; volume: number };
  hashRibbons: 'buy' | 'sell' | 'neutral';
  sopr: number;
  puellMultiple: number;
}

export async function GET() {
  try {
    // In production, fetch from Glassnode, CoinMetrics, etc.
    // For now, return realistic mock data based on current market conditions

    const data: OnChainMetrics = {
      mvrvRatio: 2.34,
      nvtRatio: 45.2,
      stockToFlow: {
        actual: 95000,
        model: 125000
      },
      exchangeReserves: {
        btc: 2456789,
        change24h: -0.45
      },
      whaleTransactions: {
        count24h: 342,
        volume: 45678
      },
      hashRibbons: 'buy',
      sopr: 1.02,
      puellMultiple: 1.45
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching on-chain metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch on-chain metrics' },
      { status: 500 }
    );
  }
}
