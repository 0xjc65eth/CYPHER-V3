/**
 * GET /api/subscription/status?wallet=ADDRESS
 * Returns the current subscription status and features for a wallet/user.
 * Checks BTCPay user_subscriptions table (primary) and falls back to
 * legacy dbService for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter'
import { SUBSCRIPTION_TIERS, normalizeTier, type SubscriptionTier } from '@/lib/stripe/config'
import { getSupabaseServiceClient } from '@/lib/database/supabase-client'

const FREE_RESPONSE = {
  tier: 'free' as SubscriptionTier,
  status: 'active',
  features: SUBSCRIPTION_TIERS.free.features,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isActive: true,
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing required query parameter: wallet' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // Try to find user by wallet address in the users table
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single()

    if (!user?.id) {
      return NextResponse.json(FREE_RESPONSE, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
      })
    }

    // Query BTCPay user_subscriptions table
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan, status, expires_at')
      .eq('user_id', user.id)
      .single()

    if (!subscription || subscription.plan === 'free') {
      return NextResponse.json(FREE_RESPONSE, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
      })
    }

    // Check if subscription has expired
    const isExpired = subscription.expires_at
      ? new Date(subscription.expires_at) < new Date()
      : false

    const effectiveStatus = isExpired ? 'expired' : subscription.status
    const isActive = effectiveStatus === 'active'

    const tier = normalizeTier(subscription.plan)
    const tierConfig = SUBSCRIPTION_TIERS[tier]

    return NextResponse.json(
      {
        tier,
        status: effectiveStatus,
        features: tierConfig.features,
        currentPeriodEnd: subscription.expires_at || null,
        cancelAtPeriodEnd: false,
        isActive,
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
      }
    )
  } catch (error) {
    console.error('[API] subscription/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription status' }, { status: 500 })
  }
}
