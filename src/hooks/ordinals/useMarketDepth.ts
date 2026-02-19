/**
 * useMarketDepth Hook
 * Fetches and manages market depth analysis including liquidity, walls, and slippage
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { MarketDepthAnalysis } from '@/app/api/ordinals/market-depth/[symbol]/route';

export interface UseMarketDepthOptions {
  symbol: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseMarketDepthResult {
  depthAnalysis: MarketDepthAnalysis | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMarketDepth({
  symbol,
  enabled = true,
  refetchInterval = 30000 // 30 seconds
}: UseMarketDepthOptions): UseMarketDepthResult {
  const {
    data: depthAnalysis = null,
    isLoading,
    error,
    refetch
  } = useQuery<MarketDepthAnalysis, Error>({
    queryKey: ['market-depth', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/ordinals/market-depth/${symbol}/`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch market depth analysis');
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
    depthAnalysis,
    isLoading,
    error: error as Error | null,
    refetch
  };
}
