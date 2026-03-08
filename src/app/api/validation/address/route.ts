/**
 * CYPHER V3 - Address Validation API
 * GET /api/validation/address?address=<address>
 */

import { NextRequest, NextResponse } from 'next/server'
import { blockchainValidationService } from '@/services/blockchain-validation'
import { rateLimit } from '@/lib/middleware/rate-limiter'

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60)
  if (rateLimitRes) return rateLimitRes

  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      )
    }

    const validation = await blockchainValidationService.validateAddress(address)

    return NextResponse.json(validation, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('[API] Address validation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
