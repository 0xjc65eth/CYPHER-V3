/**
 * UniSat Open API Service
 * Comprehensive Bitcoin address, UTXO, block, transaction, and BRC-20 API integration
 * Base URL: https://open-api.unisat.io
 * Auth: Bearer token via UNISAT_API_KEY environment variable
 */

// ============================================================
// TypeScript Interfaces
// ============================================================

export interface UniSatApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// --- Address Types ---

export interface AddressBalance {
  address: string;
  satoshi: number;
  pendingSatoshi: number;
  utxoCount: number;
  btcSatoshi: number;
  btcPendingSatoshi: number;
  btcUtxoCount: number;
  inscriptionSatoshi: number;
  inscriptionPendingSatoshi: number;
  inscriptionUtxoCount: number;
}

export interface UTXO {
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
}

export interface UTXOListResult {
  cursor: number;
  total: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUnconfirmedSpend: number;
  utxo: UTXO[];
}

export interface UTXOData {
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
  inscriptions: InscriptionInfo[];
}

export interface UTXODataListResult {
  cursor: number;
  total: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUnconfirmedSpend: number;
  utxo: UTXOData[];
}

export interface InscriptionInfo {
  inscriptionId: string;
  inscriptionNumber: number;
  isBRC20: boolean;
  moved: boolean;
  offset: number;
}

export interface InscriptionUTXO {
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
  inscriptions: InscriptionInfo[];
}

export interface InscriptionUTXOListResult {
  cursor: number;
  total: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUnconfirmedSpend: number;
  utxo: InscriptionUTXO[];
}

export interface InscriptionUTXODataResult {
  cursor: number;
  total: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUnconfirmedSpend: number;
  utxo: InscriptionUTXO[];
}

// --- Block & TX Types ---

export interface LatestBlock {
  height: number;
  hash: string;
  prevHash: string;
  timestamp: number;
  nonce: number;
  bits: number;
  merkleRoot: string;
}

export interface TransactionInfo {
  txid: string;
  nInputs: number;
  nOutputs: number;
  locktime: number;
  size: number;
  witOffset: number;
  height: number;
  blkid: string;
  idx: number;
  confirmations: number;
  inSatoshi: number;
  outSatoshi: number;
  fee: number;
  timestamp: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
}

export interface TransactionInput {
  height: number;
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  inscriptions: InscriptionInfo[];
}

export interface TransactionOutput {
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  inscriptions: InscriptionInfo[];
}

// --- BRC-20 Types ---

export interface BRC20Token {
  ticker: string;
  overallBalance: string;
  transferableBalance: string;
  availableBalance: string;
  availableBalanceSafe: string;
  availableBalanceUnSafe: string;
}

export interface BRC20TokenListResult {
  height: number;
  total: number;
  start: number;
  detail: BRC20TokenDetail[];
}

export interface BRC20TokenDetail {
  ticker: string;
  holdersCount: number;
  historyCount: number;
  inscriptionCount: number;
  mintTimes: number;
  max: string;
  limit: string;
  minted: string;
  totalMinted: string;
  decimal: number;
  creator: string;
  txid: string;
  inscriptionId: string;
  inscriptionNumber: number;
  deployHeight: number;
  deployBlocktime: number;
  completeHeight: number;
  completeBlocktime: number;
  inscriptionNumberStart: number;
  inscriptionNumberEnd: number;
}

export interface BRC20TickerInfo {
  ticker: string;
  holdersCount: number;
  historyCount: number;
  inscriptionCount: number;
  mintTimes: number;
  max: string;
  limit: string;
  minted: string;
  totalMinted: string;
  decimal: number;
  creator: string;
  txid: string;
  inscriptionId: string;
  inscriptionNumber: number;
  deployHeight: number;
  deployBlocktime: number;
  completeHeight: number;
  completeBlocktime: number;
  inscriptionNumberStart: number;
  inscriptionNumberEnd: number;
}

export interface BRC20Holder {
  address: string;
  overallBalance: string;
  transferableBalance: string;
  availableBalance: string;
}

export interface BRC20HolderListResult {
  total: number;
  detail: BRC20Holder[];
}

export interface BRC20HistoryItem {
  type: string;
  valid: boolean;
  txid: string;
  blockHeight: number;
  data: string;
  inscriptionId: string;
  inscriptionNumber: number;
  from: string;
  to: string;
  satoshi: number;
  fee: number;
  amount: string;
  overallBalance: string;
  transferableBalance: string;
  availableBalance: string;
}

export interface BRC20HistoryResult {
  total: number;
  detail: BRC20HistoryItem[];
}

export interface BRC20TxHistoryItem {
  txid: string;
  blockHeight: number;
  type: string;
  valid: boolean;
  inscriptionId: string;
  inscriptionNumber: number;
  from: string;
  to: string;
  satoshi: number;
  fee: number;
  amount: string;
  ticker: string;
}

export interface BRC20TxHistoryResult {
  total: number;
  detail: BRC20TxHistoryItem[];
}

export interface BRC20AddressSummary {
  height: number;
  total: number;
  start: number;
  detail: BRC20Token[];
}

export interface BRC20AddressTickerInfo {
  ticker: string;
  overallBalance: string;
  transferableBalance: string;
  availableBalance: string;
  availableBalanceSafe: string;
  availableBalanceUnSafe: string;
  transferableCount: number;
  transferableInscriptions: TransferableInscription[];
  historyCount: number;
  historyInscriptions: BRC20HistoryItem[];
}

export interface TransferableInscription {
  inscriptionId: string;
  inscriptionNumber: number;
  amount: string;
  ticker: string;
  owner: string;
}

export interface BRC20AddressHistoryResult {
  total: number;
  detail: BRC20HistoryItem[];
}

export interface BRC20TransferableInscriptionsResult {
  total: number;
  detail: TransferableInscription[];
}

// --- Pagination ---

export interface PaginationParams {
  cursor?: number;
  size?: number;
}

export interface BRC20PaginationParams {
  start?: number;
  limit?: number;
}

// ============================================================
// Cache Entry
// ============================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================
// UniSat Service
// ============================================================

export class UniSatService {
  private readonly baseUrl = 'https://open-api.unisat.io';
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL = 15_000; // 15 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1_000;

  // Rate limiting state
  private requestQueue: Array<() => void> = [];
  private activeRequests = 0;
  private readonly MAX_CONCURRENT = 5;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 200; // 200ms between requests

  private get apiKey(): string {
    return process.env.UNISAT_API_KEY || '';
  }

  // --------------------------------------------------------
  // Core HTTP helpers
  // --------------------------------------------------------

  private async throttle(): Promise<void> {
    // Concurrency gate
    if (this.activeRequests >= this.MAX_CONCURRENT) {
      await new Promise<void>((resolve) => {
        this.requestQueue.push(resolve);
      });
    }

    // Minimum interval between requests
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - elapsed)
      );
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();
  }

  private releaseThrottle(): void {
    this.activeRequests--;
    if (this.requestQueue.length > 0) {
      const next = this.requestQueue.shift();
      next?.();
    }
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    // Build URL with query params
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const cacheKey = url.toString();

    // Check cache
    const cached = this.getCached<T>(cacheKey);
    if (cached !== null) return cached;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        await this.throttle();
        try {
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.status === 429) {
            // Rate limited — wait longer and retry
            this.releaseThrottle();
            const retryAfter = Number(response.headers.get('Retry-After')) || 5;
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000)
            );
            continue;
          }

          if (!response.ok) {
            this.releaseThrottle();
            throw new Error(
              `UniSat API error: ${response.status} ${response.statusText}`
            );
          }

          const json = (await response.json()) as UniSatApiResponse<T>;

          this.releaseThrottle();

          if (json.code !== 0) {
            throw new Error(
              `UniSat API returned error code ${json.code}: ${json.msg}`
            );
          }

          this.setCache(cacheKey, json.data);
          return json.data;
        } catch (err) {
          this.releaseThrottle();
          throw err;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1))
          );
        }
      }
    }

    throw lastError ?? new Error('UniSat API request failed after retries');
  }

  // --------------------------------------------------------
  // Address Endpoints
  // --------------------------------------------------------

  /**
   * GET /v1/indexer/address/{address}/balance
   * Get BTC balance for an address
   */
  async getAddressBalance(address: string): Promise<AddressBalance> {
    return this.request<AddressBalance>(
      `/v1/indexer/address/${address}/balance`
    );
  }

  /**
   * GET /v1/indexer/address/{address}/utxo
   * Get UTXOs for an address
   */
  async getAddressUtxo(
    address: string,
    params?: PaginationParams
  ): Promise<UTXOListResult> {
    return this.request<UTXOListResult>(
      `/v1/indexer/address/${address}/utxo`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/address/{address}/utxo-data
   * Get UTXO data with inscription details
   */
  async getAddressUtxoData(
    address: string,
    params?: PaginationParams
  ): Promise<UTXODataListResult> {
    return this.request<UTXODataListResult>(
      `/v1/indexer/address/${address}/utxo-data`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/address/{address}/inscription-utxo
   * Get inscription UTXOs for an address
   */
  async getAddressInscriptionUtxo(
    address: string,
    params?: PaginationParams
  ): Promise<InscriptionUTXOListResult> {
    return this.request<InscriptionUTXOListResult>(
      `/v1/indexer/address/${address}/inscription-utxo`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/address/{address}/inscription-utxo-data
   * Get inscription UTXO data with details
   */
  async getAddressInscriptionUtxoData(
    address: string,
    params?: PaginationParams
  ): Promise<InscriptionUTXODataResult> {
    return this.request<InscriptionUTXODataResult>(
      `/v1/indexer/address/${address}/inscription-utxo-data`,
      params as Record<string, string | number | undefined>
    );
  }

  // --------------------------------------------------------
  // Block & Transaction Endpoints
  // --------------------------------------------------------

  /**
   * GET /v1/indexer/block/latest
   * Get the latest block information
   */
  async getLatestBlock(): Promise<LatestBlock> {
    return this.request<LatestBlock>('/v1/indexer/block/latest');
  }

  /**
   * GET /v1/indexer/tx/{txid}
   * Get transaction information by txid
   */
  async getTransaction(txid: string): Promise<TransactionInfo> {
    return this.request<TransactionInfo>(`/v1/indexer/tx/${txid}`);
  }

  // --------------------------------------------------------
  // BRC-20 Endpoints
  // --------------------------------------------------------

  /**
   * GET /v1/indexer/brc20/list
   * Get list of BRC-20 tokens
   */
  async getBRC20List(
    params?: BRC20PaginationParams
  ): Promise<BRC20TokenListResult> {
    return this.request<BRC20TokenListResult>(
      '/v1/indexer/brc20/list',
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/brc20/{ticker}/info
   * Get BRC-20 token info by ticker
   */
  async getBRC20TickerInfo(ticker: string): Promise<BRC20TickerInfo> {
    return this.request<BRC20TickerInfo>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/info`
    );
  }

  /**
   * GET /v1/indexer/brc20/{ticker}/holders
   * Get BRC-20 holders for a token
   */
  async getBRC20Holders(
    ticker: string,
    params?: PaginationParams
  ): Promise<BRC20HolderListResult> {
    return this.request<BRC20HolderListResult>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/holders`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/brc20/{ticker}/history
   * Get BRC-20 token history
   */
  async getBRC20History(
    ticker: string,
    params?: BRC20PaginationParams
  ): Promise<BRC20HistoryResult> {
    return this.request<BRC20HistoryResult>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/history`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/brc20/{ticker}/tx-history
   * Get BRC-20 transaction history for a token
   */
  async getBRC20TxHistory(
    ticker: string,
    params?: BRC20PaginationParams
  ): Promise<BRC20TxHistoryResult> {
    return this.request<BRC20TxHistoryResult>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/tx-history`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/address/{address}/brc20/summary
   * Get BRC-20 summary for an address
   */
  async getAddressBRC20Summary(
    address: string,
    params?: BRC20PaginationParams
  ): Promise<BRC20AddressSummary> {
    return this.request<BRC20AddressSummary>(
      `/v1/indexer/address/${address}/brc20/summary`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/address/{address}/brc20/{ticker}/info
   * Get BRC-20 ticker info for an address
   */
  async getAddressBRC20TickerInfo(
    address: string,
    ticker: string
  ): Promise<BRC20AddressTickerInfo> {
    return this.request<BRC20AddressTickerInfo>(
      `/v1/indexer/address/${address}/brc20/${encodeURIComponent(ticker)}/info`
    );
  }

  /**
   * GET /v1/indexer/address/{address}/brc20/{ticker}/history
   * Get BRC-20 history for an address and ticker
   */
  async getAddressBRC20History(
    address: string,
    ticker: string,
    params?: BRC20PaginationParams
  ): Promise<BRC20AddressHistoryResult> {
    return this.request<BRC20AddressHistoryResult>(
      `/v1/indexer/address/${address}/brc20/${encodeURIComponent(ticker)}/history`,
      params as Record<string, string | number | undefined>
    );
  }

  /**
   * GET /v1/indexer/address/{address}/brc20/transferable-inscriptions
   * Get transferable BRC-20 inscriptions for an address
   */
  async getAddressBRC20TransferableInscriptions(
    address: string,
    params?: PaginationParams
  ): Promise<BRC20TransferableInscriptionsResult> {
    return this.request<BRC20TransferableInscriptionsResult>(
      `/v1/indexer/address/${address}/brc20/transferable-inscriptions`,
      params as Record<string, string | number | undefined>
    );
  }

  // --------------------------------------------------------
  // Utility
  // --------------------------------------------------------

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate a specific cache entry by key pattern
   */
  invalidateCache(pattern: string): void {
    Array.from(this.cache.keys()).forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

// Singleton export
export const unisatService = new UniSatService();
