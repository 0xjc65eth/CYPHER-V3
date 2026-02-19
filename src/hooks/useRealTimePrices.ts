/**
 * React Hook for Real-Time Price Updates
 * Provides live cryptocurrency price data with automatic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimePriceService, PriceUpdate } from '@/services/RealTimePriceService';

export interface UseRealTimePricesOptions {
  symbols: string[];
  enabled?: boolean;
  updateFrequency?: number;
}

export interface UseRealTimePricesReturn {
  prices: Map<string, PriceUpdate>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  stats: {
    activeSubscriptions: number;
    uniqueSymbols: number;
    cacheSize: number;
    isRunning: boolean;
    updateFrequency: number;
  };
  refetch: () => void;
}

export function useRealTimePrices(options: UseRealTimePricesOptions): UseRealTimePricesReturn {
  const { symbols, enabled = true, updateFrequency } = options;
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);

  // Set update frequency if provided
  useEffect(() => {
    if (updateFrequency) {
      try {
        const stats = realTimePriceService.getStats();
        if (stats && updateFrequency !== stats.updateFrequency) {
          realTimePriceService.setUpdateFrequency(updateFrequency);
        }
      } catch (error) {
      }
    }
  }, [updateFrequency]);

  // Handle price updates
  const handlePriceUpdate = useCallback((symbol: string) => (update: PriceUpdate) => {
    setPrices(prevPrices => {
      const newPrices = new Map(prevPrices);
      newPrices.set(symbol, update);
      return newPrices;
    });
    setLastUpdated(new Date());
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle subscription errors
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  // Subscribe to price updates
  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    // Clear previous subscriptions
    unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctionsRef.current = [];

    setIsLoading(true);
    setError(null);

    // Subscribe to each symbol
    symbols.forEach(symbol => {
      try {
        const unsubscribe = realTimePriceService.subscribe(symbol, handlePriceUpdate(symbol));
        unsubscribeFunctionsRef.current.push(unsubscribe);
      } catch (err) {
        handleError(`Failed to subscribe to ${symbol}: ${err}`);
      }
    });

    // Get initial cached prices
    try {
      const cachedPrices = realTimePriceService.getCurrentPrices(symbols);
      if (cachedPrices && cachedPrices.size > 0) {
        setPrices(cachedPrices);
        setLastUpdated(new Date());
        setIsLoading(false);
      }
    } catch (error) {
    }

    // Cleanup function
    return () => {
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current = [];
    };
  }, [symbols, enabled, handlePriceUpdate, handleError]);

  // Refetch function to manually trigger price updates
  const refetch = useCallback(() => {
    if (!enabled || symbols.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    // Force refresh by clearing cache and re-subscribing
    symbols.forEach(symbol => {
      const currentPrice = realTimePriceService.getCurrentPrice(symbol);
      if (currentPrice) {
        handlePriceUpdate(symbol)(currentPrice);
      }
    });
  }, [symbols, enabled, handlePriceUpdate]);

  // Get service statistics with error handling
  let stats;
  try {
    stats = realTimePriceService.getStats();
  } catch (error) {
    stats = {
      activeSubscriptions: 0,
      uniqueSymbols: 0,
      cacheSize: 0,
      isRunning: false,
      updateFrequency: 30000
    };
  }

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    stats,
    refetch
  };
}

/**
 * Hook for a single symbol price
 */
export function useRealTimePrice(symbol: string, enabled = true): {
  price: PriceUpdate | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
} {
  const { prices, isLoading, error, lastUpdated, refetch } = useRealTimePrices({
    symbols: [symbol],
    enabled
  });

  return {
    price: prices.get(symbol) || null,
    isLoading,
    error,
    lastUpdated,
    refetch
  };
}

/**
 * Hook for Bitcoin price specifically
 */
export function useBitcoinPrice(enabled = true) {
  return useRealTimePrice('BTC', enabled);
}

/**
 * Hook for major cryptocurrency prices
 */
export function useMajorCryptoPrices(enabled = true) {
  return useRealTimePrices({
    symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'MATIC'],
    enabled
  });
}

/**
 * Hook for Bitcoin ecosystem prices (BTC + Ordinals/Runes)
 */
export function useBitcoinEcosystemPrices(enabled = true) {
  return useRealTimePrices({
    symbols: ['BTC', 'ORDI', 'SATS'],
    enabled,
    updateFrequency: 15000 // More frequent updates for Bitcoin ecosystem
  });
}