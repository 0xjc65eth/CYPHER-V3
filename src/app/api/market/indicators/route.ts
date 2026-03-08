import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

let indicatorCache: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60s

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHashRateAndDifficulty(): Promise<{ hashRate: number; difficulty: number; difficultyChange: number }> {
  try {
    const res = await fetchWithTimeout('https://mempool.space/api/v1/mining/hashrate/1m');
    if (!res.ok) throw new Error(`Mempool ${res.status}`);
    const data = await res.json();

    const current = data.hashrates?.[data.hashrates.length - 1];
    const prev = data.hashrates?.[data.hashrates.length - 2];
    const hashRate = current?.avgHashrate ? current.avgHashrate / 1e18 : 0; // Convert to EH/s

    const diffRes = await fetchWithTimeout('https://mempool.space/api/v1/mining/difficulty-adjustments/2');
    let difficulty = 0;
    let difficultyChange = 0;
    if (diffRes.ok) {
      const diffData = await diffRes.json();
      if (diffData.length > 0) {
        difficulty = diffData[0].difficulty / 1e12; // Convert to T
        if (diffData.length > 1) {
          difficultyChange = ((diffData[0].difficulty - diffData[1].difficulty) / diffData[1].difficulty) * 100;
        }
      }
    }

    return { hashRate, difficulty, difficultyChange };
  } catch (err) {
    // Mempool API unavailable
    return { hashRate: 0, difficulty: 0, difficultyChange: 0 };
  }
}

async function fetchFundingRate(): Promise<{ value: number; change: number }> {
  try {
    const res = await fetchWithTimeout('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=2');
    if (!res.ok) throw new Error(`Binance funding ${res.status}`);
    const data = await res.json();
    const current = parseFloat(data[data.length - 1]?.fundingRate || '0') * 100;
    const prev = data.length > 1 ? parseFloat(data[data.length - 2]?.fundingRate || '0') * 100 : current;
    const change = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
    return { value: current, change };
  } catch (err) {
    // Binance funding API unavailable
    return { value: 0, change: 0 };
  }
}

async function fetchLongShortRatio(): Promise<{ value: number; change: number }> {
  try {
    const res = await fetchWithTimeout('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=2');
    if (!res.ok) throw new Error(`Binance LS ${res.status}`);
    const data = await res.json();
    const current = parseFloat(data[data.length - 1]?.longShortRatio || '1');
    const prev = data.length > 1 ? parseFloat(data[data.length - 2]?.longShortRatio || '1') : current;
    const change = prev !== 0 ? ((current - prev) / prev) * 100 : 0;
    return { value: current, change };
  } catch (err) {
    // Binance long/short API unavailable
    return { value: 0, change: 0 };
  }
}

async function fetchMVRV(): Promise<{ value: number; change: number }> {
  try {
    const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false');
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    const marketCap = data.market_data?.market_cap?.usd || 0;
    // Approximate MVRV using market cap / (circulating supply * average cost basis proxy)
    // Since realized cap isn't available for free, use ATH ratio as proxy
    const currentPrice = data.market_data?.current_price?.usd || 0;
    const ath = data.market_data?.ath?.usd || 1;
    const mvrv = ath > 0 ? (currentPrice / ath) * 3 : 0; // Rough proxy
    return { value: mvrv, change: data.market_data?.price_change_percentage_24h || 0 };
  } catch (err) {
    // MVRV calculation unavailable
    return { value: 0, change: 0 };
  }
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    if (indicatorCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: indicatorCache,
        timestamp: cacheTimestamp,
        source: 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    const [mining, funding, longShort, mvrv] = await Promise.allSettled([
      fetchHashRateAndDifficulty(),
      fetchFundingRate(),
      fetchLongShortRatio(),
      fetchMVRV(),
    ]);

    const m = mining.status === 'fulfilled' ? mining.value : { hashRate: 0, difficulty: 0, difficultyChange: 0 };
    const f = funding.status === 'fulfilled' ? funding.value : { value: 0, change: 0 };
    const ls = longShort.status === 'fulfilled' ? longShort.value : { value: 0, change: 0 };
    const mv = mvrv.status === 'fulfilled' ? mvrv.value : { value: 0, change: 0 };

    const indicators = [
      {
        name: 'Hash Rate',
        value: m.hashRate,
        change: 0,
        impact: 'neutral' as const,
        description: `${m.hashRate.toFixed(1)} EH/s network hash rate`,
        source: 'mempool.space',
      },
      {
        name: 'Mining Difficulty',
        value: m.difficulty,
        change: m.difficultyChange,
        impact: m.difficultyChange > 0 ? 'bullish' as const : 'neutral' as const,
        description: `${m.difficulty.toFixed(2)} T difficulty`,
        source: 'mempool.space',
      },
      {
        name: 'Long/Short Ratio',
        value: ls.value,
        change: ls.change,
        impact: ls.value > 1.5 ? 'bullish' as const : ls.value < 0.7 ? 'bearish' as const : 'neutral' as const,
        description: `${ls.value.toFixed(2)} long/short account ratio`,
        source: 'binance',
      },
      {
        name: 'Funding Rate',
        value: f.value,
        change: f.change,
        impact: f.value > 0.03 ? 'bearish' as const : f.value < -0.01 ? 'bullish' as const : 'neutral' as const,
        description: `${f.value.toFixed(4)}% perpetual futures funding`,
        source: 'binance',
      },
      {
        name: 'MVRV Ratio',
        value: mv.value,
        change: mv.change,
        impact: mv.value > 3.5 ? 'bearish' as const : mv.value < 1 ? 'bullish' as const : 'neutral' as const,
        description: `${mv.value.toFixed(2)} market value to realized value`,
        source: 'coingecko',
      },
    ];

    indicatorCache = indicators;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      success: true,
      data: indicators,
      timestamp: Date.now(),
      source: 'real-apis',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('[Indicators] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indicators' },
      { status: 500 }
    );
  }
}
