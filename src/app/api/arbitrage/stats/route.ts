/**
 * Arbitrage Statistics API Endpoint
 * Provides real-time statistics from CCXT-based ArbitrageEngine
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Import ArbitrageEngine
    const ArbitrageEngine = (await import('@/services/arbitrage/ArbitrageEngine')).default;

    // Get comprehensive statistics
    const engine = new (ArbitrageEngine as any)();
    const stats = await engine.getStatistics();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      source: 'CCXT_ARBITRAGE_ENGINE'
    });
  } catch (error) {
    console.error('❌ Stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch arbitrage statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
