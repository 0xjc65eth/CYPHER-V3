/**
 * Route Optimizer for CYPHER TRADE
 * Version: 1.0.0
 * 
 * Advanced route optimization algorithms that find the best execution path
 * considering price, gas costs, slippage, and liquidity across multiple DEXs.
 */

import {
  SmartRoute,
  SmartRoutingConfig,
  RouteComparison,
  FeeBreakdown,
  LiquidityValidation,
  CrossChainRoute,
  BridgeType,
  RouteRanking,
  SMART_ROUTING_CONSTANTS
} from '../types/smartRouting';
import {
  Token,
  DEXType,
  RouteStep
} from '../types/quickTrade';

interface OptimizationWeights {
  price: number;        // 0-1, how much to prioritize best price
  speed: number;        // 0-1, how much to prioritize execution speed
  reliability: number;  // 0-1, how much to prioritize DEX reliability
  gas: number;         // 0-1, how much to prioritize low gas costs
  liquidity: number;   // 0-1, how much to prioritize high liquidity
}

interface RouteCandidate {
  route: SmartRoute;
  score: number;
  breakdown: {
    priceScore: number;
    speedScore: number;
    reliabilityScore: number;
    gasScore: number;
    liquidityScore: number;
  };
  risks: string[];
  benefits: string[];
}

export class RouteOptimizer {
  private config: SmartRoutingConfig;
  private weights: OptimizationWeights;
  private dexReliabilityScores: Map<DEXType, number> = new Map();
  private bridgeReliabilityScores: Map<BridgeType, number> = new Map();

  constructor(config: SmartRoutingConfig) {
    this.config = config;
    this.weights = this.determineOptimizationWeights(config);
    this.initializeReliabilityScores();
  }

  /**
   * Find optimal route considering all factors
   */
  async findOptimalRoute(
    routes: SmartRoute[],
    userPreferences?: Partial<OptimizationWeights>
  ): Promise<RouteComparison> {
    if (routes.length === 0) {
      throw new Error('No routes provided for optimization');
    }

    // Apply user preferences to weights
    if (userPreferences) {
      this.weights = { ...this.weights, ...userPreferences };
      this.normalizeWeights();
    }

    // Score all routes
    const candidates: RouteCandidate[] = [];
    
    for (const route of routes) {
      const candidate = await this.scoreRoute(route);
      candidates.push(candidate);
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    // Create rankings
    const rankings: RouteRanking[] = candidates.map((candidate, index) => ({
      route: candidate.route,
      rank: index + 1,
      score: candidate.score,
      scoreBreakdown: candidate.breakdown,
      pros: candidate.benefits,
      cons: candidate.risks,
      recommendation: this.getRecommendationLevel(candidate.score)
    }));

    const bestRoute = candidates[0].route;
    const worstRoute = candidates[candidates.length - 1].route;

    // Calculate savings
    const savings = this.calculateSavings(bestRoute, worstRoute);

    return {
      routes,
      bestRoute,
      savings,
      ranking: rankings,
      analysis: await this.analyzeRouteDistribution(candidates),
      timestamp: Date.now()
    };
  }

  /**
   * Optimize routes for cross-chain swaps
   */
  async optimizeCrossChainRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    enabledBridges: BridgeType[]
  ): Promise<SmartRoute[]> {
    const crossChainRoutes: SmartRoute[] = [];

    for (const bridge of enabledBridges) {
      try {
        const route = await this.buildCrossChainRoute(
          fromToken,
          toToken,
          amount,
          bridge
        );
        
        if (route) {
          crossChainRoutes.push(route);
        }
      } catch (error) {
      }
    }

    // Optimize cross-chain routes specifically
    return this.optimizeCrossChainRoutes(crossChainRoutes);
  }

  /**
   * Multi-hop route optimization
   */
  async optimizeMultiHopRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    maxHops: number = 3
  ): Promise<SmartRoute[]> {
    const multiHopRoutes: SmartRoute[] = [];

    // Find common intermediate tokens
    const intermediateTokens = await this.findOptimalIntermediateTokens(
      fromToken,
      toToken
    );

    // Generate routes with different hop counts
    for (let hops = 2; hops <= maxHops; hops++) {
      const routes = await this.generateMultiHopRoutes(
        fromToken,
        toToken,
        amount,
        intermediateTokens,
        hops
      );
      multiHopRoutes.push(...routes);
    }

    // Filter and optimize
    return this.filterAndOptimizeRoutes(multiHopRoutes);
  }

  /**
   * Gas-optimized routing
   */
  async optimizeForGas(routes: SmartRoute[]): Promise<SmartRoute[]> {
    // Prioritize gas efficiency
    const gasWeights: OptimizationWeights = {
      price: 0.3,
      speed: 0.2,
      reliability: 0.2,
      gas: 0.8, // High weight on gas optimization
      liquidity: 0.3
    };

    const originalWeights = this.weights;
    this.weights = gasWeights;

    try {
      const optimized = await this.findOptimalRoute(routes);
      return [optimized.bestRoute, ...optimized.ranking.slice(1, 3).map(r => r.route)];
    } finally {
      this.weights = originalWeights;
    }
  }

  /**
   * Speed-optimized routing
   */
  async optimizeForSpeed(routes: SmartRoute[]): Promise<SmartRoute[]> {
    // Prioritize execution speed
    const speedWeights: OptimizationWeights = {
      price: 0.3,
      speed: 0.8, // High weight on speed
      reliability: 0.4,
      gas: 0.2,
      liquidity: 0.3
    };

    const originalWeights = this.weights;
    this.weights = speedWeights;

    try {
      const optimized = await this.findOptimalRoute(routes);
      return [optimized.bestRoute, ...optimized.ranking.slice(1, 3).map(r => r.route)];
    } finally {
      this.weights = originalWeights;
    }
  }

  /**
   * Price-optimized routing (maximum output)
   */
  async optimizeForPrice(routes: SmartRoute[]): Promise<SmartRoute[]> {
    // Prioritize best price
    const priceWeights: OptimizationWeights = {
      price: 0.9, // Very high weight on price
      speed: 0.1,
      reliability: 0.3,
      gas: 0.2,
      liquidity: 0.4
    };

    const originalWeights = this.weights;
    this.weights = priceWeights;

    try {
      const optimized = await this.findOptimalRoute(routes);
      return [optimized.bestRoute, ...optimized.ranking.slice(1, 3).map(r => r.route)];
    } finally {
      this.weights = originalWeights;
    }
  }

  /**
   * Score a single route based on optimization criteria
   */
  private async scoreRoute(route: SmartRoute): Promise<RouteCandidate> {
    const breakdown = {
      priceScore: await this.calculatePriceScore(route),
      speedScore: await this.calculateSpeedScore(route),
      reliabilityScore: await this.calculateReliabilityScore(route),
      gasScore: await this.calculateGasScore(route),
      liquidityScore: await this.calculateLiquidityScore(route)
    };

    // Calculate weighted total score
    const score = (
      breakdown.priceScore * this.weights.price +
      breakdown.speedScore * this.weights.speed +
      breakdown.reliabilityScore * this.weights.reliability +
      breakdown.gasScore * this.weights.gas +
      breakdown.liquidityScore * this.weights.liquidity
    ) / this.getTotalWeight();

    const risks = this.identifyRouteRisks(route, breakdown);
    const benefits = this.identifyRouteBenefits(route, breakdown);

    return {
      route,
      score: Math.min(100, Math.max(0, score)), // Clamp to 0-100
      breakdown,
      risks,
      benefits
    };
  }

  /**
   * Calculate price score (0-100)
   */
  private async calculatePriceScore(route: SmartRoute): Promise<number> {
    const netAmount = parseFloat(route.netAmountOut);
    const grossAmount = parseFloat(route.amountOut);
    
    // Score based on efficiency (net vs gross)
    const efficiency = netAmount / grossAmount;
    
    // Higher net amount = higher score
    const baseScore = Math.min(100, efficiency * 100);
    
    // Penalty for high price impact
    const priceImpactPenalty = Math.min(20, route.priceImpact * 100);
    
    return Math.max(0, baseScore - priceImpactPenalty);
  }

  /**
   * Calculate speed score (0-100)
   */
  private async calculateSpeedScore(route: SmartRoute): Promise<number> {
    const executionTime = route.executionTime;
    const crossChainPenalty = route.crossChain ? 30 : 0; // 30 point penalty for cross-chain
    const hopsPenalty = (route.steps.length - 1) * 5; // 5 points per extra hop
    
    // Base score inversely related to execution time
    let baseScore = Math.max(0, 100 - (executionTime / 10)); // 10 seconds = 0 points
    
    baseScore = Math.max(0, baseScore - crossChainPenalty - hopsPenalty);
    
    return Math.min(100, baseScore);
  }

  /**
   * Calculate reliability score (0-100)
   */
  private async calculateReliabilityScore(route: SmartRoute): Promise<number> {
    let totalReliability = 0;
    let count = 0;

    // Average DEX reliability scores
    for (const step of route.steps) {
      const dexScore = this.dexReliabilityScores.get(step.dex) || 50;
      totalReliability += dexScore;
      count++;
    }

    // Bridge reliability (if cross-chain)
    if (route.crossChain) {
      const bridgeScore = this.bridgeReliabilityScores.get(route.crossChain.bridge) || 50;
      totalReliability += bridgeScore;
      count++;
    }

    const avgReliability = count > 0 ? totalReliability / count : 50;
    
    // Confidence bonus
    const confidenceBonus = (route.confidence - 80) * 0.5; // Bonus for confidence > 80
    
    return Math.min(100, Math.max(0, avgReliability + confidenceBonus));
  }

  /**
   * Calculate gas score (0-100)
   */
  private async calculateGasScore(route: SmartRoute): Promise<number> {
    const gasCostUSD = route.totalFees.gasFees.gasCostUSD;
    const totalValueUSD = parseFloat(route.amountIn) * await this.getTokenPriceUSD(route.tokenIn);
    
    const gasCostPercentage = (gasCostUSD / totalValueUSD) * 100;
    
    // Lower gas cost = higher score
    if (gasCostPercentage < 0.1) return 100; // < 0.1% gas cost
    if (gasCostPercentage < 0.5) return 90;  // < 0.5% gas cost
    if (gasCostPercentage < 1.0) return 80;  // < 1% gas cost
    if (gasCostPercentage < 2.0) return 60;  // < 2% gas cost
    if (gasCostPercentage < 5.0) return 40;  // < 5% gas cost
    
    return Math.max(0, 40 - gasCostPercentage); // Linear decrease after 5%
  }

  /**
   * Calculate liquidity score (0-100)
   */
  private async calculateLiquidityScore(route: SmartRoute): Promise<number> {
    const liquidityCheck = route.liquidityCheck;
    
    if (!liquidityCheck.isValid) {
      return 0;
    }
    
    const ratio = liquidityCheck.liquidityRatio;
    let baseScore = Math.min(100, ratio * 50); // 2x liquidity = 100 points
    
    // Penalty for warnings
    const warningPenalty = liquidityCheck.warnings.length * 10;
    
    return Math.max(0, baseScore - warningPenalty);
  }

  /**
   * Build cross-chain route
   */
  private async buildCrossChainRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    bridge: BridgeType
  ): Promise<SmartRoute | null> {
    try {
      // This would implement actual cross-chain route building
      // For now, return a placeholder structure
      
      const crossChain: CrossChainRoute = {
        fromChain: fromToken.chainId,
        toChain: toToken.chainId,
        bridge,
        bridgeTime: this.getBridgeTime(bridge, fromToken.chainId, toToken.chainId),
        bridgeFee: '0.01',
        bridgeFeeUSD: 25,
        steps: [],
        totalTime: 300, // 5 minutes
        confirmations: {
          source: 12,
          destination: 20
        }
      };

      // Build the route structure
      const route: SmartRoute = {
        id: `cross-${bridge}-${Date.now()}`,
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: amount,
        amountOut: (parseFloat(amount) * 0.98).toString(), // 2% slippage estimate
        netAmountOut: (parseFloat(amount) * 0.95).toString(), // After all fees
        dexPath: [DEXType.UNISWAP_V3], // Placeholder
        steps: [],
        totalFees: {} as FeeBreakdown, // Would be calculated
        priceImpact: 0.02,
        slippage: {} as any,
        confidence: 75,
        executionTime: crossChain.totalTime,
        liquidityCheck: {} as LiquidityValidation,
        crossChain,
        timestamp: Date.now(),
        isOptimal: false
      };

      return route;

    } catch (error) {
      console.error(`Error building cross-chain route via ${bridge}:`, error);
      return null;
    }
  }

  /**
   * Find optimal intermediate tokens for multi-hop routes
   */
  private async findOptimalIntermediateTokens(
    fromToken: Token,
    toToken: Token
  ): Promise<Token[]> {
    // Common intermediate tokens by chain
    const commonTokensByChain: Record<number, string[]> = {
      1: ['WETH', 'USDC', 'USDT', 'DAI'], // Ethereum
      56: ['WBNB', 'BUSD', 'USDT'], // BSC
      137: ['WMATIC', 'USDC', 'USDT'], // Polygon
      42161: ['WETH', 'USDC', 'ARB'], // Arbitrum
      10: ['WETH', 'USDC', 'OP'], // Optimism
      43114: ['WAVAX', 'USDC', 'USDT'], // Avalanche
    };

    const chainId = fromToken.chainId;
    const commonSymbols = commonTokensByChain[chainId] || ['WETH', 'USDC'];
    
    // Filter out tokens that are already in the swap
    return commonSymbols
      .filter(symbol => 
        symbol !== fromToken.symbol && 
        symbol !== toToken.symbol
      )
      .map(symbol => this.createTokenFromSymbol(symbol, chainId))
      .slice(0, 3); // Limit to 3 intermediate tokens
  }

  /**
   * Generate multi-hop routes
   */
  private async generateMultiHopRoutes(
    fromToken: Token,
    toToken: Token,
    amount: string,
    intermediateTokens: Token[],
    hops: number
  ): Promise<SmartRoute[]> {
    // Implementation would generate actual multi-hop routes
    // This is a placeholder
    return [];
  }

  /**
   * Filter and optimize routes
   */
  private filterAndOptimizeRoutes(routes: SmartRoute[]): SmartRoute[] {
    return routes
      .filter(route => route.confidence >= 70)
      .filter(route => route.liquidityCheck.isValid)
      .sort((a, b) => parseFloat(b.netAmountOut) - parseFloat(a.netAmountOut))
      .slice(0, 5); // Top 5 routes
  }

  /**
   * Optimize cross-chain routes specifically
   */
  private optimizeCrossChainRoutes(routes: SmartRoute[]): SmartRoute[] {
    return routes
      .filter(route => route.crossChain)
      .sort((a, b) => {
        // Prioritize faster bridges with lower fees
        const aScore = (1 / (a.crossChain!.bridgeTime + 1)) - a.crossChain!.bridgeFeeUSD;
        const bScore = (1 / (b.crossChain!.bridgeTime + 1)) - b.crossChain!.bridgeFeeUSD;
        return bScore - aScore;
      })
      .slice(0, 3); // Top 3 cross-chain routes
  }

  // Helper methods
  private determineOptimizationWeights(config: SmartRoutingConfig): OptimizationWeights {
    if (config.prioritizePrice) {
      return { price: 0.8, speed: 0.2, reliability: 0.3, gas: 0.3, liquidity: 0.4 };
    }
    if (config.prioritizeSpeed) {
      return { price: 0.3, speed: 0.8, reliability: 0.4, gas: 0.2, liquidity: 0.3 };
    }
    if (config.prioritizeReliability) {
      return { price: 0.4, speed: 0.3, reliability: 0.8, gas: 0.3, liquidity: 0.5 };
    }
    
    // Balanced approach
    return { price: 0.6, speed: 0.4, reliability: 0.5, gas: 0.4, liquidity: 0.5 };
  }

  private normalizeWeights(): void {
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (total > 0) {
      Object.keys(this.weights).forEach(key => {
        this.weights[key as keyof OptimizationWeights] /= total;
      });
    }
  }

  private getTotalWeight(): number {
    return Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
  }

  private identifyRouteRisks(route: SmartRoute, breakdown: any): string[] {
    const risks = [];
    
    if (breakdown.reliabilityScore < 60) risks.push('Low DEX reliability');
    if (route.priceImpact > 0.05) risks.push('High price impact (>5%)');
    if (route.slippage.expected > 0.02) risks.push('High expected slippage');
    if (route.crossChain) risks.push('Cross-chain complexity');
    if (route.steps.length > 2) risks.push('Multi-hop complexity');
    if (breakdown.liquidityScore < 50) risks.push('Limited liquidity');
    
    return risks;
  }

  private identifyRouteBenefits(route: SmartRoute, breakdown: any): string[] {
    const benefits = [];
    
    if (breakdown.priceScore > 90) benefits.push('Excellent price');
    if (breakdown.speedScore > 85) benefits.push('Fast execution');
    if (breakdown.reliabilityScore > 85) benefits.push('High reliability');
    if (breakdown.gasScore > 85) benefits.push('Low gas costs');
    if (breakdown.liquidityScore > 85) benefits.push('Excellent liquidity');
    if (route.confidence > 90) benefits.push('High confidence');
    
    return benefits;
  }

  private getRecommendationLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  private calculateSavings(bestRoute: SmartRoute, worstRoute: SmartRoute): any {
    const bestAmount = parseFloat(bestRoute.netAmountOut);
    const worstAmount = parseFloat(worstRoute.netAmountOut);
    const savingsAmount = bestAmount - worstAmount;
    
    return {
      amount: savingsAmount.toString(),
      amountUSD: savingsAmount * 2000, // Placeholder price
      percentage: (savingsAmount / worstAmount) * 100
    };
  }

  private async analyzeRouteDistribution(candidates: RouteCandidate[]): Promise<any> {
    const scores = candidates.map(c => c.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    return {
      priceVariance: variance,
      averageExecutionTime: candidates.reduce((sum, c) => sum + c.route.executionTime, 0) / candidates.length,
      averageSlippage: candidates.reduce((sum, c) => sum + c.route.slippage.expected, 0) / candidates.length,
      liquidityScore: candidates.reduce((sum, c) => sum + c.breakdown.liquidityScore, 0) / candidates.length,
      riskAssessment: {
        overall: 'medium' as const,
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
        trend: 'sideways' as const,
        liquidityTrend: 'stable' as const,
        gasPriceLevel: 'medium' as const,
        networkCongestion: 50
      }
    };
  }

  private getBridgeTime(bridge: BridgeType, fromChain: number, toChain: number): number {
    // Estimated bridge times in minutes
    const bridgeTimes: Record<BridgeType, number> = {
      [BridgeType.STARGATE]: 2,
      [BridgeType.LAYERZERO]: 3,
      [BridgeType.WORMHOLE]: 15,
      [BridgeType.MULTICHAIN]: 10,
      [BridgeType.ALLBRIDGE]: 5,
      [BridgeType.CBRIDGE]: 8
    };
    
    return bridgeTimes[bridge] || 10;
  }

  private createTokenFromSymbol(symbol: string, chainId: number): Token {
    // This would fetch actual token data
    return {
      address: '0x0000000000000000000000000000000000000000',
      symbol,
      name: symbol,
      decimals: 18,
      chainId
    };
  }

  private async getTokenPriceUSD(token: Token): Promise<number> {
    // Placeholder implementation
    return 2000;
  }

  private initializeReliabilityScores(): void {
    // Initialize DEX reliability scores based on historical data
    this.dexReliabilityScores.set(DEXType.UNISWAP_V3, 95);
    this.dexReliabilityScores.set(DEXType.UNISWAP_V2, 90);
    this.dexReliabilityScores.set(DEXType.SUSHISWAP, 85);
    this.dexReliabilityScores.set(DEXType.PANCAKESWAP, 88);
    this.dexReliabilityScores.set(DEXType.JUPITER, 92);
    this.dexReliabilityScores.set(DEXType.ORCA, 87);
    this.dexReliabilityScores.set(DEXType.CURVE, 90);
    this.dexReliabilityScores.set(DEXType.BALANCER, 85);
    this.dexReliabilityScores.set(DEXType.ONEINCH, 88);

    // Initialize bridge reliability scores
    this.bridgeReliabilityScores.set(BridgeType.STARGATE, 90);
    this.bridgeReliabilityScores.set(BridgeType.LAYERZERO, 88);
    this.bridgeReliabilityScores.set(BridgeType.WORMHOLE, 85);
    this.bridgeReliabilityScores.set(BridgeType.MULTICHAIN, 80);
    this.bridgeReliabilityScores.set(BridgeType.ALLBRIDGE, 82);
    this.bridgeReliabilityScores.set(BridgeType.CBRIDGE, 85);
  }
}