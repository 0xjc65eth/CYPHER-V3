/**
 * Twelve Data API Service
 * Provides real-time stock, forex, commodity, and index quotes
 * https://twelvedata.com/docs
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

const BASE_URL = 'https://api.twelvedata.com';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const MAX_REQUESTS_PER_MINUTE = 8;
const MAX_REQUESTS_PER_DAY = 800;
const REQUEST_TIMEOUT_MS = 15000;

const FOREX_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'];
const COMMODITY_SYMBOLS = ['XAU/USD', 'XAG/USD'];
const INDEX_SYMBOLS = ['SPX', 'IXIC', 'DJI', 'RUT'];
const STOCK_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'];

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
};

const INDEX_NAMES: Record<string, string> = {
  'SPX': 'S&P 500',
  'IXIC': 'NASDAQ Composite',
  'DJI': 'Dow Jones Industrial Average',
  'RUT': 'Russell 2000',
};

const DEBUG = process.env.NODE_ENV === 'development';

function log(...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
  }
}

function logError(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error('[TwelveData]', ...args);
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

  // --- Public methods ---

  async getBatchQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    if (!this.apiKey) {
      log('No API key configured');
      return {};
    }

    if (symbols.length === 0) return {};

    const cacheKey = `batch:${symbols.sort().join(',')}`;
    const cached = this.getFromCache<Record<string, TwelveDataQuote>>(cacheKey);
    if (cached) return cached;

    if (!this.canMakeRequest()) {
      log('Rate limit reached, returning empty');
      return {};
    }

    try {
      const symbolParam = symbols.join(',');
      const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbolParam)}&apikey=${this.apiKey}`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        logError(`API error: ${response.status} ${response.statusText}`);
        return {};
      }

      const data = await response.json();
      this.recordRequest();

      // Single symbol returns object directly, batch returns keyed object
      let result: Record<string, TwelveDataQuote>;
      if (symbols.length === 1) {
        if (data.status === 'error') {
          logError(`Quote error for ${symbols[0]}: ${data.message}`);
          return {};
        }
        result = { [symbols[0]]: data as TwelveDataQuote };
      } else {
        result = {} as Record<string, TwelveDataQuote>;
        for (const sym of symbols) {
          const quote = data[sym];
          if (quote && quote.status !== 'error') {
            result[sym] = quote as TwelveDataQuote;
          }
        }
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logError('Failed to fetch batch quotes:', error);
      return {};
    }
  }

  async getForexQuotes(): Promise<ForexQuote[]> {
    const cacheKey = 'forex';
    const cached = this.getFromCache<ForexQuote[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      return FOREX_SYMBOLS.map((s) => ({
        symbol: s,
        name: FOREX_NAMES[s] || s,
        price: 0,
        change: 0,
        changePercent: 0,
        available: false,
      }));
    }

    const quotes = await this.getBatchQuotes(FOREX_SYMBOLS);
    const result: ForexQuote[] = FOREX_SYMBOLS.map((symbol) => {
      const q = quotes[symbol];
      if (!q) {
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

    this.setCache(cacheKey, result);
    return result;
  }

  async getCommodityQuotes(): Promise<CommodityQuote[]> {
    const cacheKey = 'commodities';
    const cached = this.getFromCache<CommodityQuote[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      return COMMODITY_SYMBOLS.map((s) => ({
        symbol: s,
        name: COMMODITY_NAMES[s] || s,
        price: 0,
        change: 0,
        changePercent: 0,
        available: false,
      }));
    }

    const quotes = await this.getBatchQuotes(COMMODITY_SYMBOLS);
    const result: CommodityQuote[] = COMMODITY_SYMBOLS.map((symbol) => {
      const q = quotes[symbol];
      if (!q) {
        return { symbol, name: COMMODITY_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
      }
      return {
        symbol,
        name: q.name || COMMODITY_NAMES[symbol] || symbol,
        price: parseFloat(q.close) || 0,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        available: true,
      };
    });

    this.setCache(cacheKey, result);
    return result;
  }

  async getIndicesQuotes(): Promise<IndexQuote[]> {
    const cacheKey = 'indices';
    const cached = this.getFromCache<IndexQuote[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      return INDEX_SYMBOLS.map((s) => ({
        symbol: s,
        name: INDEX_NAMES[s] || s,
        price: 0,
        change: 0,
        changePercent: 0,
        available: false,
      }));
    }

    const quotes = await this.getBatchQuotes(INDEX_SYMBOLS);
    const result: IndexQuote[] = INDEX_SYMBOLS.map((symbol) => {
      const q = quotes[symbol];
      if (!q) {
        return { symbol, name: INDEX_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
      }
      return {
        symbol,
        name: q.name || INDEX_NAMES[symbol] || symbol,
        price: parseFloat(q.close) || 0,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        available: true,
      };
    });

    this.setCache(cacheKey, result);
    return result;
  }

  async getStockQuotes(): Promise<StockQuote[]> {
    const cacheKey = 'stocks';
    const cached = this.getFromCache<StockQuote[]>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      return STOCK_SYMBOLS.map((s) => ({
        symbol: s,
        name: s,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketOpen: false,
        available: false,
      }));
    }

    const quotes = await this.getBatchQuotes(STOCK_SYMBOLS);
    const result: StockQuote[] = STOCK_SYMBOLS.map((symbol) => {
      const q = quotes[symbol];
      if (!q) {
        return { symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false };
      }
      return {
        symbol,
        name: q.name || symbol,
        price: parseFloat(q.close) || 0,
        change: parseFloat(q.change) || 0,
        changePercent: parseFloat(q.percent_change) || 0,
        volume: parseInt(q.volume, 10) || 0,
        marketOpen: q.is_market_open ?? false,
        available: true,
      };
    });

    this.setCache(cacheKey, result);
    return result;
  }

  async getAllMarketData(): Promise<MultiAssetData> {
    const cacheKey = 'allMarketData';
    const cached = this.getFromCache<MultiAssetData>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      return this.getEmptyMarketData();
    }

    // Combine ALL symbols into 2 batch calls to minimize API credit usage
    // (TwelveData basic plan: 8 credits/min, each call = 1 credit)
    // Batch 1: Forex + Commodities (8 symbols)
    // Batch 2: Indices + Stocks (11 symbols)
    const batch1Symbols = [...FOREX_SYMBOLS, ...COMMODITY_SYMBOLS];
    const batch2Symbols = [...INDEX_SYMBOLS, ...STOCK_SYMBOLS];

    const [batch1, batch2] = await Promise.all([
      this.getBatchQuotes(batch1Symbols),
      this.getBatchQuotes(batch2Symbols),
    ]);

    const allQuotes = { ...batch1, ...batch2 };

    const forex = this.mapForexQuotes(allQuotes);
    const commodities = this.mapCommodityQuotes(allQuotes);
    const indices = this.mapIndexQuotes(allQuotes);
    const stocks = this.mapStockQuotes(allQuotes);

    const hasData = [...forex, ...commodities, ...indices, ...stocks].some((q) => q.available);

    const result: MultiAssetData = {
      forex,
      commodities,
      indices,
      stocks,
      lastUpdated: new Date().toISOString(),
      available: hasData,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  private getEmptyMarketData(): MultiAssetData {
    return {
      forex: FOREX_SYMBOLS.map((s) => ({ symbol: s, name: FOREX_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false })),
      commodities: COMMODITY_SYMBOLS.map((s) => ({ symbol: s, name: COMMODITY_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false })),
      indices: INDEX_SYMBOLS.map((s) => ({ symbol: s, name: INDEX_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false })),
      stocks: STOCK_SYMBOLS.map((s) => ({ symbol: s, name: s, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false })),
      lastUpdated: new Date().toISOString(),
      available: false,
    };
  }

  private mapForexQuotes(allQuotes: Record<string, TwelveDataQuote>): ForexQuote[] {
    return FOREX_SYMBOLS.map((symbol) => {
      const q = allQuotes[symbol];
      if (!q) return { symbol, name: FOREX_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
      return { symbol, name: q.name || FOREX_NAMES[symbol] || symbol, price: parseFloat(q.close) || 0, change: parseFloat(q.change) || 0, changePercent: parseFloat(q.percent_change) || 0, available: true };
    });
  }

  private mapCommodityQuotes(allQuotes: Record<string, TwelveDataQuote>): CommodityQuote[] {
    return COMMODITY_SYMBOLS.map((symbol) => {
      const q = allQuotes[symbol];
      if (!q) return { symbol, name: COMMODITY_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
      return { symbol, name: q.name || COMMODITY_NAMES[symbol] || symbol, price: parseFloat(q.close) || 0, change: parseFloat(q.change) || 0, changePercent: parseFloat(q.percent_change) || 0, available: true };
    });
  }

  private mapIndexQuotes(allQuotes: Record<string, TwelveDataQuote>): IndexQuote[] {
    return INDEX_SYMBOLS.map((symbol) => {
      const q = allQuotes[symbol];
      if (!q) return { symbol, name: INDEX_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
      return { symbol, name: q.name || INDEX_NAMES[symbol] || symbol, price: parseFloat(q.close) || 0, change: parseFloat(q.change) || 0, changePercent: parseFloat(q.percent_change) || 0, available: true };
    });
  }

  private mapStockQuotes(allQuotes: Record<string, TwelveDataQuote>): StockQuote[] {
    return STOCK_SYMBOLS.map((symbol) => {
      const q = allQuotes[symbol];
      if (!q) return { symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false };
      return { symbol, name: q.name || symbol, price: parseFloat(q.close) || 0, change: parseFloat(q.change) || 0, changePercent: parseFloat(q.percent_change) || 0, volume: parseInt(q.volume, 10) || 0, marketOpen: q.is_market_open ?? false, available: true };
    });
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

    // Reset minute counter
    if (now > this.rateLimit.minuteResetAt) {
      this.rateLimit.minuteRequests = 0;
      this.rateLimit.minuteResetAt = now + 60_000;
    }

    // Reset daily counter
    if (now > this.rateLimit.dailyResetAt) {
      this.rateLimit.dailyRequests = 0;
      this.rateLimit.dailyResetAt = this.getEndOfDay();
    }

    if (this.rateLimit.minuteRequests >= MAX_REQUESTS_PER_MINUTE) {
      log('Minute rate limit reached');
      return false;
    }

    if (this.rateLimit.dailyRequests >= MAX_REQUESTS_PER_DAY) {
      log('Daily rate limit reached');
      return false;
    }

    return true;
  }

  private recordRequest(): void {
    this.rateLimit.minuteRequests++;
    this.rateLimit.dailyRequests++;
  }

  private getEndOfDay(): number {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return endOfDay.getTime();
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const twelveDataService = TwelveDataService.getInstance();
