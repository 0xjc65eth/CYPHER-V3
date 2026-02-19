import { useState, useEffect, useCallback } from 'react';

interface OrdinalsCollection {
  name: string;
  floorPrice: number;
  volume24h: number;
  change24h: number;
  listings: number;
}

interface OrdinalsFloorPricesData {
  collections: OrdinalsCollection[];
  loading: boolean;
  error: string | null;
}

const COLLECTION_SLUGS: Record<string, string> = {
  'bitcoin-punks': 'Bitcoin Punks',
  'nodemonkes': 'NodeMonkes',
  'bitcoin-puppets': 'Bitcoin Puppets',
  'quantum-cats': 'Quantum Cats',
  'runestones': 'Runestones',
  'bitmap': 'Bitmap',
  'ink': 'Ink',
  'ordinal-maxi-biz': 'Ordinal Maxi Biz',
};

export function useOrdinalsFloorPrices() {
  const [data, setData] = useState<OrdinalsFloorPricesData>({
    collections: [],
    loading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    try {
      // Use cached /api/ordinals endpoint (already has all collection data)
      const res = await fetch('/api/ordinals/');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();

      if (!json.success || !json.data?.trending_collections) {
        throw new Error('Invalid ordinals API response');
      }

      const collections: OrdinalsCollection[] = [];
      const slugs = Object.keys(COLLECTION_SLUGS);

      for (const slug of slugs) {
        const displayName = COLLECTION_SLUGS[slug];
        const found = json.data.trending_collections.find(
          (c: Record<string, unknown>) => c.symbol === slug
        );

        if (found) {
          collections.push({
            name: displayName,
            floorPrice: found.floor ?? 0,
            volume24h: (found.volume24h as number) ?? (found.volume as number) ?? 0,
            change24h: found.change ?? 0,
            listings: found.listed ?? 0,
          });
        } else {
          collections.push({
            name: displayName,
            floorPrice: 0,
            volume24h: 0,
            change24h: 0,
            listings: 0,
          });
        }
      }

      setData({
        collections,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[useOrdinalsFloorPrices] Failed to fetch floor prices:', error);
      setData({
        collections: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch floor prices',
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}
