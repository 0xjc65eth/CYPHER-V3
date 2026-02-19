'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBitcoinWallet } from '@/services/BitcoinWalletConnect';

interface WalletState {
  isConnected: boolean;
  walletType: string | null;
  address: string | null;
  publicKey: string | null;
  balance: any;
  ordinalsBalance: any[];
  runesBalance: any[];
}

interface AvailableWallet {
  name: string;
  id: string;
  icon: string;
  available: boolean;
}

export const useBitcoinWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    walletType: null,
    address: null,
    publicKey: null,
    balance: null,
    ordinalsBalance: [],
    runesBalance: []
  });

  const [availableWallets, setAvailableWallets] = useState<AvailableWallet[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const bitcoinWalletRef = useRef<ReturnType<typeof getBitcoinWallet> | null>(null);

  // Lazy init — only on client
  const getBtcWallet = useCallback(() => {
    if (!bitcoinWalletRef.current && typeof window !== 'undefined') {
      bitcoinWalletRef.current = getBitcoinWallet();
    }
    return bitcoinWalletRef.current;
  }, []);

  const updateWalletState = useCallback(() => {
    try {
      const bw = getBtcWallet();
      if (!bw || !mountedRef.current) return;
      const s = bw.getState();      setWalletState({
        isConnected: s.isConnected,
        walletType: s.currentWallet,
        address: s.currentAddress,
        publicKey: null,
        balance: s.balance,
        ordinalsBalance: [],
        runesBalance: []
      });
    } catch (err) {
    }
  }, [getBtcWallet]);

  const detectWallets = useCallback(() => {
    try {
      const bw = getBtcWallet();
      if (!bw || typeof window === 'undefined') return;
      const detected = bw.detectWallets(); // ← retorna Record<string, any>
      // Converter Record para AvailableWallet[]
      const list: AvailableWallet[] = Object.entries(detected).map(([id, info]: [string, any]) => ({
        name: info.name || id,
        id,
        icon: info.icon || '',
        available: info.available !== undefined ? info.available : true,
      }));
      if (mountedRef.current) setAvailableWallets(list);
    } catch (err) {
    }
  }, [getBtcWallet]);

  const connect = useCallback(async (walletId: string) => {
    const bw = getBtcWallet();
    if (!bw) throw new Error('BitcoinWallet not available');
    setIsConnecting(true);
    setError(null);
    try {
      const result = await bw.connect(walletId);
      updateWalletState();
      return { success: true, ...result };
    } catch (error: any) {
      if (mountedRef.current) setError(error.message || 'Connection failed');
      throw error;
    } finally {
      if (mountedRef.current) setIsConnecting(false);
    }
  }, [getBtcWallet, updateWalletState]);

  const disconnect = useCallback(() => {
    const bw = getBtcWallet();
    if (bw) bw.disconnect();
    updateWalletState();
    setError(null);
  }, [getBtcWallet, updateWalletState]);

  const refreshWalletInfo = useCallback(async () => {
    const bw = getBtcWallet();
    if (!bw || !walletState.isConnected) return;
    try {
      await bw.refreshData();      updateWalletState();
    } catch (err: any) {
      console.error('[useBitcoinWallet] refresh error:', err);
    }
  }, [getBtcWallet, walletState.isConnected, updateWalletState]);

  const signTransaction = useCallback(async (psbtHex: string) => {
    const bw = getBtcWallet();
    if (!bw || !walletState.isConnected) throw new Error('Not connected');
    const provider = bw.getCurrentProvider();
    if (!provider) throw new Error('No provider');
    // Cada wallet tem método diferente para assinar PSBT
    if (provider.signPsbt) return await provider.signPsbt(psbtHex);
    if (provider.signTransaction) return await provider.signTransaction(psbtHex);
    throw new Error('Wallet does not support PSBT signing');
  }, [getBtcWallet, walletState.isConnected]);

  const getFormattedBalance = useCallback(() => {
    const { balance } = walletState;
    if (!balance) return { btc: '0', satoshis: '0', usd: '0' };
    let sats = 0;
    if (typeof balance === 'number') sats = balance;
    else if (balance.total !== undefined) sats = balance.total;
    else if (balance.confirmed !== undefined) sats = balance.confirmed;
    return { btc: (sats / 1e8).toFixed(8), satoshis: sats.toString(), usd: '0' };
  }, [walletState.balance]);

  const getFormattedAddress = useCallback(() => {
    if (!walletState.address) return '';
    return `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`;
  }, [walletState.address]);

  const isWalletAvailable = useCallback((walletId: string) => {
    return availableWallets.some(w => w.id === walletId && w.available);
  }, [availableWallets]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        updateWalletState();
        detectWallets();
      }
    }, 500); // Delay para extensões carregarem
    return () => { mountedRef.current = false; clearTimeout(timer); };
  }, [updateWalletState, detectWallets]);

  useEffect(() => {
    if (!walletState.isConnected) return;
    const interval = setInterval(refreshWalletInfo, 30000);
    return () => clearInterval(interval);
  }, [walletState.isConnected, refreshWalletInfo]);

  return {
    walletState, availableWallets, isConnecting, error,
    connect, disconnect, refreshWalletInfo, signTransaction,
    getFormattedBalance, getFormattedAddress, isWalletAvailable, detectWallets,
    isConnected: walletState.isConnected,
    address: walletState.address,
    walletType: walletState.walletType,
    balance: walletState.balance,
    ordinalsCount: walletState.ordinalsBalance?.length || 0,
    runesCount: walletState.runesBalance?.length || 0
  };
};
export default useBitcoinWallet;
