/**
 * Ordinals Trading API — Xverse Primary + Hiro Fallback
 * Xverse: https://api.secretkeylabs.io
 * Hiro: https://docs.hiro.so/bitcoin/ordinals
 *
 * Xverse is the primary data source for trending collections.
 * Hiro API used as fallback and for wallet/inscription data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { xverseAPI } from '@/lib/api/xverse';

const HIRO_API = 'https://api.hiro.so';
const HIRO_KEY = process.env.HIRO_API_KEY;

const hiroHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (HIRO_KEY) hiroHeaders['x-hiro-api-key'] = HIRO_KEY;

// GET: Listings, collection info, floor prices
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');
    const collection = request.nextUrl.searchParams.get('collection');
    const address = request.nextUrl.searchParams.get('address');

    if (action === 'collections' || (!action && !collection)) {
      // 1. Try Xverse trending collections
      if (xverseAPI.isEnabled()) {
        try {
          const xverseCollections = await xverseAPI.getTopCollections({ limit: 20, timePeriod: '24h' });
          if (xverseCollections && xverseCollections.length > 0) {
            return NextResponse.json({ success: true, collections: xverseCollections });
          }
        } catch {
          // Fall through to Hiro
        }
      }

      // 2. Fallback: Hiro collections
      try {
        const res = await fetch(`${HIRO_API}/ordinals/v1/collections?limit=20&order_by=volume_24h&order=desc`, {
          headers: hiroHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ success: true, collections: data.results || [] });
        }
      } catch {
        // Fall through to empty
      }

      return NextResponse.json({ success: true, collections: [] });
    }

    if (action === 'listings' && collection) {
      // Hiro for collection inscriptions (Xverse doesn't have listing-level data)
      try {
        const res = await fetch(`${HIRO_API}/ordinals/v1/collections/${encodeURIComponent(collection)}/inscriptions?limit=20`, {
          headers: hiroHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ success: true, listings: data.results || [] });
        }
      } catch {
        // Fall through
      }

      return NextResponse.json({ success: true, listings: [] });
    }

    if (action === 'runes_orders') {
      const rune = request.nextUrl.searchParams.get('rune');
      if (!rune) return NextResponse.json({ success: false, error: 'Missing rune param' }, { status: 400 });

      try {
        const encoded = encodeURIComponent(rune);
        const res = await fetch(`${HIRO_API}/runes/v1/etchings/${encoded}/activity?limit=20&order=desc`, {
          headers: hiroHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ success: true, orders: data.results || [] });
        }
      } catch {
        // Fall through
      }

      return NextResponse.json({ success: true, orders: [] });
    }

    if (action === 'wallet' && address) {
      // 1. Try Xverse for wallet inscriptions
      if (xverseAPI.isEnabled()) {
        try {
          const xverseInscriptions = await xverseAPI.getAddressInscriptions(address);
          if (xverseInscriptions && xverseInscriptions.length > 0) {
            return NextResponse.json({ success: true, tokens: xverseInscriptions });
          }
        } catch {
          // Fall through to Hiro
        }
      }

      // 2. Fallback: Hiro
      try {
        const res = await fetch(`${HIRO_API}/ordinals/v1/inscriptions?address=${encodeURIComponent(address)}&limit=50`, {
          headers: hiroHeaders,
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ success: true, tokens: data.results || [] });
        }
      } catch {
        // Fall through
      }

      return NextResponse.json({ success: true, tokens: [] });
    }

    return NextResponse.json({ success: false, error: 'Specify action parameter' }, { status: 400 });
  } catch (error) {
    console.error('[Ordinals Trade] Error:', error);
    return NextResponse.json({ success: true, data: [] }); // Graceful fallback
  }
}

// POST: Operations that require signing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'buy_rune_psbt') {
      return NextResponse.json({
        success: false,
        error: 'PSBT operations require direct marketplace integration. Use Xverse or UniSat wallet for purchases.',
      }, { status: 501 });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Ordinals Trade POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Operation failed' }, { status: 500 });
  }
}
