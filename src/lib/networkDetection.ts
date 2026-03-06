/**
 * Multi-Chain Network Detection System
 * Detecta automaticamente redes e carteiras disponíveis
 */

export interface NetworkConfig {
  id: string;
  name: string;
  chainId?: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrl?: string;
  type: 'bitcoin' | 'evm' | 'solana';
  supportedWallets: string[]; // Array of wallet IDs
}

export interface WalletType {
  id: string;
  name: string;
  icon: string;
  type: 'bitcoin' | 'evm' | 'solana';
  downloadUrl: string;
  deepLink?: string;
  isInstalled: () => boolean;
  connect: () => Promise<any>;
}

// Network configurations
export const NETWORKS: Record<string, NetworkConfig> = {
  // Bitcoin Networks
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    rpcUrls: [],
    type: 'bitcoin',
    supportedWallets: ['unisat', 'xverse', 'oyl', 'magiceden'],
    iconUrl: '/icons/bitcoin.svg'
  },
  
  // EVM Networks
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.infura.io/v3/', 'https://eth-mainnet.alchemyapi.io/v2/'],
    blockExplorerUrls: ['https://etherscan.io'],
    type: 'evm',
    supportedWallets: ['metamask', 'rabby', 'coinbase', 'walletconnect'],
    iconUrl: '/icons/ethereum.svg'
  },
  
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    type: 'evm',
    supportedWallets: ['metamask', 'rabby', 'coinbase', 'walletconnect'],
    iconUrl: '/icons/arbitrum.svg'
  },
  
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    type: 'evm',
    supportedWallets: ['metamask', 'rabby', 'coinbase', 'walletconnect'],
    iconUrl: '/icons/optimism.svg'
  },
  
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    type: 'evm',
    supportedWallets: ['metamask', 'rabby', 'coinbase', 'walletconnect'],
    iconUrl: '/icons/polygon.svg'
  },
  
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    type: 'evm',
    supportedWallets: ['metamask', 'rabby', 'coinbase', 'walletconnect'],
    iconUrl: '/icons/base.svg'
  },
  
  // Solana Network
  solana: {
    id: 'solana',
    name: 'Solana',
    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
    rpcUrls: ['https://api.mainnet-beta.solana.com'],
    blockExplorerUrls: ['https://explorer.solana.com'],
    type: 'solana',
    supportedWallets: ['phantom', 'solflare', 'backpack'],
    iconUrl: '/icons/solana.svg'
  }
};

// Wallet configurations
export const WALLETS: Record<string, WalletType> = {
  // Bitcoin Wallets
  unisat: {
    id: 'unisat',
    name: 'Unisat',
    icon: '🟠',
    type: 'bitcoin',
    downloadUrl: 'https://unisat.io/',
    isInstalled: () => typeof (window as any).unisat !== 'undefined',
    connect: async () => {
      const unisat = (window as any).unisat;
      if (!unisat) throw new Error('Unisat not installed');
      return await unisat.requestAccounts();
    }
  },
  
  xverse: {
    id: 'xverse',
    name: 'Xverse',
    icon: '✖️',
    type: 'bitcoin',
    downloadUrl: 'https://www.xverse.app/',
    isInstalled: () => typeof (window as any).XverseProviders !== 'undefined',
    connect: async () => {
      const xverse = (window as any).XverseProviders?.BitcoinProvider;
      if (!xverse) throw new Error('Xverse not installed');
      return await xverse.request('getAccounts', null);
    }
  },
  
  oyl: {
    id: 'oyl',
    name: 'OYL',
    icon: '🛢️',
    type: 'bitcoin',
    downloadUrl: 'https://oyl.io/',
    isInstalled: () => typeof (window as any).oyl !== 'undefined',
    connect: async () => {
      const oyl = (window as any).oyl;
      if (!oyl) throw new Error('OYL not installed');
      return await oyl.requestAccounts();
    }
  },
  
  magiceden: {
    id: 'magiceden',
    name: 'Gamma.io',
    icon: '🪄',
    type: 'bitcoin',
    downloadUrl: 'https://wallet.magiceden.io/',
    isInstalled: () => typeof (window as any).magicEden?.bitcoin !== 'undefined',
    connect: async () => {
      const magicEden = (window as any).magicEden?.bitcoin;
      if (!magicEden) throw new Error('Gamma.io not installed');
      return await magicEden.connect();
    }
  },
  
  // EVM Wallets
  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    type: 'evm',
    downloadUrl: 'https://metamask.io/',
    isInstalled: () => typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isMetaMask,
    connect: async () => {
      const ethereum = (window as any).ethereum;
      if (!ethereum || !ethereum.isMetaMask) throw new Error('MetaMask not installed');
      return await ethereum.request({ method: 'eth_requestAccounts' });
    }
  },
  
  rabby: {
    id: 'rabby',
    name: 'Rabby',
    icon: '🐰',
    type: 'evm',
    downloadUrl: 'https://rabby.io/',
    isInstalled: () => typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isRabby,
    connect: async () => {
      const ethereum = (window as any).ethereum;
      if (!ethereum || !ethereum.isRabby) throw new Error('Rabby not installed');
      return await ethereum.request({ method: 'eth_requestAccounts' });
    }
  },
  
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    type: 'evm',
    downloadUrl: 'https://www.coinbase.com/wallet',
    isInstalled: () => typeof (window as any).ethereum !== 'undefined' && (window as any).ethereum.isCoinbaseWallet,
    connect: async () => {
      const ethereum = (window as any).ethereum;
      if (!ethereum || !ethereum.isCoinbaseWallet) throw new Error('Coinbase Wallet not installed');
      return await ethereum.request({ method: 'eth_requestAccounts' });
    }
  },
  
  // Solana Wallets
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    type: 'solana',
    downloadUrl: 'https://phantom.app/',
    isInstalled: () => typeof (window as any).solana !== 'undefined' && (window as any).solana.isPhantom,
    connect: async () => {
      const solana = (window as any).solana;
      if (!solana || !solana.isPhantom) throw new Error('Phantom not installed');
      return await solana.connect();
    }
  },
  
  solflare: {
    id: 'solflare',
    name: 'Solflare',
    icon: '☀️',
    type: 'solana',
    downloadUrl: 'https://solflare.com/',
    isInstalled: () => typeof (window as any).solflare !== 'undefined',
    connect: async () => {
      const solflare = (window as any).solflare;
      if (!solflare) throw new Error('Solflare not installed');
      return await solflare.connect();
    }
  }
};

/**
 * Network Detection Service
 */
export class NetworkDetectionService {
  static async detectAvailableWallets(): Promise<WalletType[]> {
    const availableWallets: WalletType[] = [];
    
    for (const wallet of Object.values(WALLETS)) {
      try {
        if (wallet.isInstalled()) {
          availableWallets.push(wallet);
        }
      } catch (error) {
      }
    }
    
    return availableWallets;
  }
  
  static async detectCurrentNetwork(): Promise<NetworkConfig | null> {
    try {
      // Check EVM networks first
      if (typeof (window as any).ethereum !== 'undefined') {
        const ethereum = (window as any).ethereum;
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        const chainIdDecimal = parseInt(chainId, 16);
        
        for (const network of Object.values(NETWORKS)) {
          if (network.type === 'evm' && network.chainId === chainIdDecimal) {
            return network;
          }
        }
        
        // Default to Ethereum if connected to EVM but unknown chain
        return NETWORKS.ethereum;
      }
      
      // Check Solana
      if (typeof (window as any).solana !== 'undefined') {
        return NETWORKS.solana;
      }
      
      // Default to Bitcoin if no other chains detected
      return NETWORKS.bitcoin;
      
    } catch (error) {
      return null;
    }
  }
  
  static getWalletsForNetwork(networkId: string): WalletType[] {
    const network = NETWORKS[networkId];
    if (!network) return [];

    return network.supportedWallets
      .map(walletId => WALLETS[walletId])
      .filter((wallet): wallet is WalletType => wallet !== undefined);
  }
  
  static getNetworksForAsset(assetSymbol: string): NetworkConfig[] {
    const assetToNetworks: Record<string, string[]> = {
      'BTC': ['bitcoin'],
      'ETH': ['ethereum', 'arbitrum', 'optimism', 'base'],
      'MATIC': ['polygon'],
      'SOL': ['solana'],
      'USDC': ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'solana'],
      'USDT': ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'solana']
    };
    
    const networkIds = assetToNetworks[assetSymbol] || [];
    return networkIds.map(id => NETWORKS[id]).filter(Boolean);
  }
  
  static async switchEVMNetwork(chainId: number): Promise<boolean> {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return false;
      
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      
      return true;
    } catch (error: any) {
      // If network doesn't exist, try to add it
      if (error.code === 4902) {
        return await this.addEVMNetwork(chainId);
      }
      throw error;
    }
  }
  
  static async addEVMNetwork(chainId: number): Promise<boolean> {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return false;
      
      const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
      if (!network || network.type !== 'evm') return false;
      
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${chainId.toString(16)}`,
          chainName: network.name,
          nativeCurrency: network.nativeCurrency,
          rpcUrls: network.rpcUrls,
          blockExplorerUrls: network.blockExplorerUrls
        }],
      });
      
      return true;
    } catch (error) {
      console.error('Error adding network:', error);
      return false;
    }
  }
}

/**
 * Asset to wallet mapping for Quick Trade
 */
export const ASSET_WALLET_MAPPING: Record<string, { networks: string[], preferredWallets: string[] }> = {
  'BTC': {
    networks: ['bitcoin'],
    preferredWallets: ['unisat', 'xverse', 'oyl']
  },
  'ETH': {
    networks: ['ethereum', 'arbitrum', 'optimism', 'base'],
    preferredWallets: ['metamask', 'rabby', 'coinbase']
  },
  'SOL': {
    networks: ['solana'],
    preferredWallets: ['phantom', 'solflare']
  },
  'USDC': {
    networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'solana'],
    preferredWallets: ['metamask', 'rabby', 'phantom']
  },
  'USDT': {
    networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'],
    preferredWallets: ['metamask', 'rabby', 'coinbase']
  },
  'MATIC': {
    networks: ['polygon'],
    preferredWallets: ['metamask', 'rabby', 'coinbase']
  }
};

export default NetworkDetectionService;