import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

interface ExchangeResult {
  exchange: string;
  price: number | null;
  volume24h: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
}

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

async function fetchBinance(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
  const d = await res.json();
  return {
    exchange: 'Binance',
    price: parseFloat(d.lastPrice),
    volume24h: parseFloat(d.quoteVolume),
    bid: parseFloat(d.bidPrice),
    ask: parseFloat(d.askPrice),
    spread: parseFloat(d.askPrice) - parseFloat(d.bidPrice),
  };
}

async function fetchCoinbase(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
  const d = await res.json();
  const price = parseFloat(d.data.rates.USD);
  return {
    exchange: 'Coinbase',
    price,
    volume24h: null,
    bid: null,
    ask: null,
    spread: null,
  };
}

async function fetchKraken(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
  const d = await res.json();
  const ticker = d.result?.XXBTZUSD || d.result?.XBTUSD;
  return {
    exchange: 'Kraken',
    price: parseFloat(ticker.c[0]),
    volume24h: parseFloat(ticker.v[1]) * parseFloat(ticker.c[0]),
    bid: parseFloat(ticker.b[0]),
    ask: parseFloat(ticker.a[0]),
    spread: parseFloat(ticker.a[0]) - parseFloat(ticker.b[0]),
  };
}

async function fetchBybit(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT');
  const d = await res.json();
  const ticker = d.result?.list?.[0];
  return {
    exchange: 'Bybit',
    price: parseFloat(ticker.lastPrice),
    volume24h: parseFloat(ticker.turnover24h),
    bid: parseFloat(ticker.bid1Price),
    ask: parseFloat(ticker.ask1Price),
    spread: parseFloat(ticker.ask1Price) - parseFloat(ticker.bid1Price),
  };
}

async function fetchOKX(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
  const d = await res.json();
  const ticker = d.data?.[0];
  return {
    exchange: 'OKX',
    price: parseFloat(ticker.last),
    volume24h: parseFloat(ticker.volCcy24h),
    bid: parseFloat(ticker.bidPx),
    ask: parseFloat(ticker.askPx),
    spread: parseFloat(ticker.askPx) - parseFloat(ticker.bidPx),
  };
}

async function fetchBitfinex(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api-pub.bitfinex.com/v2/ticker/tBTCUSD');
  const d = await res.json();
  return {
    exchange: 'Bitfinex',
    price: d[6],
    volume24h: d[7] * d[6],
    bid: d[0],
    ask: d[2],
    spread: d[2] - d[0],
  };
}

async function fetchKuCoin(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT');
  const d = await res.json();
  const ticker = d.data;
  return {
    exchange: 'KuCoin',
    price: parseFloat(ticker.price),
    volume24h: null,
    bid: parseFloat(ticker.bestBid),
    ask: parseFloat(ticker.bestAsk),
    spread: parseFloat(ticker.bestAsk) - parseFloat(ticker.bestBid),
  };
}

async function fetchGateIO(): Promise<ExchangeResult> {
  const res = await fetchWithTimeout('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT');
  const d = await res.json();
  const ticker = d[0];
  return {
    exchange: 'Gate.io',
    price: parseFloat(ticker.last),
    volume24h: parseFloat(ticker.quote_volume),
    bid: parseFloat(ticker.highest_bid),
    ask: parseFloat(ticker.lowest_ask),
    spread: parseFloat(ticker.lowest_ask) - parseFloat(ticker.highest_bid),
  };
}

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 60, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const results = await Promise.allSettled([
      fetchBinance(),
      fetchCoinbase(),
      fetchKraken(),
      fetchBybit(),
      fetchOKX(),
      fetchBitfinex(),
      fetchKuCoin(),
      fetchGateIO(),
    ]);

    const exchanges: ExchangeResult[] = [];
    const errors: { exchange: string; error: string }[] = [];

    const exchangeNames = ['Binance', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'Bitfinex', 'KuCoin', 'Gate.io'];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        exchanges.push(result.value);
      } else {
        errors.push({
          exchange: exchangeNames[i],
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    const prices = exchanges.filter((e) => e.price !== null).map((e) => e.price as number);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    return NextResponse.json(
      {
        exchanges,
        summary: {
          averagePrice: avgPrice,
          highestPrice: maxPrice,
          lowestPrice: minPrice,
          maxSpread: maxPrice && minPrice ? maxPrice - minPrice : null,
          respondedCount: exchanges.length,
          failedCount: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
        timestamp: Date.now(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch exchange data' }, { status: 500 });
  }
}
