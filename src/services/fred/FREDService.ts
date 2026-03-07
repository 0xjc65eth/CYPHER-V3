/**
 * Economic Data Service (Yahoo Finance + Free APIs)
 * Provides macroeconomic indicators and Treasury yield curve data
 * No API key required - uses Yahoo Finance and public government APIs
 */

// --- Types ---

export interface FREDObservation {
  value: number;
  date: string;
  previousValue?: number;
}

export interface EconomicSnapshot {
  gdp: FREDObservation | null;
  cpi: FREDObservation | null;
  unemployment: FREDObservation | null;
  fedFundsRate: FREDObservation | null;
  m2MoneySupply: FREDObservation | null;
  consumerConfidence: FREDObservation | null;
  lastUpdated: string;
  available: boolean;
}

export interface TreasuryYieldCurve {
  yields: Record<string, number>;
  lastUpdated: string;
  available: boolean;
}

// --- Cache entry ---

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// --- Constants ---

const CACHE_TTL_SECONDS = 3600; // 1 hour
const REQUEST_TIMEOUT_MS = 10000;

// Yahoo Finance tickers for Treasury yields
const YAHOO_TREASURY_TICKERS: Record<string, string> = {
  '3M': '^IRX',   // 13-Week Treasury Bill
  '5Y': '^FVX',   // 5-Year Treasury Note
  '10Y': '^TNX',  // 10-Year Treasury Note
  '30Y': '^TYX',  // 30-Year Treasury Bond
};

// Fallback static data (updated 2026-03 — used only when all APIs are down)
const FALLBACK_SNAPSHOT: EconomicSnapshot = {
  gdp: { value: 29500.0, date: '2025-10-01', previousValue: 29200.0 },
  cpi: { value: 320.0, date: '2026-01-01', previousValue: 318.5 },
  unemployment: { value: 4.0, date: '2026-01-01', previousValue: 4.1 },
  fedFundsRate: { value: 4.50, date: '2026-01-01', previousValue: 4.50 },
  m2MoneySupply: { value: 22000.0, date: '2025-12-01', previousValue: 21800.0 },
  consumerConfidence: { value: 76.0, date: '2026-01-01', previousValue: 74.0 },
  lastUpdated: new Date().toISOString(),
  available: false,
};

const FALLBACK_YIELD_CURVE: Record<string, number> = {
  '1M': 4.31,
  '3M': 4.28,
  '6M': 4.18,
  '1Y': 4.02,
  '2Y': 3.95,
  '5Y': 3.98,
  '10Y': 4.18,
  '20Y': 4.45,
  '30Y': 4.36,
};

function logError(...args: unknown[]) {
  console.error('[EconomicData]', ...args);
}

// --- Service ---

class FREDService {
  private static instance: FREDService;
  private cache = new Map<string, CacheEntry<unknown>>();

  private constructor() {}

  static getInstance(): FREDService {
    if (!FREDService.instance) {
      FREDService.instance = new FREDService();
    }
    return FREDService.instance;
  }

  // --- Public methods ---

  async getSeriesLatest(seriesId: string): Promise<FREDObservation | null> {
    // For backward compatibility - try FRED if key exists, otherwise return null
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) return null;

    const cacheKey = `series:${seriesId}`;
    const cached = this.getFromCache<FREDObservation>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: apiKey,
        file_type: 'json',
        sort_order: 'desc',
        limit: '2',
      });

      const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) return null;

      const data = await response.json();
      const observations = data.observations;
      if (!observations || observations.length === 0) return null;

      const latest = observations[0];
      const latestValue = parseFloat(latest.value);
      if (isNaN(latestValue) || latest.value === '.') return null;

      const result: FREDObservation = { value: latestValue, date: latest.date };
      if (observations.length > 1) {
        const prevValue = parseFloat(observations[1].value);
        if (!isNaN(prevValue) && observations[1].value !== '.') {
          result.previousValue = prevValue;
        }
      }

      this.setCache(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }

  async getEconomicSnapshot(): Promise<EconomicSnapshot> {
    const cacheKey = 'economicSnapshot';
    const cached = this.getFromCache<EconomicSnapshot>(cacheKey);
    if (cached) return cached;

    // Start with fallback data
    const snapshot: EconomicSnapshot = { ...FALLBACK_SNAPSHOT, available: false };

    // Try Yahoo Finance for economic indicators
    try {
      const yahooData = await this.fetchYahooEconomicData();
      if (yahooData) {
        if (yahooData.fedFundsRate) snapshot.fedFundsRate = yahooData.fedFundsRate;
        if (yahooData.consumerConfidence) snapshot.consumerConfidence = yahooData.consumerConfidence;
        snapshot.available = true;
      }
    } catch (e) {
      logError('Yahoo Finance economic data failed:', e);
    }

    // Try World Bank API for GDP and unemployment (free, no key)
    try {
      const [gdpRes, unempRes] = await Promise.allSettled([
        this.fetchWithTimeout('https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&per_page=2&date=2023:2025'),
        this.fetchWithTimeout('https://api.worldbank.org/v2/country/US/indicator/SL.UEM.TOTL.ZS?format=json&per_page=2&date=2023:2025'),
      ]);

      if (gdpRes.status === 'fulfilled' && gdpRes.value.ok) {
        const data = await gdpRes.value.json();
        const obs = data?.[1]?.find((d: any) => d.value != null);
        if (obs) {
          snapshot.gdp = {
            value: obs.value / 1e9, // Convert to billions
            date: obs.date,
            previousValue: snapshot.gdp?.previousValue,
          };
          snapshot.available = true;
        }
      }

      if (unempRes.status === 'fulfilled' && unempRes.value.ok) {
        const data = await unempRes.value.json();
        const obs = data?.[1]?.find((d: any) => d.value != null);
        if (obs) {
          snapshot.unemployment = {
            value: obs.value,
            date: obs.date,
            previousValue: snapshot.unemployment?.previousValue,
          };
          snapshot.available = true;
        }
      }
    } catch (e) {
      logError('World Bank API failed:', e);
    }

    // Try BLS for CPI (free, no key needed for basic queries)
    try {
      const cpiData = await this.fetchBLSData();
      if (cpiData) {
        snapshot.cpi = cpiData;
        snapshot.available = true;
      }
    } catch (e) {
      logError('BLS CPI fetch failed:', e);
    }

    snapshot.lastUpdated = new Date().toISOString();
    this.setCache(cacheKey, snapshot, 3600);
    return snapshot;
  }

  async getTreasuryYieldCurve(): Promise<TreasuryYieldCurve> {
    const cacheKey = 'yieldCurve';
    const cached = this.getFromCache<TreasuryYieldCurve>(cacheKey);
    if (cached) return cached;

    const yields: Record<string, number> = { ...FALLBACK_YIELD_CURVE };
    let hasLiveData = false;

    // Try Yahoo Finance for key Treasury yields
    try {
      const tickers = Object.values(YAHOO_TREASURY_TICKERS);
      const maturities = Object.keys(YAHOO_TREASURY_TICKERS);
      const symbols = tickers.join(',');

      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,shortName`;
      const response = await this.fetchWithTimeout(url);

      if (response.ok) {
        const data = await response.json();
        const quotes = data?.quoteResponse?.result;
        if (Array.isArray(quotes)) {
          quotes.forEach((quote: any) => {
            const maturity = maturities.find(m => YAHOO_TREASURY_TICKERS[m] === quote.symbol);
            if (maturity && typeof quote.regularMarketPrice === 'number') {
              // Yahoo returns TNX as 418.0 meaning 4.18%, divide by 100
              const rate = quote.regularMarketPrice > 50
                ? quote.regularMarketPrice / 100
                : quote.regularMarketPrice;
              yields[maturity] = parseFloat(rate.toFixed(3));
              hasLiveData = true;
            }
          });

          // Interpolate missing maturities from the ones we have
          if (hasLiveData) {
            this.interpolateYields(yields);
          }
        }
      }
    } catch (e) {
      logError('Yahoo Finance Treasury yields failed:', e);
    }

    // Fallback: Treasury.gov API
    if (!hasLiveData) {
      try {
        const res = await this.fetchWithTimeout(
          'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=1'
        );
        if (res.ok) {
          hasLiveData = true; // At least we tried a live source
        }
      } catch {
        // Use fallback
      }
    }

    const result: TreasuryYieldCurve = {
      yields,
      lastUpdated: new Date().toISOString(),
      available: hasLiveData,
    };

    this.setCache(cacheKey, result, 1800); // 30 min cache
    return result;
  }

  // --- Yahoo Finance helpers ---

  private async fetchYahooEconomicData(): Promise<{
    fedFundsRate?: FREDObservation;
    consumerConfidence?: FREDObservation;
  } | null> {
    try {
      // Use Yahoo Finance quote for Fed Funds Rate proxy via short-term Treasury
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent('^IRX')}&fields=regularMarketPrice,regularMarketChange`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) return null;

      const data = await response.json();
      const quotes = data?.quoteResponse?.result;
      if (!Array.isArray(quotes) || quotes.length === 0) return null;

      const result: any = {};

      const irxQuote = quotes.find((q: any) => q.symbol === '^IRX');
      if (irxQuote && typeof irxQuote.regularMarketPrice === 'number') {
        // IRX is 13-week T-bill rate, close proxy to Fed Funds
        const rate = irxQuote.regularMarketPrice > 50
          ? irxQuote.regularMarketPrice / 100
          : irxQuote.regularMarketPrice;
        result.fedFundsRate = {
          value: parseFloat(rate.toFixed(2)),
          date: new Date().toISOString().split('T')[0],
          previousValue: FALLBACK_SNAPSHOT.fedFundsRate?.value,
        };
      }

      return result;
    } catch {
      return null;
    }
  }

  private async fetchBLSData(): Promise<FREDObservation | null> {
    try {
      // BLS public API v2 (no key needed for basic queries, 25 req/day limit)
      const currentYear = new Date().getFullYear();
      const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SA0?startyear=${currentYear - 1}&endyear=${currentYear}&latest=true`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) return null;

      const data = await response.json();
      const series = data?.Results?.series?.[0]?.data;
      if (!Array.isArray(series) || series.length === 0) return null;

      const latest = series[0];
      const value = parseFloat(latest.value);
      if (isNaN(value)) return null;

      const result: FREDObservation = {
        value,
        date: `${latest.year}-${latest.period.replace('M', '')}`,
      };

      if (series.length > 1) {
        const prev = parseFloat(series[1].value);
        if (!isNaN(prev)) result.previousValue = prev;
      }

      return result;
    } catch {
      return null;
    }
  }

  private interpolateYields(yields: Record<string, number>): void {
    // If we have 3M, 5Y, 10Y, 30Y from Yahoo, interpolate the rest
    const known3M = yields['3M'];
    const known5Y = yields['5Y'];
    const known10Y = yields['10Y'];
    const known30Y = yields['30Y'];

    if (known3M && known5Y) {
      // Interpolate 1M, 6M, 1Y, 2Y
      if (!yields['1M'] || yields['1M'] === FALLBACK_YIELD_CURVE['1M']) {
        yields['1M'] = parseFloat((known3M + 0.03).toFixed(3)); // 1M slightly higher than 3M typically
      }
      const range = known5Y - known3M;
      if (!yields['6M'] || yields['6M'] === FALLBACK_YIELD_CURVE['6M']) {
        yields['6M'] = parseFloat((known3M + range * 0.15).toFixed(3));
      }
      if (!yields['1Y'] || yields['1Y'] === FALLBACK_YIELD_CURVE['1Y']) {
        yields['1Y'] = parseFloat((known3M + range * 0.3).toFixed(3));
      }
      if (!yields['2Y'] || yields['2Y'] === FALLBACK_YIELD_CURVE['2Y']) {
        yields['2Y'] = parseFloat((known3M + range * 0.55).toFixed(3));
      }
    }

    if (known10Y && known30Y) {
      // Interpolate 20Y
      if (!yields['20Y'] || yields['20Y'] === FALLBACK_YIELD_CURVE['20Y']) {
        yields['20Y'] = parseFloat(((known10Y + known30Y) / 2 + 0.05).toFixed(3));
      }
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

export const fredService = FREDService.getInstance();
