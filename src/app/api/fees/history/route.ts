/**
 * Fee History API - Returns recent fee collection records
 *
 * GET /api/fees/history?limit=20
 *
 * Returns fee records from the database (Supabase with in-memory fallback).
 * Used by the Swap page to show transaction history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';
import { getAllFeeRecords, getFeeStats } from '@/lib/feeCollector';
import { validateAdminAuth } from '@/lib/middleware/admin-auth';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const auth = validateAdminAuth(request);
    if (!auth.ok) return auth.response;
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
