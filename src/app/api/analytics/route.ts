import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter';

// Simple in-memory cache with 60s TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Fetch real BTC data from CoinGecko with 10s timeout
async function fetchBTCData(): Promise<{ price: number; change24h: number; volume24h: number; source: string }> {
  const cached = getCached('btc_data');
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true',
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const json = await response.json();
    const btc = json.bitcoin;

    const result = {
      price: btc?.usd || 0,
      change24h: btc?.usd_24h_change || 0,
      volume24h: btc?.usd_24h_vol || 0,
      source: 'coingecko'
    };

    setCache('btc_data', result);
    return result;
  } catch (error) {
    // CoinGecko API unavailable, returning fallback zeros
    return {
      price: 0,
      change24h: 0,
      volume24h: 0,
      source: 'fallback'
    };
  }
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'

    const btcData = await fetchBTCData();

    // Build chart data using real price or zeros (no Math.random())
    const now = new Date();
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      chartData.push({
        date: date.toISOString().split('T')[0],
        price: btcData.price,
        volume: btcData.volume24h,
        transactions: 0,
        activeAddresses: 0,
        hashRate: 0,
        difficulty: 0
      });
    }

    const analyticsData = {
      overview: {
        marketCap: btcData.price > 0 ? btcData.price * 19700000 : 0, // approx circulating supply
        dominance: 0,
        volume24h: btcData.volume24h,
        change24h: btcData.change24h
      },
      chartData,
      metrics: {
        avgBlockTime: 0,
        mempoolSize: 0,
        feeRate: 0,
        pendingTx: 0
      },
      source: btcData.source
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeframe,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
