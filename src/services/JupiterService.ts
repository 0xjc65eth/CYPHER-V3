/**
 * Jupiter API Service
 * Provides Solana DEX aggregation and routing for optimal swaps
 */

import { logger } from '@/lib/logger';
import { getJupiterFeeBps, JUPITER_FEE_ACCOUNT } from '@/config/fee-config';

export interface JupiterConfig {
  baseUrl?: string;
  timeout?: number;
  cluster?: 'mainnet-beta' | 'devnet';
}

export interface SolanaToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
    github?: string;
    medium?: string;
    coingeckoId?: string;
    serumV3Usdc?: string;
    serumV3Usdt?: string;
  };
}

export interface RouteStep {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface RoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface JupiterRoute {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: 'ExactIn' | 'ExactOut';
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: RoutePlan[];
  contextSlot?: number;
  timeTaken?: number;
}

export interface QuoteResponse {
  data: JupiterRoute[];
  timeTaken: number;
  contextSlot: number;
}

export interface SwapRequest {
  quoteResponse: JupiterRoute;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  useSharedAccounts?: boolean;
  feeAccount?: string;
  trackingAccount?: string;
  computeUnitPriceMicroLamports?: number;
  prioritizationFeeLamports?: number;
  asLegacyTransaction?: boolean;
  useTokenLedger?: boolean;
  destinationTokenAccount?: string;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  computeUnitPriceMicroLamports?: number;
  dynamicSlippageReport?: {
    slippageBps: number;
    otherAmountThreshold: string;
  };
}

export interface TokenPrice {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
  extraInfo?: {
    quotedPrice?: {
      buyPrice: number;
      buyAt: string;
      sellPrice: number;
      sellAt: string;
    };
    confidenceLevel?: 'high' | 'medium' | 'low';
    depth?: {
      buyPriceImpactRatio: { depth: number; priceImpactPct: number }[];
      sellPriceImpactRatio: { depth: number; priceImpactPct: number }[];
    };
  };
}

export interface TokenPriceResponse {
  data: { [tokenId: string]: TokenPrice };
  timeTaken: number;
}

export interface DCAOrderResponse {
  publicKey: string;
  authority: string;
  inputMint: string;
  outputMint: string;
  idx: string;
  nextCycleAt: string;
  inDeposited: string;
  inWithdrawn: string;
  outWithdrawn: string;
  inAmountPerCycle: string;
  cycleFrequency: string;
  nextCycleAmount?: string;
  maxPrice?: string;
  minPrice?: string;
  keeperInBalanceBeforeDeposit: string;
  dcaPubKey: string;
  bump: number;
}

export interface LimitOrderResponse {
  publicKey: string;
  account: {
    maker: string;
    inputMint: string;
    outputMint: string;
    waiting: {
      side: 'buy' | 'sell';
      makingAmount: string;
      takingAmount: string;
    };
    takingAmount: string;
    makingAmount: string;
    expiredAt?: string;
    base: string;
    oriMakingAmount: string;
    oriTakingAmount: string;
    updatedAt: string;
    createdAt: string;
  };
}

export interface IndexedRouteMapResponse {
  mintKeys: string[];
  indexedRouteMap: { [fromIndex: number]: number[] };
}

export class JupiterService {
  private config: JupiterConfig;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 15000; // 15 seconds for swap quotes
  private rateLimitCount = 0;
  private rateLimitResetTime = 0;
  private readonly rateLimitPerMinute = 120; // Jupiter has generous rate limits

  // Common Solana token addresses
  public static readonly COMMON_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    BTC: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
    ETH: '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk',
    RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
    MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
    ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    STEP: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT',
  };

  constructor(config: JupiterConfig = {}) {
    this.config = {
      baseUrl: 'https://api.jup.ag',
      cluster: 'mainnet-beta',
      timeout: 10000,
      ...config,
    };
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    
    if (now >= this.rateLimitResetTime) {
      this.rateLimitCount = 0;
      this.rateLimitResetTime = now + 60000;
    }

    if (this.rateLimitCount >= this.rateLimitPerMinute) {
      logger.warn('Jupiter rate limit reached');
      return false;
    }

    this.rateLimitCount++;
    return true;
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Cache data with TTL
   */
  private setCachedData(key: string, data: any, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Make API request with error handling and caching
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}, ttl = this.defaultTTL, method = 'GET', body?: any): Promise<T> {
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(params)}:${JSON.stringify(body || {})}`;
    
    // Check cache first (only for GET requests)
    if (method === 'GET') {
      const cachedData = this.getCachedData<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    // Add query parameters for GET requests
    if (method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      };

      if (method === 'POST' && body) {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url.toString(), requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Cache successful GET responses
      if (method === 'GET') {
        this.setCachedData(cacheKey, data, ttl);
      }
      
      return data as T;
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Jupiter API request failed');
      
      // Try to return cached data if request fails (only for GET)
      if (method === 'GET') {
        const staleData = this.cache.get(cacheKey);
        if (staleData) {
          logger.warn('Returning stale cached data due to API failure');
          return staleData.data as T;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get swap quote
   */
  async getQuote(options: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
    swapMode?: 'ExactIn' | 'ExactOut';
    dexes?: string[];
    excludeDexes?: string[];
    restrictIntermediateTokens?: boolean;
    onlyDirectRoutes?: boolean;
    asLegacyTransaction?: boolean;
    platformFeeBps?: number;
    maxAccounts?: number;
    quote?: boolean;
    isPremium?: boolean;
  }): Promise<JupiterRoute[]> {
    // Use CYPHER platform fee unless explicitly overridden or user is premium
    const effectiveFeeBps = options.platformFeeBps ?? getJupiterFeeBps(options.isPremium ?? false);

    const params: Record<string, unknown> = {
      inputMint: options.inputMint,
      outputMint: options.outputMint,
      amount: options.amount,
      slippageBps: options.slippageBps || 50, // 0.5% default slippage
      swapMode: options.swapMode || 'ExactIn',
      onlyDirectRoutes: options.onlyDirectRoutes || false,
      asLegacyTransaction: options.asLegacyTransaction || false,
      restrictIntermediateTokens: options.restrictIntermediateTokens || false,
      maxAccounts: options.maxAccounts || 64,
      quote: options.quote ?? true,
      ...(options.dexes && { dexes: options.dexes.join(',') }),
      ...(options.excludeDexes && { excludeDexes: options.excludeDexes.join(',') }),
    };

    // Add platform fee - Jupiter natively deducts this from output
    // and sends it to the feeAccount specified in the swap transaction
    if (effectiveFeeBps > 0) {
      params.platformFeeBps = effectiveFeeBps;
    }

    const response = await this.makeRequest<QuoteResponse>('/v6/quote', params, 10000);
    return response.data;
  }

  /**
   * Get swap transaction for execution
   * Automatically includes CYPHER fee account so Jupiter sends platform fees to our wallet
   */
  async getSwapTransaction(swapRequest: SwapRequest): Promise<SwapResponse> {
    // Inject CYPHER fee account if not already set and the quote includes platform fees
    const request = { ...swapRequest };
    if (!request.feeAccount && request.quoteResponse?.platformFee) {
      request.feeAccount = JUPITER_FEE_ACCOUNT;
    }
    return this.makeRequest<SwapResponse>('/v6/swap', {}, 5000, 'POST', request);
  }

  /**
   * Get all tokens supported by Jupiter
   */
  async getTokens(): Promise<SolanaToken[]> {
    return this.makeRequest<SolanaToken[]>('/v6/tokens', {}, 3600000); // 1 hour cache
  }

  /**
   * Get token prices
   */
  async getTokenPrices(options: {
    ids: string[];
    vsToken?: string;
    showExtraInfo?: boolean;
  }): Promise<TokenPriceResponse> {
    const params = {
      ids: options.ids.join(','),
      vsToken: options.vsToken || 'SOL',
      showExtraInfo: options.showExtraInfo || false,
    };

    return this.makeRequest<TokenPriceResponse>('/v6/price', params, 60000);
  }

  /**
   * Get historical token prices
   */
  async getHistoricalPrices(options: {
    inputToken: string;
    outputToken: string;
    type: '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '1D';
    time_from: number;
    time_to: number;
  }): Promise<Array<{
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number; // volume
    unixTime: number;
  }>> {
    const params = {
      inputToken: options.inputToken,
      outputToken: options.outputToken,
      type: options.type,
      time_from: options.time_from,
      time_to: options.time_to,
    };

    return this.makeRequest<Array<{
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
      unixTime: number;
    }>>('/v1/price/history', params, 300000); // 5 minutes cache for historical data
  }

  /**
   * Get indexed route map for optimization
   */
  async getIndexedRouteMap(): Promise<IndexedRouteMapResponse> {
    return this.makeRequest<IndexedRouteMapResponse>('/v6/indexed-route-map', {}, 3600000); // 1 hour cache
  }

  /**
   * Validate if a route exists between two tokens
   */
  async validateRoute(inputMint: string, outputMint: string): Promise<boolean> {
    try {
      const routes = await this.getQuote({
        inputMint,
        outputMint,
        amount: 1000000, // 1 token with 6 decimals
        onlyDirectRoutes: true,
      });
      return routes.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get optimal swap route with price impact analysis
   */
  async getOptimalRoute(options: {
    inputMint: string;
    outputMint: string;
    amount: number;
    maxPriceImpact?: number;
    preferredDexes?: string[];
    isPremium?: boolean;
  }): Promise<{
    route: JupiterRoute | null;
    priceImpact: number;
    minimumReceived: number;
    fees: number;
    warning?: string;
  }> {
    const routes = await this.getQuote({
      inputMint: options.inputMint,
      outputMint: options.outputMint,
      amount: options.amount,
      dexes: options.preferredDexes,
      isPremium: options.isPremium,
    });

    if (routes.length === 0) {
      return {
        route: null,
        priceImpact: 0,
        minimumReceived: 0,
        fees: 0,
        warning: 'No routes available for this swap',
      };
    }

    const bestRoute = routes[0];
    const priceImpact = parseFloat(bestRoute.priceImpactPct);
    const maxImpact = options.maxPriceImpact || 5; // 5% default

    let warning: string | undefined;
    if (priceImpact > maxImpact) {
      warning = `High price impact: ${priceImpact.toFixed(2)}%`;
    }

    // Calculate fees from route plan
    const totalFees = bestRoute.routePlan.reduce((sum, step) => {
      return sum + parseFloat(step.swapInfo.feeAmount);
    }, 0);

    return {
      route: bestRoute,
      priceImpact,
      minimumReceived: parseFloat(bestRoute.otherAmountThreshold),
      fees: totalFees,
      warning,
    };
  }

  /**
   * Get DEX information and statistics
   */
  async getDexes(): Promise<Array<{
    id: string;
    name: string;
    fee: number;
    available: boolean;
  }>> {
    // This would be from a hypothetical endpoint
    // For now, return known Jupiter DEXes
    return [
      { id: 'Orca', name: 'Orca', fee: 0.003, available: true },
      { id: 'Raydium', name: 'Raydium', fee: 0.0025, available: true },
      { id: 'Serum', name: 'Serum', fee: 0.0022, available: true },
      { id: 'Saber', name: 'Saber', fee: 0.0004, available: true },
      { id: 'Aldrin', name: 'Aldrin', fee: 0.003, available: true },
      { id: 'Crema', name: 'Crema', fee: 0.003, available: true },
      { id: 'Lifinity', name: 'Lifinity', fee: 0.0, available: true },
      { id: 'Mercurial', name: 'Mercurial', fee: 0.0004, available: true },
      { id: 'Step', name: 'Step Finance', fee: 0.003, available: true },
      { id: 'Cropper', name: 'Cropper Finance', fee: 0.003, available: true },
    ];
  }

  /**
   * Get popular token pairs
   */
  async getPopularPairs(): Promise<Array<{
    inputMint: string;
    outputMint: string;
    inputSymbol: string;
    outputSymbol: string;
    volume24h: number;
    priceChange24h: number;
  }>> {
    // This would typically come from an API endpoint
    // For now, return common pairs
    return [
      {
        inputMint: JupiterService.COMMON_TOKENS.SOL,
        outputMint: JupiterService.COMMON_TOKENS.USDC,
        inputSymbol: 'SOL',
        outputSymbol: 'USDC',
        volume24h: 0,
        priceChange24h: 0,
      },
      {
        inputMint: JupiterService.COMMON_TOKENS.RAY,
        outputMint: JupiterService.COMMON_TOKENS.SOL,
        inputSymbol: 'RAY',
        outputSymbol: 'SOL',
        volume24h: 0,
        priceChange24h: 0,
      },
      {
        inputMint: JupiterService.COMMON_TOKENS.ORCA,
        outputMint: JupiterService.COMMON_TOKENS.SOL,
        inputSymbol: 'ORCA',
        outputSymbol: 'SOL',
        volume24h: 0,
        priceChange24h: 0,
      },
    ];
  }

  /**
   * Estimate optimal slippage based on liquidity
   */
  async estimateOptimalSlippage(options: {
    inputMint: string;
    outputMint: string;
    amount: number;
  }): Promise<{
    recommendedSlippage: number;
    minSlippage: number;
    maxSlippage: number;
    liquidityScore: 'high' | 'medium' | 'low';
  }> {
    try {
      // Test different slippage values to find optimal
      const slippageTests = [10, 50, 100, 300, 500]; // 0.1%, 0.5%, 1%, 3%, 5%
      const results = await Promise.allSettled(
        slippageTests.map(slippage =>
          this.getQuote({
            ...options,
            slippageBps: slippage,
          })
        )
      );

      let recommendedSlippage = 50; // 0.5% default
      let liquidityScore: 'high' | 'medium' | 'low' = 'medium';

      // Analyze results to determine optimal slippage
      const successfulQuotes = results
        .map((result, index) => ({
          slippage: slippageTests[index],
          success: result.status === 'fulfilled',
          routes: result.status === 'fulfilled' ? result.value.length : 0,
        }))
        .filter(r => r.success);

      if (successfulQuotes.length > 0) {
        // If low slippage works, liquidity is high
        if (successfulQuotes.some(q => q.slippage <= 10)) {
          liquidityScore = 'high';
          recommendedSlippage = 10;
        } else if (successfulQuotes.some(q => q.slippage <= 50)) {
          liquidityScore = 'medium';
          recommendedSlippage = 50;
        } else {
          liquidityScore = 'low';
          recommendedSlippage = 300;
        }
      }

      return {
        recommendedSlippage,
        minSlippage: 10,
        maxSlippage: 500,
        liquidityScore,
      };
    } catch (error) {
      logger.warn('Failed to estimate optimal slippage:', error);
      return {
        recommendedSlippage: 50,
        minSlippage: 10,
        maxSlippage: 500,
        liquidityScore: 'medium',
      };
    }
  }

  /**
   * Get token info by mint address
   */
  async getTokenInfo(mintAddress: string): Promise<SolanaToken | null> {
    const tokens = await this.getTokens();
    return tokens.find(token => token.address === mintAddress) || null;
  }

  /**
   * Search tokens by symbol or name
   */
  async searchTokens(query: string): Promise<SolanaToken[]> {
    const tokens = await this.getTokens();
    const queryLower = query.toLowerCase();
    
    return tokens.filter(token =>
      token.symbol.toLowerCase().includes(queryLower) ||
      token.name.toLowerCase().includes(queryLower)
    ).slice(0, 20);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Default instance
export const jupiterService = new JupiterService();

export default jupiterService;