import type { ArbitrageOpportunity } from './types';

interface MarketPrice {
  price: number;
  liquidity: number;
  source: string;
}

async function fetchMagicEdenPrice(rune: string): Promise<MarketPrice> {
  try {
    const res = await fetch(`/api/magiceden/runes/market/${encodeURIComponent(rune)}/`);
    if (!res.ok) return { price: 0, liquidity: 0, source: 'magiceden' };
    const data = await res.json();

    const floorPrice = data.floorUnitPrice?.value || data.floorPrice || 0;
    const volume = data.volume24h || data.totalVolume || 0;
    const listed = data.listedCount || 0;
    const liquidity = Math.min(100, (volume / 1000) + (listed * 2));

    return { price: Number(floorPrice), liquidity: Math.round(liquidity), source: 'magiceden' };
  } catch {
    return { price: 0, liquidity: 0, source: 'magiceden' };
  }
}

async function fetchUniSatPrice(runeid: string): Promise<MarketPrice> {
  try {
    const res = await fetch(`/api/unisat/runes/${encodeURIComponent(runeid)}/info/`);
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
  runeNames: { name: string; spaced_name: string; runeid?: string }[]
): Promise<ArbitrageOpportunity[]> {
  const topRunes = runeNames.slice(0, 20);

  const opportunities = await Promise.all(
    topRunes.map(async (rune) => {
      try {
        const [magicEdenData, uniSatData] = await Promise.all([
          fetchMagicEdenPrice(rune.spaced_name || rune.name),
          fetchUniSatPrice(rune.runeid || rune.name),
        ]);

        if (magicEdenData.price === 0 && uniSatData.price === 0) return null;

        const prices = [
          { price: magicEdenData.price || 1, name: 'Magic Eden', liquidity: magicEdenData.liquidity },
          { price: uniSatData.price || 1, name: 'UniSat', liquidity: uniSatData.liquidity },
        ];

        const sorted = [...prices].sort((a, b) => a.price - b.price);
        const minPrice = sorted[0].price;
        const maxPrice = sorted[sorted.length - 1].price;
        const spread = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;
        const netProfit = spread - 4.5;

        if (netProfit <= 0.1) return null;

        const avgLiquidity = (magicEdenData.liquidity + uniSatData.liquidity) / 2;
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
          magicEdenPrice: magicEdenData.price,
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
