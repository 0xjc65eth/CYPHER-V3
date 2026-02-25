import { NextRequest, NextResponse } from 'next/server';
import { twelveDataService } from '@/services/twelvedata/TwelveDataService';
import { fredService } from '@/services/fred/FREDService';
import { getRedisClient } from '@/lib/cache/redis.config';

const CACHE_KEY = 'market:macro-indicators';
const CACHE_TTL = 300; // 5 minutes

interface MacroIndicators {
  dxy: { value: number; change: number };
  treasury10y: { value: number; change: number };
  vix: { value: number; change: number };
  sp500: { value: number; change: number };
  nasdaq: { value: number; change: number };
  gold: { value: number; change: number };
  oil: { value: number; change: number };
  cpi: { value: number; date: string };
  fedRate: { value: number; nextMeeting: string };
}

// Fallback data (atualizado 2026-02-24) - usado quando APIs estão indisponíveis
// Fontes: FRED, Yahoo Finance - valores aproximados
const FALLBACK_DATA: MacroIndicators = {
  dxy: { value: 106.50, change: 0 },
  treasury10y: { value: 4.50, change: 0 },
  vix: { value: 20.5, change: 0 },
  sp500: { value: 5900, change: 0 },
  nasdaq: { value: 18800, change: 0 },
  gold: { value: 2950, change: 0 },
  oil: { value: 72, change: 0 },
  cpi: { value: 2.9, date: 'Jan 2026' },
  fedRate: { value: 4.50, nextMeeting: 'Mar 18, 2026' },
};

export async function GET(request: NextRequest) {
  try {
    const redis = getRedisClient();

    // Check cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json(JSON.parse(cached as string), {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    // Start with fallback values
    const data: MacroIndicators = { ...FALLBACK_DATA };
    let usedRealData = false;

    // Fetch TwelveData market quotes in parallel
    try {
      const tdData = await twelveDataService.getAllMarketData();

      if (tdData.available) {
        // Map indices
        const spx = tdData.indices.find((i) => i.symbol === 'SPX');
        if (spx && spx.available) {
          data.sp500 = { value: spx.price, change: spx.changePercent };
          usedRealData = true;
        }

        const ixic = tdData.indices.find((i) => i.symbol === 'IXIC');
        if (ixic && ixic.available) {
          data.nasdaq = { value: ixic.price, change: ixic.changePercent };
          usedRealData = true;
        }

        // Map commodities
        const gold = tdData.commodities.find((c) => c.symbol === 'XAU/USD');
        if (gold && gold.available) {
          data.gold = { value: gold.price, change: gold.changePercent };
          usedRealData = true;
        }
      }
    } catch (err) {
      console.error('[macro-indicators] TwelveData fetch error:', err);
    }

    // Fetch FRED economic data in parallel
    try {
      const [snapshot, yieldCurve] = await Promise.all([
        fredService.getEconomicSnapshot(),
        fredService.getTreasuryYieldCurve(),
      ]);

      // Fed funds rate
      if (snapshot.available && snapshot.fedFundsRate) {
        data.fedRate = {
          value: snapshot.fedFundsRate.value,
          nextMeeting: 'Mar 18, 2026',
        };
        usedRealData = true;
      }

      // CPI
      if (snapshot.available && snapshot.cpi) {
        data.cpi = {
          value: snapshot.cpi.value,
          date: snapshot.cpi.date,
        };
        usedRealData = true;
      }

      // Treasury 10Y yield
      if (yieldCurve.available && yieldCurve.yields['10Y']) {
        const prev10Y = data.treasury10y.value;
        data.treasury10y = {
          value: yieldCurve.yields['10Y'],
          change: parseFloat((yieldCurve.yields['10Y'] - prev10Y).toFixed(3)),
        };
        usedRealData = true;
      }
    } catch (err) {
      console.error('[macro-indicators] FRED fetch error:', err);
    }

    // Cache the result
    await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Data-Source': usedRealData ? 'live' : 'fallback',
      },
    });
  } catch (error) {
    console.error('[macro-indicators] Route error:', error);
    // Return fallback data even on error
    return NextResponse.json(FALLBACK_DATA, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Data-Source': 'fallback',
      },
    });
  }
}
