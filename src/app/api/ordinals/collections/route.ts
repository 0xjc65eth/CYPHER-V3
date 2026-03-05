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
    let source = '';

    // Primary: Best-in-Slot API (most comprehensive ordinals collection data)
    const bisApiKey = process.env.BESTINSLOT_API_KEY;
    if (bisApiKey && data.length === 0) {
      try {
        const bisSortMap: Record<string, string> = {
          'volume7d': 'vol_7d_in_btc',
          'volume24h': 'vol_24h_in_btc',
          'floorPrice': 'floor_price',
          'newest': 'median_number',
        };
        const bisSort = bisSortMap[sort] || 'vol_7d_in_btc';
        const bisRes = await fetchWithTimeout(
          `https://api.bestinslot.xyz/v3/collection/collections?sort_by=${bisSort}&order=desc&offset=0&count=${limit}`,
          { 'x-api-key': bisApiKey, 'Accept': 'application/json' },
          8000
        );
        if (bisRes.ok) {
          const bisData = await bisRes.json();
          const collections = bisData.data || bisData.collections || bisData;
          if (Array.isArray(collections) && collections.length > 0) {
            data = collections.map((c: Record<string, unknown>) => ({
              name: c.collection_name || c.name || 'Unknown',
              slug: c.slug || c.collection_slug || '',
              symbol: c.slug || '',
              imageURI: c.icon || c.image || c.logo || '',
              floorPrice: c.floor_price,
              volume7d: c.vol_7d_in_btc,
              volume24h: c.vol_24h_in_btc,
              supply: c.inscription_count || c.total_supply || 0,
              listed: c.listed_count || null,
              owners: c.owner_count || null,
              description: '',
              marketCap: c.marketcap || null,
            }));
            source = 'bestinslot';
          }
        }
      } catch {
        // BIS failed, continue to fallbacks
      }
    }

    // Fallback 1: UniSat Marketplace API (POST endpoint)
    const unisatApiKey = process.env.UNISAT_API_KEY;
    if (unisatApiKey && data.length === 0) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const unisatRes = await fetch(
            'https://open-api.unisat.io/v3/market/collection/auction/collection_statistic_list',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${unisatApiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ start: 0, limit, sort: {} }),
              signal: controller.signal,
            }
          );
          if (unisatRes.ok) {
            const unisatData = await unisatRes.json();
            if (unisatData.code === 0 || unisatData.code === '0') {
              const list = unisatData.data?.list || unisatData.data || [];
              if (Array.isArray(list) && list.length > 0) {
                data = list.slice(0, limit).map((c: Record<string, unknown>) => ({
                  name: c.name || c.collectionName || 'Unknown',
                  slug: c.collectionId || c.slug || '',
                  symbol: c.collectionId || '',
                  imageURI: c.icon || c.logoUrl || c.imageUrl || '',
                  floorPrice: c.floorPrice,
                  volume7d: c.volume7d || null,
                  volume24h: c.volume24h || null,
                  supply: c.totalSupply || c.supply || 0,
                  listed: c.listedCount || null,
                  owners: c.ownerCount || null,
                  description: c.description || '',
                }));
                source = 'unisat';
              }
            }
          }
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        // UniSat failed, continue to fallbacks
      }
    }

    // Fallback 2: OKX Ordinals API
    if (data.length === 0) {
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
      } catch {
        // OKX failed, continue to fallbacks
      }
    }

    // Fallback 3: Ordiscan API (metadata only, limited pricing)
    const ordiscanApiKey = process.env.ORDISCAN_API_KEY;
    if (ordiscanApiKey && data.length === 0) {
      try {
        const ordiscanRes = await fetchWithTimeout(
          'https://ordiscan.com/api/v1/collections',
          { 'Authorization': `Bearer ${ordiscanApiKey}`, 'Accept': 'application/json' },
          8000
        );
        if (ordiscanRes.ok) {
          const ordiscanData = await ordiscanRes.json();
          const collections = ordiscanData.collections || ordiscanData.data || ordiscanData;
          if (Array.isArray(collections) && collections.length > 0) {
            data = collections.slice(0, limit).map((c: Record<string, unknown>) => ({
              name: c.name || 'Unknown',
              slug: c.slug || '',
              symbol: c.slug || '',
              imageURI: c.icon || c.image || '',
              floorPrice: null,
              volume7d: null,
              volume24h: null,
              supply: c.item_count || c.supply || 0,
              listed: null,
              owners: null,
              description: c.description || '',
            }));
            source = 'ordiscan';
          }
        }
      } catch {
        // Ordiscan failed
      }
    }

    // Last resort: Hiro inscriptions grouped by content_type
    if (data.length === 0) {
      try {
        const hiroHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) hiroHeaders['x-hiro-api-key'] = hiroApiKey;

        const hiroRes = await fetchWithTimeout(
          'https://api.hiro.so/ordinals/v1/inscriptions?limit=60&order=desc',
          hiroHeaders
        );
        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          const grouped: Record<string, { count: number; totalFees: number }> = {};
          for (const item of hiroData.results || []) {
            const ins = item as Record<string, unknown>;
            const ct = ins.content_type as string || 'unknown';
            if (!grouped[ct]) grouped[ct] = { count: 0, totalFees: 0 };
            grouped[ct].count++;
            const feeStr = ins.genesis_fee as string | number;
            const fee = typeof feeStr === 'string' ? parseInt(feeStr, 10) : (feeStr || 0);
            grouped[ct].totalFees += (isNaN(fee) ? 0 : fee);
          }
          data = Object.entries(grouped)
            .filter(([, info]) => info.count >= 3)
            .map(([contentType, info]) => {
              const avgFee = info.totalFees > 0 ? Math.floor(info.totalFees / info.count) : null;
              return {
                name: `${contentType} inscriptions`,
                content_type: contentType,
                floorPrice: avgFee,
                volume7d: null,
                volume24h: null,
                supply: info.count,
                listed: null,
                owners: null,
              };
            });
          source = 'hiro_grouped';
        }
      } catch {
        // All sources failed
      }
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No collection data available from any source' },
        { status: 502, headers: { 'Cache-Control': 'no-cache' } }
      );
    }

    const collections = (data as Record<string, unknown>[]).map((item) => {
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
      const floorPrice = parseNumeric(item.floorPrice ?? item.fp ?? item.floor_price);
      const floorPriceSats = floorPrice !== null
        ? (floorPrice < 1 ? Math.round(floorPrice * 1e8) : floorPrice)
        : null;

      const volume7d = parseNumeric(item.volume7d ?? item.totalVol ?? item.total_volume);
      const volume7dSats = volume7d !== null
        ? (volume7d < 100 ? Math.round(volume7d * 1e8) : volume7d)
        : null;

      const volume24h = parseNumeric(item.volume24h ?? item.volume_1d);
      const volume24hSats = volume24h !== null
        ? (volume24h < 100 ? Math.round(volume24h * 1e8) : volume24h)
        : null;

      const listed = parseNumeric(item.listed ?? item.listedCount ?? item.listed_count);
      const supply = parseNumeric(item.supply ?? item.totalSupply ?? item.total_supply);
      const owners = parseNumeric(item.owners ?? item.ownerCount ?? item.owner_count);

      return {
        name: item.name || item.collectionName || item.symbol || 'Unknown',
        slug: item.slug || item.collectionSymbol || item.symbol || '',
        imageURI: item.imageURI || item.image || item.imageUrl || item.icon || '',
        floorPrice: floorPriceSats,
        volume7d: volume7dSats,
        volume24h: volume24hSats,
        listed: listed !== null ? Math.floor(listed) : null,
        supply: supply !== null ? Math.floor(supply) : null,
        owners: owners !== null ? Math.floor(owners) : null,
        description: item.description || '',
        ...(item.marketCap ? { marketCap: parseNumeric(item.marketCap) } : {}),
        ...(item.change24h ? { change24h: item.change24h } : {}),
        ...(item.change7d ? { change7d: item.change7d } : {}),
        ...(item.content_type ? { content_type: item.content_type } : {}),
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
