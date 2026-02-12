import { NextResponse } from 'next/server';

// Well-known popular runes (name format for Hiro API - no bullets)
// Verified rune names that exist in Hiro API (tested 2025-06)
const POPULAR_RUNE_NAMES = [
  'UNCOMMONGOODS',
  'DOGGOTOTHEMOON',
  'SATOSHINAKAMOTO',
  'RSICGENESISRUNE',
  'THERUNIXTOKEN',
  'MEMEECONOMICS',
  'WANKOMANKORUNES',
  'BILLIONDOLLARCAT',
  'BITCOINPUPPETS',
  'MAGICINTERNETMONEY',
  'PEPETHEFROG',
  'TESLARUNE',
  'THEBITCOINRUNE',
  'DECENTRALIZED',
  'TOTHEMOON',
  'GENERATIVERUNES',
  'RUNESTOKEN',
  'NEUTRON',
  'NIRVANA',
  'NUCLEAR',
  'NETWORK',
  'NETFLIX',
  'NEWYORK',
  'PIRELLI',
  'RUSSIAN',
  'STEROID',
  'NOTHING',
  'ZATOSHI',
  'OCTOPUS',
  'OCTAGON',
];

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 90_000; // 90 seconds

async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;
  const promise = fetcher().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

// Fetch a single rune from Hiro by name
async function fetchRuneByName(name: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.hiro.so/runes/v1/etchings/${name}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Normalize Hiro rune data to our format
function normalizeHiroRune(r: any): any {
  const supply = r.supply || {};
  const location = r.location || {};
  // Hiro individual endpoint uses 'divisibility', batch uses 'decimals'
  const decimals = r.divisibility ?? r.decimals ?? 0;
  // timestamp may come from root, location, or not at all
  const ts = r.timestamp || (location.timestamp && location.timestamp > 0 ? location.timestamp : null);
  return {
    id: r.id,
    name: r.name,
    spaced_name: r.spaced_name || r.name,
    symbol: r.symbol || '◆',
    number: r.number,
    decimals,
    supply: supply.current || supply.total || '0',
    burned: supply.burned || '0',
    premine: supply.premine || '0',
    mint_terms: r.mint_terms,
    turbo: r.turbo || false,
    timestamp: ts ? new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts).toISOString() : null,
    etching_tx_id: r.etching_tx_id || location.tx_id || null,
    etching_block_height: r.etching_block_height || location.block_height || null,
    holders: null,
    mintable: supply.mintable || false,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '60'), 60);
    const cacheKey = `popular:${limit}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90', 'X-Cache': 'HIT' },
      });
    }

    const result = await deduplicatedFetch(cacheKey, async () => {
      // Strategy 1: Try Magic Eden first (has market data)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const meRes = await fetch(
          `https://api-mainnet.magiceden.dev/v2/ord/btc/runes/collection_stats/search?window=1d&sort=volume24h&direction=desc&offset=0&limit=${limit}`,
          { headers: { 'Accept': 'application/json' }, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (meRes.ok) {
          const meData = await meRes.json();
          const runes = Array.isArray(meData) ? meData : meData.results || [];
          if (runes.length > 0) {
            const processed = runes.map((r: any) => ({
              id: r.runeId || r.rune,
              name: r.rune?.replace(/•/g, ' ') || '',
              spaced_name: r.rune || '',
              symbol: r.symbol || '◆',
              number: r.runeNumber || null,
              decimals: r.divisibility || 0,
              supply: r.totalSupply?.toString() || '0',
              burned: '0',
              premine: '0',
              turbo: r.turbo || false,
              timestamp: null,
              holders: r.holders || 0,
              listed: r.listed || 0,
              floor_price_sats: r.floorUnitPrice || 0,
              market_cap_sats: r.marketCap || 0,
              volume_24h_sats: r.volume24h || 0,
              volume_7d_sats: r.volume7d || 0,
              price_change_24h: r.priceChange24h || 0,
              mintable: r.mintable || false,
              image_uri: r.imageURI || null,
            }));
            return { success: true, data: processed, total: processed.length, timestamp: Date.now(), source: 'magiceden' };
          }
        }
      } catch {
        // ME failed, fallback below
      }

      // Strategy 2: Fetch popular runes individually from Hiro (batched in groups of 5)
      const allRunes: any[] = [];
      const namesToFetch = POPULAR_RUNE_NAMES.slice(0, limit);

      for (let i = 0; i < namesToFetch.length; i += 5) {
        const batch = namesToFetch.slice(i, i + 5);
        const results = await Promise.all(batch.map(fetchRuneByName));
        for (const r of results) {
          if (r && r.name) {
            allRunes.push(normalizeHiroRune(r));
          }
        }
        // Small delay between batches to be nice to Hiro
        if (i + 5 < namesToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (allRunes.length > 0) {
        return { success: true, data: allRunes, total: allRunes.length, timestamp: Date.now(), source: 'hiro-popular' };
      }

      // Strategy 3: Fallback to standard Hiro list
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const hRes = await fetch(`https://api.hiro.so/runes/v1/etchings?limit=${limit}&offset=0`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!hRes.ok) throw new Error(`Hiro API error: ${hRes.status}`);
      const hData = await hRes.json();
      const results = (hData.results || []).map((item: any) => {
        const supply = item.supply as any;
        return {
          id: item.id, name: item.name, spaced_name: item.spaced_name,
          number: item.number, symbol: item.symbol, decimals: item.divisibility,
          supply: supply?.current || '0', burned: supply?.burned || '0',
          premine: supply?.premine || '0', mint_terms: item.mint_terms,
          turbo: item.turbo, timestamp: item.timestamp, holders: null,
        };
      });

      return { success: true, data: results, total: hData.total || 0, timestamp: Date.now(), source: 'hiro' };
    });

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90', 'X-Cache': 'MISS' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Runes popular API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch popular runes', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
