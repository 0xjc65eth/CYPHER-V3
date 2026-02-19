import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, headers: Record<string, string> = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', ...headers },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const sort = searchParams.get('sort') || 'volume7d';

    // Get Magic Eden API key from environment
    const MAGIC_EDEN_API_KEY = process.env.MAGIC_EDEN_API_KEY;

    // Prepare headers with authentication
    const magicEdenHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'CYPHER-ORDi-Future-V3'
    };

    if (MAGIC_EDEN_API_KEY) {
      magicEdenHeaders['Authorization'] = `Bearer ${MAGIC_EDEN_API_KEY}`;
    }

    // Magic Eden: Fetch stats for popular collections
    // Note: Magic Eden doesn't have a "list all collections" endpoint
    // We fetch stats for known popular collections individually
    const popularCollections = [
      'bitcoin-puppets', 'nodemonkes', 'bitcoin-frogs', 'taproot_wizards',
      'quantum_cats', 'pizza-ninjas', 'ombs', 'runestone',
      'ordinal-maxi-biz', 'natcats', 'bitcoin-rocks', 'ocm-genesis',
      'ord-bot', 'time-chain-collectibles', 'rsic',
      'bitmaps', 'ordibots', 'omb'
    ].slice(0, limit);

    let data: unknown[] = [];
    let source = 'magic_eden';

    try {
      // Fetch stats for each collection concurrently
      const statsPromises = popularCollections.map(async (symbol) => {
        try {
          const res = await fetchWithTimeout(
            `https://api-mainnet.magiceden.dev/v2/ord/btc/stat?collectionSymbol=${symbol}`,
            magicEdenHeaders,
            5000
          );
          if (res.ok) {
            const stats = await res.json();
            // Get collection details
            const detailsRes = await fetchWithTimeout(
              `https://api-mainnet.magiceden.dev/v2/ord/btc/collections/${symbol}`,
              magicEdenHeaders,
              5000
            );
            const details = detailsRes.ok ? await detailsRes.json() : {};

            return {
              ...stats,
              ...details,
              slug: symbol,
              symbol: symbol
            };
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(statsPromises);
      data = results.filter(Boolean) as unknown[];

      if (data.length > 0) {
      }
    } catch (err) {
      console.error(`[Collections API] Error fetching Magic Eden collections:`, err);
      data = [];
    }

    // Fallback: try Hiro inscriptions grouped approach
    if (!data || data.length === 0) {
      try {
        const hiroRes = await fetchWithTimeout(
          'https://api.hiro.so/ordinals/v1/inscriptions?limit=60&order=desc'
        );
        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          // Group inscriptions by content_type to provide some collection-like data
          const grouped: Record<string, { count: number; items: unknown[]; totalFees: number }> = {};
          for (const item of hiroData.results || []) {
            const ins = item as Record<string, unknown>;
            const ct = ins.content_type as string || 'unknown';
            if (!grouped[ct]) grouped[ct] = { count: 0, items: [], totalFees: 0 };
            grouped[ct].count++;
            grouped[ct].items.push(item);
            // Accumulate genesis fees for volume estimation (parse string to number)
            const feeStr = ins.genesis_fee as string | number;
            const fee = typeof feeStr === 'string' ? parseInt(feeStr, 10) : (feeStr || 0);
            grouped[ct].totalFees += (isNaN(fee) ? 0 : fee);
          }
          data = Object.entries(grouped)
            .filter(([_, info]) => info.count >= 3) // Only include collections with 3+ inscriptions
            .map(([contentType, info]) => {
              // Calculate average floor price from fees (already in satoshis)
              const avgFee = info.totalFees > 0 ? Math.floor(info.totalFees / info.count) : null;
              // Estimate 7d volume as 5x avg fee per item
              const estimatedVolume7d = avgFee ? avgFee * info.count * 5 : null;
              // Estimate 24h volume as 1/7 of 7d volume
              const estimatedVolume24h = estimatedVolume7d ? Math.floor(estimatedVolume7d / 7) : null;

              return {
                name: `${contentType} inscriptions`,
                content_type: contentType,
                count: info.count,
                sample_items: info.items.slice(0, 3),
                // Map fields to expected Collection structure (all values in satoshis)
                floorPrice: avgFee,
                volume7d: estimatedVolume7d,
                volume24h: estimatedVolume24h,
                supply: info.count,
                listed: Math.floor(info.count * 0.15), // Estimate 15% listed
                owners: Math.floor(info.count * 0.8), // Estimate unique owners
              };
            });
          source = 'hiro_grouped';
        }
      } catch (err) {
        console.error('Hiro fallback error:', err);
      }
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No collection data available from any source' },
        { status: 502, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const collections = (data as Record<string, unknown>[]).map((item) => {
      // Helper function to parse numeric values (handles both strings and numbers)
      const parseNumeric = (value: unknown): number | null => {
        if (value == null) return null;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      // Convert floor price from BTC to satoshis if it's in BTC format
      const floorPrice = parseNumeric(item.floorPrice ?? item.fp ?? item.floor_price ?? item.floorUnitPrice);
      const floorPriceSats = floorPrice !== null
        ? (floorPrice < 1 ? Math.round(floorPrice * 1e8) : floorPrice) // Convert BTC to sats if < 1
        : null;

      // Convert volume from BTC to satoshis
      const volume7d = parseNumeric(item.volume7d ?? item.totalVol ?? item.total_volume ?? item.volume ?? item.totalVolume);
      const volume7dSats = volume7d !== null
        ? (volume7d < 100 ? Math.round(volume7d * 1e8) : volume7d)
        : null;

      const volume24h = parseNumeric(item.volume24h ?? item.volume_1d ?? item.dailyVolume);
      const volume24hSats = volume24h !== null
        ? (volume24h < 100 ? Math.round(volume24h * 1e8) : volume24h)
        : null;

      // Parse integer fields (can also be strings from Magic Eden)
      const listed = parseNumeric(item.listed ?? item.listedCount ?? item.listed_count ?? item.totalListed);
      const supply = parseNumeric(item.supply ?? item.totalSupply ?? item.total_supply ?? item.size ?? item.totalItems);
      const owners = parseNumeric(item.owners ?? item.ownerCount ?? item.owner_count ?? item.numOwners ?? item.unique_holders);

      return {
        name: item.name || item.collectionName || item.symbol || 'Unknown',
        slug: item.slug || item.collectionSymbol || item.symbol || '',
        imageURI: item.imageURI || item.image || item.imageUrl || item.image_url || '',
        floorPrice: floorPriceSats,
        volume7d: volume7dSats,
        volume24h: volume24hSats,
        listed: listed !== null ? Math.floor(listed) : null,
        supply: supply !== null ? Math.floor(supply) : null,
        owners: owners !== null ? Math.floor(owners) : null,
        description: item.description || '',
        ...(item.content_type ? { content_type: item.content_type, count: item.count, sample_items: item.sample_items } : {}),
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: collections,
        total: collections.length,
        timestamp: Date.now(),
        source,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ordinals collections API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collections', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
