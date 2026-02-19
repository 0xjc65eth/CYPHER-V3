/**
 * EVM Wallet Connection Service
 * Gerencia conexões com carteiras EVM (MetaMask, Rabby, Coinbase, etc.)
 */

export interface EVMWalletProvider {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isWalletConnect?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: Function) => void;
  removeListener: (event: string, handler: Function) => void;
}

export interface EVMWalletConnection {
  address: string;
  chainId: number;
  balance: string;
  provider: EVMWalletProvider;
  walletType: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect';
}

export interface EVMNetworkInfo {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

/**
 * EVM Wallet Service
 */
export class EVMWalletService {
  private static instance: EVMWalletService;
  private connections = new Map<string, EVMWalletConnection>();
  private eventListeners = new Map<string, Function[]>();

  static getInstance(): EVMWalletService {
    if (!EVMWalletService.instance) {
      EVMWalletService.instance = new EVMWalletService();
    }
    return EVMWalletService.instance;
  }

  /**
   * Detecta carteiras EVM disponíveis
   */
  async detectAvailableWallets(): Promise<string[]> {
    const availableWallets: string[] = [];
    
    if (typeof window === 'undefined') return availableWallets;

    try {
      // MetaMask
      if ((window as any).ethereum?.isMetaMask) {
        availableWallets.push('metamask');
      }

      // Rabby
      if ((window as any).ethereum?.isRabby) {
        availableWallets.push('rabby');
      }

      // Coinbase Wallet
      if ((window as any).ethereum?.isCoinbaseWallet) {
        availableWallets.push('coinbase');
      }

      // Verificar múltiplos provedores
      if ((window as any).ethereum?.providers) {
        const providers = (window as any).ethereum.providers;
        
        for (const provider of providers) {
          if (provider.isMetaMask && !availableWallets.includes('metamask')) {
            availableWallets.push('metamask');
          }
          if (provider.isRabby && !availableWallets.includes('rabby')) {
            availableWallets.push('rabby');
          }
          if (provider.isCoinbaseWallet && !availableWallets.includes('coinbase')) {
            availableWallets.push('coinbase');
          }
        }
      }

    } catch (error) {
      console.error('Error detecting EVM wallets:', error);
    }

    return availableWallets;
  }

  /**
   * Conecta com carteira EVM específica
   */
  async connectWallet(walletType: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect'): Promise<EVMWalletConnection> {
    try {
      const provider = await this.getProvider(walletType);
      
      if (!provider) {
        throw new Error(`${walletType} wallet not found. Please install the extension.`);
      }

      // Solicitar conexão
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];

      // Obter chain ID
      const chainId = await provider.request({
        method: 'eth_chainId'
      });

      // Obter saldo
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      const connection: EVMWalletConnection = {
        address,
        chainId: parseInt(chainId, 16),
        balance,
        provider,
        walletType
      };

      // Armazenar conexão
      this.connections.set(walletType, connection);

      // Configurar listeners
      this.setupEventListeners(provider, walletType);

      return connection;

    } catch (error: any) {
      console.error(`❌ Failed to connect ${walletType}:`, error);
      throw new Error(`Failed to connect ${walletType}: ${error.message}`);
    }
  }

  /**
   * Obtém provider da carteira específica
   */
  private async getProvider(walletType: string): Promise<EVMWalletProvider | null> {
    if (typeof window === 'undefined') return null;

    const ethereum = (window as any).ethereum;
    
    if (!ethereum) return null;

    // Se há múltiplos provedores, encontrar o específico
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      for (const provider of ethereum.providers) {
        switch (walletType) {
          case 'metamask':
            if (provider.isMetaMask && !provider.isRabby) return provider;
            break;
          case 'rabby':
            if (provider.isRabby) return provider;
            break;
          case 'coinbase':
            if (provider.isCoinbaseWallet) return provider;
            break;
        }
      }
    }

    // Fallback para provider único
    switch (walletType) {
      case 'metamask':
        return ethereum.isMetaMask && !ethereum.isRabby ? ethereum : null;
      case 'rabby':
        return ethereum.isRabby ? ethereum : null;
      case 'coinbase':
        return ethereum.isCoinbaseWallet ? ethereum : null;
      default:
        return ethereum;
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(provider: EVMWalletProvider, walletType: string) {
    const accountsHandler = (accounts: string[]) => {
      if (accounts.length === 0) {
        this.handleDisconnect(walletType);
      } else {
        this.handleAccountChange(walletType, accounts[0]);
      }
    };

    const chainHandler = (chainId: string) => {
      this.handleChainChange(walletType, parseInt(chainId, 16));
    };

    const disconnectHandler = () => {
      this.handleDisconnect(walletType);
    };

    // Remover listeners anteriores se existirem
    const existingListeners = this.eventListeners.get(walletType);
    if (existingListeners) {
      existingListeners.forEach(listener => {
        try {
          provider.removeListener('accountsChanged', listener);
          provider.removeListener('chainChanged', listener);
          provider.removeListener('disconnect', listener);
        } catch (error) {
          // Listener removal failed silently
        }
      });
    }

    // Adicionar novos listeners
    provider.on('accountsChanged', accountsHandler);
    provider.on('chainChanged', chainHandler);
    provider.on('disconnect', disconnectHandler);

    // Armazenar referências para cleanup posterior
    this.eventListeners.set(walletType, [accountsHandler, chainHandler, disconnectHandler]);
  }

  /**
   * Gerencia mudança de conta
   */
  private handleAccountChange(walletType: string, newAddress: string) {
    const connection = this.connections.get(walletType);
    if (connection) {
      connection.address = newAddress;
      this.emit('accountChanged', { walletType, address: newAddress });
    }
  }

  /**
   * Gerencia mudança de rede
   */
  private handleChainChange(walletType: string, newChainId: number) {
    const connection = this.connections.get(walletType);
    if (connection) {
      connection.chainId = newChainId;
      this.emit('chainChanged', { walletType, chainId: newChainId });
    }
  }

  /**
   * Gerencia desconexão
   */
  private handleDisconnect(walletType: string) {
    this.connections.delete(walletType);
    this.eventListeners.delete(walletType);
    this.emit('disconnected', { walletType });
  }

  /**
   * Troca de rede
   */
  async switchNetwork(walletType: string, chainId: number): Promise<boolean> {
    try {
      const connection = this.connections.get(walletType);
      if (!connection) {
        throw new Error(`${walletType} not connected`);
      }

      await connection.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });

      return true;
    } catch (error: any) {
      // Se a rede não existe, tentar adicionar
      if (error.code === 4902) {
        return await this.addNetwork(walletType, chainId);
      }
      throw error;
    }
  }

  /**
   * Adiciona nova rede
   */
  async addNetwork(walletType: string, chainId: number): Promise<boolean> {
    try {
      const connection = this.connections.get(walletType);
      if (!connection) {
        throw new Error(`${walletType} not connected`);
      }

      const networkInfo = this.getNetworkInfo(chainId);
      if (!networkInfo) {
        throw new Error(`Network ${chainId} not supported`);
      }

      await connection.provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${chainId.toString(16)}`,
          chainName: networkInfo.chainName,
          nativeCurrency: networkInfo.nativeCurrency,
          rpcUrls: networkInfo.rpcUrls,
          blockExplorerUrls: networkInfo.blockExplorerUrls
        }]
      });

      return true;
    } catch (error) {
      console.error('Error adding network:', error);
      return false;
    }
  }

  /**
   * Obtém informações da rede
   */
  private getNetworkInfo(chainId: number): EVMNetworkInfo | null {
    const networks: Record<number, EVMNetworkInfo> = {
      1: {
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io']
      },
      42161: {
        chainId: 42161,
        chainName: 'Arbitrum One',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io']
      },
      10: {
        chainId: 10,
        chainName: 'Optimism',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.optimism.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io']
      },
      137: {
        chainId: 137,
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
      },
      8453: {
        chainId: 8453,
        chainName: 'Base',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
      }
    };

    return networks[chainId] || null;
  }

  /**
   * Desconecta carteira
   */
  async disconnectWallet(walletType: string): Promise<void> {
    const connection = this.connections.get(walletType);
    if (connection) {
      // Remover listeners
      const listeners = this.eventListeners.get(walletType);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            connection.provider.removeListener('accountsChanged', listener);
            connection.provider.removeListener('chainChanged', listener);
            connection.provider.removeListener('disconnect', listener);
          } catch (error) {
            // Listener removal failed silently
          }
        });
      }

      this.connections.delete(walletType);
      this.eventListeners.delete(walletType);
      
    }
  }

  /**
   * Obtém conexão ativa
   */
  getConnection(walletType: string): EVMWalletConnection | null {
    return this.connections.get(walletType) || null;
  }

  /**
   * Obtém todas as conexões ativas
   */
  getAllConnections(): EVMWalletConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Sistema de eventos
   */
  private eventEmitters = new Map<string, Function[]>();

  on(event: string, callback: Function) {
    if (!this.eventEmitters.has(event)) {
      this.eventEmitters.set(event, []);
    }
    this.eventEmitters.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.eventEmitters.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.eventEmitters.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }
}

export default EVMWalletService;