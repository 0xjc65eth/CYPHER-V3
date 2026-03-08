import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

// -----------------------------------------------------------------------------
// In-memory cache to prevent rate limiting from Hiro API
// Multiple tabs/components request the same data simultaneously
// -----------------------------------------------------------------------------

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 45_000; // 45 seconds
const HOLDER_CACHE_TTL = 120_000; // 2 minutes for holder counts
const holderCache = new Map<string, { count: number | null; timestamp: number }>();

function getCached(key: string, ttl: number): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Deduplicate concurrent requests for the same key
async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });
  pendingRequests.set(key, promise);
  return promise;
}

// Fetch holders with its own cache and rate-limit safety
async function fetchHolderCount(name: string): Promise<number | null> {
  const cached = holderCache.get(name);
  if (cached && Date.now() - cached.timestamp < HOLDER_CACHE_TTL) {
    return cached.count;
  }

  try {
    const encodedName = encodeURIComponent(name);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://api.hiro.so/runes/v1/etchings/${encodedName}/holders?limit=1`,
      { headers: { 'Accept': 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const count = data.total || null;
      holderCache.set(name, { count, timestamp: Date.now() });
      return count;
    }
    // On 429, cache null to avoid hammering
    if (res.status === 429) {
      holderCache.set(name, { count: null, timestamp: Date.now() });
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60); if (rateLimitRes) return rateLimitRes;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 60);
    const offset = parseInt(searchParams.get('offset') || '0');
    const cacheKey = `runes-list:${limit}:${offset}`;

    // Check in-memory cache first
    const cached = getCached(cacheKey, CACHE_TTL);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-Cache': 'HIT',
        },
      });
    }

    // Deduplicate concurrent requests for same params
    const result = await deduplicatedFetch(cacheKey, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://api.hiro.so/runes/v1/etchings?limit=${limit}&offset=${offset}`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Hiro API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.results || [];

      // Enrich with holder counts — batch in groups of 5 to avoid rate limits
      const enrichedRunes = [];
      for (let i = 0; i < results.length; i += 5) {
        const batch = results.slice(i, i + 5);
        const enrichedBatch = await Promise.all(
          batch.map(async (item: Record<string, unknown>) => {
            const holders = await fetchHolderCount(item.name as string);

            const supply = item.supply as any;
            const location = item.location as any;
            const supplyValue = supply?.current || supply?.total || supply || '0';
            const burnedValue = supply?.burned || item.burned || '0';
            const premineValue = supply?.premine || item.premine || '0';
            // Hiro stores timestamp inside location object
            const rawTs = item.timestamp || (location?.timestamp && location.timestamp > 0 ? location.timestamp : null);
            const timestamp = rawTs
              ? new Date(typeof rawTs === 'number' && rawTs < 1e12 ? rawTs * 1000 : rawTs).toISOString()
              : null;

            return {
              id: item.id,
              name: item.name,
              spaced_name: item.spaced_name,
              number: item.number,
              symbol: item.symbol,
              decimals: item.divisibility ?? item.decimals ?? 0,
              supply: supplyValue,
              burned: burnedValue,
              premine: premineValue,
              mint_terms: item.mint_terms,
              turbo: item.turbo,
              timestamp,
              etching_tx_id: item.etching_tx_id || location?.tx_id || null,
              etching_block_height: item.etching_block_height || location?.block_height || null,
              holders,
            };
          })
        );
        enrichedRunes.push(...enrichedBatch);
      }

      return {
        success: true,
        data: enrichedRunes,
        total: data.total || 0,
        limit: data.limit || limit,
        offset: data.offset || offset,
        timestamp: Date.now(),
        source: 'hiro',
      };
    });

    // Store in cache
    setCache(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Runes list API error:', message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
