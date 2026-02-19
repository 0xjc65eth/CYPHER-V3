/**
 * CYPHER ORDi Future V3 - Multi-Wallet Integration Service
 * 
 * Universal wallet integration service supporting Xverse, Unisat, and Oyl Wallet
 * with comprehensive Bitcoin, Ordinals, and Runes functionality.
 */

import { WalletType, WalletAccount, WalletBalance, WalletProvider, WalletConnectionState, WalletError } from '../types/wallet';

export interface WalletCapabilities {
  bitcoin: boolean;
  ordinals: boolean;
  runes: boolean;
  brc20: boolean;
  rareSats: boolean;
  stacks: boolean;
  signMessage: boolean;
  signPsbt: boolean;
  switchNetwork: boolean;
}

export interface WalletIntegration {
  type: WalletType;
  name: string;
  icon: string;
  website: string;
  capabilities: WalletCapabilities;
  isInstalled: boolean;
  version?: string;
  provider?: any;
}

export interface UniversalWalletAccount extends WalletAccount {
  walletType: WalletType;
  balance: WalletBalance;
  ordinalsAddress?: string;
  paymentsAddress?: string;
  stacksAddress?: string;
}

export interface WalletAuthSession {
  address: string;
  signature: string;
  message: string;
  timestamp: number;
  expiresAt: number;
  walletType: WalletType;
  isValid: boolean;
}

export interface WalletSessionManager {
  createSession(address: string, signature: string, walletType: WalletType): WalletAuthSession;
  validateSession(session: WalletAuthSession): boolean;
  refreshSession(session: WalletAuthSession): Promise<WalletAuthSession>;
  clearSession(address: string): void;
  getActiveSession(address: string): WalletAuthSession | null;
}

export class WalletIntegrationService {
  private static instance: WalletIntegrationService;
  private integrations: Map<WalletType, WalletIntegration> = new Map();
  private activeConnections: Map<WalletType, WalletConnectionState> = new Map();
  private authSessions: Map<string, WalletAuthSession> = new Map();
  private listeners: Array<(event: string, data: any) => void> = [];

  private constructor() {
    this.initializeIntegrations();
    this.detectWallets();
  }

  public static getInstance(): WalletIntegrationService {
    if (!WalletIntegrationService.instance) {
      WalletIntegrationService.instance = new WalletIntegrationService();
    }
    return WalletIntegrationService.instance;
  }

  /**
   * Initialize wallet integrations with their capabilities
   */
  private initializeIntegrations(): void {
    // Xverse Wallet Integration
    this.integrations.set('xverse', {
      type: 'xverse',
      name: 'Xverse',
      icon: '/wallet-icons/xverse.svg',
      website: 'https://xverse.app',
      capabilities: {
        bitcoin: true,
        ordinals: true,
        runes: true,
        brc20: true,
        rareSats: true,
        stacks: true,
        signMessage: true,
        signPsbt: true,
        switchNetwork: true
      },
      isInstalled: false
    });

    // Unisat Wallet Integration
    this.integrations.set('unisat', {
      type: 'unisat',
      name: 'Unisat',
      icon: '/wallet-icons/unisat.svg',
      website: 'https://unisat.io',
      capabilities: {
        bitcoin: true,
        ordinals: true,
        runes: true,
        brc20: true,
        rareSats: true,
        stacks: false,
        signMessage: true,
        signPsbt: true,
        switchNetwork: true
      },
      isInstalled: false
    });

    // Oyl Wallet Integration
    this.integrations.set('oyl', {
      type: 'oyl',
      name: 'Oyl Wallet',
      icon: '/wallet-icons/oyl.svg',
      website: 'https://oyl.io',
      capabilities: {
        bitcoin: true,
        ordinals: true,
        runes: true,
        brc20: true,
        rareSats: true,
        stacks: false,
        signMessage: true,
        signPsbt: true,
        switchNetwork: true
      },
      isInstalled: false
    });
  }

  /**
   * Detect installed wallets
   */
  private detectWallets(): void {
    if (typeof window === 'undefined') return;

    // Detect Xverse
    if (window.XverseProviders?.BitcoinProvider) {
      const xverse = this.integrations.get('xverse')!;
      xverse.isInstalled = true;
      xverse.provider = window.XverseProviders.BitcoinProvider;
      
      // Apply patch to ensure getAddresses method exists
      if (!xverse.provider.getAddresses) {
        xverse.provider.getAddresses = async function() {
          try {
            const response = await this.request('getAccounts', {
              purposes: ['ordinals', 'payment'],
              message: 'CYPHER ORDi Future V3 would like to connect to your wallet.',
            });
            
            if (response?.result?.addresses) {
              return { addresses: response.result.addresses };
            }
            return { addresses: [] };
          } catch (error) {
            console.error('Error in patched getAddresses:', error);
            return { addresses: [] };
          }
        }.bind(xverse.provider);
      }
    }

    // Detect Unisat
    if (window.unisat) {
      const unisat = this.integrations.get('unisat')!;
      unisat.isInstalled = true;
      unisat.provider = window.unisat;
    }

    // Detect Oyl
    if (window.oyl) {
      const oyl = this.integrations.get('oyl')!;
      oyl.isInstalled = true;
      oyl.provider = window.oyl;
    }

    // Re-detect after a delay in case wallets load asynchronously
    setTimeout(() => this.detectWalletsAgain(), 1000);
  }

  /**
   * Re-detect wallets after initial load
   */
  private detectWalletsAgain(): void {
    if (typeof window === 'undefined') return;

    // Re-check Xverse
    if (!this.integrations.get('xverse')?.isInstalled && window.XverseProviders?.BitcoinProvider) {
      this.detectWallets();
    }
  }

  /**
   * Get all available wallet integrations
   */
  public getAvailableWallets(): WalletIntegration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get installed wallets only
   */
  public getInstalledWallets(): WalletIntegration[] {
    return Array.from(this.integrations.values()).filter(wallet => wallet.isInstalled);
  }

  /**
   * Get wallet integration by type
   */
  public getWalletIntegration(walletType: WalletType): WalletIntegration | null {
    return this.integrations.get(walletType) || null;
  }

  /**
   * Connect to a specific wallet
   */
  public async connectWallet(walletType: WalletType): Promise<UniversalWalletAccount> {
    // Re-detect wallets in case they were loaded after initialization
    this.detectWallets();
    
    const integration = this.integrations.get(walletType);
    if (!integration) {
      throw new WalletError(`Wallet type ${walletType} not supported`, 'WALLET_NOT_SUPPORTED');
    }

    if (!integration.isInstalled) {
      throw new WalletError(`${integration.name} is not installed`, 'WALLET_NOT_INSTALLED');
    }

    try {
      this.emit('connecting', { walletType });

      let account: UniversalWalletAccount;

      switch (walletType) {
        case 'xverse':
          account = await this.connectXverse(integration);
          break;
        case 'unisat':
          account = await this.connectUnisat(integration);
          break;
        case 'oyl':
          account = await this.connectOyl(integration);
          break;
        default:
          throw new WalletError(`Connection method for ${walletType} not implemented`, 'METHOD_NOT_IMPLEMENTED');
      }

      // Store active connection
      this.activeConnections.set(walletType, {
        isConnected: true,
        isConnecting: false,
        account,
        accounts: [account],
        balance: account.balance,
        network: null,
        provider: integration.provider,
        walletType,
        error: null,
        lastConnected: Date.now()
      });

      this.emit('connected', { walletType, account });
      return account;

    } catch (error) {
      this.emit('error', { walletType, error });
      throw error;
    }
  }

  /**
   * Connect to Xverse wallet
   */
  private async connectXverse(integration: WalletIntegration): Promise<UniversalWalletAccount> {
    const provider = integration.provider;
    
    try {
      // First check if provider exists and has the required methods
      if (!provider) {
        throw new WalletError('Xverse provider not found', 'PROVIDER_NOT_FOUND');
      }

      let accounts: any[] = [];

      // Try multiple methods to get accounts
      try {
        // Method 1: Try getAddresses if available
        if (typeof provider.getAddresses === 'function') {
          const addresses = await provider.getAddresses();
          accounts = addresses?.addresses || addresses || [];
        }
      } catch (e) {
      }

      // Method 2: Try direct request method
      if (accounts.length === 0 && provider.request) {
        try {
          const response = await provider.request('getAccounts', {
            purposes: ['ordinals', 'payment'],
            message: 'CYPHER ORDi Future V3 would like to connect to your wallet.',
          });
          
          if (response?.result?.addresses) {
            accounts = response.result.addresses;
          }
        } catch (e) {
        }
      }

      // Method 3: Check if accounts are already available
      if (accounts.length === 0 && provider.accounts) {
        accounts = provider.accounts;
      }

      // Method 4: Try LaserEyes compatibility
      if (accounts.length === 0) {
        // Try to trigger connection first
        if (typeof provider.connect === 'function') {
          await provider.connect();
          // Retry getting addresses
          if (typeof provider.getAddresses === 'function') {
            const addresses = await provider.getAddresses();
            accounts = addresses?.addresses || addresses || [];
          }
        }
      }
      
      if (!accounts || accounts.length === 0) {
        throw new WalletError('No accounts found in Xverse wallet. Please ensure Xverse is unlocked and has accounts.', 'NO_ACCOUNTS');
      }

      const primaryAccount = accounts[0];
      const ordinalsAccount = accounts.find((acc: any) => acc.purpose === 'ordinals') || primaryAccount;
      const paymentsAccount = accounts.find((acc: any) => acc.purpose === 'payment') || primaryAccount;
      
      // Get balance
      const balance = await this.getXverseBalance(provider, paymentsAccount.address);

      return {
        address: paymentsAccount.address,
        publicKey: paymentsAccount.publicKey || '',
        purpose: paymentsAccount.purpose || 'payment',
        addressType: paymentsAccount.addressType as any || 'p2wpkh',
        walletType: 'xverse',
        balance,
        ordinalsAddress: ordinalsAccount.address,
        paymentsAddress: paymentsAccount.address
      };
    } catch (error) {
      console.error('Xverse connection error:', error);
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(`Failed to connect to Xverse: ${error}`, 'XVERSE_CONNECTION_FAILED');
    }
  }

  /**
   * Connect to Unisat wallet
   */
  private async connectUnisat(integration: WalletIntegration): Promise<UniversalWalletAccount> {
    const provider = integration.provider;
    
    try {
      const accounts = await provider.requestAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new WalletError('No accounts found in Unisat wallet', 'NO_ACCOUNTS');
      }

      const address = accounts[0];
      const balance = await provider.getBalance();
      
      // Get public key (Unisat doesn't expose it directly, so we'll use a placeholder)
      const publicKey = await this.getUnisatPublicKey(provider, address);

      return {
        address,
        publicKey,
        purpose: 'payment',
        addressType: 'p2wpkh',
        walletType: 'unisat',
        balance: {
          confirmed: balance.confirmed,
          unconfirmed: balance.unconfirmed,
          total: balance.total
        }
      };
    } catch (error) {
      throw new WalletError(`Failed to connect to Unisat: ${error}`, 'UNISAT_CONNECTION_FAILED');
    }
  }

  /**
   * Connect to Oyl wallet
   */
  private async connectOyl(integration: WalletIntegration): Promise<UniversalWalletAccount> {
    const provider = integration.provider;
    
    try {
      const connection = await provider.connect();
      
      if (!connection.address) {
        throw new WalletError('No address found in Oyl wallet', 'NO_ADDRESS');
      }

      // Get balance (implementation depends on Oyl's API)
      const balance = await this.getOylBalance(provider, connection.address);

      return {
        address: connection.address,
        publicKey: connection.publicKey,
        purpose: 'payment',
        addressType: 'p2tr',
        walletType: 'oyl',
        balance
      };
    } catch (error) {
      throw new WalletError(`Failed to connect to Oyl: ${error}`, 'OYL_CONNECTION_FAILED');
    }
  }

  /**
   * Disconnect from a wallet
   */
  public async disconnectWallet(walletType: WalletType): Promise<void> {
    const connection = this.activeConnections.get(walletType);
    if (!connection) return;

    try {
      // Clear auth session
      if (connection.account) {
        this.clearAuthSession(connection.account.address);
      }

      // Remove active connection
      this.activeConnections.delete(walletType);

      this.emit('disconnected', { walletType });
    } catch (error) {
      this.emit('error', { walletType, error });
      throw error;
    }
  }

  /**
   * Create authentication session
   */
  public async createAuthSession(
    address: string, 
    walletType: WalletType, 
    message?: string
  ): Promise<WalletAuthSession> {
    const integration = this.integrations.get(walletType);
    if (!integration) {
      throw new WalletError(`Wallet type ${walletType} not supported`, 'WALLET_NOT_SUPPORTED');
    }

    const authMessage = message || `Authenticate with CYPHER ORDi Future V3\nAddress: ${address}\nTimestamp: ${Date.now()}`;
    
    try {
      let signature: string;

      switch (walletType) {
        case 'xverse':
          signature = await integration.provider.signMessage(authMessage);
          break;
        case 'unisat':
          signature = await integration.provider.signMessage(authMessage);
          break;
        case 'oyl':
          signature = await integration.provider.signMessage(authMessage);
          break;
        default:
          throw new WalletError(`Signing not implemented for ${walletType}`, 'SIGNING_NOT_IMPLEMENTED');
      }

      const session: WalletAuthSession = {
        address,
        signature,
        message: authMessage,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        walletType,
        isValid: true
      };

      this.authSessions.set(address, session);
      return session;

    } catch (error) {
      throw new WalletError(`Failed to create auth session: ${error}`, 'AUTH_SESSION_FAILED');
    }
  }

  /**
   * Validate authentication session
   */
  public validateAuthSession(address: string): boolean {
    const session = this.authSessions.get(address);
    if (!session) return false;

    const isExpired = Date.now() > session.expiresAt;
    if (isExpired) {
      this.authSessions.delete(address);
      return false;
    }

    return session.isValid;
  }

  /**
   * Clear authentication session
   */
  public clearAuthSession(address: string): void {
    this.authSessions.delete(address);
  }

  /**
   * Get active connection state
   */
  public getConnectionState(walletType: WalletType): WalletConnectionState | null {
    return this.activeConnections.get(walletType) || null;
  }

  /**
   * Get all active connections
   */
  public getActiveConnections(): Map<WalletType, WalletConnectionState> {
    return new Map(this.activeConnections);
  }

  /**
   * Add event listener
   */
  public addEventListener(callback: (event: string, data: any) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(callback: (event: string, data: any) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in wallet event listener:', error);
      }
    });
  }

  // Helper methods for wallet-specific operations

  private async getXverseBalance(provider: any, address: string): Promise<WalletBalance> {
    try {
      // Implement Xverse balance fetching
      const response = await fetch(`https://mempool.space/api/address/${address}`);
      const data = await response.json();
      
      return {
        confirmed: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
        unconfirmed: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
        total: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) + 
               (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum)
      };
    } catch (error) {
      return { confirmed: 0, unconfirmed: 0, total: 0 };
    }
  }

  private async getUnisatPublicKey(provider: any, address: string): Promise<string> {
    try {
      // For Unisat, we'll try to get the public key through signing
      const message = 'Get public key';
      await provider.signMessage(message);
      return ''; // Placeholder - actual implementation would extract from signature
    } catch (error) {
      return ''; // Placeholder public key
    }
  }

  private async getOylBalance(provider: any, address: string): Promise<WalletBalance> {
    try {
      // Implement Oyl balance fetching
      const response = await fetch(`https://mempool.space/api/address/${address}`);
      const data = await response.json();
      
      return {
        confirmed: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
        unconfirmed: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
        total: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) + 
               (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum)
      };
    } catch (error) {
      return { confirmed: 0, unconfirmed: 0, total: 0 };
    }
  }
}

// Custom error class for wallet operations
class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public walletType?: WalletType,
    public details?: any
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

// Export singleton instance
export const walletIntegrationService = WalletIntegrationService.getInstance();
export default walletIntegrationService;