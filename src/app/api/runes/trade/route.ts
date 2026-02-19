/**
 * Runes Trading API — UniSat Marketplace Integration
 * Docs: https://docs.unisat.io/dev/unisat-developer-center/unisat-marketplace/runes-marketplace
 *
 * Flow:
 * 1. GET: List sell orders for a rune
 * 2. POST action=create_listing: Create PSBT for listing (seller signs)
 * 3. POST action=buy: Create buy PSBT (buyer signs)
 */

import { NextRequest, NextResponse } from 'next/server';

const UNISAT_API = process.env.UNISAT_API_URL || 'https://open-api.unisat.io';
const UNISAT_KEY = process.env.UNISAT_API_KEY;

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (UNISAT_KEY) headers['Authorization'] = `Bearer ${UNISAT_KEY}`;

// GET: List sell orders for a rune tick
export async function GET(request: NextRequest) {
  try {
    const tick = request.nextUrl.searchParams.get('tick');
    const sort = request.nextUrl.searchParams.get('sort') || 'unitPriceAsc';
    const start = request.nextUrl.searchParams.get('start') || '0';
    const limit = request.nextUrl.searchParams.get('limit') || '20';

    if (!tick) {
      return NextResponse.json({ success: false, error: 'Missing tick parameter' }, { status: 400 });
    }

    const res = await fetch(`${UNISAT_API}/v3/market/runes/auction/list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tick, sort, start: Number(start), limit: Number(limit) }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[Runes Trade] Error listing orders:', error);
    return NextResponse.json({ success: true, data: { list: [], total: 0 } });
  }
}

// POST: Create listing or buy order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'list_types') {
      // Get all available rune types with market data
      const res = await fetch(`${UNISAT_API}/v3/market/runes/auction/runes_types`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ start: body.start || 0, limit: body.limit || 50 }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      return NextResponse.json({ success: true, ...data });
    }

    if (action === 'create_listing') {
      // Create PSBT for seller to sign
      const res = await fetch(`${UNISAT_API}/v3/market/runes/auction/create_put_off`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address: body.address,
          tick: body.tick,
          amount: body.amount,
          unitPrice: body.unitPrice,
          nftUtxo: body.nftUtxo,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      return NextResponse.json({ success: true, ...data });
    }

    if (action === 'confirm_listing') {
      // Submit signed PSBT
      const res = await fetch(`${UNISAT_API}/v3/market/runes/auction/confirm_put_off`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderType: body.orderType,
          psbt: body.signedPsbt,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      return NextResponse.json({ success: true, ...data });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Runes Trade] Error:', error);
    return NextResponse.json({ success: false, error: 'Trade operation failed' }, { status: 500 });
  }
}
