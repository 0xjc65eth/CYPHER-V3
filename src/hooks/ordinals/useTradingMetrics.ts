/**
 * useTradingMetrics Hook
 * Fetches and manages trading metrics including VWAP, volume analysis, and trade size distribution
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { TradingMetrics } from '@/app/api/ordinals/trading-metrics/[symbol]/route';

export interface UseTradingMetricsOptions {
  symbol: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseTradingMetricsResult {
  metrics: TradingMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTradingMetrics({
  symbol,
  enabled = true,
  refetchInterval = 30000 // 30 seconds
}: UseTradingMetricsOptions): UseTradingMetricsResult {
  const {
    data: metrics = null,
    isLoading,
    error,
    refetch
  } = useQuery<TradingMetrics, Error>({
    queryKey: ['trading-metrics', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/ordinals/trading-metrics/${symbol}/`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch trading metrics');
      }

      return response.json();
    },
    enabled: enabled && typeof window !== 'undefined',
    refetchInterval,
    staleTime: 20000, // Consider data stale after 20 seconds
    retry: 2,
    retryDelay: 1000
  });

  return {
    metrics,
    isLoading,
    error: error as Error | null,
    refetch
  };
}
