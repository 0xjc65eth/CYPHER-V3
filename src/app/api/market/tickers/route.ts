import { NextResponse } from 'next/server';

// In-memory cache
let tickerCache: any[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

const COINGECKO_IDS: Record<string, { id: string; type: string }> = {
  BTC: { id: 'bitcoin', type: 'crypto' },
  ETH: { id: 'ethereum', type: 'crypto' },
  SOL: { id: 'solana', type: 'crypto' },
  DOGE: { id: 'dogecoin', type: 'crypto' },
  PEPE: { id: 'pepe', type: 'crypto' },
  SHIB: { id: 'shiba-inu', type: 'crypto' },
  AVAX: { id: 'avalanche-2', type: 'crypto' },
  MATIC: { id: 'matic-network', type: 'crypto' },
  DOT: { id: 'polkadot', type: 'crypto' },
  LINK: { id: 'chainlink', type: 'crypto' },
  ORDI: { id: 'ordinals', type: 'ordinal' },
  SATS: { id: '1000sats', type: 'brc20' },
};

const ID_TO_SYMBOL = Object.fromEntries(
  Object.entries(COINGECKO_IDS).map(([sym, { id }]) => [id, sym])
);

async function fetchCoinGecko(): Promise<any[]> {
  const ids = Object.values(COINGECKO_IDS).map(v => v.id).join(',');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...(process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {}),
        },
      }
    );

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();

    return data.map((coin: any) => {
      const symbol = ID_TO_SYMBOL[coin.id] || coin.symbol?.toUpperCase() || coin.id;
      const meta = Object.values(COINGECKO_IDS).find(v => v.id === coin.id);

      return {
        symbol,
        name: coin.name,
        type: meta?.type || 'crypto',
        price: coin.current_price || 0,
        change24h: coin.price_change_24h || 0,
        changePercent24h: coin.price_change_percentage_24h || 0,
        volume24h: coin.total_volume || 0,
        marketCap: coin.market_cap || 0,
        high24h: coin.high_24h || 0,
        low24h: coin.low_24h || 0,
        lastUpdate: Date.now(),
        trending: Math.abs(coin.price_change_percentage_24h || 0) > 5,
        volatility: Math.abs(coin.price_change_percentage_24h || 0) > 8 ? 'high' : Math.abs(coin.price_change_percentage_24h || 0) > 3 ? 'medium' : 'low',
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBinanceFallback(): Promise<any[]> {
  const symbolMap: Record<string, string> = {
    BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL', DOGEUSDT: 'DOGE',
    PEPEUSDT: 'PEPE', SHIBUSDT: 'SHIB', AVAXUSDT: 'AVAX',
    DOTUSDT: 'DOT', LINKUSDT: 'LINK',
  };
  const symbols = Object.keys(symbolMap);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const data = await res.json();

    return data.map((t: any) => {
      const symbol = symbolMap[t.symbol] || t.symbol;
      const price = parseFloat(t.lastPrice);
      const change = parseFloat(t.priceChange);
      const changePct = parseFloat(t.priceChangePercent);

      return {
        symbol,
        name: symbol,
        type: 'crypto',
        price,
        change24h: change,
        changePercent24h: changePct,
        volume24h: parseFloat(t.quoteVolume) || 0,
        marketCap: 0,
        high24h: parseFloat(t.highPrice) || 0,
        low24h: parseFloat(t.lowPrice) || 0,
        lastUpdate: Date.now(),
        trending: Math.abs(changePct) > 5,
        volatility: Math.abs(changePct) > 8 ? 'high' : Math.abs(changePct) > 3 ? 'medium' : 'low',
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    // Return cache if fresh
    if (tickerCache.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: tickerCache,
        timestamp: Date.now(),
        source: 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    let tickers: any[];
    let source: string;

    try {
      tickers = await fetchCoinGecko();
      source = 'coingecko';
    } catch (err) {
      console.warn('[Market Tickers] CoinGecko failed, trying Binance:', err);
      try {
        tickers = await fetchBinanceFallback();
        source = 'binance';
      } catch (err2) {
        console.error('[Market Tickers] All APIs failed:', err2);
        // Return stale cache if available
        if (tickerCache.length > 0) {
          return NextResponse.json({
            success: true,
            data: tickerCache,
            timestamp: cacheTimestamp,
            source: 'stale-cache',
          });
        }
        throw err2;
      }
    }

    // Sort by volume
    tickers.sort((a, b) => b.volume24h - a.volume24h);

    // Update cache
    tickerCache = tickers;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      success: true,
      data: tickers,
      timestamp: Date.now(),
      source,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[Market Tickers] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
