/**
 * CYPHER V3 - Batch Transaction Validation API
 * POST /api/validation/transaction-batch
 * Body: { txids: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { blockchainValidationService } from '@/services/blockchain-validation'
import { rateLimit, strictRateLimit } from '@/lib/middleware/rate-limiter'

export async function POST(request: NextRequest) {
  const rateLimitRes = await strictRateLimit(request, 10, 60)
  if (rateLimitRes) return rateLimitRes

  try {
    const body = await request.json()
    const { txids } = body

    if (!txids || !Array.isArray(txids) || txids.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid txids array' },
        { status: 400 }
      )
    }

    if (txids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 transactions per batch' },
        { status: 400 }
      )
    }

    const validations = await blockchainValidationService.validateTransactionBatch(txids)

    return NextResponse.json(validations, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('[API] Batch transaction validation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
