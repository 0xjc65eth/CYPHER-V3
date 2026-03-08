'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type SubscriptionTier,
  SUBSCRIPTION_TIERS,
  FEATURE_TIER_MAP,
} from '@/lib/stripe/config'

interface UpgradePromptProps {
  requiredTier?: SubscriptionTier
  requiredFeature?: string
}

export function UpgradePrompt({ requiredTier, requiredFeature }: UpgradePromptProps) {
  const router = useRouter()

  // Determine the target tier
  const targetTier: SubscriptionTier = requiredTier
    || (requiredFeature ? FEATURE_TIER_MAP[requiredFeature] || 'explorer' : 'explorer')

  const tierConfig = SUBSCRIPTION_TIERS[targetTier]

  // Human-readable feature name
  const featureLabel = requiredFeature
    ? requiredFeature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null

  return (
    <div className="p-6 border border-[#F7931A]/20 rounded-lg bg-[#0a0a14] text-center font-mono">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-[#F7931A]/10 border border-[#F7931A]/20 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-[#F7931A]" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">Upgrade Required</h3>

      <p className="text-sm text-white/50 mb-4 max-w-sm mx-auto">
        {featureLabel
          ? `The "${featureLabel}" feature requires the ${tierConfig.name} plan or higher.`
          : `This content requires the ${tierConfig.name} plan or higher.`}
      </p>

      <div className="inline-block bg-[#121212] border border-[#1a1a2e] rounded-lg px-4 py-3 mb-5">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{tierConfig.name} Plan</p>
        <p className="text-2xl font-bold text-[#F7931A]">
          ${tierConfig.price}<span className="text-sm text-white/40 font-normal">/mo</span>
        </p>
      </div>

      <div className="mb-5">
        <p className="text-xs text-white/30 mb-2">Includes:</p>
        <ul className="text-xs text-white/50 space-y-1">
          {tierConfig.features.slice(0, 4).map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
          {tierConfig.features.length > 4 && (
            <li className="text-[#F7931A]/60">+{tierConfig.features.length - 4} more features</li>
          )}
        </ul>
      </div>

      <button
        onClick={() => router.push('/pricing')}
        className="px-6 py-2.5 bg-[#F7931A] text-black text-sm font-bold rounded-lg hover:bg-[#F7931A]/90 transition-colors"
      >
        Upgrade Now
      </button>
    </div>
  )
}
