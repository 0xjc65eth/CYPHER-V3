import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { hiroAPI } from '@/lib/hiro-api'
import { brc20Service } from '@/services/BRC20Service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

  const { ticker } = await params

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    
    // Get token details from our service
    const tokenDetails = await brc20Service.getBRC20TokenDetails(ticker)
    
    if (!tokenDetails) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    // Get market data
    const marketData = await brc20Service.getBRC20MarketData(ticker)
    
    // Get trading platforms
    const tradingPlatforms = brc20Service.getBRC20TradingPlatforms(ticker)

    // Try to get additional data from Hiro API
    let hiroData = null
    try {
      const response = await hiroAPI.getBRC20TokenDetails(ticker)
      hiroData = response
    } catch (error) {
    }

    const response = {
      ticker: ticker.toLowerCase(),
      token: tokenDetails,
      marketData,
      tradingPlatforms,
      hiroData,
      timestamp: new Date().toISOString(),
      dataSource: 'enhanced'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error(`❌ Error fetching token details for ${ticker}:`, error)
    
    // Return basic fallback data
    const fallbackData = {
      ticker: ticker.toLowerCase(),
      token: {
        ticker: ticker.toLowerCase(),
        name: ticker.charAt(0).toUpperCase() + ticker.slice(1),
        price: 0.001,
        priceChange24h: 0,
        volume24h: 0,
        marketCap: 0,
        holders: 0,
        verified: false,
        mintable: false
      },
      marketData: null,
      tradingPlatforms: brc20Service.getBRC20TradingPlatforms(ticker),
      error: 'Token data temporarily unavailable',
      timestamp: new Date().toISOString(),
      dataSource: 'fallback'
    }

    return NextResponse.json(fallbackData, { status: 200 })
  }
}