'use client'

import { type SubscriptionTier, SUBSCRIPTION_TIERS, normalizeTier } from '@/lib/stripe/config'

interface TierBadgeProps {
  tier: SubscriptionTier
  size?: 'sm' | 'md'
}

const TIER_STYLES: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  explorer: 'bg-[#3B82F6]/10 border-[#3B82F6]/20 text-[#3B82F6]',
  trader: 'bg-[#FF6B00]/10 border-[#FF6B00]/20 text-[#FF6B00]',
  hacker_yields: 'bg-gradient-to-r from-[#F7931A]/10 to-[#FBBF24]/10 border-[#F7931A]/30 text-[#F7931A]',
}

export function TierBadge({ tier, size = 'sm' }: TierBadgeProps) {
  const normalizedTier = normalizeTier(tier)
  const tierConfig = SUBSCRIPTION_TIERS[normalizedTier]
  const style = TIER_STYLES[normalizedTier] || TIER_STYLES.free

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-3 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider border rounded-full ${style} ${sizeClasses}`}
    >
      {tierConfig.name}
    </span>
  )
}
