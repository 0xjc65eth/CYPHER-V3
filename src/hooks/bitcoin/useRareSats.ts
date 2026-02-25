'use client';

import { useState, useEffect } from 'react';

interface RareSat {
  id: string;
  name: string;
  number: number;
  category: string;
  rarity: 'legendary' | 'epic' | 'rare' | 'uncommon';
  rarityScore: number;
  floorPrice: string;
  change24h: number;
  holders: number;
  visual?: string;
}

interface RareSatsData {
  rareSats: RareSat[];
  categories: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for rare sats data.
 * Currently returns empty state as there is no public rare sats API available.
 * Rare sat discovery requires wallet connection and on-chain analysis.
 */
export function useRareSats(): RareSatsData {
  const [data, setData] = useState<RareSatsData>({
    rareSats: [],
    categories: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    // No public API for rare sats market data exists.
    // Rare sat identification requires connected wallet + UTXO scanning.
    setData({
      rareSats: [],
      categories: [],
      loading: false,
      error: null
    });
  }, []);

  return data;
}
