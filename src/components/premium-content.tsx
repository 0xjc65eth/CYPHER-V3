'use client'

import { RiLockLine, RiShieldCheckLine, RiVipCrownLine } from 'react-icons/ri'
import { usePremium } from '@/contexts/PremiumContext'
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'
import { getWalletAccessTier, hasPremiumAccess } from '@/config/vip-wallets'
import { type SubscriptionTier, tierHasAccess, tierHasFeature } from '@/lib/stripe/config'
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt'

interface PremiumContentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  /** If set, checks if user's subscription tier meets this level */
  requiredTier?: SubscriptionTier
  /** If set, checks if user's tier includes this specific feature */
  requiredFeature?: string
}

export function PremiumContent({ children, fallback, requiredTier, requiredFeature }: PremiumContentProps) {
  const { connected, address } = useLaserEyes()
  const { isPremium, isVerifying, accessTier, subscriptionTier, hasFeature, ethAddress } = usePremium()

  // Derive effective premium from both context and direct BTC VIP check
  const btcTier = getWalletAccessTier(connected ? (address ?? null) : null)
  const effectivePremium = isPremium || hasPremiumAccess(btcTier)
  const effectiveTier = btcTier !== 'free' ? btcTier : accessTier

  // If wallet is not connected and a specific tier or feature is required, deny access.
  // This prevents stale localStorage from granting premium to disconnected users.
  // Check both BTC (LaserEyes) and ETH wallet — either satisfies the requirement.
  const walletRequired = requiredTier !== undefined || requiredFeature !== undefined
  const walletDisconnected = !connected && !ethAddress

  // Subscription-based tier check
  const hasTierAccess = requiredTier ? tierHasAccess(subscriptionTier, requiredTier) : null
  const hasFeatureAccess = requiredFeature ? hasFeature(requiredFeature) : null

  // Default fallback content if none provided
  const defaultFallback = (
    <div className="p-6 border border-[#3D3D3D] rounded-lg bg-[#121212] text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-[#2D2D2D] rounded-full flex items-center justify-center">
          <RiLockLine className="w-6 h-6 text-[#8B5CF6]" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Premium Content Locked</h3>
      <p className="text-gray-400 text-sm mb-4">
        Connect your wallet and verify ownership of premium collections to access this content.
      </p>
    </div>
  )

  if (isVerifying) {
    return (
      <div className="p-6 border border-[#3D3D3D] rounded-lg bg-[#121212] text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-[#2D2D2D] rounded-full flex items-center justify-center animate-pulse">
            <RiLockLine className="w-6 h-6 text-[#8B5CF6]" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Verifying access...</h3>
        <p className="text-gray-400 text-sm mb-4">
          Checking wallet for premium access...
        </p>
      </div>
    )
  }

  // Check if user has subscription-based access (Stripe) regardless of wallet
  // This allows subscribers to access features without connecting a wallet
  const hasSubscriptionBasedAccess = (requiredTier !== undefined && hasTierAccess === true)
    || (requiredFeature !== undefined && hasFeatureAccess === true)

  // If wallet is disconnected and premium features are required,
  // BUT user has subscription access via Stripe → allow through
  if (walletRequired && walletDisconnected && !hasSubscriptionBasedAccess) {
    return fallback || defaultFallback
  }

  // When requiredTier is set, check subscription tier access
  if (requiredTier !== undefined && hasTierAccess === false) {
    return <UpgradePrompt requiredTier={requiredTier} />
  }

  // When requiredFeature is set, check feature access
  if (requiredFeature !== undefined && hasFeatureAccess === false) {
    return <UpgradePrompt requiredFeature={requiredFeature} />
  }

  // When neither is set, use existing isPremium check (backwards compatible)
  if (requiredTier === undefined && requiredFeature === undefined && !effectivePremium) {
    return fallback || defaultFallback
  }

  const isVipOrAdmin = effectiveTier === 'vip' || effectiveTier === 'super_admin'

  return (
    <div className={`premium-content relative border rounded-lg ${
      isVipOrAdmin ? 'border-orange-500/30' : 'border-[#8B5CF6]/30'
    }`}>
      <div className={`premium-badge absolute top-2 right-2 flex items-center px-2 py-1 rounded-md text-xs text-white ${
        effectiveTier === 'super_admin'
          ? 'bg-gradient-to-r from-red-500 to-orange-500'
          : effectiveTier === 'vip'
            ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
            : 'bg-gradient-to-r from-[#8B5CF6] to-[#6366F1]'
      }`}>
        {isVipOrAdmin ? (
          <RiVipCrownLine className="mr-1" />
        ) : (
          <RiShieldCheckLine className="mr-1" />
        )}
        <span>
          {effectiveTier === 'super_admin' ? 'Admin' : effectiveTier === 'vip' ? 'VIP' : 'Premium'}
        </span>
      </div>
      {children}
    </div>
  )
}
