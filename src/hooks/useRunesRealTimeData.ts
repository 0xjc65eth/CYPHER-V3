'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RuneMarketData, RunesAnalytics } from '@/services/runes';
import { useRunesTerminal } from '@/contexts/RunesTerminalContext';

// Types
export interface RunesRealTimeData {
  marketData: RuneMarketData[];
  analytics: RunesAnalytics;
  realData: any[];
  pools: LiquidityPool[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface LiquidityPool {
  id: string;
  tokenA: { symbol: string; name: string };
  tokenB: { symbol: string; name: string };
  reserveA: number;
  reserveB: number;
  fee: number;
  volume24h: number;
  apr: number;
  tvl: number;
  status: string;
}

// Transform runes-list / runes-top API responses into RuneMarketData[]
function transformToMarketData(
  runesList: any | null,
  runesTop: any | null
): RuneMarketData[] {
  // Merge both sources, preferring runesTop entries for ranking
  const seen = new Set<string>();
  const combined: any[] = [];

  // runesTop items first (they are the most popular)
  // runes-top returns a raw array or { error: ... }
  const topItems = Array.isArray(runesTop) ? runesTop
    : (runesTop?.success && Array.isArray(runesTop.data)) ? runesTop.data
    : [];
  for (const r of topItems) {
    const key = r.id || r.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      combined.push(r);
    }
  }

  // Then fill with runesList items
  const listItems = (runesList?.success && Array.isArray(runesList.data)) ? runesList.data
    : Array.isArray(runesList) ? runesList
    : [];
  for (const r of listItems) {
    const key = r.id || r.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      combined.push(r);
    }
  }

  return combined.map((r: any, index: number) => ({
    id: r.id || `rune-${index}`,
    name: r.formatted_name || r.spaced_name || r.name || '',
    symbol: r.symbol || '◆',
    price: {
      current: r.market?.price_in_btc || r.floorPrice || 0,
      change24h: r.change24h || 0,
      change7d: 0,
      high24h: 0,
      low24h: 0,
    },
    marketCap: {
      current: r.market?.market_cap || r.marketCap || 0,
      rank: index + 1,
      change24h: 0,
    },
    volume: {
      volume24h: r.volume_24h || r.volume24h || 0,
      change24h: 0,
      volumeRank: 0,
    },
    supply: {
      circulating: parseFloat(r.supply || '0'),
      total: parseFloat(r.supply || '0'),
      max: parseFloat(r.supply || '0'),
      percentage: r.mintable ? 0 : 100,
    },
    holders: r.unique_holders || r.holders || 0,
    transactions: {
      transfers24h: r.transactions || r.sales24h || 0,
      mints24h: 0,
      burns24h: parseInt(r.burned || '0'),
    },
    minting: {
      progress: r.mintable ? 50 : 100,
      remaining: 0,
      rate: 0,
    },
  }));
}

// Calculate analytics from market data
function calculateAnalytics(marketData: RuneMarketData[]): RunesAnalytics {
  if (!marketData || marketData.length === 0) {
    return {
      marketOverview: {
        totalMarketCap: 0,
        totalVolume24h: 0,
        averageChange24h: 0,
        activeRunes: 0,
        newRunes24h: 0,
        marketSentiment: 'neutral',
      },
      topPerformers: {
        gainers24h: [],
        losers24h: [],
        volumeLeaders: [],
      },
      crossChainMetrics: {
        bridgeVolume24h: 0,
        activeBridges: 0,
        averageBridgeTime: 0,
      },
    };
  }

  const totalMarketCap = marketData.reduce((sum, r) => sum + r.marketCap.current, 0);
  const totalVolume24h = marketData.reduce((sum, r) => sum + r.volume.volume24h, 0);
  const averageChange24h =
    marketData.reduce((sum, r) => sum + r.price.change24h, 0) / marketData.length;

  const gainers = marketData
    .filter((r) => r.price.change24h > 0)
    .sort((a, b) => b.price.change24h - a.price.change24h)
    .slice(0, 3);

  const losers = marketData
    .filter((r) => r.price.change24h < 0)
    .sort((a, b) => a.price.change24h - b.price.change24h)
    .slice(0, 3);

  const volumeLeaders = [...marketData]
    .sort((a, b) => b.volume.volume24h - a.volume.volume24h)
    .slice(0, 3);

  const newRunes24h = marketData.filter((r) => r.minting.progress < 100).length;

  return {
    marketOverview: {
      totalMarketCap,
      totalVolume24h,
      averageChange24h,
      activeRunes: marketData.length,
      newRunes24h,
      marketSentiment:
        averageChange24h > 2 ? 'bullish' : averageChange24h < -2 ? 'bearish' : 'neutral',
    },
    topPerformers: {
      gainers24h: gainers,
      losers24h: losers,
      volumeLeaders,
    },
    crossChainMetrics: {
      bridgeVolume24h: totalVolume24h * 0.1,
      activeBridges: 3,
      averageBridgeTime: 0,
    },
  };
}

// Data fetcher — uses server-side API routes (no direct external API calls)
const fetchRunesData = async () => {
  try {
    const [runesListRes, runesTopRes] = await Promise.all([
      fetch('/api/runes-list/?limit=50'),
      fetch('/api/runes-top/?limit=20'),
    ]);

    const runesList = runesListRes.ok ? await runesListRes.json() : null;
    const runesTop = runesTopRes.ok ? await runesTopRes.json() : null;

    const marketData = transformToMarketData(runesList, runesTop);
    const analytics = calculateAnalytics(marketData);

    return { marketData, analytics, realData: runesList?.data || [] };
  } catch (error) {
    console.error('Failed to fetch runes data:', error);
    throw new Error('Failed to fetch market data');
  }
};

const POLL_INTERVAL = 15_000; // 15 seconds

// Custom hook for real-time runes data (polling-based, no WebSocket)
export function useRunesRealTimeData() {
  // Safely access RunesTerminal context — fall back to defaults if unavailable
  let contextValue: ReturnType<typeof useRunesTerminal> | null = null;
  try {
    contextValue = useRunesTerminal();
  } catch {
    // Context not available (hook used outside provider) — use defaults below
  }

  const state = contextValue?.state ?? {
    settings: { autoRefresh: true, refreshInterval: 30000 } as any,
    error: null as string | null,
    lastUpdate: Date.now(),
    connectionStatus: 'disconnected' as const,
  };
  const setConnectionStatus = contextValue?.setConnectionStatus ?? (() => {});
  const updateLastUpdate = contextValue?.updateLastUpdate ?? (() => {});
  const setError = contextValue?.setError ?? (() => {});
  const { settings } = state;

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // React Query for initial data load and periodic refresh
  const {
    data: runesData,
    error: runesError,
    isLoading: runesLoading,
    refetch: refetchRunes,
  } = useQuery({
    queryKey: ['runes-data'],
    queryFn: fetchRunesData,
    refetchInterval: settings.autoRefresh ? settings.refreshInterval : false,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    retry: 3,
  });

  // Track success/error
  useEffect(() => {
    if (runesData) {
      updateLastUpdate();
      setError(null);
      setConnectionStatus('connected');
    }
  }, [runesData]);

  useEffect(() => {
    if (runesError) {
      console.error('Query Error:', runesError);
      setError(runesError instanceof Error ? runesError.message : 'Unknown error');
      setConnectionStatus('disconnected');
    }
  }, [runesError]);

  const mutateRunes = useCallback(() => {
    return refetchRunes();
  }, [refetchRunes]);

  // Polling-based real-time updates (replaces WebSocket)
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return; // already polling

    setConnectionStatus('connected');

    pollTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/runes-list/?limit=20');
        if (!response.ok) throw new Error(`Poll failed: ${response.status}`);

        const listData = await response.json();
        if (listData?.success && listData.data) {
          // Trigger SWR revalidation to keep market data fresh
          mutateRunes();
          updateLastUpdate();
          setConnectionStatus('connected');
        }
      } catch (err) {
        setConnectionStatus('disconnected');
      }
    }, POLL_INTERVAL);
  }, [setConnectionStatus, updateLastUpdate, mutateRunes]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  // Start/stop polling based on autoRefresh setting
  useEffect(() => {
    if (settings.autoRefresh) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [settings.autoRefresh, startPolling, stopPolling]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await mutateRunes();
      updateLastUpdate();
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data');
    }
  }, [mutateRunes, updateLastUpdate, setError]);

  // Prefetch data for performance
  useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      if (!runesData) {
        mutateRunes();
      }
    }, 100);

    return () => clearTimeout(prefetchTimer);
  }, [mutateRunes, runesData]);

  // Return combined data and status
  const isLoading = runesLoading;
  const error = runesError || state.error;

  // Liquidity pools: marked as "Coming soon" — no fake data
  const comingSoonPools: LiquidityPool[] = [
    {
      id: 'coming_soon',
      tokenA: { symbol: 'BTC', name: 'Bitcoin' },
      tokenB: { symbol: 'RUNE', name: 'Rune Token' },
      reserveA: 0,
      reserveB: 0,
      fee: 0,
      volume24h: 0,
      apr: 0,
      tvl: 0,
      status: 'Coming soon',
    },
  ];

  const data: RunesRealTimeData = {
    marketData: runesData?.marketData || [],
    analytics: runesData?.analytics || {
      marketOverview: {
        totalMarketCap: 0,
        totalVolume24h: 0,
        averageChange24h: 0,
        activeRunes: 0,
        newRunes24h: 0,
        marketSentiment: 'neutral' as const
      },
      topPerformers: {
        gainers24h: [],
        losers24h: [],
        volumeLeaders: []
      },
      crossChainMetrics: {
        bridgeVolume24h: 0,
        activeBridges: 0,
        averageBridgeTime: 0
      }
    },
    realData: runesData?.realData || [],
    pools: comingSoonPools,
    isLoading,
    error: error instanceof Error ? error.message : (error || null),
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus
  };

  return {
    data,
    refreshData,
    connectWebSocket: startPolling,
    disconnectWebSocket: stopPolling,
    mutateRunes,
    mutatePools: () => Promise.resolve(), // no-op — pools not available yet
  };
}
