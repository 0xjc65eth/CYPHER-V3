import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 60);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
    if (process.env.HIRO_API_KEY) hiroHeaders['x-hiro-api-key'] = process.env.HIRO_API_KEY;

    // Fetch runes sorted by recent activity (most recently etched first as proxy for trending)
    const response = await fetch(
      `https://api.hiro.so/runes/v1/etchings?limit=${limit}&order=desc`,
      {
        headers: hiroHeaders,
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
    const runes = data.results || [];

    // Enrich with holder counts in parallel (best effort)
    const enrichedRunes = await Promise.all(
      runes.slice(0, limit).map(async (rune: Record<string, unknown>) => {
        let holders = null;
        try {
          const encodedName = encodeURIComponent(rune.name as string);
          const hController = new AbortController();
          const hTimeout = setTimeout(() => hController.abort(), 5000);
          const hRes = await fetch(
            `https://api.hiro.so/runes/v1/etchings/${encodedName}/holders?limit=1`,
            { headers: { 'Accept': 'application/json' }, signal: hController.signal }
          );
          clearTimeout(hTimeout);
          if (hRes.ok) {
            const hData = await hRes.json();
            holders = hData.total || null;
          }
        } catch {
          // Non-critical
        }

        // Extract supply from nested object structure
        const supply = rune.supply as any;
        const supplyValue = supply?.current || supply?.total || supply || '0';
        const supplyNum = parseFloat(supplyValue) || 0;

        // Price/volume data not available from Hiro etchings endpoint
        const floorPriceBtc = 0;
        const volume24h = 0;
        const marketCap = 0;

        return {
          id: rune.id,
          name: rune.name,
          spaced_name: rune.spaced_name,
          number: rune.number,
          symbol: rune.symbol,
          decimals: rune.decimals,
          supply: supplyValue,
          burned: supply?.burned || rune.burned || '0',
          premine: supply?.premine || rune.premine || '0',
          turbo: rune.turbo,
          timestamp: rune.timestamp,
          etching_block_height: rune.etching_block_height,
          holders,
          volume_24h: volume24h,
          market_cap: marketCap,
          price_change_24h: 0,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: enrichedRunes,
        total: data.total || 0,
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
    console.error('Runes trending API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending runes', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
