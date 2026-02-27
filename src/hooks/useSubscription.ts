'use client'

import { usePremium } from '@/contexts/PremiumContext'
import { type SubscriptionTier, tierHasAccess } from '@/lib/stripe/config'

/**
 * Convenience hook for subscription-related state.
 * Wraps usePremium and exposes only subscription fields.
 */
export function useSubscription() {
  const {
    subscriptionTier,
    subscriptionStatus,
    isSubscriptionActive,
    subscriptionEndDate,
    hasFeature,
  } = usePremium()

  const canAccess = (requiredTier: SubscriptionTier): boolean => {
    return tierHasAccess(subscriptionTier, requiredTier)
  }

  return {
    tier: subscriptionTier,
    status: subscriptionStatus,
    isActive: isSubscriptionActive,
    hasFeature,
    canAccess,
    endDate: subscriptionEndDate,
  }
}
