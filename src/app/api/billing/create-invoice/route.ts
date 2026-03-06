import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLANS = {
  pro:   { amount: '29', label: 'CYPHER Pro' },
  elite: { amount: '99', label: 'CYPHER Elite' },
} as const

type PlanId = keyof typeof PLANS

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
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

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Plano inválido. Use: pro, elite' }, { status: 400 })
    }

    const plan = PLANS[planId]

    const btcpayRes = await fetch(
      `${process.env.BTCPAY_HOST}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${process.env.BTCPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: plan.amount,
          currency: 'USD',
          metadata: {
            orderId: `${user.id}-${Date.now()}`,
            userId: user.id,
            planId,
            buyerEmail: user.email,
            itemDesc: plan.label,
          },
          checkout: {
            expirationMinutes: 30,
            redirectURL: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
          },
        }),
      }
    )

    if (!btcpayRes.ok) {
      const errText = await btcpayRes.text()
      console.error('[CreateInvoice] BTCPay erro:', errText)
      return NextResponse.json({ error: 'Erro ao criar invoice' }, { status: 502 })
    }

    const invoice = await btcpayRes.json()

    await supabaseAdmin
      .from('btcpay_invoices')
      .insert({
        invoice_id: invoice.id,
        user_id: user.id,
        plan: planId,
        amount: plan.amount,
        currency: 'USD',
        status: 'pending',
        checkout_link: invoice.checkoutLink,
        created_at: new Date().toISOString(),
      })

    console.log(`[CreateInvoice] ✅ ${invoice.id} | user=${user.id} | plano=${planId}`)

    return NextResponse.json({
      invoiceId: invoice.id,
      checkoutLink: invoice.checkoutLink,
      amount: plan.amount,
      plan: planId,
    })

  } catch (err) {
    console.error('[CreateInvoice] Erro:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
