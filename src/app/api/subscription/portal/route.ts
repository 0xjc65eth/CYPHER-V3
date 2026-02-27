/**
 * POST /api/subscription/portal
 * Creates a Stripe Billing Portal session for customer self-service.
 */

import { NextResponse } from 'next/server'
import { dbService } from '@/lib/database/db-service'
import { createBillingPortalSession } from '@/lib/stripe/stripe-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress } = body as { walletAddress: string }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing required field: walletAddress' },
        { status: 400 }
      )
    }

    // Find user to get their Stripe customer ID
    const user = await dbService.getUserByWallet(walletAddress)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this wallet' },
        { status: 404 }
      )
    }

    const stripeCustomerId = (user.metadata as Record<string, string>)?.stripe_customer_id
      || (user as Record<string, unknown>).stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer associated with this wallet. Subscribe first.' },
        { status: 404 }
      )
    }

    const origin = new URL(request.url).origin
    const returnUrl = `${origin}/settings?tab=subscription`

    const session = await createBillingPortalSession(stripeCustomerId, returnUrl)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[API] subscription/portal error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create billing portal session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
