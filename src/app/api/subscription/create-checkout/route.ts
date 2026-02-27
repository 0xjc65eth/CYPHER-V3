/**
 * POST /api/subscription/create-checkout
 * Creates a Stripe Checkout Session for subscription purchase.
 */

import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe/stripe-service'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/config'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress, tier, email } = body as {
      walletAddress: string
      tier: SubscriptionTier
      email?: string
    }

    // Validate required fields
    if (!walletAddress || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress and tier' },
        { status: 400 }
      )
    }

    // Validate tier exists and is not free
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Cannot create checkout session for the free tier' },
        { status: 400 }
      )
    }

    if (!SUBSCRIPTION_TIERS[tier]) {
      return NextResponse.json(
        { error: `Invalid subscription tier: ${tier}` },
        { status: 400 }
      )
    }

    // Build URLs from request origin
    const origin = new URL(request.url).origin
    const successUrl = `${origin}/settings?tab=subscription&checkout=success`
    const cancelUrl = `${origin}/pricing?checkout=canceled`

    const session = await createCheckoutSession({
      walletAddress,
      tier,
      email,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[API] create-checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
