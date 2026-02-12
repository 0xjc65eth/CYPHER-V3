import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 60);
    const offset = parseInt(searchParams.get('offset') || '0');
    const order = searchParams.get('order') || 'desc';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.hiro.so/ordinals/v1/inscriptions?limit=${limit}&offset=${offset}&order=${order}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Hiro API error: ${response.status} ${response.statusText}` },
        {
          status: response.status,
          headers: { 'Cache-Control': 'no-cache' },
        }
      );
    }

    const data = await response.json();

    const inscriptions = (data.results || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      number: item.number,
      content_type: item.content_type,
      content_length: item.content_length,
      timestamp: item.timestamp,
      genesis_address: item.genesis_address,
      genesis_block_height: item.genesis_block_height,
      genesis_block_hash: item.genesis_block_hash,
      genesis_tx_id: item.genesis_tx_id,
      genesis_fee: item.genesis_fee,
      output_value: item.output_value,
      sat_ordinal: item.sat_ordinal,
      sat_rarity: item.sat_rarity,
      mime_type: item.mime_type,
      curse_type: item.curse_type,
    }));

    return NextResponse.json(
      {
        success: true,
        data: inscriptions,
        total: data.total || 0,
        limit: data.limit || limit,
        offset: data.offset || offset,
        timestamp: Date.now(),
        source: 'hiro',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ordinals inscriptions API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inscriptions', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
