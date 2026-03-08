import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

// Simple in-memory cache with 30s TTL
const cache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL = 30_000;

function getCached(key: string) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: unknown) {
  cache[key] = { data, ts: Date.now() };
}

async function fetchJSON(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function getBtcPrice() {
  const cached = getCached('btcPrice');
  if (cached) return cached;
  try {
    const data = await fetchJSON('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    const result = {
      lastPrice: data.lastPrice,
      priceChangePercent: data.priceChangePercent,
      highPrice: data.highPrice,
      lowPrice: data.lowPrice,
      volume: data.volume,
    };
    setCache('btcPrice', result);
    return result;
  } catch {
    return null;
  }
}

async function getEthPrice() {
  const cached = getCached('ethPrice');
  if (cached) return cached;
  try {
    const data = await fetchJSON('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT');
    const result = {
      lastPrice: data.lastPrice,
      priceChangePercent: data.priceChangePercent,
      highPrice: data.highPrice,
      lowPrice: data.lowPrice,
      volume: data.volume,
    };
    setCache('ethPrice', result);
    return result;
  } catch {
    return null;
  }
}

async function getFearGreed() {
  const cached = getCached('fearGreed');
  if (cached) return cached;
  try {
    const data = await fetchJSON('https://api.alternative.me/fng/');
    if (data?.data?.[0]) {
      const entry = data.data[0];
      const result = { value: parseInt(entry.value, 10), classification: entry.value_classification };
      setCache('fearGreed', result);
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

async function getNews() {
  const cached = getCached('news');
  if (cached) return cached;
  try {
    const data = await fetchJSON('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular');
    if (data?.Data) {
      const result = data.Data.slice(0, 20).map((item: any) => ({
        title: item.title,
        source: item.source,
        url: item.url,
        publishedOn: item.published_on,
      }));
      setCache('news', result);
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

async function getKlines() {
  const cached = getCached('klines');
  if (cached) return cached;
  try {
    const data = await fetchJSON('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=168');
    // Each kline: [openTime, open, high, low, close, volume, ...]
    const result = data.map((k: any[]) => [k[0], k[1], k[2], k[3], k[4], k[5]]);
    setCache('klines', result);
    return result;
  } catch {
    return null;
  }
}

async function getDerivatives() {
  const cached = getCached('derivatives');
  if (cached) return cached;
  try {
    const [fundingRes, tickerRes] = await Promise.allSettled([
      fetchJSON('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'),
      fetchJSON('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT'),
    ]);

    const funding = fundingRes.status === 'fulfilled' ? fundingRes.value : null;
    const ticker = tickerRes.status === 'fulfilled' ? tickerRes.value : null;

    let longShortRatio = null;
    try {
      const lsData = await fetchJSON('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1');
      if (lsData?.[0]) longShortRatio = lsData[0].longShortRatio;
    } catch { /* optional */ }

    const result = {
      fundingRate: funding?.[0]?.fundingRate ?? null,
      markPrice: ticker?.lastPrice ?? null,
      openInterest: null as string | null,
      longShortRatio,
    };

    // Fetch open interest separately
    try {
      const oiData = await fetchJSON('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT');
      result.openInterest = oiData?.openInterest ?? null;
    } catch { /* optional */ }

    setCache('derivatives', result);
    return result;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  const [btcPrice, ethPrice, fearGreed, news, klines, derivatives] = await Promise.allSettled([
    getBtcPrice(),
    getEthPrice(),
    getFearGreed(),
    getNews(),
    getKlines(),
    getDerivatives(),
  ]);

  return NextResponse.json({
    btcPrice: btcPrice.status === 'fulfilled' ? btcPrice.value : null,
    ethPrice: ethPrice.status === 'fulfilled' ? ethPrice.value : null,
    fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
    news: news.status === 'fulfilled' ? news.value : null,
    klines: klines.status === 'fulfilled' ? klines.value : null,
    derivatives: derivatives.status === 'fulfilled' ? derivatives.value : null,
  });
}
