import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60);
    if (rateLimitRes) return rateLimitRes;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60);
    const offset = parseInt(searchParams.get('offset') || '0');
    const order = searchParams.get('order') || 'desc';
    const order_by = searchParams.get('order_by') || 'genesis_block_height';

    // Search parameters supported by Hiro API
    const searchNumber = searchParams.get('number') || '';
    const searchAddress = searchParams.get('address') || '';
    const searchId = searchParams.get('id') || '';
    const searchMimeType = searchParams.get('mime_type') || '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Hiro API: order=desc returns newest inscriptions first
    const url = new URL('https://api.hiro.so/ordinals/v1/inscriptions');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('order', order);
    url.searchParams.set('order_by', order_by);

    // Forward search params to Hiro API
    if (searchNumber) {
      url.searchParams.set('number', searchNumber);
    }
    if (searchAddress) {
      url.searchParams.set('address', searchAddress);
    }
    if (searchId) {
      // Hiro supports filtering by inscription ID via the id[] param
      url.searchParams.set('id', searchId);
    }
    if (searchMimeType) {
      url.searchParams.set('mime_type', searchMimeType);
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    // Use Hiro API key if available for higher rate limits
    const apiKey = process.env.HIRO_API_KEY;
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
      next: { revalidate: 30 }, // ISR: revalidate every 30 seconds
    });
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

    const inscriptions = (Array.isArray(data.results) ? data.results : []).map((item: Record<string, unknown>) => ({
      id: item.id,
      number: item.number,
      content_type: item.content_type,
      content_length: item.content_length,
      // Hiro returns timestamp as UNIX seconds; convert to milliseconds for the frontend
      timestamp: typeof item.timestamp === 'number'
        ? ((item.timestamp as number) < 1e12 ? (item.timestamp as number) * 1000 : item.timestamp)
        : item.timestamp,
      genesis_block_height: item.genesis_block_height,
      genesis_block_hash: item.genesis_block_hash,
      genesis_tx_id: item.genesis_tx_id,
      genesis_fee: item.genesis_fee,
      genesis_timestamp: item.genesis_timestamp,
      genesis_address: item.genesis_address,
      output_value: item.output_value,
      address: item.address || item.genesis_address,
      sat_ordinal: item.sat_ordinal,
      sat_rarity: item.sat_rarity,
      mime_type: item.mime_type,
      curse_type: item.curse_type,
      recursive: item.recursive || false,
      recursion_refs: item.recursion_refs || null,
      tx_id: item.tx_id,
      location: item.location,
      value: item.value,
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
      { success: false, error: 'Failed to fetch inscriptions', message: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
