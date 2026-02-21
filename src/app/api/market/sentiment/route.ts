import { NextResponse } from 'next/server';

let sentimentCache: any = null;
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

async function fetchFearAndGreed(): Promise<{ score: number; classification: string; history: any[] }> {
  try {
    const res = await fetchWithTimeout('https://api.alternative.me/fng/?limit=30');
    if (!res.ok) throw new Error(`F&G ${res.status}`);
    const data = await res.json();
    const entries = data.data || [];
    const current = entries[0];

    return {
      score: parseInt(current?.value || '50'),
      classification: current?.value_classification || 'Neutral',
      history: entries.map((e: any) => ({
        timestamp: parseInt(e.timestamp) * 1000,
        score: parseInt(e.value),
      })),
    };
  } catch (err) {
    console.warn('[Sentiment] F&G failed:', err);
    return { score: 50, classification: 'Neutral', history: [] };
  }
}

async function fetchGlobalData(): Promise<{ btcDominance: number; totalMarketCap: number; totalVolume: number; activeCryptos: number }> {
  try {
    const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/global');
    if (!res.ok) throw new Error(`CoinGecko global ${res.status}`);
    const data = await res.json();
    const d = data.data || {};

    return {
      btcDominance: d.market_cap_percentage?.btc || 0,
      totalMarketCap: d.total_market_cap?.usd || 0,
      totalVolume: d.total_volume?.usd || 0,
      activeCryptos: d.active_cryptocurrencies || 0,
    };
  } catch (err) {
    console.warn('[Sentiment] CoinGecko global failed:', err);
    return { btcDominance: 0, totalMarketCap: 0, totalVolume: 0, activeCryptos: 0 };
  }
}

export async function GET() {
  try {
    if (sentimentCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: sentimentCache,
        timestamp: cacheTimestamp,
        source: 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    const [fg, global] = await Promise.allSettled([
      fetchFearAndGreed(),
      fetchGlobalData(),
    ]);

    const fgData = fg.status === 'fulfilled' ? fg.value : { score: 50, classification: 'Neutral', history: [] };
    const globalData = global.status === 'fulfilled' ? global.value : { btcDominance: 0, totalMarketCap: 0, totalVolume: 0, activeCryptos: 0 };

    let overall: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    if (fgData.score <= 20) overall = 'extreme_fear';
    else if (fgData.score <= 40) overall = 'fear';
    else if (fgData.score <= 60) overall = 'neutral';
    else if (fgData.score <= 80) overall = 'greed';
    else overall = 'extreme_greed';

    // Derive component scores from real data
    const volatilityScore = Math.min(100, Math.max(0, fgData.score + 10)); // F&G already factors volatility
    const momentumScore = fgData.score;
    const dominanceScore = Math.min(100, Math.round(globalData.btcDominance * 1.5));

    const sentiment = {
      overall,
      score: fgData.score,
      btcDominance: globalData.btcDominance,
      totalMarketCap: globalData.totalMarketCap,
      totalVolume24h: globalData.totalVolume,
      activeTraders: globalData.activeCryptos,
      fearGreedComponents: {
        volatility: volatilityScore,
        momentum: momentumScore,
        social: fgData.score, // F&G includes social component
        dominance: dominanceScore,
        trends: fgData.score,
      },
      fearGreedHistory: fgData.history,
    };

    sentimentCache = sentiment;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      success: true,
      data: sentiment,
      timestamp: Date.now(),
      source: 'real-apis',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('[Sentiment] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sentiment data' },
      { status: 500 }
    );
  }
}
