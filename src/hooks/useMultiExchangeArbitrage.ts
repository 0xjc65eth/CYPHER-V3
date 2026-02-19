'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ExchangePriceData {
  exchange: string;
  pair: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

export interface RealOpportunity {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  profitUSD: number;
  volume24h: number;
  priceImpact: number;
  executionTime: number;
  gasEstimate?: { cost: number; currency: string };
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: number;
  expiresAt: number;
  minTradeSize: number;
  maxTradeSize: number;
  fees: {
    buyFee: number;
    sellFee: number;
    totalFeePercent: number;
  };
}

interface ApiResponse {
  success: boolean;
  data?: {
    opportunities: RealOpportunity[];
    summary: {
      totalOpportunities: number;
      averageProfit: number;
      totalVolume: number;
      exchanges: string[];
      pairs: string[];
      lastUpdate: number;
    };
  };
  error?: string;
}

interface UseMultiExchangeArbitrageParams {
  pairs?: string[];
  minProfitPercent?: number;
}

interface UseMultiExchangeArbitrageReturn {
  opportunities: RealOpportunity[];
  exchangePrices: ExchangePriceData[];
  loading: boolean;
  error: string | null;
  lastUpdate: number | null;
  summary: ApiResponse['data'] extends undefined ? null : ApiResponse['data']['summary'] | null;
  refresh: () => void;
}

export function useMultiExchangeArbitrage(
  params: UseMultiExchangeArbitrageParams = {}
): UseMultiExchangeArbitrageReturn {
  const { pairs = ['BTC/USDT', 'ETH/USDT'], minProfitPercent = 0.1 } = params;

  const [opportunities, setOpportunities] = useState<RealOpportunity[]>([]);
  const [exchangePrices, setExchangePrices] = useState<ExchangePriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [summary, setSummary] = useState<ApiResponse['data']['summary'] | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        pairs: pairs.join(','),
        minProfitPercent: minProfitPercent.toString(),
      });

      const res = await fetch(`/api/arbitrage/real-opportunities/?${queryParams}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: ApiResponse = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'API returned an error');
      }

      if (json.data) {
        setOpportunities(json.data.opportunities);
        setSummary(json.data.summary);
        setLastUpdate(json.data.summary.lastUpdate);

        // Derive exchange prices from opportunities for the table
        // Build a map of unique exchange+pair prices from opportunity data
        const priceMap = new Map<string, ExchangePriceData>();
        for (const opp of json.data.opportunities) {
          const buyKey = `${opp.buyExchange}-${opp.pair}`;
          if (!priceMap.has(buyKey)) {
            priceMap.set(buyKey, {
              exchange: opp.buyExchange,
              pair: opp.pair,
              bid: opp.buyPrice * 0.9999,
              ask: opp.buyPrice,
              last: opp.buyPrice,
              volume: opp.volume24h,
              timestamp: opp.timestamp,
            });
          }
          const sellKey = `${opp.sellExchange}-${opp.pair}`;
          if (!priceMap.has(sellKey)) {
            priceMap.set(sellKey, {
              exchange: opp.sellExchange,
              pair: opp.pair,
              bid: opp.sellPrice,
              ask: opp.sellPrice * 1.0001,
              last: opp.sellPrice,
              volume: opp.volume24h,
              timestamp: opp.timestamp,
            });
          }
        }
        setExchangePrices(Array.from(priceMap.values()));
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [pairs, minProfitPercent]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(fetchData, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData]);

  return {
    opportunities,
    exchangePrices,
    loading,
    error,
    lastUpdate,
    summary,
    refresh,
  };
}
