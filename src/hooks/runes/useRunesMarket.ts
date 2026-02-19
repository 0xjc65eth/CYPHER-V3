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
  magiceden: RuneMarketData | null;
  aggregated: RuneMarketData | null;
}

export function useRunesMarket(runeName: string = 'all') {
  const fetchMarketData = async (): Promise<AggregatedMarketData> => {
    try {
      // Fetch from multiple sources in parallel
      const [unisatData, magicEdenData] = await Promise.allSettled([
        fetchUnisatData(runeName),
        fetchMagicEdenData(runeName)
      ]);

      const unisat = unisatData.status === 'fulfilled' ? unisatData.value : null;
      const magiceden = magicEdenData.status === 'fulfilled' ? magicEdenData.value : null;

      // Aggregate data from multiple sources
      const aggregated = aggregateMarketData(unisat, magiceden);

      return {
        unisat,
        okx: null, // OKX integration not yet available
        magiceden,
        aggregated
      };
    } catch (error) {
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['runesMarket', runeName],
    queryFn: fetchMarketData,
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

      const totalHolders = list.reduce((sum, rune) => sum + (rune.holders || 0), 0);
      const totalTransactions = list.reduce((sum, rune) => sum + (rune.transactions || 0), 0);
      const totalSupply = list.reduce((sum, rune) => {
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
    const marketCap = 0; // Price not available from UniSat indexer - will use Magic Eden data if available

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

async function fetchMagicEdenData(runeName: string): Promise<RuneMarketData | null> {
  try {
    if (runeName === 'all') {
      // Magic Eden doesn't have aggregated endpoint, skip for 'all'
      return null;
    }

    // Fetch market info and activities for specific rune via proxy
    const [marketInfo, activities] = await Promise.allSettled([
      fetch(`/api/magiceden/runes/${runeName}/market/`).then(r => r.ok ? r.json() : null),
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
    const recent24hActivities = acts?.activities?.filter(a =>
      new Date(a.createdAt).getTime() > oneDayAgo
    ) || [];

    const volume24h = recent24hActivities.reduce((sum, activity) => {
      const amount = parseFloat(activity.listedPrice || activity.totalPrice || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const floorPrice = parseFloat(market.floorUnitPrice?.formatted || '0');
    const totalListings = market.totalListed || 0;

    return {
      name: market.runeName || runeName,
      symbol: market.runeSymbol || '',
      price: floorPrice,
      change24h: 0, // Magic Eden doesn't provide 24h change
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
  magiceden: RuneMarketData | null
): RuneMarketData | null {
  // If both are null, return null
  if (!unisat && !magiceden) return null;

  // If one is null, return the other
  if (!unisat) return magiceden;
  if (!magiceden) return unisat;

  // Aggregate data from both sources
  return {
    name: unisat.name || magiceden.name,
    symbol: unisat.symbol || magiceden.symbol,
    price: magiceden.price || 0, // Magic Eden has price, UniSat doesn't
    change24h: magiceden.change24h || 0,
    volume24h: magiceden.volume24h || 0,
    marketCap: magiceden.marketCap || unisat.marketCap || 0,
    holders: Math.max(unisat.holders || 0, magiceden.holders || 0), // Take higher value
    transactions24h: Math.max(unisat.transactions24h || 0, magiceden.transactions24h || 0),
    highPrice24h: magiceden.highPrice24h || 0,
    lowPrice24h: magiceden.lowPrice24h || 0,
    priceHistory: magiceden.priceHistory || unisat.priceHistory || []
  };
}