/**
 * Comprehensive Bitcoin Wallet Types
 * Supports: XVERSE, UNISAT, OYL WALLET, MAGIC EDEN
 */

export type WalletType = 'xverse' | 'unisat' | 'oyl' | 'magiceden';

export interface WalletAccount {
  address: string;
  publicKey: string;
  purpose: string;
  addressType: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface BitcoinNetwork {
  name: 'mainnet' | 'testnet' | 'regtest';
  chainId: string;
}

export interface WalletCapabilities {
  signMessage: boolean;
  signPsbt: boolean;
  sendBitcoin: boolean;
  signTransaction: boolean;
  getInscriptions: boolean;
  getBalance: boolean;
  switchNetwork: boolean;
}

export interface WalletProvider {
  // Core properties
  name: string;
  icon: string;
  website: string;
  
  // Connection methods
  connect(): Promise<WalletAccount[]>;
  disconnect(): Promise<void>;
  
  // Account management
  getAccounts(): Promise<WalletAccount[]>;
  getBalance(address: string): Promise<WalletBalance>;
  getNetwork(): Promise<BitcoinNetwork>;
  
  // Transaction methods
  signMessage(message: string, address: string): Promise<string>;
  signPsbt(psbt: string): Promise<string>;
  sendBitcoin(to: string, amount: number): Promise<string>;
  
  // Event listeners
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  
  // Capabilities
  getCapabilities(): WalletCapabilities;
}

export interface WalletConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  account: WalletAccount | null;
  accounts: WalletAccount[];
  balance: WalletBalance | null;
  network: BitcoinNetwork | null;
  provider: WalletProvider | null;
  walletType: WalletType | null;
  error: string | null;
  lastConnected: number | null;
}

export interface WalletContextValue {
  // State
  connectionState: WalletConnectionState;
  availableWallets: WalletType[];
  
  // Actions
  connectWallet: (walletType: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  switchAccount: (account: WalletAccount) => Promise<void>;
  switchNetwork: (network: BitcoinNetwork) => Promise<void>;
  
  // Utilities
  isWalletAvailable: (walletType: WalletType) => boolean;
  getWalletProvider: (walletType: WalletType) => WalletProvider | null;
  
  // Auto-refresh
  setAutoRefresh: (enabled: boolean, interval?: number) => void;
}

export interface WalletError extends Error {
  code: string;
  walletType?: WalletType;
  details?: any;
}

export interface WalletEventMap {
  'accountsChanged': (accounts: WalletAccount[]) => void;
  'networkChanged': (network: BitcoinNetwork) => void;
  'disconnect': () => void;
  'connect': (account: WalletAccount) => void;
  'balanceChanged': (balance: WalletBalance) => void;
  'error': (error: WalletError) => void;
}

// Xverse specific types
export interface XverseProvider extends WalletProvider {
  getAddresses(): Promise<{
    addresses: Array<{
      address: string;
      publicKey: string;
      purpose: string;
      addressType: string;
    }>;
  }>;
  request(method: string, params?: any): Promise<any>;
}

// UniSat specific types
export interface UniSatProvider extends WalletProvider {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<WalletAccount[]>;
  getBalance(): Promise<{
    confirmed: number;
    unconfirmed: number;
    total: number;
  }>;
  getInscriptions(cursor?: number, size?: number): Promise<{
    total: number;
    list: any[];
  }>;
}

// OYL specific types
export interface OYLProvider extends WalletProvider {
  connect(): Promise<WalletAccount[]>;
  signPsbt(psbt: string, options?: any): Promise<string>;
}

// Magic Eden specific types
export interface MagicEdenProvider extends WalletProvider {
  connectWallet(): Promise<{
    ordinals: {
      address: string;
      publicKey: string;
    };
    payment: {
      address: string;
      publicKey: string;
    };
  }>;
}

// Window interface extensions are declared in global.d.ts

export type WalletDetectionResult = {
  [K in WalletType]: {
    available: boolean;
    version?: string;
    provider?: WalletProvider;
  };
};

export interface WalletConfig {
  autoConnect: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  persistConnection: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export interface WalletStorage {
  lastConnectedWallet: WalletType | null;
  lastConnectedAccount: WalletAccount | null;
  autoConnectEnabled: boolean;
  settings: Partial<WalletConfig>;
}

export interface WalletPerformance {
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalReturn: number;
  totalReturnPercent: number;
  bestPerformer: string;
  worstPerformer: string;
  diversificationScore: number;
}

export type WalletAction = 
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: { walletType: WalletType; account: WalletAccount; provider: WalletProvider } }
  | { type: 'SET_DISCONNECTED' }
  | { type: 'SET_ACCOUNTS'; payload: WalletAccount[] }
  | { type: 'SET_BALANCE'; payload: WalletBalance }
  | { type: 'SET_NETWORK'; payload: BitcoinNetwork }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_AVAILABLE_WALLETS'; payload: WalletType[] }
  | { type: 'RESET_STATE' };