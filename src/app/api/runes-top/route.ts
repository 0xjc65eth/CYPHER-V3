import { NextResponse } from 'next/server'

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000; // 60 seconds

export async function GET() {
  try {
    // Check cache first
    const cached = cache.get('runes-top');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT' },
      });
    }


    // Strategy 1: Try Magic Eden collection stats (has real market data)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const meHeaders: Record<string, string> = { 'Accept': 'application/json' };
      const meApiKey = process.env.MAGICEDEN_API_KEY;
      if (meApiKey) meHeaders['Authorization'] = `Bearer ${meApiKey}`;
      const meRes = await fetch(
        'https://api-mainnet.magiceden.dev/v2/ord/btc/runes/collection_stats/search?window=1d&sort=volume24h&direction=desc&offset=0&limit=30',
        { headers: meHeaders, signal: controller.signal }
      );
      clearTimeout(timeout);

      if (meRes.ok) {
        const meData = await meRes.json();
        const runes = Array.isArray(meData) ? meData : meData.results || [];
        if (runes.length > 0) {
          const processed = runes.map((r: any, index: number) => ({
            rank: index + 1,
            name: r.rune?.replace(/[•]/g, '') || '',
            formatted_name: r.rune || '',
            price: r.floorUnitPrice ? (typeof r.floorUnitPrice === 'object' ? r.floorUnitPrice.value || 0 : r.floorUnitPrice) / 1e8 : 0,
            price_usd: 0,
            volume_24h: r.volume24h || r.volume || 0,
            market_cap: r.marketCap || 0,
            holders: r.holders || r.ownerCount || 0,
            supply: r.totalSupply || 0,
            change_24h: r.priceChange24h || r.volumeChange || 0,
            verified: true,
            source: 'magiceden',
          }));

          cache.set('runes-top', { data: processed, timestamp: Date.now() });
          return NextResponse.json(processed);
        }
      }
    } catch (error) {
    }

    // Strategy 2: Try Hiro API sorted by total mints
    try {
      const apiKey = process.env.HIRO_API_KEY;
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (apiKey) {
        headers['x-hiro-api-key'] = apiKey;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const hiroRes = await fetch(
        'https://api.hiro.so/runes/v1/etchings?limit=30&offset=0',
        { headers, signal: controller.signal }
      );
      clearTimeout(timeout);

      if (hiroRes.ok) {
        const hiroData = await hiroRes.json();
        const results = hiroData.results || [];

        const processed = results.map((rune: any, index: number) => {
          const supply = rune.supply || {};
          return {
            rank: index + 1,
            name: rune.name || '',
            formatted_name: rune.spaced_name || rune.name || '',
            price: 0,
            price_usd: 0,
            volume_24h: 0,
            market_cap: 0,
            holders: 0,
            supply: supply.current || supply.total || '0',
            change_24h: 0,
            verified: true,
            source: 'hiro',
          };
        });

        cache.set('runes-top', { data: processed, timestamp: Date.now() });
        return NextResponse.json(processed);
      }
    } catch (error) {
    }

    // All sources failed - return structured error
    console.error('All runes-top data sources failed');
    return NextResponse.json({
      error: 'Failed to fetch top runes data from all sources',
      sources_tried: ['magiceden', 'hiro'],
      timestamp: Date.now(),
    }, { status: 502 });
  } catch (error) {
    console.error('Error in runes-top API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top runes data' },
      { status: 500 }
    );
  }
}
