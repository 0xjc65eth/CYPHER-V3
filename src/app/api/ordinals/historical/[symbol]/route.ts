/**
 * Historical Data API - CYPHER V3
 * GET /api/ordinals/historical/[symbol]
 *
 * Returns historical time-series data for a collection
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' | '1y' | 'all' (default: '30d')
 * - interval: 'daily' | 'weekly' (default: 'daily')
 * - metrics: comma-separated list (default: 'price,volume,holders')
 */

import { NextResponse } from 'next/server'
import { historicalDataService } from '@/services/ordinals/HistoricalDataService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || '30d') as '7d' | '30d' | '90d' | '1y' | 'all'
    const interval = searchParams.get('interval') || 'daily'
    const metricsParam = searchParams.get('metrics') || 'price,volume,holders'

    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol is required',
        },
        { status: 400 }
      )
    }

    // Get historical data
    const historicalData = await historicalDataService.getHistoricalData(symbol, period)

    if (historicalData.timeSeries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No historical data available',
          message: `No snapshots found for ${symbol}. Try collecting a snapshot first: POST /api/ordinals/snapshot`,
        },
        { status: 404 }
      )
    }

    // Filter metrics if specified
    const requestedMetrics = metricsParam.split(',').map(m => m.trim())
    const filteredTimeSeries = historicalData.timeSeries.map(point => {
      const filtered: any = {
        date: point.date,
        timestamp: point.timestamp,
      }

      if (requestedMetrics.includes('price')) {
        filtered.floorPrice = point.floorPrice
        filtered.floorPriceUSD = point.floorPriceUSD
      }

      if (requestedMetrics.includes('volume')) {
        filtered.volume = point.volume
        filtered.volumeUSD = point.volumeUSD
        filtered.trades = point.trades
      }

      if (requestedMetrics.includes('holders')) {
        filtered.holders = point.holders
      }

      if (requestedMetrics.includes('listed')) {
        filtered.listed = point.listed
      }

      return filtered
    })

    // Apply interval aggregation if weekly
    let finalTimeSeries = filteredTimeSeries

    if (interval === 'weekly' && filteredTimeSeries.length > 7) {
      finalTimeSeries = []
      for (let i = 0; i < filteredTimeSeries.length; i += 7) {
        const week = filteredTimeSeries.slice(i, i + 7)
        const aggregated = {
          date: week[week.length - 1].date,
          timestamp: week[week.length - 1].timestamp,
          floorPrice: week[week.length - 1].floorPrice,
          floorPriceUSD: week[week.length - 1].floorPriceUSD,
          volume: week.reduce((sum, p) => sum + (p.volume || 0), 0) / week.length,
          volumeUSD: week.reduce((sum, p) => sum + (p.volumeUSD || 0), 0) / week.length,
          trades: week.reduce((sum, p) => sum + (p.trades || 0), 0),
          holders: week[week.length - 1].holders,
          listed: week[week.length - 1].listed,
        }
        finalTimeSeries.push(aggregated)
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          symbol,
          period,
          interval,
          timeSeries: finalTimeSeries,
          analytics: historicalData.analytics,
          summary: {
            dataPoints: finalTimeSeries.length,
            firstDate: finalTimeSeries[0]?.date,
            lastDate: finalTimeSeries[finalTimeSeries.length - 1]?.date,
            priceRange: {
              min: Math.min(...finalTimeSeries.map(p => p.floorPrice || 0).filter(p => p > 0)),
              max: Math.max(...finalTimeSeries.map(p => p.floorPrice || 0)),
            },
            volumeTotal: finalTimeSeries.reduce((sum, p) => sum + (p.volume || 0), 0),
          },
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
    console.error(`[Historical API] Error:`, error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch historical data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
