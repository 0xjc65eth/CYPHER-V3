// Local imports for use within this file
import type { DexQuote, OptimalRoute, TrustScore } from './quoteEngine';
import type { GasEstimate } from './gasEstimation';
import type { PriceImpactResult } from './priceImpactCalculator';

// Quote Engine - Sistema principal de cotações
export type {
  DexQuote,
  OptimalRoute,
  RouteStep
} from './quoteEngine';

// Routing Algorithm - Algoritmo inteligente de roteamento
export { IntelligentRoutingEngine } from './routingAlgorithm';
export type {
  RoutingOptions,
  PathSegment,
  RoutingPath
} from './routingAlgorithm';

// Gas Estimation - Sistema avançado de estimativa de gas
export { AdvancedGasEstimator } from './gasEstimation';
export type {
  NetworkConfig,
  GasPrice,
  GasEstimate,
  SwapGasData
} from './gasEstimation';

// Price Impact Calculator - Calculadora de impacto no preço
export { AdvancedPriceImpactCalculator } from './priceImpactCalculator';
export type {
  PoolData,
  PriceImpactResult,
  AggregatedImpact,
  SlippageScenario
} from './priceImpactCalculator';

// DEX Trust System - Sistema de confiança por DEX
export { DexTrustSystem } from './quoteEngine';
export type {
  DexMetrics,
  TrustScore,
  DexRanking
} from './quoteEngine';

// Utility functions for the entire quote system
export const QuoteEngineUtils = {
  /**
   * Combina múltiplas quotes em uma análise consolidada
   */
  consolidateQuotes: (quotes: DexQuote[]): {
    bestPrice: DexQuote;
    averagePrice: number;
    priceSpread: number;
    totalLiquidity: number;
    recommendedDex: string;
  } => {
    if (quotes.length === 0) {
      throw new Error('Nenhuma cotação fornecida');
    }

    const bestPrice = quotes.reduce((best, current) => 
      current.amountOut > best.amountOut ? current : best
    );

    const averagePrice = quotes.reduce((sum, quote) => sum + quote.price, 0) / quotes.length;
    const prices = quotes.map(q => q.price);
    const priceSpread = ((Math.max(...prices) - Math.min(...prices)) / averagePrice) * 100;
    const totalLiquidity = quotes.reduce((sum, quote) => sum + quote.liquidityUSD, 0);

    // Algoritmo para recomendar DEX baseado em múltiplos fatores
    const scoredQuotes = quotes.map(quote => {
      const priceScore = quote.amountOut * 0.4;
      const trustScore = quote.trustScore * 0.3;
      const liquidityScore = Math.min(quote.liquidityUSD / 1000000, 1) * 0.2;
      const gasScore = Math.max(0, (50 - quote.gasCostUSD) / 50) * 0.1;
      
      return {
        dex: quote.dex,
        score: priceScore + trustScore + liquidityScore + gasScore
      };
    });

    const recommendedDex = scoredQuotes.reduce((best, current) => 
      current.score > best.score ? current : best
    ).dex;

    return {
      bestPrice,
      averagePrice,
      priceSpread,
      totalLiquidity,
      recommendedDex
    };
  },

  /**
   * Valida se uma quote é segura para execução
   */
  validateQuote: (quote: DexQuote, userParams: {
    maxSlippage: number;
    maxGasCost: number;
    minTrustScore: number;
  }): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } => {
    const warnings: string[] = [];
    const errors: string[] = [];
    let isValid = true;

    if (quote.priceImpact > userParams.maxSlippage) {
      errors.push(`Price impact (${quote.priceImpact.toFixed(2)}%) excede tolerância (${userParams.maxSlippage}%)`);
      isValid = false;
    }

    if (quote.gasCostUSD > userParams.maxGasCost) {
      errors.push(`Custo de gas ($${quote.gasCostUSD.toFixed(2)}) excede limite ($${userParams.maxGasCost})`);
      isValid = false;
    }

    if (quote.trustScore < userParams.minTrustScore) {
      errors.push(`Trust score (${quote.trustScore}) abaixo do mínimo (${userParams.minTrustScore})`);
      isValid = false;
    }

    if (quote.priceImpact > 2) {
      warnings.push('Alto price impact detectado');
    }

    if (quote.liquidityUSD < 100000) {
      warnings.push('Baixa liquidez no DEX');
    }

    if (quote.executionTime > 30000) {
      warnings.push('Tempo de execução pode ser lento');
    }

    return { isValid, warnings, errors };
  },

  /**
   * Formata dados de quote para exibição
   */
  formatQuoteForDisplay: (quote: DexQuote): {
    dex: string;
    formattedPrice: string;
    formattedAmount: string;
    formattedGas: string;
    riskLevel: 'low' | 'medium' | 'high';
    efficiency: string;
  } => {
    const riskLevel = quote.priceImpact > 2 ? 'high' : 
                     quote.priceImpact > 0.5 ? 'medium' : 'low';

    const efficiency = quote.gasCostUSD < 5 ? 'excelente' :
                      quote.gasCostUSD < 15 ? 'boa' :
                      quote.gasCostUSD < 30 ? 'moderada' : 'ruim';

    return {
      dex: quote.dex.replace('_', ' '),
      formattedPrice: `$${quote.price.toFixed(6)}`,
      formattedAmount: `${quote.amountOut.toFixed(6)}`,
      formattedGas: `$${quote.gasCostUSD.toFixed(2)}`,
      riskLevel,
      efficiency
    };
  },

  /**
   * Calcula economia entre diferentes quotes
   */
  calculateSavings: (quotes: DexQuote[]): {
    bestQuote: DexQuote;
    worstQuote: DexQuote;
    absoluteSavings: number;
    percentageSavings: number;
    recommendation: string;
  } => {
    if (quotes.length < 2) {
      throw new Error('Pelo menos 2 quotes necessárias para comparação');
    }

    const sortedByOutput = [...quotes].sort((a, b) => b.amountOut - a.amountOut);
    const bestQuote = sortedByOutput[0];
    const worstQuote = sortedByOutput[sortedByOutput.length - 1];

    const absoluteSavings = bestQuote.amountOut - worstQuote.amountOut;
    const percentageSavings = (absoluteSavings / worstQuote.amountOut) * 100;

    let recommendation = '';
    if (percentageSavings > 5) {
      recommendation = 'Grandes diferenças entre DEXs - escolha cuidadosamente';
    } else if (percentageSavings > 1) {
      recommendation = 'Diferenças significativas - vale a pena comparar';
    } else {
      recommendation = 'Preços similares - priorize outros fatores';
    }

    return {
      bestQuote,
      worstQuote,
      absoluteSavings,
      percentageSavings,
      recommendation
    };
  }
};

// Constantes úteis para o sistema
export const QUOTE_ENGINE_CONSTANTS = {
  NETWORKS: {
    ETHEREUM: 'ethereum',
    ARBITRUM: 'arbitrum',
    OPTIMISM: 'optimism',
    POLYGON: 'polygon',
    BASE: 'base',
    BSC: 'bsc',
    AVALANCHE: 'avalanche',
    SOLANA: 'solana'
  },
  
  DEX_NAMES: {
    UNISWAP_V3: 'UNISWAP_V3',
    UNISWAP_V2: 'UNISWAP_V2',
    SUSHISWAP: 'SUSHISWAP',
    CURVE: 'CURVE',
    BALANCER: 'BALANCER',
    ONEINCH: '1INCH',
    JUPITER: 'JUPITER',
    ORCA: 'ORCA',
    RAYDIUM: 'RAYDIUM',
    PANCAKESWAP: 'PANCAKESWAP'
  },

  RISK_LEVELS: {
    VERY_LOW: 'very_low',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    VERY_HIGH: 'very_high'
  },

  CACHE_TTL: {
    QUOTES: 5000, // 5 segundos
    GAS_PRICES: 10000, // 10 segundos
    POOL_DATA: 30000, // 30 segundos
    TRUST_SCORES: 300000, // 5 minutos
    VOLATILITY: 600000 // 10 minutos
  },

  LIMITS: {
    MAX_SLIPPAGE: 10, // 10%
    MAX_GAS_COST: 500, // $500
    MIN_TRADE_AMOUNT: 1, // $1
    MAX_QUOTE_AGE: 30000, // 30 segundos
    MAX_HOPS: 3,
    MIN_TRUST_SCORE: 50
  }
};

// QuoteEngine stub - placeholder for quote aggregation logic
class QuoteEngine {
  async getQuotes(_params: {
    fromToken: string;
    toToken: string;
    amount: number;
    network: string;
    slippageTolerance: number;
    includeFees: boolean;
  }): Promise<DexQuote[]> {
    return [];
  }

  findBestQuote(quotes: DexQuote[]): DexQuote {
    if (quotes.length === 0) {
      throw new Error('No quotes available');
    }
    return quotes.reduce((best, current) =>
      current.amountOut > best.amountOut ? current : best
    );
  }
}

// Factory para criar instâncias pré-configuradas
export class QuoteEngineFactory {
  /**
   * Cria uma instância completa do sistema de quotes
   */
  static createFullSystem(): {
    quoteEngine: QuoteEngine;
    routingEngine: IntelligentRoutingEngine;
    gasEstimator: AdvancedGasEstimator;
    priceCalculator: AdvancedPriceImpactCalculator;
    trustSystem: DexTrustSystem;
  } {
    return {
      quoteEngine: new QuoteEngine(),
      routingEngine: new IntelligentRoutingEngine(),
      gasEstimator: new AdvancedGasEstimator(),
      priceCalculator: new AdvancedPriceImpactCalculator(),
      trustSystem: new DexTrustSystem()
    };
  }

  /**
   * Cria sistema otimizado para trading de alto volume
   */
  static createHighVolumeSystem(): {
    routingEngine: IntelligentRoutingEngine;
    priceCalculator: AdvancedPriceImpactCalculator;
    trustSystem: DexTrustSystem;
  } {
    const routingEngine = new IntelligentRoutingEngine();
    
    return {
      routingEngine,
      priceCalculator: new AdvancedPriceImpactCalculator(),
      trustSystem: new DexTrustSystem()
    };
  }

  /**
   * Cria sistema otimizado para gas efficiency
   */
  static createGasOptimizedSystem(): {
    gasEstimator: AdvancedGasEstimator;
    routingEngine: IntelligentRoutingEngine;
  } {
    return {
      gasEstimator: new AdvancedGasEstimator(),
      routingEngine: new IntelligentRoutingEngine()
    };
  }
}

// Interface principal para uso simplificado
export interface QuoteEngineInterface {
  getQuote(params: {
    fromToken: string;
    toToken: string;
    amount: number;
    network: string;
    slippageTolerance?: number;
    gasStrategy?: 'slow' | 'standard' | 'fast' | 'instant';
    includeAnalysis?: boolean;
  }): Promise<{
    bestQuote: DexQuote;
    allQuotes: DexQuote[];
    optimalRoute: OptimalRoute;
    gasEstimate: GasEstimate;
    priceImpact: PriceImpactResult;
    trustScores: { [dex: string]: TrustScore };
    recommendations: string[];
    warnings: string[];
  }>;
}

// Implementação da interface principal
export class MasterQuoteEngine implements QuoteEngineInterface {
  private quoteEngine: QuoteEngine;
  private routingEngine: IntelligentRoutingEngine;
  private gasEstimator: AdvancedGasEstimator;
  private priceCalculator: AdvancedPriceImpactCalculator;
  private trustSystem: DexTrustSystem;

  constructor() {
    const system = QuoteEngineFactory.createFullSystem();
    this.quoteEngine = system.quoteEngine;
    this.routingEngine = system.routingEngine;
    this.gasEstimator = system.gasEstimator;
    this.priceCalculator = system.priceCalculator;
    this.trustSystem = system.trustSystem;
  }

  async getQuote(params: {
    fromToken: string;
    toToken: string;
    amount: number;
    network: string;
    slippageTolerance?: number;
    gasStrategy?: 'slow' | 'standard' | 'fast' | 'instant';
    includeAnalysis?: boolean;
  }) {
    const {
      fromToken,
      toToken,
      amount,
      network,
      slippageTolerance = 0.5,
      gasStrategy = 'standard',
      includeAnalysis = true
    } = params;

    // Obter quotes de todos os DEXs
    const quotes = await this.quoteEngine.getQuotes({
      fromToken,
      toToken,
      amount,
      network,
      slippageTolerance,
      includeFees: true
    });

    // Encontrar melhor quote
    const bestQuote = this.quoteEngine.findBestQuote(quotes);

    // Calcular rota otimizada
    const optimalRoute = await this.routingEngine.findOptimalRoute(
      quotes,
      fromToken,
      toToken,
      amount,
      {
        maxSlippage: slippageTolerance,
        prioritizeCost: gasStrategy === 'slow',
        prioritizeSpeed: gasStrategy === 'fast' || gasStrategy === 'instant'
      }
    );

    // Estimar gas
    const gasEstimate = await this.gasEstimator.estimateSwapGas(
      network,
      optimalRoute.strategy === 'single' ? 'simple' : 'multi-hop',
      { from: fromToken, to: toToken },
      amount,
      { priority: gasStrategy }
    );

    // Calcular price impact se solicitado
    let priceImpact: PriceImpactResult | null = null;
    if (includeAnalysis) {
      const pools = await this.priceCalculator.getAvailablePools(fromToken, toToken, network);
      if (pools.length > 0) {
        priceImpact = this.priceCalculator.calculateSinglePoolImpact(
          pools[0],
          fromToken,
          toToken,
          amount,
          slippageTolerance
        );
      }
    }

    // Obter trust scores
    const trustScores: { [dex: string]: TrustScore } = {};
    const uniqueDexs = [...new Set(quotes.map(q => q.dex))];
    
    for (const dex of uniqueDexs) {
      trustScores[dex] = this.trustSystem.calculateTrustScore(dex, network);
    }

    // Gerar recomendações e avisos
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (bestQuote.priceImpact > 2) {
      warnings.push('Alto price impact - considere dividir a transação');
    }

    if (gasEstimate.congestionLevel === 'high') {
      recommendations.push('Rede congestionada - considere aguardar ou usar gas mais alto');
    }

    if (bestQuote.trustScore < 80) {
      warnings.push('DEX com trust score baixo - verifique segurança');
    }

    return {
      bestQuote,
      allQuotes: quotes,
      optimalRoute,
      gasEstimate,
      priceImpact: priceImpact!,
      trustScores,
      recommendations,
      warnings
    };
  }
}