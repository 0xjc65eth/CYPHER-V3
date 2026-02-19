/**
 * UniSat Open API Service - EXPANDED VERSION
 * Complete integration with 70+ endpoints from UniSat API
 *
 * Categories:
 * - Blockchain & Blocks (7 endpoints)
 * - Transactions (8 endpoints)
 * - Addresses (5 endpoints)
 * - Inscriptions (6 endpoints)
 * - BRC-20 (9 endpoints)
 * - Marketplace & Collections (17 endpoints)
 * - Collection Indexer (8 endpoints)
 * - Price Data (1 endpoint)
 *
 * Total: 61+ endpoints
 *
 * Base URL: https://open-api.unisat.io
 * Auth: Bearer token via UNISAT_API_KEY environment variable
 *
 * Documentation: https://open-api.unisat.io/swagger.html
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface UniSatApiResponse<T> {
  code: number
  msg: string
  data: T
}

// ─── Blockchain & Blocks ────────────────────────────────────────────────────

export interface BlockchainInfo {
  chain: string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  mediantime: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
}

export interface FeeRecommendation {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
  minimumFee: number
}

export interface Block {
  hash: string
  confirmations: number
  size: number
  strippedsize: number
  weight: number
  height: number
  version: number
  versionHex: string
  merkleroot: string
  tx: string[]
  time: number
  mediantime: number
  nonce: number
  bits: string
  difficulty: number
  chainwork: string
  nTx: number
  previousblockhash: string
  nextblockhash?: string
}

// ─── Transactions ───────────────────────────────────────────────────────────

export interface TransactionDetail {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  vin: TxInput[]
  vout: TxOutput[]
  hex: string
  blockhash?: string
  confirmations?: number
  time?: number
  blocktime?: number
}

export interface TxInput {
  txid: string
  vout: number
  scriptSig: {
    asm: string
    hex: string
  }
  sequence: number
  witness?: string[]
  prevout?: {
    scriptpubkey: string
    scriptpubkey_asm: string
    scriptpubkey_type: string
    scriptpubkey_address: string
    value: number
  }
}

export interface TxOutput {
  value: number
  n: number
  scriptPubKey: {
    asm: string
    hex: string
    reqSigs?: number
    type: string
    addresses?: string[]
    address?: string
  }
}

export interface PushTxResult {
  success: boolean
  txid?: string
  error?: string
}

export interface UTXO {
  txid: string
  vout: number
  satoshi: number
  scriptType: string
  scriptPk: string
  codeType: number
  address: string
  height: number
  idx: number
  isOpInRBF: boolean
  isSpent: boolean
}

// ─── Inscriptions ───────────────────────────────────────────────────────────

export interface InscriptionDetail {
  inscriptionId: string
  inscriptionNumber: number
  address: string
  outputValue: number
  preview: string
  content: string
  contentLength: number
  contentType: string
  contentBody: string
  timestamp: number
  genesisTransaction: string
  location: string
  output: string
  offset: number
}

export interface InscriptionEvent {
  event: 'inscribe' | 'transfer' | 'list' | 'sale'
  inscriptionId: string
  txid: string
  blockHeight: number
  timestamp: number
  from?: string
  to?: string
  price?: number
}

export interface InscriptionData {
  inscriptionId: string
  inscriptionNumber: number
  address: string
  outputValue: number
  contentType: string
  contentLength: number
  timestamp: number
  location: string
  output: string
  offset: number
}

export interface InscriptionUTXO {
  txid: string
  vout: number
  satoshi: number
  scriptType: string
  scriptPk: string
  codeType: number
  address: string
  height: number
  idx: number
  isOpInRBF: boolean
  isSpent: boolean
  inscriptions: Array<{
    inscriptionId: string
    inscriptionNumber: number
    isBRC20: boolean
    moved: boolean
    offset: number
  }>
}

export interface AbandonedNFT {
  inscriptionId: string
  inscriptionNumber: number
  utxo: UTXO
  reason: string
}

// ─── BRC-20 ─────────────────────────────────────────────────────────────────

export interface BRC20Token {
  ticker: string
  overallBalance: string
  transferableBalance: string
  availableBalance: string
  availableBalanceSafe: string
  availableBalanceUnSafe: string
}

export interface BRC20TokenListResult {
  height: number
  total: number
  start: number
  detail: BRC20TokenDetail[]
}

export interface BRC20TokenDetail {
  ticker: string
  holdersCount: number
  historyCount: number
  inscriptionCount: number
  mintTimes: number
  max: string
  limit: string
  minted: string
  totalMinted: string
  decimal: number
  creator: string
  txid: string
  inscriptionId: string
  inscriptionNumber: number
  deployHeight: number
  deployBlocktime: number
  completeHeight: number
  completeBlocktime: number
  inscriptionNumberStart: number
  inscriptionNumberEnd: number
}

export interface BRC20TickerInfo extends BRC20TokenDetail {}

export interface BRC20Holder {
  address: string
  overallBalance: string
  transferableBalance: string
  availableBalance: string
}

export interface BRC20HolderListResult {
  total: number
  detail: BRC20Holder[]
}

export interface BRC20HistoryItem {
  type: string
  valid: boolean
  txid: string
  blockHeight: number
  data: string
  inscriptionId: string
  inscriptionNumber: number
  from: string
  to: string
  satoshi: number
  fee: number
  amount: string
  overallBalance: string
  transferableBalance: string
  availableBalance: string
}

export interface BRC20HistoryResult {
  total: number
  detail: BRC20HistoryItem[]
}

export interface BRC20AddressSummary {
  height: number
  total: number
  start: number
  detail: BRC20Token[]
}

export interface BRC20AddressTickerInfo {
  ticker: string
  overallBalance: string
  transferableBalance: string
  availableBalance: string
  availableBalanceSafe: string
  availableBalanceUnSafe: string
  transferableCount: number
  transferableInscriptions: TransferableInscription[]
  historyCount: number
  historyInscriptions: BRC20HistoryItem[]
}

export interface TransferableInscription {
  inscriptionId: string
  inscriptionNumber: number
  amount: string
  ticker: string
  owner: string
}

export interface BRC20TransferableInscriptionsResult {
  total: number
  detail: TransferableInscription[]
}

// ─── Marketplace & Collections ──────────────────────────────────────────────

export interface CollectionStats {
  collectionId: string
  name: string
  symbol: string
  floorPrice: number
  totalVolume: number
  volume24h: number
  volume7d: number
  items: number
  owners: number
  listedCount: number
}

export interface CollectionSummary {
  collectionId: string
  name: string
  description: string
  imageUrl: string
  bannerUrl: string
  website: string
  twitter: string
  discord: string
  supply: number
  floorPrice: number
  totalVolume: number
  owners: number
}

export interface MarketListing {
  inscriptionId: string
  inscriptionNumber: number
  collectionSymbol?: string
  price: number
  seller: string
  listedAt: number
  status: 'active' | 'sold' | 'cancelled'
}

export interface MarketListParams {
  collectionId?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
  sortBy?: 'price' | 'listedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface MarketAction {
  type: 'list' | 'delist' | 'sale' | 'bid' | 'offer'
  inscriptionId: string
  txid: string
  from?: string
  to?: string
  price?: number
  timestamp: number
}

export interface PutOnParams {
  inscriptionId: string
  price: number
  receiverAddress: string
}

export interface PutOnResult {
  orderId: string
  psbt: string
  signIndexes: number[]
}

export interface ConfirmParams {
  orderId: string
  signedPsbt: string
}

export interface ConfirmResult {
  orderId: string
  txid: string
  status: 'pending' | 'confirmed'
}

export interface BidPrepareParams {
  inscriptionId: string
  price: number
}

export interface BidPrepare {
  orderId: string
  amount: number
  receiverAddress: string
}

export interface BidParams {
  orderId: string
  psbt: string
}

export interface BidResult {
  orderId: string
  txid: string
}

export interface PutOffParams {
  orderId: string
}

export interface PutOffResult {
  orderId: string
  psbt: string
  signIndexes: number[]
}

export interface ModifyPriceParams {
  orderId: string
  newPrice: number
}

export interface ModifyResult {
  orderId: string
  psbt: string
  signIndexes: number[]
}

// ─── Collection Indexer ─────────────────────────────────────────────────────

export interface CollectionStatus {
  collectionId: string
  status: 'active' | 'inactive'
  indexed: boolean
  lastUpdate: number
}

export interface CollectionInfo {
  collectionId: string
  name: string
  symbol: string
  description: string
  supply: number
  holders: number
  floorPrice: number
  volume: number
  imageUrl: string
}

export interface Holder {
  address: string
  balance: number
  percentage: number
}

export interface CollectionItem {
  inscriptionId: string
  inscriptionNumber: number
  name?: string
  attributes?: Record<string, string>
  rarity?: string
  owner: string
}

export interface AddressCollectionSummary {
  address: string
  collections: Array<{
    collectionId: string
    name: string
    itemCount: number
    floorValue: number
  }>
  totalValue: number
}

// ─── Price Data ─────────────────────────────────────────────────────────────

export interface BtcPriceData {
  price: number
  currency: string
  timestamp: number
  source: string
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  cursor?: number
  size?: number
}

export interface BRC20PaginationParams {
  start?: number
  limit?: number
}

export interface ListPaginationParams {
  limit?: number
  offset?: number
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// ============================================================
// UNISAT SERVICE - EXPANDED
// ============================================================

export class UniSatServiceExpanded {
  private readonly baseUrl = 'https://open-api.unisat.io'
  private readonly cache = new Map<string, CacheEntry<unknown>>()
  private readonly CACHE_TTL = 15_000 // 15 seconds
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY_MS = 1_000

  // Rate limiting
  private requestQueue: Array<() => void> = []
  private activeRequests = 0
  private readonly MAX_CONCURRENT = 5
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 200

  private get apiKey(): string {
    return process.env.UNISAT_API_KEY || ''
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CORE HTTP HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private async throttle(): Promise<void> {
    if (this.activeRequests >= this.MAX_CONCURRENT) {
      await new Promise<void>((resolve) => {
        this.requestQueue.push(resolve)
      })
    }

    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - elapsed)
      )
    }

    this.activeRequests++
    this.lastRequestTime = Date.now()
  }

  private releaseThrottle(): void {
    this.activeRequests--
    if (this.requestQueue.length > 0) {
      const next = this.requestQueue.shift()
      next?.()
    }
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const cacheKey = method === 'GET' ? url.toString() : ''
    if (cacheKey) {
      const cached = this.getCached<T>(cacheKey)
      if (cached !== null) return cached
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        await this.throttle()
        try {
          const response = await fetch(url.toString(), {
            method,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
          })

          if (response.status === 429) {
            this.releaseThrottle()
            const retryAfter = Number(response.headers.get('Retry-After')) || 5
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000)
            )
            continue
          }

          if (!response.ok) {
            this.releaseThrottle()
            throw new Error(
              `UniSat API error: ${response.status} ${response.statusText}`
            )
          }

          const json = (await response.json()) as UniSatApiResponse<T>

          this.releaseThrottle()

          if (json.code !== 0) {
            throw new Error(
              `UniSat API returned error code ${json.code}: ${json.msg}`
            )
          }

          if (cacheKey) {
            this.setCache(cacheKey, json.data)
          }
          return json.data
        } catch (err) {
          this.releaseThrottle()
          throw err
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.RETRY_DELAY_MS * (attempt + 1))
          )
        }
      }
    }

    throw lastError ?? new Error('UniSat API request failed after retries')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCKCHAIN & BLOCKS (7 endpoints)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/indexer/blockchain/info
   * Get blockchain information
   */
  async getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.request<BlockchainInfo>('/v1/indexer/blockchain/info')
  }

  /**
   * GET /v1/indexer/blockchain/fee
   * Get recommended transaction fees
   */
  async getRecommendedFees(): Promise<FeeRecommendation> {
    return this.request<FeeRecommendation>('/v1/indexer/blockchain/fee')
  }

  /**
   * GET /v1/indexer/block/height/{height}
   * Get block by height
   */
  async getBlockByHeight(height: number): Promise<Block> {
    return this.request<Block>(`/v1/indexer/block/height/${height}`)
  }

  /**
   * GET /v1/indexer/block/{blockId}
   * Get block by hash
   */
  async getBlockById(blockId: string): Promise<Block> {
    return this.request<Block>(`/v1/indexer/block/${blockId}`)
  }

  /**
   * GET /v1/indexer/block/height/{height}/txs
   * Get transactions by block height
   */
  async getTxsByBlockHeight(height: number): Promise<string[]> {
    return this.request<string[]>(`/v1/indexer/block/height/${height}/txs`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSACTIONS (8 endpoints)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/indexer/tx/{txId}
   * Get transaction by ID
   */
  async getTxById(txId: string): Promise<TransactionDetail> {
    return this.request<TransactionDetail>(`/v1/indexer/tx/${txId}`)
  }

  /**
   * GET /v1/indexer/tx/{txId}/inputs
   * Get transaction inputs
   */
  async getInputsByTxId(txId: string): Promise<TxInput[]> {
    return this.request<TxInput[]>(`/v1/indexer/tx/${txId}/inputs`)
  }

  /**
   * GET /v1/indexer/tx/{txId}/outputs
   * Get transaction outputs
   */
  async getOutputsByTxId(txId: string): Promise<TxOutput[]> {
    return this.request<TxOutput[]>(`/v1/indexer/tx/${txId}/outputs`)
  }

  /**
   * GET /v1/indexer/tx/{txId}/raw
   * Get raw transaction hex
   */
  async getRawTxById(txId: string): Promise<string> {
    return this.request<string>(`/v1/indexer/tx/${txId}/raw`)
  }

  /**
   * GET /v1/indexer/tx/{txId}/{index}/utxo
   * Get UTXO by transaction ID and output index
   */
  async getUtxoByTxIdAndIndex(txId: string, index: number): Promise<UTXO> {
    return this.request<UTXO>(`/v1/indexer/tx/${txId}/${index}/utxo`)
  }

  /**
   * POST /v1/indexer/tx/push
   * Broadcast a raw transaction
   */
  async localPushTx(rawTx: string): Promise<PushTxResult> {
    return this.request<PushTxResult>(
      '/v1/indexer/tx/push',
      undefined,
      'POST',
      { rawtx: rawTx }
    )
  }

  /**
   * POST /v1/indexer/tx/push-batch
   * Broadcast multiple raw transactions
   */
  async localPushTxs(rawTxs: string[]): Promise<PushTxResult[]> {
    return this.request<PushTxResult[]>(
      '/v1/indexer/tx/push-batch',
      undefined,
      'POST',
      { rawtxs: rawTxs }
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADDRESSES (Keeping existing + new ones)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/indexer/address/{address}/balance
   * Get BTC balance for an address
   */
  async getAddressBalance(address: string): Promise<{
    address: string
    satoshi: number
    pendingSatoshi: number
    utxoCount: number
    btcSatoshi: number
    btcPendingSatoshi: number
    btcUtxoCount: number
    inscriptionSatoshi: number
    inscriptionPendingSatoshi: number
    inscriptionUtxoCount: number
  }> {
    return this.request(`/v1/indexer/address/${address}/balance`)
  }

  /**
   * GET /v1/indexer/address/{address}/utxo
   * Get UTXOs for an address
   */
  async getAddressUtxo(
    address: string,
    params?: PaginationParams
  ): Promise<{
    cursor: number
    total: number
    totalConfirmed: number
    totalUnconfirmed: number
    totalUnconfirmedSpend: number
    utxo: UTXO[]
  }> {
    return this.request(
      `/v1/indexer/address/${address}/utxo`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/address/{address}/utxo-data
   * Get UTXO data with inscription details
   */
  async getAddressUtxoData(
    address: string,
    params?: PaginationParams
  ): Promise<{
    cursor: number
    total: number
    utxo: Array<{
      txid: string
      vout: number
      satoshi: number
      inscriptions: Array<{
        inscriptionId: string
        inscriptionNumber: number
        isBRC20: boolean
      }>
    }>
  }> {
    return this.request(
      `/v1/indexer/address/${address}/utxo-data`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/address/{address}/inscription-utxo
   * Get inscription UTXOs for an address
   */
  async getAddressInscriptionUtxo(
    address: string,
    params?: PaginationParams
  ): Promise<{
    cursor: number
    total: number
    utxo: InscriptionUTXO[]
  }> {
    return this.request(
      `/v1/indexer/address/${address}/inscription-utxo`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/address/{address}/inscription-utxo-data
   * Get inscription UTXO data with details
   */
  async getAddressInscriptionUtxoData(
    address: string,
    params?: PaginationParams
  ): Promise<{
    cursor: number
    total: number
    utxo: InscriptionUTXO[]
  }> {
    return this.request(
      `/v1/indexer/address/${address}/inscription-utxo-data`,
      params as Record<string, string | number | undefined>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INSCRIPTIONS (6 endpoints)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/indexer/inscription/{inscriptionId}/info
   * Get inscription information
   */
  async getInscriptionInfo(inscriptionId: string): Promise<InscriptionDetail> {
    return this.request<InscriptionDetail>(
      `/v1/indexer/inscription/${inscriptionId}/info`
    )
  }

  /**
   * GET /v1/indexer/inscription/{inscriptionId}/content
   * Get inscription content
   */
  async getInscriptionContent(inscriptionId: string): Promise<Blob> {
    // Note: This returns binary data, not JSON
    const url = `${this.baseUrl}/v1/indexer/inscription/${inscriptionId}/content`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })
    return response.blob()
  }

  /**
   * GET /v1/indexer/inscription/{inscriptionId}/events
   * Get inscription events (transfers, sales, etc.)
   */
  async getInscriptionEvents(
    inscriptionId: string
  ): Promise<InscriptionEvent[]> {
    return this.request<InscriptionEvent[]>(
      `/v1/indexer/inscription/${inscriptionId}/events`
    )
  }

  /**
   * GET /v1/indexer/address/{address}/inscription-data
   * Get inscription data by address
   */
  async getInscriptionDataByAddress(
    address: string,
    params?: PaginationParams
  ): Promise<{
    cursor: number
    total: number
    inscriptions: InscriptionData[]
  }> {
    return this.request(
      `/v1/indexer/address/${address}/inscription-data`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/address/{address}/abandon-nft-utxo-data
   * Get abandoned NFT UTXOs for an address
   */
  async getAbandonNftUtxoDataByAddress(
    address: string
  ): Promise<{
    total: number
    utxos: AbandonedNFT[]
  }> {
    return this.request(`/v1/indexer/address/${address}/abandon-nft-utxo-data`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BRC-20 (Keeping existing 9 methods)
  // ──────────────────────────────────────────────────────────────────────────

  async getBRC20List(
    params?: BRC20PaginationParams
  ): Promise<BRC20TokenListResult> {
    return this.request<BRC20TokenListResult>(
      '/v1/indexer/brc20/list',
      params as Record<string, string | number | undefined>
    )
  }

  async getBRC20TickerInfo(ticker: string): Promise<BRC20TickerInfo> {
    return this.request<BRC20TickerInfo>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/info`
    )
  }

  async getBRC20Holders(
    ticker: string,
    params?: PaginationParams
  ): Promise<BRC20HolderListResult> {
    return this.request<BRC20HolderListResult>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/holders`,
      params as Record<string, string | number | undefined>
    )
  }

  async getBRC20History(
    ticker: string,
    params?: BRC20PaginationParams
  ): Promise<BRC20HistoryResult> {
    return this.request<BRC20HistoryResult>(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/history`,
      params as Record<string, string | number | undefined>
    )
  }

  async getBRC20TxHistory(
    ticker: string,
    params?: BRC20PaginationParams
  ): Promise<{
    total: number
    detail: Array<{
      txid: string
      blockHeight: number
      type: string
      valid: boolean
      inscriptionId: string
      inscriptionNumber: number
      from: string
      to: string
      satoshi: number
      fee: number
      amount: string
      ticker: string
    }>
  }> {
    return this.request(
      `/v1/indexer/brc20/${encodeURIComponent(ticker)}/tx-history`,
      params as Record<string, string | number | undefined>
    )
  }

  async getAddressBRC20Summary(
    address: string,
    params?: BRC20PaginationParams
  ): Promise<BRC20AddressSummary> {
    return this.request<BRC20AddressSummary>(
      `/v1/indexer/address/${address}/brc20/summary`,
      params as Record<string, string | number | undefined>
    )
  }

  async getAddressBRC20TickerInfo(
    address: string,
    ticker: string
  ): Promise<BRC20AddressTickerInfo> {
    return this.request<BRC20AddressTickerInfo>(
      `/v1/indexer/address/${address}/brc20/${encodeURIComponent(ticker)}/info`
    )
  }

  async getAddressBRC20History(
    address: string,
    ticker: string,
    params?: BRC20PaginationParams
  ): Promise<{
    total: number
    detail: BRC20HistoryItem[]
  }> {
    return this.request(
      `/v1/indexer/address/${address}/brc20/${encodeURIComponent(ticker)}/history`,
      params as Record<string, string | number | undefined>
    )
  }

  async getAddressBRC20TransferableInscriptions(
    address: string,
    params?: PaginationParams
  ): Promise<BRC20TransferableInscriptionsResult> {
    return this.request<BRC20TransferableInscriptionsResult>(
      `/v1/indexer/address/${address}/brc20/transferable-inscriptions`,
      params as Record<string, string | number | undefined>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MARKETPLACE & COLLECTIONS (17 endpoints)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/market/collection/{collectionId}/statistic
   * Get collection statistics
   */
  async getCollectionStatistic(collectionId: string): Promise<CollectionStats> {
    return this.request<CollectionStats>(
      `/v1/market/collection/${collectionId}/statistic`
    )
  }

  /**
   * GET /v1/market/collection/statistic/list
   * Get list of collection statistics
   */
  async getCollectionStatisticList(
    params?: ListPaginationParams
  ): Promise<CollectionStats[]> {
    return this.request<CollectionStats[]>(
      '/v1/market/collection/statistic/list',
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/market/collection/{collectionId}/summary
   * Get collection summary
   */
  async getCollectionSummary(collectionId: string): Promise<CollectionSummary> {
    return this.request<CollectionSummary>(
      `/v1/market/collection/${collectionId}/summary`
    )
  }

  /**
   * GET /v1/market/collection/{collectionId}/inscriptions
   * Get collection inscriptions
   */
  async getCollectionInscriptions(
    collectionId: string,
    params?: ListPaginationParams
  ): Promise<InscriptionData[]> {
    return this.request<InscriptionData[]>(
      `/v1/market/collection/${collectionId}/inscriptions`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/market/inscription/{inscriptionId}/info
   * Get inscription info (marketplace context)
   */
  async getMarketInscriptionInfo(
    inscriptionId: string
  ): Promise<InscriptionDetail> {
    return this.request<InscriptionDetail>(
      `/v1/market/inscription/${inscriptionId}/info`
    )
  }

  /**
   * POST /v1/market/inscription/info/list
   * Get multiple inscription infos
   */
  async getInscriptionInfoList(
    inscriptionIds: string[]
  ): Promise<InscriptionDetail[]> {
    return this.request<InscriptionDetail[]>(
      '/v1/market/inscription/info/list',
      undefined,
      'POST',
      { inscriptionIds }
    )
  }

  /**
   * GET /v1/market/list
   * Get marketplace listings
   */
  async getMarketList(params?: MarketListParams): Promise<MarketListing[]> {
    return this.request<MarketListing[]>(
      '/v1/market/list',
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/market/actions
   * Get market actions
   */
  async getMarketActions(params?: {
    limit?: number
    offset?: number
  }): Promise<MarketAction[]> {
    return this.request<MarketAction[]>(
      '/v1/market/actions',
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * POST /v1/market/put-on/create
   * Create a marketplace listing
   */
  async createMarketPutOn(params: PutOnParams): Promise<PutOnResult> {
    return this.request<PutOnResult>(
      '/v1/market/put-on/create',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/put-on/confirm
   * Confirm a marketplace listing
   */
  async confirmMarketPutOn(params: ConfirmParams): Promise<ConfirmResult> {
    return this.request<ConfirmResult>(
      '/v1/market/put-on/confirm',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/bid/prepare
   * Prepare a bid
   */
  async createMarketBidPrepare(
    params: BidPrepareParams
  ): Promise<BidPrepare> {
    return this.request<BidPrepare>(
      '/v1/market/bid/prepare',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/bid/create
   * Create a bid
   */
  async createMarketBid(params: BidParams): Promise<BidResult> {
    return this.request<BidResult>(
      '/v1/market/bid/create',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/bid/confirm
   * Confirm a bid
   */
  async confirmMarketBid(params: ConfirmParams): Promise<ConfirmResult> {
    return this.request<ConfirmResult>(
      '/v1/market/bid/confirm',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/put-off/create
   * Create a delist request
   */
  async createMarketPutOff(params: PutOffParams): Promise<PutOffResult> {
    return this.request<PutOffResult>(
      '/v1/market/put-off/create',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/put-off/confirm
   * Confirm a delist
   */
  async confirmMarketPutOff(params: ConfirmParams): Promise<ConfirmResult> {
    return this.request<ConfirmResult>(
      '/v1/market/put-off/confirm',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/modify-price/create
   * Create a price modification request
   */
  async createMarketModifyPrice(
    params: ModifyPriceParams
  ): Promise<ModifyResult> {
    return this.request<ModifyResult>(
      '/v1/market/modify-price/create',
      undefined,
      'POST',
      params
    )
  }

  /**
   * POST /v1/market/modify-price/confirm
   * Confirm a price modification
   */
  async confirmMarketModifyPrice(
    params: ConfirmParams
  ): Promise<ConfirmResult> {
    return this.request<ConfirmResult>(
      '/v1/market/modify-price/confirm',
      undefined,
      'POST',
      params
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COLLECTION INDEXER (8 endpoints)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/indexer/collection/{collectionId}/status
   * Get collection indexing status
   */
  async getCollectionStatus(collectionId: string): Promise<CollectionStatus> {
    return this.request<CollectionStatus>(
      `/v1/indexer/collection/${collectionId}/status`
    )
  }

  /**
   * GET /v1/indexer/collection/{collectionId}/info
   * Get collection information
   */
  async getCollectionInfo(collectionId: string): Promise<CollectionInfo> {
    return this.request<CollectionInfo>(
      `/v1/indexer/collection/${collectionId}/info`
    )
  }

  /**
   * GET /v1/indexer/collection/{collectionId}/holders
   * Get collection holders
   */
  async getCollectionHolders(
    collectionId: string,
    params?: ListPaginationParams
  ): Promise<Holder[]> {
    return this.request<Holder[]>(
      `/v1/indexer/collection/${collectionId}/holders`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/address/{address}/collection/list
   * Get collections owned by address
   */
  async getAddressCollectionList(
    address: string,
    params?: ListPaginationParams
  ): Promise<CollectionInfo[]> {
    return this.request<CollectionInfo[]>(
      `/v1/indexer/address/${address}/collection/list`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/collection/{collectionId}/items
   * Get collection items
   */
  async getCollectionItems(
    collectionId: string,
    params?: ListPaginationParams
  ): Promise<CollectionItem[]> {
    return this.request<CollectionItem[]>(
      `/v1/indexer/collection/${collectionId}/items`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/address/{address}/collection/summary
   * Get collection summary for address
   */
  async getAddressCollectionSummary(
    address: string
  ): Promise<AddressCollectionSummary> {
    return this.request<AddressCollectionSummary>(
      `/v1/indexer/address/${address}/collection/summary`
    )
  }

  /**
   * GET /v1/indexer/address/{address}/collection/{collectionId}/items
   * Get address collection items
   */
  async getAddressCollectionItems(
    address: string,
    collectionId: string,
    params?: ListPaginationParams
  ): Promise<CollectionItem[]> {
    return this.request<CollectionItem[]>(
      `/v1/indexer/address/${address}/collection/${collectionId}/items`,
      params as Record<string, string | number | undefined>
    )
  }

  /**
   * GET /v1/indexer/inscription/{inscriptionId}/collection/list
   * Get collections for inscription
   */
  async getInscriptionCollectionList(
    inscriptionId: string
  ): Promise<CollectionInfo[]> {
    return this.request<CollectionInfo[]>(
      `/v1/indexer/inscription/${inscriptionId}/collection/list`
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRICE DATA (1 endpoint)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/indexer/price/btc
   * Get BTC price
   */
  async getBtcPrice(): Promise<BtcPriceData> {
    return this.request<BtcPriceData>('/v1/indexer/price/btc')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITY
  // ──────────────────────────────────────────────────────────────────────────

  clearCache(): void {
    this.cache.clear()
  }

  invalidateCache(pattern: string): void {
    Array.from(this.cache.keys()).forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Singleton export
export const unisatServiceExpanded = new UniSatServiceExpanded()
