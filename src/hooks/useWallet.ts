/**
 * Custom Wallet Hook - Simplified Interface for Wallet Operations
 * Provides easy-to-use hooks for Bitcoin wallet functionality
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

// Safe wrapper for useWalletContext to prevent undefined errors
function useSafeWalletContext() {
  try {
    // Dynamic import to prevent SSR issues
    const { useWalletContext } = require('../contexts/WalletContext');
    return useWalletContext();
  } catch (error) {
    return null;
  }
}
import type { 
  WalletType, 
  WalletAccount, 
  WalletBalance, 
  BitcoinNetwork,
  WalletError 
} from '../types/wallet';

/**
 * Extended wallet state with additional computed properties
 */
export interface ExtendedWalletState {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  isAvailable: boolean;
  
  // Current wallet data
  walletType: WalletType | null;
  account: WalletAccount | null;
  accounts: WalletAccount[];
  balance: WalletBalance | null;
  network: BitcoinNetwork | null;
  
  // Error state
  error: string | null;
  hasError: boolean;
  
  // Computed properties
  formattedBalance: string;
  btcBalance: number;
  usdBalance: number | null;
  
  // Connection metadata
  lastConnected: number | null;
  connectionDuration: number | null;
}

/**
 * Hook options
 */
export interface UseWalletOptions {
  autoConnect?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enablePriceConversion?: boolean;
}

/**
 * Main wallet hook
 * Provides comprehensive wallet functionality with computed properties
 */
export function useWallet(options: UseWalletOptions = {}) {
  const context = useSafeWalletContext();
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  
  const {
    connectionState: rawConnectionState,
    availableWallets,
    connectWallet: contextConnect,
    disconnectWallet: contextDisconnect,
    refreshBalance,
    switchAccount,
    switchNetwork,
    isWalletAvailable,
    setAutoRefresh
  } = context || {};

  const connectionState = rawConnectionState || {
    isConnected: false,
    isConnecting: false,
    walletType: null,
    account: null,
    accounts: [],
    balance: null,
    network: null,
    error: null,
    lastConnected: null
  };

  // Apply options
  useEffect(() => {
    if (options.autoRefresh !== undefined) {
      setAutoRefresh(options.autoRefresh, options.refreshInterval);
    }
  }, [options.autoRefresh, options.refreshInterval, setAutoRefresh]);

  // Fetch BTC price if conversion is enabled
  useEffect(() => {
    if (options.enablePriceConversion && connectionState.isConnected) {
      const fetchBtcPrice = async () => {
        try {
          const response = await fetch('/api/bitcoin-price/');
          if (response.ok) {
            const data = await response.json();
            setBtcPrice(data.price);
          }
        } catch (error) {
        }
      };

      fetchBtcPrice();
      const interval = setInterval(fetchBtcPrice, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [options.enablePriceConversion, connectionState.isConnected]);

  // Enhanced connection function with error handling
  const connectWallet = useCallback(async (walletType: WalletType): Promise<boolean> => {
    try {
      await contextConnect(walletType);
      return true;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return false;
    }
  }, [contextConnect]);

  // Enhanced disconnection function
  const disconnectWallet = useCallback(async (): Promise<boolean> => {
    try {
      await contextDisconnect();
      return true;
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      return false;
    }
  }, [contextDisconnect]);

  // Computed state with additional properties
  const walletState: ExtendedWalletState = useMemo(() => {
    const safeConnectionState = connectionState || {
      isConnected: false,
      isConnecting: false,
      walletType: null,
      account: null,
      accounts: [],
      balance: null,
      network: null,
      error: null,
      lastConnected: null
    };
    
    const { balance, lastConnected } = safeConnectionState;
    const safeAvailableWallets = availableWallets || [];
    
    // Format balance
    const formatBalance = (sats: number): string => {
      const btc = sats / 100000000; // Convert satoshis to BTC
      return btc.toFixed(8).replace(/\.?0+$/, ''); // Remove trailing zeros
    };

    // Calculate BTC balance
    const btcBalance = balance ? balance.total / 100000000 : 0;
    
    // Calculate USD balance
    const usdBalance = options.enablePriceConversion && btcPrice && balance 
      ? (balance.total / 100000000) * btcPrice 
      : null;

    // Calculate connection duration
    const connectionDuration = lastConnected 
      ? Date.now() - lastConnected 
      : null;

    return {
      // Connection status
      isConnected: safeConnectionState.isConnected,
      isConnecting: safeConnectionState.isConnecting,
      isAvailable: safeAvailableWallets.length > 0,
      
      // Current wallet data
      walletType: safeConnectionState.walletType,
      account: safeConnectionState.account,
      accounts: safeConnectionState.accounts || [],
      balance: safeConnectionState.balance,
      network: safeConnectionState.network,
      
      // Error state
      error: safeConnectionState.error,
      hasError: !!safeConnectionState.error,
      
      // Computed properties
      formattedBalance: balance ? formatBalance(balance.total) : '0',
      btcBalance,
      usdBalance,
      
      // Connection metadata
      lastConnected: safeConnectionState.lastConnected,
      connectionDuration
    };
  }, [
    connectionState,
    availableWallets,
    btcPrice,
    options.enablePriceConversion
  ]);

  // Message signing function
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!connectionState.isConnected || !connectionState.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Check if wallet supports message signing
      const wallet = (window as any)[connectionState.walletType];
      if (!wallet) {
        throw new Error(`${connectionState.walletType} wallet not found`);
      }

      // Different wallets have different signing methods
      let signature: string;
      
      switch (connectionState.walletType) {
        case 'unisat':
          signature = await wallet.signMessage(message);
          break;
        case 'xverse':
          signature = await wallet.request('signMessage', { message });
          break;
        case 'oyl':
          signature = await wallet.signMessage(message);
          break;
        case 'magiceden':
          signature = await wallet.signMessage(message);
          break;
        default:
          throw new Error(`Signing not supported for ${connectionState.walletType}`);
      }

      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [connectionState.isConnected, connectionState.account, connectionState.walletType]);

  return {
    // State
    ...walletState,
    availableWallets: availableWallets || [],
    
    // Actions
    connectWallet: connectWallet || (() => Promise.resolve(false)),
    disconnectWallet: disconnectWallet || (() => Promise.resolve(false)),
    refreshBalance: refreshBalance || (() => Promise.resolve()),
    switchAccount: switchAccount || (() => Promise.resolve()),
    switchNetwork: switchNetwork || (() => Promise.resolve()),
    signMessage,
    
    // Utilities
    isWalletAvailable: isWalletAvailable || (() => false),
    setAutoRefresh: setAutoRefresh || (() => {}),
    
    // Wallet instance for advanced operations
    wallet: connectionState?.isConnected ? (window as any)[connectionState.walletType] : null,
    address: connectionState?.account?.address || null,
  };
}

/**
 * Hook for wallet connection status only
 * Lightweight hook for components that only need connection status
 */
export function useWalletConnection() {
  const context = useSafeWalletContext();
  const { connectionState, availableWallets } = context || {};
  
  const safeConnectionState = connectionState || {
    isConnected: false,
    isConnecting: false,
    walletType: null,
    error: null
  };
  
  const safeAvailableWallets = availableWallets || [];
  
  return {
    isConnected: safeConnectionState.isConnected,
    isConnecting: safeConnectionState.isConnecting,
    isAvailable: safeAvailableWallets.length > 0,
    walletType: safeConnectionState.walletType,
    hasWallets: safeAvailableWallets.length > 0,
    error: safeConnectionState.error
  };
}

/**
 * Hook for wallet balance information
 * Lightweight hook for components that only need balance data
 */
export function useWalletBalance(options: { enableUsdConversion?: boolean } = {}) {
  const context = useSafeWalletContext();
  const { connectionState } = context || {};
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  
  // Fetch BTC price if conversion is enabled
  useEffect(() => {
    if (options.enableUsdConversion && connectionState?.isConnected) {
      const fetchBtcPrice = async () => {
        try {
          const response = await fetch('/api/bitcoin-price/');
          if (response.ok) {
            const data = await response.json();
            setBtcPrice(data.price);
          }
        } catch (error) {
        }
      };

      fetchBtcPrice();
      const interval = setInterval(fetchBtcPrice, 60000);
      
      return () => clearInterval(interval);
    }
  }, [options.enableUsdConversion, connectionState?.isConnected]);

  return useMemo(() => {
    const safeConnectionState = connectionState || { balance: null, isConnected: false };
    const { balance } = safeConnectionState;
    
    if (!balance) {
      return {
        balance: null,
        btcBalance: 0,
        usdBalance: null,
        formattedBalance: '0',
        hasBalance: false
      };
    }

    const btcBalance = balance.total / 100000000;
    const usdBalance = options.enableUsdConversion && btcPrice 
      ? btcBalance * btcPrice 
      : null;

    const formatBalance = (sats: number): string => {
      const btc = sats / 100000000;
      return btc.toFixed(8).replace(/\.?0+$/, '');
    };

    return {
      balance,
      btcBalance,
      usdBalance,
      formattedBalance: formatBalance(balance.total),
      hasBalance: balance.total > 0,
      confirmed: balance.confirmed,
      unconfirmed: balance.unconfirmed
    };
  }, [connectionState?.balance, btcPrice, options.enableUsdConversion]);
}

/**
 * Hook for wallet account information
 * Lightweight hook for components that only need account data
 */
export function useWalletAccount() {
  const context = useSafeWalletContext();
  const { connectionState, switchAccount } = context || {};
  
  const safeConnectionState = connectionState || {
    account: null,
    accounts: []
  };
  
  return {
    account: safeConnectionState.account,
    accounts: safeConnectionState.accounts,
    hasMultipleAccounts: safeConnectionState.accounts.length > 1,
    switchAccount: switchAccount || (() => Promise.resolve()),
    address: safeConnectionState.account?.address || null,
    publicKey: safeConnectionState.account?.publicKey || null,
    addressType: safeConnectionState.account?.addressType || null
  };
}

/**
 * Hook for available wallets
 * Lightweight hook for wallet selection components
 */
export function useAvailableWallets() {
  const context = useSafeWalletContext();
  const { availableWallets, isWalletAvailable, connectWallet } = context || {};
  
  const safeAvailableWallets = availableWallets || [];
  
  const walletOptions = useMemo(() => {
    const allWallets: WalletType[] = ['xverse', 'unisat', 'oyl', 'magiceden'];
    
    return allWallets.map(walletType => ({
      type: walletType,
      available: isWalletAvailable ? isWalletAvailable(walletType) : false,
      connected: false // This would need to be determined from current connection
    }));
  }, [safeAvailableWallets, isWalletAvailable]);

  return {
    availableWallets: safeAvailableWallets,
    walletOptions,
    hasWallets: safeAvailableWallets.length > 0,
    connectWallet: connectWallet || (() => Promise.resolve()),
    isWalletAvailable: isWalletAvailable || (() => false)
  };
}

/**
 * Hook for wallet error handling
 * Provides enhanced error handling and recovery
 */
export function useWalletError() {
  const context = useSafeWalletContext();
  const { connectionState, connectWallet, disconnectWallet } = context || {};
  
  const safeConnectionState = connectionState || {
    walletType: null,
    isConnected: false,
    error: null
  };
  
  const retryConnection = useCallback(async (): Promise<boolean> => {
    if (!safeConnectionState.walletType || !connectWallet || !disconnectWallet) {
      return false;
    }
    
    try {
      await disconnectWallet();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await connectWallet(safeConnectionState.walletType);
      return true;
    } catch (error) {
      console.error('Retry connection failed:', error);
      return false;
    }
  }, [safeConnectionState.walletType, connectWallet, disconnectWallet]);

  const clearError = useCallback(async (): Promise<void> => {
    // Error clearing would need to be implemented in the context
    // For now, we can try to refresh the connection
    if (safeConnectionState.isConnected) {
      await retryConnection();
    }
  }, [safeConnectionState.isConnected, retryConnection]);

  return {
    error: safeConnectionState.error,
    hasError: !!safeConnectionState.error,
    retryConnection,
    clearError
  };
}

/**
 * Type exports for external use
 */
export type { ExtendedWalletState, UseWalletOptions };