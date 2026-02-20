'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export interface PriceDataOptions {
  asset: string;
  source?: 'coingecko' | 'binance' | 'internal' | 'auto';
  interval?: string;
  includeHistory?: boolean;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface PriceDataResult {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  lastUpdated: number;
  history: Array<{ timestamp: number; price: number; volume: number }>;
  isLoading: boolean;
  error: string | null;
}

// Symbol to CoinGecko ID mapping
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  ADA: 'cardano',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  ORDI: 'ordi',
  SATS: '1000sats',
};

function getCoinGeckoId(symbol: string): string {
  return SYMBOL_TO_ID[symbol.toUpperCase()] || symbol.toLowerCase();
}

async function fetchPriceData(
  asset: string,
  source: string,
  includeHistory: boolean,
  interval: string
): Promise<PriceDataResult> {
  const symbol = asset.toUpperCase();
  const coingeckoId = getCoinGeckoId(symbol);

  // Default result
  const result: PriceDataResult = {
    price: 0,
    change24h: 0,
    volume24h: 0,
    marketCap: 0,
    high24h: 0,
    low24h: 0,
    lastUpdated: Date.now(),
    history: [],
    isLoading: false,
    error: null,
  };

  try {
    // Try internal API first
    if (source === 'auto' || source === 'internal') {
      try {
        const res = await fetch(`/api/bitcoin-price/?symbol=${symbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data.price) {
            result.price = data.price;
            result.change24h = data.change24h || 0;
            result.volume24h = data.volume24h || 0;
            result.high24h = data.high24h || 0;
            result.low24h = data.low24h || 0;
            result.lastUpdated = Date.now();
          }
        }
      } catch {
        // Fall through to CoinGecko
      }
    }

    // CoinGecko fallback or primary
    if (result.price === 0 || source === 'coingecko') {
      const params = `ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
      const res = await fetch(
        `/api/coingecko/?endpoint=/simple/price&params=${encodeURIComponent(params)}`
      );
      if (res.ok) {
        const data = await res.json();
        const coinData = data[coingeckoId];
        if (coinData) {
          result.price = coinData.usd || result.price;
          result.change24h = coinData.usd_24h_change || result.change24h;
          result.volume24h = coinData.usd_24h_vol || result.volume24h;
          result.marketCap = coinData.usd_market_cap || result.marketCap;
          result.lastUpdated = Date.now();
        }
      }
    }

    // Fetch history if requested
    if (includeHistory && result.price > 0) {
      const days = interval === '24h' ? '1' : interval === '7d' ? '7' : interval === '30d' ? '30' : interval === '1y' ? '365' : '1';
      try {
        const histRes = await fetch(
          `/api/coingecko?endpoint=/coins/${coingeckoId}/market_chart&params=${encodeURIComponent(`vs_currency=usd&days=${days}`)}`
        );
        if (histRes.ok) {
          const histData = await histRes.json();
          const prices = histData.prices || [];
          const volumes = histData.total_volumes || [];
          result.history = prices.map((p: [number, number], i: number) => ({
            timestamp: p[0],
            price: p[1],
            volume: volumes[i] ? volumes[i][1] : 0,
          }));
        }
      } catch {
        // History fetch failed - return empty history
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Failed to fetch price data';
  }

  return result;
}

/**
 * Unified price data hook. Fetches price, change, volume, market cap,
 * and optional history for any asset.
 */
export function usePriceData(options: PriceDataOptions): PriceDataResult {
  const {
    asset,
    source = 'auto',
    interval = '24h',
    includeHistory = false,
    enabled = true,
    refetchInterval = 30000,
  } = options;

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['price-data', asset, source, interval, includeHistory],
    queryFn: () => fetchPriceData(asset, source, includeHistory, interval),
    enabled: hydrated && enabled && !!asset,
    refetchInterval,
    staleTime: 10000,
  });

  return {
    price: data?.price || 0,
    change24h: data?.change24h || 0,
    volume24h: data?.volume24h || 0,
    marketCap: data?.marketCap || 0,
    high24h: data?.high24h || 0,
    low24h: data?.low24h || 0,
    lastUpdated: data?.lastUpdated || 0,
    history: data?.history || [],
    isLoading: isLoading || !hydrated,
    error: error instanceof Error ? error.message : (data?.error || null),
  };
}

export default usePriceData;
