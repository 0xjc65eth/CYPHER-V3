import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/database/supabase-client'

const PLANS = {
  explorer:      { amount: '29',  label: 'CYPHER Explorer' },
  trader:        { amount: '79',  label: 'CYPHER Trader' },
  hacker_yields: { amount: '149', label: 'CYPHER Hacker Yields' },
} as const

type PlanId = keyof typeof PLANS

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const planId = body?.planId as PlanId
    const walletAddress = body?.walletAddress as string | undefined

    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan. Use: explorer, trader, hacker_yields' }, { status: 400 })
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required. Connect your wallet first.' }, { status: 400 })
    }

    const plan = PLANS[planId]

    const btcpayHost = process.env.BTCPAY_HOST
    const btcpayStoreId = process.env.BTCPAY_STORE_ID
    const btcpayApiKey = process.env.BTCPAY_API_KEY

    if (!btcpayHost || !btcpayStoreId || !btcpayApiKey) {
      console.error('[CreateInvoice] BTCPay not configured')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:4444'

    const btcpayRes = await fetch(
      `${btcpayHost}/api/v1/stores/${btcpayStoreId}/invoices`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${btcpayApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: plan.amount,
          currency: 'USD',
          metadata: {
            orderId: `${walletAddress}-${Date.now()}`,
            walletAddress,
            planId,
            itemDesc: plan.label,
          },
          checkout: {
            expirationMinutes: 30,
            redirectURL: `${appUrl}/dashboard?payment=success`,
            speedPolicy: 'HighSpeed',
            paymentMethods: ['BTC', 'BTC_LightningLike'],
          },
        }),
      }
    )

    if (!btcpayRes.ok) {
      const errText = await btcpayRes.text()
      console.error('[CreateInvoice] BTCPay error:', errText)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 502 })
    }

    const invoice = await btcpayRes.json()

    // Store invoice in DB (best-effort, don't block the response)
    try {
      const supabase = getSupabaseServiceClient()
      await supabase
        .from('btcpay_invoices')
        .insert({
          invoice_id: invoice.id,
          wallet_address: walletAddress,
          plan: planId,
          amount: plan.amount,
          currency: 'USD',
          status: 'pending',
          checkout_link: invoice.checkoutLink,
          created_at: new Date().toISOString(),
        })
    } catch (dbErr) {
      console.error('[CreateInvoice] DB insert failed (non-blocking):', dbErr)
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      checkoutLink: invoice.checkoutLink,
      amount: plan.amount,
      plan: planId,
    })

  } catch (err) {
    console.error('[CreateInvoice] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
