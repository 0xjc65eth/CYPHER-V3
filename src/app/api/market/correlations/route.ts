import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch Fear & Greed Index
    let fearGreedData = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const fgResponse = await fetch('https://api.alternative.me/fng/?limit=30', { signal: controller.signal });
      clearTimeout(timeout);
      if (fgResponse.ok) {
        const fgJson = await fgResponse.json();
        if (fgJson.data && fgJson.data.length > 0) {
          fearGreedData = {
            current: {
              value: parseInt(fgJson.data[0].value),
              classification: fgJson.data[0].value_classification,
            },
            history: fgJson.data.slice(0, 30).map((item: any) => ({
              value: parseInt(item.value),
              classification: item.value_classification,
              date: new Date(parseInt(item.timestamp) * 1000).toISOString(),
            })),
          };
        }
      }
    } catch (err) {
      console.error('Failed to fetch Fear & Greed:', err);
    }

    // Hardcoded correlation estimates - in production, calculate from historical price data using 90-day rolling correlation
    const data = {
      correlations: {
        'S&P 500': { value: 0.68 },
        'Gold': { value: 0.42 },
        'DXY (Dollar Index)': { value: -0.55 },
        'Nasdaq': { value: 0.72 },
        'Ethereum': { value: 0.89 },
        'Bonds (TLT)': { value: -0.32 },
        'Oil (WTI)': { value: 0.28 },
        'VIX': { value: -0.41, note: 'Inverse correlation with volatility' },
      },
      source: fearGreedData ? 'alternative.me' : 'estimates',
      fearGreed: fearGreedData || {
        current: { value: 50, classification: 'Neutral' },
        history: [],
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching market correlations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market correlations' },
      { status: 500 }
    );
  }
}
