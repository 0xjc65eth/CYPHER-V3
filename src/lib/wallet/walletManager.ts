'use client';

import React from 'react';

interface WalletProvider {
  name: string;
  icon: string;
  isInstalled: () => boolean;
  connect: () => Promise<string[]>;
  getBalance?: (address: string) => Promise<number>;
}

// Detecção segura de provedores
const detectProviders = (): WalletProvider[] => {
  if (typeof window === 'undefined') return [];

  const providers: WalletProvider[] = [];

  // MetaMask
  if (window.ethereum?.isMetaMask) {
    providers.push({
      name: 'MetaMask',
      icon: '🦊',
      isInstalled: () => !!window.ethereum?.isMetaMask,
      connect: async () => {
        const accounts = await (window.ethereum as any).request({
          method: 'eth_requestAccounts'
        });
        return accounts;
      }
    });
  }

  // Phantom (Solana)
  if (window.solana?.isPhantom) {
    providers.push({
      name: 'Phantom',
      icon: '👻',
      isInstalled: () => !!window.solana?.isPhantom,
      connect: async () => {
        const response = await window.solana!.connect();
        return [response.publicKey.toString()];
      }
    });
  }

  // Xverse (Bitcoin)
  if (window.XverseProviders?.BitcoinProvider) {
    providers.push({
      name: 'Xverse',
      icon: '🔷',
      isInstalled: () => !!window.XverseProviders?.BitcoinProvider,
      connect: async () => {
        const response = await (window as any).XverseProviders.BitcoinProvider.request(
          'getAddresses', {}
        );
        return (response as any).result.addresses.map((addr: any) => addr.address);
      }
    });
  }

  // UniSat (Bitcoin)
  if (window.unisat) {
    providers.push({
      name: 'UniSat',
      icon: '🟠',
      isInstalled: () => !!window.unisat,
      connect: async () => {
        const accounts = await window.unisat.requestAccounts();
        return accounts;
      }
    });
  }

  return providers;
};

export class WalletManager {
  private static instance: WalletManager;
  private providers: WalletProvider[] = [];
  private connected: boolean = false;
  private activeProvider: WalletProvider | null = null;
  private accounts: string[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeProviders();
    }
  }

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  private initializeProviders() {
    // Aguarda carregamento das extensões
    setTimeout(() => {
      this.providers = detectProviders();
    }, 1000);
  }

  getAvailableProviders(): WalletProvider[] {
    return this.providers.filter(p => p.isInstalled());
  }

  async connectWallet(providerName?: string): Promise<{
    success: boolean;
    accounts?: string[];
    error?: string;
  }> {
    try {
      const availableProviders = this.getAvailableProviders();
      
      if (availableProviders.length === 0) {
        return {
          success: false,
          error: 'No wallet providers detected. Please install a wallet extension.'
        };
      }

      // Se múltiplos provedores e nenhum especificado
      if (availableProviders.length > 1 && !providerName) {
        return {
          success: false,
          error: 'Multiple wallets detected. Please specify which wallet to use.',
          accounts: availableProviders.map(p => p.name)
        };
      }

      // Selecionar provedor
      const provider = providerName 
        ? availableProviders.find(p => p.name === providerName)
        : availableProviders[0];

      if (!provider) {
        return {
          success: false,
          error: `Wallet ${providerName} not found or not installed.`
        };
      }

      // Conectar
      const accounts = await provider.connect();
      
      this.activeProvider = provider;
      this.accounts = accounts;
      this.connected = true;

      return {
        success: true,
        accounts
      };

    } catch (error) {
      console.error('Wallet connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      };
    }
  }

  disconnect() {
    this.connected = false;
    this.activeProvider = null;
    this.accounts = [];
  }

  isConnected(): boolean {
    return this.connected && this.accounts.length > 0;
  }

  getConnectedAccounts(): string[] {
    return this.accounts;
  }

  getActiveProvider(): string | null {
    return this.activeProvider?.name || null;
  }

  // Método para resolver conflitos
  async resolveProviderConflicts(): Promise<{
    hasConflicts: boolean;
    providers: string[];
    recommendation?: string;
  }> {
    const available = this.getAvailableProviders();
    
    if (available.length <= 1) {
      return {
        hasConflicts: false,
        providers: available.map(p => p.name)
      };
    }

    // Detecta conflitos específicos
    const hasMetaMaskAndOthers = available.some(p => p.name === 'MetaMask') && 
                                  available.length > 1;

    let recommendation = '';
    if (hasMetaMaskAndOthers) {
      recommendation = 'Multiple Ethereum wallets detected. Consider disabling unused wallet extensions to avoid conflicts.';
    }

    return {
      hasConflicts: true,
      providers: available.map(p => p.name),
      recommendation
    };
  }
}

// Hook React para usar o WalletManager
export function useWalletManager() {
  const [manager] = React.useState(() => WalletManager.getInstance());
  const [connected, setConnected] = React.useState(false);
  const [accounts, setAccounts] = React.useState<string[]>([]);
  const [provider, setProvider] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateState = () => {
      setConnected(manager.isConnected());
      setAccounts(manager.getConnectedAccounts());
      setProvider(manager.getActiveProvider());
    };

    updateState();
    
    // Escutar mudanças de conta (se suportado pelo provedor)
    const interval = setInterval(updateState, 2000);
    
    return () => clearInterval(interval);
  }, [manager]);

  return {
    manager,
    connected,
    accounts,
    provider,
    availableProviders: manager.getAvailableProviders(),
    connect: manager.connectWallet.bind(manager),
    disconnect: manager.disconnect.bind(manager),
    resolveConflicts: manager.resolveProviderConflicts.bind(manager)
  };
}

// Window types declared in global.d.ts