import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const [fundingRes, oiRes, lsRes] = await Promise.allSettled([
      fetchWithTimeout('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'),
      fetchWithTimeout('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
      fetchWithTimeout('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1'),
    ]);

    let fundingRate: number | null = null;
    if (fundingRes.status === 'fulfilled' && fundingRes.value.ok) {
      const data = await fundingRes.value.json();
      fundingRate = data[0] ? parseFloat(data[0].fundingRate) : null;
    }

    let openInterest: number | null = null;
    if (oiRes.status === 'fulfilled' && oiRes.value.ok) {
      const data = await oiRes.value.json();
      openInterest = data.openInterest ? parseFloat(data.openInterest) : null;
    }

    let longShortRatio: number | null = null;
    if (lsRes.status === 'fulfilled' && lsRes.value.ok) {
      const data = await lsRes.value.json();
      longShortRatio = data[0] ? parseFloat(data[0].longShortRatio) : null;
    }

    return NextResponse.json(
      {
        fundingRate,
        predictedFunding: null,
        openInterest,
        oiChange24h: null,
        longShortRatio,
        topTraderRatio: null,
        liquidations24h: null,
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      }
    );
  } catch (error) {
    console.error('Error fetching derivatives metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch derivatives metrics' },
      { status: 500 }
    );
  }
}
