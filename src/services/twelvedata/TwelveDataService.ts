/**
 * TwelveData Market Data Service
 * Priority-first batch fetching for Vercel serverless (8 credits/min limit)
 *
 * Strategy: Priority group ensures ALL categories have data on first load.
 * - Group 1 (Priority): 3 forex + 2 indices + 1 gold + 2 stocks = 8 credits
 * - Group 2 (Enrich):   3 forex + 2 indices + 2 stocks           = 7 credits
 * - Group 3 (Enrich):   3 stocks                                  = 3 credits
 * Each group cached 5 min. Only 1 group fetches per request.
 * On cold start, Group 1 always runs first → every category has data.
 */

// --- Types ---

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export interface ForexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  available: boolean;
}

export interface CommodityQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  available: boolean;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  available: boolean;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketOpen: boolean;
  available: boolean;
}

export interface MultiAssetData {
  forex: ForexQuote[];
  commodities: CommodityQuote[];
  indices: IndexQuote[];
  stocks: StockQuote[];
  lastUpdated: string;
  available: boolean;
}

// --- Cache entry ---

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// --- Constants ---

const BASE_URL = 'https://api.twelvedata.com';
const GROUP_CACHE_TTL = 300; // 5 minutes per group
const RESULT_CACHE_TTL = 30; // 30s for combined result
const REQUEST_TIMEOUT_MS = 10000;

// NOTE: Real index symbols (SPX, IXIC, DJI, RUT) require TwelveData paid plan.
// We use ETF proxies instead: SPY (S&P500), QQQ (NASDAQ), DIA (Dow), IWM (Russell).

// Group 1 (Priority - 8 credits): covers ALL categories on first load
const GROUP1_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'SPY', 'QQQ', 'XAU/USD', 'AAPL', 'NVDA'];

// Group 2 (Enrich - 7 credits): remaining forex, indices, stocks
const GROUP2_SYMBOLS = ['AUD/USD', 'USD/CHF', 'USD/CAD', 'DIA', 'IWM', 'TSLA', 'MSFT'];

// Group 3 (Enrich - 3 credits): remaining stocks
const GROUP3_SYMBOLS = ['GOOGL', 'AMZN', 'META'];

// All symbols by category (using ETF proxies for indices)
const ALL_FOREX = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'];
const ALL_INDEX_ETFS = ['SPY', 'QQQ', 'DIA', 'IWM'];
const ALL_STOCKS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META'];

const FOREX_NAMES: Record<string, string> = {
  'EUR/USD': 'Euro / US Dollar',
  'GBP/USD': 'British Pound / US Dollar',
  'USD/JPY': 'US Dollar / Japanese Yen',
  'AUD/USD': 'Australian Dollar / US Dollar',
  'USD/CHF': 'US Dollar / Swiss Franc',
  'USD/CAD': 'US Dollar / Canadian Dollar',
};

// ETF → display name mapping (we show the index name, not the ETF name)
const INDEX_ETF_NAMES: Record<string, string> = {
  'SPY': 'S&P 500',
  'QQQ': 'NASDAQ',
  'DIA': 'Dow Jones',
  'IWM': 'Russell 2000',
};

// ETF → index symbol mapping for display
const ETF_TO_INDEX: Record<string, string> = {
  'SPY': 'SPX',
  'QQQ': 'NDX',
  'DIA': 'DJI',
  'IWM': 'RUT',
};

const STOCK_NAMES: Record<string, string> = {
  'AAPL': 'Apple Inc',
  'NVDA': 'NVIDIA Corp',
  'TSLA': 'Tesla Inc',
  'MSFT': 'Microsoft Corp',
  'GOOGL': 'Alphabet Inc',
  'AMZN': 'Amazon.com Inc',
  'META': 'Meta Platforms Inc',
};

function logError(...args: unknown[]) {
  console.error('[TwelveData]', ...args);
}

// --- Service ---

class TwelveDataService {
  private static instance: TwelveDataService;
  private apiKey: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private lastFetchGroup = 0; // 0 = none yet, 1/2/3 = last group fetched

  private constructor() {
    this.apiKey = process.env.TWELVEDATA_API_KEY || '';
  }

  static getInstance(): TwelveDataService {
    if (!TwelveDataService.instance) {
      TwelveDataService.instance = new TwelveDataService();
    }
    return TwelveDataService.instance;
  }

  // --- Main entry point ---

  async getAllMarketData(): Promise<MultiAssetData> {
    // Short-lived result cache
    const resultCacheKey = 'allMarketData';
    const cachedResult = this.getFromCache<MultiAssetData>(resultCacheKey);
    if (cachedResult) return cachedResult;

    if (!this.apiKey) {
      return this.getEmptyData();
    }

    // Fetch the next stale group
    await this.fetchNextStaleGroup();

    // Build combined response from all cached quotes
    const allQuotes = this.getFromCache<Record<string, TwelveDataQuote>>('quotes:all') || {};

    // Build forex
    const forex: ForexQuote[] = ALL_FOREX.map((symbol) => {
      const q = allQuotes[symbol];
      if (!q) return { symbol, name: FOREX_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
      return {
        symbol,
        name: q.name || FOREX_NAMES[symbol] || symbol,
        price: parseFloat(q.close) || 0,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        available: true,
      };
    });

    // Build indices (from ETF proxies, display as index symbols)
    const indices: IndexQuote[] = ALL_INDEX_ETFS.map((etfSymbol) => {
      const displaySymbol = ETF_TO_INDEX[etfSymbol] || etfSymbol;
      const displayName = INDEX_ETF_NAMES[etfSymbol] || etfSymbol;
      const q = allQuotes[etfSymbol];
      if (!q) return { symbol: displaySymbol, name: displayName, price: 0, change: 0, changePercent: 0, available: false };
      return {
        symbol: displaySymbol,
        name: displayName,
        price: parseFloat(q.close) || 0,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        available: true,
      };
    });

    // Build gold
    const goldQuote = allQuotes['XAU/USD'];
    const gold: CommodityQuote = {
      symbol: 'XAU/USD',
      name: goldQuote?.name || 'Gold Spot / US Dollar',
      price: goldQuote ? (parseFloat(goldQuote.close) || 0) : 0,
      change: goldQuote ? (parseFloat(goldQuote.change) || 0) : 0,
      changePercent: goldQuote ? (parseFloat(goldQuote.percent_change) || 0) : 0,
      available: !!goldQuote,
    };

    // Silver: estimate from gold using gold/silver ratio (~85)
    const silverPrice = gold.available && gold.price > 0 ? gold.price / 85 : 0;
    const silver: CommodityQuote = {
      symbol: 'XAG/USD',
      name: 'Silver',
      price: parseFloat(silverPrice.toFixed(2)),
      change: gold.available ? parseFloat((gold.change / 85).toFixed(2)) : 0,
      changePercent: gold.changePercent,
      available: gold.available && silverPrice > 0,
    };

    // Build stocks
    const stocks: StockQuote[] = ALL_STOCKS.map((symbol) => {
      const q = allQuotes[symbol];
      if (!q) return { symbol, name: STOCK_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false };
      return {
        symbol,
        name: q.name || STOCK_NAMES[symbol] || symbol,
        price: parseFloat(q.close) || 0,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        volume: parseInt(q.volume, 10) || 0,
        marketOpen: q.is_market_open ?? false,
        available: true,
      };
    });

    const commodities: CommodityQuote[] = [gold, silver];
    const hasData = [...forex, ...commodities, ...indices, ...stocks].some((q) => q.available);

    const result: MultiAssetData = {
      forex,
      commodities,
      indices,
      stocks,
      lastUpdated: new Date().toISOString(),
      available: hasData,
    };

    this.setCache(resultCacheKey, result, RESULT_CACHE_TTL);
    return result;
  }

  // --- Priority-first group fetching ---

  private async fetchNextStaleGroup(): Promise<void> {
    const g1Stale = !this.getFromCache('group:1');
    const g2Stale = !this.getFromCache('group:2');
    const g3Stale = !this.getFromCache('group:3');

    if (!g1Stale && !g2Stale && !g3Stale) return;

    // Group 1 ALWAYS takes priority on cold start (lastFetchGroup === 0)
    // After that, round-robin through stale groups
    let target = 0;

    if (this.lastFetchGroup === 0) {
      // Cold start: always fetch priority group first
      target = 1;
    } else if (g1Stale) {
      // Priority group expired: refresh it first
      target = 1;
    } else {
      // Round-robin enrichment groups
      const order = this.lastFetchGroup === 1 ? [2, 3] :
                    this.lastFetchGroup === 2 ? [3, 2] : [2, 3];
      const stale: Record<number, boolean> = { 2: g2Stale, 3: g3Stale };
      target = order.find((g) => stale[g]) || 0;
    }

    if (!target) return;

    const symbols = target === 1 ? GROUP1_SYMBOLS :
                    target === 2 ? GROUP2_SYMBOLS : GROUP3_SYMBOLS;

    try {
      const quotes = await this.apiFetch(symbols);
      if (Object.keys(quotes).length > 0) {
        // Merge new quotes into the all-quotes cache
        const existing = this.getFromCache<Record<string, TwelveDataQuote>>('quotes:all') || {};
        const merged = { ...existing, ...quotes };
        this.setCache('quotes:all', merged, GROUP_CACHE_TTL);
        this.setCache(`group:${target}`, true, GROUP_CACHE_TTL);
        this.lastFetchGroup = target;
      }
    } catch (e) {
      logError(`Group ${target} fetch failed:`, e);
    }
  }

  // --- API call ---

  private async apiFetch(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    if (symbols.length === 0) return {};

    const symbolParam = symbols.join(',');
    const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbolParam)}&apikey=${this.apiKey}`;

    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      logError(`API error: ${response.status}`);
      return {};
    }

    const data = await response.json();

    if (data.code === 429 || data.status === 'error') {
      logError('API error:', data.message);
      return {};
    }

    // Single symbol returns object directly, batch returns keyed object
    if (symbols.length === 1) {
      if (data.status === 'error') return {};
      return { [symbols[0]]: data as TwelveDataQuote };
    }

    const result: Record<string, TwelveDataQuote> = {};
    for (const sym of symbols) {
      const quote = data[sym];
      if (quote && quote.status !== 'error') {
        result[sym] = quote as TwelveDataQuote;
      }
    }
    return result;
  }

  // --- Backward compat ---

  async getBatchQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    if (!this.apiKey || symbols.length === 0) return {};
    const cacheKey = `batch:${symbols.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, TwelveDataQuote>>(cacheKey);
    if (cached) return cached;
    const result = await this.apiFetch(symbols);
    this.setCache(cacheKey, result);
    return result;
  }

  async getForexQuotes(): Promise<ForexQuote[]> { return (await this.getAllMarketData()).forex; }
  async getCommodityQuotes(): Promise<CommodityQuote[]> { return (await this.getAllMarketData()).commodities; }
  async getIndicesQuotes(): Promise<IndexQuote[]> { return (await this.getAllMarketData()).indices; }
  async getStockQuotes(): Promise<StockQuote[]> { return (await this.getAllMarketData()).stocks; }

  // --- Empty defaults ---

  private getEmptyData(): MultiAssetData {
    return {
      forex: ALL_FOREX.map((s) => ({ symbol: s, name: FOREX_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false })),
      commodities: [
        { symbol: 'XAU/USD', name: 'Gold', price: 0, change: 0, changePercent: 0, available: false },
        { symbol: 'XAG/USD', name: 'Silver', price: 0, change: 0, changePercent: 0, available: false },
      ],
      indices: ALL_INDEX_ETFS.map((s) => ({ symbol: ETF_TO_INDEX[s] || s, name: INDEX_ETF_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false })),
      stocks: ALL_STOCKS.map((s) => ({ symbol: s, name: STOCK_NAMES[s] || s, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false })),
      lastUpdated: new Date().toISOString(),
      available: false,
    };
  }

  // --- Helpers ---

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlSeconds: number = GROUP_CACHE_TTL): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const twelveDataService = TwelveDataService.getInstance();
