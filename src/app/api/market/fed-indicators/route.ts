import { NextRequest, NextResponse } from 'next/server';
import { fredService } from '@/services/fred/FREDService';
import { getRedisClient } from '@/lib/cache/redis.config';

const CACHE_KEY = 'market:fed-indicators';
const CACHE_TTL = 3600; // 1 hour

// 2026 FOMC meeting schedule
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

// Recent Fed decisions (hardcoded historical data)
const RECENT_DECISIONS = [
  { date: '2025-12-18', action: 'Hold', rate: 4.50 },
  { date: '2025-11-07', action: 'Cut 25bp', rate: 4.50 },
  { date: '2025-09-18', action: 'Cut 50bp', rate: 4.75 },
  { date: '2025-07-30', action: 'Hold', rate: 5.25 },
  { date: '2025-06-12', action: 'Hold', rate: 5.25 },
];

function getNextFOMCMeeting(): { date: string; type: string; daysUntil: number } | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const meeting of FOMC_2026) {
    const meetingDate = new Date(meeting.date);
    meetingDate.setHours(0, 0, 0, 0);

    if (meetingDate >= now) {
      const daysUntil = Math.ceil(
        (meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { date: meeting.date, type: meeting.type, daysUntil };
    }
  }

  // All 2026 meetings have passed
  return null;
}

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

    // Fetch current fed funds rate and yield curve in parallel
    const [fedFundsObs, yieldCurveData] = await Promise.all([
      fredService.getSeriesLatest('FEDFUNDS'),
      fredService.getTreasuryYieldCurve(),
    ]);

    const currentRate = fedFundsObs?.value ?? 4.50;

    // Calculate yield spread
    const yield2Y = yieldCurveData.yields['2Y'] || 0;
    const yield10Y = yieldCurveData.yields['10Y'] || 0;
    const yieldSpread2s10s = parseFloat((yield10Y - yield2Y).toFixed(3));
    const yieldCurveInverted = yieldSpread2s10s < 0;

    const nextMeeting = getNextFOMCMeeting();

    const data = {
      currentRate,
      nextMeeting: nextMeeting || { date: 'TBD', type: 'TBD', daysUntil: 0 },
      yieldCurveInverted,
      yieldSpread2s10s,
      recentDecisions: RECENT_DECISIONS,
      fomcSchedule: FOMC_2026,
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
    console.error('[fed-indicators] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
