import { NextResponse } from 'next/server';

/**
 * Magic Eden API Activity Response Format:
 * [
 *   {
 *     kind: "listing" | "sale" | "cancel_listing" | "buying_broadcasted",
 *     tokenId: string,
 *     collectionSymbol: string,
 *     listedPrice: number (in satoshis),
 *     seller: string (Bitcoin address),
 *     buyer: string (Bitcoin address),
 *     createdAt: string (ISO timestamp),
 *     txId: string,
 *     inscriptionNumber: number
 *   }
 * ]
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const kind = searchParams.get('kind') || '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Get Magic Eden API key from environment
    const MAGIC_EDEN_API_KEY = process.env.MAGIC_EDEN_API_KEY;

    // Try Magic Eden activities endpoint with proper authentication
    // When no kind is specified, fetch all activity types (listings + sales)
    const kindParam = kind ? `&kind=${kind}` : '';
    const endpoints = [
      `https://api-mainnet.magiceden.dev/v2/ord/btc/activities?limit=${limit}${kindParam}`,
      `https://api-mainnet.magiceden.dev/v2/ord/btc/activities/trades?limit=${limit}`,
    ];

    let data: unknown[] | null = null;
    let source = 'magic_eden';

    for (const endpoint of endpoints) {
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'CYPHER-ORDi-Future-V3'
        };

        // Add API key to headers if available
        if (MAGIC_EDEN_API_KEY) {
          headers['Authorization'] = `Bearer ${MAGIC_EDEN_API_KEY}`;
        }

        const res = await fetch(endpoint, {
          headers,
          signal: controller.signal,
        });


        if (res.ok) {
          const json = await res.json();
          data = Array.isArray(json) ? json : json.activities || json.results || json.data || null;
          if (data && data.length > 0) {
            break;
          }
        } else if (res.status === 429) {
        }
      } catch (error) {
        console.error(`[Marketplace API] Error fetching from ${endpoint}:`, error);
        continue;
      }
    }
    clearTimeout(timeout);

    // Fallback 1: Try Ordiscan API
    if (!data || data.length === 0) {
      const ORDISCAN_API_KEY = process.env.ORDISCAN_API_KEY;
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10000);
      try {
        const ordiscanHeaders: Record<string, string> = {
          'Accept': 'application/json',
        };
        if (ORDISCAN_API_KEY) {
          ordiscanHeaders['Authorization'] = `Bearer ${ORDISCAN_API_KEY}`;
        }

        const ordiscanRes = await fetch(
          `https://api.ordiscan.com/v1/market/activity?limit=${limit}`,
          {
            headers: ordiscanHeaders,
            signal: controller2.signal,
          }
        );
        if (ordiscanRes.ok) {
          const ordiscanData = await ordiscanRes.json();
          data = ordiscanData.data || ordiscanData.activities || [];
          if (data && data.length > 0) {
            source = 'ordiscan';
          }
        }
      } catch (error) {
        console.error('[Marketplace API] Ordiscan fallback error:', error);
      } finally {
        clearTimeout(timeout2);
      }
    }

    // Fallback 2: Use Hiro recent inscriptions as activity proxy
    if (!data || data.length === 0) {
      const controller3 = new AbortController();
      const timeout3 = setTimeout(() => controller3.abort(), 10000);
      try {
        const hiroHeaders: Record<string, string> = {
          'Accept': 'application/json',
        };
        const hiroApiKey = process.env.HIRO_API_KEY;
        if (hiroApiKey) {
          hiroHeaders['x-api-key'] = hiroApiKey;
        }

        const hiroRes = await fetch(
          `https://api.hiro.so/ordinals/v1/inscriptions?limit=${limit}&order=desc&order_by=genesis_block_height`,
          {
            headers: hiroHeaders,
            signal: controller3.signal,
          }
        );
        if (hiroRes.ok) {
          const hiroData = await hiroRes.json();
          data = (Array.isArray(hiroData.results) ? hiroData.results : []).map((item: Record<string, unknown>) => ({
            kind: 'listing',
            tokenId: item.id,
            inscription_id: item.id,
            number: item.number,
            inscriptionNumber: item.number,
            content_type: item.content_type,
            genesis_block_height: item.genesis_block_height,
            // Hiro returns genesis_timestamp as UNIX seconds
            createdAt: typeof item.genesis_timestamp === 'number'
              ? new Date((item.genesis_timestamp as number) < 1e12 ? (item.genesis_timestamp as number) * 1000 : (item.genesis_timestamp as number)).toISOString()
              : undefined,
            timestamp: item.genesis_timestamp,
            tx_id: item.tx_id,
            listedPrice: typeof item.genesis_fee === 'string' ? parseInt(item.genesis_fee as string) : null,
            price: typeof item.genesis_fee === 'string' ? parseInt(item.genesis_fee as string) : null,
            address: item.address || item.genesis_address,
          }));
          source = 'hiro';
        }
      } catch (error) {
        console.error('[Marketplace API] Hiro fallback error:', error);
      } finally {
        clearTimeout(timeout3);
      }
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No activity data available from any source' },
        { status: 502, headers: { 'Cache-Control': 'no-cache' } }
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

      // Build collection image URL from Magic Eden if we have a collection symbol
      let collectionImage: string | null = null;
      if (collectionSymbol) {
        collectionImage = `https://api-mainnet.magiceden.dev/v2/ord/btc/collections/${collectionSymbol}/image`;
      }

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
      { success: false, error: 'Failed to fetch activity', message },
      { status: 500, headers: { 'Cache-Control': 'no-cache' } }
    );
  }
}
