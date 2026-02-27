'use client'

import { type SubscriptionTier, SUBSCRIPTION_TIERS } from '@/lib/stripe/config'

interface TierBadgeProps {
  tier: SubscriptionTier
  size?: 'sm' | 'md'
}

const TIER_STYLES: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  explorer: 'bg-[#3B82F6]/10 border-[#3B82F6]/20 text-[#3B82F6]',
  trader: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20 text-[#8B5CF6]',
  hacker_yields: 'bg-gradient-to-r from-[#F7931A]/10 to-[#FBBF24]/10 border-[#F7931A]/30 text-[#F7931A]',
}

export function TierBadge({ tier, size = 'sm' }: TierBadgeProps) {
  const tierConfig = SUBSCRIPTION_TIERS[tier]
  const style = TIER_STYLES[tier]

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
