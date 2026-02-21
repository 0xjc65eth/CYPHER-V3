import { NextResponse } from 'next/server';

/**
 * /api/runes/market-overview
 *
 * ONLY REAL DATA - NO MOCKS
 * Priority: Magic Eden → UniSat → OKX → Ordiscan → Empty array
 */

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100);
    const cacheKey = `market-overview:${limit}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90',
          'X-Cache': 'HIT'
        },
      });
    }

    const result = await deduplicatedFetch(cacheKey, async () => {
      // STRATEGY 1: Magic Eden (has price + volume data)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const meRes = await fetch(
          `https://api-mainnet.magiceden.dev/v2/ord/btc/runes/collection_stats/search?window=1d&sort=volume24h&direction=desc&offset=0&limit=${limit}`,
          {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (meRes.ok) {
          const meData = await meRes.json();
          const runes = Array.isArray(meData) ? meData : meData.results || [];

          if (runes.length > 0) {

            const enrichedRunes = runes.map((r: any, idx: number) => {
              const supply = parseFloat(r.totalSupply?.toString() || '0');
              const floorPrice = parseFloat(r.floorUnitPrice?.toString() || '0');
              const volume24h = parseFloat(r.volume24h?.toString() || '0');
              const holders = r.holders || 0;
              const listed = r.listed || 0;
              const marketCap = floorPrice * supply;

              return {
                id: r.runeId || `${r.rune}-${idx}`,
                name: r.rune?.replace(/•/g, '') || '',
                spaced_name: r.rune || '',
                number: r.runeNumber || idx + 1,
                symbol: r.symbol || '◆',
                decimals: r.divisibility || 0,
                supply: r.totalSupply?.toString() || '0',
                burned: '0',
                premine: '0',
                holders,
                listed,
                transactions: 0,
                floorPrice,
                volume24h,
                volume7d: parseFloat(r.volume7d?.toString() || '0'),
                sales24h: 0,
                marketCap,
                change24h: parseFloat(r.priceChange24h?.toString() || '0'),
                turbo: r.turbo || false,
                mintable: r.mintable || false,
                image_uri: r.imageURI || null,
                timestamp: null,
                etching_tx_id: null,
                etching_block_height: null,
                mint_terms: null,
              };
            });

            const stats = {
              totalRunes: enrichedRunes.length,
              totalHolders: enrichedRunes.reduce((sum, r) => sum + r.holders, 0),
              totalVolume24h: enrichedRunes.reduce((sum, r) => sum + r.volume24h, 0),
              totalMarketCap: enrichedRunes.reduce((sum, r) => sum + r.marketCap, 0),
              turboRunes: enrichedRunes.filter(r => r.turbo).length,
              activeListings: enrichedRunes.reduce((sum, r) => sum + r.listed, 0),
            };

            return {
              success: true,
              data: enrichedRunes,
              stats,
              total: enrichedRunes.length,
              timestamp: Date.now(),
              source: 'magiceden'
            };
          }
        }

      } catch (error: any) {
        console.error('[market-overview] ❌ Magic Eden error:', error.message);
      }

      // STRATEGY 2: UniSat (has holder data, no prices)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const unisatRes = await fetch(
          `https://open-api.unisat.io/v1/indexer/runes/info-list?start=0&limit=${limit}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Client': 'UniSat Wallet'
            },
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (unisatRes.ok) {
          const unisatData = await unisatRes.json();
          const runes = unisatData?.data?.detail || [];

          if (runes.length > 0) {

            const enrichedRunes = runes.map((r: any, idx: number) => ({
              id: r.runeid || `unisat-${idx}`,
              name: r.rune || '',
              spaced_name: r.spacedRune || r.rune || '',
              number: r.number || idx + 1,
              symbol: r.symbol || '◆',
              decimals: r.divisibility || 0,
              supply: r.supply || '0',
              burned: r.burned || '0',
              premine: r.premine || '0',
              holders: r.holders || 0,
              listed: 0,
              transactions: r.transactions || 0,
              floorPrice: 0, // UniSat doesn't provide price
              volume24h: 0,
              volume7d: 0,
              sales24h: 0,
              marketCap: 0,
              change24h: 0,
              turbo: false,
              mintable: r.mintable || false,
              image_uri: null,
              timestamp: r.timestamp ? new Date(r.timestamp * 1000).toISOString() : null,
              etching_tx_id: r.etching || null,
              etching_block_height: r.height || null,
              mint_terms: r.terms,
            }));

            const stats = {
              totalRunes: enrichedRunes.length,
              totalHolders: enrichedRunes.reduce((sum, r) => sum + r.holders, 0),
              totalVolume24h: 0,
              totalMarketCap: 0,
              turboRunes: 0,
              activeListings: 0,
            };

            return {
              success: true,
              data: enrichedRunes,
              stats,
              total: enrichedRunes.length,
              timestamp: Date.now(),
              source: 'unisat'
            };
          }
        }

      } catch (error: any) {
        console.error('[market-overview] ❌ UniSat error:', error.message);
      }

      // STRATEGY 3: OKX (if available)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        // OKX Runes endpoint (public API)
        const okxRes = await fetch(
          `https://www.okx.com/api/v5/mktdata/runes/markets?limit=${limit}`,
          {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (okxRes.ok) {
          const okxData = await okxRes.json();
          const runes = okxData?.data || [];

          if (runes.length > 0) {

            const enrichedRunes = runes.map((r: any, idx: number) => ({
              id: r.runeId || `okx-${idx}`,
              name: r.runeName || '',
              spaced_name: r.runeName || '',
              number: idx + 1,
              symbol: r.symbol || '◆',
              decimals: r.decimals || 0,
              supply: r.totalSupply || '0',
              burned: '0',
              premine: '0',
              holders: r.holders || 0,
              listed: r.listings || 0,
              transactions: 0,
              floorPrice: parseFloat(r.floorPrice || '0'),
              volume24h: parseFloat(r.volume24h || '0'),
              volume7d: parseFloat(r.volume7d || '0'),
              sales24h: r.sales24h || 0,
              marketCap: parseFloat(r.marketCap || '0'),
              change24h: parseFloat(r.priceChange24h || '0'),
              turbo: false,
              mintable: false,
              image_uri: null,
              timestamp: null,
              etching_tx_id: null,
              etching_block_height: null,
              mint_terms: null,
            }));

            const stats = {
              totalRunes: enrichedRunes.length,
              totalHolders: enrichedRunes.reduce((sum, r) => sum + r.holders, 0),
              totalVolume24h: enrichedRunes.reduce((sum, r) => sum + r.volume24h, 0),
              totalMarketCap: enrichedRunes.reduce((sum, r) => sum + r.marketCap, 0),
              turboRunes: 0,
              activeListings: enrichedRunes.reduce((sum, r) => sum + r.listed, 0),
            };

            return {
              success: true,
              data: enrichedRunes,
              stats,
              total: enrichedRunes.length,
              timestamp: Date.now(),
              source: 'okx'
            };
          }
        }

      } catch (error: any) {
        console.error('[market-overview] ❌ OKX error:', error.message);
      }

      // STRATEGY 4: Ordiscan (alternative indexer)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const ordiscanRes = await fetch(
          `https://ordiscan.com/api/runes?limit=${limit}&sort=volume`,
          {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (ordiscanRes.ok) {
          const ordiscanData = await ordiscanRes.json();
          const runes = ordiscanData?.runes || [];

          if (runes.length > 0) {

            const enrichedRunes = runes.map((r: any, idx: number) => ({
              id: r.id || `ordiscan-${idx}`,
              name: r.name || '',
              spaced_name: r.spacedName || r.name || '',
              number: r.number || idx + 1,
              symbol: r.symbol || '◆',
              decimals: r.decimals || 0,
              supply: r.supply || '0',
              burned: r.burned || '0',
              premine: r.premine || '0',
              holders: r.holders || 0,
              listed: 0,
              transactions: r.transactions || 0,
              floorPrice: parseFloat(r.floorPrice || '0'),
              volume24h: parseFloat(r.volume24h || '0'),
              volume7d: parseFloat(r.volume7d || '0'),
              sales24h: 0,
              marketCap: parseFloat(r.marketCap || '0'),
              change24h: parseFloat(r.priceChange || '0'),
              turbo: r.turbo || false,
              mintable: r.mintable || false,
              image_uri: null,
              timestamp: r.timestamp || null,
              etching_tx_id: r.etchingTx || null,
              etching_block_height: r.etchingBlock || null,
              mint_terms: null,
            }));

            const stats = {
              totalRunes: enrichedRunes.length,
              totalHolders: enrichedRunes.reduce((sum, r) => sum + r.holders, 0),
              totalVolume24h: enrichedRunes.reduce((sum, r) => sum + r.volume24h, 0),
              totalMarketCap: enrichedRunes.reduce((sum, r) => sum + r.marketCap, 0),
              turboRunes: enrichedRunes.filter(r => r.turbo).length,
              activeListings: 0,
            };

            return {
              success: true,
              data: enrichedRunes,
              stats,
              total: enrichedRunes.length,
              timestamp: Date.now(),
              source: 'ordiscan'
            };
          }
        }

      } catch (error: any) {
        console.error('[market-overview] ❌ Ordiscan error:', error.message);
      }

      // ALL APIS FAILED - Return empty data
      return {
        success: false,
        data: [],
        stats: {
          totalRunes: 0,
          totalHolders: 0,
          totalVolume24h: 0,
          totalMarketCap: 0,
          turboRunes: 0,
          activeListings: 0,
        },
        total: 0,
        timestamp: Date.now(),
        source: 'none',
        error: 'All API sources failed'
      };
    });

    // Cache the result (even empty results to prevent spam)
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90',
        'X-Cache': 'MISS'
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[market-overview] ❌ Fatal error:', message);

    return NextResponse.json(
      {
        success: false,
        data: [],
        stats: {
          totalRunes: 0,
          totalHolders: 0,
          totalVolume24h: 0,
          totalMarketCap: 0,
          turboRunes: 0,
          activeListings: 0,
        },
        total: 0,
        timestamp: Date.now(),
        source: 'error',
        error: message
      },
      {
        status: 200, // Return 200 to prevent UI errors
        headers: { 'Cache-Control': 'public, max-age=30' }
      }
    );
  }
}
