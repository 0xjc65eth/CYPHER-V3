'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface PortfolioSnapshot {
  timestamp: number;
  totalValue: number;
  btcValue: number;
  ordinalsValue: number;
  runesValue: number;
  rareSatsValue: number;
  btcPrice: number; // BTC price at this time
}

export interface PortfolioHistoryData {
  snapshots: PortfolioSnapshot[];
  timeframe: '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
  totalReturn: number;
  totalReturnPercentage: number;
  startValue: number;
  endValue: number;
  peak: number;
  trough: number;
  volatility: number;
}

interface UsePortfolioHistoryOptions {
  address?: string;
  timeframe?: '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
  enabled?: boolean;
}

export function usePortfolioHistory({
  address,
  timeframe = '30D',
  enabled = true,
}: UsePortfolioHistoryOptions) {
  return useQuery<PortfolioHistoryData>({
    queryKey: ['portfolio-history', address, timeframe],
    queryFn: async () => {
      if (!address) {
        throw new Error('Address is required');
      }

      const response = await fetch(`/api/portfolio/history/?address=${address}&timeframe=${timeframe}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio history: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: enabled && !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for real-time portfolio value updates
 */
export function usePortfolioValue(address?: string) {
  return useQuery<{
    totalValue: number;
    btcValue: number;
    ordinalsValue: number;
    runesValue: number;
    rareSatsValue: number;
    change24h: number;
    changePercentage24h: number;
  }>({
    queryKey: ['portfolio-value', address],
    queryFn: async () => {
      if (!address) {
        throw new Error('Address is required');
      }

      const response = await fetch(`/api/portfolio/data/?address=${address}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio value: ${response.statusText}`);
      }

      const data = await response.json();

      // Calculate 24h change from current vs 24h ago
      return {
        totalValue: data.totalValue,
        btcValue: data.btc.value,
        ordinalsValue: data.ordinals.value,
        runesValue: data.runes.value,
        rareSatsValue: data.rareSats.value,
        change24h: data.change24h || 0,
        changePercentage24h: data.changePercentage24h || 0,
      };
    },
    enabled: !!address,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}
