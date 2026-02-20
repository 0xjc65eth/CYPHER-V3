'use client';

import { usePriceData } from './usePriceData';

export function useSimpleBitcoinPrice() {
  const result = usePriceData({ asset: 'BTC', source: 'auto', refetchInterval: 60000 });

  return {
    data: result.price || null,
    isLoading: result.isLoading,
    error: result.error,
  };
}
