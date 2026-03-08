import { NextResponse } from 'next/server';
import { scanSpotPerpArbitrage } from '@/services/arbitrage/SpotPerpArbitrage';
import { cache } from '@/lib/cache/redis.config';

const CACHE_KEY = 'arb:spot-perp';
const CACHE_TTL = 5; // 5 seconds

export async function GET() {
  try {
    // Check cache
    try {
      const cached = await cache.get(CACHE_KEY);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json(parsed, {
          headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15' },
        });
      }
    } catch { /* cache miss */ }

    const opportunities = await scanSpotPerpArbitrage();

    // BTC summary for the card
    const btcOpp = opportunities.find(o => o.asset === 'BTC');
    const summary = btcOpp ? {
      btcBasis: btcOpp.basisPercent,
      btcFundingRate: btcOpp.fundingRate,
      btcAnnualizedFunding: btcOpp.annualizedFunding,
      btcDirection: btcOpp.direction,
    } : null;

    const response = {
      opportunities,
      summary,
      count: opportunities.length,
      timestamp: Date.now(),
    };

    // Cache
    try {
      await cache.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(response));
    } catch { /* non-fatal */ }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Spot-perp scan failed: ${message}` }, { status: 500 });
  }
}
