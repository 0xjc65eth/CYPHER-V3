/**
 * CYPHER ORDI FUTURE v3.1.0 - Wallet Data Hook
 * Hook React para integração com as APIs de carteira
 */

import { useState, useEffect, useCallback } from 'react';
import { devLogger } from '@/lib/logger';

// Types
interface BitcoinBalance {
  address: string;
  confirmed: number;
  unconfirmed: number;
  total: number;
  utxoCount?: number;
  lastActivity?: string;
}

interface Transaction {
  txid: string;
  blockHeight?: number;
  blockTime?: number;
  confirmations?: number;
  fee?: number;
  value: number;
  type: 'incoming' | 'outgoing' | 'internal';
  confirmed: boolean;
}

interface Inscription {
  id: string;
  number: number;
  address: string;
  content_type?: string;
  collection?: {
    id: string;
    name: string;
    floor_price?: number;
  };
}

interface RuneBalance {
  rune: string;
  rune_id: string;
  balance: string;
  decimal_balance: number;
  decimals: number;
}

interface WalletData {
  bitcoin: {
    balance: BitcoinBalance | null;
    transactions: Transaction[];
    loading: boolean;
    error: string | null;
  };
  ordinals: {
    inscriptions: Inscription[];
    collections: any[];
    total: number;
    loading: boolean;
    error: string | null;
  };
  runes: {
    balances: RuneBalance[];
    total: number;
    totalValue?: number;
    loading: boolean;
    error: string | null;
  };
}

interface UseWalletDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  enablePolling?: boolean;
  cacheTimeout?: number;
}

/**
 * Hook for fetching comprehensive wallet data
 */
export function useWalletData(address?: string, options: UseWalletDataOptions = {}) {
  const {
    autoFetch = true,
    refreshInterval = 30000, // 30 seconds
    enablePolling = false,
    cacheTimeout = 60000 // 1 minute
  } = options;

  const [walletData, setWalletData] = useState<WalletData>({
    bitcoin: {
      balance: null,
      transactions: [],
      loading: false,
      error: null
    },
    ordinals: {
      inscriptions: [],
      collections: [],
      total: 0,
      loading: false,
      error: null
    },
    runes: {
      balances: [],
      total: 0,
      loading: false,
      error: null
    }
  });

  const [lastFetch, setLastFetch] = useState<Record<string, number>>({});

  /**
   * Check if data needs refresh based on cache timeout
   */
  const needsRefresh = useCallback((type: string): boolean => {
    const lastFetchTime = lastFetch[type];
    if (!lastFetchTime) return true;
    return Date.now() - lastFetchTime > cacheTimeout;
  }, [lastFetch, cacheTimeout]);

  /**
   * Fetch Bitcoin balance
   */
  const fetchBitcoinBalance = useCallback(async (addr: string, force = false) => {
    if (!force && !needsRefresh('bitcoin_balance')) return;

    setWalletData(prev => ({
      ...prev,
      bitcoin: { ...prev.bitcoin, loading: true, error: null }
    }));

    try {
      const url = `/api/bitcoin/balance?address=${addr}${force ? '&refresh=true' : ''}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setWalletData(prev => ({
          ...prev,
          bitcoin: {
            ...prev.bitcoin,
            balance: result.data,
            loading: false,
            error: null
          }
        }));
        setLastFetch(prev => ({ ...prev, bitcoin_balance: Date.now() }));
      } else {
        throw new Error(result.error || 'Failed to fetch Bitcoin balance');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setWalletData(prev => ({
        ...prev,
        bitcoin: {
          ...prev.bitcoin,
          loading: false,
          error: errorMessage
        }
      }));
      devLogger.error(error as Error, 'Failed to fetch Bitcoin balance');
    }
  }, [needsRefresh]);

  /**
   * Fetch Bitcoin transactions
   */
  const fetchBitcoinTransactions = useCallback(async (addr: string, page = 0, limit = 20) => {
    if (!needsRefresh('bitcoin_transactions') && page === 0) return;

    setWalletData(prev => ({
      ...prev,
      bitcoin: { ...prev.bitcoin, loading: true, error: null }
    }));

    try {
      const url = `/api/bitcoin/transactions?address=${addr}&page=${page}&limit=${limit}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setWalletData(prev => ({
          ...prev,
          bitcoin: {
            ...prev.bitcoin,
            transactions: page === 0 
              ? result.data.transactions 
              : [...prev.bitcoin.transactions, ...result.data.transactions],
            loading: false,
            error: null
          }
        }));
        if (page === 0) {
          setLastFetch(prev => ({ ...prev, bitcoin_transactions: Date.now() }));
        }
      } else {
        throw new Error(result.error || 'Failed to fetch Bitcoin transactions');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setWalletData(prev => ({
        ...prev,
        bitcoin: {
          ...prev.bitcoin,
          loading: false,
          error: errorMessage
        }
      }));
      devLogger.error(error as Error, 'Failed to fetch Bitcoin transactions');
    }
  }, [needsRefresh]);

  /**
   * Fetch Ordinals/Inscriptions
   */
  const fetchOrdinals = useCallback(async (addr: string, page = 0, limit = 50) => {
    if (!needsRefresh('ordinals') && page === 0) return;

    setWalletData(prev => ({
      ...prev,
      ordinals: { ...prev.ordinals, loading: true, error: null }
    }));

    try {
      const url = `/api/ordinals/address/${addr}?page=${page}&limit=${limit}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setWalletData(prev => ({
          ...prev,
          ordinals: {
            inscriptions: page === 0 
              ? result.data.inscriptions 
              : [...prev.ordinals.inscriptions, ...result.data.inscriptions],
            collections: result.data.collections,
            total: result.data.total_inscriptions,
            loading: false,
            error: null
          }
        }));
        if (page === 0) {
          setLastFetch(prev => ({ ...prev, ordinals: Date.now() }));
        }
      } else {
        throw new Error(result.error || 'Failed to fetch Ordinals');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setWalletData(prev => ({
        ...prev,
        ordinals: {
          ...prev.ordinals,
          loading: false,
          error: errorMessage
        }
      }));
      devLogger.error(error as Error, 'Failed to fetch Ordinals');
    }
  }, [needsRefresh]);

  /**
   * Fetch Runes balances
   */
  const fetchRunes = useCallback(async (addr: string, page = 0, limit = 50) => {
    if (!needsRefresh('runes') && page === 0) return;

    setWalletData(prev => ({
      ...prev,
      runes: { ...prev.runes, loading: true, error: null }
    }));

    try {
      const url = `/api/runes/balances/${addr}?page=${page}&limit=${limit}&market=true`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setWalletData(prev => ({
          ...prev,
          runes: {
            balances: page === 0 
              ? result.data.balances 
              : [...prev.runes.balances, ...result.data.balances],
            total: result.data.total_runes,
            totalValue: result.data.total_value_btc,
            loading: false,
            error: null
          }
        }));
        if (page === 0) {
          setLastFetch(prev => ({ ...prev, runes: Date.now() }));
        }
      } else {
        throw new Error(result.error || 'Failed to fetch Runes');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setWalletData(prev => ({
        ...prev,
        runes: {
          ...prev.runes,
          loading: false,
          error: errorMessage
        }
      }));
      devLogger.error(error as Error, 'Failed to fetch Runes');
    }
  }, [needsRefresh]);

  /**
   * Fetch all wallet data
   */
  const fetchAllData = useCallback(async (addr: string, force = false) => {
    if (!addr) return;

    devLogger.log('WALLET_DATA', `Fetching all data for address: ${addr}`);

    await Promise.allSettled([
      fetchBitcoinBalance(addr, force),
      fetchBitcoinTransactions(addr),
      fetchOrdinals(addr),
      fetchRunes(addr)
    ]);
  }, [fetchBitcoinBalance, fetchBitcoinTransactions, fetchOrdinals, fetchRunes]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    if (!address) return;
    await fetchAllData(address, true);
  }, [address, fetchAllData]);

  /**
   * Load more transactions
   */
  const loadMoreTransactions = useCallback(async () => {
    if (!address) return;
    const currentPage = Math.floor(walletData.bitcoin.transactions.length / 20);
    await fetchBitcoinTransactions(address, currentPage, 20);
  }, [address, walletData.bitcoin.transactions.length, fetchBitcoinTransactions]);

  /**
   * Load more ordinals
   */
  const loadMoreOrdinals = useCallback(async () => {
    if (!address) return;
    const currentPage = Math.floor(walletData.ordinals.inscriptions.length / 50);
    await fetchOrdinals(address, currentPage, 50);
  }, [address, walletData.ordinals.inscriptions.length, fetchOrdinals]);

  /**
   * Auto-fetch on address change
   */
  useEffect(() => {
    if (address && autoFetch) {
      fetchAllData(address);
    }
  }, [address, autoFetch, fetchAllData]);

  /**
   * Polling effect
   */
  useEffect(() => {
    if (!enablePolling || !address) return;

    const interval = setInterval(() => {
      fetchAllData(address);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enablePolling, address, refreshInterval, fetchAllData]);

  /**
   * Get loading state for any data type
   */
  const isLoading = walletData.bitcoin.loading || 
                   walletData.ordinals.loading || 
                   walletData.runes.loading;

  /**
   * Get error state for any data type
   */
  const hasError = !!walletData.bitcoin.error || 
                  !!walletData.ordinals.error || 
                  !!walletData.runes.error;

  /**
   * Get combined error messages
   */
  const errors = [
    walletData.bitcoin.error,
    walletData.ordinals.error,
    walletData.runes.error
  ].filter(Boolean);

  return {
    // Data
    data: walletData,
    
    // State
    isLoading,
    hasError,
    errors,
    
    // Actions
    refresh,
    fetchAllData,
    fetchBitcoinBalance,
    fetchBitcoinTransactions,
    fetchOrdinals,
    fetchRunes,
    loadMoreTransactions,
    loadMoreOrdinals,
    
    // Utilities
    lastFetch
  };
}

/**
 * Hook for fetching wallet API status
 */
export function useWalletApiStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (detailed = false, provider?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (detailed) params.append('detailed', 'true');
      if (provider) params.append('provider', provider);

      const url = `/api/wallet-apis/status?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setStatus(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch API status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      devLogger.error(err as Error, 'Failed to fetch API status');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async (pattern: string) => {
    try {
      const response = await fetch('/api/wallet-apis/status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_cache',
          pattern
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear cache');
      }

      devLogger.log('CACHE', `Cache cleared for pattern: ${pattern}`);
      return result;
    } catch (err) {
      devLogger.error(err as Error, 'Failed to clear cache');
      throw err;
    }
  }, []);

  const warmupCache = useCallback(async (address: string) => {
    try {
      const response = await fetch('/api/wallet-apis/status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'warmup_cache',
          target: address
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to warmup cache');
      }

      devLogger.log('CACHE', `Cache warmed up for address: ${address}`);
      return result;
    } catch (err) {
      devLogger.error(err as Error, 'Failed to warmup cache');
      throw err;
    }
  }, []);

  return {
    status,
    loading,
    error,
    fetchStatus,
    clearCache,
    warmupCache
  };
}