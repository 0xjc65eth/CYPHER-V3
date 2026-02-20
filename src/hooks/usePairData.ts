import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';

// Fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Types
interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OrderBookData {
  bids: Array<{ price: number; amount: number; total: number }>;
  asks: Array<{ price: number; amount: number; total: number }>;
  spread: number;
  midPrice: number;
}

interface PairStats {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap: number;
  tvl: number;
  holders: number;
}

interface TechnicalIndicators {
  rsi: number[];
  macd: { line: number[]; signal: number[]; histogram: number[] };
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  vwap: number[];
  volumeProfile: Array<{ price: number; volume: number }>;
}

// Main hook for pair data
export function usePairData(base: string, quote: string) {
  const pair = `${base}-${quote}`;

  const { data: candles1m } = useQuery({
    queryKey: ['pair-candles', pair, '1m'],
    queryFn: () => fetcher(`/api/pair/${pair}/candles?timeframe=1m`),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: candles5m } = useQuery({
    queryKey: ['pair-candles', pair, '5m'],
    queryFn: () => fetcher(`/api/pair/${pair}/candles?timeframe=5m`),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: candles1h } = useQuery({
    queryKey: ['pair-candles', pair, '1h'],
    queryFn: () => fetcher(`/api/pair/${pair}/candles?timeframe=1h`),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: candles1d } = useQuery({
    queryKey: ['pair-candles', pair, '1d'],
    queryFn: () => fetcher(`/api/pair/${pair}/candles?timeframe=1d`),
    refetchInterval: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['pair-stats', pair],
    queryFn: () => fetcher(`/api/pair/${pair}/stats`),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  const { data: depth, error: depthError } = useQuery({
    queryKey: ['pair-depth', pair],
    queryFn: () => fetcher(`/api/pair/${pair}/depth`),
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
    staleTime: 500,
  });

  const { data: indicators } = useQuery({
    queryKey: ['pair-indicators', pair],
    queryFn: () => fetcher(`/api/pair/${pair}/indicators`),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: trades } = useQuery({
    queryKey: ['pair-trades', pair],
    queryFn: () => fetcher(`/api/pair/${pair}/trades?limit=50`),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  return {
    pair,
    candles: {
      '1m': candles1m?.data || [],
      '5m': candles5m?.data || [],
      '1h': candles1h?.data || [],
      '1d': candles1d?.data || []
    },
    stats: stats?.data as PairStats | null,
    depth: depth?.data as OrderBookData | null,
    indicators: indicators?.data as TechnicalIndicators | null,
    trades: trades?.data || [],
    isLoading: !stats && !statsError,
    hasError: statsError || depthError
  };
}

// Hook for real-time price updates (renamed to avoid conflict with useRealTimePrice in other files)
export function usePairRealTimePrice(base: string, quote: string) {
  const [price, setPrice] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0);

  const { data } = useQuery({
    queryKey: ['pair-ticker', base, quote],
    queryFn: () => fetcher(`/api/pair/${base}-${quote}/ticker`),
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
    staleTime: 500,
  });

  useEffect(() => {
    if (data?.data) {
      setPrice(data.data.price);
      setChange(data.data.change24h);
      setVolume(data.data.volume24h);
    }
  }, [data]);

  return { price, change, volume, lastUpdate: data?.timestamp };
}

// Keep old name as alias for compatibility
export const useRealTimePrice = usePairRealTimePrice;

// Hook for technical analysis
export function useTechnicalAnalysis(base: string, quote: string, timeframe: string = '1h') {
  const pair = `${base}-${quote}`;

  const { data } = useQuery({
    queryKey: ['pair-technical', pair, timeframe],
    queryFn: () => fetcher(`/api/pair/${pair}/technical?timeframe=${timeframe}`),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const analysis = useMemo(() => {
    if (!data?.data) return null;

    const { rsi, macd, bollinger, vwap } = data.data;

    const rsiSignal = rsi[rsi.length - 1] > 70 ? 'SELL' : rsi[rsi.length - 1] < 30 ? 'BUY' : 'NEUTRAL';
    const macdSignal = macd.line[macd.line.length - 1] > macd.signal[macd.signal.length - 1] ? 'BUY' : 'SELL';
    const currentPrice = data.data.currentPrice || 0;
    const bollingerSignal = currentPrice > bollinger.upper[bollinger.upper.length - 1] ? 'SELL' :
                           currentPrice < bollinger.lower[bollinger.lower.length - 1] ? 'BUY' : 'NEUTRAL';

    const signals = [rsiSignal, macdSignal, bollingerSignal];
    const buyCount = signals.filter(s => s === 'BUY').length;
    const sellCount = signals.filter(s => s === 'SELL').length;

    const overallSignal = buyCount > sellCount ? 'BUY' :
                         sellCount > buyCount ? 'SELL' : 'NEUTRAL';

    return {
      rsi: {
        value: rsi[rsi.length - 1],
        signal: rsiSignal,
        strength: Math.abs(50 - rsi[rsi.length - 1]) / 50 * 100
      },
      macd: {
        value: macd.line[macd.line.length - 1],
        signal: macdSignal,
        histogram: macd.histogram[macd.histogram.length - 1]
      },
      bollinger: {
        position: currentPrice,
        upper: bollinger.upper[bollinger.upper.length - 1],
        lower: bollinger.lower[bollinger.lower.length - 1],
        signal: bollingerSignal
      },
      vwap: {
        value: vwap[vwap.length - 1],
        signal: currentPrice > vwap[vwap.length - 1] ? 'BULLISH' : 'BEARISH'
      },
      overall: {
        signal: overallSignal,
        confidence: Math.max(buyCount, sellCount) / signals.length * 100,
        signals: { buy: buyCount, sell: sellCount, neutral: signals.length - buyCount - sellCount }
      }
    };
  }, [data]);

  return {
    analysis,
    rawData: data?.data,
    isLoading: !data,
    lastUpdate: data?.timestamp
  };
}

// Hook for market depth analysis
export function useMarketDepth(base: string, quote: string) {
  const { data } = useQuery({
    queryKey: ['pair-market-depth', base, quote],
    queryFn: () => fetcher(`/api/pair/${base}-${quote}/depth?levels=20`),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const analysis = useMemo(() => {
    if (!data?.data) return null;

    const { bids, asks } = data.data;

    const totalBidVolume = bids.reduce((sum: number, bid: any) => sum + bid.amount, 0);
    const totalAskVolume = asks.reduce((sum: number, ask: any) => sum + ask.amount, 0);
    const imbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);

    const supportLevels = bids.slice(0, 5).map((bid: any) => ({
      price: bid.price,
      strength: bid.amount / totalBidVolume * 100
    }));

    const resistanceLevels = asks.slice(0, 5).map((ask: any) => ({
      price: ask.price,
      strength: ask.amount / totalAskVolume * 100
    }));

    return {
      imbalance,
      totalBidVolume,
      totalAskVolume,
      supportLevels,
      resistanceLevels,
      spread: data.data.spread,
      midPrice: data.data.midPrice
    };
  }, [data]);

  return {
    depth: data?.data,
    analysis,
    isLoading: !data,
    lastUpdate: data?.timestamp
  };
}

// Hook for volume profile
export function useVolumeProfile(base: string, quote: string, period: string = '24h') {
  const { data } = useQuery({
    queryKey: ['pair-volume-profile', base, quote, period],
    queryFn: () => fetcher(`/api/pair/${base}-${quote}/volume-profile?period=${period}`),
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  const analysis = useMemo(() => {
    if (!data?.data?.profile) return null;

    const profile = data.data.profile;
    const maxVolume = Math.max(...profile.map((p: any) => p.volume));
    const pocLevel = profile.find((p: any) => p.volume === maxVolume);

    const sortedByVolume = [...profile].sort((a: any, b: any) => b.volume - a.volume);
    const totalVolume = profile.reduce((sum: number, p: any) => sum + p.volume, 0);
    const valueAreaVolume = totalVolume * 0.7;

    let accumulatedVolume = 0;
    const valueAreaLevels = [];

    for (const level of sortedByVolume) {
      if (accumulatedVolume < valueAreaVolume) {
        valueAreaLevels.push(level);
        accumulatedVolume += level.volume;
      } else {
        break;
      }
    }

    const valueAreaHigh = Math.max(...valueAreaLevels.map(l => l.price));
    const valueAreaLow = Math.min(...valueAreaLevels.map(l => l.price));

    return {
      poc: pocLevel,
      valueAreaHigh,
      valueAreaLow,
      totalVolume,
      profile: profile.map((p: any) => ({
        ...p,
        percentage: (p.volume / maxVolume) * 100
      }))
    };
  }, [data]);

  return {
    profile: data?.data?.profile || [],
    analysis,
    isLoading: !data,
    lastUpdate: data?.timestamp
  };
}

// Comprehensive dashboard hook
export function usePairDashboard(base: string, quote: string) {
  const pairData = usePairData(base, quote);
  const realTimePrice = usePairRealTimePrice(base, quote);
  const technicalAnalysis = useTechnicalAnalysis(base, quote);
  const marketDepth = useMarketDepth(base, quote);
  const volumeProfile = useVolumeProfile(base, quote);

  return {
    ...pairData,
    realTime: realTimePrice,
    technical: technicalAnalysis,
    depth: marketDepth,
    volume: volumeProfile,
    isFullyLoaded: !pairData.isLoading && !technicalAnalysis.isLoading && !marketDepth.isLoading
  };
}
