/**
 * React Hook for Technical Analysis Data
 * Provides real technical indicators and market analysis
 */

import { useState, useEffect, useCallback } from 'react';
import { MarketAnalysis } from '@/services/TechnicalAnalysisService';

export interface UseTechnicalAnalysisOptions {
  symbol?: string;
  symbols?: string[];
  enabled?: boolean;
  refetchInterval?: number; // in milliseconds
}

export interface UseTechnicalAnalysisReturn {
  analysis: MarketAnalysis | MarketAnalysis[] | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  clearHistory: (symbol?: string) => Promise<void>;
}

export function useTechnicalAnalysis(options: UseTechnicalAnalysisOptions): UseTechnicalAnalysisReturn {
  const { symbol, symbols, enabled = true, refetchInterval = 300000 } = options; // Default 5 minutes
  
  const [analysis, setAnalysis] = useState<MarketAnalysis | MarketAnalysis[] | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!enabled || (!symbol && !symbols)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (symbol) {
        params.append('symbol', symbol);
      } else if (symbols) {
        params.append('symbols', symbols.join(','));
      }

      const response = await fetch(`/api/technical-analysis/?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch technical analysis');
      }

      setAnalysis(data.data);
      setLastUpdated(new Date());
      setError(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Technical analysis fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, symbols, enabled]);

  const clearHistory = useCallback(async (targetSymbol?: string) => {
    try {
      const response = await fetch('/api/technical-analysis/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear-history',
          symbol: targetSymbol
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to clear history');
      }

      // Refetch analysis after clearing history
      await fetchAnalysis();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history';
      setError(errorMessage);
      console.error('Clear history error:', err);
    }
  }, [fetchAnalysis]);

  // Initial fetch
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Set up automatic refetching
  useEffect(() => {
    if (!enabled || !refetchInterval) return;

    const interval = setInterval(fetchAnalysis, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchAnalysis, enabled, refetchInterval]);

  return {
    analysis,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchAnalysis,
    clearHistory
  };
}

/**
 * Hook for single symbol technical analysis
 */
export function useSymbolTechnicalAnalysis(
  symbol: string, 
  enabled = true,
  refetchInterval = 300000
): Omit<UseTechnicalAnalysisReturn, 'analysis'> & { analysis: MarketAnalysis | null } {
  const result = useTechnicalAnalysis({ symbol, enabled, refetchInterval });
  
  return {
    ...result,
    analysis: result.analysis as MarketAnalysis | null
  };
}

/**
 * Hook for multiple symbols technical analysis
 */
export function useMultiSymbolTechnicalAnalysis(
  symbols: string[], 
  enabled = true,
  refetchInterval = 300000
): Omit<UseTechnicalAnalysisReturn, 'analysis'> & { analysis: MarketAnalysis[] | null } {
  const result = useTechnicalAnalysis({ symbols, enabled, refetchInterval });
  
  return {
    ...result,
    analysis: result.analysis as MarketAnalysis[] | null
  };
}

/**
 * Hook for Bitcoin technical analysis
 */
export function useBitcoinTechnicalAnalysis(enabled = true) {
  return useSymbolTechnicalAnalysis('BTC', enabled, 180000); // 3 minutes for Bitcoin
}

/**
 * Hook for major crypto technical analysis
 */
export function useMajorCryptoTechnicalAnalysis(enabled = true) {
  return useMultiSymbolTechnicalAnalysis(
    ['BTC', 'ETH', 'SOL', 'BNB'], 
    enabled, 
    300000 // 5 minutes
  );
}

/**
 * Hook for portfolio technical analysis
 */
export function usePortfolioTechnicalAnalysis(symbols: string[], enabled = true) {
  return useMultiSymbolTechnicalAnalysis(symbols, enabled, 600000); // 10 minutes for portfolio
}