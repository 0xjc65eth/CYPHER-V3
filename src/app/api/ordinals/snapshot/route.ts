/**
 * Ordinals Snapshot API - CYPHER V3
 * Manual trigger for daily snapshot collection
 *
 * POST /api/ordinals/snapshot
 * - Collects current market snapshot
 * - Stores to /database/ordinals/snapshots/
 * - Detects milestones
 *
 * Query params:
 * - force: boolean (skip existing check)
 */

import { NextResponse } from 'next/server'
import { historicalDataService } from '@/services/ordinals/HistoricalDataService'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Check if snapshot already exists for today (unless forced)
    const today = new Date().toISOString().split('T')[0]

    if (!force) {
      const existing = await historicalDataService.loadSnapshot(today)

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: 'Snapshot already exists for today',
            message: `Use ?force=true to overwrite`,
            snapshot: existing,
          },
          { status: 409 }
        )
      }
    }

    // Ensure directories exist
    await historicalDataService.ensureDirectories()

    // Collect snapshot
    const snapshot = await historicalDataService.collectDailySnapshot()

    // Detect and save milestones
    const previousSnapshots = await historicalDataService.getPreviousSnapshots(90)
    const allMilestones = []

    for (const collection of snapshot.collections) {
      const milestones = await historicalDataService.detectMilestones(collection, previousSnapshots)
      if (milestones.length > 0) {
        await historicalDataService.saveMilestones(collection.symbol, milestones)
        allMilestones.push(...milestones)
      }
    }


    return NextResponse.json(
      {
        success: true,
        message: 'Snapshot collected successfully',
        snapshot: {
          date: snapshot.date,
          collectionsCount: snapshot.collections.length,
          totalVolume24h: snapshot.marketMetrics.totalVolume24h,
          totalVolumeUSD24h: snapshot.marketMetrics.totalVolumeUSD24h,
          avgFloorPrice: snapshot.marketMetrics.avgFloorPrice,
          btcPrice: snapshot.btcPrice,
        },
        milestones: {
          count: allMilestones.length,
          types: allMilestones.reduce((acc, m) => {
            acc[m.type] = (acc[m.type] || 0) + 1
            return acc
          }, {} as Record<string, number>),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('[Snapshot API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to collect snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ordinals/snapshot
 * Get latest snapshot or snapshot for specific date
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to latest)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    let snapshot

    if (date) {
      // Get specific date
      snapshot = await historicalDataService.loadSnapshot(date)

      if (!snapshot) {
        return NextResponse.json(
          {
            success: false,
            error: 'Snapshot not found',
            message: `No snapshot found for ${date}`,
          },
          { status: 404 }
        )
      }
    } else {
      // Get latest
      snapshot = await historicalDataService.getLatestSnapshot()

      if (!snapshot) {
        return NextResponse.json(
          {
            success: false,
            error: 'No snapshots available',
            message: 'No snapshots have been collected yet',
          },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: snapshot,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    console.error('[Snapshot API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
