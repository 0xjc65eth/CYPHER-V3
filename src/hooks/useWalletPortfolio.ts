'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
// WALLET TEMPORARILY DISABLED - import { useWalletContext as useWallet } from '@/contexts/WalletContext';
// WALLET TEMPORARILY DISABLED - import { defaultWalletDataService } from '@/lib/services/EnhancedWalletDataService';
// WALLET TEMPORARILY DISABLED - import type { PortfolioData, WalletBalance } from '@/contexts/WalletContext';
// WALLET TEMPORARILY DISABLED - import type { OrdinalsData, RunesData, TransactionData } from '@/lib/services/EnhancedWalletDataService';

// Default types for fallback wallet data
type PortfolioData = any;
type WalletBalance = any;
type OrdinalsData = any;
type RunesData = any;
type TransactionData = any;

export interface WalletPortfolioHook {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  address: string | null;
  
  // Portfolio data
  portfolioData: PortfolioData | null;
  balance: WalletBalance | null;
  
  // Specific data
  ordinals: OrdinalsData | null;
  runes: RunesData | null;
  transactions: TransactionData[];
  
  // Actions
  refreshAll: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  refreshOrdinals: () => Promise<void>;
  refreshRunes: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  
  // Calculations
  portfolioMetrics: {
    totalReturn: number;
    totalReturnPercentage: number;
    dayChange: number;
    dayChangePercentage: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
  };
}

export function useWalletPortfolio(): WalletPortfolioHook {
  // WALLET TEMPORARILY DISABLED - const defaultWallet = useWallet();
  
  // Local state for additional data
  const [ordinals, setOrdinals] = useState<OrdinalsData | null>(null);
  const [runes, setRunes] = useState<RunesData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback wallet data (wallet integration temporarily disabled)
  const defaultWallet = {
    isConnected: false,
    address: null,
    balance: null as any,
    portfolioData: null as any,
    loading: false,
    error: null,
    refreshBalance: async () => {
      console.warn('[useWalletPortfolio] Using fallback wallet - refreshBalance is a no-op');
    },
    refreshPortfolio: async () => {
      console.warn('[useWalletPortfolio] Using fallback wallet - refreshPortfolio is a no-op');
    }
  };

  // Refresh functions
  const refreshBalance = useCallback(async () => {
    if (!defaultWallet.address || !defaultWallet.isConnected) return;
    
    try {
      setIsLoading(true);
      await defaultWallet.refreshBalance();
    } catch (err: any) {
      console.error('Failed to refresh balance:', err);
      setError(err.message || 'Failed to refresh balance');
    } finally {
      setIsLoading(false);
    }
  }, [defaultWallet.address, defaultWallet.isConnected, defaultWallet.refreshBalance]);

  const refreshPortfolio = useCallback(async () => {
    if (!defaultWallet.address || !defaultWallet.isConnected) return;
    
    try {
      setIsLoading(true);
      await defaultWallet.refreshPortfolio();
    } catch (err: any) {
      console.error('Failed to refresh portfolio:', err);
      setError(err.message || 'Failed to refresh portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [defaultWallet.address, defaultWallet.isConnected, defaultWallet.refreshPortfolio]);

  const refreshOrdinals = useCallback(async () => {
    if (!defaultWallet.address || !defaultWallet.isConnected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      // WALLET TEMPORARILY DISABLED - const ordinalsData = await walletDataService.getOrdinals(defaultWallet.address);
      const ordinalsData = null;
      setOrdinals(ordinalsData);
    } catch (err: any) {
      console.error('Failed to refresh ordinals:', err);
      setError(err.message || 'Failed to refresh ordinals');
    } finally {
      setIsLoading(false);
    }
  }, [defaultWallet.address, defaultWallet.isConnected]);

  const refreshRunes = useCallback(async () => {
    if (!defaultWallet.address || !defaultWallet.isConnected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      // WALLET TEMPORARILY DISABLED - const runesData = await walletDataService.getRunes(defaultWallet.address);
      const runesData = null;
      setRunes(runesData);
    } catch (err: any) {
      console.error('Failed to refresh runes:', err);
      setError(err.message || 'Failed to refresh runes');
    } finally {
      setIsLoading(false);
    }
  }, [defaultWallet.address, defaultWallet.isConnected]);

  const refreshTransactions = useCallback(async () => {
    if (!defaultWallet.address || !defaultWallet.isConnected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      // WALLET TEMPORARILY DISABLED - const txData = await walletDataService.getTransactionHistory(defaultWallet.address, 100);
      const txData: any[] = [];
      setTransactions(txData);
    } catch (err: any) {
      console.error('Failed to refresh transactions:', err);
      setError(err.message || 'Failed to refresh transactions');
    } finally {
      setIsLoading(false);
    }
  }, [defaultWallet.address, defaultWallet.isConnected]);

  const refreshAll = useCallback(async () => {
    if (!defaultWallet.address || !defaultWallet.isConnected) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        refreshBalance(),
        refreshPortfolio(),
        refreshOrdinals(),
        refreshRunes(),
        refreshTransactions(),
      ]);
    } catch (err: any) {
      console.error('Failed to refresh all data:', err);
      setError(err.message || 'Failed to refresh wallet data');
    } finally {
      setIsLoading(false);
    }
  }, [refreshBalance, refreshPortfolio, refreshOrdinals, refreshRunes, refreshTransactions]);

  // Calculate advanced portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!defaultWallet.portfolioData || !defaultWallet.balance) {
      return {
        totalReturn: 0,
        totalReturnPercentage: 0,
        dayChange: 0,
        dayChangePercentage: 0,
        sharpeRatio: 0,
        volatility: 0,
        maxDrawdown: 0,
      };
    }

    const { portfolioData, balance } = defaultWallet;
    
    // Calculate basic returns
    const totalReturn = portfolioData.totalPNL;
    const totalReturnPercentage = portfolioData.totalPNLPercentage;

    // Day change and risk metrics require historical data - zeroed as fallback
    console.warn('[useWalletPortfolio] Day change and risk metrics use fallback zeroed values (historical data not available)');
    const dayChange = 0;
    const dayChangePercentage = 0;

    // Risk metrics zeroed - would need historical price series to compute
    const volatility = 0;
    const sharpeRatio = 0;
    const maxDrawdown = 0;
    
    return {
      totalReturn,
      totalReturnPercentage,
      dayChange,
      dayChangePercentage,
      sharpeRatio,
      volatility,
      maxDrawdown,
    };
  }, [defaultWallet.portfolioData, defaultWallet.balance]);

  // Auto-refresh data when defaultWallet connects
  useEffect(() => {
    if (defaultWallet.isConnected && defaultWallet.address) {
      refreshOrdinals();
      refreshRunes();
      refreshTransactions();
    }
  }, [defaultWallet.isConnected, defaultWallet.address, refreshOrdinals, refreshRunes, refreshTransactions]);

  // Auto-refresh periodically
  useEffect(() => {
    if (!defaultWallet.isConnected || !defaultWallet.address) return;

    const interval = setInterval(() => {
      refreshBalance();
      refreshPortfolio();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [defaultWallet.isConnected, defaultWallet.address, refreshBalance, refreshPortfolio]);

  return {
    // Connection state
    isConnected: defaultWallet.isConnected,
    isLoading: isLoading || defaultWallet.loading,
    error: error || defaultWallet.error,
    address: defaultWallet.address,
    
    // Portfolio data
    portfolioData: defaultWallet.portfolioData,
    balance: defaultWallet.balance,
    
    // Specific data
    ordinals,
    runes,
    transactions,
    
    // Actions
    refreshAll,
    refreshBalance,
    refreshPortfolio,
    refreshOrdinals,
    refreshRunes,
    refreshTransactions,
    
    // Calculations
    portfolioMetrics,
  };
}

// Hook for Bitcoin-specific data
export function useBitcoinWallet() {
  // WALLET TEMPORARILY DISABLED - const wallet = useWallet();
  const portfolio = useWalletPortfolio();
  
  // Fallback wallet data (wallet integration temporarily disabled)
  const defaultWallet = {
    balance: null as any,
    portfolioData: null as any,
    isConnected: false,
    address: null
  };
  
  const bitcoinData = useMemo(() => {
    if (!defaultWallet.balance || !defaultWallet.portfolioData) {
      return {
        balance: 0,
        usdValue: 0,
        averageBuyPrice: 0,
        currentPrice: 0,
        totalPNL: 0,
        totalPNLPercentage: 0,
      };
    }

    return {
      balance: defaultWallet.balance.bitcoin,
      usdValue: defaultWallet.balance.usd,
      averageBuyPrice: defaultWallet.portfolioData.bitcoin.averageBuyPrice,
      currentPrice: defaultWallet.balance.usd / defaultWallet.balance.bitcoin,
      totalPNL: defaultWallet.portfolioData.bitcoin.realizedPNL + defaultWallet.portfolioData.bitcoin.unrealizedPNL,
      totalPNLPercentage: ((defaultWallet.balance.usd - (defaultWallet.balance.bitcoin * defaultWallet.portfolioData.bitcoin.averageBuyPrice)) / (defaultWallet.balance.bitcoin * defaultWallet.portfolioData.bitcoin.averageBuyPrice)) * 100,
    };
  }, [defaultWallet.balance, defaultWallet.portfolioData]);

  return {
    ...bitcoinData,
    isConnected: defaultWallet.isConnected,
    address: defaultWallet.address,
    refreshData: portfolio.refreshAll,
  };
}

// Hook for Ordinals-specific data
export function useOrdinalsWallet() {
  const portfolio = useWalletPortfolio();
  
  const ordinalsData = useMemo(() => {
    if (!portfolio.ordinals || !portfolio.portfolioData) {
      return {
        inscriptions: [],
        totalCount: 0,
        totalValue: 0,
        floorPrice: 0,
      };
    }

    const totalValue = portfolio.portfolioData.ordinals.reduce((sum: number, ord: any) => sum + ord.currentValue, 0);
    const floorPrice = portfolio.ordinals.inscriptions.length > 0
      ? Math.min(...portfolio.ordinals.inscriptions.map((ins: any) => ins.value || 0))
      : 0;

    return {
      inscriptions: portfolio.ordinals.inscriptions,
      totalCount: portfolio.ordinals.total,
      totalValue,
      floorPrice,
    };
  }, [portfolio.ordinals, portfolio.portfolioData]);

  return {
    ...ordinalsData,
    isConnected: portfolio.isConnected,
    address: portfolio.address,
    refreshData: portfolio.refreshOrdinals,
  };
}

// Hook for Runes-specific data
export function useRunesWallet() {
  const portfolio = useWalletPortfolio();
  
  const runesData = useMemo(() => {
    if (!portfolio.runes || !portfolio.portfolioData) {
      return {
        balances: [],
        totalCount: 0,
        totalValue: 0,
      };
    }

    const totalValue = portfolio.portfolioData.runes.reduce((sum: number, rune: any) => sum + rune.currentValue, 0);

    return {
      balances: portfolio.runes.balances,
      totalCount: portfolio.runes.balances.length,
      totalValue,
    };
  }, [portfolio.runes, portfolio.portfolioData]);

  return {
    ...runesData,
    isConnected: portfolio.isConnected,
    address: portfolio.address,
    refreshData: portfolio.refreshRunes,
  };
}