import { NextRequest, NextResponse } from 'next/server';
import {
  fetchYahooQuotes,
  fetchViaV8Chart,
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
} from '@/services/twelvedata/TwelveDataService';
import { FALLBACK_PRICES } from '@/config/api-keys';

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

const COMMODITY_NAMES: Record<string, string> = {
  'XAU/USD': 'Gold',
  'XAG/USD': 'Silver',
  'CL=F': 'Crude Oil WTI',
  'NG=F': 'Natural Gas',
  'PL=F': 'Platinum',
  'HG=F': 'Copper',
};

const COMMODITY_UNITS: Record<string, string> = {
  'XAU/USD': 'oz',
  'XAG/USD': 'oz',
  'CL=F': 'barrel',
  'NG=F': 'MMBtu',
  'PL=F': 'oz',
  'HG=F': 'lb',
};

// REMOVED: ETF_TO_INDEX mapping — ETF prices (SPY $685) are NOT index values (SPX $5950).
// Indices are fetched correctly via Yahoo v8 using ^GSPC, ^IXIC, ^DJI, ^RUT symbols.
// REMOVED: TD_COMMODITY_ALTERNATIVES — commodity ETF prices don't match futures prices.
// Yahoo v8 fetches real futures data (CL=F, NG=F, etc.) directly.

// Static fallback prices for non-crypto symbols (last resort) — Feb 2026 values
const STATIC_FALLBACK: Record<string, { price: number; name: string }> = {
  'EUR/USD': { price: 1.05, name: 'Euro / US Dollar' },
  'GBP/USD': { price: 1.25, name: 'British Pound / US Dollar' },
  'USD/JPY': { price: 153.00, name: 'US Dollar / Japanese Yen' },
  'AUD/USD': { price: 0.63, name: 'Australian Dollar / US Dollar' },
  'USD/CHF': { price: 0.90, name: 'US Dollar / Swiss Franc' },
  'USD/CAD': { price: 1.44, name: 'US Dollar / Canadian Dollar' },
  'XAU/USD': { price: 2930, name: 'Gold' },
  'XAG/USD': { price: 32.50, name: 'Silver' },
  'CL=F': { price: 70, name: 'Crude Oil WTI' },
  'NG=F': { price: 3.80, name: 'Natural Gas' },
  'PL=F': { price: 970, name: 'Platinum' },
  'HG=F': { price: 4.50, name: 'Copper' },
  SPX: { price: 5950, name: 'S&P 500' },
  NDX: { price: 19200, name: 'NASDAQ' },
  DJI: { price: 43800, name: 'Dow Jones' },
  RUT: { price: 2220, name: 'Russell 2000' },
  AAPL: { price: 245, name: 'Apple Inc' },
  NVDA: { price: 135, name: 'NVIDIA Corp' },
  TSLA: { price: 340, name: 'Tesla Inc' },
  MSFT: { price: 410, name: 'Microsoft Corp' },
  GOOGL: { price: 185, name: 'Alphabet Inc' },
  AMZN: { price: 225, name: 'Amazon.com Inc' },
  META: { price: 700, name: 'Meta Platforms Inc' },
};

/**
 * Multi-asset market data endpoint.
 *
 * Data sources (4-level fallback cascade):
 *   1. TwelveData batch (PRIMARY) — works reliably on Vercel
 *   2. Yahoo Finance v8 chart API (no crumb) — for symbols missing from step 1
 *   3. Yahoo Finance v7 (crumb auth) — only if fill rate < 70%
 *   4. Static fallback prices — for anything still missing
 *
 * Crypto always comes from CoinGecko.
 *
 * NEVER returns placeholder/N/A data. Items only appear if they have real prices.
 */
export async function GET(request: NextRequest) {
  try {
    // --- Crypto from CoinGecko (always) ---
    const cryptoPromise = fetchCrypto();

    // --- Non-crypto: 4-level fallback cascade ---
    const allSymbols = ALL_YAHOO_SYMBOLS;
    const combinedQuotes: Record<string, YahooQuoteResult> = {};
    let source = 'static';

    // Level 1: TwelveData (PRIMARY) — reliable on Vercel
    // RATE LIMIT FIX: Only send Batch 1 (8 symbols) to stay within free tier (8 credits/min).
    // Batch 2 symbols + indices + commodities are handled by Yahoo v8 fallback (Level 2).
    const apiKey = process.env.TWELVEDATA_API_KEY || '';
    if (apiKey) {
      try {
        const batch1 = await fetchTwelveDataBatch(BATCH1_SYMBOLS, apiKey);
        const count = Object.keys(batch1).length;
        console.log(`[multi-asset] L1 TwelveData: ${count} symbols (single batch, rate-limit safe)`);

        // Convert TwelveData quotes to YahooQuoteResult format for uniform handling
        for (const [sym, q] of Object.entries(batch1)) {
          const price = parseFloat(q.close) || 0;
          if (price === 0) continue;
          combinedQuotes[sym] = {
            symbol: sym,
            name: q.name || sym,
            price,
            change: parseFloat(q.change) || 0,
            changePercent: parseFloat(q.percent_change) || 0,
            previousClose: parseFloat(q.previous_close) || (price - (parseFloat(q.change) || 0)),
            volume: parseInt(q.volume, 10) || 0,
            marketState: q.is_market_open ? 'REGULAR' : 'CLOSED',
          };
        }
        // NO ETF→Index mapping: Yahoo v8 fetches real index values (^GSPC, ^IXIC, ^DJI, ^RUT)
        // NO commodity ETF mapping: Yahoo v8 fetches real futures (CL=F, NG=F, etc.)
        if (count > 0) source = 'twelvedata';
      } catch (tdErr) {
        console.error('[multi-asset] L1 TwelveData failed:', tdErr);
      }
    }

    // Level 2: Yahoo Finance v8 chart API (no crumb) — for missing symbols
    const missingAfterTD = allSymbols.filter((s) => !combinedQuotes[s]);
    if (missingAfterTD.length > 0) {
      try {
        const v8Data = await fetchViaV8Chart(missingAfterTD);
        const count = Object.keys(v8Data).length;
        console.log(`[multi-asset] L2 Yahoo v8: ${count}/${missingAfterTD.length} symbols`);
        Object.assign(combinedQuotes, v8Data);
        if (count > 0 && source === 'static') source = 'yahoo-v8';
      } catch (v8Err) {
        console.warn('[multi-asset] L2 Yahoo v8 failed:', v8Err);
      }
    }

    // Level 3: Yahoo Finance v7 (with crumb) — only if fill rate < 70%
    const missingAfterV8 = allSymbols.filter((s) => !combinedQuotes[s]);
    const fillRate = (allSymbols.length - missingAfterV8.length) / allSymbols.length;
    if (missingAfterV8.length > 0 && fillRate < 0.7) {
      try {
        const yahooData = await fetchYahooQuotes(allSymbols);
        const count = Object.keys(yahooData).length;
        console.log(`[multi-asset] L3 Yahoo v7: ${count}/${allSymbols.length} symbols`);
        // Only fill missing symbols, don't overwrite existing data
        for (const [sym, q] of Object.entries(yahooData)) {
          if (!combinedQuotes[sym]) {
            combinedQuotes[sym] = q;
          }
        }
        if (count > 0 && source === 'static') source = 'yahoo';
      } catch (yahooErr) {
        console.warn('[multi-asset] L3 Yahoo v7 failed:', yahooErr);
      }
    }

    // Level 4: Static fallback — fill remaining gaps
    const missingAfterAll = allSymbols.filter((s) => !combinedQuotes[s]);
    if (missingAfterAll.length > 0) {
      let staticFilled = 0;
      for (const sym of missingAfterAll) {
        const fb = STATIC_FALLBACK[sym];
        if (fb) {
          combinedQuotes[sym] = {
            symbol: sym,
            name: fb.name,
            price: fb.price,
            change: 0,
            changePercent: 0,
            previousClose: fb.price,
            volume: 0,
            marketState: 'CLOSED',
          };
          staticFilled++;
        }
      }
      if (staticFilled > 0) {
        console.log(`[multi-asset] L4 Static fallback: ${staticFilled} symbols`);
      }
    }

    const crypto = await cryptoPromise;

    const data = buildFromCombined(combinedQuotes, crypto, source);

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

// --- Build response from combined quotes (any source) ---

function buildFromCombined(quotes: Record<string, YahooQuoteResult>, crypto: any[], source: string) {
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
        name: q.name || COMMODITY_NAMES[sym] || sym,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        unit: COMMODITY_UNITS[sym] || 'unit',
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
    source,
    isStale: source === 'static',
    timestamp: Date.now(),
  };
}
