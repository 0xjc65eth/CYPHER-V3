import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Try Binance first, then OKX as fallback
async function fetchFundingRate(): Promise<number | null> {
  // Binance
  try {
    const res = await fetchWithTimeout('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
    if (res.ok) {
      const data = await res.json();
      if (data[0]?.fundingRate) return parseFloat(data[0].fundingRate);
    }
  } catch (err) { /* Exchange fallback */ }

  // OKX fallback
  try {
    const res = await fetchWithTimeout('https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP');
    if (res.ok) {
      const data = await res.json();
      const rate = data?.data?.[0]?.fundingRate;
      if (rate) return parseFloat(rate);
    }
  } catch (err) { /* Exchange fallback */ }

  // Bybit fallback
  try {
    const res = await fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT');
    if (res.ok) {
      const data = await res.json();
      const rate = data?.result?.list?.[0]?.fundingRate;
      if (rate) return parseFloat(rate);
    }
  } catch (err) { /* Exchange fallback */ }

  return null;
}

async function fetchOpenInterest(): Promise<number | null> {
  // Binance
  try {
    const res = await fetchWithTimeout('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT');
    if (res.ok) {
      const data = await res.json();
      if (data.openInterest) return parseFloat(data.openInterest);
    }
  } catch (err) { /* Exchange fallback */ }

  // OKX fallback
  try {
    const res = await fetchWithTimeout('https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP');
    if (res.ok) {
      const data = await res.json();
      const oi = data?.data?.[0]?.oi;
      if (oi) return parseFloat(oi);
    }
  } catch (err) { /* Exchange fallback */ }

  // Bybit fallback
  try {
    const res = await fetchWithTimeout('https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=1');
    if (res.ok) {
      const data = await res.json();
      const oi = data?.result?.list?.[0]?.openInterest;
      if (oi) return parseFloat(oi);
    }
  } catch (err) { /* Exchange fallback */ }

  return null;
}

async function fetchLongShortRatio(): Promise<number | null> {
  // Binance
  try {
    const res = await fetchWithTimeout('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1');
    if (res.ok) {
      const data = await res.json();
      if (data[0]?.longShortRatio) return parseFloat(data[0].longShortRatio);
    }
  } catch (err) { /* Exchange fallback */ }

  // OKX fallback
  try {
    const res = await fetchWithTimeout('https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=1H');
    if (res.ok) {
      const data = await res.json();
      const ratio = data?.data?.[0]?.[1]; // [timestamp, ratio]
      if (ratio) return parseFloat(ratio);
    }
  } catch (err) { /* Exchange fallback */ }

  return null;
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const [fundingRate, openInterest, longShortRatio] = await Promise.all([
      fetchFundingRate(),
      fetchOpenInterest(),
      fetchLongShortRatio(),
    ]);

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
