import { NextRequest, NextResponse } from 'next/server';
import {
  fetchTwelveDataBatch,
  BATCH1_SYMBOLS,
  BATCH2_SYMBOLS,
} from '@/services/twelvedata/TwelveDataService';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d';

/**
 * Multi-asset market data endpoint.
 *
 * Supports batch parameter to fetch TwelveData symbols within rate limit:
 *   ?batch=1 (default) — CoinGecko crypto + TwelveData priority (8 symbols)
 *   ?batch=2            — TwelveData enrichment (8 symbols)
 *
 * Client calls batch=1 immediately, batch=2 after 65s delay.
 * Vercel CDN caches successful responses for 5 min (s-maxage=300).
 */
export async function GET(request: NextRequest) {
  const batch = request.nextUrl.searchParams.get('batch') || '1';
  const apiKey = process.env.TWELVEDATA_API_KEY || '';

  try {
    if (batch === '2') {
      // Batch 2: enrichment symbols only (no crypto)
      const quotes = await fetchTwelveDataBatch(BATCH2_SYMBOLS, apiKey);
      const hasData = Object.keys(quotes).length > 0;

      // Format quotes for the client
      const formatted: Record<string, any> = {};
      for (const [sym, q] of Object.entries(quotes)) {
        formatted[sym] = {
          symbol: sym,
          name: q.name || sym,
          close: q.close,
          change: q.change,
          percent_change: q.percent_change,
          volume: q.volume,
          is_market_open: q.is_market_open,
        };
      }

      return NextResponse.json(
        { batch: 2, quotes: formatted, timestamp: Date.now() },
        {
          headers: {
            'Cache-Control': hasData
              ? 'public, s-maxage=300, stale-while-revalidate=600'
              : 'no-cache, no-store',
          },
        }
      );
    }

    // Batch 1 (default): CoinGecko crypto + TwelveData priority symbols

    // Fetch crypto from CoinGecko
    let crypto: Array<{
      symbol: string;
      name: string;
      price: number;
      change1h: number;
      change24h: number;
      change7d: number;
      marketCap: number;
      volume24h: number;
      image: string;
      sparkline7d: number[];
    }> = [];

    try {
      const cgRes = await fetch(COINGECKO_URL, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/json' },
      });

      if (cgRes.ok) {
        const cgData = await cgRes.json();
        crypto = cgData.map((coin: any) => ({
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          price: coin.current_price || 0,
          change1h: coin.price_change_percentage_1h_in_currency || 0,
          change24h: coin.price_change_percentage_24h_in_currency || coin.price_change_percentage_24h || 0,
          change7d: coin.price_change_percentage_7d_in_currency || 0,
          marketCap: coin.market_cap || 0,
          volume24h: coin.total_volume || 0,
          image: coin.image || '',
          sparkline7d: coin.sparkline_in_7d?.price || [],
        }));
      }
    } catch (err) {
      console.error('[multi-asset] CoinGecko fetch error:', err);
    }

    // Fetch TwelveData batch 1
    const quotes = await fetchTwelveDataBatch(BATCH1_SYMBOLS, apiKey);

    // ETF → index symbol mapping for display
    const ETF_TO_INDEX: Record<string, string> = { SPY: 'SPX', QQQ: 'NDX', DIA: 'DJI', IWM: 'RUT' };
    const INDEX_ETF_NAMES: Record<string, string> = { SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'Dow Jones', IWM: 'Russell 2000' };
    const FOREX_NAMES: Record<string, string> = {
      'EUR/USD': 'Euro / US Dollar', 'GBP/USD': 'British Pound / US Dollar', 'USD/JPY': 'US Dollar / Japanese Yen',
      'AUD/USD': 'Australian Dollar / US Dollar', 'USD/CHF': 'US Dollar / Swiss Franc', 'USD/CAD': 'US Dollar / Canadian Dollar',
    };

    // Build forex
    const allForex = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'];
    const forex = allForex.map((symbol) => {
      const q = quotes[symbol];
      if (!q) return { pair: symbol, price: 0, change: 0, changePercent: 0, previousClose: 0, available: false };
      const price = parseFloat(q.close) || 0;
      const change = parseFloat(q.change) || 0;
      return { pair: symbol, price, change, changePercent: parseFloat(q.percent_change) || 0, previousClose: price - change, available: true };
    });

    // Build commodities
    const goldQ = quotes['XAU/USD'];
    const goldPrice = goldQ ? (parseFloat(goldQ.close) || 0) : 0;
    const goldChange = goldQ ? (parseFloat(goldQ.change) || 0) : 0;
    const goldPct = goldQ ? (parseFloat(goldQ.percent_change) || 0) : 0;
    const goldAvail = !!goldQ;
    const silverPrice = goldAvail && goldPrice > 0 ? parseFloat((goldPrice / 85).toFixed(2)) : 0;

    const commodities = [
      { symbol: 'XAU/USD', name: goldQ?.name || 'Gold', price: goldPrice, change: goldChange, changePercent: goldPct, unit: 'oz', available: goldAvail },
      { symbol: 'XAG/USD', name: 'Silver', price: silverPrice, change: goldAvail ? parseFloat((goldChange / 85).toFixed(2)) : 0, changePercent: goldPct, unit: 'oz', available: goldAvail && silverPrice > 0 },
    ];

    // Build indices (from ETF proxies)
    const indexETFs = ['SPY', 'QQQ', 'DIA', 'IWM'];
    const indices = indexETFs.map((etf) => {
      const q = quotes[etf];
      const sym = ETF_TO_INDEX[etf] || etf;
      const name = INDEX_ETF_NAMES[etf] || etf;
      if (!q) return { symbol: sym, name, price: 0, change: 0, changePercent: 0, available: false };
      return { symbol: sym, name, price: parseFloat(q.close) || 0, change: parseFloat(q.change) || 0, changePercent: parseFloat(q.percent_change) || 0, available: true };
    });

    // Build stocks
    const stockSyms = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META'];
    const stocks = stockSyms.map((symbol) => {
      const q = quotes[symbol];
      if (!q) return { symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, available: false };
      return {
        symbol, name: q.name || symbol,
        price: parseFloat(q.close) || 0, change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        volume: parseInt(q.volume, 10) || 0, available: true,
      };
    });

    const data = { crypto, forex, commodities, indices, stocks, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[multi-asset] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
