/**
 * CYPHER V3 - Fee Wallet Addresses
 *
 * Centralized configuration for all fee collection wallets across chains.
 * These are the REAL wallet addresses that receive platform fees from swaps.
 *
 * Fee collection methods (NO smart contracts needed):
 * - Solana: Jupiter platformFeeBps (native fee deduction)
 * - EVM: 1inch referrer / Paraswap partner / Universal Router PAY_PORTION
 * - Bitcoin: Extra PSBT output
 * - THORChain: Affiliate fee (native to THORChain protocol)
 */

export const CYPHER_FEE_WALLETS = {
  /** EVM Networks: Ethereum, Arbitrum, Base, Optimism, Polygon, BSC, Avalanche */
  evm: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',

  /** Solana Network: Jupiter, Raydium, Orca */
  solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH',

  /** Bitcoin Network: Ordinals, Runes, BRC-20 */
  bitcoin: '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb',
} as const;

export type FeeChain = keyof typeof CYPHER_FEE_WALLETS;

/**
 * Global fee configuration
 */
export const CYPHER_FEE_CONFIG = {
  /** Default swap fee: 0.3% (30 basis points) */
  swapFeePercent: 0.003,

  /** Default swap fee in basis points */
  swapFeeBps: 30,

  /** THORChain affiliate fee: 0.5% (50 basis points) - THORChain standard */
  thorchainAffiliateBps: 50,

  /** Jupiter platform fee: 0.35% (35 basis points) */
  jupiterPlatformBps: 35,

  /** Bitcoin PSBT fee: 0.35% (35 basis points) */
  bitcoinFeeBps: 35,

  /** Minimum fee in USD */
  minFeeUSD: 0.01,

  /** Maximum fee in USD (cap) */
  maxFeeUSD: 500,

  /** Bitcoin dust limit in sats (minimum valid output) */
  bitcoinDustLimitSats: 546,

  /** Enable referral programs for additional revenue */
  referralEnabled: true,

  /** Premium users (YHP holders) pay 0% fees */
  premiumFeePercent: 0,
} as const;

/**
 * Get the fee wallet address for a given chain
 */
export function getFeeWalletForChain(chain: string): string {
  const chainLower = chain.toLowerCase();

  if (chainLower === 'solana' || chainLower === 'sol') {
    return CYPHER_FEE_WALLETS.solana;
  }

  if (chainLower === 'bitcoin' || chainLower === 'btc') {
    return CYPHER_FEE_WALLETS.bitcoin;
  }

  // All EVM chains (ethereum, arbitrum, base, optimism, polygon, bsc, avalanche)
  return CYPHER_FEE_WALLETS.evm;
}

/**
 * Get fee BPS based on protocol and premium status
 */
export function getFeeBps(protocol: 'thorchain' | 'jupiter' | 'evm' | 'bitcoin', isPremium: boolean): number {
  if (isPremium) return 0;

  switch (protocol) {
    case 'thorchain':
      return CYPHER_FEE_CONFIG.thorchainAffiliateBps;
    case 'jupiter':
      return CYPHER_FEE_CONFIG.jupiterPlatformBps;
    case 'bitcoin':
      return CYPHER_FEE_CONFIG.bitcoinFeeBps;
    case 'evm':
    default:
      return CYPHER_FEE_CONFIG.swapFeeBps;
  }
}
