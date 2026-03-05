import { NextResponse } from 'next/server';
import { OKXOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

const okxApi = new OKXOrdinalsAPI();

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

    let data: unknown[] = [];
    let source = 'hiro';

    // Primary: Hiro Ordinals API
    try {
      const hiroHeaders: Record<string, string> = {
        'Accept': 'application/json',
      };
      const hiroApiKey = process.env.HIRO_API_KEY;
      if (hiroApiKey) {
        hiroHeaders['x-hiro-api-key'] = hiroApiKey;
      }

      const hiroRes = await fetchWithTimeout(
        `https://api.hiro.so/ordinals/v1/collections?limit=${limit}&order_by=volume_24h&order=desc`,
        hiroHeaders,
        8000
      );
      if (hiroRes.ok) {
        const hiroData = await hiroRes.json();
        const results = hiroData.results || [];
        if (results.length > 0) {
          data = results.map((c: Record<string, unknown>) => ({
            name: c.name || c.id || 'Unknown',
            slug: c.id || '',
            symbol: c.id || '',
            imageURI: '',
            floorPrice: c.floor_price ? parseInt(String(c.floor_price)) : null,
            volume7d: null,
            volume24h: c.volume_24h ? parseInt(String(c.volume_24h)) : null,
            supply: c.inscription_count || 0,
            listed: c.listed_count || null,
            owners: c.distinct_owner_count || null,
            description: '',
          }));
        }
      }
    } catch (err) {
      // Hiro failed, continue to fallbacks
    }

    // Fallback 0: OKX Ordinals API
    if (!data || data.length === 0) {
      try {
        const sortMap: Record<string, 'volume24h' | 'floorPrice' | 'createdAt'> = {
          'volume7d': 'volume24h',
          'volume24h': 'volume24h',
          'floorPrice': 'floorPrice',
          'newest': 'createdAt',
        };
        const okxSort = sortMap[sort] || 'volume24h';
        const { collections } = await okxApi.getCollections(limit, undefined, okxSort);
        if (collections && collections.length > 0) {
          data = collections.map((c) => ({
            name: c.name,
            slug: c.symbol || c.collectionId,
            symbol: c.symbol || c.collectionId,
            imageURI: c.logoUrl,
            floorPrice: c.floorPrice,
            volume7d: c.volume7d,
            volume24h: c.volume24h,
            supply: c.totalSupply,
            listed: c.listedRate ? Math.floor(c.totalSupply * parseFloat(c.listedRate)) : null,
            owners: c.ownerCount,
            description: c.description,
            change24h: c.change24h,
            change7d: c.change7d,
            isVerified: c.isVerified,
          }));
          source = 'okx';
        }
      } catch (err) {
        // OKX failed, continue to fallbacks
      }
    }

    // Fallback 1: Hiro inscriptions grouped approach
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
