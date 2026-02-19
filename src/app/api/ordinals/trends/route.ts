/**
 * Trends API - CYPHER V3
 * GET /api/ordinals/trends
 *
 * Returns trend analysis for all collections or specific collection
 *
 * Query params:
 * - symbol: string (optional, filter to specific collection)
 * - type: 'price' | 'volume' | 'holder' | 'all' (default: 'all')
 * - period: '7d' | '30d' | '90d' (default: '30d')
 */

import { NextResponse } from 'next/server'
import { historicalDataService } from '@/services/ordinals/HistoricalDataService'

interface TrendAnalysis {
  symbol: string
  name: string
  trendType: 'uptrend' | 'downtrend' | 'sideways' | 'breakout' | 'breakdown'
  strength: number // 0-100
  confidence: number // 0-100
  indicators: {
    ma7?: number
    ma30?: number
    currentPrice: number
    volumeTrend: 'increasing' | 'decreasing' | 'stable'
  }
  signals: Array<{
    type: 'buy' | 'sell' | 'hold'
    reason: string
    strength: number
  }>
}

/**
 * Calculate moving average
 */
function calculateMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0

  const recentPrices = prices.slice(-period)
  return recentPrices.reduce((sum, p) => sum + p, 0) / period
}

/**
 * Detect trend from price series
 */
function detectTrend(
  symbol: string,
  name: string,
  timeSeries: any[]
): TrendAnalysis {
  if (timeSeries.length === 0) {
    return {
      symbol,
      name,
      trendType: 'sideways',
      strength: 0,
      confidence: 0,
      indicators: {
        currentPrice: 0,
        volumeTrend: 'stable',
      },
      signals: [],
    }
  }

  const prices = timeSeries.map(t => t.floorPrice).filter(p => p > 0)
  const volumes = timeSeries.map(t => t.volume || 0)

  if (prices.length === 0) {
    return {
      symbol,
      name,
      trendType: 'sideways',
      strength: 0,
      confidence: 0,
      indicators: {
        currentPrice: 0,
        volumeTrend: 'stable',
      },
      signals: [],
    }
  }

  const currentPrice = prices[prices.length - 1]

  // Calculate moving averages
  const ma7 = calculateMA(prices, 7)
  const ma30 = calculateMA(prices, 30)

  // Detect trend type
  let trendType: TrendAnalysis['trendType'] = 'sideways'
  let strength = 50
  let confidence = 50

  // Compare first half vs second half
  const mid = Math.floor(prices.length / 2)
  const firstHalf = prices.slice(0, mid)
  const secondHalf = prices.slice(mid)

  const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length

  const trendDiff = (secondAvg - firstAvg) / firstAvg

  if (trendDiff > 0.1) {
    trendType = 'uptrend'
    strength = Math.min(100, 50 + trendDiff * 200)
    confidence = Math.min(100, 60 + (prices.length / 30) * 40)
  } else if (trendDiff < -0.1) {
    trendType = 'downtrend'
    strength = Math.min(100, 50 + Math.abs(trendDiff) * 200)
    confidence = Math.min(100, 60 + (prices.length / 30) * 40)
  } else {
    trendType = 'sideways'
    strength = 50
    confidence = 70
  }

  // Check for breakout/breakdown
  if (ma7 > 0 && ma30 > 0) {
    if (currentPrice > ma30 * 1.1 && ma7 > ma30) {
      trendType = 'breakout'
      strength = Math.min(100, ((currentPrice - ma30) / ma30) * 500)
    } else if (currentPrice < ma30 * 0.9 && ma7 < ma30) {
      trendType = 'breakdown'
      strength = Math.min(100, ((ma30 - currentPrice) / ma30) * 500)
    }
  }

  // Analyze volume trend
  let volumeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'

  if (volumes.length >= 7) {
    const recentVol = volumes.slice(-7).reduce((sum, v) => sum + v, 0) / 7
    const olderVol = volumes.slice(-14, -7).reduce((sum, v) => sum + v, 0) / 7

    if (olderVol > 0) {
      const volChange = (recentVol - olderVol) / olderVol
      if (volChange > 0.2) volumeTrend = 'increasing'
      else if (volChange < -0.2) volumeTrend = 'decreasing'
    }
  }

  // Generate trading signals
  const signals: TrendAnalysis['signals'] = []

  if (trendType === 'uptrend' && volumeTrend === 'increasing') {
    signals.push({
      type: 'buy',
      reason: 'Strong uptrend with increasing volume',
      strength: Math.min(100, strength + 10),
    })
  } else if (trendType === 'breakout') {
    signals.push({
      type: 'buy',
      reason: 'Price breakout above resistance',
      strength: strength,
    })
  } else if (trendType === 'downtrend' && volumeTrend === 'increasing') {
    signals.push({
      type: 'sell',
      reason: 'Downtrend with increasing sell volume',
      strength: Math.min(100, strength + 10),
    })
  } else if (trendType === 'breakdown') {
    signals.push({
      type: 'sell',
      reason: 'Price breakdown below support',
      strength: strength,
    })
  } else {
    signals.push({
      type: 'hold',
      reason: 'Market consolidating, wait for clear direction',
      strength: 60,
    })
  }

  return {
    symbol,
    name,
    trendType,
    strength,
    confidence,
    indicators: {
      ma7: prices.length >= 7 ? ma7 : undefined,
      ma30: prices.length >= 30 ? ma30 : undefined,
      currentPrice,
      volumeTrend,
    },
    signals,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const type = searchParams.get('type') || 'all'
    const period = (searchParams.get('period') || '30d') as '7d' | '30d' | '90d'

    // Get latest snapshot to know which collections to analyze
    const latestSnapshot = await historicalDataService.getLatestSnapshot()

    if (!latestSnapshot) {
      return NextResponse.json(
        {
          success: false,
          error: 'No snapshots available',
          message: 'Collect a snapshot first: POST /api/ordinals/snapshot',
        },
        { status: 404 }
      )
    }

    // Filter collections
    const collectionsToAnalyze = symbol
      ? latestSnapshot.collections.filter(c => c.symbol === symbol)
      : latestSnapshot.collections

    if (collectionsToAnalyze.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Collection not found',
          message: `No data found for symbol: ${symbol}`,
        },
        { status: 404 }
      )
    }

    // Analyze trends for each collection
    const trends: TrendAnalysis[] = []

    for (const collection of collectionsToAnalyze) {
      try {
        const historicalData = await historicalDataService.getHistoricalData(
          collection.symbol,
          period
        )

        if (historicalData.timeSeries.length > 0) {
          const trend = detectTrend(
            collection.symbol,
            collection.name,
            historicalData.timeSeries
          )
          trends.push(trend)
        }
      } catch (error) {
        console.error(`[Trends API] Error analyzing ${collection.symbol}:`, error)
        // Continue with other collections
      }
    }

    // Sort by trend strength (descending)
    trends.sort((a, b) => b.strength - a.strength)

    return NextResponse.json(
      {
        success: true,
        data: trends,
        summary: {
          totalAnalyzed: trends.length,
          uptrends: trends.filter(t => t.trendType === 'uptrend').length,
          downtrends: trends.filter(t => t.trendType === 'downtrend').length,
          sideways: trends.filter(t => t.trendType === 'sideways').length,
          breakouts: trends.filter(t => t.trendType === 'breakout').length,
          breakdowns: trends.filter(t => t.trendType === 'breakdown').length,
          avgStrength: trends.reduce((sum, t) => sum + t.strength, 0) / trends.length,
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('[Trends API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
