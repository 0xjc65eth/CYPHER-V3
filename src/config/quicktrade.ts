// Re-export fee utilities from feeRecipients for convenience
export { calculateServiceFee, FEE_CONFIG } from './feeRecipients';

export const QUICKTRADE_CONFIG = {
  SERVICE_FEE: 0.0034, // 0.34% service fee
  MIN_TRANSACTION_USD: 10,
  MAX_FEE_USD: 100,
  
  SUPPORTED_CHAINS: {
    ETHEREUM: {
      chainId: 1,
      name: 'Ethereum',
      symbol: 'ETH',
      rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-key',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      }
    },
    ARBITRUM: {
      chainId: 42161,
      name: 'Arbitrum',
      symbol: 'ARB',
      rpcUrl: process.env.NEXT_PUBLIC_ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      }
    },
    OPTIMISM: {
      chainId: 10,
      name: 'Optimism',
      symbol: 'OP',
      rpcUrl: process.env.NEXT_PUBLIC_OP_RPC_URL || 'https://mainnet.optimism.io',
      explorerUrl: 'https://optimistic.etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      }
    },
    POLYGON: {
      chainId: 137,
      name: 'Polygon',
      symbol: 'MATIC',
      rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      }
    },
    BASE: {
      chainId: 8453,
      name: 'Base',
      symbol: 'BASE',
      rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      }
    },
    AVALANCHE: {
      chainId: 43114,
      name: 'Avalanche',
      symbol: 'AVAX',
      rpcUrl: process.env.NEXT_PUBLIC_AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      explorerUrl: 'https://snowtrace.io',
      nativeCurrency: {
        name: 'AVAX',
        symbol: 'AVAX',
        decimals: 18
      }
    },
    BSC: {
      chainId: 56,
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      explorerUrl: 'https://bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      }
    },
    SOLANA: {
      chainId: 'solana',
      name: 'Solana',
      symbol: 'SOL',
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://solscan.io',
      nativeCurrency: {
        name: 'SOL',
        symbol: 'SOL',
        decimals: 9
      }
    }
  },

  SUPPORTED_DEXS: {
    // Ethereum & L2s
    UNISWAP_V2: { name: 'Uniswap V2', chains: [1, 42161, 10, 137, 8453] },
    UNISWAP_V3: { name: 'Uniswap V3', chains: [1, 42161, 10, 137, 8453] },
    SUSHISWAP: { name: 'SushiSwap', chains: [1, 42161, 10, 137, 43114] },
    CURVE: { name: 'Curve', chains: [1, 42161, 10, 137, 43114] },
    BALANCER: { name: 'Balancer', chains: [1, 42161, 10, 137] },
    VELODROME: { name: 'Velodrome', chains: [10] },
    CAMELOT: { name: 'Camelot', chains: [42161] },
    QUICKSWAP: { name: 'QuickSwap', chains: [137] },
    AERODROME: { name: 'Aerodrome', chains: [8453] },
    TRADER_JOE: { name: 'Trader Joe', chains: [43114] },
    PANGOLIN: { name: 'Pangolin', chains: [43114] },
    
    // BSC
    PANCAKESWAP: { name: 'PancakeSwap', chains: [56] },
    BISWAP: { name: 'BiSwap', chains: [56] },
    APESWAP: { name: 'ApeSwap', chains: [56] },
    
    // Solana
    JUPITER: { name: 'Jupiter', chains: ['solana'] },
    ORCA: { name: 'Orca', chains: ['solana'] },
    RAYDIUM: { name: 'Raydium', chains: ['solana'] },
    LIFINITY: { name: 'Lifinity', chains: ['solana'] },
    MARINADE: { name: 'Marinade', chains: ['solana'] },
    METEORA: { name: 'Meteora', chains: ['solana'] },
    PHOENIX: { name: 'Phoenix', chains: ['solana'] }
  },

  API_ENDPOINTS: {
    ANALYZE: '/api/quick-trade/quote',
    PROCESS: '/api/quick-trade/quote',
    MONITOR: '/api/quick-trade/prices',
    REVENUE: '/api/quick-trade/tokens'
  },

  TRANSACTION_SETTINGS: {
    DEFAULT_SLIPPAGE: 0.5, // 0.5%
    MAX_SLIPPAGE: 5, // 5%
    DEFAULT_DEADLINE: 20 * 60, // 20 minutes
    GAS_PRICE_MULTIPLIER: 1.1, // 10% above base
    CONFIDENCE_THRESHOLD: 0.95 // 95% confidence
  },

  MONITORING: {
    UPDATE_INTERVAL: 5000, // 5 seconds
    TRANSACTION_TIMEOUT: 300000, // 5 minutes
    MAX_RETRIES: 3,
    SUCCESS_RATE_TARGET: 0.995 // 99.5%
  }
};

export const DEX_ROUTER_ADDRESSES = {
  UNISWAP_V2: {
    1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    42161: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
    10: '0x4a7b5da61326a6379179b40d00f57e5bbdc962c2',
    137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    8453: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'
  },
  UNISWAP_V3: {
    1: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    42161: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    10: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    137: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    8453: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  SUSHISWAP: {
    1: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    42161: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    10: '0x4C5D5234f232BD2D76B96aA33F5AE4FCF0E4BFAb',
    137: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    43114: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
  },
  PANCAKESWAP: {
    56: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  }
};

export type SupportedChain = keyof typeof QUICKTRADE_CONFIG.SUPPORTED_CHAINS;
export type SupportedDEX = keyof typeof QUICKTRADE_CONFIG.SUPPORTED_DEXS;

// Additional exports needed by components
export const REVENUE_WALLETS = {
  ethereum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  arbitrum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  optimism: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  polygon: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  base: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  avalanche: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  bsc: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH'
};

export const REVENUE_EXAMPLES = [
  {
    id: '1',
    date: '2024-01-15T10:30:00Z',
    chain: 'ethereum',
    amount: 0.125,
    amountUSD: 312.50,
    token: 'ETH',
    txHash: '0x742d35cc6634c0532925a3b844bc456458723eb73e3e3b844bc9e7595f2bd9e',
    type: 'service_fee'
  },
  {
    id: '2',
    date: '2024-01-15T11:15:00Z',
    chain: 'arbitrum',
    amount: 1.25,
    amountUSD: 3125,
    token: 'ETH',
    txHash: '0x987fcdeb21b46e3b844bc9e7595f2bd9e742d35cc6634c0532925a3b844bc456',
    type: 'service_fee'
  },
  {
    id: '3',
    date: '2024-01-15T12:00:00Z',
    chain: 'solana',
    amount: 2.5,
    amountUSD: 275,
    token: 'SOL',
    txHash: '3Km8h1bG7R2pF9dE6A2cC7K1nP8vQ5rL4jS9wX2yT1mN6fH8k3B9vE5dR2pF9dE6',
    type: 'service_fee'
  }
];

// Utility function to get wallet explorer URL
export function getWalletExplorerUrl(chain: string, address: string): string {
  const chainConfig = QUICKTRADE_CONFIG.SUPPORTED_CHAINS[chain.toUpperCase() as keyof typeof QUICKTRADE_CONFIG.SUPPORTED_CHAINS];
  if (!chainConfig) return '#';
  
  return `${chainConfig.explorerUrl}/address/${address}`;
}

// Export supported networks list
export const SUPPORTED_NETWORKS = Object.keys(QUICKTRADE_CONFIG.SUPPORTED_CHAINS).map(key => ({
  id: key.toLowerCase(),
  name: QUICKTRADE_CONFIG.SUPPORTED_CHAINS[key as keyof typeof QUICKTRADE_CONFIG.SUPPORTED_CHAINS].name,
  symbol: QUICKTRADE_CONFIG.SUPPORTED_CHAINS[key as keyof typeof QUICKTRADE_CONFIG.SUPPORTED_CHAINS].symbol,
  chainId: QUICKTRADE_CONFIG.SUPPORTED_CHAINS[key as keyof typeof QUICKTRADE_CONFIG.SUPPORTED_CHAINS].chainId,
  explorerUrl: QUICKTRADE_CONFIG.SUPPORTED_CHAINS[key as keyof typeof QUICKTRADE_CONFIG.SUPPORTED_CHAINS].explorerUrl
}));