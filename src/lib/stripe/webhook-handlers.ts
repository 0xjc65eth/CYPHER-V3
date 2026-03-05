/**
 * Stripe Webhook Handlers
 * Processes Stripe events and syncs subscription state to the database.
 * Idempotent via stripe_event_id unique constraint.
 */

import Stripe from 'stripe'
import { dbService } from '../database/db-service'
import type { SubscriptionTier } from './config'

/**
 * Handle checkout.session.completed - new subscription created
 */
export async function handleCheckoutComplete(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  const walletAddress = session.metadata?.wallet_address
  const tier = session.metadata?.tier as SubscriptionTier

  if (!walletAddress || !tier) {
    console.error('[Webhook] checkout.session.completed missing wallet_address or tier in metadata')
    return
  }

  const stripeSubscriptionId = session.subscription as string
  const stripeCustomerId = session.customer as string

  // Create subscription record
  await dbService.createSubscription({
    wallet_address: walletAddress,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    tier,
    status: 'active',
    metadata: { checkout_session_id: session.id },
  })

  // Update user tier
  await dbService.updateUserSubscription(walletAddress, {
    subscription_tier: tier,
    subscription_status: 'active',
    stripe_customer_id: stripeCustomerId,
  })

  // Audit trail
  await dbService.insertSubscriptionEvent({
    wallet_address: walletAddress,
    event_type: 'checkout_completed',
    stripe_event_id: event.id,
    data: { tier, stripe_subscription_id: stripeSubscriptionId },
  })

  // Subscription activated
}

/**
 * Handle customer.subscription.updated - status/tier changes
 */
export async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  const walletAddress = subscription.metadata?.wallet_address
  const tier = subscription.metadata?.tier as SubscriptionTier

  if (!walletAddress) {
    console.error('[Webhook] subscription.updated missing wallet_address in metadata')
    return
  }

  const status = subscription.status as string
  const periodStart = (subscription as any).current_period_start
    ? new Date((subscription as any).current_period_start * 1000).toISOString()
    : undefined
  const periodEnd = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000).toISOString()
    : undefined

  // Sync subscription record
  await dbService.updateSubscriptionByStripeId(subscription.id, {
    status: mapStripeStatus(status),
    tier: tier || undefined,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
  })

  // Sync user tier
  const mappedStatus = mapStripeStatus(status)
  if (mappedStatus === 'active' && tier) {
    await dbService.updateUserSubscription(walletAddress, {
      subscription_tier: tier,
      subscription_status: 'active',
    })
  } else if (mappedStatus === 'past_due') {
    await dbService.updateUserSubscription(walletAddress, {
      subscription_status: 'past_due',
    })
  }

  // Audit trail
  await dbService.insertSubscriptionEvent({
    wallet_address: walletAddress,
    event_type: 'subscription_updated',
    stripe_event_id: event.id,
    data: { tier, status: mappedStatus, cancel_at_period_end: subscription.cancel_at_period_end },
  })

  // Subscription updated
}

/**
 * Handle customer.subscription.deleted - subscription ended
 */
export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  const walletAddress = subscription.metadata?.wallet_address

  if (!walletAddress) {
    console.error('[Webhook] subscription.deleted missing wallet_address in metadata')
    return
  }

  // Mark subscription as canceled
  await dbService.updateSubscriptionByStripeId(subscription.id, {
    status: 'canceled',
    canceled_at: new Date().toISOString(),
  })

  // Reset user to free (unless VIP/NFT - handled client-side via PremiumContext)
  await dbService.updateUserSubscription(walletAddress, {
    subscription_tier: 'free',
    subscription_status: 'canceled',
  })

  // Audit trail
  await dbService.insertSubscriptionEvent({
    wallet_address: walletAddress,
    event_type: 'subscription_deleted',
    stripe_event_id: event.id,
    data: { stripe_subscription_id: subscription.id },
  })

  // Subscription canceled
}

/**
 * Handle invoice.payment_failed - payment issue
 */
export async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = (invoice as any).subscription as string
  const customerId = invoice.customer as string

  // Find the subscription in our DB
  const sub = await dbService.getSubscriptionByStripeId(subscriptionId)
  const walletAddress = sub?.wallet_address

  if (walletAddress) {
    await dbService.updateUserSubscription(walletAddress, {
      subscription_status: 'past_due',
    })
  }

  // Audit trail
  await dbService.insertSubscriptionEvent({
    wallet_address: walletAddress || 'unknown',
    event_type: 'payment_failed',
    stripe_event_id: event.id,
    data: { stripe_subscription_id: subscriptionId, stripe_customer_id: customerId },
  })

  console.error(`[Webhook] Payment failed for subscription: ${subscriptionId}`)
}

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'canceled': return 'canceled'
    case 'incomplete': return 'incomplete'
    case 'trialing': return 'trialing'
    default: return stripeStatus
  }
}
