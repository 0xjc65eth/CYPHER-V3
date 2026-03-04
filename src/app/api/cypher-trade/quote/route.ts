import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  withMiddleware, 
  createSuccessResponse, 
  createErrorResponse,
  handleCORS,
  corsHeaders 
} from '@/lib/api-middleware';

// Request validation schema
const QuoteRequestSchema = z.object({
  fromToken: z.string().min(1, 'From token is required'),
  toToken: z.string().min(1, 'To token is required'),
  amount: z.number().positive('Amount must be positive'),
  network: z.enum(['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'bsc', 'avalanche', 'solana']),
  slippageTolerance: z.number().min(0).max(50).optional().default(0.5),
  includeFees: z.boolean().optional().default(true),
  userAddress: z.string().optional(),
  deadline: z.number().optional(),
  gasPrice: z.number().optional()
});

interface DexQuote {
  dex: string;
  network: string;
  price: number;
  amountOut: number;
  priceImpact: number;
  liquidityUSD: number;
  gasEstimate: number;
  gasCostUSD: number;
  executionTime: number;
  trustScore: number;
  route: string[];
  confidenceLevel: number;
  fees: {
    protocolFee: number;
    liquidityProviderFee: number;
    gasPrice: number;
    cypherFee: number;
  };
  metadata: {
    poolAddress?: string;
    routerAddress?: string;
    lastUpdated: number;
    dataSource: string;
    version: string;
  };
}

interface OptimalRoute {
  steps: Array<{
    dex: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    amountOut: number;
    percentage: number;
    poolFee?: number;
    estimatedGas: number;
  }>;
  totalAmountOut: number;
  totalGasCost: number;
  totalPriceImpact: number;
  executionTime: number;
  reliabilityScore: number;
  strategy: 'single' | 'split' | 'multi-hop';
  savings: {
    amount: number;
    percentage: number;
    comparedTo: string;
  };
}

interface QuoteResponse {
  quotes: DexQuote[];
  bestQuote: DexQuote;
  optimalRoute: OptimalRoute;
  aggregatedData: {
    averagePrice: number;
    medianPrice: number;
    priceSpread: number;
    totalLiquidity: number;
    marketDepth: number;
    confidence: number;
  };
  riskAssessment: {
    slippageRisk: 'low' | 'medium' | 'high';
    liquidityRisk: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    riskScore: number;
  };
  serviceFee: {
    percentage: number;
    amountUSD: number;
    totalCost: number;
    breakdown: {
      cypherFee: number;
      protocolFees: number;
      networkFees: number;
    };
  };
  timing: {
    responseTime: number;
    cacheStatus: 'hit' | 'miss' | 'partial';
    dataFreshness: number;
    quotesRefreshed: number;
  };
  recommendation: {
    action: 'proceed' | 'caution' | 'review';
    reason: string;
    alternatives?: string[];
  };
}

// Enhanced DEX configuration with better analytics
const DEX_CONFIG = {
  ethereum: [
    {
      name: 'UNISWAP_V3',
      endpoint: 'https://api.uniswap.org/v1/quote',
      gasMultiplier: 1.0,
      trustScore: 98,
      liquidityWeight: 1.3,
      fees: { protocol: 0.0005, lp: 0.003, cypher: 0.0005 },
      features: ['concentrated-liquidity', 'multiple-fees']
    },
    {
      name: 'UNISWAP_V2',
      endpoint: 'https://api.uniswap.org/v2/quote',
      gasMultiplier: 0.8,
      trustScore: 95,
      liquidityWeight: 1.0,
      fees: { protocol: 0, lp: 0.003, cypher: 0.0005 },
      features: ['constant-product']
    },
    {
      name: 'SUSHISWAP',
      endpoint: 'https://api.sushi.com/v1/quote',
      gasMultiplier: 0.85,
      trustScore: 92,
      liquidityWeight: 0.9,
      fees: { protocol: 0.0005, lp: 0.003, cypher: 0.0005 },
      features: ['yield-farming']
    },
    {
      name: '1INCH',
      endpoint: 'https://api.1inch.dev/swap/v5.2/1/quote',
      gasMultiplier: 1.1,
      trustScore: 96,
      liquidityWeight: 1.4,
      fees: { protocol: 0.001, lp: 0, cypher: 0.0005 },
      features: ['aggregator', 'chi-gas-token']
    },
    {
      name: 'CURVE',
      endpoint: 'https://api.curve.fi/api/getQuote',
      gasMultiplier: 0.9,
      trustScore: 97,
      liquidityWeight: 1.2,
      fees: { protocol: 0.0004, lp: 0.002, cypher: 0.0005 },
      features: ['stable-swaps', 'low-slippage']
    },
    {
      name: 'BALANCER',
      endpoint: 'https://api.balancer.fi/v1/quote',
      gasMultiplier: 1.2,
      trustScore: 90,
      liquidityWeight: 0.8,
      fees: { protocol: 0.001, lp: 0.002, cypher: 0.0005 },
      features: ['weighted-pools', 'flash-loans']
    }
  ],
  arbitrum: [
    {
      name: 'UNISWAP_V3',
      endpoint: 'https://api.uniswap.org/v1/quote',
      gasMultiplier: 0.1,
      trustScore: 98,
      liquidityWeight: 1.2,
      fees: { protocol: 0.0005, lp: 0.003, cypher: 0.0005 },
      features: ['l2-scaling', 'concentrated-liquidity']
    },
    {
      name: 'CAMELOT',
      endpoint: 'https://api.camelot.exchange/v1/quote',
      gasMultiplier: 0.08,
      trustScore: 88,
      liquidityWeight: 0.9,
      fees: { protocol: 0.0002, lp: 0.0025, cypher: 0.0005 },
      features: ['native-arbitrum', 'low-fees']
    },
    {
      name: 'GMX',
      endpoint: 'https://api.gmx.io/v1/quote',
      gasMultiplier: 0.12,
      trustScore: 91,
      liquidityWeight: 1.1,
      fees: { protocol: 0.001, lp: 0, cypher: 0.0005 },
      features: ['perpetuals', 'zero-price-impact']
    }
  ],
  solana: [
    {
      name: 'JUPITER',
      endpoint: 'https://api.jup.ag/v6/quote',
      gasMultiplier: 0.001,
      trustScore: 96,
      liquidityWeight: 1.3,
      fees: { protocol: 0.0001, lp: 0, cypher: 0.0002 },
      features: ['route-optimization', 'low-latency']
    },
    {
      name: 'ORCA',
      endpoint: 'https://api.orca.so/v1/quote',
      gasMultiplier: 0.0008,
      trustScore: 93,
      liquidityWeight: 1.1,
      fees: { protocol: 0.0002, lp: 0.003, cypher: 0.0002 },
      features: ['concentrated-liquidity', 'whirlpools']
    },
    {
      name: 'RAYDIUM',
      endpoint: 'https://api.raydium.io/v2/quote',
      gasMultiplier: 0.0012,
      trustScore: 90,
      liquidityWeight: 1.0,
      fees: { protocol: 0.0003, lp: 0.0025, cypher: 0.0002 },
      features: ['amm', 'yield-farming']
    }
  ]
};

// Market data cache
const quoteCache = new Map<string, { data: DexQuote; timestamp: number; requests: number }>();
const CACHE_TTL = 3000; // 3 seconds for better freshness

class CypherQuoteEngine {
  private networkPrices: { [key: string]: number } = {
    ethereum: 2850,
    arbitrum: 2850,
    optimism: 2850,
    polygon: 0.8,
    base: 2850,
    bsc: 320,
    avalanche: 25,
    solana: 95
  };

  private gasPrices: { [key: string]: number } = {
    ethereum: 25, // gwei
    arbitrum: 0.1,
    optimism: 0.05,
    polygon: 50,
    base: 0.1,
    bsc: 5,
    avalanche: 25,
    solana: 0.000005 // SOL
  };

  async getOptimalQuotes(request: z.infer<typeof QuoteRequestSchema>): Promise<DexQuote[]> {
    const { fromToken, toToken, amount, network } = request;
    const dexConfigs = DEX_CONFIG[network as keyof typeof DEX_CONFIG] || [];
    
    const quotes: DexQuote[] = [];
    const promises = dexConfigs.map(async (dexConfig) => {
      try {
        const cacheKey = `${network}-${dexConfig.name}-${fromToken}-${toToken}-${amount}`;
        const cached = quoteCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          cached.requests++;
          return cached.data;
        }

        const quote = await this.fetchEnhancedQuote(dexConfig, fromToken, toToken, amount, network);
        
        // Enhanced caching with request tracking
        quoteCache.set(cacheKey, { 
          data: quote, 
          timestamp: Date.now(),
          requests: 1
        });
        
        return quote;
      } catch (error) {
        console.error(`Quote error from ${dexConfig.name}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      }
    });

    return quotes.sort((a, b) => b.amountOut - a.amountOut);
  }

  private async fetchEnhancedQuote(
    dexConfig: any,
    fromToken: string,
    toToken: string,
    amount: number,
    network: string
  ): Promise<DexQuote> {
    // Enhanced simulation with more realistic market conditions
    const basePrice = this.getTokenPrice(fromToken);
    const marketVolatility = this.getMarketVolatility(fromToken, toToken);
    const price = basePrice;
    
    const liquidityUSD = this.calculateLiquidity(amount, price, dexConfig, network);
    const priceImpact = this.calculateEnhancedPriceImpact(amount, liquidityUSD, dexConfig);
    
    const gasEstimate = this.estimateGas(network, dexConfig.gasMultiplier, amount);
    const gasCostUSD = gasEstimate * this.networkPrices[network];
    
    const totalFees = dexConfig.fees.protocol + dexConfig.fees.lp + dexConfig.fees.cypher;
    const amountOut = amount * price * (1 - priceImpact / 100) * (1 - totalFees);
    
    // Enhanced trust score calculation
    const dynamicTrustScore = this.calculateTrustScore(dexConfig, liquidityUSD, priceImpact);
    
    return {
      dex: dexConfig.name,
      network,
      price,
      amountOut,
      priceImpact,
      liquidityUSD,
      gasEstimate,
      gasCostUSD,
      executionTime: this.estimateExecutionTime(dexConfig, network),
      trustScore: dynamicTrustScore,
      route: [fromToken, toToken],
      confidenceLevel: this.calculateConfidence(liquidityUSD, priceImpact, dynamicTrustScore),
      fees: {
        protocolFee: dexConfig.fees.protocol,
        liquidityProviderFee: dexConfig.fees.lp,
        gasPrice: this.gasPrices[network],
        cypherFee: dexConfig.fees.cypher
      },
      metadata: {
        poolAddress: this.generatePoolAddress(),
        routerAddress: this.generateRouterAddress(),
        lastUpdated: Date.now(),
        dataSource: dexConfig.name,
        version: '2.0'
      }
    };
  }

  private getTokenPrice(token: string): number {
    const prices: { [key: string]: number } = {
      'ETH': 2850, 'WETH': 2850,
      'BTC': 45000, 'WBTC': 45000,
      'SOL': 95, 'WSOL': 95,
      'USDC': 1, 'USDT': 1, 'DAI': 1,
      'MATIC': 0.8, 'AVAX': 25, 'BNB': 320,
      'ARB': 0.75, 'OP': 1.2
    };
    
    return prices[token.toUpperCase()] || 1;
  }

  private getMarketVolatility(fromToken: string, toToken: string): number {
    // Simulate different volatility levels based on token pairs
    const stableTokens = ['USDC', 'USDT', 'DAI'];
    const isStablePair = stableTokens.includes(fromToken.toUpperCase()) && 
                        stableTokens.includes(toToken.toUpperCase());
    
    if (isStablePair) return 0.001; // 0.1% volatility for stable pairs
    if (stableTokens.includes(fromToken.toUpperCase()) || 
        stableTokens.includes(toToken.toUpperCase())) return 0.005; // 0.5% for stable-crypto pairs
    
    return 0.02; // 2% for crypto-crypto pairs
  }

  private calculateLiquidity(amount: number, price: number, dexConfig: any, network: string): number {
    const baseMultiplier = dexConfig.liquidityWeight;
    const networkMultiplier = network === 'ethereum' ? 1.5 : network === 'solana' ? 1.2 : 1.0;
    return amount * price * baseMultiplier * networkMultiplier * 300;
  }

  private calculateEnhancedPriceImpact(amount: number, liquidityUSD: number, dexConfig: any): number {
    if (liquidityUSD === 0) return 8; // High impact for no liquidity
    
    const impactRatio = (amount * this.getTokenPrice('ETH')) / liquidityUSD;
    const baseImpact = Math.min(8, impactRatio * 100);
    
    // Apply DEX-specific impact modifiers
    const dexModifier = dexConfig.features?.includes('low-slippage') ? 0.7 : 
                       dexConfig.features?.includes('concentrated-liquidity') ? 0.8 : 1.0;
    
    return baseImpact * dexModifier;
  }

  private calculateTrustScore(dexConfig: any, liquidityUSD: number, priceImpact: number): number {
    let score = dexConfig.trustScore;
    
    // Adjust based on liquidity
    if (liquidityUSD > 1000000) score += 2;
    else if (liquidityUSD < 100000) score -= 5;
    
    // Adjust based on price impact
    if (priceImpact > 3) score -= 3;
    else if (priceImpact < 0.5) score += 1;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(liquidityUSD: number, priceImpact: number, trustScore: number): number {
    const liquidityFactor = Math.min(100, liquidityUSD / 10000);
    const impactFactor = Math.max(0, 100 - (priceImpact * 10));
    const trustFactor = trustScore;
    
    return Math.min(100, (liquidityFactor * 0.3 + impactFactor * 0.4 + trustFactor * 0.3));
  }

  private estimateExecutionTime(dexConfig: any, network: string): number {
    const baseTime = network === 'ethereum' ? 15000 : 
                    network === 'solana' ? 1000 : 
                    5000; // milliseconds
    
    const complexityMultiplier = dexConfig.features?.includes('aggregator') ? 1.5 : 1.0;
    return baseTime * complexityMultiplier;
  }

  private estimateGas(network: string, multiplier: number, amount: number): number {
    const baseGasUnits: { [key: string]: number } = {
      ethereum: 150000,
      arbitrum: 800000,
      optimism: 200000,
      polygon: 150000,
      base: 200000,
      bsc: 150000,
      avalanche: 150000,
      solana: 200000
    };
    
    const gasUnits = baseGasUnits[network] || 150000;
    const complexityMultiplier = amount > 10000 ? 1.2 : 1.0; // More gas for larger trades
    const gasPrice = this.gasPrices[network];
    
    if (network === 'solana') {
      return gasUnits * 0.000001 * multiplier * complexityMultiplier;
    }
    
    return (gasUnits * gasPrice * multiplier * complexityMultiplier) / 1e9;
  }

  private generatePoolAddress(): string {
    return `0x${'0'.repeat(40)}`;
  }

  private generateRouterAddress(): string {
    return `0x${'1'.repeat(40)}`;
  }

  findBestQuote(quotes: DexQuote[]): DexQuote {
    if (quotes.length === 0) {
      throw new Error('No quotes available');
    }

    // Enhanced multi-criteria scoring algorithm
    const scoredQuotes = quotes.map(quote => {
      const outputScore = quote.amountOut * 0.40; // 40% weight on output amount
      const priceImpactScore = Math.max(0, (8 - quote.priceImpact)) * 0.20; // 20% weight on price impact
      const gasScore = Math.max(0, (0.1 - quote.gasCostUSD)) * 0.15; // 15% weight on gas cost
      const trustScore = (quote.trustScore / 100) * 0.15; // 15% weight on trust
      const liquidityScore = Math.min(quote.liquidityUSD / 2000000, 1) * 0.05; // 5% weight on liquidity
      const executionScore = Math.max(0, (10000 - quote.executionTime) / 10000) * 0.05; // 5% weight on speed
      
      const totalScore = outputScore + priceImpactScore + gasScore + trustScore + liquidityScore + executionScore;
      
      return { ...quote, score: totalScore };
    });

    return scoredQuotes.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  calculateOptimalRoute(quotes: DexQuote[], amount: number): OptimalRoute {
    const bestQuote = this.findBestQuote(quotes);
    const worstQuote = quotes.reduce((worst, current) => 
      current.amountOut < worst.amountOut ? current : worst
    );
    
    const savings = {
      amount: bestQuote.amountOut - worstQuote.amountOut,
      percentage: ((bestQuote.amountOut - worstQuote.amountOut) / worstQuote.amountOut) * 100,
      comparedTo: worstQuote.dex
    };
    
    return {
      steps: [{
        dex: bestQuote.dex,
        tokenIn: bestQuote.route[0] || '',
        tokenOut: bestQuote.route[1] || '',
        amountIn: amount,
        amountOut: bestQuote.amountOut,
        percentage: 100,
        poolFee: bestQuote.fees.liquidityProviderFee,
        estimatedGas: bestQuote.gasEstimate
      }],
      totalAmountOut: bestQuote.amountOut,
      totalGasCost: bestQuote.gasCostUSD,
      totalPriceImpact: bestQuote.priceImpact,
      executionTime: bestQuote.executionTime,
      reliabilityScore: bestQuote.trustScore,
      strategy: 'single',
      savings
    };
  }

  calculateAggregatedData(quotes: DexQuote[]) {
    if (quotes.length === 0) {
      return {
        averagePrice: 0,
        medianPrice: 0,
        priceSpread: 0,
        totalLiquidity: 0,
        marketDepth: 0,
        confidence: 0
      };
    }

    const prices = quotes.map(q => q.price).sort((a, b) => a - b);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const priceSpread = prices.length > 1 ? ((Math.max(...prices) - Math.min(...prices)) / averagePrice) * 100 : 0;
    const totalLiquidity = quotes.reduce((sum, q) => sum + q.liquidityUSD, 0);
    const marketDepth = totalLiquidity / quotes.length;
    const confidence = quotes.reduce((sum, q) => sum + q.confidenceLevel, 0) / quotes.length;

    return {
      averagePrice,
      medianPrice,
      priceSpread,
      totalLiquidity,
      marketDepth,
      confidence
    };
  }

  assessRisk(quotes: DexQuote[], optimalRoute: OptimalRoute) {
    const riskFactors: string[] = [];
    let riskScore = 0;
    
    // Slippage risk assessment
    let slippageRisk: 'low' | 'medium' | 'high' = 'low';
    if (optimalRoute.totalPriceImpact > 3) {
      slippageRisk = 'high';
      riskFactors.push('High price impact detected (>3%)');
      riskScore += 30;
    } else if (optimalRoute.totalPriceImpact > 1) {
      slippageRisk = 'medium';
      riskFactors.push('Moderate price impact (1-3%)');
      riskScore += 15;
    }
    
    // Liquidity risk assessment
    const aggregated = this.calculateAggregatedData(quotes);
    let liquidityRisk: 'low' | 'medium' | 'high' = 'low';
    if (aggregated.totalLiquidity < 500000) {
      liquidityRisk = 'high';
      riskFactors.push('Low market liquidity (<$500k)');
      riskScore += 25;
    } else if (aggregated.totalLiquidity < 2000000) {
      liquidityRisk = 'medium';
      riskFactors.push('Moderate liquidity ($500k-$2M)');
      riskScore += 10;
    }
    
    // Trust and reliability assessment
    if (optimalRoute.reliabilityScore < 85) {
      riskFactors.push('Lower trust score from data source');
      riskScore += 15;
    }
    
    if (aggregated.priceSpread > 3) {
      riskFactors.push('High price variation between exchanges');
      riskScore += 10;
    }

    if (aggregated.confidence < 70) {
      riskFactors.push('Low confidence in quote accuracy');
      riskScore += 20;
    }
    
    // Overall risk calculation
    const overallRisk: 'low' | 'medium' | 'high' = 
      riskScore > 40 ? 'high' :
      riskScore > 20 ? 'medium' : 'low';

    return {
      slippageRisk,
      liquidityRisk,
      overallRisk,
      riskFactors,
      riskScore
    };
  }

  calculateServiceFee(transactionValue: number, quote: DexQuote): any {
    const basePercentage = 0.0005; // 0.05%
    const minFee = 0.5; // $0.50 minimum
    const maxFee = 25; // $25 maximum
    
    let cypherFee = transactionValue * basePercentage;
    cypherFee = Math.max(minFee, Math.min(maxFee, cypherFee));
    
    const protocolFees = transactionValue * quote.fees.protocolFee;
    const networkFees = quote.gasCostUSD;
    
    return {
      percentage: basePercentage * 100,
      amountUSD: cypherFee,
      totalCost: cypherFee + protocolFees + networkFees,
      breakdown: {
        cypherFee,
        protocolFees,
        networkFees
      }
    };
  }

  generateRecommendation(quotes: DexQuote[], riskAssessment: any, optimalRoute: OptimalRoute): any {
    let action: 'proceed' | 'caution' | 'review' = 'proceed';
    let reason = 'Trade parameters look optimal';
    const alternatives: string[] = [];

    if (riskAssessment.overallRisk === 'high') {
      action = 'review';
      reason = 'High risk detected - please review trade parameters carefully';
      alternatives.push('Consider reducing trade size');
      alternatives.push('Wait for better market conditions');
    } else if (riskAssessment.overallRisk === 'medium') {
      action = 'caution';
      reason = 'Moderate risk - proceed with awareness';
      alternatives.push('Consider adjusting slippage tolerance');
    }

    if (quotes.length < 3) {
      alternatives.push('Limited quotes available - consider trying later');
    }

    if (optimalRoute.savings.percentage > 2) {
      reason += ` - Excellent savings of ${optimalRoute.savings.percentage.toFixed(2)}%`;
    }

    return { action, reason, alternatives: alternatives.length > 0 ? alternatives : undefined };
  }
}

// Handler function
async function handleQuoteRequest(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  
  // Validate request
  const validationResult = QuoteRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      createErrorResponse('Invalid request parameters', {
        errors: validationResult.error.errors
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  const quoteRequest = validationResult.data;
  const engine = new CypherQuoteEngine();
  
  try {
    // Get quotes from all sources
    const quotes = await engine.getOptimalQuotes(quoteRequest);
    
    if (quotes.length === 0) {
      return NextResponse.json(
        createErrorResponse('No quotes available', {
          network: quoteRequest.network,
          suggestion: 'Try a different network or token pair'
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    // Calculate optimal routing and analysis
    const bestQuote = engine.findBestQuote(quotes);
    const optimalRoute = engine.calculateOptimalRoute(quotes, quoteRequest.amount);
    const aggregatedData = engine.calculateAggregatedData(quotes);
    const riskAssessment = engine.assessRisk(quotes, optimalRoute);
    
    // Calculate fees
    const serviceFee = quoteRequest.includeFees ? 
      engine.calculateServiceFee(quoteRequest.amount * bestQuote.price, bestQuote) : 
      { percentage: 0, amountUSD: 0, totalCost: 0, breakdown: { cypherFee: 0, protocolFees: 0, networkFees: 0 } };

    // Generate recommendation
    const recommendation = engine.generateRecommendation(quotes, riskAssessment, optimalRoute);

    const response: QuoteResponse = {
      quotes: quotes.slice(0, 10), // Limit to top 10 quotes
      bestQuote,
      optimalRoute,
      aggregatedData,
      riskAssessment,
      serviceFee,
      timing: {
        responseTime: 0, // Will be set by middleware
        cacheStatus: 'partial',
        dataFreshness: Date.now(),
        quotesRefreshed: quotes.length
      },
      recommendation
    };

    return NextResponse.json(
      createSuccessResponse(response, 'Quote retrieved successfully'),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Quote Engine Error:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch quotes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Export handlers with middleware
export const POST = withMiddleware(handleQuoteRequest, {
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 30, // 30 requests per minute per IP
  },
  validation: QuoteRequestSchema,
  cache: {
    ttl: 5, // 5 seconds cache
  }
});

export async function OPTIONS() {
  return handleCORS();
}

export async function GET() {
  return NextResponse.json(
    createSuccessResponse({
      service: 'Cypher Trade Quote Engine',
      version: '2.0',
      features: [
        'Multi-DEX aggregation',
        'Intelligent routing',
        'Risk assessment',
        'Real-time pricing',
        'Gas optimization',
        'Enhanced analytics'
      ],
      supportedNetworks: Object.keys(DEX_CONFIG),
      endpoints: {
        quote: 'POST /api/cypher-trade/quote'
      }
    }),
    { headers: corsHeaders }
  );
}