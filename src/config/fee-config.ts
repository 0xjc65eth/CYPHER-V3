/**
 * Fee Configuration for CYPHER V3
 * Central fee constants for all swap protocols.
 * Premium (YHP holders) get 0% fees as a membership perk.
 *
 * Fee collection is NATIVE to each protocol:
 * - THORChain: affiliate fee deducted from output, sent to affiliate address
 * - Jupiter: platformFeeBps deducted from output, sent to feeAccount
 * - 1inch: referrer fee deducted from output, sent to referrerAddress
 * - Paraswap: partner fee deducted from output, sent to partnerAddress
 * - Gamma.io: fee output added to PSBT, paid by buyer
 */

import { FEE_RECIPIENTS } from './feeRecipients';

// ============================================================================
// THORChain Configuration
// ============================================================================

export const STANDARD_AFFILIATE_BPS = 50; // 0.5%
export const PREMIUM_AFFILIATE_BPS = 0;   // 0% for YHP holders
export const AFFILIATE_CODE = process.env.THORCHAIN_AFFILIATE_CODE || 'cy';
export const AFFILIATE_ADDRESS = process.env.THORCHAIN_AFFILIATE_ADDRESS || FEE_RECIPIENTS.BITCOIN;

// ============================================================================
// Jupiter/Solana Configuration
// ============================================================================

export const JUPITER_PLATFORM_FEE_BPS = 35; // 0.35%
export const JUPITER_FEE_ACCOUNT = FEE_RECIPIENTS.SOLANA;

// ============================================================================
// EVM DEX Configuration (1inch, Paraswap)
// ============================================================================

export const STANDARD_DEX_FEE_RATE = 0.003; // 0.3%
export const PREMIUM_DEX_FEE_RATE = 0;      // 0% for YHP holders
export const EVM_FEE_WALLET = FEE_RECIPIENTS.EVM;

// 1inch referrer config
export const ONEINCH_REFERRER_ADDRESS = FEE_RECIPIENTS.EVM;
export const ONEINCH_FEE_PERCENT = 0.3; // 0.3% (passed as percentage to 1inch API)

// Paraswap partner config
export const PARASWAP_PARTNER = 'cypher';
export const PARASWAP_PARTNER_ADDRESS = FEE_RECIPIENTS.EVM;
export const PARASWAP_PARTNER_FEE_BPS = 30; // 0.3%

// ============================================================================
// Bitcoin/Gamma.io Configuration
// ============================================================================

export const BITCOIN_FEE_ADDRESS = FEE_RECIPIENTS.BITCOIN;
export const BITCOIN_FEE_BPS = 35; // 0.35%
export const BITCOIN_DUST_LIMIT = 546; // Minimum sats for a valid output

// ============================================================================
// Global Settings
// ============================================================================

export const MAX_FEE_USD = 100;
export const MIN_FEE_USD = 0.01;

// ============================================================================
// Helper Functions
// ============================================================================

/** Returns the affiliate BPS to use for THORChain swaps */
export function getAffiliateBps(isPremium: boolean): number {
  return isPremium ? PREMIUM_AFFILIATE_BPS : STANDARD_AFFILIATE_BPS;
}

/** Returns the fee rate to use for DEX aggregator swaps */
export function getDexFeeRate(isPremium: boolean): number {
  return isPremium ? PREMIUM_DEX_FEE_RATE : STANDARD_DEX_FEE_RATE;
}

/** Returns Jupiter platform fee BPS */
export function getJupiterFeeBps(isPremium: boolean): number {
  return isPremium ? 0 : JUPITER_PLATFORM_FEE_BPS;
}

/** Returns 1inch referrer fee percentage */
export function get1inchFeePercent(isPremium: boolean): number {
  return isPremium ? 0 : ONEINCH_FEE_PERCENT;
}

/** Returns Paraswap partner fee BPS */
export function getParaswapFeeBps(isPremium: boolean): number {
  return isPremium ? 0 : PARASWAP_PARTNER_FEE_BPS;
}

/** Returns Bitcoin fee in sats for a given trade amount */
export function getBitcoinFeeSats(tradeAmountSats: number, isPremium: boolean): number {
  if (isPremium) return 0;
  return Math.max(BITCOIN_DUST_LIMIT, Math.floor(tradeAmountSats * BITCOIN_FEE_BPS / 10000));
}
