import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // SPX/Gold/DXY correlation requires paid market data APIs
    // Using Fear & Greed as the primary available metric
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://api.alternative.me/fng/?limit=30', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fear & Greed API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const entries = data.data || [];

    const fearGreedHistory = entries.map((entry: { value: string; value_classification: string; timestamp: string }) => ({
      value: parseInt(entry.value, 10),
      classification: entry.value_classification,
      date: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString().split('T')[0],
    }));

    return NextResponse.json(
      {
        correlations: {
          spx: { value: null, note: 'Requires paid market data API' },
          gold: { value: null, note: 'Requires paid market data API' },
          dxy: { value: null, note: 'Requires paid market data API' },
        },
        fearGreed: {
          current: fearGreedHistory[0] || null,
          history: fearGreedHistory,
        },
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
