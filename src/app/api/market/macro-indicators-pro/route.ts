import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Enhanced macro data with more historical context
    const data = {
      dxy: { value: 104.25, change: -0.18, change1w: -0.45, change1m: 1.23, high52w: 107.35, low52w: 99.58 },
      treasury10y: { value: 4.35, change: 0.05, change1w: 0.12, change1m: -0.23, high52w: 5.02, low52w: 3.79 },
      treasury2y: { value: 4.68, change: 0.03 },
      yieldSpread: { value: -0.33, inverted: true },
      vix: { value: 15.8, change: -2.1, percentile90d: 32, high52w: 28.45, low52w: 12.12 },
      sp500: { value: 5847.23, change: 0.45, change1w: 1.23, change1m: 3.45, change1y: 24.67, pe: 21.4, high52w: 5892.11, low52w: 4103.78 },
      nasdaq: { value: 18402.56, change: 0.58, change1w: 1.67, change1m: 4.23, change1y: 31.24 },
      gold: { value: 2634.50, change: 0.32, change1w: -0.78, change1m: 2.34, change1y: 18.45 },
      oil: { value: 78.45, change: -1.24, change1w: -2.34, change1m: -5.67 },
      cpi: { value: 3.2, previous: 3.4, date: 'Jan 2026', trend: 'falling' },
      ppi: { value: 2.4, previous: 2.6, date: 'Jan 2026' },
      fedRate: { 
        value: 5.50, 
        nextMeeting: 'Mar 20, 2026', 
        probability: { hold: 78.5, cut25: 19.2, hike25: 2.3 } 
      },
      unemployment: { value: 3.7, previous: 3.8, date: 'Jan 2026' },
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching macro indicators pro:', error);
    return NextResponse.json(
      { error: 'Failed to fetch macro indicators' },
      { status: 500 }
    );
  }
}
