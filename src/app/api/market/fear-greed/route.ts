import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://api.alternative.me/fng/?limit=10', {
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

    const history = entries.map((entry: { value: string; value_classification: string; timestamp: string }) => ({
      value: parseInt(entry.value, 10),
      classification: entry.value_classification,
      timestamp: parseInt(entry.timestamp, 10) * 1000,
      date: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString().split('T')[0],
    }));

    const current = history[0] || null;

    return NextResponse.json(
      {
        current: current
          ? { value: current.value, classification: current.classification }
          : null,
        history,
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
