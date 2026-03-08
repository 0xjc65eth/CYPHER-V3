import { NextRequest, NextResponse } from 'next/server';
import { fredService } from '@/services/fred/FREDService';
import { getRedisClient } from '@/lib/cache/redis.config';
import { rateLimit } from '@/lib/middleware/rate-limiter';

const CACHE_KEY = 'market:economic-data';
const CACHE_TTL = 3600; // 1 hour

// In-memory fallback cache for when Redis is unavailable
const memCache = new Map<string, { data: any; expiresAt: number }>();

function memGet(key: string): any | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.data;
}

function memSet(key: string, data: any, ttlSeconds: number): void {
  memCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Check cache first (Redis with in-memory fallback)
    let cached: string | null = null;
    try {
      const redis = getRedisClient();
      cached = await redis.get(CACHE_KEY) as string | null;
    } catch (redisErr) {
      // Redis unavailable, trying memCache
      const memData = memGet(CACHE_KEY);
      if (memData) {
        return NextResponse.json(memData, {
          headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
        });
      }
    }

    if (cached) {
      return NextResponse.json(JSON.parse(cached), {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
      });
    }

    // Fetch economic snapshot and yield curve in parallel
    const [snapshot, yieldCurveData] = await Promise.all([
      fredService.getEconomicSnapshot(),
      fredService.getTreasuryYieldCurve(),
    ]);

    // Build indicators from snapshot
    const buildIndicator = (obs: { value: number; date: string; previousValue?: number } | null) => {
      if (!obs) return { value: 0, date: '', previousValue: 0, change: 0 };
      const prev = obs.previousValue ?? obs.value;
      return {
        value: obs.value,
        date: obs.date,
        previousValue: prev,
        change: obs.value - prev,
      };
    };

    const indicators = {
      gdp: buildIndicator(snapshot.gdp),
      cpi: buildIndicator(snapshot.cpi),
      unemployment: buildIndicator(snapshot.unemployment),
      fedFundsRate: snapshot.fedFundsRate
        ? { value: snapshot.fedFundsRate.value, date: snapshot.fedFundsRate.date }
        : { value: 0, date: '' },
      m2MoneySupply: buildIndicator(snapshot.m2MoneySupply),
      consumerConfidence: buildIndicator(snapshot.consumerConfidence),
    };

    // Build treasury yield curve
    const treasuryYieldCurve = yieldCurveData.yields;

    // Calculate 2s10s spread
    const yield2Y = treasuryYieldCurve['2Y'] || 0;
    const yield10Y = treasuryYieldCurve['10Y'] || 0;
    const yieldSpread2s10s = parseFloat((yield10Y - yield2Y).toFixed(3));
    const yieldCurveInverted = yieldSpread2s10s < 0;

    const data = {
      indicators,
      treasuryYieldCurve,
      yieldSpread2s10s,
      yieldCurveInverted,
      timestamp: Date.now(),
    };

    // Cache the result (Redis with in-memory fallback)
    try {
      const redis = getRedisClient();
      await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);
    } catch {
      // Redis write failed, memory cache used as fallback below
    }
    memSet(CACHE_KEY, data, CACHE_TTL);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('[economic-data] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
