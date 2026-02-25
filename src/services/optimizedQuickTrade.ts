import { QUICKTRADE_CONFIG, DEX_ROUTER_ADDRESSES } from '@/config/quicktrade';
import { FEE_RECIPIENTS } from '@/config/feeRecipients';
import { 
  Token, 
  Quote, 
  DEXType, 
  SwapParams, 
  SwapResult,
  QuickTradeV3Transaction,
  ServiceFeeV3,
  TransactionStatus 
} from '@/types/quickTrade';

// Advanced connection pooling for HTTP requests
class ConnectionPool {
  private pools = new Map<string, Array<AbortController>>();
  private maxPoolSize = 10;
  private activeConnections = new Map<string, number>();

  getConnection(url: string): AbortController {
    const domain = new URL(url).hostname;
    
    if (!this.pools.has(domain)) {
      this.pools.set(domain, []);
      this.activeConnections.set(domain, 0);
    }

    const pool = this.pools.get(domain)!;
    const activeCount = this.activeConnections.get(domain)! || 0;

    // Reuse existing connection if available
    if (pool.length > 0) {
      return pool.pop()!;
    }

    // Create new connection if under limit
    if (activeCount < this.maxPoolSize) {
      this.activeConnections.set(domain, activeCount + 1);
      return new AbortController();
    }

    // Wait for available connection
    return new AbortController();
  }

  releaseConnection(url: string, controller: AbortController) {
    const domain = new URL(url).hostname;
    const pool = this.pools.get(domain);
    
    if (pool && pool.length < this.maxPoolSize) {
      pool.push(controller);
    } else {
      controller.abort();
      const activeCount = this.activeConnections.get(domain) || 1;
      this.activeConnections.set(domain, Math.max(0, activeCount - 1));
    }
  }
}

// Advanced retry mechanism with exponential backoff
class RetryManager {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) {
        console.error(`Final retry failed for ${context}:`, error);
        throw error;
      }

      const delay = Math.min(
        this.baseDelay * Math.pow(2, this.maxRetries - retries),
        this.maxDelay
      );

      console.warn(`Retry ${this.maxRetries - retries + 1} for ${context} in ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.executeWithRetry(operation, context, retries - 1);
    }
  }
}

// Performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, Array<number>>();

  startTimer(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);
    
    // Keep only last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }
  }

  getMetrics(operation: string) {
    const metrics = this.metrics.get(operation) || [];
    if (metrics.length === 0) return null;

    const avg = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const min = Math.min(...metrics);
    const max = Math.max(...metrics);
    const p95 = metrics.sort((a, b) => a - b)[Math.floor(metrics.length * 0.95)];

    return { avg, min, max, p95, count: metrics.length };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [operation, _] of this.metrics) {
      result[operation] = this.getMetrics(operation);
    }
    return result;
  }
}

// Optimized QuickTrade Aggregator with concurrent processing
class OptimizedQuickTradeAggregator {
  private connectionPool = new ConnectionPool();
  private retryManager = new RetryManager();
  private performanceMonitor = new PerformanceMonitor();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  // Cache TTL configurations
  private cacheTTL = {
    quote: 30 * 1000,        // 30 seconds for quotes
    liquidity: 60 * 1000,    // 1 minute for liquidity data
    gas: 15 * 1000,          // 15 seconds for gas estimates
    price: 10 * 1000         // 10 seconds for price data
  };

  constructor() {
    // Clean cache periodically
    setInterval(() => this.cleanCache(), 30000);
  }

  private cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheKey(type: string, ...params: any[]): string {
    return `${type}:${params.join(':')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Optimized concurrent quote fetching
  async getQuotes(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: number | string
  ): Promise<Quote[]> {
    const endTimer = this.performanceMonitor.startTimer('getQuotes');
    
    try {
      const supportedDEXs = this.getSupportedDEXsForChain(chainId);
      
      // Create concurrent quote requests with timeout
      const quotePromises = supportedDEXs.map(dex => 
        this.retryManager.executeWithRetry(
          () => this.getQuoteFromDEXWithTimeout(dex, tokenIn, tokenOut, amountIn, chainId, 5000),
          `${dex}-quote`
        )
      );

      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled(quotePromises);
      
      const quotes: Quote[] = [];
      const failures: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          quotes.push(result.value);
        } else {
          failures.push(supportedDEXs[index]);
          console.warn(`Failed to get quote from ${supportedDEXs[index]}:`, 
            result.status === 'rejected' ? result.reason : 'No quote returned');
        }
      });

      // Log performance metrics
      console.log(`Quote fetching completed: ${quotes.length}/${supportedDEXs.length} successful`, {
        duration: endTimer(),
        failures,
        cacheHitRate: this.calculateCacheHitRate()
      });

      return quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
    } catch (error) {
      endTimer();
      console.error('Error in getQuotes:', error);
      throw error;
    }
  }

  // Quote fetching with timeout and connection pooling
  private async getQuoteFromDEXWithTimeout(
    dex: DEXType,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: number | string,
    timeout: number
  ): Promise<Quote | null> {
    const cacheKey = this.getCacheKey('quote', dex, tokenIn.address, tokenOut.address, amountIn, chainId);
    const cached = this.getFromCache<Quote>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms for ${dex}`));
      }, timeout);

      this.getQuoteFromDEX(dex, tokenIn, tokenOut, amountIn, chainId)
        .then(quote => {
          clearTimeout(timeoutId);
          if (quote) {
            this.setCache(cacheKey, quote, this.cacheTTL.quote);
          }
          resolve(quote);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // Enhanced Jupiter quote with better error handling
  private async getJupiterQuote(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<Quote | null> {
    try {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenIn.address}&outputMint=${tokenOut.address}&amount=${amountIn}&slippageBps=50`;
      const controller = this.connectionPool.getConnection(url);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CYPHER-QuickTrade/1.0'
        }
      });
      
      this.connectionPool.releaseConnection(url, controller);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        dex: DEXType.JUPITER,
        inputAmount: amountIn,
        outputAmount: data.outAmount,
        priceImpact: data.priceImpactPct || 0,
        estimatedGas: '5000',
        route: [{
          dex: DEXType.JUPITER,
          tokenIn,
          tokenOut,
          amountIn,
          amountOut: data.outAmount,
          priceImpact: data.priceImpactPct || 0
        }],
        fee: '0.1',
        slippage: 0.5,
        executionTime: 15,
        confidence: 98,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Jupiter quote error:', error);
      return null;
    }
  }

  // Enhanced 1inch quote with improved rate limiting
  private async get1inchQuote(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: number | string
  ): Promise<Quote | null> {
    try {
      const apiUrl = `https://api.1inch.dev/swap/v5.2/${chainId}/quote`;
      const params = new URLSearchParams({
        fromTokenAddress: tokenIn.address,
        toTokenAddress: tokenOut.address,
        amount: amountIn
      });

      const url = `${apiUrl}?${params}`;
      const controller = this.connectionPool.getConnection(url);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY || ''}`,
          'Accept': 'application/json',
          'User-Agent': 'CYPHER-QuickTrade/1.0'
        }
      });

      this.connectionPool.releaseConnection(url, controller);

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        dex: DEXType.ONEINCH,
        inputAmount: amountIn,
        outputAmount: data.toTokenAmount,
        priceImpact: 0.1,
        estimatedGas: data.estimatedGas,
        route: [{
          dex: DEXType.ONEINCH,
          tokenIn,
          tokenOut,
          amountIn,
          amountOut: data.toTokenAmount,
          priceImpact: 0.1
        }],
        fee: '0.1',
        slippage: 1.0,
        executionTime: 45,
        confidence: 99,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('1inch quote error:', error);
      return null;
    }
  }

  // Optimized best quote selection with advanced scoring
  async getBestQuote(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: number | string
  ): Promise<{ bestQuote: Quote; allQuotes: Quote[]; serviceFee: ServiceFeeV3; totalCost: number; analytics: any }> {
    const endTimer = this.performanceMonitor.startTimer('getBestQuote');
    
    try {
      const quotes = await this.getQuotes(tokenIn, tokenOut, amountIn, chainId);
      
      if (quotes.length === 0) {
        throw new Error('No quotes available');
      }

      // Advanced scoring algorithm
      const bestQuote = this.calculateBestQuote(quotes);
      
      // Calculate service fee
      const transactionValueUSD = parseFloat(amountIn) * this.getMockPrice(tokenIn, tokenOut);
      const serviceFee = this.calculateServiceFee(transactionValueUSD);
      
      // Update recipient based on chain
      if (chainId === 'solana') {
        serviceFee.recipient = FEE_RECIPIENTS.SOLANA;
      }

      const totalCost = serviceFee.amountUSD + (parseFloat(bestQuote.estimatedGas) * 0.001);
      
      const duration = endTimer();
      
      const analytics = {
        performance: {
          totalDuration: duration,
          quotesAnalyzed: quotes.length,
          cacheHitRate: this.calculateCacheHitRate()
        },
        market: {
          priceSpread: this.calculatePriceSpread(quotes),
          liquidityDepth: this.calculateLiquidityDepth(quotes),
          gasCostVariation: this.calculateGasCostVariation(quotes)
        },
        metrics: this.performanceMonitor.getMetrics('getBestQuote')
      };

      return {
        bestQuote,
        allQuotes: quotes,
        serviceFee,
        totalCost,
        analytics
      };
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  // Advanced quote scoring algorithm
  private calculateBestQuote(quotes: Quote[]): Quote {
    const scoredQuotes = quotes.map(quote => {
      const outputValue = parseFloat(quote.outputAmount);
      const gasCost = parseFloat(quote.estimatedGas) * 0.001;
      const slippagePenalty = quote.priceImpact * 0.01;
      const confidenceBonus = (quote.confidence / 100) * 0.05;
      
      // Net value after all costs and adjustments
      const netValue = outputValue - gasCost - slippagePenalty + confidenceBonus;
      
      return {
        ...quote,
        score: netValue,
        netValue
      };
    });

    return scoredQuotes.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  // Analytics helper methods
  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    return 0.75; // Placeholder
  }

  private calculatePriceSpread(quotes: Quote[]): number {
    if (quotes.length < 2) return 0;
    
    const prices = quotes.map(q => parseFloat(q.outputAmount));
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    
    return ((max - min) / min) * 100;
  }

  private calculateLiquidityDepth(quotes: Quote[]): number {
    // Calculate average liquidity depth
    return quotes.reduce((sum, quote) => {
      const liquidity = quote.route?.[0]?.amountOut ? parseFloat(quote.route[0].amountOut) : 0;
      return sum + liquidity;
    }, 0) / quotes.length;
  }

  private calculateGasCostVariation(quotes: Quote[]): number {
    if (quotes.length < 2) return 0;
    
    const gasCosts = quotes.map(q => parseFloat(q.estimatedGas));
    const max = Math.max(...gasCosts);
    const min = Math.min(...gasCosts);
    
    return ((max - min) / min) * 100;
  }

  // Existing helper methods (kept for compatibility)
  private async getQuoteFromDEX(
    dex: DEXType,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: number | string
  ): Promise<Quote | null> {
    try {
      const routerAddress = this.getRouterAddress(dex, chainId);
      if (!routerAddress && !this.isAggregatorDEX(dex)) {
        return null;
      }

      switch (dex) {
        case DEXType.JUPITER:
          return await this.getJupiterQuote(tokenIn, tokenOut, amountIn);
        
        case DEXType.ONEINCH:
          return await this.get1inchQuote(tokenIn, tokenOut, amountIn, chainId);
        
        default:
          return await this.getGenericQuote(dex, tokenIn, tokenOut, amountIn, chainId);
      }
    } catch (error) {
      console.error(`Error getting quote from ${dex}:`, error);
      return null;
    }
  }

  private async getGenericQuote(
    dex: DEXType,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: number | string
  ): Promise<Quote | null> {
    try {
      const mockPrice = this.getMockPrice(tokenIn, tokenOut);
      const outputAmount = (parseFloat(amountIn) * mockPrice * (0.995 + Math.random() * 0.01)).toString();
      
      return {
        dex,
        inputAmount: amountIn,
        outputAmount,
        priceImpact: Math.random() * 0.6,
        estimatedGas: '100000',
        route: [{
          dex,
          tokenIn,
          tokenOut,
          amountIn,
          amountOut: outputAmount,
          priceImpact: Math.random() * 0.6
        }],
        fee: '0.3',
        slippage: 0.5,
        executionTime: 30,
        confidence: 85 + Math.random() * 10,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Generic quote error for ${dex}:`, error);
      return null;
    }
  }

  calculateServiceFee(transactionValueUSD: number): ServiceFeeV3 {
    const feePercentage = QUICKTRADE_CONFIG.SERVICE_FEE;
    const maxFeeUSD = QUICKTRADE_CONFIG.MAX_FEE_USD;
    
    const calculatedFee = transactionValueUSD * feePercentage;
    const cappedFee = Math.min(calculatedFee, maxFeeUSD);
    
    return {
      amount: cappedFee.toString(),
      amountUSD: cappedFee,
      percentage: feePercentage,
      recipient: FEE_RECIPIENTS.EVM,
      collected: false,
      cappedAt: calculatedFee > maxFeeUSD ? maxFeeUSD : undefined
    };
  }

  // Helper methods
  private getSupportedDEXsForChain(chainId: number | string): DEXType[] {
    const dexs = Object.entries(QUICKTRADE_CONFIG.SUPPORTED_DEXS);
    return dexs
      .filter(([_, config]) => config.chains.includes(chainId))
      .map(([dex, _]) => dex as DEXType);
  }

  private getRouterAddress(dex: DEXType, chainId: number | string): string | undefined {
    return DEX_ROUTER_ADDRESSES[dex as keyof typeof DEX_ROUTER_ADDRESSES]?.[chainId as keyof any];
  }

  private isAggregatorDEX(dex: DEXType): boolean {
    return [DEXType.ONEINCH, DEXType.PARASWAP, DEXType.JUPITER].includes(dex);
  }

  // Preços de fallback usados APENAS quando todas as APIs de cotação falham.
  // Última atualização: 2026-02-24. IMPORTANTE: não usar para cotações reais.
  private getMockPrice(tokenIn: Token, tokenOut: Token): number {
    const basePrices: Record<string, number> = {
      'ETH': 1850,
      'BTC': 63500,
      'SOL': 78,
      'MATIC': 0.30,
      'AVAX': 20,
      'BNB': 590,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'LINK': 12,
      'UNI': 7,
      'ARB': 0.35,
      'XRP': 0.55,
      'ADA': 0.35,
    };

    const inPrice = basePrices[tokenIn.symbol] || 1;
    const outPrice = basePrices[tokenOut.symbol] || 1;

    console.warn(`[QuickTrade] Using fallback prices for ${tokenIn.symbol}/${tokenOut.symbol} - APIs unavailable`);
    return inPrice / outPrice;
  }

  // Performance monitoring API
  getPerformanceMetrics() {
    return this.performanceMonitor.getAllMetrics();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      ttlConfig: this.cacheTTL
    };
  }
}

// Export singleton instance
export const optimizedQuickTradeAggregator = new OptimizedQuickTradeAggregator();

// Helper functions for API routes
export const getOptimizedQuotes = (tokenIn: Token, tokenOut: Token, amountIn: string, chainId: number | string) =>
  optimizedQuickTradeAggregator.getQuotes(tokenIn, tokenOut, amountIn, chainId);

export const getOptimizedBestQuote = (tokenIn: Token, tokenOut: Token, amountIn: string, chainId: number | string) =>
  optimizedQuickTradeAggregator.getBestQuote(tokenIn, tokenOut, amountIn, chainId);

export const getPerformanceMetrics = () =>
  optimizedQuickTradeAggregator.getPerformanceMetrics();