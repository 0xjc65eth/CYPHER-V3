'use client';
import { useState, useEffect, useCallback } from 'react';

interface EconomicIndicator {
  value: number;
  date: string;
  previousValue?: number;
  change?: number;
}

export interface EconomicData {
  indicators: Record<string, EconomicIndicator>;
  treasuryYieldCurve: Record<string, number>;
  yieldSpread2s10s: number;
  yieldCurveInverted: boolean;
  timestamp: number;
}

export function useEconomicData(refreshInterval = 1800000) {
  const [data, setData] = useState<EconomicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/economic-data/');
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
