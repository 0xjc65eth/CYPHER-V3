/**
 * Federal Reserve Economic Data (FRED) API Service
 * Provides macroeconomic indicators and Treasury yield curve data
 * https://fred.stlouisfed.org/docs/api/fred/
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

const BASE_URL = 'https://api.stlouisfed.org/fred';
const CACHE_TTL_SECONDS = 3600; // 1 hour
const REQUEST_TIMEOUT_MS = 15000;

const SERIES_IDS = {
  GDP: 'GDP',
  CPI: 'CPIAUCSL',
  UNEMPLOYMENT: 'UNRATE',
  FED_FUNDS: 'FEDFUNDS',
  TREASURY_10Y: 'DGS10',
  TREASURY_2Y: 'DGS2',
  TREASURY_30Y: 'DGS30',
  TREASURY_1M: 'DGS1MO',
  TREASURY_3M: 'DGS3MO',
  TREASURY_6M: 'DGS6MO',
  TREASURY_1Y: 'DGS1',
  TREASURY_5Y: 'DGS5',
  TREASURY_20Y: 'DGS20',
  M2_MONEY_SUPPLY: 'M2SL',
  CONSUMER_CONFIDENCE: 'UMCSENT',
} as const;

const TREASURY_MATURITIES: Record<string, string> = {
  '1M': SERIES_IDS.TREASURY_1M,
  '3M': SERIES_IDS.TREASURY_3M,
  '6M': SERIES_IDS.TREASURY_6M,
  '1Y': SERIES_IDS.TREASURY_1Y,
  '2Y': SERIES_IDS.TREASURY_2Y,
  '5Y': SERIES_IDS.TREASURY_5Y,
  '10Y': SERIES_IDS.TREASURY_10Y,
  '20Y': SERIES_IDS.TREASURY_20Y,
  '30Y': SERIES_IDS.TREASURY_30Y,
};

// Fallback static data when no API key is available
const FALLBACK_SNAPSHOT: EconomicSnapshot = {
  gdp: { value: 28781.0, date: '2024-10-01', previousValue: 28631.0 },
  cpi: { value: 315.6, date: '2024-12-01', previousValue: 314.9 },
  unemployment: { value: 4.1, date: '2024-12-01', previousValue: 4.2 },
  fedFundsRate: { value: 4.33, date: '2024-12-01', previousValue: 4.58 },
  m2MoneySupply: { value: 21533.0, date: '2024-11-01', previousValue: 21311.0 },
  consumerConfidence: { value: 74.0, date: '2024-12-01', previousValue: 71.8 },
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

const DEBUG = process.env.NODE_ENV === 'development';

function log(...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
  }
}

function logError(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error('[FRED]', ...args);
}

// --- Service ---

class FREDService {
  private static instance: FREDService;
  private apiKey: string;
  private cache = new Map<string, CacheEntry<unknown>>();

  private constructor() {
    this.apiKey = process.env.FRED_API_KEY || '';
  }

  static getInstance(): FREDService {
    if (!FREDService.instance) {
      FREDService.instance = new FREDService();
    }
    return FREDService.instance;
  }

  // --- Public methods ---

  async getSeriesLatest(seriesId: string): Promise<FREDObservation | null> {
    const cacheKey = `series:${seriesId}`;
    const cached = this.getFromCache<FREDObservation>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      log('No FRED API key configured');
      return null;
    }

    try {
      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: this.apiKey,
        file_type: 'json',
        sort_order: 'desc',
        limit: '2',
      });

      const url = `${BASE_URL}/series/observations?${params.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        logError(`API error for ${seriesId}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const observations = data.observations;

      if (!observations || observations.length === 0) {
        log(`No observations for ${seriesId}`);
        return null;
      }

      const latest = observations[0];
      const latestValue = parseFloat(latest.value);

      if (isNaN(latestValue) || latest.value === '.') {
        log(`Invalid value for ${seriesId}: ${latest.value}`);
        return null;
      }

      const result: FREDObservation = {
        value: latestValue,
        date: latest.date,
      };

      // Add previous value if available
      if (observations.length > 1) {
        const prevValue = parseFloat(observations[1].value);
        if (!isNaN(prevValue) && observations[1].value !== '.') {
          result.previousValue = prevValue;
        }
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logError(`Failed to fetch series ${seriesId}:`, error);
      return null;
    }
  }

  async getEconomicSnapshot(): Promise<EconomicSnapshot> {
    const cacheKey = 'economicSnapshot';
    const cached = this.getFromCache<EconomicSnapshot>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      log('No FRED API key, returning fallback data');
      return FALLBACK_SNAPSHOT;
    }

    try {
      const [gdp, cpi, unemployment, fedFundsRate, m2MoneySupply, consumerConfidence] =
        await Promise.all([
          this.getSeriesLatest(SERIES_IDS.GDP),
          this.getSeriesLatest(SERIES_IDS.CPI),
          this.getSeriesLatest(SERIES_IDS.UNEMPLOYMENT),
          this.getSeriesLatest(SERIES_IDS.FED_FUNDS),
          this.getSeriesLatest(SERIES_IDS.M2_MONEY_SUPPLY),
          this.getSeriesLatest(SERIES_IDS.CONSUMER_CONFIDENCE),
        ]);

      const hasData = [gdp, cpi, unemployment, fedFundsRate].some((d) => d !== null);

      const result: EconomicSnapshot = {
        gdp,
        cpi,
        unemployment,
        fedFundsRate,
        m2MoneySupply,
        consumerConfidence,
        lastUpdated: new Date().toISOString(),
        available: hasData,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logError('Failed to fetch economic snapshot:', error);
      return FALLBACK_SNAPSHOT;
    }
  }

  async getTreasuryYieldCurve(): Promise<TreasuryYieldCurve> {
    const cacheKey = 'yieldCurve';
    const cached = this.getFromCache<TreasuryYieldCurve>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      log('No FRED API key, returning fallback yield curve');
      return {
        yields: FALLBACK_YIELD_CURVE,
        lastUpdated: new Date().toISOString(),
        available: false,
      };
    }

    try {
      const entries = Object.entries(TREASURY_MATURITIES);
      const results = await Promise.all(
        entries.map(([, seriesId]) => this.getSeriesLatest(seriesId))
      );

      const yields: Record<string, number> = {};
      let hasData = false;

      entries.forEach(([maturity], index) => {
        const obs = results[index];
        if (obs) {
          yields[maturity] = obs.value;
          hasData = true;
        } else {
          // Use fallback for missing maturities
          yields[maturity] = FALLBACK_YIELD_CURVE[maturity] ?? 0;
        }
      });

      const result: TreasuryYieldCurve = {
        yields,
        lastUpdated: new Date().toISOString(),
        available: hasData,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logError('Failed to fetch yield curve:', error);
      return {
        yields: FALLBACK_YIELD_CURVE,
        lastUpdated: new Date().toISOString(),
        available: false,
      };
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
