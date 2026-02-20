/**
 * Chain configuration for multi-chain wallet support
 * Migrated from @web3modal/ethers to @reown/appkit
 */

// Chain definitions
export const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

export const polygon = {
  chainId: 137,
  name: 'Polygon',
  currency: 'MATIC',
  explorerUrl: 'https://polygonscan.com',
  rpcUrl: 'https://polygon-rpc.com'
};

export const arbitrum = {
  chainId: 42161,
  name: 'Arbitrum',
  currency: 'ETH',
  explorerUrl: 'https://arbiscan.io',
  rpcUrl: 'https://arb1.arbitrum.io/rpc'
};

export const optimism = {
  chainId: 10,
  name: 'Optimism',
  currency: 'ETH',
  explorerUrl: 'https://optimistic.etherscan.io',
  rpcUrl: 'https://mainnet.optimism.io'
};

export const base = {
  chainId: 8453,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org'
};

export const avalanche = {
  chainId: 43114,
  name: 'Avalanche',
  currency: 'AVAX',
  explorerUrl: 'https://snowtrace.io',
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc'
};

export const bsc = {
  chainId: 56,
  name: 'BNB Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org'
};

// Export supported chain configurations for components
export const SUPPORTED_EVM_CHAINS = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } },
    blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } }
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: { default: { http: ['https://polygon-rpc.com'] } },
    blockExplorers: { default: { name: 'Polygonscan', url: 'https://polygonscan.com' } }
  },
  {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } },
    blockExplorers: { default: { name: 'Arbiscan', url: 'https://arbiscan.io' } }
  },
  {
    id: 10,
    name: 'Optimism',
    symbol: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.optimism.io'] } },
    blockExplorers: { default: { name: 'Optimistic Etherscan', url: 'https://optimistic.etherscan.io' } }
  },
  {
    id: 8453,
    name: 'Base',
    symbol: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
    blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } }
  },
  {
    id: 43114,
    name: 'Avalanche',
    symbol: 'AVAX',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: { default: { http: ['https://api.avax.network/ext/bc/C/rpc'] } },
    blockExplorers: { default: { name: 'Snowtrace', url: 'https://snowtrace.io' } }
  },
  {
    id: 56,
    name: 'BSC',
    symbol: 'BNB',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org'] } },
    blockExplorers: { default: { name: 'BscScan', url: 'https://bscscan.com' } }
  }
];

export const SUPPORTED_SOLANA_CHAINS = [
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    rpcUrls: { default: { http: ['https://api.mainnet-beta.solana.com'] } },
    blockExplorers: { default: { name: 'Solscan', url: 'https://solscan.io' } }
  }
];
