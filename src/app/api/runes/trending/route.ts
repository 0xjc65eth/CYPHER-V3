import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 60);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Fetch runes sorted by recent activity (most recently etched first as proxy for trending)
    const response = await fetch(
      `https://api.hiro.so/runes/v1/etchings?limit=${limit}&order=desc`,
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
    const runes = data.results || [];

    // Fetch Magic Eden collection stats once (batch) for price enrichment
    let meStatsMap = new Map<string, any>();
    try {
      const meController = new AbortController();
      const meTimeout = setTimeout(() => meController.abort(), 8000);
      const meRes = await fetch(
        `https://api-mainnet.magiceden.dev/v2/ord/btc/runes/collection_stats/search?limit=100&sort=volume&window=1d`,
        { headers: { 'Accept': 'application/json' }, signal: meController.signal }
      );
      clearTimeout(meTimeout);
      if (meRes.ok) {
        const meData = await meRes.json();
        const stats = Array.isArray(meData) ? meData : [];
        for (const stat of stats) {
          if (stat.rune) meStatsMap.set(stat.rune, stat);
          if (stat.spacedRune) meStatsMap.set(stat.spacedRune, stat);
        }
      }
    } catch {
      // Non-critical - Magic Eden price data unavailable
    }

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

        // Look up real price from Magic Eden batch data
        let floorPriceBtc = 0;
        let volume24h = 0;
        const meMatch = meStatsMap.get(rune.name as string) ||
                        meStatsMap.get(rune.spaced_name as string);
        if (meMatch) {
          floorPriceBtc = (meMatch.floorUnitPrice || 0) / 100_000_000;
          volume24h = (meMatch.volume24h || meMatch.volume || 0) / 100_000_000;
        }

        const marketCap = floorPriceBtc * supplyNum;

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
          price_change_24h: meMatch?.priceChange24h || 0,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: enrichedRunes,
        total: data.total || 0,
        timestamp: Date.now(),
        source: 'hiro+magiceden',
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
