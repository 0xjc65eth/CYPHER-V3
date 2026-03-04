import { DexQuote, OptimalRoute, RouteStep } from './quoteEngine';

export interface RoutingOptions {
  maxSlippage: number;
  maxGasCost: number;
  prioritizeSpeed: boolean;
  prioritizeCost: boolean;
  maxHops: number;
  splitThreshold: number; // Minimum amount to consider route splitting
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface PathSegment {
  dex: string;
  tokenIn: string;
  tokenOut: string;
  liquidityUSD: number;
  priceImpact: number;
  gasEstimate: number;
  trustScore: number;
  latency: number;
}

export interface RoutingPath {
  segments: PathSegment[];
  totalOutput: number;
  totalGasCost: number;
  totalPriceImpact: number;
  totalLatency: number;
  reliabilityScore: number;
  complexity: number;
  strategy: 'direct' | 'multi-hop' | 'split' | 'hybrid';
}

export class IntelligentRoutingEngine {
  private readonly DEFAULT_OPTIONS: RoutingOptions = {
    maxSlippage: 1.0,
    maxGasCost: 100, // USD
    prioritizeSpeed: false,
    prioritizeCost: true,
    maxHops: 3,
    splitThreshold: 1000, // USD
    riskTolerance: 'medium'
  };

  private tokenGraph: Map<string, Map<string, PathSegment[]>> = new Map();
  private liquidityCache: Map<string, number> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  constructor() {
    this.initializeTokenGraph();
  }

  /**
   * Encontra a rota mais otimizada para um trade
   */
  async findOptimalRoute(
    quotes: DexQuote[],
    fromToken: string,
    toToken: string,
    amount: number,
    options: Partial<RoutingOptions> = {}
  ): Promise<OptimalRoute> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Atualizar grafo de tokens com quotes atuais
    this.updateTokenGraph(quotes, fromToken, toToken);
    
    // Gerar todas as possíveis rotas
    const allPaths = await this.generateAllPaths(fromToken, toToken, amount, opts);
    
    // Avaliar e ranquear rotas
    const evaluatedPaths = this.evaluatePaths(allPaths, amount, opts);
    
    // Selecionar melhor rota baseada nas opções
    const bestPath = this.selectBestPath(evaluatedPaths, opts);
    
    if (!bestPath) {
      throw new Error('Nenhuma rota viável encontrada');
    }

    // Verificar se vale a pena dividir a rota
    const splitRoute = await this.considerRouteSplitting(bestPath, amount, opts);
    
    return this.convertToOptimalRoute(splitRoute || bestPath, amount);
  }

  /**
   * Inicializa o grafo de tokens com pares conhecidos
   */
  private initializeTokenGraph(): void {
    // Tokens base comuns para cada rede
    const baseTokens = {
      ethereum: ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC'],
      arbitrum: ['ETH', 'WETH', 'USDC', 'USDT', 'ARB'],
      optimism: ['ETH', 'WETH', 'USDC', 'USDT', 'OP'],
      polygon: ['MATIC', 'WMATIC', 'USDC', 'USDT', 'DAI'],
      base: ['ETH', 'WETH', 'USDC', 'USDbC'],
      bsc: ['BNB', 'WBNB', 'USDT', 'USDC', 'BUSD'],
      avalanche: ['AVAX', 'WAVAX', 'USDC', 'USDT'],
      solana: ['SOL', 'WSOL', 'USDC', 'USDT']
    };

    // Inicializar grafo vazio
    Object.values(baseTokens).flat().forEach(token => {
      if (!this.tokenGraph.has(token)) {
        this.tokenGraph.set(token, new Map());
      }
    });
  }

  /**
   * Atualiza o grafo de tokens com quotes atuais
   */
  private updateTokenGraph(quotes: DexQuote[], fromToken: string, toToken: string): void {
    quotes.forEach(quote => {
      const segment: PathSegment = {
        dex: quote.dex,
        tokenIn: fromToken,
        tokenOut: toToken,
        liquidityUSD: quote.liquidityUSD,
        priceImpact: quote.priceImpact,
        gasEstimate: quote.gasEstimate,
        trustScore: quote.trustScore,
        latency: quote.executionTime
      };

      // Adicionar caminho direto
      if (!this.tokenGraph.has(fromToken)) {
        this.tokenGraph.set(fromToken, new Map());
      }
      
      if (!this.tokenGraph.get(fromToken)!.has(toToken)) {
        this.tokenGraph.get(fromToken)!.set(toToken, []);
      }
      
      this.tokenGraph.get(fromToken)!.get(toToken)!.push(segment);
    });
  }

  /**
   * Gera todas as possíveis rotas usando algoritmo modificado de Dijkstra
   */
  private async generateAllPaths(
    fromToken: string,
    toToken: string,
    amount: number,
    options: RoutingOptions
  ): Promise<RoutingPath[]> {
    const paths: RoutingPath[] = [];
    
    // Rota direta
    const directPaths = this.findDirectPaths(fromToken, toToken, amount);
    paths.push(...directPaths);
    
    // Rotas multi-hop (até maxHops)
    if (options.maxHops > 1) {
      const multiHopPaths = await this.findMultiHopPaths(fromToken, toToken, amount, options);
      paths.push(...multiHopPaths);
    }
    
    return paths;
  }

  /**
   * Encontra rotas diretas entre dois tokens
   */
  private findDirectPaths(fromToken: string, toToken: string, amount: number): RoutingPath[] {
    const paths: RoutingPath[] = [];
    
    const directSegments = this.tokenGraph.get(fromToken)?.get(toToken) || [];
    
    directSegments.forEach(segment => {
      const path: RoutingPath = {
        segments: [segment],
        totalOutput: this.calculateOutput(amount, [segment]),
        totalGasCost: segment.gasEstimate,
        totalPriceImpact: segment.priceImpact,
        totalLatency: segment.latency,
        reliabilityScore: segment.trustScore,
        complexity: 1,
        strategy: 'direct'
      };
      
      paths.push(path);
    });
    
    return paths;
  }

  /**
   * Encontra rotas multi-hop usando tokens intermediários
   */
  private async findMultiHopPaths(
    fromToken: string,
    toToken: string,
    amount: number,
    options: RoutingOptions
  ): Promise<RoutingPath[]> {
    const paths: RoutingPath[] = [];
    const visited = new Set<string>();
    
    // Tokens intermediários populares
    const intermediateTokens = ['USDC', 'USDT', 'ETH', 'WETH', 'DAI'];
    
    for (const intermediate of intermediateTokens) {
      if (intermediate === fromToken || intermediate === toToken) continue;
      
      try {
        const path = await this.findPathViaIntermediate(
          fromToken,
          intermediate,
          toToken,
          amount,
          options
        );
        
        if (path && this.isViablePath(path, options)) {
          paths.push(path);
        }
      } catch (error) {
        // Continuar tentando outras rotas
      }
    }
    
    return paths;
  }

  /**
   * Encontra caminho via token intermediário
   */
  private async findPathViaIntermediate(
    fromToken: string,
    intermediate: string,
    toToken: string,
    amount: number,
    options: RoutingOptions
  ): Promise<RoutingPath | null> {
    // Primeira etapa: fromToken -> intermediate
    const firstHopSegments = this.tokenGraph.get(fromToken)?.get(intermediate) || [];
    if (firstHopSegments.length === 0) return null;
    
    // Segunda etapa: intermediate -> toToken
    const secondHopSegments = this.tokenGraph.get(intermediate)?.get(toToken) || [];
    if (secondHopSegments.length === 0) return null;
    
    // Escolher melhores segmentos para cada hop
    const bestFirstHop = this.selectBestSegment(firstHopSegments, options);
    const bestSecondHop = this.selectBestSegment(secondHopSegments, options);
    
    if (!bestFirstHop || !bestSecondHop) return null;
    
    const segments = [bestFirstHop, bestSecondHop];
    
    return {
      segments,
      totalOutput: this.calculateOutput(amount, segments),
      totalGasCost: segments.reduce((sum, seg) => sum + seg.gasEstimate, 0),
      totalPriceImpact: this.calculateCumulativePriceImpact(segments),
      totalLatency: segments.reduce((sum, seg) => sum + seg.latency, 0),
      reliabilityScore: segments.reduce((sum, seg) => sum + seg.trustScore, 0) / segments.length,
      complexity: segments.length,
      strategy: 'multi-hop'
    };
  }

  /**
   * Seleciona o melhor segmento baseado nas opções
   */
  private selectBestSegment(segments: PathSegment[], options: RoutingOptions): PathSegment | null {
    if (segments.length === 0) return null;
    
    const scoredSegments = segments.map(segment => {
      let score = 0;
      
      // Pontuação baseada nas prioridades
      if (options.prioritizeCost) {
        score += (1 / (segment.gasEstimate + 1)) * 30; // 30% peso
        score += (5 - segment.priceImpact) * 20; // 20% peso
      }
      
      if (options.prioritizeSpeed) {
        score += (1 / (segment.latency + 1)) * 25; // 25% peso
      }
      
      // Confiabilidade sempre importante
      score += (segment.trustScore / 100) * 15; // 15% peso
      
      // Liquidez
      score += Math.min(segment.liquidityUSD / 1000000, 1) * 10; // 10% peso
      
      return { segment, score };
    });
    
    return scoredSegments.reduce((best, current) => 
      current.score > best.score ? current : best
    ).segment;
  }

  /**
   * Calcula output esperado para uma sequência de segmentos
   */
  private calculateOutput(inputAmount: number, segments: PathSegment[]): number {
    let currentAmount = inputAmount;
    
    for (const segment of segments) {
      // Aplicar price impact
      currentAmount = currentAmount * (1 - segment.priceImpact / 100);
      
      // Aplicar fees (estimado 0.3% por hop)
      currentAmount = currentAmount * 0.997;
    }
    
    return currentAmount;
  }

  /**
   * Calcula price impact cumulativo
   */
  private calculateCumulativePriceImpact(segments: PathSegment[]): number {
    return segments.reduce((total, segment) => {
      return total + segment.priceImpact * (1 - total / 100);
    }, 0);
  }

  /**
   * Verifica se uma rota é viável
   */
  private isViablePath(path: RoutingPath, options: RoutingOptions): boolean {
    return (
      path.totalPriceImpact <= options.maxSlippage &&
      path.totalGasCost <= options.maxGasCost &&
      path.segments.length <= options.maxHops &&
      path.reliabilityScore >= this.getMinTrustScore(options.riskTolerance)
    );
  }

  /**
   * Obtém score mínimo de confiança baseado na tolerância ao risco
   */
  private getMinTrustScore(riskTolerance: 'low' | 'medium' | 'high'): number {
    switch (riskTolerance) {
      case 'low': return 90;
      case 'medium': return 75;
      case 'high': return 60;
      default: return 75;
    }
  }

  /**
   * Avalia todas as rotas e atribui scores
   */
  private evaluatePaths(paths: RoutingPath[], amount: number, options: RoutingOptions): RoutingPath[] {
    return paths.map(path => {
      let score = 0;
      
      // Output final (40% do peso)
      score += (path.totalOutput / amount) * 40;
      
      // Custo de gas (20% do peso)
      score += Math.max(0, (options.maxGasCost - path.totalGasCost) / options.maxGasCost) * 20;
      
      // Price impact (15% do peso)
      score += Math.max(0, (options.maxSlippage - path.totalPriceImpact) / options.maxSlippage) * 15;
      
      // Velocidade (10% do peso)
      if (options.prioritizeSpeed) {
        score += Math.max(0, (10000 - path.totalLatency) / 10000) * 10;
      }
      
      // Confiabilidade (10% do peso)
      score += (path.reliabilityScore / 100) * 10;
      
      // Simplicidade (5% do peso)
      score += Math.max(0, (options.maxHops + 1 - path.complexity) / options.maxHops) * 5;
      
      return { ...path, score };
    }).sort((a, b) => (b as any).score - (a as any).score);
  }

  /**
   * Seleciona a melhor rota
   */
  private selectBestPath(evaluatedPaths: RoutingPath[], options: RoutingOptions): RoutingPath | null {
    const viablePaths = evaluatedPaths.filter(path => this.isViablePath(path, options));
    
    if (viablePaths.length === 0) return null;
    
    // Aplicar estratégia de seleção baseada nas preferências
    if (options.prioritizeSpeed) {
      return viablePaths.reduce((fastest, current) => 
        current.totalLatency < fastest.totalLatency ? current : fastest
      );
    }
    
    if (options.prioritizeCost) {
      return viablePaths.reduce((cheapest, current) => 
        (current.totalGasCost + current.totalPriceImpact) < 
        (cheapest.totalGasCost + cheapest.totalPriceImpact) ? current : cheapest
      );
    }
    
    // Retornar o melhor por score geral
    return viablePaths[0];
  }

  /**
   * Considera dividir a rota para grandes volumes
   */
  private async considerRouteSplitting(
    path: RoutingPath,
    amount: number,
    options: RoutingOptions
  ): Promise<RoutingPath | null> {
    if (amount < options.splitThreshold) return null;
    
    // Simular divisão em 2-4 rotas menores
    const splits = [2, 3, 4];
    let bestSplitPath: RoutingPath | null = null;
    let bestTotalOutput = path.totalOutput;
    
    for (const splitCount of splits) {
      try {
        const splitAmount = amount / splitCount;
        const splitPaths: RoutingPath[] = [];
        
        // Encontrar rotas para cada parte
        for (let i = 0; i < splitCount; i++) {
          // Usar diferentes DEXs se possível
          const availableSegments = path.segments.filter((_, index) => index % splitCount === i);
          if (availableSegments.length === 0) continue;
          
          const splitPath: RoutingPath = {
            ...path,
            segments: availableSegments,
            totalOutput: this.calculateOutput(splitAmount, availableSegments)
          };
          
          splitPaths.push(splitPath);
        }
        
        if (splitPaths.length === splitCount) {
          const totalSplitOutput = splitPaths.reduce((sum, p) => sum + p.totalOutput, 0);
          const totalSplitGas = splitPaths.reduce((sum, p) => sum + p.totalGasCost, 0);
          
          // Verificar se splitting é benéfico
          if (totalSplitOutput > bestTotalOutput && totalSplitGas <= options.maxGasCost) {
            bestSplitPath = {
              segments: splitPaths.flatMap(p => p.segments),
              totalOutput: totalSplitOutput,
              totalGasCost: totalSplitGas,
              totalPriceImpact: Math.max(...splitPaths.map(p => p.totalPriceImpact)),
              totalLatency: Math.max(...splitPaths.map(p => p.totalLatency)),
              reliabilityScore: splitPaths.reduce((sum, p) => sum + p.reliabilityScore, 0) / splitPaths.length,
              complexity: splitPaths.length,
              strategy: 'split'
            };
            bestTotalOutput = totalSplitOutput;
          }
        }
      } catch (error) {
        // Continuar tentando outros splits
      }
    }
    
    return bestSplitPath;
  }

  /**
   * Converte RoutingPath para OptimalRoute
   */
  private convertToOptimalRoute(path: RoutingPath, originalAmount: number): OptimalRoute {
    const steps: RouteStep[] = path.segments.map((segment, index) => ({
      dex: segment.dex,
      tokenIn: segment.tokenIn,
      tokenOut: segment.tokenOut,
      amountIn: originalAmount / path.segments.length, // Simplificado
      amountOut: path.totalOutput / path.segments.length, // Simplificado
      percentage: 100 / path.segments.length
    }));

    return {
      steps,
      totalAmountOut: path.totalOutput,
      totalGasCost: path.totalGasCost,
      totalPriceImpact: path.totalPriceImpact,
      executionTime: path.totalLatency,
      reliabilityScore: path.reliabilityScore,
      strategy: path.strategy === 'direct' ? 'single' : 
                path.strategy === 'split' ? 'split' : 'multi-hop'
    };
  }

  /**
   * Otimiza rota existente baseada em condições em tempo real
   */
  async optimizeRoute(
    currentRoute: OptimalRoute,
    marketConditions: { volatility: number; congestion: number }
  ): Promise<OptimalRoute> {
    // Ajustar parâmetros baseado nas condições do mercado
    const adjustedOptions: Partial<RoutingOptions> = {};
    
    if (marketConditions.volatility > 0.05) {
      adjustedOptions.maxSlippage = Math.min(2.0, currentRoute.totalPriceImpact * 1.5);
      adjustedOptions.prioritizeSpeed = true;
    }
    
    if (marketConditions.congestion > 0.7) {
      adjustedOptions.maxGasCost = currentRoute.totalGasCost * 2;
      adjustedOptions.prioritizeCost = false;
    }
    
    // Re-calcular rota com novos parâmetros se necessário
    return currentRoute; // Simplificado para demo
  }
}

