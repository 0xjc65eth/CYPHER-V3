/**
 * VIP / Whitelisted Bitcoin Wallets Configuration
 *
 * These wallets receive special access tiers regardless of NFT holdings.
 * - FULL_ACCESS: 0% fees + premium features (same benefits as YHP holders)
 *
 * ============================================================
 *  CRYPTOB_ VOCE E FODA E VOCE E A INSPIRACAO DO CYPHER
 * ============================================================
 *
 * Hardcoded Taproot addresses are checked client-side (no env prefix needed).
 * Env vars serve as an additional override for server-side or deployment config.
 */

const HARDCODED_VIP_WALLETS = [
  // CRYPTOB_ - A inspiracao do CYPHER
  'bc1pe5nke262wwvpmg3f9w9a0huwg30cculrnjysd3yrmvew3wgc6ydsqr0t98',
  'bc1pm2cm5erm245jkwtdl64medqd4utf32m4y9m8qkcfpg37jgqw8rxq9d3kn9',
  'bc1pp546x6uxwl5vjtw3h4rjaj8pcr8ny688ax5jf4ygng73csa2jd3sengvuy',
]

/** ETH wallets with full VIP access (owner / team). */
export const VIP_ETH_WALLETS = [
  '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  '0xBaD5B3cc59D5c57dB99DF07fB86C6f1475F0Dae0',
].map(a => a.toLowerCase())

/** Check if an ETH address is a VIP wallet (case-insensitive). */
export function isVIPEthWallet(ethAddress: string | null): boolean {
  if (!ethAddress) return false
  return VIP_ETH_WALLETS.includes(ethAddress.toLowerCase())
}

const envVipWallets = (
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_VIP_WALLETS_FULL_ACCESS) || ''
).split(',').map(a => a.trim()).filter(Boolean)

export const VIP_WALLETS = {
  FULL_ACCESS: [...HARDCODED_VIP_WALLETS, ...envVipWallets],
}

export type AccessTier = 'free' | 'premium' | 'vip' | 'super_admin'

/** Determine the access tier for a Bitcoin wallet address. */
export function getWalletAccessTier(btcAddress: string | null): AccessTier {
  if (!btcAddress) return 'free'
  if (isVIPWallet(btcAddress)) return 'vip'
  return 'free'
}

/** Check if a Bitcoin address is in the VIP full-access list. */
export function isVIPWallet(address: string): boolean {
  return VIP_WALLETS.FULL_ACCESS.includes(address)
}

/** CEO / Dev wallet — full super_admin access on both BTC and ETH. */
const SUPER_ADMIN_ETH = [
  '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  '0xBaD5B3cc59D5c57dB99DF07fB86C6f1475F0Dae0',
].map(a => a.toLowerCase())

export function isSuperAdmin(address: string): boolean {
  return SUPER_ADMIN_ETH.includes(address.toLowerCase())
}

/** Returns true when the tier grants premium benefits (0% fees). */
export function hasPremiumAccess(tier: AccessTier): boolean {
  return tier === 'premium' || tier === 'vip' || tier === 'super_admin'
}
