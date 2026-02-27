/**
 * POST /api/subscription/cancel
 * Cancels an active subscription at period end.
 */

import { NextResponse } from 'next/server'
import { dbService } from '@/lib/database/db-service'
import { cancelSubscription } from '@/lib/stripe/stripe-service'

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

    // Find active subscription for this wallet
    const subscription = await dbService.getActiveSubscriptionByWallet(walletAddress)

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found for this wallet' },
        { status: 404 }
      )
    }

    // Cancel at period end (user keeps access until current period expires)
    await cancelSubscription(subscription.stripe_subscription_id, true)

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
    })
  } catch (error) {
    console.error('[API] subscription/cancel error:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
