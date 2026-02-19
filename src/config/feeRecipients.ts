/**
 * FEE_RECIPIENTS - Re-exported from feeWallets.ts (single source of truth)
 * All wallet addresses are centralized in feeWallets.ts to avoid duplication.
 */
import { CYPHER_FEE_WALLETS, CYPHER_FEE_CONFIG } from './feeWallets';

export const FEE_RECIPIENTS = {
  EVM: CYPHER_FEE_WALLETS.evm,
  SOLANA: CYPHER_FEE_WALLETS.solana,
  BITCOIN: CYPHER_FEE_WALLETS.bitcoin,
};

export const REVENUE_MONITORING = {
  // Admin wallets that can access revenue dashboard
  ADMIN_WALLETS: [
    '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3', // Primary admin
  ],
  
  // Revenue distribution (for future implementation)
  DISTRIBUTION: {
    DEVELOPMENT: 0.4,    // 40% for development
    OPERATIONS: 0.3,     // 30% for operations
    MARKETING: 0.2,      // 20% for marketing
    RESERVES: 0.1        // 10% for reserves
  },
  
  // Minimum withdrawal amounts
  MIN_WITHDRAWAL: {
    ETH: 0.1,
    MATIC: 100,
    BNB: 0.5,
    AVAX: 5,
    SOL: 1
  }
};

export const FEE_COLLECTION_CONFIG = {
  // Smart contract addresses for fee collection (if using smart contracts)
  CONTRACTS: {
    ETHEREUM: process.env.NEXT_PUBLIC_FEE_COLLECTOR_ETH || '',
    ARBITRUM: process.env.NEXT_PUBLIC_FEE_COLLECTOR_ARB || '',
    OPTIMISM: process.env.NEXT_PUBLIC_FEE_COLLECTOR_OP || '',
    POLYGON: process.env.NEXT_PUBLIC_FEE_COLLECTOR_POLYGON || '',
    BASE: process.env.NEXT_PUBLIC_FEE_COLLECTOR_BASE || '',
    AVALANCHE: process.env.NEXT_PUBLIC_FEE_COLLECTOR_AVAX || '',
    BSC: process.env.NEXT_PUBLIC_FEE_COLLECTOR_BSC || ''
  },
  
  // Fee collection methods
  METHODS: {
    DIRECT: 'direct',           // Direct transfer to wallet
    CONTRACT: 'contract',       // Via smart contract
    RELAYER: 'relayer'         // Via meta-transaction relayer
  },
  
  // Default method per chain
  DEFAULT_METHOD: {
    1: 'direct',        // Ethereum
    42161: 'direct',    // Arbitrum
    10: 'direct',       // Optimism
    137: 'direct',      // Polygon
    8453: 'direct',     // Base
    43114: 'direct',    // Avalanche
    56: 'direct',       // BSC
    'solana': 'direct'  // Solana
  }
};

// Re-exported from centralized config to maintain backward compatibility
export const FEE_PERCENTAGE = CYPHER_FEE_CONFIG.swapFeePercent; // 0.3% (30 bps)
export const MAX_FEE_USD = CYPHER_FEE_CONFIG.maxFeeUSD; // $500

export const FEE_CONFIG = {
  percentage: CYPHER_FEE_CONFIG.swapFeePercent,
  maxFeeUSD: CYPHER_FEE_CONFIG.maxFeeUSD,
  minFeeUSD: CYPHER_FEE_CONFIG.minFeeUSD,
};

// Wallet addresses derived from centralized config (single source of truth)
export const WALLET_ADDRESSES = {
  ethereum: CYPHER_FEE_WALLETS.evm,
  arbitrum: CYPHER_FEE_WALLETS.evm,
  optimism: CYPHER_FEE_WALLETS.evm,
  polygon: CYPHER_FEE_WALLETS.evm,
  base: CYPHER_FEE_WALLETS.evm,
  avalanche: CYPHER_FEE_WALLETS.evm,
  bsc: CYPHER_FEE_WALLETS.evm,
  solana: CYPHER_FEE_WALLETS.solana,
  bitcoin: CYPHER_FEE_WALLETS.bitcoin,
};

// Fee calculation function (uses centralized config values)
export function calculateServiceFee(tradeAmount: number, tokenPrice: number = 1): {
  feeAmount: number;
  feeUSD: number;
  feePercentage: number;
  isCapped: boolean;
} {
  const tradeValueUSD = tradeAmount * tokenPrice;
  const calculatedFeeUSD = tradeValueUSD * CYPHER_FEE_CONFIG.swapFeePercent;

  // Apply minimum and maximum fee caps from centralized config
  let finalFeeUSD = Math.max(calculatedFeeUSD, CYPHER_FEE_CONFIG.minFeeUSD);
  const isCapped = finalFeeUSD > CYPHER_FEE_CONFIG.maxFeeUSD;
  finalFeeUSD = Math.min(finalFeeUSD, CYPHER_FEE_CONFIG.maxFeeUSD);

  const feeAmount = tokenPrice > 0 ? finalFeeUSD / tokenPrice : 0;
  const actualFeePercentage = tradeValueUSD > 0 ? (finalFeeUSD / tradeValueUSD) * 100 : 0;

  return {
    feeAmount,
    feeUSD: finalFeeUSD,
    feePercentage: actualFeePercentage,
    isCapped
  };
}

// Address formatting utility
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Generate swap deeplink for wallet connections
export function generateSwapDeeplink(params: {
  fromToken?: string;
  toToken?: string;
  fromChain?: string;
  toChain?: string;
  amount?: string;
}): string {
  const baseUrl = 'https://app.uniswap.org/#/swap';
  const searchParams = new URLSearchParams();
  
  if (params.fromToken) searchParams.set('inputCurrency', params.fromToken);
  if (params.toToken) searchParams.set('outputCurrency', params.toToken);
  if (params.amount) searchParams.set('exactAmount', params.amount);
  if (params.fromChain) searchParams.set('chain', params.fromChain);
  
  const query = searchParams.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}