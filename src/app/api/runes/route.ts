import { NextResponse } from 'next/server'

const HIRO_API_BASE = 'https://api.hiro.so/runes/v1'
const FETCH_TIMEOUT = 10000

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function GET(request: Request) {
  try {
    console.log('🔄 API: Fetching real Runes data directly from Hiro API...')

    // Fetch runes list directly from Hiro API
    const response = await fetchWithTimeout(`${HIRO_API_BASE}/etchings?limit=50&offset=0`)

    if (!response.ok) {
      throw new Error(`Hiro API error: ${response.status}`)
    }

    const data = await response.json()
    const runes = data.results || []

    // Transform to response format
    const activeRunes = runes.slice(0, 10).map((rune: any) => {
      const currentSupply = parseInt(rune.supply?.current || '0') / Math.pow(10, rune.divisibility || 0)
      const mintPercentage = parseFloat(rune.supply?.mint_percentage || '0')

      return {
        id: rune.id,
        name: rune.spaced_name || rune.name,
        symbol: rune.symbol || rune.name.replace(/[•\s]/g, '').substring(0, 8),
        supply: currentSupply,
        holders: 0, // Would need separate API call per rune
        price: 0, // Not available from Hiro API
        change_24h: 0,
        volume_24h: 0,
        market_cap: 0,
        mint_progress: mintPercentage,
        mints: parseInt(rune.supply?.total_mints || '0'),
        burned: parseInt(rune.supply?.burned || '0') / Math.pow(10, rune.divisibility || 0),
        divisibility: rune.divisibility,
        turbo: rune.turbo
      }
    })

    // Calculate total stats
    const totalSupply = runes.reduce((sum: number, rune: any) => {
      const supply = parseInt(rune.supply?.current || '0') / Math.pow(10, rune.divisibility || 0)
      return sum + supply
    }, 0)

    const responseData = {
      total_runes: data.total || runes.length,
      total_supply: Math.floor(totalSupply),
      total_minted: Math.floor(totalSupply), // Simplified - current supply = minted
      unique_holders: 0, // Would need aggregate query
      volume_24h: 0, // Not available from Hiro Runes API
      market_cap: 0, // Not available from Hiro Runes API
      active_runes: activeRunes,
      top_gainers: [], // Price data not available
      top_losers: [] // Price data not available
    }

    console.log(`✅ API: Returning ${activeRunes.length} runes with real Hiro data`)

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      source: 'hiro_api_direct'
    })
  } catch (error) {
    console.error('❌ Runes API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch runes data from Hiro API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}