import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const limit = searchParams.get('limit') || '50';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=${encodeURIComponent(limit)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    const bids = data.bids.map((b: string[]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1]),
    }));

    const asks = data.asks.map((a: string[]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1]),
    }));

    const totalBidVolume = bids.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0);
    const totalAskVolume = asks.reduce((sum: number, a: { quantity: number }) => sum + a.quantity, 0);

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
