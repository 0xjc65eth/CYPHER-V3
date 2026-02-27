import { NextRequest, NextResponse } from 'next/server';
import { getFeeReportFromDatabase } from '@/lib/database/legacy-database';
import { validateAdminAuth } from '@/lib/middleware/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = validateAdminAuth(request);
    if (!auth.ok) return auth.response;
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    
    const report = await getFeeReportFromDatabase(startDate, endDate);
    
    return NextResponse.json({
      success: true,
      report: {
        ...report,
        totalFeesFormatted: `$${report.totalFees.toFixed(2)}`,
        totalVolumeFormatted: `$${report.totalVolume.toFixed(2)}`,
        averageFeePerTradeFormatted: `$${report.averageFeePerTrade.toFixed(2)}`,
        feePercentage: '0.35%'
      }
    });
  } catch (error) {
    console.error('Fee Report API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate fee report' },
      { status: 500 }
    );
  }
}