/**
 * CYPHER V3 - Rune Price Validation API
 * GET /api/validation/rune-price?runeid=<runeid>&runeName=<name>
 */

import { NextRequest, NextResponse } from 'next/server'
import { blockchainValidationService } from '@/services/blockchain-validation'
import { rateLimit } from '@/lib/middleware/rate-limiter'

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60)
  if (rateLimitRes) return rateLimitRes

  try {
    const { searchParams } = new URL(request.url)
    const runeid = searchParams.get('runeid')
    const runeName = searchParams.get('runeName')

    if (!runeid || !runeName) {
      return NextResponse.json(
        { error: 'Missing runeid or runeName parameter' },
        { status: 400 }
      )
    }

    const validation = await blockchainValidationService.validateRunePrice(runeid, runeName)

    return NextResponse.json(validation, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('[API] Rune price validation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
