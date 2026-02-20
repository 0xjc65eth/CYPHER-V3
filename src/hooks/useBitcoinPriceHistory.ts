import { usePriceData } from './usePriceData';

interface PricePoint {
  timestamp: number;
  price: number;
  volume: number;
}

interface BitcoinPriceHistoryData {
  data: PricePoint[];
  loading: boolean;
  error: string | null;
}

export function useBitcoinPriceHistory(timeframe: string = '24h'): BitcoinPriceHistoryData {
  const result = usePriceData({
    asset: 'BTC',
    source: 'coingecko',
    interval: timeframe,
    includeHistory: true,
    refetchInterval: 120000,
  });

  return {
    data: result.history,
    loading: result.isLoading,
    error: result.error,
  };
}
