'use client';

import { useState, useEffect } from 'react';

interface RunesTradingPair {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: string;
  totalSupply: number;
  isHot: boolean;
}

interface RunesVolumeLeader {
  id: string;
  name: string;
  symbol: string;
  volume24h: string;
  trades24h: number;
  marketCap: string;
  volumeChange: number;
}

interface RunesNewLaunch {
  id: string;
  name: string;
  symbol: string;
  launchDate: string;
  initialPrice: number;
  currentPrice: number;
  totalSupply: number;
  priceIncrease: number;
}

interface RunesData {
  tradingPairs: RunesTradingPair[];
  volumeLeaders: RunesVolumeLeader[];
  newLaunches: RunesNewLaunch[];
  loading: boolean;
  error: string | null;
}

export function useRunesData(): RunesData {
  const [data, setData] = useState<RunesData>({
    tradingPairs: [],
    volumeLeaders: [],
    newLaunches: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchRunesData() {
      try {
        const res = await fetch('/api/runes/popular');
        if (!res.ok) {
          throw new Error(`Failed to fetch runes data: ${res.status}`);
        }
        const json = await res.json();
        const runes = json.data || json.runes || [];

        if (cancelled) return;

        // Map API response to trading pairs format
        const tradingPairs: RunesTradingPair[] = runes.map((rune: any, index: number) => ({
          id: String(index + 1),
          name: rune.name || rune.spaced_name || 'Unknown',
          symbol: rune.symbol || rune.name?.substring(0, 4) || '?',
          price: rune.price_usd || rune.floor_price || 0,
          change24h: rune.change_24h || 0,
          volume24h: String(rune.volume_24h || '0'),
          totalSupply: rune.total_supply || rune.supply || 0,
          isHot: (rune.change_24h || 0) > 10
        }));

        setData({
          tradingPairs,
          volumeLeaders: [], // Requires dedicated volume endpoint
          newLaunches: [], // Requires dedicated launches endpoint
          loading: false,
          error: null
        });
      } catch (err) {
        if (cancelled) return;
        setData({
          tradingPairs: [],
          volumeLeaders: [],
          newLaunches: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load runes data'
        });
      }
    }

    fetchRunesData();
    return () => { cancelled = true; };
  }, []);

  return data;
}
