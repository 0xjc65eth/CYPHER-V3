'use client';

import { useQuery } from '@tanstack/react-query';

interface RuneMarketData {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  holders: number;
  transactions24h: number;
  highPrice24h: number;
  lowPrice24h: number;
  priceHistory: { time: string; price: number }[];
}

interface AggregatedMarketData {
  unisat: RuneMarketData | null;
  okx: RuneMarketData | null;
  gamma: RuneMarketData | null;
  aggregated: RuneMarketData | null;
}

export function useRunesMarket(runeName: string = 'all') {
  const fetchAllMarketData = async (): Promise<AggregatedMarketData> => {
    try {
      // Fetch from multiple sources in parallel
      const [unisatData, marketDataResult] = await Promise.allSettled([
        fetchUnisatData(runeName),
        fetchMarketData(runeName)
      ]);

      const unisat = unisatData.status === 'fulfilled' ? unisatData.value : null;
      const gamma = marketDataResult.status === 'fulfilled' ? marketDataResult.value : null;

      // Aggregate data from multiple sources
      const aggregated = aggregateMarketData(unisat, gamma);

      return {
        unisat,
        okx: null, // OKX integration not yet available
        gamma,
        aggregated
      };
    } catch (error) {
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['runesMarket', runeName],
    queryFn: fetchAllMarketData,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 2,
  });

  return {
    data,
    isLoading,
    error,
    refetch
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchUnisatData(runeName: string): Promise<RuneMarketData | null> {
  try {
    if (runeName === 'all') {
      // Fetch aggregated data for all runes via proxy
      const response = await fetch('/api/unisat/runes/list/?limit=100');
      if (!response.ok) throw new Error('Failed to fetch runes list');
      const { list, total } = await response.json();

      const totalHolders = list.reduce((sum: number, rune: any) => sum + (rune.holders || 0), 0);
      const totalTransactions = list.reduce((sum: number, rune: any) => sum + (rune.transactions || 0), 0);
      const totalSupply = list.reduce((sum: number, rune: any) => {
        const supply = parseFloat(rune.supply || '0');
        return sum + (isNaN(supply) ? 0 : supply);
      }, 0);

      return {
        name: 'All Runes',
        symbol: 'RUNES',
        price: 0, // No aggregated price available
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
        holders: totalHolders,
        transactions24h: totalTransactions,
        highPrice24h: 0,
        lowPrice24h: 0,
        priceHistory: []
      };
    }

    // Fetch specific rune data via proxy
    const response2 = await fetch('/api/unisat/runes/list/?limit=1000');
    if (!response2.ok) throw new Error('Failed to fetch runes data');
    const runesData = await response2.json();
    const rune = runesData.list?.find((r: any) =>
      r.rune === runeName ||
      r.spacedRune === runeName ||
      r.spacedRune?.replace(/•/g, '') === runeName.replace(/•/g, '')
    );

    if (!rune) {
      return null;
    }

    const supply = parseFloat(rune.supply || '0');
    const marketCap = 0; // Price not available from UniSat indexer - will use Gamma.io data if available

    return {
      name: rune.spacedRune,
      symbol: rune.symbol,
      price: 0, // UniSat indexer doesn't provide price
      change24h: 0,
      volume24h: 0,
      marketCap: marketCap,
      holders: rune.holders || 0,
      transactions24h: rune.transactions || 0,
      highPrice24h: 0,
      lowPrice24h: 0,
      priceHistory: []
    };
  } catch {
    return null;
  }
}

async function fetchMarketData(runeName: string): Promise<RuneMarketData | null> {
  try {
    if (runeName === 'all') {
      // Gamma.io doesn't have aggregated endpoint, skip for 'all'
      return null;
    }

    // Fetch market info and activities for specific rune via proxy
    const [marketInfo, activities] = await Promise.allSettled([
      fetch(`/api/marketplace/runes/${runeName}/market/`).then(r => r.ok ? r.json() : null),
      fetch(`/api/runes/activity/${runeName}/?limit=100`).then(r => r.ok ? r.json() : null)
    ]);

    const market = marketInfo.status === 'fulfilled' ? marketInfo.value : null;
    const acts = activities.status === 'fulfilled' ? activities.value : null;

    if (!market) {
      return null;
    }

    // Calculate 24h volume from activities
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent24hActivities = acts?.activities?.filter((a: any) =>
      new Date(a.createdAt).getTime() > oneDayAgo
    ) || [];

    const volume24h = recent24hActivities.reduce((sum: number, activity: any) => {
      const amount = parseFloat(activity.listedPrice || activity.totalPrice || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const floorPrice = parseFloat(market.floorUnitPrice?.formatted || '0');
    const totalListings = market.totalListed || 0;

    return {
      name: market.runeName || runeName,
      symbol: market.runeSymbol || '',
      price: floorPrice,
      change24h: 0, // Gamma.io doesn't provide 24h change
      volume24h: volume24h,
      marketCap: floorPrice * totalListings, // Rough estimate
      holders: market.uniqueHolders || 0,
      transactions24h: recent24hActivities.length,
      highPrice24h: floorPrice, // Not available, use floor as estimate
      lowPrice24h: floorPrice,
      priceHistory: []
    };
  } catch {
    return null;
  }
}

function aggregateMarketData(
  unisat: RuneMarketData | null,
  gamma: RuneMarketData | null
): RuneMarketData | null {
  // If both are null, return null
  if (!unisat && !gamma) return null;

  // If one is null, return the other
  if (!unisat) return gamma;
  if (!gamma) return unisat;

  // Aggregate data from both sources
  return {
    name: unisat.name || gamma.name,
    symbol: unisat.symbol || gamma.symbol,
    price: gamma.price || 0, // Gamma.io has price, UniSat doesn't
    change24h: gamma.change24h || 0,
    volume24h: gamma.volume24h || 0,
    marketCap: gamma.marketCap || unisat.marketCap || 0,
    holders: Math.max(unisat.holders || 0, gamma.holders || 0), // Take higher value
    transactions24h: Math.max(unisat.transactions24h || 0, gamma.transactions24h || 0),
    highPrice24h: gamma.highPrice24h || 0,
    lowPrice24h: gamma.lowPrice24h || 0,
    priceHistory: gamma.priceHistory || unisat.priceHistory || []
  };
}