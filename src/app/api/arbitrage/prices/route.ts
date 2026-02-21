import { NextResponse } from 'next/server';

interface ExchangePrice {
  name: string;
  bid: number;
  ask: number;
  last: number;
  spread: number;
  spreadPercent: number;
  volume24h: number | null;
  fee: number;
}

interface Opportunity {
  buyFrom: string;
  sellTo: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  buyFee: number;
  sellFee: number;
  netProfitPercent: number;
  estimatedProfitPer1BTC: number;
}

const EXCHANGE_FEES: Record<string, number> = {
  Binance: 0.001,
  Coinbase: 0.005,
  Kraken: 0.0026,
  Bybit: 0.001,
  OKX: 0.001,
  Bitfinex: 0.002,
  KuCoin: 0.001,
  'Gate.io': 0.002,
};

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBinance(): Promise<ExchangePrice> {
  const [tickerRes, priceRes] = await Promise.all([
    fetchWithTimeout('https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT'),
    fetchWithTimeout('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
  ]);
  if (!tickerRes.ok || !priceRes.ok) throw new Error(`Binance API error: ${tickerRes.status}/${priceRes.status}`);
  const ticker = await tickerRes.json();
  const price = await priceRes.json();
  const bid = parseFloat(ticker.bidPrice);
  const ask = parseFloat(ticker.askPrice);
  return {
    name: 'Binance',
    bid,
    ask,
    last: parseFloat(price.lastPrice),
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: parseFloat(price.volume),
    fee: EXCHANGE_FEES.Binance,
  };
}

async function fetchCoinbase(): Promise<ExchangePrice> {
  const [ratesRes, spotRes] = await Promise.all([
    fetchWithTimeout('https://api.coinbase.com/v2/exchange-rates?currency=BTC'),
    fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
  ]);
  if (!ratesRes.ok || !spotRes.ok) throw new Error(`Coinbase API error: ${ratesRes.status}/${spotRes.status}`);
  const ratesData = await ratesRes.json();
  const spotData = await spotRes.json();
  const price = parseFloat(ratesData.data.rates.USD);
  const spot = parseFloat(spotData.data.amount);
  return {
    name: 'Coinbase',
    bid: price,
    ask: price,
    last: spot,
    spread: 0,
    spreadPercent: 0,
    volume24h: null,
    fee: EXCHANGE_FEES.Coinbase,
  };
}

async function fetchKraken(): Promise<ExchangePrice> {
  const res = await fetchWithTimeout('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
  if (!res.ok) throw new Error(`Kraken API error: ${res.status}`);
  const data = await res.json();
  const ticker = data.result.XXBTZUSD;
  const bid = parseFloat(ticker.b[0]);
  const ask = parseFloat(ticker.a[0]);
  const last = parseFloat(ticker.c[0]);
  const volume = parseFloat(ticker.v[1]);
  return {
    name: 'Kraken',
    bid,
    ask,
    last,
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: volume,
    fee: EXCHANGE_FEES.Kraken,
  };
}

async function fetchBybit(): Promise<ExchangePrice> {
  const res = await fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT');
  if (!res.ok) throw new Error(`Bybit API error: ${res.status}`);
  const data = await res.json();
  const ticker = data.result.list[0];
  const bid = parseFloat(ticker.bid1Price);
  const ask = parseFloat(ticker.ask1Price);
  const last = parseFloat(ticker.lastPrice);
  const volume = parseFloat(ticker.volume24h);
  return {
    name: 'Bybit',
    bid,
    ask,
    last,
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: volume,
    fee: EXCHANGE_FEES.Bybit,
  };
}

async function fetchOKX(): Promise<ExchangePrice> {
  const res = await fetchWithTimeout('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
  if (!res.ok) throw new Error(`OKX API error: ${res.status}`);
  const data = await res.json();
  const ticker = data.data[0];
  const bid = parseFloat(ticker.bidPx);
  const ask = parseFloat(ticker.askPx);
  const last = parseFloat(ticker.last);
  const volume = parseFloat(ticker.vol24h);
  return {
    name: 'OKX',
    bid,
    ask,
    last,
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: volume,
    fee: EXCHANGE_FEES.OKX,
  };
}

async function fetchBitfinex(): Promise<ExchangePrice> {
  const res = await fetchWithTimeout('https://api-pub.bitfinex.com/v2/ticker/tBTCUSD');
  if (!res.ok) throw new Error(`Bitfinex API error: ${res.status}`);
  const data = await res.json();
  // [BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, DAILY_CHANGE_RELATIVE, LAST_PRICE, VOLUME, HIGH, LOW]
  const bid = data[0];
  const ask = data[2];
  const last = data[6];
  const volume = data[7];
  return {
    name: 'Bitfinex',
    bid,
    ask,
    last,
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: volume,
    fee: EXCHANGE_FEES.Bitfinex,
  };
}

async function fetchKuCoin(): Promise<ExchangePrice> {
  const [obRes, statsRes] = await Promise.all([
    fetchWithTimeout('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT'),
    fetchWithTimeout('https://api.kucoin.com/api/v1/market/stats?symbol=BTC-USDT'),
  ]);
  if (!obRes.ok || !statsRes.ok) throw new Error(`KuCoin API error: ${obRes.status}/${statsRes.status}`);
  const obData = await obRes.json();
  const statsData = await statsRes.json();
  const bid = parseFloat(obData.data.bestBid);
  const ask = parseFloat(obData.data.bestAsk);
  const last = parseFloat(statsData.data.last);
  const volume = parseFloat(statsData.data.vol);
  return {
    name: 'KuCoin',
    bid,
    ask,
    last,
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: volume,
    fee: EXCHANGE_FEES.KuCoin,
  };
}

async function fetchGateio(): Promise<ExchangePrice> {
  const res = await fetchWithTimeout('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT');
  if (!res.ok) throw new Error(`Gate.io API error: ${res.status}`);
  const data = await res.json();
  const ticker = data[0];
  const bid = parseFloat(ticker.highest_bid);
  const ask = parseFloat(ticker.lowest_ask);
  const last = parseFloat(ticker.last);
  const volume = parseFloat(ticker.base_volume);
  return {
    name: 'Gate.io',
    bid,
    ask,
    last,
    spread: ask - bid,
    spreadPercent: ((ask - bid) / bid) * 100,
    volume24h: volume,
    fee: EXCHANGE_FEES['Gate.io'],
  };
}

export async function GET() {
  try {
    const results = await Promise.allSettled([
      fetchBinance(),
      fetchCoinbase(),
      fetchKraken(),
      fetchBybit(),
      fetchOKX(),
      fetchBitfinex(),
      fetchKuCoin(),
      fetchGateio(),
    ]);

    const exchanges: ExchangePrice[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      const names = ['Binance', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'Bitfinex', 'KuCoin', 'Gate.io'];
      if (result.status === 'fulfilled') {
        exchanges.push(result.value);
      } else {
        errors.push(`${names[index]}: ${result.reason?.message || 'Failed'}`);
      }
    });

    if (exchanges.length === 0) {
      return NextResponse.json(
        { error: 'All exchange fetches failed', details: errors },
        { status: 502 }
      );
    }

    // Find best bid (highest) and best ask (lowest)
    let bestBid = { exchange: '', price: 0 };
    let bestAsk = { exchange: '', price: Infinity };

    for (const ex of exchanges) {
      if (ex.bid > bestBid.price) {
        bestBid = { exchange: ex.name, price: ex.bid };
      }
      if (ex.ask > 0 && ex.ask < bestAsk.price) {
        bestAsk = { exchange: ex.name, price: ex.ask };
      }
    }

    // Calculate arbitrage opportunities (buy at lowest ask, sell at highest bid)
    const opportunities: Opportunity[] = [];

    for (const buyer of exchanges) {
      for (const seller of exchanges) {
        if (buyer.name === seller.name) continue;
        if (buyer.ask <= 0 || seller.bid <= 0) continue;

        const grossSpread = ((seller.bid - buyer.ask) / buyer.ask) * 100;
        const buyFee = buyer.fee * 100;
        const sellFee = seller.fee * 100;
        const netProfit = grossSpread - buyFee - sellFee;

        if (grossSpread > 0) {
          opportunities.push({
            buyFrom: buyer.name,
            sellTo: seller.name,
            buyPrice: buyer.ask,
            sellPrice: seller.bid,
            spreadPercent: parseFloat(grossSpread.toFixed(4)),
            buyFee: buyer.fee,
            sellFee: seller.fee,
            netProfitPercent: parseFloat(netProfit.toFixed(4)),
            estimatedProfitPer1BTC: parseFloat((seller.bid * (1 - seller.fee) - buyer.ask * (1 + buyer.fee)).toFixed(2)),
          });
        }
      }
    }

    // Sort by net profit descending
    opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    const maxSpread = exchanges.length >= 2
      ? parseFloat((bestBid.price - bestAsk.price).toFixed(2))
      : 0;

    return NextResponse.json(
      {
        exchanges: exchanges.map((ex) => ({
          name: ex.name,
          bid: ex.bid,
          ask: ex.ask,
          last: ex.last,
          spread: parseFloat(ex.spread.toFixed(2)),
          spreadPercent: parseFloat(ex.spreadPercent.toFixed(4)),
          volume24h: ex.volume24h,
          fee: ex.fee,
          feePercent: `${(ex.fee * 100).toFixed(2)}%`,
        })),
        bestBid,
        bestAsk,
        maxSpread,
        maxSpreadPercent: bestAsk.price > 0
          ? parseFloat(((maxSpread / bestAsk.price) * 100).toFixed(4))
          : 0,
        opportunities: opportunities.slice(0, 20),
        fees: EXCHANGE_FEES,
        errors: errors.length > 0 ? errors : undefined,
        exchangeCount: exchanges.length,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch arbitrage data: ${message}` }, { status: 500 });
  }
}
