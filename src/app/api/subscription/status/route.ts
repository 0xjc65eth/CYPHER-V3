/**
 * GET /api/subscription/status?wallet=ADDRESS
 * Returns the current subscription status and features for a wallet.
 */

import { NextResponse } from 'next/server'
import { dbService } from '@/lib/database/db-service'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/config'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing required query parameter: wallet' },
        { status: 400 }
      )
    }

    // Fetch user and active subscription
    const [user, subscription] = await Promise.all([
      dbService.getUserByWallet(wallet),
      dbService.getActiveSubscriptionByWallet(wallet),
    ])

    // Default to free tier if no subscription found
    if (!subscription) {
      const freeTier = SUBSCRIPTION_TIERS.free
      return NextResponse.json(
        {
          tier: 'free' as SubscriptionTier,
          status: 'active',
          features: freeTier.features,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          isActive: true,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
          },
        }
      )
    }

    const tier = (subscription.tier || 'free') as SubscriptionTier
    const tierConfig = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.free
    const isActive = subscription.status === 'active' || subscription.status === 'trialing'

    return NextResponse.json(
      {
        tier,
        status: subscription.status,
        features: tierConfig.features,
        currentPeriodEnd: subscription.current_period_end || null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        isActive,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    console.error('[API] subscription/status error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
