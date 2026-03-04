// React hooks for CoinMarketCap API
import { useState, useEffect, useCallback } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import CMC from '../index';
import type {
  Cryptocurrency,
  GlobalMetrics,
  FearGreedIndex,
  AltcoinSeasonIndex,
  ListingsLatestParams,
  QuotesLatestParams,
  TrendingLatestParams,
  OHLCVParams,
} from '../types';

// Hook for cryptocurrency listings
export function useCryptocurrencyListings(
  params?: ListingsLatestParams,
  options?: UseQueryOptions<Cryptocurrency[]>
) {
  return useQuery<Cryptocurrency[]>({
    queryKey: ['cmc', 'listings', params],
    queryFn: () => CMC.listings(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Hook for cryptocurrency quotes
export function useCryptocurrencyQuotes(
  params: QuotesLatestParams,
  options?: UseQueryOptions<Record<string, Cryptocurrency>>
) {
  return useQuery<Record<string, Cryptocurrency>>({
    queryKey: ['cmc', 'quotes', params],
    queryFn: () => CMC.quotes(params),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!(params.id || params.symbol || params.slug),
    ...options,
  });
}

// Hook for single cryptocurrency
export function useCryptocurrency(
  symbol: string,
  options?: UseQueryOptions<Cryptocurrency>
) {
  return useQuery<Cryptocurrency>({
    queryKey: ['cmc', 'crypto', symbol],
    queryFn: () => CMC.getBySymbol(symbol),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!symbol,
    ...options,
  });
}

// Hook for global metrics
export function useGlobalMetrics(
  convert = 'USD',
  options?: UseQueryOptions<GlobalMetrics>
) {
  return useQuery<GlobalMetrics>({
    queryKey: ['cmc', 'globalMetrics', convert],
    queryFn: () => CMC.globalMetrics({ convert }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Hook for market statistics
export function useMarketStatistics(convert: 'USD' | string = 'USD') {
  return useQuery({
    queryKey: ['cmc', 'marketStats', convert],
    queryFn: () => CMC.marketStats(convert as any),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for Fear & Greed Index
export function useFearGreedIndex(options?: UseQueryOptions<FearGreedIndex>) {
  return useQuery<FearGreedIndex>({
    queryKey: ['cmc', 'fearGreed'],
    queryFn: () => CMC.fearGreed(),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

// Hook for Altcoin Season Index
export function useAltcoinSeasonIndex(options?: UseQueryOptions<AltcoinSeasonIndex>) {
  return useQuery<AltcoinSeasonIndex>({
    queryKey: ['cmc', 'altcoinSeason'],
    queryFn: () => CMC.altcoinSeason(),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

// Hook for market sentiment
export function useMarketSentiment() {
  return useQuery({
    queryKey: ['cmc', 'sentiment'],
    queryFn: () => CMC.sentiment(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for trending cryptocurrencies
export function useTrending(
  params?: TrendingLatestParams,
  options?: UseQueryOptions<any>
) {
  return useQuery({
    queryKey: ['cmc', 'trending', params],
    queryFn: () => CMC.trending(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Hook for gainers and losers
export function useGainersLosers(
  params?: TrendingLatestParams,
  options?: UseQueryOptions<{ gainers: Cryptocurrency[]; losers: Cryptocurrency[] }>
) {
  return useQuery({
    queryKey: ['cmc', 'gainersLosers', params],
    queryFn: () => CMC.gainersLosers(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Hook for most visited
export function useMostVisited(
  params?: TrendingLatestParams,
  options?: UseQueryOptions<Cryptocurrency[]>
) {
  return useQuery<Cryptocurrency[]>({
    queryKey: ['cmc', 'mostVisited', params],
    queryFn: () => CMC.mostVisited(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Hook for price conversion
export function usePriceConversion(
  amount: number,
  from: string,
  to: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['cmc', 'convert', amount, from, to],
    queryFn: () => CMC.convertCrypto(amount, from, to),
    staleTime: 60 * 1000, // 1 minute
    enabled: enabled && !!from && !!to && amount > 0,
  });
}

// Hook for portfolio tracking
export function usePortfolio(holdings: { symbol: string; amount: number }[]) {
  return useQuery({
    queryKey: ['cmc', 'portfolio', holdings],
    queryFn: async () => {
      if (!holdings.length) return { assets: [], totalValue: 0 };
      
      const symbols = holdings.map(h => h.symbol).join(',');
      const quotes = await CMC.quotes({ symbol: symbols });
      
      let totalValue = 0;
      const assets = holdings.map(holding => {
        const crypto = Object.values(quotes).find(q => q.symbol === holding.symbol);
        if (!crypto) return null;
        
        const value = holding.amount * crypto.quote.USD.price;
        totalValue += value;
        
        return {
          ...crypto,
          holding: holding.amount,
          value,
          weight: 0, // Will calculate after total
        };
      }).filter(Boolean);
      
      // Calculate weights
      assets.forEach(asset => {
        if (asset) {
          asset.weight = (asset.value / totalValue) * 100;
        }
      });
      
      return { assets, totalValue };
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: holdings.length > 0,
  });
}

// Hook for real-time price updates (simulated with polling)
export function useRealTimePrices(
  symbols: string[],
  interval = 30000 // 30 seconds
) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!symbols.length) return;
    
    try {
      const quotes = await CMC.quotes({ symbol: symbols.join(',') });
      const newPrices: Record<string, number> = {};
      
      Object.values(quotes).forEach(crypto => {
        newPrices[crypto.symbol] = crypto.quote.USD.price;
      });
      
      setPrices(newPrices);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchPrices();
    const intervalId = setInterval(fetchPrices, interval);
    
    return () => clearInterval(intervalId);
  }, [fetchPrices, interval]);

  return { prices, loading, error, refetch: fetchPrices };
}

// Hook for OHLCV data
export function useOHLCV(
  symbol: string,
  period: string,
  count = 30,
  enabled = true
) {
  return useQuery({
    queryKey: ['cmc', 'ohlcv', symbol, period, count],
    queryFn: () => CMC.ohlcv.historical({
      symbol,
      period: period as OHLCVParams['period'],
      count,
      convert: 'USD',
    }),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: enabled && !!symbol,
  });
}

// Hook for market pairs
export function useMarketPairs(
  symbol: string,
  limit = 10,
  enabled = true
) {
  return useQuery({
    queryKey: ['cmc', 'marketPairs', symbol, limit],
    queryFn: () => CMC.marketPairs({ symbol, limit }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!symbol,
  });
}

// Hook for DeFi statistics
export function useDefiStats(convert = 'USD') {
  return useQuery({
    queryKey: ['cmc', 'defiStats', convert],
    queryFn: () => CMC.defiStats(convert as any),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for dominance trends
export function useDominanceTrends(convert = 'USD') {
  return useQuery({
    queryKey: ['cmc', 'dominance', convert],
    queryFn: () => CMC.dominance(convert as any),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}