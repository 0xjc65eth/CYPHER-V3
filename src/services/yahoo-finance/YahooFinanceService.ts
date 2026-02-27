/**
 * Yahoo Finance Market Data Service
 *
 * Primary data source for forex, indices, commodities, and stocks.
 * Uses Yahoo Finance v7 quote API with crumb authentication.
 * Falls back to v8 chart API (no crumb needed) when v7 auth fails.
 * No rate-limit batching needed — Yahoo supports all symbols in one request.
 *
 * Falls back to TwelveData if Yahoo fails entirely.
 */

// --- Symbol mapping: our display symbols ↔ Yahoo Finance tickers ---

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Forex
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'AUD/USD': 'AUDUSD=X',
  'USD/CHF': 'USDCHF=X',
  'USD/CAD': 'USDCAD=X',
  // Commodities
  'XAU/USD': 'GC=F',
  'XAG/USD': 'SI=F',
  'CL=F': 'CL=F',
  'NG=F': 'NG=F',
  'PL=F': 'PL=F',
  'HG=F': 'HG=F',
  // Indices (real indices, not ETF proxies!)
  'SPX': '^GSPC',
  'NDX': '^IXIC',
  'DJI': '^DJI',
  'RUT': '^RUT',
  // Stocks: same symbol
};

const REVERSE_SYMBOL_MAP: Record<string, string> = {};
for (const [ours, yahoo] of Object.entries(YAHOO_SYMBOL_MAP)) {
  REVERSE_SYMBOL_MAP[yahoo] = ours;
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const YAHOO_BASE = 'https://query2.finance.yahoo.com';
const TIMEOUT_MS = 8000;

// --- Yahoo v7 crumb auth circuit breaker ---
// After 2 consecutive crumb failures, block v7 for 5 minutes.

let yahooBlocked = false;
let yahooBlockedUntil = 0;
let consecutiveCrumbFailures = 0;
const MAX_CRUMB_FAILURES = 5;
const BLOCK_DURATION_MS = 2 * 60 * 1000;

function markCrumbFailure(): void {
  consecutiveCrumbFailures++;
  if (consecutiveCrumbFailures >= MAX_CRUMB_FAILURES) {
    yahooBlocked = true;
    yahooBlockedUntil = Date.now() + BLOCK_DURATION_MS;
    console.warn(`[Yahoo] v7 blocked for 2 minutes after ${consecutiveCrumbFailures} consecutive crumb failures`);
  }
}

function markCrumbSuccess(): void {
  consecutiveCrumbFailures = 0;
  yahooBlocked = false;
}

function isYahooV7Blocked(): boolean {
  if (!yahooBlocked) return false;
  if (Date.now() >= yahooBlockedUntil) {
    yahooBlocked = false;
    consecutiveCrumbFailures = 0;
    return false;
  }
  return true;
}

// --- Crumb cache (survives within serverless instance lifetime) ---

let cachedCrumb: { cookie: string; crumb: string; expiresAt: number } | null = null;

async function getYahooCrumb(): Promise<{ cookie: string; crumb: string }> {
  if (cachedCrumb && cachedCrumb.expiresAt > Date.now()) {
    return cachedCrumb;
  }

  // Step 1: hit fc.yahoo.com to get A-cookies
  const cookieRes = await fetch('https://fc.yahoo.com', {
    redirect: 'manual',
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  const rawCookies = cookieRes.headers.getSetCookie?.() ?? [];
  const cookie = rawCookies.map((c) => c.split(';')[0]).join('; ');

  // Step 2: get crumb using those cookies
  const crumbRes = await fetch(`${YAHOO_BASE}/v1/test/getcrumb`, {
    headers: {
      Cookie: cookie,
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!crumbRes.ok) {
    throw new Error(`Yahoo crumb fetch failed: HTTP ${crumbRes.status}`);
  }

  const crumb = await crumbRes.text();
  if (!crumb || crumb.length > 50) {
    throw new Error('Invalid Yahoo crumb response');
  }

  cachedCrumb = { cookie, crumb, expiresAt: Date.now() + 25 * 60 * 1000 };
  return cachedCrumb;
}

// --- Public types ---

export interface YahooQuoteResult {
  symbol: string;          // Our display symbol (EUR/USD, SPX, AAPL, etc.)
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  volume: number;
  marketState: string;     // PRE, REGULAR, POST, CLOSED
}

// --- Public: fetch quotes for all our symbols ---

export const ALL_FOREX = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'];
export const ALL_INDEX_SYMBOLS = ['SPX', 'NDX', 'DJI', 'RUT'];
export const ALL_COMMODITY_SYMBOLS = ['XAU/USD', 'XAG/USD', 'CL=F', 'NG=F', 'PL=F', 'HG=F'];
export const ALL_STOCK_SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META'];

export const ALL_YAHOO_SYMBOLS = [
  ...ALL_FOREX,
  ...ALL_COMMODITY_SYMBOLS,
  ...ALL_INDEX_SYMBOLS,
  ...ALL_STOCK_SYMBOLS,
];

/**
 * Fetch batch quotes from Yahoo Finance v7 (crumb auth).
 * Returns only symbols that have real data (no placeholders).
 * Respects the circuit breaker — throws if v7 is blocked.
 */
export async function fetchYahooQuotes(
  symbols: string[]
): Promise<Record<string, YahooQuoteResult>> {
  if (isYahooV7Blocked()) {
    throw new Error('Yahoo v7 blocked (circuit breaker active)');
  }

  // Map our symbols to Yahoo tickers
  const yahooTickers = symbols.map((s) => YAHOO_SYMBOL_MAP[s] || s);
  const symbolParam = yahooTickers.join(',');

  let crumbData: { cookie: string; crumb: string };
  try {
    crumbData = await getYahooCrumb();
  } catch (err) {
    markCrumbFailure();
    throw err;
  }

  const { cookie, crumb } = crumbData;

  const url = `${YAHOO_BASE}/v7/finance/quote?symbols=${encodeURIComponent(symbolParam)}&crumb=${encodeURIComponent(crumb)}`;

  const response = await fetch(url, {
    headers: {
      Cookie: cookie,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });

  if (!response.ok) {
    // Invalidate crumb cache on auth errors so next call retries
    if (response.status === 401 || response.status === 403) {
      cachedCrumb = null;
      markCrumbFailure();
    }
    throw new Error(`Yahoo Finance HTTP ${response.status}`);
  }

  const json = await response.json();
  const quotes = json?.quoteResponse?.result;

  if (!Array.isArray(quotes)) {
    throw new Error('Yahoo Finance: unexpected response structure');
  }

  markCrumbSuccess();

  const results: Record<string, YahooQuoteResult> = {};

  for (const q of quotes) {
    if (!q || !q.symbol) continue;
    const yahooSym = q.symbol as string;
    const ourSymbol = REVERSE_SYMBOL_MAP[yahooSym] || yahooSym;

    const price = q.regularMarketPrice ?? 0;
    if (price === 0) continue; // Skip — no real data

    results[ourSymbol] = {
      symbol: ourSymbol,
      name: q.longName || q.shortName || ourSymbol,
      price,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      previousClose: q.regularMarketPreviousClose ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketState: q.marketState || 'CLOSED',
    };
  }

  return results;
}

/**
 * Fetch quotes via Yahoo v8 chart API (no crumb auth needed).
 * Fetches each symbol individually via Promise.allSettled.
 * Returns only symbols that have real data.
 */
export async function fetchViaV8Chart(
  symbols: string[]
): Promise<Record<string, YahooQuoteResult>> {
  const results: Record<string, YahooQuoteResult> = {};
  const BATCH_SIZE = 5;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);

    const fetches = batch.map(async (sym) => {
      const yahooTicker = YAHOO_SYMBOL_MAP[sym] || sym;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`v8 chart HTTP ${response.status} for ${yahooTicker}`);
      }

      const json = await response.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error(`v8 chart: no meta for ${yahooTicker}`);

      const price = meta.regularMarketPrice ?? 0;
      if (price === 0) throw new Error(`v8 chart: zero price for ${yahooTicker}`);

      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
      const change = prevClose > 0 ? price - prevClose : 0;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        ourSymbol: sym,
        result: {
          symbol: sym,
          name: meta.longName || meta.shortName || sym,
          price,
          change,
          changePercent: changePct,
          previousClose: prevClose,
          volume: meta.regularMarketVolume ?? 0,
          marketState: meta.marketState || 'CLOSED',
        } as YahooQuoteResult,
      };
    });

    const settled = await Promise.allSettled(fetches);

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results[outcome.value.ourSymbol] = outcome.value.result;
      }
    }
  }

  return results;
}

/**
 * Invalidate the crumb cache (useful if caller detects auth failure).
 */
export function invalidateYahooCrumb(): void {
  cachedCrumb = null;
}

/**
 * Check if Yahoo v7 is currently blocked by the circuit breaker.
 */
export function isV7Blocked(): boolean {
  return isYahooV7Blocked();
}
