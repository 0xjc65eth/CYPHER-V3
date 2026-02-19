/**
 * Smart Routing Engine for CYPHER TRADE
 * Version: 1.0.0
 * 
 * Intelligent routing system that analyzes prices across DEXs,
 * calculates fees, optimizes routes, and handles cross-chain swaps.
 */

import {
  SmartRoute,
  SmartRoutingConfig,
  RouteComparison,
  FeeBreakdown,
  SlippageAnalysis,
  LiquidityValidation,
  CrossChainRoute,
  SmartRoutingResponse,
  RoutingError,
  FallbackStrategy,
  MinimumValueCheck,
  DEXHealth,
  PriceQuote,
  AggregatedQuote,
  RouteRanking,
  RouteAnalysis,
  RiskAssessment,
  MarketConditions,
  SMART_ROUTING_CONSTANTS
} from '../types/smartRouting';
import {
  Token,
  DEXType,
  Quote,
  RouteStep,
  SwapParams
} from '../types/quickTrade';
import { QUICKTRADE_CONFIG } from '../config/quicktrade';

export class SmartRoutingEngine {
  private config: SmartRoutingConfig;
  private dexHealthCache: Map<string, DEXHealth> = new Map();
  private priceCache: Map<string, AggregatedQuote> = new Map();
  private performanceCache: Map<string, number> = new Map();

  constructor(config: SmartRoutingConfig) {
    this.config = {
      ...config,
      cypherFeeRate: 0.003, // Fixed 0.3% fee (30 bps)
      maxFeeUSD: 100
    };
  }

  /**
   * Main function to find the best route for a swap
   */
  async findBestRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    userAddress: string
  ): Promise<SmartRoutingResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate minimum value
      const minimumValueCheck = await this.validateMinimumValue(
        amount,
        fromToken,
        await this.getTokenPrice(fromToken)
      );

      if (!minimumValueCheck.isValid) {
        return {
          success: false,
          error: {
            type: 'unknown',
            message: `Transaction amount below minimum: $${minimumValueCheck.requiredMinimumUSD}`,
            retryable: false,
            fallbackAvailable: false,
            timestamp: Date.now()
          },
          timestamp: Date.now(),
          executionTime: Date.now() - startTime
        };
      }

      // 2. Get all possible routes
      const routes = await this.getAllRoutes(fromToken, toToken, amount, userAddress);

      if (routes.length === 0) {
        return {
          success: false,
          error: {
            type: 'liquidity',
            message: 'No valid routes found',
            retryable: true,
            fallbackAvailable: false,
            timestamp: Date.now()
          },
          timestamp: Date.now(),
          executionTime: Date.now() - startTime
        };
      }

      // 3. Analyze and compare routes
      const comparison = await this.compareRoutes(routes);

      // 4. Validate best route
      const bestRoute = comparison.bestRoute;
      const liquidityValidation = await this.validateLiquidity(bestRoute);

      if (!liquidityValidation.isValid) {
        // Try fallback strategy
        const fallback = await this.createFallbackStrategy(routes, bestRoute);
        if (fallback.fallbackRoutes.length > 0) {
          return {
            success: true,
            data: {
              comparison,
              bestRoute: fallback.fallbackRoutes[0],
              allRoutes: routes,
              minimumValueCheck
            },
            fallback,
            timestamp: Date.now(),
            executionTime: Date.now() - startTime
          };
        }
      }

      return {
        success: true,
        data: {
          comparison,
          bestRoute,
          allRoutes: routes,
          minimumValueCheck
        },
        timestamp: Date.now(),
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
          fallbackAvailable: true,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate comprehensive fees including Cypher's 0.34% fee
   */
  async calculateFees(route: SmartRoute, amount: string): Promise<FeeBreakdown> {
    const amountNum = parseFloat(amount);
    const tokenPrice = await this.getTokenPrice(route.tokenIn);
    const amountUSD = amountNum * tokenPrice;

    // Cypher fee calculation (0.34%)
    const cypherFeeAmount = amountNum * this.config.cypherFeeRate;
    const cypherFeeUSD = cypherFeeAmount * tokenPrice;

    // Apply fee cap
    const cappedCypherFeeUSD = Math.min(cypherFeeUSD, this.config.maxFeeUSD);
    const cappedCypherFeeAmount = cappedCypherFeeUSD / tokenPrice;

    // DEX fees
    const dexFees = await Promise.all(
      route.steps.map(async (step) => {
        const dexConfig = this.getDEXConfig(step.dex);
        const stepAmountUSD = parseFloat(step.amountIn) * await this.getTokenPrice(step.tokenIn);
        const feePercentage = dexConfig.feeNumerator / 10000; // Convert basis points to percentage
        const feeUSD = stepAmountUSD * feePercentage;

        return {
          dex: step.dex,
          amount: (parseFloat(step.amountIn) * feePercentage).toString(),
          amountUSD: feeUSD,
          percentage: feePercentage
        };
      })
    );

    // Gas fees
    const gasFees = await this.estimateGasCosts(route);

    // Bridge fees (if cross-chain)
    const bridgeFees = route.crossChain 
      ? await this.estimateBridgeFees(route.crossChain)
      : undefined;

    const totalDexFeesUSD = dexFees.reduce((sum, fee) => sum + fee.amountUSD, 0);
    const totalBridgeFeesUSD = bridgeFees?.amountUSD || 0;
    const totalFeeUSD = cappedCypherFeeUSD + totalDexFeesUSD + gasFees.gasCostUSD + totalBridgeFeesUSD;
    const totalFeePercentage = (totalFeeUSD / amountUSD) * 100;

    return {
      cypherFee: {
        amount: cappedCypherFeeAmount.toString(),
        amountUSD: cappedCypherFeeUSD,
        percentage: this.config.cypherFeeRate,
        recipient: this.getCypherFeeRecipient(route.tokenIn.chainId)
      },
      dexFees,
      gasFees,
      bridgeFees,
      totalFeeUSD,
      totalFeePercentage
    };
  }

  /**
   * Validate minimum transaction value
   */
  async validateMinimumValue(
    amount: string,
    token: Token,
    tokenPrice: number
  ): Promise<MinimumValueCheck> {
    const amountNum = parseFloat(amount);
    const amountUSD = amountNum * tokenPrice;
    const requiredMinimumUSD = SMART_ROUTING_CONSTANTS.MIN_TRANSACTION_USD;

    const isValid = amountUSD >= requiredMinimumUSD;

    if (!isValid) {
      const suggestedAmount = requiredMinimumUSD / tokenPrice;
      return {
        isValid: false,
        requiredMinimumUSD,
        providedAmountUSD: amountUSD,
        tokenPrice,
        reason: `Minimum transaction value is $${requiredMinimumUSD}. Provided: $${amountUSD.toFixed(2)}`,
        suggestions: [
          `Increase amount to at least ${suggestedAmount.toFixed(6)} ${token.symbol}`,
          `Current rate: 1 ${token.symbol} = $${tokenPrice.toFixed(2)}`
        ]
      };
    }

    return {
      isValid: true,
      requiredMinimumUSD,
      providedAmountUSD: amountUSD,
      tokenPrice
    };
  }

  /**
   * Estimate slippage for a given route
   */
  async estimateSlippage(route: SmartRoute, amount: string): Promise<SlippageAnalysis> {
    const liquidityData = await this.getLiquidityData(route);
    const historicalData = await this.getHistoricalSlippage(route.tokenIn, route.tokenOut);
    const amountNum = parseFloat(amount);

    // Calculate price impact based on liquidity depth
    const priceImpact = this.calculatePriceImpact(amountNum, liquidityData.totalLiquidity);
    
    // Estimate slippage based on various factors
    const baseSlippage = Math.max(0.001, priceImpact * 0.5); // Minimum 0.1% base slippage
    const volatilityAdjustment = await this.getVolatilityAdjustment(route.tokenIn, route.tokenOut);
    const liquidityAdjustment = this.getLiquidityAdjustment(liquidityData.utilization);

    const expectedSlippage = baseSlippage + volatilityAdjustment + liquidityAdjustment;
    const maxSlippage = Math.min(expectedSlippage * 2, this.config.maxSlippage);

    return {
      expected: expectedSlippage,
      maximum: maxSlippage,
      priceImpact,
      liquidityDepth: liquidityData.totalLiquidity,
      confidenceLevel: this.calculateSlippageConfidence(liquidityData, historicalData),
      historicalAverage: historicalData.averageSlippage
    };
  }

  /**
   * Validate liquidity for a route
   */
  private async validateLiquidity(route: SmartRoute): Promise<LiquidityValidation> {
    const liquidityData = await this.getLiquidityData(route);
    const requiredLiquidity = parseFloat(route.amountIn) * 2; // 2x buffer
    const isValid = liquidityData.totalLiquidity >= requiredLiquidity;

    const warnings = [];
    const recommendations = [];

    if (!isValid) {
      warnings.push('Insufficient liquidity for optimal execution');
      recommendations.push('Consider reducing trade size or using multiple transactions');
    }

    if (liquidityData.utilization > 0.8) {
      warnings.push('High pool utilization may result in higher slippage');
      recommendations.push('Monitor slippage tolerance and consider alternative routes');
    }

    return {
      isValid,
      availableLiquidity: liquidityData.totalLiquidity.toString(),
      requiredLiquidity: requiredLiquidity.toString(),
      liquidityRatio: liquidityData.totalLiquidity / requiredLiquidity,
      warnings,
      recommendations,
      pools: liquidityData.pools
    };
  }

  /**
   * Get all possible routes for a token pair
   */
  private async getAllRoutes(
    fromToken: Token,
    toToken: Token,
    amount: string,
    userAddress: string
  ): Promise<SmartRoute[]> {
    const routes: SmartRoute[] = [];

    // Direct routes (single DEX)
    for (const dex of this.config.enabledDEXs) {
      if (await this.isDEXHealthy(dex, fromToken.chainId)) {
        const route = await this.getDirectRoute(dex, fromToken, toToken, amount, userAddress);
        if (route) routes.push(route);
      }
    }

    // Multi-hop routes
    const multiHopRoutes = await this.getMultiHopRoutes(fromToken, toToken, amount, userAddress);
    routes.push(...multiHopRoutes);

    // Cross-chain routes
    if (this.config.enableCrossChain && fromToken.chainId !== toToken.chainId) {
      const crossChainRoutes = await this.getCrossChainRoutes(fromToken, toToken, amount, userAddress);
      routes.push(...crossChainRoutes);
    }

    // Filter and sort routes
    return routes
      .filter(route => route.confidence >= SMART_ROUTING_CONSTANTS.CONFIDENCE_THRESHOLD)
      .sort((a, b) => parseFloat(b.netAmountOut) - parseFloat(a.netAmountOut));
  }

  /**
   * Compare routes and find the best one
   */
  private async compareRoutes(routes: SmartRoute[]): Promise<RouteComparison> {
    const rankings: RouteRanking[] = [];

    for (const route of routes) {
      const score = await this.calculateRouteScore(route);
      const ranking: RouteRanking = {
        route,
        rank: 0, // Will be set after sorting
        score: score.total,
        scoreBreakdown: score.breakdown,
        pros: this.getRoutePros(route, score),
        cons: this.getRouteCons(route, score),
        recommendation: this.getRouteRecommendation(score.total)
      };
      rankings.push(ranking);
    }

    // Sort by score and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    const bestRoute = rankings[0].route;
    const worstRoute = rankings[rankings.length - 1].route;

    const savings = {
      amount: (parseFloat(bestRoute.netAmountOut) - parseFloat(worstRoute.netAmountOut)).toString(),
      amountUSD: (parseFloat(bestRoute.netAmountOut) - parseFloat(worstRoute.netAmountOut)) * await this.getTokenPrice(bestRoute.tokenOut),
      percentage: ((parseFloat(bestRoute.netAmountOut) - parseFloat(worstRoute.netAmountOut)) / parseFloat(worstRoute.netAmountOut)) * 100
    };

    const analysis = await this.analyzeRoutes(routes);

    return {
      routes,
      bestRoute,
      savings,
      ranking: rankings,
      analysis,
      timestamp: Date.now()
    };
  }

  /**
   * Create fallback strategy when primary route fails
   */
  private async createFallbackStrategy(
    allRoutes: SmartRoute[],
    primaryRoute: SmartRoute
  ): Promise<FallbackStrategy> {
    const fallbackRoutes = allRoutes
      .filter(route => route.id !== primaryRoute.id)
      .filter(route => route.confidence >= 70) // Lower threshold for fallbacks
      .slice(0, 3); // Max 3 fallback routes

    return {
      primaryRoute,
      fallbackRoutes,
      currentAttempt: 0,
      maxAttempts: fallbackRoutes.length,
      fallbackReason: 'Primary route liquidity validation failed',
      autoFallback: this.config.fallbackEnabled
    };
  }

  // Helper methods

  /** Price cache: symbol -> { price, timestamp } */
  private tokenPriceCache: Map<string, { price: number; ts: number }> = new Map();

  private async getTokenPrice(token: Token): Promise<number> {
    const cacheKey = token.symbol?.toLowerCase() || token.address;
    const cached = this.tokenPriceCache.get(cacheKey);

    // Use cache if less than 30 seconds old
    if (cached && Date.now() - cached.ts < 30000) {
      return cached.price;
    }

    try {
      // Map common symbols to CoinGecko IDs
      const symbolToId: Record<string, string> = {
        btc: 'bitcoin', eth: 'ethereum', sol: 'solana',
        usdt: 'tether', usdc: 'usd-coin', bnb: 'binancecoin',
        avax: 'avalanche-2', matic: 'matic-network', arb: 'arbitrum',
        op: 'optimism', atom: 'cosmos', doge: 'dogecoin', ltc: 'litecoin',
      };

      const id = symbolToId[cacheKey] || cacheKey;
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (res.ok) {
        const data = await res.json();
        const price = data[id]?.usd;
        if (price) {
          this.tokenPriceCache.set(cacheKey, { price, ts: Date.now() });
          return price;
        }
      }
    } catch {
      // Fall back to cached or default
    }

    // Fallback prices for common tokens
    const fallbacks: Record<string, number> = {
      btc: 97000, eth: 3200, sol: 180, usdt: 1, usdc: 1,
      bnb: 600, avax: 35, matic: 0.7, doge: 0.32, ltc: 100,
    };
    return fallbacks[cacheKey] || 1;
  }

  private getDEXConfig(dex: DEXType): { feeNumerator: number; label: string } {
    // Real DEX fee tiers (in basis points)
    const configs: Record<string, { feeNumerator: number; label: string }> = {
      'uniswap_v3': { feeNumerator: 30, label: 'Uniswap V3' },
      'uniswap_v2': { feeNumerator: 30, label: 'Uniswap V2' },
      'sushiswap': { feeNumerator: 30, label: 'SushiSwap' },
      'curve': { feeNumerator: 4, label: 'Curve' },
      'balancer': { feeNumerator: 10, label: 'Balancer' },
      'pancakeswap': { feeNumerator: 25, label: 'PancakeSwap' },
      'jupiter': { feeNumerator: 0, label: 'Jupiter' }, // Jupiter fees are separate
      'raydium': { feeNumerator: 25, label: 'Raydium' },
      'orca': { feeNumerator: 30, label: 'Orca' },
      'thorchain': { feeNumerator: 30, label: 'THORChain' },
    };
    return configs[dex] || { feeNumerator: 30, label: String(dex) };
  }

  private getCypherFeeRecipient(chainId: number): string {
    // Solana uses a different address format
    // chainId 0 = Solana (custom convention)
    if (chainId === 0) {
      return '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH';
    }
    // Bitcoin chainId -1 (custom convention)
    if (chainId === -1) {
      return '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb';
    }
    // All EVM chains use the same address
    return '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3';
  }

  private async estimateGasCosts(route: SmartRoute): Promise<any> {
    // Estimate gas based on chain and route complexity
    const chainId = route.tokenIn.chainId;

    // Average gas prices by chain (in gwei)
    const avgGasPrices: Record<number, { gasPrice: number; gasLimit: number; ethPrice: number }> = {
      1:     { gasPrice: 25, gasLimit: 180000, ethPrice: 3200 },  // Ethereum
      42161: { gasPrice: 0.1, gasLimit: 800000, ethPrice: 3200 }, // Arbitrum
      8453:  { gasPrice: 0.01, gasLimit: 200000, ethPrice: 3200 },// Base
      10:    { gasPrice: 0.01, gasLimit: 200000, ethPrice: 3200 },// Optimism
      137:   { gasPrice: 50, gasLimit: 200000, ethPrice: 0.7 },   // Polygon
      56:    { gasPrice: 3, gasLimit: 200000, ethPrice: 600 },    // BSC
      43114: { gasPrice: 25, gasLimit: 200000, ethPrice: 35 },    // Avalanche
      0:     { gasPrice: 0, gasLimit: 200000, ethPrice: 180 },    // Solana (~0.000005 SOL)
    };

    const chainConfig = avgGasPrices[chainId] || avgGasPrices[1];
    const stepsMultiplier = Math.max(1, route.steps?.length || 1);
    const estimatedGas = (chainConfig.gasLimit * stepsMultiplier).toString();
    const gasPriceWei = (chainConfig.gasPrice * 1e9).toString();
    const gasCostETH = (chainConfig.gasPrice * chainConfig.gasLimit * stepsMultiplier) / 1e9;
    const gasCostUSD = gasCostETH * chainConfig.ethPrice;

    return {
      estimatedGas,
      gasPrice: gasPriceWei,
      gasCostUSD: Math.round(gasCostUSD * 100) / 100,
    };
  }

  private async estimateBridgeFees(crossChain: CrossChainRoute): Promise<any> {
    // Bridge fees vary by provider; estimate based on common ranges
    const bridgeFeeEstimates: Record<string, number> = {
      'thorchain': 15,
      'stargate': 5,
      'across': 3,
      'hop': 4,
      'cbridge': 5,
    };

    const bridgeProvider = crossChain.bridge || 'thorchain';
    const estimatedFeeUSD = bridgeFeeEstimates[bridgeProvider] || 10;

    return {
      amount: (estimatedFeeUSD / 3200).toFixed(6), // Approximate in ETH
      amountUSD: estimatedFeeUSD,
      fromChain: crossChain.fromChain,
      toChain: crossChain.toChain,
      bridge: bridgeProvider,
    };
  }

  private async isDEXHealthy(dex: DEXType, chainId: number): Promise<boolean> {
    const key = `${dex}-${chainId}`;
    const cached = this.dexHealthCache.get(key);

    if (cached && Date.now() - cached.lastCheck < 60000) {
      return cached.isOnline && cached.successRate > 90;
    }

    // Ping DEX endpoints to check health
    const healthEndpoints: Record<string, string> = {
      'jupiter': 'https://api.jup.ag/v6/health',
      'uniswap_v3': 'https://api.uniswap.org/v1/health',
      'thorchain': 'https://thornode.ninerealms.com/thorchain/ping',
    };

    const endpoint = healthEndpoints[dex];
    if (!endpoint) {
      // No health endpoint known - assume healthy
      this.dexHealthCache.set(key, { isOnline: true, successRate: 95, lastCheck: Date.now() } as DEXHealth);
      return true;
    }

    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
      const isOnline = res.ok;
      this.dexHealthCache.set(key, { isOnline, successRate: isOnline ? 95 : 0, lastCheck: Date.now() } as DEXHealth);
      return isOnline;
    } catch {
      this.dexHealthCache.set(key, { isOnline: false, successRate: 0, lastCheck: Date.now() } as DEXHealth);
      return false;
    }
  }

  private async getDirectRoute(
    dex: DEXType,
    fromToken: Token,
    toToken: Token,
    amount: string,
    userAddress: string
  ): Promise<SmartRoute | null> {
    // Implement direct route fetching
    return null; // Placeholder
  }

  private async getMultiHopRoutes(
    fromToken: Token,
    toToken: Token,
    amount: string,
    userAddress: string
  ): Promise<SmartRoute[]> {
    // Implement multi-hop route generation
    return []; // Placeholder
  }

  private async getCrossChainRoutes(
    fromToken: Token,
    toToken: Token,
    amount: string,
    userAddress: string
  ): Promise<SmartRoute[]> {
    // Implement cross-chain route generation
    return []; // Placeholder
  }

  private async getLiquidityData(route: SmartRoute): Promise<any> {
    // Implement liquidity data fetching
    return {
      totalLiquidity: 1000000,
      utilization: 0.3,
      pools: []
    };
  }

  private async getHistoricalSlippage(tokenIn: Token, tokenOut: Token): Promise<any> {
    // Implement historical slippage data
    return {
      averageSlippage: 0.002 // 0.2%
    };
  }

  private calculatePriceImpact(amount: number, liquidity: number): number {
    // Simple price impact calculation
    return amount / liquidity;
  }

  private async getVolatilityAdjustment(tokenIn: Token, tokenOut: Token): Promise<number> {
    // Implement volatility-based slippage adjustment
    return 0.001; // 0.1%
  }

  private getLiquidityAdjustment(utilization: number): number {
    // Higher utilization = higher slippage
    return utilization * 0.005;
  }

  private calculateSlippageConfidence(liquidityData: any, historicalData: any): number {
    // Calculate confidence in slippage estimate
    return 85; // Placeholder
  }

  private async calculateRouteScore(route: SmartRoute): Promise<any> {
    // Implement comprehensive route scoring
    return {
      total: 85,
      breakdown: {
        price: 90,
        speed: 80,
        reliability: 85,
        liquidity: 80,
        gas: 85
      }
    };
  }

  private getRoutePros(route: SmartRoute, score: any): string[] {
    const pros = [];
    if (score.breakdown.price > 85) pros.push('Excellent price');
    if (score.breakdown.speed > 85) pros.push('Fast execution');
    if (score.breakdown.reliability > 85) pros.push('Highly reliable');
    return pros;
  }

  private getRouteCons(route: SmartRoute, score: any): string[] {
    const cons = [];
    if (score.breakdown.price < 70) cons.push('Sub-optimal price');
    if (score.breakdown.gas > 90) cons.push('High gas costs');
    if (route.crossChain) cons.push('Cross-chain complexity');
    return cons;
  }

  private getRouteRecommendation(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  private async analyzeRoutes(routes: SmartRoute[]): Promise<RouteAnalysis> {
    // Implement comprehensive route analysis
    const prices = routes.map(r => parseFloat(r.netAmountOut));
    const priceVariance = (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices) * 100;

    return {
      priceVariance,
      averageExecutionTime: routes.reduce((sum, r) => sum + r.executionTime, 0) / routes.length,
      averageSlippage: routes.reduce((sum, r) => sum + r.slippage.expected, 0) / routes.length,
      liquidityScore: 80, // Placeholder
      riskAssessment: {
        overall: 'medium',
        factors: {
          priceVolatility: 0.05,
          liquidityRisk: 0.03,
          slippageRisk: 0.02,
          executionRisk: 0.01
        },
        warnings: [],
        recommendations: []
      },
      marketConditions: {
        volatility: 0.15,
        volume24h: 1000000,
        trend: 'sideways',
        liquidityTrend: 'stable',
        gasPriceLevel: 'medium',
        networkCongestion: 50
      }
    };
  }
}