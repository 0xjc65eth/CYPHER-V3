/**
 * Multi-Wallet Hook
 * Hook principal para gerenciar múltiplas carteiras simultaneamente
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext'; // Bitcoin wallets
import EVMWalletService, { type EVMWalletConnection } from '@/lib/evmWalletConnect';
import SolanaWalletService, { type SolanaWalletConnection } from '@/lib/solanaWalletConnect';
import { NetworkDetectionService, ASSET_WALLET_MAPPING } from '@/lib/networkDetection';

export interface MultiWalletState {
  // Bitcoin wallets (via existing WalletContext)
  bitcoin: {
    isConnected: boolean;
    address: string | null;
    walletType: string | null;
    balance: number;
    error: string | null;
  };
  
  // EVM wallets
  evm: {
    connections: EVMWalletConnection[];
    activeConnection: EVMWalletConnection | null;
    availableWallets: string[];
    isConnecting: boolean;
    error: string | null;
  };
  
  // Solana wallets
  solana: {
    connections: SolanaWalletConnection[];
    activeConnection: SolanaWalletConnection | null;
    availableWallets: string[];
    isConnecting: boolean;
    error: string | null;
  };
  
  // Global state
  isInitialized: boolean;
  recommendedWallet: {
    type: 'bitcoin' | 'evm' | 'solana';
    walletId: string;
  } | null;
}

export interface WalletRecommendation {
  assetSymbol: string;
  networkType: 'bitcoin' | 'evm' | 'solana';
  walletType: string;
  reason: string;
  isOptimal: boolean;
}

/**
 * Hook principal para multi-wallet
 */
export function useMultiWallet() {
  // Services
  const evmService = EVMWalletService.getInstance();
  const solanaService = SolanaWalletService.getInstance();
  
  // Bitcoin wallet (existing) - cast to any for properties that may vary
  const bitcoinWallet = useWallet() as any;
  
  // Multi-wallet state
  const [state, setState] = useState<MultiWalletState>({
    bitcoin: {
      isConnected: false,
      address: null,
      walletType: null,
      balance: 0,
      error: null
    },
    evm: {
      connections: [],
      activeConnection: null,
      availableWallets: [],
      isConnecting: false,
      error: null
    },
    solana: {
      connections: [],
      activeConnection: null,
      availableWallets: [],
      isConnecting: false,
      error: null
    },
    isInitialized: false,
    recommendedWallet: null
  });

  /**
   * Inicializa detecção de carteiras
   */
  const initializeWallets = useCallback(async () => {
    try {
      console.log('🚀 Initializing multi-wallet system...');
      
      // Detectar carteiras EVM disponíveis
      const evmWallets = await evmService.detectAvailableWallets();
      
      // Detectar carteiras Solana disponíveis
      const solanaWallets = await solanaService.detectAvailableWallets();
      
      setState(prev => ({
        ...prev,
        evm: {
          ...prev.evm,
          availableWallets: evmWallets
        },
        solana: {
          ...prev.solana,
          availableWallets: solanaWallets
        },
        isInitialized: true
      }));
      
      console.log('✅ Multi-wallet system initialized:', {
        evm: evmWallets,
        solana: solanaWallets
      });
      
    } catch (error) {
      console.error('❌ Error initializing wallets:', error);
    }
  }, [evmService, solanaService]);

  /**
   * Conecta carteira EVM
   */
  const connectEVMWallet = useCallback(async (walletType: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect') => {
    setState(prev => ({
      ...prev,
      evm: { ...prev.evm, isConnecting: true, error: null }
    }));
    
    try {
      const connection = await evmService.connectWallet(walletType);
      
      setState(prev => ({
        ...prev,
        evm: {
          ...prev.evm,
          connections: [...prev.evm.connections.filter(c => c.walletType !== walletType), connection],
          activeConnection: connection,
          isConnecting: false,
          error: null
        }
      }));
      
      return connection;
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        evm: {
          ...prev.evm,
          isConnecting: false,
          error: error.message
        }
      }));
      throw error;
    }
  }, [evmService]);

  /**
   * Conecta carteira Solana
   */
  const connectSolanaWallet = useCallback(async (walletType: 'phantom' | 'solflare' | 'backpack' | 'sollet') => {
    setState(prev => ({
      ...prev,
      solana: { ...prev.solana, isConnecting: true, error: null }
    }));
    
    try {
      const connection = await solanaService.connectWallet(walletType);
      
      setState(prev => ({
        ...prev,
        solana: {
          ...prev.solana,
          connections: [...prev.solana.connections.filter(c => c.walletType !== walletType), connection],
          activeConnection: connection,
          isConnecting: false,
          error: null
        }
      }));
      
      return connection;
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        solana: {
          ...prev.solana,
          isConnecting: false,
          error: error.message
        }
      }));
      throw error;
    }
  }, [solanaService]);

  /**
   * Desconecta carteira EVM
   */
  const disconnectEVMWallet = useCallback(async (walletType: string) => {
    try {
      await evmService.disconnectWallet(walletType);
      
      setState(prev => ({
        ...prev,
        evm: {
          ...prev.evm,
          connections: prev.evm.connections.filter(c => c.walletType !== walletType),
          activeConnection: prev.evm.activeConnection?.walletType === walletType ? null : prev.evm.activeConnection
        }
      }));
      
    } catch (error) {
      console.error('Error disconnecting EVM wallet:', error);
    }
  }, [evmService]);

  /**
   * Desconecta carteira Solana
   */
  const disconnectSolanaWallet = useCallback(async (walletType: string) => {
    try {
      await solanaService.disconnectWallet(walletType);
      
      setState(prev => ({
        ...prev,
        solana: {
          ...prev.solana,
          connections: prev.solana.connections.filter(c => c.walletType !== walletType),
          activeConnection: prev.solana.activeConnection?.walletType === walletType ? null : prev.solana.activeConnection
        }
      }));
      
    } catch (error) {
      console.error('Error disconnecting Solana wallet:', error);
    }
  }, [solanaService]);

  /**
   * Recomenda melhor carteira para um ativo
   */
  const getWalletRecommendation = useCallback((assetSymbol: string): WalletRecommendation | null => {
    const mapping = ASSET_WALLET_MAPPING[assetSymbol];
    if (!mapping) return null;
    
    const { networks, preferredWallets } = mapping;
    
    // Determinar tipo de rede
    let networkType: 'bitcoin' | 'evm' | 'solana';
    if (networks.includes('bitcoin')) {
      networkType = 'bitcoin';
    } else if (networks.includes('solana')) {
      networkType = 'solana';
    } else {
      networkType = 'evm';
    }
    
    // Encontrar carteira preferida disponível
    let recommendedWallet = preferredWallets[0];
    let isOptimal = false;
    
    switch (networkType) {
      case 'bitcoin':
        isOptimal = bitcoinWallet.isConnected && preferredWallets.includes(bitcoinWallet.walletType || '');
        break;
      case 'evm':
        const evmConnected = state.evm.connections.find(c => preferredWallets.includes(c.walletType));
        if (evmConnected) {
          recommendedWallet = evmConnected.walletType;
          isOptimal = true;
        }
        break;
      case 'solana':
        const solanaConnected = state.solana.connections.find(c => preferredWallets.includes(c.walletType));
        if (solanaConnected) {
          recommendedWallet = solanaConnected.walletType;
          isOptimal = true;
        }
        break;
    }
    
    return {
      assetSymbol,
      networkType,
      walletType: recommendedWallet,
      reason: isOptimal ? 'Connected and optimal' : 'Recommended for this asset',
      isOptimal
    };
  }, [bitcoinWallet, state.evm.connections, state.solana.connections]);

  /**
   * Conecta automaticamente a melhor carteira para um ativo
   */
  const connectForAsset = useCallback(async (assetSymbol: string) => {
    const recommendation = getWalletRecommendation(assetSymbol);
    if (!recommendation) {
      throw new Error(`No wallet recommendation available for ${assetSymbol}`);
    }
    
    const { networkType, walletType } = recommendation;
    
    switch (networkType) {
      case 'bitcoin':
        if (!bitcoinWallet.isConnected) {
          return await bitcoinWallet.connect(walletType as any);
        }
        return true;
        
      case 'evm':
        const evmConnection = state.evm.connections.find(c => c.walletType === walletType);
        if (!evmConnection) {
          await connectEVMWallet(walletType as any);
        }
        return true;
        
      case 'solana':
        const solanaConnection = state.solana.connections.find(c => c.walletType === walletType);
        if (!solanaConnection) {
          await connectSolanaWallet(walletType as any);
        }
        return true;
        
      default:
        throw new Error(`Unsupported network type: ${networkType}`);
    }
  }, [getWalletRecommendation, bitcoinWallet, state.evm.connections, state.solana.connections, connectEVMWallet, connectSolanaWallet]);

  /**
   * Obtém carteira ativa para um ativo
   */
  const getActiveWalletForAsset = useCallback((assetSymbol: string) => {
    const recommendation = getWalletRecommendation(assetSymbol);
    if (!recommendation) return null;
    
    const { networkType } = recommendation;
    
    switch (networkType) {
      case 'bitcoin':
        return bitcoinWallet.isConnected ? {
          type: 'bitcoin' as const,
          address: bitcoinWallet.address,
          walletType: bitcoinWallet.walletType,
          balance: bitcoinWallet.balance?.bitcoin || 0
        } : null;
        
      case 'evm':
        return state.evm.activeConnection ? {
          type: 'evm' as const,
          address: state.evm.activeConnection.address,
          walletType: state.evm.activeConnection.walletType,
          chainId: state.evm.activeConnection.chainId,
          balance: parseFloat(state.evm.activeConnection.balance) / 1e18
        } : null;
        
      case 'solana':
        return state.solana.activeConnection ? {
          type: 'solana' as const,
          address: state.solana.activeConnection.address,
          walletType: state.solana.activeConnection.walletType,
          balance: state.solana.activeConnection.balance
        } : null;
        
      default:
        return null;
    }
  }, [getWalletRecommendation, bitcoinWallet, state.evm.activeConnection, state.solana.activeConnection]);

  /**
   * Troca de rede EVM
   */
  const switchEVMNetwork = useCallback(async (chainId: number) => {
    if (!state.evm.activeConnection) {
      throw new Error('No EVM wallet connected');
    }
    
    return await evmService.switchNetwork(state.evm.activeConnection.walletType, chainId);
  }, [evmService, state.evm.activeConnection]);

  // Sincronizar estado do Bitcoin wallet
  useEffect(() => {
    setState(prev => ({
      ...prev,
      bitcoin: {
        isConnected: bitcoinWallet.isConnected,
        address: bitcoinWallet.address,
        walletType: bitcoinWallet.walletType,
        balance: bitcoinWallet.balance?.bitcoin || 0,
        error: bitcoinWallet.error
      }
    }));
  }, [bitcoinWallet.isConnected, bitcoinWallet.address, bitcoinWallet.walletType, bitcoinWallet.balance, bitcoinWallet.error]);

  // Configurar listeners para EVM wallets
  useEffect(() => {
    const handleEVMAccountChange = (data: any) => {
      const connection = evmService.getConnection(data.walletType);
      if (connection) {
        setState(prev => ({
          ...prev,
          evm: {
            ...prev.evm,
            connections: prev.evm.connections.map(c => 
              c.walletType === data.walletType ? connection : c
            ),
            activeConnection: prev.evm.activeConnection?.walletType === data.walletType ? connection : prev.evm.activeConnection
          }
        }));
      }
    };

    const handleEVMDisconnect = (data: any) => {
      setState(prev => ({
        ...prev,
        evm: {
          ...prev.evm,
          connections: prev.evm.connections.filter(c => c.walletType !== data.walletType),
          activeConnection: prev.evm.activeConnection?.walletType === data.walletType ? null : prev.evm.activeConnection
        }
      }));
    };

    evmService.on('accountChanged', handleEVMAccountChange);
    evmService.on('disconnected', handleEVMDisconnect);

    return () => {
      evmService.off('accountChanged', handleEVMAccountChange);
      evmService.off('disconnected', handleEVMDisconnect);
    };
  }, [evmService]);

  // Configurar listeners para Solana wallets
  useEffect(() => {
    const handleSolanaAccountChange = (data: any) => {
      const connection = solanaService.getConnection(data.walletType);
      if (connection) {
        setState(prev => ({
          ...prev,
          solana: {
            ...prev.solana,
            connections: prev.solana.connections.map(c => 
              c.walletType === data.walletType ? connection : c
            ),
            activeConnection: prev.solana.activeConnection?.walletType === data.walletType ? connection : prev.solana.activeConnection
          }
        }));
      }
    };

    const handleSolanaDisconnect = (data: any) => {
      setState(prev => ({
        ...prev,
        solana: {
          ...prev.solana,
          connections: prev.solana.connections.filter(c => c.walletType !== data.walletType),
          activeConnection: prev.solana.activeConnection?.walletType === data.walletType ? null : prev.solana.activeConnection
        }
      }));
    };

    solanaService.on('accountChanged', handleSolanaAccountChange);
    solanaService.on('disconnected', handleSolanaDisconnect);

    return () => {
      solanaService.off('accountChanged', handleSolanaAccountChange);
      solanaService.off('disconnected', handleSolanaDisconnect);
    };
  }, [solanaService]);

  // Inicializar na primeira carga
  useEffect(() => {
    if (!state.isInitialized) {
      initializeWallets();
    }
  }, [state.isInitialized, initializeWallets]);

  return {
    // Estado
    ...state,
    
    // Métodos Bitcoin
    connectBitcoinWallet: bitcoinWallet.connect,
    disconnectBitcoinWallet: bitcoinWallet.disconnect,
    
    // Métodos EVM
    connectEVMWallet,
    disconnectEVMWallet,
    switchEVMNetwork,
    
    // Métodos Solana
    connectSolanaWallet,
    disconnectSolanaWallet,
    
    // Métodos inteligentes
    getWalletRecommendation,
    connectForAsset,
    getActiveWalletForAsset,
    
    // Utilitários
    initializeWallets,
    
    // Status geral
    hasAnyConnection: state.bitcoin.isConnected || state.evm.connections.length > 0 || state.solana.connections.length > 0,
    totalConnections: (state.bitcoin.isConnected ? 1 : 0) + state.evm.connections.length + state.solana.connections.length
  };
}

export default useMultiWallet;