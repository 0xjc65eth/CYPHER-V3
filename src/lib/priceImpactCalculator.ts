export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  reserve0: number;
  reserve1: number;
  totalLiquidity: number;
  fee: number; // Protocol fee (0.003 = 0.3%)
  dex: string;
  network: string;
  volume24h: number;
  lastUpdated: number;
}

export interface PriceImpactResult {
  priceImpact: number; // Percentage
  amountOut: number;
  minimumAmountOut: number;
  effectivePrice: number;
  marketPrice: number;
  slippageToleranceReached: boolean;
  liquidityUtilization: number; // Percentage of pool liquidity used
  warnings: string[];
  breakdown: {
    swapFees: number;
    protocolFees: number;
    priceMovement: number;
    totalCost: number;
  };
}

export interface AggregatedImpact {
  totalPriceImpact: number;
  weightedAverageImpact: number;
  bestSinglePool: PriceImpactResult;
  worstSinglePool: PriceImpactResult;
  liquidityDistribution: { dex: string; percentage: number; impact: number }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'extreme';
    factors: string[];
    recommendation: string;
  };
}

export interface SlippageScenario {
  slippageTolerance: number;
  expectedAmountOut: number;
  minimumAmountOut: number;
  probability: number; // Chance of execution within tolerance
  riskLevel: 'low' | 'medium' | 'high';
}

export class AdvancedPriceImpactCalculator {
  private poolCache: Map<string, PoolData> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private volatilityCache: Map<string, { volatility: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 segundos

  constructor() {
    this.initializeMockPools();
  }

  /**
   * Calcula price impact para um único pool
   */
  calculateSinglePoolImpact(
    pool: PoolData,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    slippageTolerance: number = 0.5
  ): PriceImpactResult {
    const warnings: string[] = [];
    
    // Determinar direção do swap
    const isToken0ToToken1 = tokenIn.toLowerCase() === pool.token0.toLowerCase();
    const reserveIn = isToken0ToToken1 ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0ToToken1 ? pool.reserve1 : pool.reserve0;

    // Verificar liquidez suficiente
    if (amountIn >= reserveIn * 0.3) {
      warnings.push('Transação usa mais de 30% da liquidez do pool');
    }

    // Calcular preço de mercado atual
    const marketPrice = reserveOut / reserveIn;
    
    // Aplicar taxa do protocolo
    const amountInAfterFee = amountIn * (1 - pool.fee);
    
    // Fórmula AMM: y = x * k / (x + dx)
    // onde k = reserveIn * reserveOut (produto constante)
    const k = reserveIn * reserveOut;
    const newReserveIn = reserveIn + amountInAfterFee;
    const newReserveOut = k / newReserveIn;
    const amountOut = reserveOut - newReserveOut;

    // Calcular preço efetivo
    const effectivePrice = amountOut / amountIn;
    
    // Calcular price impact
    const priceImpact = ((marketPrice - effectivePrice) / marketPrice) * 100;
    
    // Calcular amount out mínimo baseado na tolerância de slippage
    const minimumAmountOut = amountOut * (1 - slippageTolerance / 100);
    
    // Verificar se slippage tolerance foi atingida
    const slippageToleranceReached = priceImpact > slippageTolerance;
    
    // Calcular utilização da liquidez
    const liquidityUtilization = (amountIn / reserveIn) * 100;
    
    // Verificações adicionais
    if (liquidityUtilization > 50) {
      warnings.push('Alto impacto na liquidez - considere dividir a transação');
    }
    
    if (priceImpact > 5) {
      warnings.push('Price impact muito alto - verifique parâmetros da transação');
    }
    
    if (pool.volume24h < amountIn * 10) {
      warnings.push('Volume diário baixo - risco de baixa liquidez');
    }

    // Breakdown dos custos
    const breakdown = {
      swapFees: amountIn * pool.fee,
      protocolFees: 0, // Simplificado
      priceMovement: amountIn * (priceImpact / 100),
      totalCost: amountIn * (pool.fee + priceImpact / 100)
    };

    return {
      priceImpact: Math.abs(priceImpact),
      amountOut,
      minimumAmountOut,
      effectivePrice,
      marketPrice,
      slippageToleranceReached,
      liquidityUtilization,
      warnings,
      breakdown
    };
  }

  /**
   * Calcula price impact agregado através de múltiplos pools
   */
  async calculateAggregatedImpact(
    pools: PoolData[],
    tokenIn: string,
    tokenOut: string,
    totalAmountIn: number,
    strategy: 'best_price' | 'min_impact' | 'balanced' = 'balanced'
  ): Promise<AggregatedImpact> {
    if (pools.length === 0) {
      throw new Error('Nenhum pool disponível para cálculo');
    }

    // Calcular impact para cada pool individualmente
    const individualImpacts = pools.map(pool => ({
      pool,
      impact: this.calculateSinglePoolImpact(pool, tokenIn, tokenOut, totalAmountIn)
    }));

    // Ordenar pools baseado na estratégia
    const sortedPools = this.sortPoolsByStrategy(individualImpacts, strategy);
    
    // Distribuir amount entre pools para minimizar impact
    const distribution = await this.optimizeAmountDistribution(
      sortedPools,
      tokenIn,
      tokenOut,
      totalAmountIn,
      strategy
    );

    // Calcular impact total
    let totalAmountOut = 0;
    let weightedImpact = 0;
    let totalSwapFees = 0;

    const liquidityDistribution = distribution.map(({ pool, amount, percentage }) => {
      const impact = this.calculateSinglePoolImpact(pool, tokenIn, tokenOut, amount);
      totalAmountOut += impact.amountOut;
      weightedImpact += impact.priceImpact * percentage;
      totalSwapFees += impact.breakdown.swapFees;

      return {
        dex: pool.dex,
        percentage: percentage * 100,
        impact: impact.priceImpact
      };
    });

    // Encontrar melhor e pior pool
    const bestSinglePool = individualImpacts.reduce((best, current) => 
      current.impact.priceImpact < best.impact.priceImpact ? current : best
    ).impact;

    const worstSinglePool = individualImpacts.reduce((worst, current) => 
      current.impact.priceImpact > worst.impact.priceImpact ? current : worst
    ).impact;

    // Avaliar risco
    const riskAssessment = this.assessAggregatedRisk(individualImpacts, weightedImpact);

    return {
      totalPriceImpact: weightedImpact,
      weightedAverageImpact: weightedImpact,
      bestSinglePool,
      worstSinglePool,
      liquidityDistribution,
      riskAssessment
    };
  }

  /**
   * Simula diferentes cenários de slippage
   */
  simulateSlippageScenarios(
    pool: PoolData,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    scenarios: number[] = [0.1, 0.5, 1.0, 2.0, 5.0]
  ): SlippageScenario[] {
    return scenarios.map(slippage => {
      const impact = this.calculateSinglePoolImpact(pool, tokenIn, tokenOut, amountIn, slippage);
      
      // Simular probabilidade baseada em volatilidade histórica
      const volatility = this.getTokenVolatility(tokenIn, tokenOut);
      const probability = this.calculateExecutionProbability(impact.priceImpact, slippage, volatility);
      
      const riskLevel = this.categorizeRiskLevel(impact.priceImpact, slippage);

      return {
        slippageTolerance: slippage,
        expectedAmountOut: impact.amountOut,
        minimumAmountOut: impact.minimumAmountOut,
        probability,
        riskLevel
      };
    });
  }

  /**
   * Calcula MEV (Maximal Extractable Value) risk
   */
  calculateMEVRisk(
    pools: PoolData[],
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): {
    mevRisk: 'low' | 'medium' | 'high' | 'extreme';
    potentialLoss: number;
    protectionRecommendations: string[];
    sandwichAttackRisk: number;
  } {
    const recommendations: string[] = [];
    let mevRisk: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    let potentialLoss = 0;

    // Calcular risco baseado no tamanho da transação
    const totalLiquidity = pools.reduce((sum, pool) => sum + pool.totalLiquidity, 0);
    const liquidityRatio = amountIn / totalLiquidity;

    if (liquidityRatio > 0.05) { // 5% da liquidez
      mevRisk = 'extreme';
      potentialLoss = amountIn * 0.05; // Até 5% de perda
      recommendations.push('Transação muito grande - alto risco de MEV');
      recommendations.push('Considere dividir em múltiplas transações menores');
      recommendations.push('Use flashbots ou proteção MEV');
    } else if (liquidityRatio > 0.01) { // 1% da liquidez
      mevRisk = 'high';
      potentialLoss = amountIn * 0.02;
      recommendations.push('Transação grande - risco moderado de MEV');
      recommendations.push('Considere usar private mempool');
    } else if (liquidityRatio > 0.005) { // 0.5% da liquidez
      mevRisk = 'medium';
      potentialLoss = amountIn * 0.01;
      recommendations.push('Monitore preço antes da execução');
    }

    // Calcular risco específico de sandwich attack
    const sandwichAttackRisk = Math.min(100, liquidityRatio * 2000); // Fórmula simplificada

    return {
      mevRisk,
      potentialLoss,
      protectionRecommendations: recommendations,
      sandwichAttackRisk
    };
  }

  /**
   * Otimiza distribuição de amount entre pools
   */
  private async optimizeAmountDistribution(
    poolImpacts: Array<{ pool: PoolData; impact: PriceImpactResult }>,
    tokenIn: string,
    tokenOut: string,
    totalAmount: number,
    strategy: 'best_price' | 'min_impact' | 'balanced'
  ): Promise<Array<{ pool: PoolData; amount: number; percentage: number }>> {
    // Algoritmo simplificado - em produção usar otimização mais sofisticada
    
    if (strategy === 'best_price') {
      // Usar apenas o pool com melhor preço
      const bestPool = poolImpacts[0];
      return [{
        pool: bestPool.pool,
        amount: totalAmount,
        percentage: 1.0
      }];
    }

    if (strategy === 'min_impact') {
      // Distribuir proporcionalmente à liquidez para minimizar impact
      const totalLiquidity = poolImpacts.reduce((sum, p) => sum + p.pool.totalLiquidity, 0);
      
      return poolImpacts.map(({ pool }) => {
        const percentage = pool.totalLiquidity / totalLiquidity;
        return {
          pool,
          amount: totalAmount * percentage,
          percentage
        };
      });
    }

    // Estratégia balanceada
    const topPools = poolImpacts.slice(0, Math.min(3, poolImpacts.length));
    const poolWeights = topPools.map(p => 1 / (1 + p.impact.priceImpact));
    const totalWeight = poolWeights.reduce((sum, w) => sum + w, 0);

    return topPools.map(({ pool }, index) => {
      const percentage = poolWeights[index] / totalWeight;
      return {
        pool,
        amount: totalAmount * percentage,
        percentage
      };
    });
  }

  /**
   * Ordena pools baseado na estratégia
   */
  private sortPoolsByStrategy(
    poolImpacts: Array<{ pool: PoolData; impact: PriceImpactResult }>,
    strategy: 'best_price' | 'min_impact' | 'balanced'
  ): Array<{ pool: PoolData; impact: PriceImpactResult }> {
    switch (strategy) {
      case 'best_price':
        return poolImpacts.sort((a, b) => b.impact.effectivePrice - a.impact.effectivePrice);
      case 'min_impact':
        return poolImpacts.sort((a, b) => a.impact.priceImpact - b.impact.priceImpact);
      case 'balanced':
      default:
        // Score balanceado: preço vs impact vs liquidez
        return poolImpacts.sort((a, b) => {
          const scoreA = a.impact.effectivePrice * 0.5 - a.impact.priceImpact * 0.3 + a.pool.totalLiquidity / 1000000 * 0.2;
          const scoreB = b.impact.effectivePrice * 0.5 - b.impact.priceImpact * 0.3 + b.pool.totalLiquidity / 1000000 * 0.2;
          return scoreB - scoreA;
        });
    }
  }

  /**
   * Avalia risco agregado
   */
  private assessAggregatedRisk(
    poolImpacts: Array<{ pool: PoolData; impact: PriceImpactResult }>,
    averageImpact: number
  ): { level: 'low' | 'medium' | 'high' | 'extreme'; factors: string[]; recommendation: string } {
    const factors: string[] = [];
    let level: 'low' | 'medium' | 'high' | 'extreme' = 'low';

    if (averageImpact > 5) {
      level = 'extreme';
      factors.push('Price impact extremamente alto');
    } else if (averageImpact > 2) {
      level = 'high';
      factors.push('Price impact alto');
    } else if (averageImpact > 0.5) {
      level = 'medium';
      factors.push('Price impact moderado');
    }

    // Verificar consistência entre pools
    const impacts = poolImpacts.map(p => p.impact.priceImpact);
    const maxImpact = Math.max(...impacts);
    const minImpact = Math.min(...impacts);
    const impactSpread = maxImpact - minImpact;

    if (impactSpread > 3) {
      factors.push('Grande variação entre exchanges');
      if (level === 'low') level = 'medium';
    }

    // Verificar liquidez total
    const totalLiquidity = poolImpacts.reduce((sum, p) => sum + p.pool.totalLiquidity, 0);
    if (totalLiquidity < 100000) {
      factors.push('Baixa liquidez total disponível');
      if (level === 'low') level = 'medium';
    }

    // Gerar recomendação
    let recommendation = '';
    switch (level) {
      case 'low':
        recommendation = 'Transação segura - execute quando estiver pronto';
        break;
      case 'medium':
        recommendation = 'Risco moderado - monitore preços antes da execução';
        break;
      case 'high':
        recommendation = 'Alto risco - considere reduzir amount ou aguardar melhores condições';
        break;
      case 'extreme':
        recommendation = 'Risco extremo - evite executar nestas condições';
        break;
    }

    return { level, factors, recommendation };
  }

  /**
   * Obtém volatilidade do par de tokens
   */
  private getTokenVolatility(tokenIn: string, tokenOut: string): number {
    const cacheKey = `${tokenIn}-${tokenOut}`;
    const cached = this.volatilityCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.volatility;
    }

    // Simulação - em produção obter de APIs históricas
    const volatility = Math.random() * 0.1 + 0.02; // 2-12% volatilidade diária
    this.volatilityCache.set(cacheKey, { volatility, timestamp: Date.now() });
    
    return volatility;
  }

  /**
   * Calcula probabilidade de execução dentro da tolerância
   */
  private calculateExecutionProbability(
    priceImpact: number,
    slippageTolerance: number,
    volatility: number
  ): number {
    if (priceImpact > slippageTolerance) {
      return 0; // Impossível com impact atual
    }

    // Modelo simplificado baseado em volatilidade
    const buffer = slippageTolerance - priceImpact;
    const volatilityRisk = volatility * 100; // Converter para percentual
    
    if (buffer > volatilityRisk * 2) {
      return 95; // Alta probabilidade
    } else if (buffer > volatilityRisk) {
      return 80; // Boa probabilidade
    } else if (buffer > volatilityRisk * 0.5) {
      return 60; // Moderada probabilidade
    } else {
      return 30; // Baixa probabilidade
    }
  }

  /**
   * Categoriza nível de risco
   */
  private categorizeRiskLevel(priceImpact: number, slippageTolerance: number): 'low' | 'medium' | 'high' {
    const ratio = priceImpact / slippageTolerance;
    
    if (ratio < 0.3) return 'low';
    if (ratio < 0.7) return 'medium';
    return 'high';
  }

  /**
   * Inicializa pools mock para demonstração
   */
  private initializeMockPools(): void {
    const mockPools: PoolData[] = [
      {
        address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        token0: 'USDC',
        token1: 'ETH',
        reserve0: 50000000, // 50M USDC
        reserve1: 17500, // 17.5K ETH
        totalLiquidity: 142500000, // $142.5M
        fee: 0.0005, // 0.05%
        dex: 'UNISWAP_V3',
        network: 'ethereum',
        volume24h: 25000000, // $25M
        lastUpdated: Date.now()
      },
      {
        address: '0xa43fe16908251ee70ef74718545e4fe6c5ccec9f',
        token0: 'USDC',
        token1: 'ETH',
        reserve0: 25000000, // 25M USDC
        reserve1: 8750, // 8.75K ETH
        totalLiquidity: 71250000, // $71.25M
        fee: 0.003, // 0.3%
        dex: 'SUSHISWAP',
        network: 'ethereum',
        volume24h: 8000000, // $8M
        lastUpdated: Date.now()
      }
    ];

    mockPools.forEach(pool => {
      this.poolCache.set(`${pool.dex}-${pool.token0}-${pool.token1}`, pool);
    });
  }

  /**
   * API pública para obter pools disponíveis
   */
  async getAvailablePools(
    tokenIn: string,
    tokenOut: string,
    network: string = 'ethereum'
  ): Promise<PoolData[]> {
    // Em produção, buscar pools reais via APIs dos DEXs
    const allPools = Array.from(this.poolCache.values());
    
    return allPools.filter(pool => 
      pool.network === network &&
      ((pool.token0.toLowerCase() === tokenIn.toLowerCase() && pool.token1.toLowerCase() === tokenOut.toLowerCase()) ||
       (pool.token1.toLowerCase() === tokenIn.toLowerCase() && pool.token0.toLowerCase() === tokenOut.toLowerCase()))
    );
  }

  /**
   * Monitora price impact em tempo real
   */
  async monitorPriceImpact(
    poolAddress: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    callback: (impact: PriceImpactResult) => void,
    interval: number = 5000
  ): Promise<() => void> {
    const monitor = setInterval(async () => {
      try {
        const pool = this.poolCache.get(poolAddress);
        if (pool) {
          // Atualizar dados do pool (em produção via API)
          const impact = this.calculateSinglePoolImpact(pool, tokenIn, tokenOut, amountIn);
          callback(impact);
        }
      } catch (error) {
        console.error('Erro no monitoramento de price impact:', error);
      }
    }, interval);

    // Retorna função para parar o monitoramento
    return () => clearInterval(monitor);
  }
}