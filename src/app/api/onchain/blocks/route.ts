import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://mempool.space/api/v1/blocks', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Mempool.space API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    const blocks = data.map((block: Record<string, unknown>) => ({
      height: block.height,
      timestamp: block.timestamp,
      tx_count: block.tx_count,
      size: block.size,
      weight: block.weight,
      hash: block.id,
      difficulty: block.difficulty,
      median_fee: block.extras && typeof block.extras === 'object' ? (block.extras as Record<string, unknown>).medianFee : undefined,
    }));

    return NextResponse.json(
      {
        blocks,
        count: blocks.length,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch blocks data: ${message}` }, { status: 500 });
  }
}
