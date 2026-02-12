import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Fetch inscription stats from Hiro
    const response = await fetch(
      'https://api.hiro.so/ordinals/v1/stats/inscriptions',
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Hiro API error: ${response.status} ${response.statusText}` },
        { status: response.status, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const data = await response.json();

    return NextResponse.json(
      {
        success: true,
        data: {
          total_inscriptions: data.total_inscriptions ?? data.count ?? null,
          unconfirmed_inscriptions: data.unconfirmed_inscriptions ?? null,
          cursed_inscriptions: data.cursed_inscriptions ?? null,
          blessed_inscriptions: data.blessed_inscriptions ?? null,
          current_block_height: data.current_block_height ?? null,
          ...data,
        },
        timestamp: Date.now(),
        source: 'hiro',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ordinals stats API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inscription stats', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
