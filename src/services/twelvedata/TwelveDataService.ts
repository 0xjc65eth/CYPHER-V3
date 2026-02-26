/**
 * TwelveData Market Data Service
 *
 * Rate limit: 8 credits/min (1 credit per symbol).
 * Strategy: Caller specifies which batch to fetch. Each batch ≤ 8 symbols.
 * Vercel CDN caches successful responses (s-maxage=300).
 * Client calls batches with 65s delay to respect rate limit.
 *
 * Batch 1 (8 credits): EUR/USD, GBP/USD, USD/JPY, SPY, QQQ, XAU/USD, AAPL, NVDA
 * Batch 2 (8 credits): AUD/USD, USD/CHF, USD/CAD, DIA, IWM, TSLA, MSFT, GOOGL
 * Remaining (2): AMZN, META — fetched in Batch 2 on paid plans or dropped on free tier
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

// --- Constants ---

const BASE_URL = 'https://api.twelvedata.com';
const REQUEST_TIMEOUT_MS = 10000;

// Real index symbols require paid plan. ETF proxies work on free tier.
export const BATCH1_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'SPY', 'QQQ', 'XAU/USD', 'AAPL', 'NVDA'];
export const BATCH2_SYMBOLS = ['AUD/USD', 'USD/CHF', 'USD/CAD', 'DIA', 'IWM', 'TSLA', 'MSFT', 'GOOGL'];

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

const INDEX_ETF_NAMES: Record<string, string> = {
  'SPY': 'S&P 500',
  'QQQ': 'NASDAQ',
  'DIA': 'Dow Jones',
  'IWM': 'Russell 2000',
};

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

// --- Public: fetch a batch of symbols ---

export async function fetchTwelveDataBatch(
  symbols: string[],
  apiKey: string
): Promise<Record<string, TwelveDataQuote>> {
  if (symbols.length === 0 || !apiKey) return {};

  const symbolParam = symbols.join(',');
  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbolParam)}&apikey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store', // CDN caching happens at the route level, not here
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logError(`HTTP ${response.status}`);
      return {};
    }

    const data = await response.json();

    if (data.code === 429 || data.status === 'error') {
      logError('Rate limited or error:', data.message);
      return {};
    }

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
  } catch (e) {
    logError('Fetch failed:', e);
    return {};
  }
}

// --- Public: build MultiAssetData from raw quotes ---

export function buildMultiAssetData(allQuotes: Record<string, TwelveDataQuote>): MultiAssetData {
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

  const goldQuote = allQuotes['XAU/USD'];
  const gold: CommodityQuote = {
    symbol: 'XAU/USD',
    name: goldQuote?.name || 'Gold Spot / US Dollar',
    price: goldQuote ? (parseFloat(goldQuote.close) || 0) : 0,
    change: goldQuote ? (parseFloat(goldQuote.change) || 0) : 0,
    changePercent: goldQuote ? (parseFloat(goldQuote.percent_change) || 0) : 0,
    available: !!goldQuote,
  };

  const silverPrice = gold.available && gold.price > 0 ? gold.price / 85 : 0;
  const silver: CommodityQuote = {
    symbol: 'XAG/USD',
    name: 'Silver',
    price: parseFloat(silverPrice.toFixed(2)),
    change: gold.available ? parseFloat((gold.change / 85).toFixed(2)) : 0,
    changePercent: gold.changePercent,
    available: gold.available && silverPrice > 0,
  };

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

  return {
    forex,
    commodities,
    indices,
    stocks,
    lastUpdated: new Date().toISOString(),
    available: hasData,
  };
}

// --- Legacy singleton (for backward compat) ---

class TwelveDataService {
  private static instance: TwelveDataService;
  private apiKey: string;

  private constructor() {
    this.apiKey = process.env.TWELVEDATA_API_KEY || '';
  }

  static getInstance(): TwelveDataService {
    if (!TwelveDataService.instance) {
      TwelveDataService.instance = new TwelveDataService();
    }
    return TwelveDataService.instance;
  }

  async getAllMarketData(): Promise<MultiAssetData> {
    if (!this.apiKey) return buildMultiAssetData({});
    const quotes = await fetchTwelveDataBatch(BATCH1_SYMBOLS, this.apiKey);
    return buildMultiAssetData(quotes);
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    if (!this.apiKey || symbols.length === 0) return {};
    return fetchTwelveDataBatch(symbols, this.apiKey);
  }

  async getForexQuotes(): Promise<ForexQuote[]> { return (await this.getAllMarketData()).forex; }
  async getCommodityQuotes(): Promise<CommodityQuote[]> { return (await this.getAllMarketData()).commodities; }
  async getIndicesQuotes(): Promise<IndexQuote[]> { return (await this.getAllMarketData()).indices; }
  async getStockQuotes(): Promise<StockQuote[]> { return (await this.getAllMarketData()).stocks; }
}

export const twelveDataService = TwelveDataService.getInstance();
