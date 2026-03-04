import { NextResponse } from 'next/server';

interface OrderBookLevel {
  price: number;
  quantity: number;
}

async function fetchWithTimeout(url: string, opts?: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Try Binance → OKX → Kraken
async function fetchOrderBook(symbol: string, limit: string): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[]; source: string } | null> {
  // Binance
  try {
    const res = await fetchWithTimeout(
      `https://api.binance.com/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=${encodeURIComponent(limit)}`
    );
    if (res.ok) {
      const data = await res.json();
      return {
        bids: data.bids.map((b: string[]) => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
        asks: data.asks.map((a: string[]) => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
        source: 'binance',
      };
    }
    // If 451 geo-block, fall through to alternatives
    if (res.status === 451 || res.status === 403) {
      // Binance blocked, trying fallback
    }
  } catch (err) { /* Exchange fallback */ }

  // OKX fallback - convert BTCUSDT → BTC-USDT
  try {
    const base = symbol.replace('USDT', '');
    const okxInstId = `${base}-USDT`;
    const res = await fetchWithTimeout(
      `https://www.okx.com/api/v5/market/books?instId=${encodeURIComponent(okxInstId)}&sz=${encodeURIComponent(limit)}`
    );
    if (res.ok) {
      const data = await res.json();
      const book = data?.data?.[0];
      if (book) {
        return {
          bids: (book.bids || []).map((b: string[]) => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
          asks: (book.asks || []).map((a: string[]) => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
          source: 'okx',
        };
      }
    }
  } catch (err) { /* Exchange fallback */ }

  // Kraken fallback - convert BTCUSDT → XBTUSD
  try {
    const krakenPairs: Record<string, string> = {
      BTCUSDT: 'XBTUSDT',
      ETHUSDT: 'ETHUSDT',
      SOLUSDT: 'SOLUSDT',
    };
    const pair = krakenPairs[symbol] || symbol;
    const res = await fetchWithTimeout(
      `https://api.kraken.com/0/public/Depth?pair=${encodeURIComponent(pair)}&count=${encodeURIComponent(limit)}`
    );
    if (res.ok) {
      const data = await res.json();
      const result = data?.result;
      if (result) {
        const key = Object.keys(result)[0];
        if (key) {
          return {
            bids: (result[key].bids || []).map((b: string[]) => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
            asks: (result[key].asks || []).map((a: string[]) => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
            source: 'kraken',
          };
        }
      }
    }
  } catch (err) { /* Exchange fallback */ }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const limit = searchParams.get('limit') || '50';

    const result = await fetchOrderBook(symbol, limit);

    if (!result) {
      return NextResponse.json(
        { error: 'All exchange APIs unavailable' },
        { status: 503 }
      );
    }

    const { bids, asks, source } = result;
    const totalBidVolume = bids.reduce((sum, b) => sum + b.quantity, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.quantity, 0);

    return NextResponse.json(
      {
        symbol,
        bids,
        asks,
        spread: asks[0]?.price && bids[0]?.price ? asks[0].price - bids[0].price : null,
        spreadPercent: asks[0]?.price && bids[0]?.price
          ? ((asks[0].price - bids[0].price) / bids[0].price) * 100
          : null,
        totalBidVolume,
        totalAskVolume,
        bidAskRatio: totalAskVolume > 0 ? totalBidVolume / totalAskVolume : null,
        timestamp: Date.now(),
        source,
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
