/**
 * Milestones API - CYPHER V3
 * GET /api/ordinals/milestones/[symbol]
 *
 * Returns milestone events for a collection
 *
 * Query params:
 * - limit: number (default: 50)
 * - type: 'ATH' | 'ATL' | 'VOLUME_SPIKE' | 'HOLDER_SURGE' | 'WHALE_BUY' | 'BREAKOUT' | 'BREAKDOWN' (optional filter)
 * - severity: 'low' | 'medium' | 'high' | 'critical' (optional filter)
 */

import { NextResponse } from 'next/server'
import { historicalDataService } from '@/services/ordinals/HistoricalDataService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const typeFilter = searchParams.get('type')
    const severityFilter = searchParams.get('severity')

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

    // Get milestones
    let milestones = await historicalDataService.getMilestones(symbol, limit * 2) // Get more to filter

    // Apply filters
    if (typeFilter) {
      milestones = milestones.filter(m => m.type === typeFilter)
    }

    if (severityFilter) {
      milestones = milestones.filter(m => m.severity === severityFilter)
    }

    // Limit results
    milestones = milestones.slice(0, limit)

    // Calculate stats
    const stats = {
      totalMilestones: milestones.length,
      athCount: milestones.filter(m => m.type === 'ATH').length,
      atlCount: milestones.filter(m => m.type === 'ATL').length,
      volumeSpikeCount: milestones.filter(m => m.type === 'VOLUME_SPIKE').length,
      holderSurgeCount: milestones.filter(m => m.type === 'HOLDER_SURGE').length,
      breakoutCount: milestones.filter(m => m.type === 'BREAKOUT').length,
      breakdownCount: milestones.filter(m => m.type === 'BREAKDOWN').length,
      lastMilestone: milestones.length > 0 ? milestones[0].date : null,
      bySeverity: {
        low: milestones.filter(m => m.severity === 'low').length,
        medium: milestones.filter(m => m.severity === 'medium').length,
        high: milestones.filter(m => m.severity === 'high').length,
        critical: milestones.filter(m => m.severity === 'critical').length,
      },
    }

    if (milestones.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            symbol,
            milestones: [],
            stats: {
              ...stats,
              message: 'No milestones detected yet. Milestones are created during snapshot collection.',
            },
          },
          timestamp: Date.now(),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
          },
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          symbol,
          milestones,
          stats,
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    )
  } catch (error) {
    console.error(`[Milestones API] Error:`, error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch milestones',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
