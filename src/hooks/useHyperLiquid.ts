/**
 * useHyperLiquid Hook - Real-time data and portfolio management
 * Custom React hook for HyperLiquid perpetuals integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import hyperLiquidService from '@/services/HyperLiquidService';

export interface HyperLiquidPosition {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    leverage: string;
  };
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  marketPrice: number;
  entryPrice: number;
  size: number;
  leverage: number;
}

export interface HyperLiquidPortfolio {
  totalPositions: number;
  totalUnrealizedPnl: number;
  totalPortfolioValue: number;
  dailyPnl: number;
  positions: HyperLiquidPosition[];
  recentTrades: any[];
  summary: {
    openPositions: number;
    profitablePositions: number;
    averageLeverage: number;
  };
}

export interface HyperLiquidMarket {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

// Hook for real-time portfolio data
export const useHyperLiquidPortfolio = (address?: string, enabled = true) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hyperliquid-portfolio', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const result = await hyperLiquidService.getPortfolioSummary(address);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['hyperliquid-portfolio', address] });
  }, [queryClient, address]);

  return {
    ...query,
    portfolio: query.data,
    refresh,
  };
};

// Hook for market data
export const useHyperLiquidMarkets = (enabled = true) => {
  return useQuery({
    queryKey: ['hyperliquid-markets'],
    queryFn: async () => {
      const result = await hyperLiquidService.getPerpetualsMarkets();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled,
    staleTime: 300000, // Markets data doesn't change often
    gcTime: 600000, // Keep in cache for 10 minutes
  });
};

// Hook for real-time prices
export const useHyperLiquidPrices = (assets: string[] = [], enabled = true) => {
  return useQuery({
    queryKey: ['hyperliquid-prices', assets.sort().join(',')],
    queryFn: async () => {
      const result = await hyperLiquidService.getMultipleMarketPrices(assets);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && assets.length > 0,
    refetchInterval: 5000, // Refetch every 5 seconds for prices
    staleTime: 4000,
    gcTime: 60000,
  });
};

// Hook for user trades
export const useHyperLiquidTrades = (address?: string, limit = 50, enabled = true) => {
  return useQuery({
    queryKey: ['hyperliquid-trades', address, limit],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const result = await hyperLiquidService.getUserTrades(address, limit);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && !!address,
    staleTime: 60000, // Trades don't change as frequently
    gcTime: 300000,
  });
};

// Hook for position management
export const useHyperLiquidPositions = (address?: string, enabled = true) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hyperliquid-positions', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const result = await hyperLiquidService.getUserPositions(address);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled && !!address,
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 10000,
    gcTime: 300000,
  });

  const closePosition = useCallback(async (asset: string, size: number) => {
    if (!address) throw new Error('Address is required');
    
    const result = await hyperLiquidService.closePosition(asset);
    if (result.success) {
      // Invalidate related queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['hyperliquid-positions', address] });
      queryClient.invalidateQueries({ queryKey: ['hyperliquid-portfolio', address] });
    }
    return result;
  }, [address, queryClient]);

  return {
    ...query,
    positions: query.data,
    closePosition,
  };
};

// Hook for real-time P&L tracking
export const useRealTimePnL = (address?: string, enabled = true) => {
  const [totalPnL, setTotalPnL] = useState(0);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [pnlHistory, setPnlHistory] = useState<Array<{ timestamp: number; value: number }>>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  const updatePnL = useCallback(async () => {
    if (!address || !enabled) return;

    try {
      const result = await hyperLiquidService.getPortfolioSummary(address);
      if (result.success && result.data) {
        const newTotalPnL = result.data.totalUnrealizedPnl;
        const newDailyPnL = result.data.dailyPnl;
        
        setTotalPnL(newTotalPnL);
        setDailyPnL(newDailyPnL);
        
        // Add to history (keep last 100 data points)
        setPnlHistory(prev => {
          const newHistory = [...prev, { timestamp: Date.now(), value: newTotalPnL }];
          return newHistory.slice(-100);
        });
      }
    } catch (error) {
      console.error('Error updating P&L:', error);
    }
  }, [address, enabled]);

  useEffect(() => {
    if (enabled && address) {
      updatePnL(); // Initial update
      intervalRef.current = setInterval(updatePnL, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, address, updatePnL]);

  return {
    totalPnL,
    dailyPnL,
    pnlHistory,
    refresh: updatePnL,
  };
};

// Hook for risk monitoring
export const useRiskMonitoring = (portfolio?: HyperLiquidPortfolio) => {
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (!portfolio) return;

    const metrics = hyperLiquidService.calculateRiskMetrics(
      portfolio.positions,
      portfolio.totalPortfolioValue
    );
    setRiskMetrics(metrics);

    // Generate risk alerts
    const newAlerts: string[] = [];
    
    if (metrics.leverageRisk === 'High') {
      newAlerts.push('High leverage detected across positions');
    }
    
    if (metrics.positionRisk > 20) {
      newAlerts.push('High position concentration risk');
    }
    
    if (metrics.maxDrawdown > portfolio.totalPortfolioValue * 0.1) {
      newAlerts.push('Maximum drawdown exceeds 10% of portfolio value');
    }

    setAlerts(newAlerts);
  }, [portfolio]);

  return {
    riskMetrics,
    alerts,
  };
};

// WebSocket hook for real-time updates (placeholder for future implementation)
export const useHyperLiquidWebSocket = (address?: string, enabled = true) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !address) return;

    // TODO: Implement WebSocket connection to HyperLiquid
    // This would require WebSocket endpoint from HyperLiquid API
    console.log('WebSocket connection placeholder for:', address);
    
    setConnected(false); // Set to true when WebSocket is implemented
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, address]);

  return {
    connected,
    lastMessage,
  };
};

// Combined hook for complete HyperLiquid integration
export const useHyperLiquid = (address?: string, options: {
  enablePortfolio?: boolean;
  enablePositions?: boolean;
  enableTrades?: boolean;
  enablePrices?: boolean;
  enableRealTimePnL?: boolean;
  priceAssets?: string[];
} = {}) => {
  const {
    enablePortfolio = true,
    enablePositions = true,
    enableTrades = true,
    enablePrices = false,
    enableRealTimePnL = true,
    priceAssets = []
  } = options;

  const portfolio = useHyperLiquidPortfolio(address, enablePortfolio);
  const positions = useHyperLiquidPositions(address, enablePositions);
  const trades = useHyperLiquidTrades(address, 50, enableTrades);
  const markets = useHyperLiquidMarkets();
  const prices = useHyperLiquidPrices(priceAssets, enablePrices);
  const realTimePnL = useRealTimePnL(address, enableRealTimePnL);
  const riskMonitoring = useRiskMonitoring(portfolio.portfolio);

  const isLoading = portfolio.isLoading || positions.isLoading || trades.isLoading || markets.isLoading;
  const error = portfolio.error || positions.error || trades.error || markets.error;

  const refreshAll = useCallback(() => {
    portfolio.refresh();
    positions.refetch();
    trades.refetch();
    markets.refetch();
    if (enablePrices) prices.refetch();
    realTimePnL.refresh();
  }, [portfolio, positions, trades, markets, prices, realTimePnL, enablePrices]);

  return {
    // Data
    portfolio: portfolio.portfolio,
    positions: positions.positions,
    trades: trades.data,
    markets: markets.data,
    prices: prices.data,
    
    // Real-time P&L
    ...realTimePnL,
    
    // Risk monitoring
    ...riskMonitoring,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    refreshAll,
    closePosition: positions.closePosition,
  };
};

export default useHyperLiquid;