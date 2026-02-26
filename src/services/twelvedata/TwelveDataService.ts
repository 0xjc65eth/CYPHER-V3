/**
 * Multi-Source Market Data Service
 * - TwelveData: Forex + Gold (7 credits/min on basic plan)
 * - Yahoo Finance: Stocks, Indices, Silver (free, no key needed)
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

// --- Rate limit tracker ---

interface RateLimitState {
  minuteRequests: number;
  minuteResetAt: number;
  dailyRequests: number;
  dailyResetAt: number;
}

// --- Constants ---

const TD_BASE_URL = 'https://api.twelvedata.com';
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const MAX_CREDITS_PER_MINUTE = 7; // Keep 1 spare of 8 limit
const MAX_REQUESTS_PER_DAY = 800;
const REQUEST_TIMEOUT_MS = 10000;

// TwelveData: Forex + Gold only (7 credits/min on basic plan)
const FOREX_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'];
const TD_COMMODITY_SYMBOLS = ['XAU/USD']; // Gold only (Silver requires paid plan)

// Yahoo Finance: Stocks, Indices, Silver (free, no API key)
const YAHOO_INDEX_MAP: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ Composite',
  '^DJI': 'Dow Jones Industrial Average',
  '^RUT': 'Russell 2000',
};
const YAHOO_STOCK_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'];
const YAHOO_SILVER_SYMBOL = 'SI=F'; // Silver futures

// Display symbol mapping (Yahoo → display)
const INDEX_DISPLAY_MAP: Record<string, string> = {
  '^GSPC': 'SPX',
  '^IXIC': 'IXIC',
  '^DJI': 'DJI',
  '^RUT': 'RUT',
};

const FOREX_NAMES: Record<string, string> = {
  'EUR/USD': 'Euro / US Dollar',
  'GBP/USD': 'British Pound / US Dollar',
  'USD/JPY': 'US Dollar / Japanese Yen',
  'AUD/USD': 'Australian Dollar / US Dollar',
  'USD/CHF': 'US Dollar / Swiss Franc',
  'USD/CAD': 'US Dollar / Canadian Dollar',
};

function logError(...args: unknown[]) {
  console.error('[MarketData]', ...args);
}

// --- Service ---

class TwelveDataService {
  private static instance: TwelveDataService;
  private apiKey: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private rateLimit: RateLimitState;

  private constructor() {
    this.apiKey = process.env.TWELVEDATA_API_KEY || '';
    this.rateLimit = {
      minuteRequests: 0,
      minuteResetAt: Date.now() + 60_000,
      dailyRequests: 0,
      dailyResetAt: this.getEndOfDay(),
    };
  }

  static getInstance(): TwelveDataService {
    if (!TwelveDataService.instance) {
      TwelveDataService.instance = new TwelveDataService();
    }
    return TwelveDataService.instance;
  }

  // --- Main entry point ---

  async getAllMarketData(): Promise<MultiAssetData> {
    const cacheKey = 'allMarketData';
    const cached = this.getFromCache<MultiAssetData>(cacheKey);
    if (cached) return cached;

    // Fetch from TwelveData (forex + gold) and Yahoo Finance (stocks + indices + silver) in parallel
    const [tdResult, yahooResult] = await Promise.all([
      this.fetchTwelveDataBatch(),
      this.fetchYahooFinanceBatch(),
    ]);

    // Combine gold from TwelveData with silver from Yahoo
    const commodities: CommodityQuote[] = [
      ...tdResult.commodities,
      ...yahooResult.silver,
    ];

    const hasData = [
      ...tdResult.forex, ...commodities, ...yahooResult.indices, ...yahooResult.stocks
    ].some((q) => q.available);

    const result: MultiAssetData = {
      forex: tdResult.forex,
      commodities,
      indices: yahooResult.indices,
      stocks: yahooResult.stocks,
      lastUpdated: new Date().toISOString(),
      available: hasData,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // --- Individual getters (for backward compatibility) ---

  async getForexQuotes(): Promise<ForexQuote[]> {
    const data = await this.getAllMarketData();
    return data.forex;
  }

  async getCommodityQuotes(): Promise<CommodityQuote[]> {
    const data = await this.getAllMarketData();
    return data.commodities;
  }

  async getIndicesQuotes(): Promise<IndexQuote[]> {
    const data = await this.getAllMarketData();
    return data.indices;
  }

  async getStockQuotes(): Promise<StockQuote[]> {
    const data = await this.getAllMarketData();
    return data.stocks;
  }

  // --- TwelveData: Forex + Gold (7 credits) ---

  private async fetchTwelveDataBatch(): Promise<{
    forex: ForexQuote[];
    commodities: CommodityQuote[];
  }> {
    const emptyForex = FOREX_SYMBOLS.map((s) => ({
      symbol: s, name: FOREX_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false,
    }));
    const emptyGold: CommodityQuote[] = [{
      symbol: 'XAU/USD', name: 'Gold', price: 0, change: 0, changePercent: 0, available: false,
    }];

    if (!this.apiKey) {
      return { forex: emptyForex, commodities: emptyGold };
    }

    if (!this.canMakeRequest()) {
      return { forex: emptyForex, commodities: emptyGold };
    }

    try {
      const allSymbols = [...FOREX_SYMBOLS, ...TD_COMMODITY_SYMBOLS];
      const symbolParam = allSymbols.join(',');
      const url = `${TD_BASE_URL}/quote?symbol=${encodeURIComponent(symbolParam)}&apikey=${this.apiKey}`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        logError(`TwelveData API error: ${response.status}`);
        return { forex: emptyForex, commodities: emptyGold };
      }

      const data = await response.json();

      if (data.code === 429 || data.status === 'error') {
        logError('TwelveData rate limit or error:', data.message);
        return { forex: emptyForex, commodities: emptyGold };
      }

      this.recordRequest(allSymbols.length);

      // Parse forex
      const forex: ForexQuote[] = FOREX_SYMBOLS.map((symbol) => {
        const q = data[symbol];
        if (!q || q.status === 'error') {
          return { symbol, name: FOREX_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
        }
        return {
          symbol,
          name: q.name || FOREX_NAMES[symbol] || symbol,
          price: parseFloat(q.close) || 0,
          change: parseFloat(q.change) || 0,
          changePercent: parseFloat(q.percent_change) || 0,
          available: true,
        };
      });

      // Parse gold
      const goldQuote = data['XAU/USD'];
      const commodities: CommodityQuote[] = [{
        symbol: 'XAU/USD',
        name: goldQuote?.name || 'Gold Spot / US Dollar',
        price: goldQuote ? (parseFloat(goldQuote.close) || 0) : 0,
        change: goldQuote ? (parseFloat(goldQuote.change) || 0) : 0,
        changePercent: goldQuote ? (parseFloat(goldQuote.percent_change) || 0) : 0,
        available: !!goldQuote && goldQuote.status !== 'error',
      }];

      return { forex, commodities };
    } catch (error) {
      logError('TwelveData fetch failed:', error);
      return { forex: emptyForex, commodities: emptyGold };
    }
  }

  // --- Yahoo Finance: Stocks + Indices + Silver (free) ---

  private async fetchYahooFinanceBatch(): Promise<{
    indices: IndexQuote[];
    stocks: StockQuote[];
    silver: CommodityQuote[];
  }> {
    const emptyIndices = Object.entries(YAHOO_INDEX_MAP).map(([yahoo, name]) => ({
      symbol: INDEX_DISPLAY_MAP[yahoo] || yahoo, name, price: 0, change: 0, changePercent: 0, available: false,
    }));
    const emptyStocks = YAHOO_STOCK_SYMBOLS.map((s) => ({
      symbol: s, name: s, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false,
    }));
    const emptySilver: CommodityQuote[] = [{
      symbol: 'XAG/USD', name: 'Silver', price: 0, change: 0, changePercent: 0, available: false,
    }];

    try {
      const allSymbols = [
        ...Object.keys(YAHOO_INDEX_MAP),
        ...YAHOO_STOCK_SYMBOLS,
        YAHOO_SILVER_SYMBOL,
      ];
      const symbolParam = allSymbols.join(',');
      const url = `${YAHOO_BASE_URL}/v7/finance/quote?symbols=${encodeURIComponent(symbolParam)}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,marketState`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        logError(`Yahoo Finance API error: ${response.status}`);
        return { indices: emptyIndices, stocks: emptyStocks, silver: emptySilver };
      }

      const data = await response.json();
      const quotes = data?.quoteResponse?.result;

      if (!Array.isArray(quotes) || quotes.length === 0) {
        logError('Yahoo Finance returned no quotes');
        return { indices: emptyIndices, stocks: emptyStocks, silver: emptySilver };
      }

      // Build lookup
      const quoteMap = new Map<string, any>();
      for (const q of quotes) {
        quoteMap.set(q.symbol, q);
      }

      // Parse indices
      const indices: IndexQuote[] = Object.entries(YAHOO_INDEX_MAP).map(([yahooSymbol, displayName]) => {
        const q = quoteMap.get(yahooSymbol);
        if (!q || typeof q.regularMarketPrice !== 'number') {
          return { symbol: INDEX_DISPLAY_MAP[yahooSymbol] || yahooSymbol, name: displayName, price: 0, change: 0, changePercent: 0, available: false };
        }
        return {
          symbol: INDEX_DISPLAY_MAP[yahooSymbol] || yahooSymbol,
          name: q.shortName || displayName,
          price: q.regularMarketPrice,
          change: q.regularMarketChange || 0,
          changePercent: q.regularMarketChangePercent || 0,
          available: true,
        };
      });

      // Parse stocks
      const stocks: StockQuote[] = YAHOO_STOCK_SYMBOLS.map((symbol) => {
        const q = quoteMap.get(symbol);
        if (!q || typeof q.regularMarketPrice !== 'number') {
          return { symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false };
        }
        return {
          symbol,
          name: q.shortName || symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange || 0,
          changePercent: q.regularMarketChangePercent || 0,
          volume: q.regularMarketVolume || 0,
          marketOpen: q.marketState === 'REGULAR',
          available: true,
        };
      });

      // Parse silver
      const silverQuote = quoteMap.get(YAHOO_SILVER_SYMBOL);
      const silver: CommodityQuote[] = [{
        symbol: 'XAG/USD',
        name: 'Silver',
        price: silverQuote?.regularMarketPrice || 0,
        change: silverQuote?.regularMarketChange || 0,
        changePercent: silverQuote?.regularMarketChangePercent || 0,
        available: !!silverQuote && typeof silverQuote.regularMarketPrice === 'number',
      }];

      return { indices, stocks, silver };
    } catch (error) {
      logError('Yahoo Finance fetch failed:', error);
      return { indices: emptyIndices, stocks: emptyStocks, silver: emptySilver };
    }
  }

  // --- TwelveData batch quote (kept for backward compat) ---

  async getBatchQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    if (!this.apiKey || symbols.length === 0) return {};

    const cacheKey = `batch:${symbols.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, TwelveDataQuote>>(cacheKey);
    if (cached) return cached;

    if (!this.canMakeRequest()) return {};

    try {
      const symbolParam = symbols.join(',');
      const url = `${TD_BASE_URL}/quote?symbol=${encodeURIComponent(symbolParam)}&apikey=${this.apiKey}`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) return {};

      const data = await response.json();
      if (data.code === 429 || data.status === 'error') return {};

      this.recordRequest(symbols.length);

      let result: Record<string, TwelveDataQuote>;
      if (symbols.length === 1) {
        if (data.status === 'error') return {};
        result = { [symbols[0]]: data as TwelveDataQuote };
      } else {
        result = {};
        for (const sym of symbols) {
          const quote = data[sym];
          if (quote && quote.status !== 'error') {
            result[sym] = quote as TwelveDataQuote;
          }
        }
      }

      this.setCache(cacheKey, result);
      return result;
    } catch {
      return {};
    }
  }

  // --- Private helpers ---

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL_SECONDS): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    if (now > this.rateLimit.minuteResetAt) {
      this.rateLimit.minuteRequests = 0;
      this.rateLimit.minuteResetAt = now + 60_000;
    }
    if (now > this.rateLimit.dailyResetAt) {
      this.rateLimit.dailyRequests = 0;
      this.rateLimit.dailyResetAt = this.getEndOfDay();
    }
    return this.rateLimit.minuteRequests < MAX_CREDITS_PER_MINUTE &&
           this.rateLimit.dailyRequests < MAX_REQUESTS_PER_DAY;
  }

  private recordRequest(credits: number = 1): void {
    this.rateLimit.minuteRequests += credits;
    this.rateLimit.dailyRequests += credits;
  }

  private getEndOfDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
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
