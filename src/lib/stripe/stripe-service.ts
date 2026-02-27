/**
 * Stripe Service - Server-side Stripe operations
 * Handles customer management, checkout sessions, subscriptions, and billing portal.
 */

import Stripe from 'stripe'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from './config'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(key, { apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion })
  }
  return stripeInstance
}

/**
 * Get or create a Stripe customer by wallet address.
 * Wallet is stored in customer metadata for webhook lookups.
 */
export async function getOrCreateCustomer(
  walletAddress: string,
  email?: string
): Promise<Stripe.Customer> {
  const stripe = getStripe()

  // Search for existing customer by wallet metadata
  const existing = await stripe.customers.search({
    query: `metadata["wallet_address"]:"${walletAddress}"`,
  })

  if (existing.data.length > 0) {
    return existing.data[0]
  }

  // Create new customer
  return stripe.customers.create({
    email: email || undefined,
    metadata: { wallet_address: walletAddress },
    description: `CYPHER V3 - ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
  })
}

/**
 * Create a Stripe Checkout Session for subscription.
 */
export async function createCheckoutSession(params: {
  walletAddress: string
  tier: SubscriptionTier
  email?: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const { walletAddress, tier, email, successUrl, cancelUrl } = params

  const tierConfig = SUBSCRIPTION_TIERS[tier]
  if (!tierConfig || tier === 'free') {
    throw new Error(`Invalid subscription tier: ${tier}`)
  }

  if (!tierConfig.stripePriceId) {
    throw new Error(`Price ID not configured for tier: ${tier}`)
  }

  const customer = await getOrCreateCustomer(walletAddress, email)

  return stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: tierConfig.stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      wallet_address: walletAddress,
      tier,
    },
    subscription_data: {
      metadata: {
        wallet_address: walletAddress,
        tier,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })
}

/**
 * Cancel a subscription (at period end by default).
 */
export async function cancelSubscription(
  stripeSubscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<Stripe.Subscription> {
  const stripe = getStripe()

  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  return stripe.subscriptions.cancel(stripeSubscriptionId)
}

/**
 * Update subscription tier (upgrade/downgrade with proration).
 */
export async function updateSubscriptionTier(
  stripeSubscriptionId: string,
  newTier: SubscriptionTier
): Promise<Stripe.Subscription> {
  const stripe = getStripe()
  const tierConfig = SUBSCRIPTION_TIERS[newTier]

  if (!tierConfig || newTier === 'free' || !tierConfig.stripePriceId) {
    throw new Error(`Invalid target tier: ${newTier}`)
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const currentItem = subscription.items.data[0]

  return stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: currentItem.id,
        price: tierConfig.stripePriceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      ...subscription.metadata,
      tier: newTier,
    },
  })
}

/**
 * Create a Stripe Billing Portal session for customer self-service.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

/**
 * Construct and verify a Stripe webhook event.
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Retrieve a Stripe subscription by ID.
 */
export async function getSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe()
  return stripe.subscriptions.retrieve(stripeSubscriptionId)
}
