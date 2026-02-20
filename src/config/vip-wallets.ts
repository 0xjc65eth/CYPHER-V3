/**
 * VIP / Whitelisted Bitcoin Wallets Configuration
 *
 * These wallets receive special access tiers regardless of NFT holdings.
 * - FULL_ACCESS: 0% fees + premium features
 * - SUPER_ADMIN: maximum privileges (admin panel, system controls)
 */

export const VIP_WALLETS = {
  FULL_ACCESS: (process.env.VIP_WALLETS_FULL_ACCESS || '')
    .split(',')
    .map(a => a.trim())
    .filter(Boolean),
  SUPER_ADMIN: process.env.VIP_WALLET_SUPER_ADMIN || '',
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
