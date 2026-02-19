/**
 * CYPHER V3 - Rune Holders Validation API
 * GET /api/validation/rune-holders?runeid=<runeid>&runeName=<name>
 */

import { NextRequest, NextResponse } from 'next/server'
import { blockchainValidationService } from '@/services/blockchain-validation'

export async function GET(request: NextRequest) {
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

    const validation = await blockchainValidationService.validateRuneHolders(runeid, runeName)

    return NextResponse.json(validation, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    })
  } catch (error) {
    console.error('[API] Rune holders validation error:', error)
    return NextResponse.json(
      {
        error: 'Rune holders validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
