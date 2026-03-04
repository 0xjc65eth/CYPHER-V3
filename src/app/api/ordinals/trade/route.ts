/**
 * Ordinals Trading API — OKX Primary + Magic Eden Fallback
 * OKX Docs: https://docs.okx.com/web3/marketplace-api
 * ME Docs: https://docs.magiceden.io/reference/ordinals-overview
 * PSBT Signer: https://github.com/magiceden-oss/msigner
 *
 * OKX is the primary data source for collections and listings.
 * Magic Eden is used as fallback, and for runes_orders, wallet, and PSBT operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OKXOrdinalsAPI } from '@/services/ordinals/integrations/OKXOrdinalsAPI';

const ME_API = process.env.MAGIC_EDEN_API_URL || 'https://api-mainnet.magiceden.dev/v2';
const ME_KEY = process.env.MAGIC_EDEN_API_KEY;
const okxApi = new OKXOrdinalsAPI();

const meHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (ME_KEY) meHeaders['Authorization'] = `Bearer ${ME_KEY}`;

// GET: Listings, collection info, floor prices
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');
    const collection = request.nextUrl.searchParams.get('collection');
    const address = request.nextUrl.searchParams.get('address');

    if (action === 'collections' || (!action && !collection)) {
      // Try OKX trending collections first
      try {
        const okxCollections = await okxApi.getTrendingCollections('24h', 'VOLUME', 20);
        if (okxCollections && okxCollections.length > 0) {
          return NextResponse.json({ success: true, collections: okxCollections });
        }
      } catch (okxError) {
        // Fall through to Magic Eden
      }

      // Fallback: Magic Eden popular collections
      const res = await fetch(`${ME_API}/ord/btc/popular_collections?window=1d&limit=20`, {
        headers: meHeaders,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`MagicEden API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ success: true, collections: data });
    }

    if (action === 'listings' && collection) {
      // Try OKX inscriptions first
      try {
        const okxResult = await okxApi.getInscriptions(collection, undefined, undefined, undefined, 'priceAsc', 20);
        if (okxResult && okxResult.inscriptions.length > 0) {
          return NextResponse.json({ success: true, listings: okxResult.inscriptions });
        }
      } catch (okxError) {
        // Fall through to Magic Eden
      }

      // Fallback: Magic Eden listings
      const res = await fetch(`${ME_API}/ord/btc/collections/${collection}/listings?limit=20`, {
        headers: meHeaders,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`MagicEden API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ success: true, listings: data });
    }

    if (action === 'runes_orders') {
      const rune = request.nextUrl.searchParams.get('rune');
      if (!rune) return NextResponse.json({ success: false, error: 'Missing rune param' }, { status: 400 });
      const res = await fetch(`${ME_API}/ord/btc/runes/orders/${rune}?limit=20`, {
        headers: meHeaders,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`MagicEden API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ success: true, orders: data });
    }

    if (action === 'wallet' && address) {
      // Get wallet's ordinals
      const res = await fetch(`${ME_API}/ord/btc/tokens?ownerAddress=${address}&limit=50`, {
        headers: meHeaders,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`MagicEden API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ success: true, tokens: data });
    }

    return NextResponse.json({ success: false, error: 'Specify action parameter' }, { status: 400 });
  } catch (error) {
    console.error('[Ordinals Trade] Error:', error);
    return NextResponse.json({ success: true, data: [] }); // Graceful fallback
  }
}

// POST: Buy PSBT for runes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'buy_rune_psbt') {
      // Get unsigned PSBT for buying a rune
      const res = await fetch(`${ME_API}/ord/btc/runes/psbt/get-sweeping`, {
        method: 'POST',
        headers: meHeaders,
        body: JSON.stringify({
          rune: body.rune,
          buyerAddress: body.buyerAddress,
          buyerPublicKey: body.buyerPublicKey,
          orders: body.orders, // order IDs to fill
          feeRate: body.feeRate || 10,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`MagicEden API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ success: true, ...data });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Ordinals Trade POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Operation failed' }, { status: 500 });
  }
}
