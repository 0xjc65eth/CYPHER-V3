/**
 * CYPHER V3 - Rune Etching Validation API
 * GET /api/validation/rune-etching?runeid=<runeid>
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

    if (!runeid) {
      return NextResponse.json(
        { error: 'Missing runeid parameter' },
        { status: 400 }
      )
    }

    const validation = await blockchainValidationService.validateRuneEtching(runeid)

    return NextResponse.json(validation, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('[API] Rune etching validation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
