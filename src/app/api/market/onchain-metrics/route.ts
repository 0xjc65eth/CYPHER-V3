import { NextRequest, NextResponse } from 'next/server';
import { duneService } from '@/services/DuneAnalyticsService';
import { rateLimit } from '@/lib/middleware/rate-limiter';

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
  inscriptionTrends?: Array<{
    date: string;
    dailyInscriptions: number;
    totalInscriptions: number;
    ordSizeUsage: number;
    fees: number;
  }>;
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const baseData: OnChainMetrics = {
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

    // Enrich with Dune Ordinals data (non-blocking)
    const [duneResult] = await Promise.allSettled([
      duneService.getOrdinalsInscriptionTrends(),
    ]);

    if (duneResult.status === 'fulfilled' && duneResult.value.length > 0) {
      baseData.inscriptionTrends = duneResult.value.slice(0, 30);
    }

    return NextResponse.json(baseData, {
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
