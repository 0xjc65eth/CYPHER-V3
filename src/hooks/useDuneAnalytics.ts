'use client';

import { useState, useEffect, useCallback } from 'react';

interface DEXRanking {
  rank: number;
  project: string;
  volume7d: number;
  volume24h: number;
}

export function useDuneDEXVolume(refreshInterval = 300_000) {
  const [data, setData] = useState<DEXRanking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dune/?query=dex-volume');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch DEX data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error };
}
