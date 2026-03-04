// Advanced route optimization system for QuickTrade with intelligent price discovery
import { quickTradeCache } from '../cache/advancedQuickTradeCache';
import { quickTradeErrorHandler } from '../errorHandling/quickTradeErrorHandler';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  chainId: string | number;
}

interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  fee: number;
  liquidity: string;
  sqrtPriceX96?: string;
  dex: string;
  version: string;
}

interface RouteStep {
  pool: Pool;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  fee: number;
}

interface OptimizedRoute {
  steps: RouteStep[];
  totalAmountOut: string;
  totalPriceImpact: number;
  totalFee: number;
  estimatedGas: string;
  confidence: number;
  executionTime: number;
  slippage: number;
  dexPath: string[];
  liquidityScore: number;
}

interface RouteOptimizationConfig {
  maxHops: number;
  maxRoutes: number;
  minLiquidity: number;
  maxPriceImpact: number;
  gasOptimization: boolean;
  timeWindow: number; // milliseconds
}

class AdvancedRouteOptimizer {
  private config: RouteOptimizationConfig;
  private poolCache = new Map<string, Pool[]>();
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private gasCache = new Map<string, { gas: number; timestamp: number }>();

  constructor(config: Partial<RouteOptimizationConfig> = {}) {
    this.config = {
      maxHops: 3,
      maxRoutes: 10,
      minLiquidity: 10000, // $10k minimum
      maxPriceImpact: 5, // 5% maximum
      gasOptimization: true,
      timeWindow: 30000, // 30 seconds
      ...config
    };
  }

  // Main route optimization method
  async findOptimalRoutes(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    chainId: string | number
  ): Promise<OptimizedRoute[]> {
    const startTime = performance.now();

    try {
      // Get all available pools for the chain
      const pools = await this.getPoolsForChain(chainId);
      
      // Build token graph
      const tokenGraph = this.buildTokenGraph(pools, tokenIn, tokenOut);
      
      // Find all possible routes
      const possibleRoutes = await this.findAllRoutes(
        tokenIn,
        tokenOut,
        amountIn,
        tokenGraph,
        [],
        0
      );

      // Filter routes by basic criteria
      const validRoutes = possibleRoutes.filter(route => 
        route.totalPriceImpact <= this.config.maxPriceImpact &&
        route.liquidityScore >= this.config.minLiquidity
      );

      // Optimize routes
      const optimizedRoutes = await this.optimizeRoutes(validRoutes, chainId);

      // Sort by efficiency score
      const sortedRoutes = this.rankRoutesByEfficiency(optimizedRoutes);

      const executionTime = performance.now() - startTime;
      
      console.log(`🔍 Route optimization completed in ${executionTime.toFixed(2)}ms`, {
        possibleRoutes: possibleRoutes.length,
        validRoutes: validRoutes.length,
        optimizedRoutes: optimizedRoutes.length,
        bestRoute: sortedRoutes[0]?.dexPath.join(' → ')
      });

      return sortedRoutes.slice(0, this.config.maxRoutes);
    } catch (error) {
      console.error('❌ Route optimization failed:', error);
      throw error;
    }
  }

  private async getPoolsForChain(chainId: string | number): Promise<Pool[]> {
    const cacheKey = `pools:${chainId}`;
    const cached = this.poolCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Get pools from cache first
      const cachedPools = await quickTradeCache.getLiquidity('all', 'pools', chainId);
      
      if (cachedPools) {
        this.poolCache.set(cacheKey, cachedPools);
        return cachedPools;
      }

      // Fetch fresh pool data
      const pools = await this.fetchPoolsFromDEXs(chainId);
      
      // Cache the results
      await quickTradeCache.cacheLiquidity('all', 'pools', chainId, pools);
      this.poolCache.set(cacheKey, pools);
      
      return pools;
    } catch (error) {
      console.error('❌ Failed to get pools for chain:', error);
      return [];
    }
  }

  private async fetchPoolsFromDEXs(chainId: string | number): Promise<Pool[]> {
    const pools: Pool[] = [];
    
    // Mock pool data - in production, fetch from actual DEX subgraphs
    const mockPools = this.generateMockPools(chainId);
    
    return quickTradeErrorHandler.executeBulkOperation(
      mockPools.map(pool => ({
        operation: () => this.validatePool(pool),
        context: {
          operation: 'pool_validation',
          chainId,
          metadata: { poolAddress: pool.address }
        }
      }))
    ).then(results => 
      results
        .filter(result => result.success)
        .map(result => result.result!)
    );
  }

  private generateMockPools(chainId: string | number): Pool[] {
    // Mock implementation - replace with actual DEX data fetching
    const commonTokens = this.getCommonTokensForChain(chainId);
    const pools: Pool[] = [];

    for (let i = 0; i < commonTokens.length; i++) {
      for (let j = i + 1; j < commonTokens.length; j++) {
        const token0 = commonTokens[i];
        const token1 = commonTokens[j];
        
        // Generate multiple pools for popular pairs (different DEXs/fees)
        const poolVariants = [
          { dex: 'uniswap', version: 'v3', fee: 0.3 },
          { dex: 'uniswap', version: 'v3', fee: 0.05 },
          { dex: 'sushiswap', version: 'v2', fee: 0.3 },
          { dex: 'curve', version: 'v1', fee: 0.04 }
        ];

        poolVariants.forEach(variant => {
          pools.push({
            address: `${variant.dex}_${token0.symbol}_${token1.symbol}_${variant.fee}`,
            token0,
            token1,
            fee: variant.fee,
            liquidity: '1000000', // Default $1M liquidity
            dex: variant.dex,
            version: variant.version,
            sqrtPriceX96: this.calculateSqrtPriceX96(token0, token1)
          });
        });
      }
    }

    return pools;
  }

  private getCommonTokensForChain(chainId: string | number): Token[] {
    const chainTokens: Record<string, Token[]> = {
      '1': [ // Ethereum
        { address: 'native', symbol: 'ETH', decimals: 18, chainId },
        { address: '0xA0b86a33E6c...', symbol: 'USDC', decimals: 6, chainId },
        { address: '0xdAC17F958D2...', symbol: 'USDT', decimals: 6, chainId },
        { address: '0x2260FAC5E5542...', symbol: 'WBTC', decimals: 8, chainId },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18, chainId }
      ],
      'solana': [
        { address: 'native', symbol: 'SOL', decimals: 9, chainId },
        { address: 'EPjFWdd5AufqS...', symbol: 'USDC', decimals: 6, chainId },
        { address: 'Es9vMFrzaCER...', symbol: 'USDT', decimals: 6, chainId },
        { address: '4k3Dyjzvzp8e...', symbol: 'RAY', decimals: 6, chainId }
      ]
    };

    return chainTokens[chainId.toString()] || chainTokens['1'];
  }

  private calculateSqrtPriceX96(token0: Token, token1: Token): string {
    // Mock price calculation
    const basePrices: Record<string, number> = {
      'ETH': 2850, 'SOL': 95, 'USDC': 1, 'USDT': 1, 'WBTC': 43000, 'DAI': 1
    };
    
    const price0 = basePrices[token0.symbol] || 1;
    const price1 = basePrices[token1.symbol] || 1;
    const price = price1 / price0;
    
    // Convert to sqrtPriceX96 format (simplified)
    return Math.floor(Math.sqrt(price) * Math.pow(2, 96)).toString();
  }

  private async validatePool(pool: Pool): Promise<Pool> {
    // Validate pool liquidity and status
    const liquidity = parseFloat(pool.liquidity);
    
    if (liquidity < this.config.minLiquidity) {
      throw new Error(`Pool ${pool.address} has insufficient liquidity: $${liquidity}`);
    }

    return pool;
  }

  private buildTokenGraph(pools: Pool[], tokenIn: Token, tokenOut: Token): Map<string, Pool[]> {
    const graph = new Map<string, Pool[]>();

    for (const pool of pools) {
      const token0Address = pool.token0.address;
      const token1Address = pool.token1.address;

      // Add bidirectional edges
      if (!graph.has(token0Address)) {
        graph.set(token0Address, []);
      }
      if (!graph.has(token1Address)) {
        graph.set(token1Address, []);
      }

      graph.get(token0Address)!.push(pool);
      graph.get(token1Address)!.push(pool);
    }

    return graph;
  }

  private async findAllRoutes(
    currentToken: Token,
    targetToken: Token,
    amountIn: string,
    graph: Map<string, Pool[]>,
    currentPath: RouteStep[],
    depth: number
  ): Promise<OptimizedRoute[]> {
    // Base case: reached target token
    if (currentToken.address === targetToken.address) {
      if (currentPath.length === 0) return [];
      
      return [{
        steps: [...currentPath],
        totalAmountOut: currentPath[currentPath.length - 1].amountOut,
        totalPriceImpact: this.calculateTotalPriceImpact(currentPath),
        totalFee: this.calculateTotalFee(currentPath),
        estimatedGas: this.estimateGasForRoute(currentPath),
        confidence: this.calculateRouteConfidence(currentPath),
        executionTime: this.estimateExecutionTime(currentPath),
        slippage: this.calculateRouteSlippage(currentPath),
        dexPath: currentPath.map(step => step.pool.dex),
        liquidityScore: this.calculateLiquidityScore(currentPath)
      }];
    }

    // Maximum depth reached
    if (depth >= this.config.maxHops) {
      return [];
    }

    const routes: OptimizedRoute[] = [];
    const availablePools = graph.get(currentToken.address) || [];

    for (const pool of availablePools) {
      // Determine next token
      const nextToken = pool.token0.address === currentToken.address 
        ? pool.token1 
        : pool.token0;

      // Avoid cycles
      if (currentPath.some(step => step.tokenOut.address === nextToken.address)) {
        continue;
      }

      try {
        // Calculate swap output
        const swapResult = await this.calculateSwapOutput(
          pool,
          currentToken,
          nextToken,
          depth === 0 ? amountIn : currentPath[currentPath.length - 1].amountOut
        );

        const routeStep: RouteStep = {
          pool,
          tokenIn: currentToken,
          tokenOut: nextToken,
          amountIn: depth === 0 ? amountIn : currentPath[currentPath.length - 1].amountOut,
          amountOut: swapResult.amountOut,
          priceImpact: swapResult.priceImpact,
          fee: pool.fee
        };

        const newPath = [...currentPath, routeStep];

        // Recursively find routes from next token
        const subRoutes = await this.findAllRoutes(
          nextToken,
          targetToken,
          amountIn,
          graph,
          newPath,
          depth + 1
        );

        routes.push(...subRoutes);
      } catch (error) {
        // Skip this route if swap calculation fails
        continue;
      }
    }

    return routes;
  }

  private async calculateSwapOutput(
    pool: Pool,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<{ amountOut: string; priceImpact: number }> {
    const cacheKey = `swap:${pool.address}:${tokenIn.address}:${amountIn}`;
    
    // Check cache first
    const cached = await quickTradeCache.getQuote(
      pool.dex,
      tokenIn.address,
      tokenOut.address,
      amountIn,
      tokenIn.chainId
    );
    
    if (cached) {
      return {
        amountOut: cached.outputAmount,
        priceImpact: cached.priceImpact
      };
    }

    // Simplified swap calculation for mock
    const liquidity = parseFloat(pool.liquidity);
    const inputAmount = parseFloat(amountIn);
    
    // Basic constant product formula simulation
    const feeMultiplier = 1 - (pool.fee / 100);
    const effectiveInput = inputAmount * feeMultiplier;
    
    // Price impact calculation
    const priceImpact = Math.min(
      (effectiveInput / liquidity) * 100,
      this.config.maxPriceImpact
    );
    
    // Output calculation with slippage
    const baseOutput = effectiveInput * 0.998; // Base conversion rate
    const slippageAdjustment = 1 - (priceImpact / 100);
    const amountOut = baseOutput * slippageAdjustment;

    const result = {
      amountOut: amountOut.toString(),
      priceImpact
    };

    // Cache the result
    await quickTradeCache.cacheQuote(
      pool.dex,
      tokenIn.address,
      tokenOut.address,
      amountIn,
      tokenIn.chainId,
      {
        outputAmount: result.amountOut,
        priceImpact: result.priceImpact,
        timestamp: Date.now()
      }
    );

    return result;
  }

  private async optimizeRoutes(routes: OptimizedRoute[], chainId: string | number): Promise<OptimizedRoute[]> {
    return quickTradeErrorHandler.executeBulkOperation(
      routes.map(route => ({
        operation: () => this.optimizeSingleRoute(route, chainId),
        context: {
          operation: 'route_optimization',
          chainId,
          metadata: { routeSteps: route.steps.length }
        }
      }))
    ).then(results => 
      results
        .filter(result => result.success)
        .map(result => result.result!)
    );
  }

  private async optimizeSingleRoute(route: OptimizedRoute, chainId: string | number): Promise<OptimizedRoute> {
    // Gas optimization
    if (this.config.gasOptimization) {
      route.estimatedGas = await this.optimizeGasEstimate(route, chainId);
    }

    // Slippage optimization
    route.slippage = this.optimizeSlippage(route);

    // Confidence score adjustment
    route.confidence = this.adjustConfidenceScore(route);

    return route;
  }

  private async optimizeGasEstimate(route: OptimizedRoute, chainId: string | number): Promise<string> {
    const cacheKey = `gas_optimized:${chainId}:${route.steps.length}`;
    const cached = this.gasCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.gas.toString();
    }

    // Gas optimization logic
    let baseGas = 21000; // Base transaction cost
    
    for (const step of route.steps) {
      switch (step.pool.dex) {
        case 'uniswap':
          baseGas += step.pool.version === 'v3' ? 150000 : 120000;
          break;
        case 'sushiswap':
          baseGas += 130000;
          break;
        case 'curve':
          baseGas += 200000;
          break;
        default:
          baseGas += 140000;
      }
    }

    // Multi-hop optimization
    if (route.steps.length > 1) {
      baseGas *= 0.95; // 5% savings for batched operations
    }

    this.gasCache.set(cacheKey, { gas: baseGas, timestamp: Date.now() });
    
    return baseGas.toString();
  }

  private optimizeSlippage(route: OptimizedRoute): number {
    // Dynamic slippage based on route complexity and liquidity
    const baseSlippage = 0.5; // 0.5%
    const complexityMultiplier = 1 + (route.steps.length - 1) * 0.1;
    const liquidityAdjustment = Math.max(0.5, route.liquidityScore / 1000000);
    
    return baseSlippage * complexityMultiplier * liquidityAdjustment;
  }

  private adjustConfidenceScore(route: OptimizedRoute): number {
    let confidence = 100;
    
    // Reduce confidence for complex routes
    confidence -= (route.steps.length - 1) * 5;
    
    // Reduce confidence for high price impact
    confidence -= route.totalPriceImpact * 2;
    
    // Reduce confidence for low liquidity
    if (route.liquidityScore < 100000) {
      confidence -= 10;
    }
    
    // Adjust for gas cost
    const gasUSD = parseFloat(route.estimatedGas) * 0.00003; // Rough gas price
    if (gasUSD > 10) {
      confidence -= 5;
    }

    return Math.max(50, Math.min(100, confidence));
  }

  private rankRoutesByEfficiency(routes: OptimizedRoute[]): OptimizedRoute[] {
    return routes.sort((a, b) => {
      // Multi-criteria scoring
      const scoreA = this.calculateEfficiencyScore(a);
      const scoreB = this.calculateEfficiencyScore(b);
      
      return scoreB - scoreA;
    });
  }

  private calculateEfficiencyScore(route: OptimizedRoute): number {
    const outputValue = parseFloat(route.totalAmountOut);
    const gasUSD = parseFloat(route.estimatedGas) * 0.00003;
    const fees = route.totalFee;
    
    // Net value after costs
    const netValue = outputValue - gasUSD - fees;
    
    // Efficiency factors
    const priceImpactPenalty = route.totalPriceImpact * 0.01;
    const liquidityBonus = Math.min(route.liquidityScore / 1000000, 1) * 0.1;
    const confidenceBonus = route.confidence * 0.001;
    
    return netValue * (1 - priceImpactPenalty + liquidityBonus + confidenceBonus);
  }

  // Helper calculation methods
  private calculateTotalPriceImpact(steps: RouteStep[]): number {
    return steps.reduce((total, step) => total + step.priceImpact, 0);
  }

  private calculateTotalFee(steps: RouteStep[]): number {
    return steps.reduce((total, step) => {
      const stepAmount = parseFloat(step.amountIn);
      return total + (stepAmount * step.fee / 100);
    }, 0);
  }

  private estimateGasForRoute(steps: RouteStep[]): string {
    let totalGas = 21000; // Base transaction cost
    
    for (const step of steps) {
      switch (step.pool.dex) {
        case 'uniswap':
          totalGas += step.pool.version === 'v3' ? 150000 : 120000;
          break;
        case 'sushiswap':
          totalGas += 130000;
          break;
        default:
          totalGas += 140000;
      }
    }
    
    return totalGas.toString();
  }

  private calculateRouteConfidence(steps: RouteStep[]): number {
    let confidence = 100;
    
    // Reduce confidence for longer routes
    confidence -= (steps.length - 1) * 10;
    
    // Reduce confidence for high price impact
    const totalPriceImpact = this.calculateTotalPriceImpact(steps);
    confidence -= totalPriceImpact * 5;
    
    return Math.max(60, confidence);
  }

  private estimateExecutionTime(steps: RouteStep[]): number {
    // Base time + time per hop
    return 2000 + (steps.length - 1) * 1000; // milliseconds
  }

  private calculateRouteSlippage(steps: RouteStep[]): number {
    // Compound slippage across steps
    return steps.reduce((totalSlippage, step) => {
      const stepSlippage = step.priceImpact * 0.1; // Convert price impact to slippage
      return totalSlippage + stepSlippage;
    }, 0.1); // Base slippage
  }

  private calculateLiquidityScore(steps: RouteStep[]): number {
    // Minimum liquidity across the route
    return Math.min(...steps.map(step => parseFloat(step.pool.liquidity)));
  }

  // Public methods for external access
  async warmRouteCache(
    commonPairs: Array<{tokenIn: Token; tokenOut: Token; amounts: string[]}>
  ): Promise<void> {
    console.log('🔥 Warming route cache...');
    
    for (const pair of commonPairs) {
      for (const amount of pair.amounts) {
        try {
          await this.findOptimalRoutes(pair.tokenIn, pair.tokenOut, amount, pair.tokenIn.chainId);
        } catch (error) {
          console.error('❌ Route cache warming error:', error);
        }
      }
    }
    
    console.log('✅ Route cache warming completed');
  }

  getOptimizationStats() {
    return {
      config: this.config,
      cacheStats: {
        pools: this.poolCache.size,
        prices: this.priceCache.size,
        gas: this.gasCache.size
      }
    };
  }
}

// Export singleton instance
export const advancedRouteOptimizer = new AdvancedRouteOptimizer();

// Export types
export type {
  Token,
  Pool,
  RouteStep,
  OptimizedRoute,
  RouteOptimizationConfig,
};
export { AdvancedRouteOptimizer };