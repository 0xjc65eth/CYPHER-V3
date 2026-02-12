import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const [fundingRes, oiRes, lsRes, topTraderRes] = await Promise.allSettled([
      fetchWithTimeout('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'),
      fetchWithTimeout('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
      fetchWithTimeout('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1'),
      fetchWithTimeout('https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=1h&limit=1'),
    ]);

    let fundingRate: number | null = null;
    let predictedFunding: number | null = null;
    if (fundingRes.status === 'fulfilled') {
      const data = await fundingRes.value.json();
      if (Array.isArray(data) && data.length > 0) {
        fundingRate = parseFloat(data[0].fundingRate);
        predictedFunding = fundingRate;
      }
    }

    let openInterest: number | null = null;
    if (oiRes.status === 'fulfilled') {
      const data = await oiRes.value.json();
      openInterest = parseFloat(data.openInterest);
    }

    let longShortRatio: number | null = null;
    if (lsRes.status === 'fulfilled') {
      const data = await lsRes.value.json();
      if (Array.isArray(data) && data.length > 0) {
        longShortRatio = parseFloat(data[0].longShortRatio);
      }
    }

    let topTraderRatio: number | null = null;
    if (topTraderRes.status === 'fulfilled') {
      const data = await topTraderRes.value.json();
      if (Array.isArray(data) && data.length > 0) {
        topTraderRatio = parseFloat(data[0].longShortRatio);
      }
    }

    return NextResponse.json(
      {
        fundingRate,
        predictedFunding,
        openInterest,
        oiChange24h: null,
        longShortRatio,
        topTraderRatio,
        liquidations24h: null,
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
