'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BitcoinAuthUser, formatBitcoinAddress, getWalletDisplayName } from '@/lib/auth/bitcoin-auth';

interface BitcoinAuthState {
  user: BitcoinAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useBitcoinAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<BitcoinAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const address = localStorage.getItem('wallet-address');
      const walletType = localStorage.getItem('wallet-type');

      if (!token || !address || !walletType) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/bitcoin-wallet/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: {
            address: data.address,
            walletType: data.walletType
          },
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem('auth-token');
        localStorage.removeItem('wallet-address');
        localStorage.removeItem('wallet-type');
        
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to verify authentication'
      });
    }
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('wallet-address');
    localStorage.removeItem('wallet-type');
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    
    router.push('/auth/login');
  }, [router]);

  // Get formatted address
  const getFormattedAddress = useCallback(() => {
    if (!authState.user) return '';
    return formatBitcoinAddress(authState.user.address);
  }, [authState.user]);

  // Get wallet display name
  const getWalletName = useCallback(() => {
    if (!authState.user) return '';
    return getWalletDisplayName(authState.user.walletType);
  }, [authState.user]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for storage changes (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-token' || e.key === 'wallet-address' || e.key === 'wallet-type') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    signOut,
    checkAuth,
    getFormattedAddress,
    getWalletName
  };
}