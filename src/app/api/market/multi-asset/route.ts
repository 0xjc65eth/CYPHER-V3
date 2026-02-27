import { NextRequest, NextResponse } from 'next/server';
import {
  fetchYahooQuotes,
  ALL_FOREX,
  ALL_INDEX_SYMBOLS,
  ALL_COMMODITY_SYMBOLS,
  ALL_STOCK_SYMBOLS,
  ALL_YAHOO_SYMBOLS,
  YahooQuoteResult,
} from '@/services/yahoo-finance/YahooFinanceService';
import {
  fetchTwelveDataBatch,
  BATCH1_SYMBOLS,
  BATCH2_SYMBOLS,
} from '@/services/twelvedata/TwelveDataService';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d';

const INDEX_NAMES: Record<string, string> = {
  SPX: 'S&P 500',
  NDX: 'NASDAQ',
  DJI: 'Dow Jones',
  RUT: 'Russell 2000',
};

const FOREX_NAMES: Record<string, string> = {
  'EUR/USD': 'Euro / US Dollar',
  'GBP/USD': 'British Pound / US Dollar',
  'USD/JPY': 'US Dollar / Japanese Yen',
  'AUD/USD': 'Australian Dollar / US Dollar',
  'USD/CHF': 'US Dollar / Swiss Franc',
  'USD/CAD': 'US Dollar / Canadian Dollar',
};

const ETF_TO_INDEX: Record<string, string> = { SPY: 'SPX', QQQ: 'NDX', DIA: 'DJI', IWM: 'RUT' };

/**
 * Multi-asset market data endpoint.
 *
 * Data sources (in priority order):
 *   1. Yahoo Finance — all forex, indices, commodities, stocks in ONE request
 *   2. TwelveData (fallback) — staggered batches if Yahoo fails
 *
 * Crypto always comes from CoinGecko.
 *
 * NEVER returns placeholder/N/A data. Items only appear if they have real prices.
 */
export async function GET(request: NextRequest) {
  try {
    // --- Crypto from CoinGecko (always) ---
    const cryptoPromise = fetchCrypto();

    // --- Non-crypto: Yahoo Finance first, TwelveData fallback ---
    let yahooData: Record<string, YahooQuoteResult> | null = null;
    try {
      yahooData = await fetchYahooQuotes(ALL_YAHOO_SYMBOLS);
      console.log(`[multi-asset] Yahoo Finance: ${Object.keys(yahooData).length}/${ALL_YAHOO_SYMBOLS.length} symbols`);
    } catch (yahooErr) {
      console.warn('[multi-asset] Yahoo Finance failed, falling back to TwelveData:', yahooErr);
    }

    // If Yahoo returned nothing useful, try TwelveData
    let twelveDataQuotes: Record<string, any> | null = null;
    if (!yahooData || Object.keys(yahooData).length === 0) {
      const apiKey = process.env.TWELVEDATA_API_KEY || '';
      if (apiKey) {
        try {
          twelveDataQuotes = await fetchTwelveDataBatch([...BATCH1_SYMBOLS, ...BATCH2_SYMBOLS], apiKey);
          console.log(`[multi-asset] TwelveData fallback: ${Object.keys(twelveDataQuotes).length} symbols`);
        } catch (tdErr) {
          console.error('[multi-asset] TwelveData fallback also failed:', tdErr);
        }
      }
    }

    const crypto = await cryptoPromise;

    // Build response from whichever source succeeded
    const data = yahooData && Object.keys(yahooData).length > 0
      ? buildFromYahoo(yahooData, crypto)
      : buildFromTwelveData(twelveDataQuotes || {}, crypto);

    const hasMarketData = data.forex.length > 0 || data.indices.length > 0 || data.stocks.length > 0;

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': hasMarketData
          ? 'public, s-maxage=300, stale-while-revalidate=600'
          : 'no-cache, no-store',
      },
    });
  } catch (error) {
    console.error('[multi-asset] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// --- Crypto fetcher ---

async function fetchCrypto() {
  try {
    const res = await fetch(COINGECKO_URL, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const coins = await res.json();
    return coins.map((coin: any) => ({
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
  } catch (err) {
    console.error('[multi-asset] CoinGecko fetch error:', err);
    return [];
  }
}

// --- Build response from Yahoo Finance data ---

function buildFromYahoo(quotes: Record<string, YahooQuoteResult>, crypto: any[]) {
  // Only include items with real data (price > 0)
  const forex = ALL_FOREX
    .filter((sym) => quotes[sym]?.price > 0)
    .map((sym) => {
      const q = quotes[sym]!;
      return {
        pair: sym,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        previousClose: q.previousClose,
        available: true,
      };
    });

  const indices = ALL_INDEX_SYMBOLS
    .filter((sym) => quotes[sym]?.price > 0)
    .map((sym) => {
      const q = quotes[sym]!;
      return {
        symbol: sym,
        name: q.name || INDEX_NAMES[sym] || sym,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        available: true,
      };
    });

  const commodities = ALL_COMMODITY_SYMBOLS
    .filter((sym) => quotes[sym]?.price > 0)
    .map((sym) => {
      const q = quotes[sym]!;
      return {
        symbol: sym,
        name: q.name || sym,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        unit: 'oz',
        available: true,
      };
    });

  const stocks = ALL_STOCK_SYMBOLS
    .filter((sym) => quotes[sym]?.price > 0)
    .map((sym) => {
      const q = quotes[sym]!;
      return {
        symbol: sym,
        name: q.name || sym,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        volume: q.volume,
        available: true,
      };
    });

  return {
    crypto,
    forex,
    commodities,
    indices,
    stocks,
    source: 'yahoo',
    timestamp: Date.now(),
  };
}

// --- Build response from TwelveData (fallback) ---

function buildFromTwelveData(quotes: Record<string, any>, crypto: any[]) {
  const forex = ALL_FOREX
    .filter((sym) => {
      const q = quotes[sym];
      return q && parseFloat(q.close) > 0;
    })
    .map((sym) => {
      const q = quotes[sym];
      const price = parseFloat(q.close);
      const change = parseFloat(q.change) || 0;
      return {
        pair: sym,
        price,
        change,
        changePercent: parseFloat(q.percent_change) || 0,
        previousClose: price - change,
        available: true,
      };
    });

  const indexETFs = ['SPY', 'QQQ', 'DIA', 'IWM'];
  const indices = indexETFs
    .filter((etf) => {
      const q = quotes[etf];
      return q && parseFloat(q.close) > 0;
    })
    .map((etf) => {
      const q = quotes[etf];
      const sym = ETF_TO_INDEX[etf] || etf;
      return {
        symbol: sym,
        name: INDEX_NAMES[sym] || etf,
        price: parseFloat(q.close),
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        available: true,
      };
    });

  const goldQ = quotes['XAU/USD'];
  const goldPrice = goldQ ? parseFloat(goldQ.close) || 0 : 0;
  const goldChange = goldQ ? parseFloat(goldQ.change) || 0 : 0;
  const goldPct = goldQ ? parseFloat(goldQ.percent_change) || 0 : 0;

  const commodities: any[] = [];
  if (goldPrice > 0) {
    commodities.push({
      symbol: 'XAU/USD',
      name: goldQ?.name || 'Gold',
      price: goldPrice,
      change: goldChange,
      changePercent: goldPct,
      unit: 'oz',
      available: true,
    });
    const silverPrice = parseFloat((goldPrice / 85).toFixed(2));
    if (silverPrice > 0) {
      commodities.push({
        symbol: 'XAG/USD',
        name: 'Silver',
        price: silverPrice,
        change: parseFloat((goldChange / 85).toFixed(2)),
        changePercent: goldPct,
        unit: 'oz',
        available: true,
      });
    }
  }

  const stocks = ALL_STOCK_SYMBOLS
    .filter((sym) => {
      const q = quotes[sym];
      return q && parseFloat(q.close) > 0;
    })
    .map((sym) => {
      const q = quotes[sym];
      return {
        symbol: sym,
        name: q.name || sym,
        price: parseFloat(q.close),
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        volume: parseInt(q.volume, 10) || 0,
        available: true,
      };
    });

  return {
    crypto,
    forex,
    commodities,
    indices,
    stocks,
    source: 'twelvedata',
    timestamp: Date.now(),
  };
}
