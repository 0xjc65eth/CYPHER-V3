import { NextRequest, NextResponse } from 'next/server'
import { strictRateLimit } from '@/lib/middleware/rate-limiter'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex')
    const expected = Buffer.from(hmac)
    const received = Buffer.from(signature)
    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rateLimitRes = await strictRateLimit(req, 10, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await req.text()
    const rawSig = req.headers.get('btcpay-sig1') ?? ''
    const signature = rawSig.startsWith('sha256=') ? rawSig.slice(7) : rawSig
    const secret = process.env.BTCPAY_WEBHOOK_SECRET!

    if (!secret || !verifySignature(body, signature, secret)) {
      console.error('[Webhook] Assinatura inválida')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = JSON.parse(body)
    // Event type logged implicitly via response

    if (event.type !== 'InvoiceSettled' && event.type !== 'InvoicePaymentSettled') {
      return NextResponse.json({ received: true, skipped: event.type })
    }

    const invoiceId = event.invoiceId

    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('btcpay_invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      console.error(`[Webhook] Invoice não encontrada: ${invoiceId}`)
      return NextResponse.json({ received: true, warning: 'Invoice not found' })
    }

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    const { error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert(
        {
          user_id: invoice.user_id,
          plan: invoice.plan,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          last_invoice_id: invoiceId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (subError) {
      console.error('[Webhook] Erro ao ativar subscrição:', subError)
      return NextResponse.json({ error: 'Subscription update failed' }, { status: 500 })
    }

    await supabaseAdmin
      .from('btcpay_invoices')
      .update({ status: 'settled', paid_at: new Date().toISOString() })
      .eq('invoice_id', invoiceId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[Webhook] Erro:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
