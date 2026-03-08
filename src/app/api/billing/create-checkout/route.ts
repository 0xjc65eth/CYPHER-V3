import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

const STRIPE_PRICES: Record<string, string | undefined> = {
  explorer: process.env.STRIPE_PRICE_EXPLORER,
  trader: process.env.STRIPE_PRICE_TRADER,
  hacker_yields: process.env.STRIPE_PRICE_HACKER_YIELDS,
}

type PlanId = 'explorer' | 'trader' | 'hacker_yields'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const planId = body?.planId as PlanId

    if (!planId || !STRIPE_PRICES[planId]) {
      return NextResponse.json({ error: 'Invalid plan. Use: explorer, trader, hacker_yields' }, { status: 400 })
    }

    const priceId = STRIPE_PRICES[planId]
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price not configured for this plan' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4444'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?payment=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        planId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[CreateCheckout] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
