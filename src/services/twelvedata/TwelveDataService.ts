/**
 * TwelveData Market Data Service
 * Staggered batch fetching to stay within 8 credits/min limit
 *
 * Strategy: 3 cache groups fetched on rotation
 * - Group A: forex (6 symbols = 6 credits)
 * - Group B: indices + gold (5 symbols = 5 credits)
 * - Group C: stocks (7 symbols = 7 credits)
 * Each group cached 5 min. Only 1 group fetches per request.
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
const RESULT_CACHE_TTL = 60; // 1 minute for combined result
const REQUEST_TIMEOUT_MS = 10000;

// Group A: Forex (6 credits)
const FOREX_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD'];

// Group B: Indices + Gold (5 credits) - Silver requires paid plan
const GROUP_B_SYMBOLS = ['SPX', 'IXIC', 'DJI', 'RUT', 'XAU/USD'];

// Group C: Stocks (7 credits)
const STOCK_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'];

const FOREX_NAMES: Record<string, string> = {
  'EUR/USD': 'Euro / US Dollar',
  'GBP/USD': 'British Pound / US Dollar',
  'USD/JPY': 'US Dollar / Japanese Yen',
  'AUD/USD': 'Australian Dollar / US Dollar',
  'USD/CHF': 'US Dollar / Swiss Franc',
  'USD/CAD': 'US Dollar / Canadian Dollar',
};

const INDEX_NAMES: Record<string, string> = {
  'SPX': 'S&P 500',
  'IXIC': 'NASDAQ Composite',
  'DJI': 'Dow Jones Industrial Average',
  'RUT': 'Russell 2000',
};

function logError(...args: unknown[]) {
  console.error('[TwelveData]', ...args);
}

// --- Service ---

class TwelveDataService {
  private static instance: TwelveDataService;
  private apiKey: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private lastFetchGroup: 'A' | 'B' | 'C' = 'C'; // Start so first fetch is A

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
    // Short-lived result cache to avoid redundant work within same request cycle
    const resultCacheKey = 'allMarketData';
    const cachedResult = this.getFromCache<MultiAssetData>(resultCacheKey);
    if (cachedResult) return cachedResult;

    if (!this.apiKey) {
      return this.getEmptyData();
    }

    // Fetch the next stale group (only 1 per request to stay within rate limit)
    await this.fetchNextStaleGroup();

    // Combine all cached group data
    const forex = this.getFromCache<ForexQuote[]>('group:forex') || this.emptyForex();
    const groupB = this.getFromCache<{ indices: IndexQuote[]; gold: CommodityQuote }>('group:indices_gold');
    const stocks = this.getFromCache<StockQuote[]>('group:stocks') || this.emptyStocks();

    const indices = groupB?.indices || this.emptyIndices();
    const gold = groupB?.gold || { symbol: 'XAU/USD', name: 'Gold', price: 0, change: 0, changePercent: 0, available: false };

    // Silver: estimate from gold using gold/silver ratio (~85)
    const silverPrice = gold.available && gold.price > 0 ? gold.price / 85 : 0;
    const silver: CommodityQuote = {
      symbol: 'XAG/USD',
      name: 'Silver',
      price: parseFloat(silverPrice.toFixed(2)),
      change: gold.available ? parseFloat((gold.change / 85).toFixed(2)) : 0,
      changePercent: gold.changePercent, // Same % as gold (approximate)
      available: gold.available && silverPrice > 0,
    };

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

  // --- Staggered group fetching ---

  private async fetchNextStaleGroup(): Promise<void> {
    // Check which groups have expired cache
    const forexStale = !this.getFromCache('group:forex');
    const groupBStale = !this.getFromCache('group:indices_gold');
    const stocksStale = !this.getFromCache('group:stocks');

    // Priority: rotate A → B → C, but only fetch stale groups
    const nextGroup = this.getNextGroup(forexStale, groupBStale, stocksStale);
    if (!nextGroup) return; // All cached

    switch (nextGroup) {
      case 'A':
        await this.fetchGroupA();
        break;
      case 'B':
        await this.fetchGroupB();
        break;
      case 'C':
        await this.fetchGroupC();
        break;
    }

    this.lastFetchGroup = nextGroup;
  }

  private getNextGroup(aStale: boolean, bStale: boolean, cStale: boolean): 'A' | 'B' | 'C' | null {
    if (!aStale && !bStale && !cStale) return null;

    // Round-robin priority after last fetch
    const order: ('A' | 'B' | 'C')[] =
      this.lastFetchGroup === 'A' ? ['B', 'C', 'A'] :
      this.lastFetchGroup === 'B' ? ['C', 'A', 'B'] :
      ['A', 'B', 'C'];

    const stale = { A: aStale, B: bStale, C: cStale };
    return order.find((g) => stale[g]) || null;
  }

  private async fetchGroupA(): Promise<void> {
    try {
      const quotes = await this.apiFetch(FOREX_SYMBOLS);
      const forex: ForexQuote[] = FOREX_SYMBOLS.map((symbol) => {
        const q = quotes[symbol];
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
      this.setCache('group:forex', forex, GROUP_CACHE_TTL);
    } catch (e) {
      logError('Group A (forex) fetch failed:', e);
    }
  }

  private async fetchGroupB(): Promise<void> {
    try {
      const quotes = await this.apiFetch(GROUP_B_SYMBOLS);

      const indexSymbols = ['SPX', 'IXIC', 'DJI', 'RUT'];
      const indices: IndexQuote[] = indexSymbols.map((symbol) => {
        const q = quotes[symbol];
        if (!q) return { symbol, name: INDEX_NAMES[symbol] || symbol, price: 0, change: 0, changePercent: 0, available: false };
        return {
          symbol,
          name: q.name || INDEX_NAMES[symbol] || symbol,
          price: parseFloat(q.close) || 0,
          change: parseFloat(q.change) || 0,
          changePercent: parseFloat(q.percent_change) || 0,
          available: true,
        };
      });

      const goldQuote = quotes['XAU/USD'];
      const gold: CommodityQuote = {
        symbol: 'XAU/USD',
        name: goldQuote?.name || 'Gold Spot / US Dollar',
        price: goldQuote ? (parseFloat(goldQuote.close) || 0) : 0,
        change: goldQuote ? (parseFloat(goldQuote.change) || 0) : 0,
        changePercent: goldQuote ? (parseFloat(goldQuote.percent_change) || 0) : 0,
        available: !!goldQuote && goldQuote.status !== 'error',
      };

      this.setCache('group:indices_gold', { indices, gold }, GROUP_CACHE_TTL);
    } catch (e) {
      logError('Group B (indices+gold) fetch failed:', e);
    }
  }

  private async fetchGroupC(): Promise<void> {
    try {
      const quotes = await this.apiFetch(STOCK_SYMBOLS);
      const stocks: StockQuote[] = STOCK_SYMBOLS.map((symbol) => {
        const q = quotes[symbol];
        if (!q) return { symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false };
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
      this.setCache('group:stocks', stocks, GROUP_CACHE_TTL);
    } catch (e) {
      logError('Group C (stocks) fetch failed:', e);
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
      forex: this.emptyForex(),
      commodities: [
        { symbol: 'XAU/USD', name: 'Gold', price: 0, change: 0, changePercent: 0, available: false },
        { symbol: 'XAG/USD', name: 'Silver', price: 0, change: 0, changePercent: 0, available: false },
      ],
      indices: this.emptyIndices(),
      stocks: this.emptyStocks(),
      lastUpdated: new Date().toISOString(),
      available: false,
    };
  }

  private emptyForex(): ForexQuote[] {
    return FOREX_SYMBOLS.map((s) => ({ symbol: s, name: FOREX_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false }));
  }

  private emptyIndices(): IndexQuote[] {
    return ['SPX', 'IXIC', 'DJI', 'RUT'].map((s) => ({ symbol: s, name: INDEX_NAMES[s] || s, price: 0, change: 0, changePercent: 0, available: false }));
  }

  private emptyStocks(): StockQuote[] {
    return STOCK_SYMBOLS.map((s) => ({ symbol: s, name: s, price: 0, change: 0, changePercent: 0, volume: 0, marketOpen: false, available: false }));
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
