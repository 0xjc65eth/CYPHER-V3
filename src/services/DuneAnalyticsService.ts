/**
 * Dune Analytics Service - CYPHER V3
 *
 * Fetches on-chain analytics data from Dune Analytics API.
 * Uses cached results endpoint (no credit cost) with execution fallback.
 * Rate limited to 10 req/min (safety margin below 15 limit).
 *
 * Verified Queries:
 * - Q2008613: Bitcoin Ordinals inscriptions daily
 * - Q3405209: DEX 15-min candle price data
 * - Q3142527: DEX Volume Rankings
 */

import { devLogger } from '@/lib/logger';

const DUNE_BASE_URL = 'https://api.dune.com/api/v1';

// Known query IDs
const QUERIES = {
  ORDINALS_INSCRIPTIONS: 2008613,
  DEX_PRICE_CANDLES: 3405209,
  DEX_VOLUME_RANKINGS: 3142527,
} as const;

// Internal cache entry
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Dune API response types
interface DuneResultRow {
  [key: string]: unknown;
}

interface DuneExecutionResponse {
  execution_id: string;
  state: string;
}

interface DuneStatusResponse {
  execution_id: string;
  state: 'QUERY_STATE_PENDING' | 'QUERY_STATE_EXECUTING' | 'QUERY_STATE_COMPLETED' | 'QUERY_STATE_FAILED' | 'QUERY_STATE_CANCELLED';
}

interface DuneResultsResponse {
  execution_id: string;
  state: string;
  result: {
    rows: DuneResultRow[];
    metadata: {
      column_names: string[];
      column_types: string[];
      total_row_count: number;
    };
  };
}

// Public types
export interface OrdinalsInscriptionDay {
  date: string;
  dailyInscriptions: number;
  totalInscriptions: number;
  ordSizeUsage: number;
  fees: number;
}

export interface DEXVolumeRanking {
  rank: number;
  project: string;
  volume7d: number;
  volume24h: number;
}

export interface DEXCandle {
  timestamp: string;
  price: number;
  amountSell: number;
  amountBuy: number;
  amountTrade: number;
}

class DuneAnalyticsService {
  private apiKey: string;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MIN = 10;

  constructor() {
    this.apiKey = process.env.DUNE_API_KEY || '';
  }

  private getApiKey(): string {
    // Re-read in case env loaded after constructor
    if (!this.apiKey) {
      this.apiKey = process.env.DUNE_API_KEY || '';
    }
    return this.apiKey;
  }

  private async rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60_000);

    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MIN) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = 60_000 - (now - oldestInWindow) + 100;
      devLogger.warn(`[Dune] Rate limit reached, waiting ${waitMs}ms`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this.requestTimestamps.push(Date.now());
    return fetch(url, options);
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Fetch cached/latest results for a query (no credits spent if recent execution exists)
   */
  async getLatestResults(queryId: number): Promise<DuneResultRow[]> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('DUNE_API_KEY not configured');
    }

    const res = await this.rateLimitedFetch(
      `${DUNE_BASE_URL}/query/${queryId}/results`,
      {
        headers: {
          'X-Dune-API-Key': key,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Dune API error ${res.status}: ${text}`);
    }

    const data: DuneResultsResponse = await res.json();
    return data.result?.rows ?? [];
  }

  /**
   * Execute a query and poll for results (spends credits)
   */
  async executeQuery(queryId: number, params?: Record<string, string>): Promise<DuneResultRow[]> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('DUNE_API_KEY not configured');
    }

    // Start execution
    const execRes = await this.rateLimitedFetch(
      `${DUNE_BASE_URL}/query/${queryId}/execute`,
      {
        method: 'POST',
        headers: {
          'X-Dune-API-Key': key,
          'Content-Type': 'application/json',
        },
        body: params ? JSON.stringify({ query_parameters: params }) : undefined,
      }
    );

    if (!execRes.ok) {
      const text = await execRes.text();
      throw new Error(`Dune execute error ${execRes.status}: ${text}`);
    }

    const execData: DuneExecutionResponse = await execRes.json();
    const executionId = execData.execution_id;

    // Poll for completion (max 30s, every 2s)
    const maxWait = 30_000;
    const pollInterval = 2_000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusRes = await this.rateLimitedFetch(
        `${DUNE_BASE_URL}/execution/${executionId}/status`,
        {
          headers: { 'X-Dune-API-Key': key },
        }
      );

      if (!statusRes.ok) continue;

      const status: DuneStatusResponse = await statusRes.json();

      if (status.state === 'QUERY_STATE_COMPLETED') {
        // Fetch results
        const resultsRes = await this.rateLimitedFetch(
          `${DUNE_BASE_URL}/execution/${executionId}/results`,
          {
            headers: { 'X-Dune-API-Key': key },
          }
        );

        if (!resultsRes.ok) {
          throw new Error(`Dune results error ${resultsRes.status}`);
        }

        const resultsData: DuneResultsResponse = await resultsRes.json();
        return resultsData.result?.rows ?? [];
      }

      if (status.state === 'QUERY_STATE_FAILED' || status.state === 'QUERY_STATE_CANCELLED') {
        throw new Error(`Dune query ${status.state}`);
      }
    }

    throw new Error('Dune query execution timed out (30s)');
  }

  /**
   * Bitcoin Ordinals inscription trends (Q2008613)
   * Cache: 30 minutes
   */
  async getOrdinalsInscriptionTrends(): Promise<OrdinalsInscriptionDay[]> {
    const cacheKey = 'ordinals-trends';
    const cached = this.getCached<OrdinalsInscriptionDay[]>(cacheKey);
    if (cached) return cached;

    devLogger.info('[Dune] Fetching Ordinals inscription trends');

    const rows = await this.getLatestResults(QUERIES.ORDINALS_INSCRIPTIONS);

    const result: OrdinalsInscriptionDay[] = rows.map(row => ({
      date: String(row.DATE || row.date || ''),
      dailyInscriptions: Number(row.Daily_Inscriptions || row.daily_inscriptions || 0),
      totalInscriptions: Number(row.Total_Inscriptions || row.total_inscriptions || 0),
      ordSizeUsage: Number(row.Ord_Size_Usage || row.ord_size_usage || 0),
      fees: Number(row.fees || 0),
    }));

    this.setCache(cacheKey, result, 1800); // 30 min
    return result;
  }

  /**
   * DEX Volume Rankings (Q3142527)
   * Cache: 15 minutes
   */
  async getDEXVolumeRankings(): Promise<DEXVolumeRanking[]> {
    const cacheKey = 'dex-volume';
    const cached = this.getCached<DEXVolumeRanking[]>(cacheKey);
    if (cached) return cached;

    devLogger.info('[Dune] Fetching DEX volume rankings');

    const rows = await this.getLatestResults(QUERIES.DEX_VOLUME_RANKINGS);

    const result: DEXVolumeRanking[] = rows.map(row => ({
      rank: Number(row.Rank || row.rank || 0),
      project: String(row.Project || row.project || ''),
      volume7d: Number(row['7 Days Volume'] || row['7_days_volume'] || row.volume_7d || 0),
      volume24h: Number(row['24 Hours Volume'] || row['24_hours_volume'] || row.volume_24h || 0),
    }));

    this.setCache(cacheKey, result, 900); // 15 min
    return result;
  }

  /**
   * DEX Price Candles (Q3405209)
   * Cache: 5 minutes
   */
  async getDEXPriceCandles(): Promise<DEXCandle[]> {
    const cacheKey = 'dex-candles';
    const cached = this.getCached<DEXCandle[]>(cacheKey);
    if (cached) return cached;

    devLogger.info('[Dune] Fetching DEX price candles');

    const rows = await this.getLatestResults(QUERIES.DEX_PRICE_CANDLES);

    const result: DEXCandle[] = rows.map(row => ({
      timestamp: String(row.minute15 || row.timestamp || ''),
      price: Number(row.price || 0),
      amountSell: Number(row.amount_sell || 0),
      amountBuy: Number(row.amount_buy || 0),
      amountTrade: Number(row.amount_trade || 0),
    }));

    this.setCache(cacheKey, result, 300); // 5 min
    return result;
  }
}

// Singleton export
export const duneService = new DuneAnalyticsService();
