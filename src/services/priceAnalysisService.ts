/**
 * Price Analysis Service for CYPHER TRADE
 * Version: 1.0.0
 * 
 * Handles price comparison across multiple DEXs and chains,
 * real-time price fetching, and market analysis.
 */

import {
  Token,
  DEXType,
  Quote
} from '../types/quickTrade';
import {
  PriceQuote,
  AggregatedQuote,
  DEXHealth,
  MarketConditions,
  SMART_ROUTING_CONSTANTS
} from '../types/smartRouting';

interface PriceSource {
  name: string;
  endpoint: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  timeout: number; // milliseconds
}

export class PriceAnalysisService {
  private priceCache: Map<string, AggregatedQuote> = new Map();
  private dexHealthStatus: Map<string, DEXHealth> = new Map();
  private failoverSources: PriceSource[] = [];

  constructor() {
    this.initializePriceSources();
    this.startHealthMonitoring();
  }

  /**
   * Get aggregated quotes from all available DEXs
   */
  async getAggregatedQuotes(
    tokenIn: Token,
    tokenOut: Token,
    amount: string,
    enabledDEXs: DEXType[]
  ): Promise<AggregatedQuote> {
    const cacheKey = this.getCacheKey(tokenIn, tokenOut, amount);
    const cached = this.priceCache.get(cacheKey);

    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < SMART_ROUTING_CONSTANTS.CACHE_TTL) {
      return cached;
    }

    const quotes: PriceQuote[] = [];
    const promises = enabledDEXs.map(dex => 
      this.getQuoteFromDEX(dex, tokenIn, tokenOut, amount)
    );

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      } else {
      }
    });

    if (quotes.length === 0) {
      throw new Error('No valid quotes available from any DEX');
    }

    const aggregated = this.aggregateQuotes(tokenIn, tokenOut, quotes);
    
    // Cache the result
    this.priceCache.set(cacheKey, aggregated);
    
    return aggregated;
  }

  /**
   * Get quote from a specific DEX
   */
  private async getQuoteFromDEX(
    dex: DEXType,
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<PriceQuote | null> {
    const startTime = Date.now();

    try {
      // Check DEX health first
      if (!await this.isDEXHealthy(dex, tokenIn.chainId)) {
        throw new Error(`DEX ${dex} is not healthy`);
      }

      let quote: any;

      switch (dex) {
        case DEXType.UNISWAP_V2:
        case DEXType.UNISWAP_V3:
          quote = await this.getUniswapQuote(dex, tokenIn, tokenOut, amount);
          break;
        
        case DEXType.SUSHISWAP:
          quote = await this.getSushiswapQuote(tokenIn, tokenOut, amount);
          break;
        
        case DEXType.PANCAKESWAP:
          quote = await this.getPancakeswapQuote(tokenIn, tokenOut, amount);
          break;
        
        case DEXType.JUPITER:
          quote = await this.getJupiterQuote(tokenIn, tokenOut, amount);
          break;
        
        case DEXType.ORCA:
          quote = await this.getOrcaQuote(tokenIn, tokenOut, amount);
          break;
        
        case DEXType.CURVE:
          quote = await this.getCurveQuote(tokenIn, tokenOut, amount);
          break;
        
        case DEXType.BALANCER:
          quote = await this.getBalancerQuote(tokenIn, tokenOut, amount);
          break;
        
        case DEXType.ONEINCH:
          quote = await this.getOneInchQuote(tokenIn, tokenOut, amount);
          break;
        
        default:
          throw new Error(`Unsupported DEX: ${dex}`);
      }

      if (!quote || !quote.amountOut) {
        throw new Error(`Invalid quote received from ${dex}`);
      }

      const responseTime = Date.now() - startTime;
      const price = parseFloat(quote.amountOut) / parseFloat(amount);
      const priceUSD = price * await this.getTokenPriceUSD(tokenOut);

      // Update DEX health metrics
      this.updateDEXHealth(dex, tokenIn.chainId, true, responseTime);

      return {
        dex,
        chainId: tokenIn.chainId,
        tokenIn,
        tokenOut,
        amountIn: amount,
        amountOut: quote.amountOut,
        price,
        priceUSD,
        timestamp: Date.now(),
        source: 'api',
        confidence: this.calculateQuoteConfidence(quote, responseTime),
        isStale: false
      };

    } catch (error) {
      console.error(`Error getting quote from ${dex}:`, error);
      
      // Update DEX health metrics for failure
      this.updateDEXHealth(dex, tokenIn.chainId, false, Date.now() - startTime);
      
      // Try to get cached/fallback price
      return await this.getFallbackQuote(dex, tokenIn, tokenOut, amount);
    }
  }

  /**
   * Aggregate multiple quotes into a single response
   */
  private aggregateQuotes(
    tokenIn: Token,
    tokenOut: Token,
    quotes: PriceQuote[]
  ): AggregatedQuote {
    if (quotes.length === 0) {
      throw new Error('No quotes to aggregate');
    }

    // Sort quotes by price (best first)
    quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut));

    const bestQuote = quotes[0];
    const worstQuote = quotes[quotes.length - 1];
    
    const totalPrice = quotes.reduce((sum, quote) => sum + quote.price, 0);
    const averagePrice = totalPrice / quotes.length;
    
    const bestPrice = parseFloat(bestQuote.amountOut);
    const worstPrice = parseFloat(worstQuote.amountOut);
    const priceSpread = ((bestPrice - worstPrice) / worstPrice) * 100;

    const validQuotes = quotes.filter(quote => !quote.isStale && quote.confidence > 70).length;

    return {
      tokenPair: `${tokenIn.symbol}-${tokenOut.symbol}`,
      quotes,
      bestQuote,
      worstQuote,
      averagePrice,
      priceSpread,
      timestamp: Date.now(),
      quotesCount: quotes.length,
      validQuotes
    };
  }

  /**
   * Get market conditions and volatility data
   */
  async getMarketConditions(
    tokenIn: Token,
    tokenOut: Token
  ): Promise<MarketConditions> {
    try {
      // Get 24h price and volume data
      const [tokenInData, tokenOutData] = await Promise.all([
        this.getToken24hData(tokenIn),
        this.getToken24hData(tokenOut)
      ]);

      const avgVolatility = (tokenInData.volatility + tokenOutData.volatility) / 2;
      const totalVolume = tokenInData.volume24h + tokenOutData.volume24h;
      
      // Determine trend based on price movements
      const avgPriceChange = (tokenInData.priceChange24h + tokenOutData.priceChange24h) / 2;
      let trend: 'bullish' | 'bearish' | 'sideways' = 'sideways';
      
      if (avgPriceChange > 5) trend = 'bullish';
      else if (avgPriceChange < -5) trend = 'bearish';

      // Get network congestion data
      const networkCongestion = await this.getNetworkCongestion(tokenIn.chainId);
      const gasPriceLevel = await this.getGasPriceLevel(tokenIn.chainId);

      return {
        volatility: avgVolatility,
        volume24h: totalVolume,
        trend,
        liquidityTrend: this.determineLiquidityTrend(tokenInData, tokenOutData),
        gasPriceLevel,
        networkCongestion
      };

    } catch (error) {
      console.error('Error getting market conditions:', error);
      
      // Return default/safe market conditions
      return {
        volatility: 0.15, // 15% default volatility
        volume24h: 1000000,
        trend: 'sideways',
        liquidityTrend: 'stable',
        gasPriceLevel: 'medium',
        networkCongestion: 50
      };
    }
  }

  /**
   * Calculate price impact for a trade
   */
  async calculatePriceImpact(
    tokenIn: Token,
    tokenOut: Token,
    amount: string,
    dex: DEXType
  ): Promise<number> {
    try {
      // Get current price for small amount
      const smallAmount = (parseFloat(amount) * 0.01).toString(); // 1% of trade size
      const smallQuote = await this.getQuoteFromDEX(dex, tokenIn, tokenOut, smallAmount);
      
      // Get price for full amount
      const fullQuote = await this.getQuoteFromDEX(dex, tokenIn, tokenOut, amount);

      if (!smallQuote || !fullQuote) {
        return 0.05; // Default 5% price impact if can't calculate
      }

      const smallPrice = parseFloat(smallQuote.amountOut) / parseFloat(smallAmount);
      const fullPrice = parseFloat(fullQuote.amountOut) / parseFloat(amount);

      const priceImpact = Math.abs((fullPrice - smallPrice) / smallPrice);
      
      return Math.min(priceImpact, 1.0); // Cap at 100%

    } catch (error) {
      console.error('Error calculating price impact:', error);
      return 0.05; // Default 5% price impact
    }
  }

  /**
   * Get historical price data for volatility calculation
   */
  async getHistoricalVolatility(
    token: Token,
    hours: number = 24
  ): Promise<number> {
    try {
      // Implementation would fetch historical price data
      // For now, return a calculated volatility based on token type
      
      // Stablecoins have low volatility
      if (this.isStablecoin(token)) {
        return 0.005; // 0.5%
      }
      
      // Major tokens (BTC, ETH) have medium volatility
      if (['BTC', 'ETH', 'WBTC', 'WETH'].includes(token.symbol)) {
        return 0.15; // 15%
      }
      
      // Alt coins have higher volatility
      return 0.3; // 30%

    } catch (error) {
      console.error('Error getting historical volatility:', error);
      return 0.2; // Default 20% volatility
    }
  }

  // DEX-specific quote methods
  private async getUniswapQuote(
    version: DEXType,
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for Uniswap V2/V3 quotes
    const endpoint = version === DEXType.UNISWAP_V3 
      ? 'https://api.uniswap.org/v1/quote'
      : 'https://api.uniswap.org/v2/quote';
      
    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amount,
      chainId: tokenIn.chainId
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getSushiswapQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for SushiSwap quotes
    const endpoint = 'https://api.sushi.com/swap/v4/quote';
    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amount,
      chainId: tokenIn.chainId
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getPancakeswapQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for PancakeSwap quotes
    const endpoint = 'https://api.pancakeswap.info/api/v2/quote';
    const params = {
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amount
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getJupiterQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for Jupiter (Solana) quotes
    const endpoint = 'https://api.jup.ag/v6/quote';
    const params = {
      inputMint: tokenIn.address,
      outputMint: tokenOut.address,
      amount,
      slippageBps: 50
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getOrcaQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for Orca quotes
    const endpoint = 'https://api.orca.so/v1/quote';
    const params = {
      inputToken: tokenIn.address,
      outputToken: tokenOut.address,
      amount
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getCurveQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for Curve quotes
    const endpoint = 'https://api.curve.fi/api/getQuote';
    const params = {
      fromToken: tokenIn.address,
      toToken: tokenOut.address,
      amount,
      chainId: tokenIn.chainId
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getBalancerQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for Balancer quotes
    const endpoint = 'https://api.balancer.fi/sor/quote';
    const params = {
      sellToken: tokenIn.address,
      buyToken: tokenOut.address,
      orderKind: 'sell',
      amount,
      chainId: tokenIn.chainId
    };

    return this.makeAPIRequest(endpoint, params);
  }

  private async getOneInchQuote(
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<any> {
    // Implementation for 1inch quotes
    const endpoint = `https://api.1inch.io/v5.0/${tokenIn.chainId}/quote`;
    const params = {
      fromTokenAddress: tokenIn.address,
      toTokenAddress: tokenOut.address,
      amount
    };

    return this.makeAPIRequest(endpoint, params);
  }

  // Helper methods
  private async makeAPIRequest(endpoint: string, params: any): Promise<any> {
    const url = new URL(endpoint);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      timeout: SMART_ROUTING_CONSTANTS.API_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CypherTrade/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async isDEXHealthy(dex: DEXType, chainId: number): Promise<boolean> {
    const key = `${dex}-${chainId}`;
    const health = this.dexHealthStatus.get(key);
    
    if (!health) return true; // Assume healthy if no data
    
    return health.isOnline && 
           health.successRate > 80 && 
           health.responseTime < 10000; // 10 seconds max
  }

  private updateDEXHealth(
    dex: DEXType,
    chainId: number,
    success: boolean,
    responseTime: number
  ): void {
    const key = `${dex}-${chainId}`;
    const existing = this.dexHealthStatus.get(key);
    
    if (existing) {
      // Update existing health metrics
      const totalRequests = existing.successRate * 100; // Rough calculation
      const successCount = success ? totalRequests + 1 : totalRequests;
      const newTotal = totalRequests + 1;
      
      existing.successRate = (successCount / newTotal) * 100;
      existing.responseTime = (existing.responseTime + responseTime) / 2;
      existing.isOnline = success;
      existing.lastCheck = Date.now();
      existing.apiStatus = success ? 'operational' : 'degraded';
    } else {
      // Create new health record
      this.dexHealthStatus.set(key, {
        dex,
        chainId,
        isOnline: success,
        responseTime,
        successRate: success ? 100 : 0,
        lastCheck: Date.now(),
        apiStatus: success ? 'operational' : 'down',
        liquidityStatus: 'medium',
        errors: []
      });
    }
  }

  private calculateQuoteConfidence(quote: any, responseTime: number): number {
    let confidence = 100;
    
    // Reduce confidence for slow responses
    if (responseTime > 5000) confidence -= 20;
    if (responseTime > 10000) confidence -= 30;
    
    // Reduce confidence for old quotes
    const age = Date.now() - (quote.timestamp || Date.now());
    if (age > 30000) confidence -= 25; // 30 seconds
    if (age > 60000) confidence -= 50; // 1 minute
    
    return Math.max(confidence, 10); // Minimum 10% confidence
  }

  private async getFallbackQuote(
    dex: DEXType,
    tokenIn: Token,
    tokenOut: Token,
    amount: string
  ): Promise<PriceQuote | null> {
    // Try to get cached quote or use alternative price source
    const cacheKey = this.getCacheKey(tokenIn, tokenOut, amount);
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && cached.quotes.length > 0) {
      // Find a quote from this DEX if available
      const dexQuote = cached.quotes.find(q => q.dex === dex);
      if (dexQuote) {
        return { ...dexQuote, isStale: true, confidence: 50 };
      }
    }
    
    return null;
  }

  private getCacheKey(tokenIn: Token, tokenOut: Token, amount: string): string {
    return `${tokenIn.address}-${tokenOut.address}-${amount}-${tokenIn.chainId}`;
  }

  private async getTokenPriceUSD(token: Token): Promise<number> {
    // Implementation to get token price in USD
    // This would integrate with price APIs
    return 2000; // Placeholder
  }

  private async getToken24hData(token: Token): Promise<any> {
    // Implementation to get 24h token data
    return {
      volatility: 0.15,
      volume24h: 1000000,
      priceChange24h: 2.5
    };
  }

  private async getNetworkCongestion(chainId: number): Promise<number> {
    // Implementation to get network congestion
    return 50; // Placeholder: 50% congestion
  }

  private async getGasPriceLevel(chainId: number): Promise<'low' | 'medium' | 'high'> {
    // Implementation to get gas price level
    return 'medium'; // Placeholder
  }

  private determineLiquidityTrend(tokenInData: any, tokenOutData: any): 'increasing' | 'decreasing' | 'stable' {
    // Implementation to determine liquidity trend
    return 'stable'; // Placeholder
  }

  private isStablecoin(token: Token): boolean {
    const stableSymbols = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD', 'UST'];
    return stableSymbols.includes(token.symbol.toUpperCase());
  }

  private initializePriceSources(): void {
    this.failoverSources = [
      {
        name: 'CoinGecko',
        endpoint: 'https://api.coingecko.com/api/v3',
        rateLimit: 50,
        timeout: 5000
      },
      {
        name: 'CoinMarketCap',
        endpoint: 'https://pro-api.coinmarketcap.com/v1',
        apiKey: process.env.CMC_API_KEY,
        rateLimit: 333,
        timeout: 5000
      }
    ];
  }

  private startHealthMonitoring(): void {
    // Start periodic health checks for all DEXs
    setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Every minute
  }

  private async performHealthChecks(): void {
    // Implementation for periodic health checks
    // This would ping DEX APIs to check their status
  }
}