import { NextRequest, NextResponse } from 'next/server';
import { fredService } from '@/services/fred/FREDService';
import { twelveDataService } from '@/services/twelvedata/TwelveDataService';
import { getRedisClient } from '@/lib/cache/redis.config';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_KEY = 'market:macro-indicators-pro';
const CACHE_TTL = 300; // 5 minutes

// 2026 FOMC meeting schedule (shared with fed-indicators)
const FOMC_2026 = [
  { date: '2026-01-28', type: 'Meeting' },
  { date: '2026-03-18', type: 'Meeting + SEP' },
  { date: '2026-05-06', type: 'Meeting' },
  { date: '2026-06-17', type: 'Meeting + SEP' },
  { date: '2026-07-29', type: 'Meeting' },
  { date: '2026-09-16', type: 'Meeting + SEP' },
  { date: '2026-11-04', type: 'Meeting' },
  { date: '2026-12-16', type: 'Meeting + SEP' },
];

function getNextFOMCDate(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const meeting of FOMC_2026) {
    const d = new Date(meeting.date);
    if (d >= now) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return 'TBD';
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Check cache
    try {
      const redis = getRedisClient();
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return NextResponse.json(JSON.parse(cached as string), {
          headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
        });
      }
    } catch {
      // Redis unavailable — continue without cache
    }

    // Fetch real data from services in parallel
    const [snapshot, yieldCurve, tdData] = await Promise.allSettled([
      fredService.getEconomicSnapshot(),
      fredService.getTreasuryYieldCurve(),
      twelveDataService.getAllMarketData(),
    ]);

    const econ = snapshot.status === 'fulfilled' && snapshot.value.available ? snapshot.value : null;
    const yields = yieldCurve.status === 'fulfilled' && yieldCurve.value.available ? yieldCurve.value : null;
    const td = tdData.status === 'fulfilled' && tdData.value.available ? tdData.value : null;

    // Build response with real data, fallback for missing fields
    const yield10Y = yields?.yields['10Y'] ?? 4.35;
    const yield2Y = yields?.yields['2Y'] ?? 4.68;
    const yieldSpread = parseFloat((yield10Y - yield2Y).toFixed(3));

    const spx = td?.indices?.find((i: { symbol: string }) => i.symbol === 'SPX');
    const ixic = td?.indices?.find((i: { symbol: string }) => i.symbol === 'IXIC');
    const gold = td?.commodities?.find((c: { symbol: string }) => c.symbol === 'XAU/USD');

    const data = {
      dxy: { value: 104.25, change: 0 }, // DXY not available from our current services
      treasury10y: { value: yield10Y, change: 0 },
      treasury2y: { value: yield2Y, change: 0 },
      yieldSpread: { value: yieldSpread, inverted: yieldSpread < 0 },
      vix: { value: 15.8, change: 0 }, // VIX not available from our current services
      sp500: spx?.available
        ? { value: spx.price, change: spx.changePercent }
        : { value: 5900, change: 0 },
      nasdaq: ixic?.available
        ? { value: ixic.price, change: ixic.changePercent }
        : { value: 18800, change: 0 },
      gold: gold?.available
        ? { value: gold.price, change: gold.changePercent }
        : { value: 2950, change: 0 },
      oil: { value: 72, change: 0 }, // Oil not in current TwelveData batch
      cpi: econ?.cpi
        ? { value: econ.cpi.value, previous: econ.cpi.previousValue ?? 0, date: econ.cpi.date, trend: econ.cpi.previousValue && econ.cpi.value < econ.cpi.previousValue ? 'falling' : 'rising' }
        : { value: 2.9, previous: 3.0, date: 'N/A', trend: 'falling' },
      ppi: { value: 0, previous: 0, date: 'N/A' }, // PPI not available from FRED service currently
      fedRate: {
        value: econ?.fedFundsRate?.value ?? 4.50,
        nextMeeting: getNextFOMCDate(),
        probability: { hold: 0, cut25: 0, hike25: 0 }, // CME FedWatch not available
      },
      unemployment: econ?.unemployment
        ? { value: econ.unemployment.value, previous: econ.unemployment.previousValue ?? 0, date: econ.unemployment.date }
        : { value: 4.1, previous: 4.2, date: 'N/A' },
      timestamp: Date.now(),
      source: econ || yields || td ? 'live' : 'fallback',
    };

    // Cache result
    try {
      const redis = getRedisClient();
      await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);
    } catch {
      // Cache write failed — non-fatal
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Data-Source': data.source,
      },
    });
  } catch (error) {
    console.error('[macro-indicators-pro] Route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch macro indicators' },
      { status: 500 }
    );
  }
}
