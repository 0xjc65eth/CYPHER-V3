import { useQuery } from '@tanstack/react-query';
import type {
  DYdXMarket,
  DYdXOrderbook,
  DYdXCandle,
  DYdXTrade,
  DYdXFundingRate,
  DYdXCandleResolution,
} from '@/types/dydx';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDydxMarkets() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dydx-markets'],
    queryFn: () => fetcher('/api/dydx?endpoint=markets'),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  return {
    markets: (data?.data || []) as DYdXMarket[],
    isLoading,
    error,
  };
}

export function useDydxOrderbook(ticker: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dydx-orderbook', ticker],
    queryFn: () => fetcher(`/api/dydx?endpoint=orderbook&ticker=${encodeURIComponent(ticker)}`),
    enabled: !!ticker,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    staleTime: 2_000,
  });

  return {
    orderbook: (data?.data || { bids: [], asks: [] }) as DYdXOrderbook,
    isLoading,
    error,
  };
}

export function useDydxCandles(
  ticker: string,
  resolution: DYdXCandleResolution = '1HOUR'
) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dydx-candles', ticker, resolution],
    queryFn: () => fetcher(`/api/dydx?endpoint=candles&ticker=${encodeURIComponent(ticker)}&resolution=${resolution}`),
    enabled: !!ticker,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    staleTime: 5_000,
  });

  return {
    candles: (data?.data || []) as DYdXCandle[],
    isLoading,
    error,
  };
}

export function useDydxTrades(ticker: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dydx-trades', ticker],
    queryFn: () => fetcher(`/api/dydx?endpoint=trades&ticker=${encodeURIComponent(ticker)}`),
    enabled: !!ticker,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 3_000,
  });

  return {
    trades: (data?.data || []) as DYdXTrade[],
    isLoading,
    error,
  };
}

export function useDydxFundingRates(ticker: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dydx-funding', ticker],
    queryFn: () => fetcher(`/api/dydx?endpoint=funding&ticker=${encodeURIComponent(ticker)}`),
    enabled: !!ticker,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  return {
    fundingRates: (data?.data || []) as DYdXFundingRate[],
    isLoading,
    error,
  };
}
