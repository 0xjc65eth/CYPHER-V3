/**
 * useOrderBook Hook
 * Fetches and manages order book data for Ordinals collections
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { OrderBookData } from '@/app/api/ordinals/orderbook/[symbol]/route';

export interface UseOrderBookOptions {
  symbol: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseOrderBookResult {
  orderBook: OrderBookData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOrderBook({
  symbol,
  enabled = true,
  refetchInterval = 15000 // 15 seconds
}: UseOrderBookOptions): UseOrderBookResult {
  const {
    data: orderBook = null,
    isLoading,
    error,
    refetch
  } = useQuery<OrderBookData, Error>({
    queryKey: ['orderbook', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/ordinals/orderbook/${symbol}/`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch order book');
      }

      return response.json();
    },
    enabled: enabled && typeof window !== 'undefined',
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 2,
    retryDelay: 1000
  });

  return {
    orderBook,
    isLoading,
    error: error as Error | null,
    refetch
  };
}
