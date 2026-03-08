import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      console.error('[StripeWebhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.userId || session.client_reference_id
      const planId = session.metadata?.planId

      if (!userId || !planId) {
        console.error('[StripeWebhook] Missing userId or planId in session metadata')
        return NextResponse.json({ received: true, warning: 'Missing metadata' })
      }

      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const { error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert(
          {
            user_id: userId,
            plan: planId,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            last_invoice_id: session.id,
            payment_method: 'stripe',
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (subError) {
        console.error('[StripeWebhook] Failed to activate subscription:', subError)
        return NextResponse.json({ error: 'Subscription update failed' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubId = subscription.id

      const { error } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSubId)

      if (error) {
        console.error('[StripeWebhook] Failed to cancel subscription:', error)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ received: true, type: event.type })
  } catch (err) {
    console.error('[StripeWebhook] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
