'use client';
import { useState, useEffect, useCallback } from 'react';

interface FedDecision {
  date: string;
  action: string;
  rate: number;
  statement?: string;
}

interface FOMCMeeting {
  date: string;
  type: string;
  status: string;
}

export interface FedData {
  currentRate: number | string;
  nextMeeting: {
    date: string;
    type: string;
    daysUntil: number;
  };
  yieldCurveInverted: boolean;
  yieldSpread2s10s: number;
  recentDecisions: FedDecision[];
  fomcSchedule: FOMCMeeting[];
  timestamp?: number;
}

export function useFedIndicators(refreshInterval = 1800000) {
  const [data, setData] = useState<FedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/fed-indicators/');
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
