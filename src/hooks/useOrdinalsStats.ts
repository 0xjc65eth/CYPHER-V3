import { useQuery } from '@tanstack/react-query'

const STATS_COLLECTIONS = [
  'bitcoin-punks',
  'nodemonkes',
  'bitcoin-puppets',
  'quantum-cats',
  'runestones',
  'bitmap',
  'ink',
  'ordinal-maxi-biz',
];

export function useOrdinalsStats() {
  return useQuery({
    queryKey: ['ordinals-stats'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ordinals-stats/')
        if (!response.ok) {
          throw new Error(`Failed to fetch ordinals stats: ${response.status}`)
        }

        const data = await response.json()

        return data
      } catch (apiError) {

        // Fallback: use cached /api/ordinals endpoint
        const fallbackRes = await fetch('/api/ordinals/');
        if (!fallbackRes.ok) throw new Error('Fallback ordinals API failed');
        const fallbackJson = await fallbackRes.json();

        if (!fallbackJson.success || !fallbackJson.data?.trending_collections) {
          throw new Error('Invalid fallback response');
        }

        let totalVolume = 0;
        let totalMarketCap = 0;
        let totalHolders = 0;
        const popularCollections: Array<{
          name: string;
          volume_24h: number;
          floor_price: string;
          unique_holders: number;
          sales_24h: number;
        }> = [];

        for (const c of fallbackJson.data.trending_collections) {
          const volumeBtc = c.volume ?? 0;
          const floorBtc = c.floor ?? 0;

          totalVolume += volumeBtc;
          totalMarketCap += floorBtc * (c.supply || 0);
          totalHolders += c.owners || 0;

          popularCollections.push({
            name: c.name || c.symbol,
            volume_24h: volumeBtc,
            floor_price: floorBtc.toFixed(6),
            unique_holders: c.owners || 0,
            sales_24h: c.listed || 0,
          });
        }

        return {
          volume_24h: totalVolume,
          volume_change_24h: 0,
          price_change_24h: 0,
          market_cap: totalMarketCap,
          unique_holders: totalHolders,
          available_supply: 0,
          popular_collections: popularCollections,
        }
      }
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  })
}
