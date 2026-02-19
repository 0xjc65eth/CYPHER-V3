/**
 * CYPHER V3 - Transaction Validation API
 * GET /api/validation/transaction?txid=<txid>
 */

import { NextRequest, NextResponse } from 'next/server'
import { blockchainValidationService } from '@/services/blockchain-validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const txid = searchParams.get('txid')

    if (!txid) {
      return NextResponse.json(
        { error: 'Missing txid parameter' },
        { status: 400 }
      )
    }

    const validation = await blockchainValidationService.validateTransaction(txid)

    return NextResponse.json(validation, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('[API] Transaction validation error:', error)
    return NextResponse.json(
      {
        error: 'Transaction validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
