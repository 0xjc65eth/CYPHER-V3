import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

/**
 * Ordinals Activity API — OKX primary, ME/Ordiscan/Hiro fallbacks
 * Returns normalized activity data (listings, sales, inscriptions)
 */

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60);
    if (rateLimitRes) return rateLimitRes;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const kind = searchParams.get('kind') || '';

    // Validate 'kind' parameter against allowlist to prevent parameter injection
    const VALID_KINDS = ['listing', 'sale', 'cancel_listing', 'buying_broadcasted'];
    if (kind && !VALID_KINDS.includes(kind)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid kind parameter',
          validKinds: VALID_KINDS
        },
        { status: 400 }
      );
    }

    // Primary: Try OKX marketplace activity first
    let data: unknown[] | null = null;
    let source = 'okx';

    try {
      const okxController = new AbortController();
      const okxTimeout = setTimeout(() => okxController.abort(), 10000);
      try {
        const okxRes = await fetch(
          `https://www.okx.com/api/v5/mktplace/nft/ordinals/trade-activities?limit=${limit}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CYPHER-ORDi-Future-V3',
            },
            signal: okxController.signal,
          }
        );
        if (okxRes.ok) {
          const okxData = await okxRes.json();
          const activities = okxData.data?.activities || okxData.data || [];
          if (Array.isArray(activities) && activities.length > 0) {
            data = activities.map((item: Record<string, unknown>) => ({
              kind: item.type || item.action || 'sale',
              tokenId: item.inscriptionId || item.inscription_id || item.nftId || '',
              inscriptionNumber: item.inscriptionNumber || item.number || null,
              collectionSymbol: String(item.collectionSymbol || item.slug || ''),
              listedPrice: item.price ? Math.round(Number(item.price) * 1e8) : null,
              price: item.price ? Math.round(Number(item.price) * 1e8) : null,
              seller: String(item.from || item.seller || ''),
              buyer: String(item.to || item.buyer || ''),
              createdAt: item.timestamp ? new Date(Number(item.timestamp)).toISOString() : new Date().toISOString(),
              txId: item.txId || item.txHash || '',
            }));
          }
        }
      } finally {
        clearTimeout(okxTimeout);
      }
    } catch (error) {
      // OKX failed, continue to fallbacks
    }

    // Fallback 1: Hiro recent inscriptions
    if (!data || data.length === 0) {
      const hiroController = new AbortController();
      const hiroTimeout = setTimeout(() => hiroController.abort(), 10000);
      try {
        const hiroHeaders: Record<string, string> = {
          'Accept': 'application/json',
        };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) {
          hiroHeaders['x-hiro-api-key'] = hiroApiKey;
        }

        const hiroRes = await fetch(
          `https://api.hiro.so/ordinals/v1/inscriptions?limit=${limit}&order=desc&order_by=genesis_block_height`,
          {
            headers: hiroHeaders,
            signal: hiroController.signal,
          }
        );
        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          data = (Array.isArray(hiroData.results) ? hiroData.results : []).map((item: Record<string, unknown>) => ({
            kind: 'inscription',
            tokenId: item.id,
            inscription_id: item.id,
            number: item.number,
            inscriptionNumber: item.number,
            content_type: item.content_type,
            genesis_block_height: item.genesis_block_height,
            createdAt: typeof item.genesis_timestamp === 'number'
              ? new Date((item.genesis_timestamp as number) < 1e12 ? (item.genesis_timestamp as number) * 1000 : (item.genesis_timestamp as number)).toISOString()
              : undefined,
            timestamp: item.genesis_timestamp,
            tx_id: item.tx_id,
            listedPrice: typeof item.genesis_fee === 'string' ? parseInt(item.genesis_fee as string) : null,
            price: typeof item.genesis_fee === 'string' ? parseInt(item.genesis_fee as string) : null,
            address: item.address || item.genesis_address,
          }));
          if (data && data.length > 0) source = 'hiro';
        }
      } catch (error) {
        // Hiro failed, continue to next fallback
      } finally {
        clearTimeout(hiroTimeout);
      }
    }

    // Fallback 2: Ordiscan API
    if (!data || data.length === 0) {
      const ORDISCAN_API_KEY = process.env.ORDISCAN_API_KEY;
      const ordController = new AbortController();
      const ordTimeout = setTimeout(() => ordController.abort(), 10000);
      try {
        const ordiscanHeaders: Record<string, string> = { 'Accept': 'application/json' };
        if (ORDISCAN_API_KEY) {
          ordiscanHeaders['Authorization'] = `Bearer ${ORDISCAN_API_KEY}`;
        }
        const ordiscanRes = await fetch(
          `https://api.ordiscan.com/v1/market/activity?limit=${limit}`,
          { headers: ordiscanHeaders, signal: ordController.signal }
        );
        if (ordiscanRes.ok) {
          const ordiscanData = await ordiscanRes.json();
          data = ordiscanData.data || ordiscanData.activities || [];
          if (data && data.length > 0) source = 'ordiscan';
        }
      } catch (error) {
        // Ordiscan failed, continue to next fallback
      } finally {
        clearTimeout(ordTimeout);
      }
    }

    // Return empty array with 200 instead of 502 when all sources fail
    // This allows the frontend to show "No recent activity" instead of an error
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          total: 0,
          timestamp: Date.now(),
          source: 'none',
          message: 'No activity data available from any source at this time',
        },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
      );
    }

    const activities = (data as Record<string, unknown>[]).map((item) => {
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

      // Extract seller and buyer addresses
      const seller = item.seller || item.from || item.fromAddress || item.oldOwner || item.old_owner || '';
      const buyer = item.buyer || item.to || item.toAddress || item.newOwner || item.new_owner || '';

      // Extract price and convert if needed
      let priceValue = parseNumeric(item.listedPrice ?? item.price ?? item.value ?? item.amount);
      if (priceValue !== null && priceValue < 1) {
        // Convert from BTC to satoshis if value is in BTC
        priceValue = Math.round(priceValue * 1e8);
      }

      // Extract timestamp - normalize to ISO string for the frontend
      const rawTimestamp = item.createdAt || item.timestamp || item.block_timestamp ||
                       item.blockTime || item.genesis_timestamp || null;
      let createdAt: string | null = null;
      if (rawTimestamp) {
        if (typeof rawTimestamp === 'string') {
          createdAt = rawTimestamp;
        } else if (typeof rawTimestamp === 'number') {
          // Convert UNIX seconds to ISO string
          const ms = rawTimestamp < 1e12 ? rawTimestamp * 1000 : rawTimestamp;
          createdAt = new Date(ms).toISOString();
        }
      }

      const collectionSymbol = String(item.collectionSymbol || item.collection_symbol || item.collection || item.collectionName || '');

      // Collection image - no longer hardcode ME URL
      const collectionImage: string | null = (item.collectionImage || item.collection_image || item.logoUrl || null) as string | null;

      return {
        kind: item.kind || item.type || kind || 'listing',
        tokenId: item.tokenId || item.token_id || item.inscription_id || item.inscriptionId || item.id || '',
        collectionSymbol,
        seller: String(seller),
        buyer: String(buyer),
        // Return both field names for compatibility with the frontend
        listedPrice: priceValue,
        price: priceValue,
        txId: item.txId || item.tx_id || item.txHash || '',
        blockHeight: item.blockHeight || item.block_height || item.genesis_block_height || null,
        createdAt,
        timestamp: rawTimestamp,
        inscriptionNumber: item.inscriptionNumber || item.inscription_number || item.number || null,
        collectionImage,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: activities,
        total: activities.length,
        timestamp: Date.now(),
        source,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ordinals activity API error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity', message: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
