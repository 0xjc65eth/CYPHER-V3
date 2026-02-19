/**
 * VIP / Whitelisted Bitcoin Wallets Configuration
 *
 * These wallets receive special access tiers regardless of NFT holdings.
 * - FULL_ACCESS: 0% fees + premium features
 * - SUPER_ADMIN: maximum privileges (admin panel, system controls)
 */

export const VIP_WALLETS = {
  FULL_ACCESS: [
    'bc1pe5nke262wwvpmg3f9w9a0huwg30cculrnjysd3yrmvew3wgc6ydsqr0t98',
    'bc1pm2cm5erm245jkwtdl64medqd4utf32m4y9m8qkcfpg37jgqw8rxq9d3kn9',
  ] as string[],
  SUPER_ADMIN: 'bc1pp546x6uxwl5vjtw3h4rjaj8pcr8ny688ax5jf4ygng73csa2jd3sengvuy',
}

export type AccessTier = 'free' | 'premium' | 'vip' | 'super_admin'

/** Determine the access tier for a Bitcoin wallet address. */
export function getWalletAccessTier(btcAddress: string | null): AccessTier {
  if (!btcAddress) return 'free'
  if (isSuperAdmin(btcAddress)) return 'super_admin'
  if (isVIPWallet(btcAddress)) return 'vip'
  return 'free'
}

/** Check if a Bitcoin address is in the VIP full-access list. */
export function isVIPWallet(address: string): boolean {
  return (
    VIP_WALLETS.FULL_ACCESS.includes(address) ||
    address === VIP_WALLETS.SUPER_ADMIN
  )
}

/** Check if a Bitcoin address is the super-admin wallet. */
export function isSuperAdmin(address: string): boolean {
  return address === VIP_WALLETS.SUPER_ADMIN
}

/** Returns true when the tier grants premium benefits (0% fees). */
export function hasPremiumAccess(tier: AccessTier): boolean {
  return tier === 'premium' || tier === 'vip' || tier === 'super_admin'
}
