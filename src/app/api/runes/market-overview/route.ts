import { NextResponse } from 'next/server';
import { xverseAPI, type XverseRune } from '@/lib/api/xverse';

/**
 * /api/runes/market-overview
 *
 * ONLY REAL DATA - NO MOCKS
 * Priority: Xverse (has prices!) → Hiro → UniSat → OKX → Ordiscan → Empty
 *
 * Critical note: Hiro and UniSat have NO price data for Runes.
 * Xverse is the first source that provides floor price, market cap, and volume.
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL = 90_000; // 90 seconds

async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;
  const promise = fetcher().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

function formatRuneEntry(r: XverseRune, idx: number) {
  return {
    id: r.runeId || `xverse-${idx}`,
    name: r.runeName || '',
    spaced_name: r.spacedRuneName || r.runeName || '',
    number: r.runeNumber || idx + 1,
    symbol: r.symbol || '◆',
    decimals: r.divisibility || 0,
    supply: r.totalSupply || '0',
    burned: '0',
    premine: '0',
    holders: r.holders || 0,
    listed: 0,
    transactions: 0,
    floorPrice: r.floorPrice || 0,
    floorPriceUsd: r.floorPriceUsd || 0,
    volume24h: r.volume || 0,
    volume24hUsd: r.volumeUsd || 0,
    volume7d: 0,
    sales24h: 0,
    marketCap: r.marketCap || 0,
    marketCapUsd: r.marketCapUsd || 0,
    change24h: r.volumePercentChange || 0,
    turbo: false,
    mintable: r.mintable || false,
    image_uri: r.imageUrl || null,
    timestamp: null,
    etching_tx_id: null,
    etching_block_height: null,
    mint_terms: null,
  };
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
      // STRATEGY 0: Xverse API (primary — HAS real prices, market cap, volume)
      try {
        const xverseRunes = await xverseAPI.getTopRunes({ limit, timePeriod: '24h' });

        if (xverseRunes && xverseRunes.length > 0) {
          const enrichedRunes = xverseRunes.map(formatRuneEntry);

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
            source: 'xverse'
          };
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[market-overview] Xverse API error:', msg);
      }

      // STRATEGY 1: Hiro API (no prices, but has metadata)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        if (process.env.HIRO_API_KEY) hiroHeaders['x-hiro-api-key'] = process.env.HIRO_API_KEY;

        const hiroRes = await fetch(
          `https://api.hiro.so/runes/v1/etchings?limit=${limit}&offset=0`,
          { headers: hiroHeaders, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          const runes = hiroData.results || [];

          if (runes.length > 0) {
            const enrichedRunes = runes.map((r: Record<string, unknown>, idx: number) => {
              const supply = (r.supply || {}) as Record<string, unknown>;
              const supplyStr = (supply.current || supply.total || '0') as string;
              const decimals = (r.divisibility ?? r.decimals ?? 0) as number;
              const ts = r.timestamp as string | number | null;

              return {
                id: r.id || `hiro-${idx}`,
                name: r.name || '',
                spaced_name: r.spaced_name || r.name || '',
                number: r.number || idx + 1,
                symbol: r.symbol || '◆',
                decimals,
                supply: supplyStr,
                burned: supply.burned || '0',
                premine: supply.premine || '0',
                holders: 0,
                listed: 0,
                transactions: 0,
                floorPrice: 0,
                volume24h: 0,
                volume7d: 0,
                sales24h: 0,
                marketCap: 0,
                change24h: 0,
                turbo: r.turbo || false,
                mintable: supply.mintable || false,
                image_uri: null,
                timestamp: ts ? new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts).toISOString() : null,
                etching_tx_id: (r.location as Record<string, unknown>)?.tx_id || null,
                etching_block_height: (r.location as Record<string, unknown>)?.block_height || null,
                mint_terms: r.mint_terms || null,
              };
            });

            const stats = {
              totalRunes: enrichedRunes.length,
              totalHolders: 0,
              totalVolume24h: 0,
              totalMarketCap: 0,
              turboRunes: enrichedRunes.filter((r: { turbo: unknown }) => r.turbo).length,
              activeListings: 0,
            };

            return {
              success: true,
              data: enrichedRunes,
              stats,
              total: hiroData.total || enrichedRunes.length,
              timestamp: Date.now(),
              source: 'hiro'
            };
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[market-overview] Hiro API error:', msg);
      }

      // STRATEGY 2: OKX (has prices)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const okxRes = await fetch(
          `https://www.okx.com/api/v5/mktdata/runes/markets?limit=${limit}`,
          { headers: { 'Accept': 'application/json' }, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (okxRes.ok) {
          const okxData = await okxRes.json();
          const runes = okxData?.data || [];

          if (runes.length > 0) {
            const enrichedRunes = runes.map((r: Record<string, string | number>, idx: number) => ({
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
              floorPrice: parseFloat(String(r.floorPrice || '0')),
              volume24h: parseFloat(String(r.volume24h || '0')),
              volume7d: parseFloat(String(r.volume7d || '0')),
              sales24h: r.sales24h || 0,
              marketCap: parseFloat(String(r.marketCap || '0')),
              change24h: parseFloat(String(r.priceChange24h || '0')),
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
              totalHolders: enrichedRunes.reduce((sum: number, r: { holders: number }) => sum + r.holders, 0),
              totalVolume24h: enrichedRunes.reduce((sum: number, r: { volume24h: number }) => sum + r.volume24h, 0),
              totalMarketCap: enrichedRunes.reduce((sum: number, r: { marketCap: number }) => sum + r.marketCap, 0),
              turboRunes: 0,
              activeListings: enrichedRunes.reduce((sum: number, r: { listed: number }) => sum + r.listed, 0),
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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[market-overview] OKX error:', msg);
      }

      // ALL APIS FAILED
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

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90',
        'X-Cache': 'MISS'
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[market-overview] Fatal error:', message);

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
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=30' }
      }
    );
  }
}
