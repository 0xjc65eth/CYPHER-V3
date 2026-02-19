import { NextResponse } from 'next/server'
import { apiService } from '@/lib/api-service'

export async function GET(request: Request) {
  try {
    
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')
    const order = searchParams.get('order') || 'desc'
    
    // Use the unified API service to get real Runes data
    const response = await apiService.getRunesData({
      offset,
      limit,
      order
    })
    
    if (!response.success) {
      // API service already provides fallback data when all sources fail
      const fallbackData = response.data || []
      
      return NextResponse.json({
        success: false,
        data: fallbackData,
        source: response.source,
        error: response.error,
        timestamp: new Date().toISOString()
      })
    }
    
    // Transform Hiro API data to our expected format
    const rawData = response.data as any;
    const formattedData = (rawData.results || rawData || []).map((rune: any) => {
      // Hiro returns supply as an object: { current, minted, total_mints, ... }
      const supplyObj = typeof rune.supply === 'object' ? rune.supply : null;
      const currentSupply = supplyObj ? parseFloat(supplyObj.current || '0') : parseFloat(rune.supply || '0');
      const mintPercentage = supplyObj ? parseFloat(supplyObj.mint_percentage || '0') : 0;
      const isMintable = supplyObj ? supplyObj.mintable : false;
      const burned = supplyObj ? parseFloat(supplyObj.burned || '0') : parseFloat(rune.burned || '0');

      return {
        name: rune.spaced_name || rune.spaced_rune || rune.name || rune.id || 'UNKNOWN',
        formatted_name: rune.spaced_name || rune.spaced_rune || rune.name || rune.id || 'UNKNOWN',
        id: rune.id,
        number: rune.number,
        etching: rune.etching,
        supply: currentSupply,
        premine: supplyObj ? parseFloat(supplyObj.premine || '0') : parseFloat(rune.premine || '0'),
        symbol: rune.symbol || '⧉',
        divisibility: rune.divisibility || 0,
        terms: rune.terms || rune.mint_terms,
        turbo: rune.turbo || false,
        burned,
        mintable: isMintable,
        mint_percentage: mintPercentage,
        mints: supplyObj ? parseInt(supplyObj.total_mints || '0') : (rune.mints || 0),
        unique_holders: rune.holders || 0,
        volume_24h: 0,
        market: {
          price_in_btc: 0,
          market_cap: 0
        },
        timestamp: rune.location?.timestamp || rune.timestamp || Date.now()
      }
    }) || []
    
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      source: response.source,
      responseTime: response.responseTime,
      cached: response.cached,
      total: rawData.total || formattedData.length,
      offset,
      limit,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in Runes list API:', message)

    return NextResponse.json({
      success: false,
      data: [],
      source: 'error',
      error: message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
