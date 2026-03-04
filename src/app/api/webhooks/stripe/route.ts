/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint. Verifies signature and dispatches to handlers.
 * Always returns 200 to acknowledge receipt (Stripe best practice).
 */

import { NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe/stripe-service'
import {
  handleCheckoutComplete,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from '@/lib/stripe/webhook-handlers'

export async function POST(request: Request) {
  let eventType = 'unknown'

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const event = await constructWebhookEvent(body, signature)
    eventType = event.type

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event)
        break

      default:
        // Unhandled event type - no action needed
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    // Log the error but still return 200 to prevent Stripe from retrying
    // Only return non-200 for signature verification failures
    if (error instanceof Error && error.message.includes('signature')) {
      console.error('[Webhook] Signature verification failed:', error.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.error(`[Webhook] Handler error for ${eventType}:`, error)
    // Return 200 even on handler errors so Stripe doesn't retry
    return NextResponse.json({ received: true, error: 'Handler failed' })
  }
}
