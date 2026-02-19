'use client';
import { useState, useEffect, useCallback } from 'react';

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  image: string;
}

interface ForexPair {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

interface CommodityAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

interface IndexAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface MultiAssetData {
  crypto: CryptoAsset[];
  forex: ForexPair[];
  commodities: CommodityAsset[];
  indices: IndexAsset[];
  stocks: StockAsset[];
  timestamp: number;
}

export function useMultiAssetData(refreshInterval = 120000) {
  const [data, setData] = useState<MultiAssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/multi-asset/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
