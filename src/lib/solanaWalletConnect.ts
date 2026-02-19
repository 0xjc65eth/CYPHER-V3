/**
 * Solana Wallet Connection Service
 * Gerencia conexões com carteiras Solana (Phantom, Solflare, Backpack, etc.)
 */

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: any;
  isConnected?: boolean;
  connect: (options?: any) => Promise<any>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  on: (event: string, handler: Function) => void;
  removeListener: (event: string, handler: Function) => void;
}

export interface SolanaWalletConnection {
  address: string;
  publicKey: string;
  balance: number;
  provider: SolanaWalletProvider;
  walletType: 'phantom' | 'solflare' | 'backpack' | 'sollet';
}

export interface SolanaTokenAccount {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  tokenSymbol?: string;
}

/**
 * Solana Wallet Service
 */
export class SolanaWalletService {
  private static instance: SolanaWalletService;
  private connections = new Map<string, SolanaWalletConnection>();
  private eventListeners = new Map<string, Function[]>();
  private rpcEndpoint = 'https://api.mainnet-beta.solana.com';

  static getInstance(): SolanaWalletService {
    if (!SolanaWalletService.instance) {
      SolanaWalletService.instance = new SolanaWalletService();
    }
    return SolanaWalletService.instance;
  }

  /**
   * Detecta carteiras Solana disponíveis
   */
  async detectAvailableWallets(): Promise<string[]> {
    const availableWallets: string[] = [];
    
    if (typeof window === 'undefined') return availableWallets;

    try {
      // Phantom
      if ((window as any).solana?.isPhantom) {
        availableWallets.push('phantom');
      }

      // Solflare
      if ((window as any).solflare) {
        availableWallets.push('solflare');
      }

      // Backpack
      if ((window as any).backpack) {
        availableWallets.push('backpack');
      }

      // Verificar provider genérico do Solana
      if ((window as any).solana && !(window as any).solana.isPhantom) {
        // Pode ser outra carteira
        availableWallets.push('sollet');
      }

    } catch (error) {
    }

    return availableWallets;
  }

  /**
   * Conecta com carteira Solana específica
   */
  async connectWallet(walletType: 'phantom' | 'solflare' | 'backpack' | 'sollet'): Promise<SolanaWalletConnection> {
    try {
      const provider = await this.getProvider(walletType);
      
      if (!provider) {
        throw new Error(`${walletType} wallet not found. Please install the extension.`);
      }

      // Conectar com a carteira
      const response = await provider.connect();
      
      if (!response || !response.publicKey) {
        throw new Error('Failed to connect: No public key returned');
      }

      const publicKey = response.publicKey.toString();
      const address = publicKey; // Em Solana, o endereço é a chave pública

      // Obter saldo
      const balance = await this.getBalance(address);

      const connection: SolanaWalletConnection = {
        address,
        publicKey,
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
  private async getProvider(walletType: string): Promise<SolanaWalletProvider | null> {
    if (typeof window === 'undefined') return null;

    switch (walletType) {
      case 'phantom':
        const phantom = (window as any).solana;
        return phantom?.isPhantom ? phantom : null;
        
      case 'solflare':
        return (window as any).solflare || null;
        
      case 'backpack':
        return (window as any).backpack || null;
        
      case 'sollet':
        const solana = (window as any).solana;
        return solana && !solana.isPhantom ? solana : null;
        
      default:
        return null;
    }
  }

  /**
   * Obtém saldo SOL
   */
  private async getBalance(address: string): Promise<number> {
    try {
      const response = await fetch(this.rpcEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Converter de lamports para SOL (1 SOL = 1,000,000,000 lamports)
      return data.result.value / 1000000000;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtém tokens SPL da carteira
   */
  async getTokenAccounts(address: string): Promise<SolanaTokenAccount[]> {
    try {
      const response = await fetch(this.rpcEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            {
              programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' // SPL Token Program
            },
            {
              encoding: 'jsonParsed'
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const tokenAccounts: SolanaTokenAccount[] = [];
      
      for (const account of data.result.value) {
        const parsedInfo = account.account.data.parsed.info;
        tokenAccounts.push({
          mint: parsedInfo.mint,
          amount: parsedInfo.tokenAmount.amount,
          decimals: parsedInfo.tokenAmount.decimals,
          uiAmount: parsedInfo.tokenAmount.uiAmount || 0
        });
      }

      return tokenAccounts;

    } catch (error) {
      return [];
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(provider: SolanaWalletProvider, walletType: string) {
    const connectHandler = () => {
      this.emit('connected', { walletType });
    };

    const disconnectHandler = () => {
      this.handleDisconnect(walletType);
    };

    const accountChangeHandler = (publicKey: any) => {
      if (publicKey) {
        this.handleAccountChange(walletType, publicKey.toString());
      } else {
        this.handleDisconnect(walletType);
      }
    };

    // Remover listeners anteriores se existirem
    const existingListeners = this.eventListeners.get(walletType);
    if (existingListeners) {
      existingListeners.forEach(listener => {
        try {
          provider.removeListener('connect', listener);
          provider.removeListener('disconnect', listener);
          provider.removeListener('accountChanged', listener);
        } catch (error) {
        }
      });
    }

    // Adicionar novos listeners
    if (provider.on) {
      provider.on('connect', connectHandler);
      provider.on('disconnect', disconnectHandler);
      provider.on('accountChanged', accountChangeHandler);
    }

    // Armazenar referências para cleanup posterior
    this.eventListeners.set(walletType, [connectHandler, disconnectHandler, accountChangeHandler]);
  }

  /**
   * Gerencia mudança de conta
   */
  private async handleAccountChange(walletType: string, newPublicKey: string) {
    const connection = this.connections.get(walletType);
    if (connection) {
      connection.address = newPublicKey;
      connection.publicKey = newPublicKey;
      
      // Atualizar saldo
      connection.balance = await this.getBalance(newPublicKey);
      
      this.emit('accountChanged', { walletType, address: newPublicKey });
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
   * Assina transação
   */
  async signTransaction(walletType: string, transaction: any): Promise<any> {
    const connection = this.connections.get(walletType);
    if (!connection) {
      throw new Error(`${walletType} not connected`);
    }

    try {
      return await connection.provider.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Assina múltiplas transações
   */
  async signAllTransactions(walletType: string, transactions: any[]): Promise<any[]> {
    const connection = this.connections.get(walletType);
    if (!connection) {
      throw new Error(`${walletType} not connected`);
    }

    try {
      return await connection.provider.signAllTransactions(transactions);
    } catch (error) {
      console.error('Error signing transactions:', error);
      throw error;
    }
  }

  /**
   * Desconecta carteira
   */
  async disconnectWallet(walletType: string): Promise<void> {
    const connection = this.connections.get(walletType);
    if (connection) {
      try {
        await connection.provider.disconnect();
      } catch (error) {
      }

      // Remover listeners
      const listeners = this.eventListeners.get(walletType);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            connection.provider.removeListener('connect', listener);
            connection.provider.removeListener('disconnect', listener);
            connection.provider.removeListener('accountChanged', listener);
          } catch (error) {
          }
        });
      }

      this.connections.delete(walletType);
      this.eventListeners.delete(walletType);
      
    }
  }

  /**
   * Atualiza saldo
   */
  async refreshBalance(walletType: string): Promise<void> {
    const connection = this.connections.get(walletType);
    if (connection) {
      connection.balance = await this.getBalance(connection.address);
    }
  }

  /**
   * Obtém conexão ativa
   */
  getConnection(walletType: string): SolanaWalletConnection | null {
    return this.connections.get(walletType) || null;
  }

  /**
   * Obtém todas as conexões ativas
   */
  getAllConnections(): SolanaWalletConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Verifica se carteira está conectada
   */
  isConnected(walletType: string): boolean {
    const connection = this.connections.get(walletType);
    return connection ? connection.provider.isConnected || false : false;
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

  /**
   * Configura endpoint RPC customizado
   */
  setRpcEndpoint(endpoint: string) {
    this.rpcEndpoint = endpoint;
  }

  /**
   * Obtém endpoint RPC atual
   */
  getRpcEndpoint(): string {
    return this.rpcEndpoint;
  }
}

export default SolanaWalletService;