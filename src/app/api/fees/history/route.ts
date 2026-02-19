/**
 * Fee History API - Returns recent fee collection records
 *
 * GET /api/fees/history?limit=20
 *
 * Returns fee records from the database (Supabase with in-memory fallback).
 * Used by the Swap page to show transaction history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllFeeRecords, getFeeStats } from '@/lib/feeCollector';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const [records, stats] = await Promise.all([
      getAllFeeRecords(limit),
      getFeeStats(),
    ]);

    return NextResponse.json({
      success: true,
      records,
      stats: {
        totalCollected: stats.totalCollected,
        totalPending: stats.totalPending,
        byProtocol: stats.byProtocol,
      },
      count: records.length,
    });
  } catch (error) {
    console.error('[Fee History] Error:', error);
    return NextResponse.json({
      success: true,
      records: [],
      stats: { totalCollected: 0, totalPending: 0, byProtocol: {} },
      count: 0,
    });
  }
}
