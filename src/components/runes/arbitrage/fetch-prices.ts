import type { ArbitrageOpportunity } from './types';

interface MarketPrice {
  price: number;
  liquidity: number;
  source: string;
}

const FETCH_TIMEOUT = 8000; // 8s per request

function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchXversePrice(rune: string): Promise<MarketPrice> {
  try {
    // Use market-overview which already has Xverse data with prices
    const res = await fetchWithTimeout(`/api/runes/market-overview/?limit=100`);
    if (!res.ok) return { price: 0, liquidity: 0, source: 'xverse' };
    const data = await res.json();

    const runeData = (data.data || []).find((r: any) =>
      r.spaced_name === rune || r.name === rune
    );
    if (!runeData) return { price: 0, liquidity: 0, source: 'xverse' };

    const floorPrice = runeData.floorPrice || 0;
    const volume = runeData.volume24h || 0;
    const listed = runeData.listed || 0;
    const liquidity = Math.min(100, (volume / 1000) + (listed * 2));

    return { price: Number(floorPrice), liquidity: Math.round(liquidity), source: 'xverse' };
  } catch {
    return { price: 0, liquidity: 0, source: 'xverse' };
  }
}

// Cache the Xverse market overview to avoid N+1 fetches
let xverseCacheData: any[] | null = null;
let xverseCacheTime = 0;
const XVERSE_CACHE_TTL = 30_000;

async function getXverseMarketData(): Promise<any[]> {
  if (xverseCacheData && Date.now() - xverseCacheTime < XVERSE_CACHE_TTL) {
    return xverseCacheData;
  }
  try {
    const res = await fetchWithTimeout(`/api/runes/market-overview/?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    xverseCacheData = data.data || [];
    xverseCacheTime = Date.now();
    return xverseCacheData!;
  } catch {
    return xverseCacheData || [];
  }
}

async function fetchUniSatPrice(runeid: string): Promise<MarketPrice> {
  try {
    const res = await fetchWithTimeout(`/api/unisat/runes/${encodeURIComponent(runeid)}/info/`);
    if (!res.ok) return { price: 0, liquidity: 0, source: 'unisat' };
    const data = await res.json();

    const runeData = data.data || data;
    if (!runeData) return { price: 0, liquidity: 0, source: 'unisat' };

    const marketCap = Number(runeData.marketCap || 0);
    const supply = Number(runeData.supply || 0);
    if (supply === 0) return { price: 0, liquidity: 0, source: 'unisat' };

    const price = marketCap / supply;
    const holders = Number(runeData.holders || 0);
    const transactions = Number(runeData.transactions || 0);
    const liquidity = Math.min(100, (holders / 10) + (transactions / 100));

    return { price: Math.round(price), liquidity: Math.round(liquidity), source: 'unisat' };
  } catch {
    return { price: 0, liquidity: 0, source: 'unisat' };
  }
}

export async function generateOpportunities(
  runeNames: { name: string; spaced_name: string; id?: string; runeid?: string }[]
): Promise<ArbitrageOpportunity[]> {
  const topRunes = runeNames.slice(0, 20);

  // Fetch Xverse data once for all runes
  const xverseMarket = await getXverseMarketData();

  const opportunities = await Promise.all(
    topRunes.map(async (rune) => {
      try {
        // Get Xverse price from cached market data
        const xverseRune = xverseMarket.find((r: any) =>
          r.spaced_name === rune.spaced_name || r.name === rune.name
        );
        const xverseData: MarketPrice = xverseRune
          ? {
              price: Number(xverseRune.floorPrice || 0),
              liquidity: Math.min(100, (Number(xverseRune.volume24h || 0) / 1000) + (Number(xverseRune.listed || 0) * 2)),
              source: 'xverse'
            }
          : { price: 0, liquidity: 0, source: 'xverse' };

        // Use id or runeid for UniSat, fallback to spaced_name
        const uniSatKey = rune.runeid || rune.id || rune.spaced_name || rune.name;
        const uniSatData = await fetchUniSatPrice(uniSatKey);

        if (xverseData.price === 0 && uniSatData.price === 0) return null;

        const prices = [
          { price: xverseData.price || 1, name: 'Xverse', liquidity: xverseData.liquidity },
          { price: uniSatData.price || 1, name: 'UniSat', liquidity: uniSatData.liquidity },
        ];

        const sorted = [...prices].sort((a, b) => a.price - b.price);
        const minPrice = sorted[0].price;
        const maxPrice = sorted[sorted.length - 1].price;
        const spread = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;
        const netProfit = spread - 4.5;

        if (netProfit <= 0.1) return null;

        const avgLiquidity = (xverseData.liquidity + uniSatData.liquidity) / 2;
        const liquidity: 'High' | 'Medium' | 'Low' =
          avgLiquidity > 60 ? 'High' : avgLiquidity > 30 ? 'Medium' : 'Low';

        const priceVariance = (maxPrice - minPrice) / ((maxPrice + minPrice) / 2);
        const confidenceBase = Math.min(50, spread * 5);
        const liquidityBonus = avgLiquidity * 0.3;
        const variancePenalty = priceVariance > 0.2 ? -10 : 0;
        const confidence = Math.min(95, Math.max(20, Math.round(confidenceBase + liquidityBonus + variancePenalty)));

        const executionDifficulty: 'Easy' | 'Medium' | 'Hard' =
          liquidity === 'High' && spread > 3 ? 'Easy' :
          liquidity === 'Medium' || (liquidity === 'High' && spread < 3) ? 'Medium' : 'Hard';

        const baseTime = 15;
        const difficultyMultiplier = executionDifficulty === 'Easy' ? 1 : executionDifficulty === 'Medium' ? 1.5 : 2;
        const crossMarketplacePenalty = sorted[0].name !== sorted[sorted.length - 1].name ? 1.2 : 1;
        const estimatedTimeMinutes = Math.round(baseTime * difficultyMultiplier * crossMarketplacePenalty);

        return {
          id: rune.name,
          runeName: rune.name,
          spacedName: rune.spaced_name || rune.name,
          xversePrice: xverseData.price,
          uniSatPrice: uniSatData.price,
          spread: Math.round(spread * 100) / 100,
          bestBuy: sorted[0].name,
          bestSell: sorted[sorted.length - 1].name,
          netProfit: Math.round(netProfit * 100) / 100,
          liquidity,
          confidence,
          executionDifficulty,
          estimatedTimeMinutes,
        } as ArbitrageOpportunity;
      } catch {
        return null;
      }
    })
  );

  return opportunities
    .filter((o): o is ArbitrageOpportunity => o !== null)
    .sort((a, b) => b.netProfit - a.netProfit);
}
