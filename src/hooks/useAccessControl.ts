'use client'

import { useMemo } from 'react'
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'
import { usePremium } from '@/contexts/PremiumContext'
import { getWalletAccessTier, hasPremiumAccess, type AccessTier } from '@/config/vip-wallets'

interface AccessControlResult {
  /** Current access tier: free | premium | vip | super_admin */
  accessTier: AccessTier
  /** Whether the user has premium benefits (0% fees) */
  isPremium: boolean
  /** Whether the user has super-admin privileges */
  isSuperAdmin: boolean
  /** Whether any wallet (BTC or ETH) is connected */
  isConnected: boolean
  /** Connected Bitcoin address (from LaserEyes) */
  btcAddress: string | null
  /** Connected ETH address (from PremiumContext) */
  ethAddress: string | null
  /** Whether YHP NFT verification is in progress */
  isVerifying: boolean
}

/**
 * Unified hook that combines Bitcoin wallet (LaserEyes), EVM wallet,
 * YHP NFT verification, and VIP wallet checks into a single access-control result.
 */
export function useAccessControl(): AccessControlResult {
  const { connected: btcConnected, address: btcAddress } = useLaserEyes()
  const { isPremium: yhpPremium, ethAddress, isVerifying, accessTier: contextTier } = usePremium()

  const result = useMemo<AccessControlResult>(() => {
    // Bitcoin VIP tier takes highest priority
    const btcTier = getWalletAccessTier(btcConnected ? (btcAddress ?? null) : null)

    // Determine the effective tier: highest wins
    let effectiveTier: AccessTier = 'free'
    if (contextTier === 'super_admin' || btcTier === 'super_admin') {
      effectiveTier = 'super_admin'
    } else if (contextTier === 'vip' || btcTier === 'vip') {
      effectiveTier = 'vip'
    } else if (contextTier === 'premium' || yhpPremium || btcTier === 'premium') {
      effectiveTier = 'premium'
    }

    return {
      accessTier: effectiveTier,
      isPremium: hasPremiumAccess(effectiveTier),
      isSuperAdmin: effectiveTier === 'super_admin',
      isConnected: btcConnected || !!ethAddress,
      btcAddress: btcConnected ? (btcAddress ?? null) : null,
      ethAddress,
      isVerifying,
    }
  }, [btcConnected, btcAddress, yhpPremium, ethAddress, isVerifying, contextTier])

  return result
}
