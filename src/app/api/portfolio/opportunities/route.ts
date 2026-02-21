import { NextResponse } from 'next/server';

let oppCache: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 120000; // 2 minutes

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    if (oppCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, ...oppCache, source: 'cache' });
    }

    const opportunities: any[] = [];

    // Fetch real data in parallel
    const [trendingRes, fgRes] = await Promise.allSettled([
      fetchWithTimeout('https://api.coingecko.com/api/v3/search/trending'),
      fetchWithTimeout('https://api.alternative.me/fng/?limit=1'),
    ]);

    // Trending coins as trade opportunities
    if (trendingRes.status === 'fulfilled' && trendingRes.value.ok) {
      const data = await trendingRes.value.json();
      const coins = data.coins?.slice(0, 3) || [];
      for (const entry of coins) {
        const coin = entry.item;
        opportunities.push({
          id: `trending-${coin.id}`,
          title: `${coin.name} Trending`,
          description: `${coin.name} (${coin.symbol}) is trending on CoinGecko (rank #${coin.market_cap_rank || 'N/A'})`,
          type: 'Trade',
          successProbability: 65,
          potentialReturn: coin.data?.price_change_percentage_24h?.usd || 0,
          riskLevel: 'Medium',
          timeFrame: 'Short-term',
          source: 'coingecko-trending',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // DCA opportunity based on Fear & Greed
    let fearGreed = 50;
    if (fgRes.status === 'fulfilled' && fgRes.value.ok) {
      const fgData = await fgRes.value.json();
      fearGreed = parseInt(fgData.data?.[0]?.value || '50');
    }

    if (fearGreed < 30) {
      opportunities.push({
        id: 'dca-btc-fear',
        title: 'BTC DCA - Extreme Fear',
        description: `Fear & Greed at ${fearGreed} (Extreme Fear). Historically, buying during fear leads to above-average returns.`,
        type: 'Trade',
        successProbability: 80,
        potentialReturn: 25,
        riskLevel: 'Low',
        timeFrame: 'Long-term',
        source: 'fear-greed-analysis',
        updatedAt: new Date().toISOString(),
      });
    } else if (fearGreed > 75) {
      opportunities.push({
        id: 'take-profit-greed',
        title: 'Take Profits - Extreme Greed',
        description: `Fear & Greed at ${fearGreed} (Extreme Greed). Consider taking partial profits.`,
        type: 'Trade',
        successProbability: 70,
        potentialReturn: 0,
        riskLevel: 'Low',
        timeFrame: 'Immediate',
        source: 'fear-greed-analysis',
        updatedAt: new Date().toISOString(),
      });
    }

    // Always add a general BTC strategy
    opportunities.push({
      id: 'btc-accumulation',
      title: 'BTC Accumulation Strategy',
      description: `Systematic BTC accumulation. Current F&G: ${fearGreed}.`,
      type: 'Trade',
      successProbability: 75,
      potentialReturn: 20,
      riskLevel: 'Medium',
      timeFrame: 'Long-term',
      source: 'market-analysis',
      updatedAt: new Date().toISOString(),
    });

    const result = { opportunities };
    oppCache = result;
    cacheTimestamp = Date.now();

    return NextResponse.json({ success: true, ...result, source: 'real-apis', timestamp: Date.now() });
  } catch (error) {
    console.error('[Opportunities] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
