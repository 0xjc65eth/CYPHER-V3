'use client';

import { useState, useEffect } from 'react';

interface OrdinalsCollection {
  id: string;
  name: string;
  supply: number;
  floorPrice: string;
  change24h: number;
  volume24h: string;
}

interface NewInscription {
  id: string;
  number: number;
  contentType: string;
  size: string;
  timestamp: string;
  fee: number;
}

interface RareInscription {
  id: string;
  name: string;
  category: string;
  rarityScore: number;
  rarityRank: number;
  traits: number;
  lastSale: string;
  holders: number;
}

interface OrdinalsData {
  collections: OrdinalsCollection[];
  newInscriptions: NewInscription[];
  rareInscriptions: RareInscription[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for ordinals data.
 * Fetches real data from the Hiro ordinals API via the internal proxy.
 */
export function useOrdinalsData(): OrdinalsData {
  const [data, setData] = useState<OrdinalsData>({
    collections: [],
    newInscriptions: [],
    rareInscriptions: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchOrdinalsData() {
      try {
        // Fetch recent inscriptions from Hiro API via proxy
        const res = await fetch('/api/hiro-ordinals?endpoint=inscriptions&limit=10');
        if (!res.ok) {
          throw new Error(`Failed to fetch ordinals data: ${res.status}`);
        }
        const json = await res.json();
        const results = json.data?.results || json.results || [];

        if (cancelled) return;

        const newInscriptions: NewInscription[] = results.map((ins: any, index: number) => ({
          id: String(index + 1),
          number: ins.number || ins.inscription_number || 0,
          contentType: ins.content_type?.split('/')[0] || 'unknown',
          size: ins.content_length ? `${Math.round(ins.content_length / 1024)}KB` : 'N/A',
          timestamp: ins.timestamp ? new Date(ins.timestamp).toISOString() : 'N/A',
          fee: ins.fee || 0
        }));

        setData({
          collections: [], // Collection aggregation requires dedicated endpoint
          newInscriptions,
          rareInscriptions: [], // Rarity scoring requires dedicated service
          loading: false,
          error: null
        });
      } catch (err) {
        if (cancelled) return;
        setData({
          collections: [],
          newInscriptions: [],
          rareInscriptions: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load ordinals data'
        });
      }
    }

    fetchOrdinalsData();
    return () => { cancelled = true; };
  }, []);

  return data;
}
