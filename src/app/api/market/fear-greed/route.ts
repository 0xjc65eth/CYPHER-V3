import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://api.alternative.me/fng/?limit=10', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch fear and greed data' },
        { status: 502 }
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
    return NextResponse.json({ error: 'Failed to fetch fear and greed data' }, { status: 500 });
  }
}
