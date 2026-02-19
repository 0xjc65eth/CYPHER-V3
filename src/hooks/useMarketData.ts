// Custom hooks for data fetching

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query'
import { bitcoinService } from '@/lib/api/bitcoin'
import { realAnalyticsDataService } from '@/services/RealAnalyticsDataService'
import { coinGeckoService } from '@/lib/api/coingecko-service'

export function useBitcoinPrice() {
  return useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: () => bitcoinService.getPrice(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  })
}

export function useBitcoinChart(days: number = 7) {
  return useQuery({
    queryKey: ['bitcoin-chart', days],
    queryFn: () => bitcoinService.getMarketChart(days),
    staleTime: 300000, // 5 minutes
  })
}

interface MarketData {
  marketCap: {
    total: number;
    change24h: number;
  };
  volume24h: {
    total: number;
    change24h: number;
  };
  btcPrice?: number;
  btcChange24h?: number;
  btcDominance: number;
  loading: boolean;
  error: string | null;
  isLoading?: boolean;
  lastUpdated?: string;
  source?: 'live' | 'cached' | 'fallback';
}

// Enhanced hook using real analytics data
export function useRealMarketData() {
  return useQuery({
    queryKey: ['real-market-data'],
    queryFn: () => realAnalyticsDataService.getRealMarketMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  })
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    marketCap: { total: 0, change24h: 0 },
    volume24h: { total: 0, change24h: 0 },
    btcPrice: 0,
    btcChange24h: 0,
    btcDominance: 0,
    loading: true,
    error: null,
    isLoading: true,
    lastUpdated: undefined,
    source: 'fallback'
  });

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Try to get real data first
        const realData = await realAnalyticsDataService.getRealMarketMetrics();
        
        setData({
          marketCap: {
            total: realData.marketCap,
            change24h: realData.priceChange24h // Use price change as approximation
          },
          volume24h: {
            total: realData.volume24h,
            change24h: realData.volumeChange24h
          },
          btcPrice: realData.price,
          btcChange24h: realData.priceChange24h,
          btcDominance: realData.dominance,
          loading: false,
          error: null,
          isLoading: false,
          lastUpdated: realData.lastUpdated,
          source: realData.source
        });
        
        return;
      } catch (realDataError) {
      }

      try {
        // Fallback to CoinGecko using centralized service
        const [globalData, btcData] = await Promise.all([
          coinGeckoService.getGlobal(),
          coinGeckoService.getBitcoinPrice(),
        ]);

        setData({
          marketCap: {
            total: globalData.data.total_market_cap.usd,
            change24h: globalData.data.market_cap_change_percentage_24h_usd
          },
          volume24h: {
            total: globalData.data.total_volume.usd,
            change24h: 0 // CoinGecko doesn't provide this in global endpoint
          },
          btcPrice: btcData.price,
          btcChange24h: btcData.change24h,
          btcDominance: globalData.data.market_cap_percentage.btc,
          loading: false,
          error: null,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
          source: 'fallback'
        });
      } catch (error) {
        console.error('All market data sources failed:', error);
        // Use fallback data
        setData({
          marketCap: {
            total: 3890000000000,
            change24h: 2.45
          },
          volume24h: {
            total: 145000000000,
            change24h: 8.5
          },
          btcPrice: 98750,
          btcChange24h: 2.8,
          btcDominance: 52.3,
          loading: false,
          error: 'Using fallback data',
          isLoading: false,
          lastUpdated: new Date().toISOString(),
          source: 'fallback'
        });
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return data;
}