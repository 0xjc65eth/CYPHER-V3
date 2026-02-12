import useSWR from 'swr';
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
  const { data, error, isLoading } = useSWR('/api/dydx?endpoint=markets', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  return {
    markets: (data?.data || []) as DYdXMarket[],
    isLoading,
    error,
  };
}

export function useDydxOrderbook(ticker: string) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/dydx?endpoint=orderbook&ticker=${encodeURIComponent(ticker)}` : null,
    fetcher,
    {
      refreshInterval: 5_000,
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
    }
  );

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
  const { data, error, isLoading } = useSWR(
    ticker
      ? `/api/dydx?endpoint=candles&ticker=${encodeURIComponent(ticker)}&resolution=${resolution}`
      : null,
    fetcher,
    {
      refreshInterval: 15_000,
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    }
  );

  return {
    candles: (data?.data || []) as DYdXCandle[],
    isLoading,
    error,
  };
}

export function useDydxTrades(ticker: string) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/dydx?endpoint=trades&ticker=${encodeURIComponent(ticker)}` : null,
    fetcher,
    {
      refreshInterval: 10_000,
      revalidateOnFocus: true,
      dedupingInterval: 3_000,
    }
  );

  return {
    trades: (data?.data || []) as DYdXTrade[],
    isLoading,
    error,
  };
}

export function useDydxFundingRates(ticker: string) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/dydx?endpoint=funding&ticker=${encodeURIComponent(ticker)}` : null,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    fundingRates: (data?.data || []) as DYdXFundingRate[],
    isLoading,
    error,
  };
}
