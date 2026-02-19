/**
 * Real Exchange Price Fetchers
 * Fetches live ticker data from 8 major exchanges using public REST APIs.
 */

export interface ExchangePrice {
  exchange: string;
  pair: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

/** Trading fee rates per exchange (taker fees) */
export const EXCHANGE_FEES: Record<string, number> = {
  binance: 0.001,
  coinbase: 0.006,
  kraken: 0.002,
  bybit: 0.001,
  okx: 0.001,
  bitfinex: 0.002,
  kucoin: 0.001,
  gateio: 0.002,
};

const FETCH_TIMEOUT = 10000; // 10 seconds

/**
 * Map a normalized pair like "BTC/USDT" to each exchange's symbol format.
 */
function mapSymbol(pair: string, exchange: string): string {
  const [base, quote] = pair.split('/');

  // Kraken uses XBT instead of BTC
  const krakenBase = base === 'BTC' ? 'XBT' : base;

  const mappings: Record<string, string> = {
    binance: `${base}${quote}`,                // BTCUSDT
    coinbase: `${base}-${quote === 'USDT' ? 'USD' : quote}`, // BTC-USD
    kraken: `${krakenBase}${quote}`,            // XBTUSDT
    bybit: `${base}${quote}`,                  // BTCUSDT
    okx: `${base}-${quote}`,                   // BTC-USDT
    bitfinex: `t${base}${quote === 'USDT' ? 'UST' : quote}`, // tBTCUST
    kucoin: `${base}-${quote}`,                // BTC-USDT
    gateio: `${base}_${quote}`,                // BTC_USDT
  };

  return mappings[exchange] || `${base}${quote}`;
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// --- Individual Exchange Fetchers ---

async function fetchBinance(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'binance');
  const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const data = await res.json();
  return {
    exchange: 'binance',
    pair,
    bid: parseFloat(data.bidPrice),
    ask: parseFloat(data.askPrice),
    last: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,
    volume: parseFloat(data.bidQty) + parseFloat(data.askQty),
    timestamp: Date.now(),
  };
}

async function fetchCoinbase(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'coinbase');
  const url = `https://api.coinbase.com/v2/prices/${symbol}/spot`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`Coinbase HTTP ${res.status}`);
  const data = await res.json();
  const price = parseFloat(data.data.amount);
  return {
    exchange: 'coinbase',
    pair,
    bid: price * 0.999, // approximate spread
    ask: price * 1.001,
    last: price,
    volume: 0, // Coinbase spot endpoint doesn't include volume
    timestamp: Date.now(),
  };
}

async function fetchKraken(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'kraken');
  const url = `https://api.kraken.com/0/public/Ticker?pair=${symbol}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const data = await res.json();
  if (data.error && data.error.length > 0) throw new Error(`Kraken: ${data.error[0]}`);
  const key = Object.keys(data.result)[0];
  const ticker = data.result[key];
  return {
    exchange: 'kraken',
    pair,
    bid: parseFloat(ticker.b[0]),
    ask: parseFloat(ticker.a[0]),
    last: parseFloat(ticker.c[0]),
    volume: parseFloat(ticker.v[1]), // 24h volume
    timestamp: Date.now(),
  };
}

async function fetchBybit(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'bybit');
  const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`Bybit HTTP ${res.status}`);
  const data = await res.json();
  if (data.retCode !== 0) throw new Error(`Bybit: ${data.retMsg}`);
  const ticker = data.result.list[0];
  return {
    exchange: 'bybit',
    pair,
    bid: parseFloat(ticker.bid1Price),
    ask: parseFloat(ticker.ask1Price),
    last: parseFloat(ticker.lastPrice),
    volume: parseFloat(ticker.volume24h),
    timestamp: Date.now(),
  };
}

async function fetchOKX(pair: string): Promise<ExchangePrice> {
  const instId = mapSymbol(pair, 'okx');
  const url = `https://www.okx.com/api/v5/market/ticker?instId=${instId}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== '0') throw new Error(`OKX: ${data.msg}`);
  const ticker = data.data[0];
  return {
    exchange: 'okx',
    pair,
    bid: parseFloat(ticker.bidPx),
    ask: parseFloat(ticker.askPx),
    last: parseFloat(ticker.last),
    volume: parseFloat(ticker.vol24h),
    timestamp: Date.now(),
  };
}

async function fetchBitfinex(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'bitfinex');
  const url = `https://api-pub.bitfinex.com/v2/ticker/${symbol}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`Bitfinex HTTP ${res.status}`);
  const data = await res.json();
  // Bitfinex v2 ticker returns an array:
  // [BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, DAILY_CHANGE_RELATIVE, LAST_PRICE, VOLUME, HIGH, LOW]
  if (!Array.isArray(data) || data.length < 10) throw new Error('Bitfinex: unexpected response format');
  return {
    exchange: 'bitfinex',
    pair,
    bid: data[0],
    ask: data[2],
    last: data[6],
    volume: data[7],
    timestamp: Date.now(),
  };
}

async function fetchKuCoin(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'kucoin');
  const url = `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`KuCoin HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== '200000') throw new Error(`KuCoin: ${data.msg}`);
  const ticker = data.data;
  return {
    exchange: 'kucoin',
    pair,
    bid: parseFloat(ticker.bestBid),
    ask: parseFloat(ticker.bestAsk),
    last: parseFloat(ticker.price),
    volume: parseFloat(ticker.size || '0'),
    timestamp: Date.now(),
  };
}

async function fetchGateIO(pair: string): Promise<ExchangePrice> {
  const symbol = mapSymbol(pair, 'gateio');
  const url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
  if (!res.ok) throw new Error(`Gate.io HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Gate.io: empty response');
  const ticker = data[0];
  return {
    exchange: 'gateio',
    pair,
    bid: parseFloat(ticker.highest_bid),
    ask: parseFloat(ticker.lowest_ask),
    last: parseFloat(ticker.last),
    volume: parseFloat(ticker.base_volume),
    timestamp: Date.now(),
  };
}

/** Registry of all exchange fetcher functions */
const FETCHERS: Record<string, (pair: string) => Promise<ExchangePrice>> = {
  binance: fetchBinance,
  coinbase: fetchCoinbase,
  kraken: fetchKraken,
  bybit: fetchBybit,
  okx: fetchOKX,
  bitfinex: fetchBitfinex,
  kucoin: fetchKuCoin,
  gateio: fetchGateIO,
};

/**
 * Fetch prices from all exchanges in parallel.
 * Uses Promise.allSettled so one exchange failing doesn't block the rest.
 */
export async function fetchAllExchangePrices(
  pair: string,
  exchanges?: string[]
): Promise<ExchangePrice[]> {
  const targetExchanges = exchanges || Object.keys(FETCHERS);

  const results = await Promise.allSettled(
    targetExchanges.map((exchange) => {
      const fetcher = FETCHERS[exchange];
      if (!fetcher) {
        return Promise.reject(new Error(`Unknown exchange: ${exchange}`));
      }
      return fetcher(pair);
    })
  );

  const prices: ExchangePrice[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      prices.push(result.value);
    } else {
    }
  }

  return prices;
}
