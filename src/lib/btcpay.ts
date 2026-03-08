const BTCPAY_HOST     = process.env.BTCPAY_HOST!
const BTCPAY_STORE_ID = process.env.BTCPAY_STORE_ID!
const BTCPAY_API_KEY  = process.env.BTCPAY_API_KEY!

function btcpayFetch(path: string, options: RequestInit = {}) {
  return fetch(`${BTCPAY_HOST}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${BTCPAY_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export interface BTCPayInvoice {
  id: string
  storeId: string
  amount: string
  currency: string
  status: 'New' | 'Processing' | 'Expired' | 'Invalid' | 'Settled'
  checkoutLink: string
  expirationTime: number
  createdTime: number
  metadata?: Record<string, unknown>
}

export async function createInvoice(params: {
  amount: string
  currency: string
  metadata?: Record<string, unknown>
  redirectURL?: string
  expirationMinutes?: number
}): Promise<BTCPayInvoice> {
  const res = await btcpayFetch(
    `/api/v1/stores/${BTCPAY_STORE_ID}/invoices`,
    {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        metadata: params.metadata,
        checkout: {
          expirationMinutes: params.expirationMinutes ?? 30,
          redirectURL: params.redirectURL,
          speedPolicy: 'HighSpeed',
          paymentMethods: ['BTC', 'BTC_LightningLike'],
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`BTCPay createInvoice failed: ${await res.text()}`)
  return res.json()
}

export async function getInvoice(invoiceId: string): Promise<BTCPayInvoice> {
  const res = await btcpayFetch(`/api/v1/stores/${BTCPAY_STORE_ID}/invoices/${invoiceId}`)
  if (!res.ok) throw new Error(`BTCPay getInvoice failed: ${res.status}`)
  return res.json()
}

export async function getInvoiceStatus(invoiceId: string): Promise<BTCPayInvoice['status']> {
  const invoice = await getInvoice(invoiceId)
  return invoice.status
}
