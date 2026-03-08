import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const data = {
      price: { current: 95450, realized: 40782, thermocap: 28450 },
      mvrv: { ratio: 2.34, zScore: 1.42, percentile: 68, signal: 'Neutral/Bullish' },
      nvt: { ratio: 45.2, signal: 42.8, percentile: 55 },
      sopr: { value: 1.024, adjusted: 1.019, longTerm: 1.032, shortTerm: 1.018 },
      nupl: { value: 0.62, percentile: 72, zone: 'Belief-Denial' },
      puellMultiple: { value: 1.45, percentile: 58, signal: 'Neutral' },
      stockToFlow: { actual: 95450, model: 125000, deflection: -23.6, daysFromHalving: 298 },
      exchangeFlow: {
        netFlow24h: -12450,
        reserves: 2456789,
        reservesChange7d: -1.2,
        inflowUsd: 234500000,
        outflowUsd: 245680000,
      },
      whales: {
        addresses1kPlus: 2156,
        addresses10kPlus: 92,
        totalHoldings: 8456234,
        netPositionChange24h: 1234,
        largestTx24h: { amount: 4567, usd: 436000000 },
      },
      hashRate: {
        current: 612,
        ma30: 598,
        ma60: 585,
        ribbonSignal: 'buy',
        difficulty: 79500000000000,
        nextAdjustment: 2.3,
      },
      miner: {
        revenue24h: 28500000,
        txFees: 450000,
        blockreward: 450,
        puellMultiple: 1.45,
        sellingPressure: 'low',
      },
      hodlWaves: {
        lessThan1m: 8.2,
        oneToThreeM: 12.4,
        threeToSixM: 9.8,
        sixToTwelveM: 14.2,
        oneToTwoY: 18.6,
        moreThanTwoY: 36.8,
      },
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching on-chain metrics pro:', error);
    return NextResponse.json(
      { error: 'Failed to fetch on-chain metrics' },
      { status: 500 }
    );
  }
}
