/**
 * OKX Web3 API Service - CYPHER V3
 * Comprehensive DEX Aggregator, Market Data, Balance, and x402 integration
 *
 * Base URL: https://web3.okx.com
 * Auth: HMAC-SHA256 signed headers (OK-ACCESS-KEY, OK-ACCESS-SIGN, etc.)
 *
 * Categories:
 * - DEX Aggregator: quote, swap, approve, liquidity, all-tokens, supported-chains, bridge
 * - Market: candles, historical-candles, price-info, token-basic-info, token-search
 * - Index: current-price
 * - Balance: all-token-balances, total-value
 * - Post-Transaction: orders, broadcast
 * - x402: settle, verify, supported
 */

import * as crypto from 'crypto';

// ─── Type Definitions ────────────────────────────────────────────────────────

// --- Common ---

export interface OKXWeb3Response<T> {
  code: string;
  msg: string;
  data: T;
}

// --- DEX Aggregator Types ---

export interface OKXToken {
  decimals: string;
  tokenContractAddress: string;
  tokenLogoUrl: string;
  tokenName: string;
  tokenSymbol: string;
}

export interface OKXLiquiditySource {
  id: string;
  name: string;
  logo: string;
}

export interface OKXRouterToken {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenUnitPrice: string;
  decimal: string;
  isHoneyPot: boolean;
  taxRate: string;
}

export interface OKXDexRoute {
  dexProtocol: {
    dexName: string;
    percent: string;
  };
  fromToken: OKXRouterToken;
  toToken: OKXRouterToken;
}

export interface OKXRouterResult {
  chainIndex: string;
  swapMode: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee: string;
  estimateGasFee: string;
  priceImpactPercent: string;
  router: string;
  dexRouterList: OKXDexRoute[];
  fromToken: OKXRouterToken;
  toToken: OKXRouterToken;
}

export interface OKXSwapTx {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  maxPriorityFeePerGas?: string;
  minReceiveAmount: string;
  maxSpendAmount?: string;
  slippagePercent?: string;
  signatureData?: string[];
}

export interface OKXQuoteResult {
  routerResult: OKXRouterResult;
}

export interface OKXSwapResult {
  routerResult: OKXRouterResult;
  tx: OKXSwapTx;
}

export interface OKXApproveResult {
  data: string;
  dexContractAddress: string;
  gasLimit: string;
  gasPrice: string;
}

export interface OKXSupportedChain {
  chainIndex: string;
  chainName: string;
  dexTokenApproveAddress: string;
}

export interface OKXBridgeToken {
  chainIndex: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: string;
  tokenLogoUrl: string;
}

export interface OKXBridgeQuoteResult {
  fromChainIndex: string;
  toChainIndex: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedTime: string;
  bridgeName: string;
  routerList: Array<{
    bridgeName: string;
    fromTokenAmount: string;
    toTokenAmount: string;
  }>;
}

// --- Market Types ---

export interface OKXCandlestick {
  ts: string;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
  volUsd: string;
  confirm: string;
}

export interface OKXTokenPriceInfo {
  chainIndex: string;
  tokenContractAddress: string;
  time: string;
  price: string;
  marketCap: string;
  priceChange5M: string;
  priceChange1H: string;
  priceChange4H: string;
  priceChange24H: string;
  volume5M: string;
  volume1H: string;
  volume4H: string;
  volume24H: string;
  txs5M: string;
  txs1H: string;
  txs4H: string;
  txs24H: string;
  maxPrice: string;
  minPrice: string;
  tradeNum: string;
  circSupply: string;
  liquidity: string;
  holders: string;
}

export interface OKXTokenBasicInfo {
  chainIndex: string;
  decimal: string;
  tagList: {
    communityRecognized: boolean;
  };
  tokenContractAddress: string;
  tokenLogoUrl: string;
  tokenName: string;
  tokenSymbol: string;
}

export interface OKXTokenSearchResult {
  chainIndex: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogoUrl: string;
  tokenContractAddress: string;
  decimal: string;
  explorerUrl: string;
  change: string;
  holders: string;
  liquidity: string;
  marketCap: string;
  price: string;
  tagList: {
    communityRecognized: boolean;
  };
}

export interface OKXIndexPrice {
  chainIndex: string;
  tokenContractAddress: string;
  time: string;
  price: string;
}

// --- Balance Types ---

export interface OKXTokenBalance {
  chainIndex: string;
  tokenContractAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  tokenType: string;
  isRiskToken: boolean;
}

export interface OKXTotalValue {
  totalValue: string;
}

// --- Post-Transaction Types ---

export interface OKXTransactionOrder {
  orderId: string;
  chainIndex: string;
  txHash: string;
  status: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  timestamp: string;
}

export interface OKXBroadcastResult {
  orderId: string;
  txHash: string;
}

// --- x402 Types ---

export interface OKXx402SettleResult {
  success: boolean;
  txHash: string;
  amount: string;
  token: string;
}

export interface OKXx402VerifyResult {
  verified: boolean;
  txHash: string;
  amount: string;
  payerAddress: string;
}

export interface OKXx402SupportedToken {
  chainIndex: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: string;
}

// --- Query Parameter Types ---

export interface OKXQuoteParams {
  chainIndex: string;
  amount: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  swapMode?: 'exactIn' | 'exactOut';
  dexIds?: string;
  directRoute?: boolean;
  priceImpactProtectionPercent?: string;
  feePercent?: string;
}

export interface OKXSwapParams extends OKXQuoteParams {
  slippagePercent: string;
  userWalletAddress: string;
  approveTransaction?: boolean;
  approveAmount?: string;
  swapReceiverAddress?: string;
  excludeDexIds?: string;
  gasLimit?: string;
  gasLevel?: 'slow' | 'average' | 'fast';
}

export interface OKXApproveParams {
  chainIndex: string;
  tokenContractAddress: string;
  approveAmount: string;
}

export interface OKXCandlesParams {
  chainIndex: string;
  tokenContractAddress: string;
  after?: string;
  before?: string;
  bar?: '1s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H';
  limit?: string;
}

export interface OKXBridgeQuoteParams {
  fromChainIndex: string;
  toChainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippagePercent?: string;
  userWalletAddress?: string;
}

// ─── Cache Entry ─────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  BASE_URL: 'https://web3.okx.com',
  CACHE_TTL: 15000,            // 15 seconds default
  CANDLE_CACHE_TTL: 30000,     // 30 seconds for candles
  PRICE_CACHE_TTL: 10000,      // 10 seconds for prices
  TOKEN_CACHE_TTL: 300000,     // 5 minutes for token lists
  REQUEST_TIMEOUT: 20000,      // 20 seconds
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000,
  MAX_REQUESTS_PER_MINUTE: 120,
  RATE_LIMIT_WINDOW: 60000,
  MAX_CACHE_ENTRIES: 500,
  MIN_REQUEST_INTERVAL: 200,   // 200ms between requests
} as const;

// ─── Service Implementation ──────────────────────────────────────────────────

export class OKXWeb3Service {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private requestTimestamps: number[] = [];
  private lastRequestTime = 0;

  // ── Credentials ─────────────────────────────────────────────────────────

  private get apiKey(): string {
    return process.env.OKX_WEB3_API_KEY || process.env.OKX_API_KEY || '';
  }

  private get secretKey(): string {
    return process.env.OKX_WEB3_SECRET_KEY || process.env.OKX_SECRET_KEY || '';
  }

  private get passphrase(): string {
    return process.env.OKX_WEB3_PASSPHRASE || process.env.OKX_PASSPHRASE || '';
  }

  private get projectId(): string {
    return process.env.OKX_WEB3_PROJECT_ID || '';
  }

  // ════════════════════════════════════════════════════════════════════════
  // DEX AGGREGATOR ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v6/dex/aggregator/all-tokens
   * Get all supported tokens on a chain
   */
  async getAllTokens(chainIndex: string): Promise<OKXToken[]> {
    const cacheKey = `all-tokens-${chainIndex}`;
    const cached = this.getCached<OKXToken[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXToken[]>(
      '/api/v6/dex/aggregator/all-tokens',
      { chainIndex }
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/aggregator/quote
   * Get swap quote without transaction data
   */
  async getQuote(params: OKXQuoteParams): Promise<OKXQuoteResult[]> {
    const cacheKey = `quote-${JSON.stringify(params)}`;
    const cached = this.getCached<OKXQuoteResult[]>(cacheKey);
    if (cached) return cached;

    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      amount: params.amount,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
    };
    if (params.swapMode) queryParams.swapMode = params.swapMode;
    if (params.dexIds) queryParams.dexIds = params.dexIds;
    if (params.directRoute !== undefined) queryParams.directRoute = String(params.directRoute);
    if (params.priceImpactProtectionPercent) queryParams.priceImpactProtectionPercent = params.priceImpactProtectionPercent;
    if (params.feePercent) queryParams.feePercent = params.feePercent;

    const data = await this.get<OKXQuoteResult[]>(
      '/api/v6/dex/aggregator/quote',
      queryParams
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.PRICE_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/aggregator/swap
   * Get swap transaction data for execution
   */
  async getSwap(params: OKXSwapParams): Promise<OKXSwapResult[]> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      amount: params.amount,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      slippagePercent: params.slippagePercent,
      userWalletAddress: params.userWalletAddress,
    };
    if (params.swapMode) queryParams.swapMode = params.swapMode;
    if (params.approveTransaction !== undefined) queryParams.approveTransaction = String(params.approveTransaction);
    if (params.approveAmount) queryParams.approveAmount = params.approveAmount;
    if (params.swapReceiverAddress) queryParams.swapReceiverAddress = params.swapReceiverAddress;
    if (params.feePercent) queryParams.feePercent = params.feePercent;
    if (params.priceImpactProtectionPercent) queryParams.priceImpactProtectionPercent = params.priceImpactProtectionPercent;
    if (params.dexIds) queryParams.dexIds = params.dexIds;
    if (params.excludeDexIds) queryParams.excludeDexIds = params.excludeDexIds;
    if (params.gasLimit) queryParams.gasLimit = params.gasLimit;
    if (params.gasLevel) queryParams.gasLevel = params.gasLevel;

    // Swaps are not cached since they produce unique transaction data
    const data = await this.get<OKXSwapResult[]>(
      '/api/v6/dex/aggregator/swap',
      queryParams
    );
    return data || [];
  }

  /**
   * GET /api/v6/dex/aggregator/approve-transaction
   * Get token approval transaction data
   */
  async getApproveTransaction(params: OKXApproveParams): Promise<OKXApproveResult[]> {
    const data = await this.get<OKXApproveResult[]>(
      '/api/v6/dex/aggregator/approve-transaction',
      {
        chainIndex: params.chainIndex,
        tokenContractAddress: params.tokenContractAddress,
        approveAmount: params.approveAmount,
      }
    );
    return data || [];
  }

  /**
   * GET /api/v6/dex/aggregator/get-liquidity
   * Get available liquidity sources on a chain
   */
  async getLiquidity(chainIndex: string): Promise<OKXLiquiditySource[]> {
    const cacheKey = `liquidity-${chainIndex}`;
    const cached = this.getCached<OKXLiquiditySource[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXLiquiditySource[]>(
      '/api/v6/dex/aggregator/get-liquidity',
      { chainIndex }
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/aggregator/supported-chains
   * Get all supported chains for swaps
   */
  async getSupportedChains(): Promise<OKXSupportedChain[]> {
    const cacheKey = 'supported-chains';
    const cached = this.getCached<OKXSupportedChain[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXSupportedChain[]>(
      '/api/v6/dex/aggregator/supported-chains'
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  // ── Cross-Chain / Bridge ────────────────────────────────────────────────

  /**
   * GET /api/v6/dex/cross-chain/supported-chains
   * Get chains supported for cross-chain swaps
   */
  async getCrossChainSupportedChains(): Promise<OKXSupportedChain[]> {
    const cacheKey = 'cross-chain-supported-chains';
    const cached = this.getCached<OKXSupportedChain[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXSupportedChain[]>(
      '/api/v6/dex/cross-chain/supported-chains'
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/cross-chain/bridge-tokens
   * Get tokens supported for bridging on a chain
   */
  async getBridgeTokens(chainIndex: string): Promise<OKXBridgeToken[]> {
    const cacheKey = `bridge-tokens-${chainIndex}`;
    const cached = this.getCached<OKXBridgeToken[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXBridgeToken[]>(
      '/api/v6/dex/cross-chain/bridge-tokens',
      { chainIndex }
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/cross-chain/quote
   * Get cross-chain swap quote
   */
  async getCrossChainQuote(params: OKXBridgeQuoteParams): Promise<OKXBridgeQuoteResult[]> {
    const queryParams: Record<string, string> = {
      fromChainIndex: params.fromChainIndex,
      toChainIndex: params.toChainIndex,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
    };
    if (params.slippagePercent) queryParams.slippagePercent = params.slippagePercent;
    if (params.userWalletAddress) queryParams.userWalletAddress = params.userWalletAddress;

    const data = await this.get<OKXBridgeQuoteResult[]>(
      '/api/v6/dex/cross-chain/quote',
      queryParams
    );
    return data || [];
  }

  // ════════════════════════════════════════════════════════════════════════
  // MARKET DATA ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v6/dex/market/candles
   * Get candlestick data (latest 1440 entries)
   */
  async getCandles(params: OKXCandlesParams): Promise<OKXCandlestick[]> {
    const cacheKey = `candles-${params.chainIndex}-${params.tokenContractAddress}-${params.bar || '1m'}-${params.limit || 100}`;
    const cached = this.getCached<OKXCandlestick[]>(cacheKey);
    if (cached) return cached;

    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      tokenContractAddress: params.tokenContractAddress,
    };
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;
    if (params.bar) queryParams.bar = params.bar;
    if (params.limit) queryParams.limit = params.limit;

    const data = await this.get<OKXCandlestick[]>(
      '/api/v6/dex/market/candles',
      queryParams
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.CANDLE_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/market/historical-candles
   * Get historical candlestick data
   */
  async getHistoricalCandles(params: OKXCandlesParams): Promise<OKXCandlestick[]> {
    const cacheKey = `hist-candles-${params.chainIndex}-${params.tokenContractAddress}-${params.bar || '1m'}`;
    const cached = this.getCached<OKXCandlestick[]>(cacheKey);
    if (cached) return cached;

    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      tokenContractAddress: params.tokenContractAddress,
    };
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;
    if (params.bar) queryParams.bar = params.bar;
    if (params.limit) queryParams.limit = params.limit;

    const data = await this.get<OKXCandlestick[]>(
      '/api/v6/dex/market/historical-candles',
      queryParams
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.CANDLE_CACHE_TTL);
    return result;
  }

  /**
   * POST /api/v6/dex/market/price-info
   * Get token trading information (price, volume, market cap)
   */
  async getTokenPriceInfo(
    chainIndex: string,
    tokenContractAddress: string
  ): Promise<OKXTokenPriceInfo[]> {
    const cacheKey = `price-info-${chainIndex}-${tokenContractAddress}`;
    const cached = this.getCached<OKXTokenPriceInfo[]>(cacheKey);
    if (cached) return cached;

    const data = await this.post<OKXTokenPriceInfo[]>(
      '/api/v6/dex/market/price-info',
      { chainIndex, tokenContractAddress }
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.PRICE_CACHE_TTL);
    return result;
  }

  /**
   * POST /api/v6/dex/market/price-info (batch)
   * Get trading info for multiple tokens at once (up to 100)
   */
  async getBatchTokenPriceInfo(
    tokens: Array<{ chainIndex: string; tokenContractAddress: string }>
  ): Promise<OKXTokenPriceInfo[]> {
    const data = await this.post<OKXTokenPriceInfo[]>(
      '/api/v6/dex/market/price-info',
      tokens
    );
    return data || [];
  }

  /**
   * POST /api/v6/dex/market/token/basic-info
   * Get token basic information (name, symbol, decimals, logo)
   */
  async getTokenBasicInfo(
    chainIndex: string,
    tokenContractAddress: string
  ): Promise<OKXTokenBasicInfo[]> {
    const cacheKey = `token-info-${chainIndex}-${tokenContractAddress}`;
    const cached = this.getCached<OKXTokenBasicInfo[]>(cacheKey);
    if (cached) return cached;

    const data = await this.post<OKXTokenBasicInfo[]>(
      '/api/v6/dex/market/token/basic-info',
      { chainIndex, tokenContractAddress }
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/market/token/search
   * Search for tokens by keyword, address, or symbol
   */
  async searchTokens(chains: string, search: string): Promise<OKXTokenSearchResult[]> {
    const cacheKey = `token-search-${chains}-${search}`;
    const cached = this.getCached<OKXTokenSearchResult[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXTokenSearchResult[]>(
      '/api/v6/dex/market/token/search',
      { chains, search }
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/market/trades
   * Get recent trades for a token
   */
  async getRecentTrades(
    chainIndex: string,
    tokenContractAddress: string,
    limit?: string
  ): Promise<unknown[]> {
    const queryParams: Record<string, string> = {
      chainIndex,
      tokenContractAddress,
    };
    if (limit) queryParams.limit = limit;

    const data = await this.get<unknown[]>(
      '/api/v6/dex/market/trades',
      queryParams
    );
    return data || [];
  }

  /**
   * GET /api/v6/dex/market/token/holder-count
   * Get token holder count
   */
  async getTokenHolderCount(
    chainIndex: string,
    tokenContractAddress: string
  ): Promise<unknown> {
    const cacheKey = `holder-count-${chainIndex}-${tokenContractAddress}`;
    const cached = this.getCached<unknown>(cacheKey);
    if (cached) return cached;

    const data = await this.get<unknown>(
      '/api/v6/dex/market/token/holder-count',
      { chainIndex, tokenContractAddress }
    );
    this.setCache(cacheKey, data, CONFIG.CACHE_TTL);
    return data;
  }

  /**
   * GET /api/v6/dex/market/token/top-holders
   * Get top token holders
   */
  async getTopTokenHolders(
    chainIndex: string,
    tokenContractAddress: string,
    limit?: string
  ): Promise<unknown[]> {
    const queryParams: Record<string, string> = {
      chainIndex,
      tokenContractAddress,
    };
    if (limit) queryParams.limit = limit;

    const cacheKey = `top-holders-${chainIndex}-${tokenContractAddress}-${limit || '20'}`;
    const cached = this.getCached<unknown[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<unknown[]>(
      '/api/v6/dex/market/token/top-holders',
      queryParams
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.CACHE_TTL);
    return result;
  }

  // ── Index Price ─────────────────────────────────────────────────────────

  /**
   * POST /api/v6/dex/index/current-price
   * Get index prices for tokens (aggregated from multiple sources)
   */
  async getIndexPrices(
    tokens: Array<{ chainIndex: string; tokenContractAddress: string }>
  ): Promise<OKXIndexPrice[]> {
    const data = await this.post<OKXIndexPrice[]>(
      '/api/v6/dex/index/current-price',
      tokens
    );
    return data || [];
  }

  // ════════════════════════════════════════════════════════════════════════
  // BALANCE ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v6/dex/balance/all-token-balances-by-address
   * Get all token balances for an address
   */
  async getAllTokenBalances(
    address: string,
    chains?: string
  ): Promise<OKXTokenBalance[]> {
    const queryParams: Record<string, string> = { address };
    if (chains) queryParams.chains = chains;

    const cacheKey = `balances-${address}-${chains || 'all'}`;
    const cached = this.getCached<OKXTokenBalance[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXTokenBalance[]>(
      '/api/v6/dex/balance/all-token-balances-by-address',
      queryParams
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.CACHE_TTL);
    return result;
  }

  /**
   * GET /api/v6/dex/balance/total-value-by-address
   * Get total portfolio value for an address
   */
  async getTotalValue(
    address: string,
    chains?: string
  ): Promise<OKXTotalValue | null> {
    const queryParams: Record<string, string> = { address };
    if (chains) queryParams.chains = chains;

    const cacheKey = `total-value-${address}-${chains || 'all'}`;
    const cached = this.getCached<OKXTotalValue>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXTotalValue>(
      '/api/v6/dex/balance/total-value-by-address',
      queryParams
    );
    if (data) this.setCache(cacheKey, data, CONFIG.CACHE_TTL);
    return data;
  }

  // ════════════════════════════════════════════════════════════════════════
  // POST-TRANSACTION ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v6/dex/post-transaction/orders
   * Get transaction order status
   */
  async getTransactionOrders(params: {
    orderId?: string;
    chainIndex?: string;
    address?: string;
    limit?: string;
  }): Promise<OKXTransactionOrder[]> {
    const data = await this.get<OKXTransactionOrder[]>(
      '/api/v6/dex/post-transaction/orders',
      params as Record<string, string>
    );
    return data || [];
  }

  /**
   * POST /api/v6/dex/post-transaction/broadcast
   * Broadcast a signed transaction
   */
  async broadcastTransaction(
    chainIndex: string,
    signedTx: string
  ): Promise<OKXBroadcastResult | null> {
    const data = await this.post<OKXBroadcastResult>(
      '/api/v6/dex/post-transaction/broadcast',
      { chainIndex, signedTx }
    );
    return data;
  }

  // ════════════════════════════════════════════════════════════════════════
  // x402 ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/v6/x402/settle
   * Settle a payment using x402 protocol
   */
  async x402Settle(params: {
    chainIndex: string;
    tokenContractAddress: string;
    amount: string;
    payerAddress: string;
    payeeAddress: string;
  }): Promise<OKXx402SettleResult | null> {
    const data = await this.post<OKXx402SettleResult>(
      '/api/v6/x402/settle',
      params
    );
    return data;
  }

  /**
   * GET /api/v6/x402/verify
   * Verify a payment transaction
   */
  async x402Verify(params: {
    chainIndex: string;
    txHash: string;
  }): Promise<OKXx402VerifyResult | null> {
    const data = await this.get<OKXx402VerifyResult>(
      '/api/v6/x402/verify',
      params as Record<string, string>
    );
    return data;
  }

  /**
   * GET /api/v6/x402/supported
   * Get supported tokens and chains for x402
   */
  async x402GetSupported(): Promise<OKXx402SupportedToken[]> {
    const cacheKey = 'x402-supported';
    const cached = this.getCached<OKXx402SupportedToken[]>(cacheKey);
    if (cached) return cached;

    const data = await this.get<OKXx402SupportedToken[]>(
      '/api/v6/x402/supported'
    );
    const result = data || [];
    this.setCache(cacheKey, result, CONFIG.TOKEN_CACHE_TTL);
    return result;
  }

  // ════════════════════════════════════════════════════════════════════════
  // CORE HTTP / INFRASTRUCTURE
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Generate HMAC-SHA256 signed headers for OKX Web3 API
   */
  private generateHeaders(
    method: string,
    requestPath: string,
    queryString: string = '',
    body: string = ''
  ): Record<string, string> {
    const timestamp = new Date().toISOString();
    const stringToSign = timestamp + method.toUpperCase() + requestPath + (queryString ? `?${queryString}` : '') + body;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
    };

    if (this.projectId) {
      headers['OK-ACCESS-PROJECT'] = this.projectId;
    }

    return headers;
  }

  /**
   * GET request
   */
  private async get<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<T | null> {
    const url = new URL(`${CONFIG.BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const queryString = url.searchParams.toString();
    const headers = this.generateHeaders('GET', path, queryString);

    return this.executeRequest<T>(url.toString(), {
      method: 'GET',
      headers,
    });
  }

  /**
   * POST request
   */
  private async post<T>(
    path: string,
    body: unknown
  ): Promise<T | null> {
    const url = `${CONFIG.BASE_URL}${path}`;
    const bodyStr = JSON.stringify(body);
    const headers = this.generateHeaders('POST', path, '', bodyStr);

    return this.executeRequest<T>(url, {
      method: 'POST',
      headers,
      body: bodyStr,
    });
  }

  /**
   * Central request executor with rate limiting, retries, and timeout
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    retryCount: number = 0
  ): Promise<T | null> {
    await this.waitForRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      this.recordRequest();

      // Minimum interval between requests
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < CONFIG.MIN_REQUEST_INTERVAL) {
        await this.sleep(CONFIG.MIN_REQUEST_INTERVAL - elapsed);
      }
      this.lastRequestTime = Date.now();

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
          const cappedRetryAfter = Math.min(retryAfter, 60);
          console.warn(
            `[OKXWeb3Service] Rate limited (429). Waiting ${cappedRetryAfter}s before retry.`
          );
          await this.sleep(cappedRetryAfter * 1000);
          if (retryCount < CONFIG.MAX_RETRIES) {
            return this.executeRequest<T>(url, options, retryCount + 1);
          }
          throw new Error(`Rate limited after ${CONFIG.MAX_RETRIES} retries`);
        }

        if (response.status === 404) {
          return null;
        }

        const errorBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
      }

      const json = await response.json() as OKXWeb3Response<T>;

      if (json.code !== '0') {
        console.error(`[OKXWeb3Service] API error code ${json.code}: ${json.msg}`);
        throw new Error(`OKX Web3 API error ${json.code}: ${json.msg}`);
      }

      return json.data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const isAbort = error instanceof Error && error.name === 'AbortError';
      if (isAbort) {
      }

      if (retryCount < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(
          `[OKXWeb3Service] Request failed (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES}), retrying in ${delay}ms`
        );
        await this.sleep(delay);
        return this.executeRequest<T>(url, options, retryCount + 1);
      }

      console.error('[OKXWeb3Service] Request failed after retries:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // ── Rate Limiting ────────────────────────────────────────────────────────

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < CONFIG.RATE_LIMIT_WINDOW
    );

    if (this.requestTimestamps.length >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = CONFIG.RATE_LIMIT_WINDOW - (now - oldestInWindow) + 50;
      await this.sleep(waitMs);
      return this.waitForRateLimit();
    }
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  // ── Caching ──────────────────────────────────────────────────────────────

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = CONFIG.CACHE_TTL): void {
    if (this.cache.size >= CONFIG.MAX_CACHE_ENTRIES) {
      this.evictStaleEntries();
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private evictStaleEntries(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp >= entry.ttl) {
        toDelete.push(key);
      }
    });

    for (const key of toDelete) {
      this.cache.delete(key);
    }

    if (this.cache.size >= CONFIG.MAX_CACHE_ENTRIES) {
      const sorted = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const removeCount = Math.ceil(this.cache.size * 0.25);
      for (let i = 0; i < removeCount; i++) {
        this.cache.delete(sorted[i][0]);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // ── Utilities ────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const okxWeb3Service = new OKXWeb3Service();
