/**
 * Fee Configuration for CYPHER V3
 * Central fee constants for THORChain affiliate fees and DEX aggregator fees.
 * Premium (YHP holders) get 0% fees as a membership perk.
 */

// THORChain affiliate fee in basis points
export const STANDARD_AFFILIATE_BPS = 50; // 0.5%
export const PREMIUM_AFFILIATE_BPS = 0;   // 0% for YHP holders

// DEX aggregator fee rate
export const STANDARD_DEX_FEE_RATE = 0.003; // 0.3%
export const PREMIUM_DEX_FEE_RATE = 0;      // 0% for YHP holders

// Affiliate code registered with THORChain
export const AFFILIATE_CODE = 'cy';

// Max fee cap in USD
export const MAX_FEE_USD = 100;

/** Returns the affiliate BPS to use for THORChain swaps */
export function getAffiliateBps(isPremium: boolean): number {
  return isPremium ? PREMIUM_AFFILIATE_BPS : STANDARD_AFFILIATE_BPS;
}

/** Returns the fee rate to use for DEX aggregator swaps */
export function getDexFeeRate(isPremium: boolean): number {
  return isPremium ? PREMIUM_DEX_FEE_RATE : STANDARD_DEX_FEE_RATE;
}
