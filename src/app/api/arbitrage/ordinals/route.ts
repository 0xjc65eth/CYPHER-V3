/**
 * Ordinals & Runes Arbitrage Scanner
 * Compara preços entre UniSat e Magic Eden para encontrar oportunidades reais.
 */

import { NextRequest, NextResponse } from 'next/server';

const ME_API = 'https://api-mainnet.magiceden.dev/v2';
const UNISAT_API = process.env.UNISAT_API_URL || 'https://open-api.unisat.io';
const UNISAT_KEY = process.env.UNISAT_API_KEY;
const ME_KEY = process.env.MAGIC_EDEN_API_KEY;

async function fetchMagicEdenRuneOrders(rune: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ME_KEY) headers['Authorization'] = `Bearer ${ME_KEY}`;
  const res = await fetch(`${ME_API}/ord/btc/runes/orders/${rune}?limit=5&sort=unitPriceAsc`, {
    headers, signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return await res.json();
}

async function fetchUnisatRuneOrders(tick: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (UNISAT_KEY) headers['Authorization'] = `Bearer ${UNISAT_KEY}`;
  const res = await fetch(`${UNISAT_API}/v3/market/runes/auction/list`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tick, sort: 'unitPriceAsc', start: 0, limit: 5 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function GET(request: NextRequest) {
  try {
    const runes = request.nextUrl.searchParams.get('runes')?.split(',') ||
      ['UNCOMMON•GOODS', 'DOG•GO•TO•THE•MOON', 'RSIC•GENESIS•RUNE'];

    const opportunities: any[] = [];

    await Promise.all(runes.map(async (rune) => {
      const [meOrders, unisatOrders] = await Promise.allSettled([
        fetchMagicEdenRuneOrders(rune),
        fetchUnisatRuneOrders(rune),
      ]);

      const meBest = meOrders.status === 'fulfilled' && meOrders.value?.orders?.[0];
      const unisatBest = unisatOrders.status === 'fulfilled' && unisatOrders.value?.data?.list?.[0];

      if (meBest && unisatBest) {
        const mePrice = parseFloat(meBest.unitPrice || meBest.formattedUnitPrice || '0');
        const unisatPrice = parseFloat(unisatBest.unitPrice || '0');

        if (mePrice > 0 && unisatPrice > 0) {
          const spread = Math.abs(mePrice - unisatPrice) / Math.min(mePrice, unisatPrice) * 100;
          if (spread > 1) { // More than 1% spread
            opportunities.push({
              rune,
              magicEdenPrice: mePrice,
              unisatPrice: unisatPrice,
              spreadPercent: spread.toFixed(2),
              buyFrom: mePrice < unisatPrice ? 'magic_eden' : 'unisat',
              sellOn: mePrice < unisatPrice ? 'unisat' : 'magic_eden',
              estimatedProfitPercent: (spread - 1).toFixed(2), // minus ~1% fees
              risk: spread > 10 ? 'high' : spread > 5 ? 'medium' : 'low',
            });
          }
        }
      }
    }));

    opportunities.sort((a, b) => parseFloat(b.spreadPercent) - parseFloat(a.spreadPercent));

    return NextResponse.json({
      success: true,
      opportunities,
      scannedRunes: runes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Ordinals Arbitrage] Error:', error);
    return NextResponse.json({ success: true, opportunities: [], scannedRunes: 0 });
  }
}
