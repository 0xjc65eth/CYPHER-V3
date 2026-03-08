import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { hiroAPI, processBRC20Data } from '@/lib/hiro-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

  const { address } = await params

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 })
  }

  try {
    // Get real BRC-20 data from HIRO API
    const brc20Response = await hiroAPI.getBRC20ForAddress(address)
    
    if (brc20Response.error) {
      // Return error - NO MOCK DATA
      console.error('HIRO BRC-20 API failed:', brc20Response.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch real BRC-20 data from Hiro API',
        message: brc20Response.error
      }, { status: 503 })
    }

    // Process real HIRO data
    const brc20Data = brc20Response.data.results || []
    const processedTokens = processBRC20Data(brc20Data)

    // Calculate totals
    const totalValue = processedTokens.reduce((sum, token) => sum + token.value, 0)
    const totalTokensHeld = processedTokens.reduce((sum, token) => sum + parseFloat(token.balance), 0)

    const response = {
      address,
      tokens: processedTokens,
      total: processedTokens.length,
      totalValue,
      totalTokensHeld,
      dataSource: 'hiro',
      cached: brc20Response.cached || false,
      timestamp: brc20Response.timestamp,
      // Additional metadata
      uniqueTokens: Array.from(new Set(processedTokens.map(t => t.ticker))).length,
      transferrableValue: processedTokens.reduce((sum, token) => {
        const balance = parseFloat(token.balance);
        const transferrableRatio = balance > 0 ? parseFloat(token.transferrable) / balance : 0;
        return sum + transferrableRatio * token.value;
      }, 0),
      // Raw HIRO data for debugging (only in development)
      ...(process.env.NODE_ENV === 'development' && { 
        rawData: brc20Data.slice(0, 3) // Limit raw data size
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching BRC-20 balances:', error)

    // Return error - NO MOCK DATA
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}