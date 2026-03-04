export interface DexMetrics {
  name: string;
  network: string;
  baseScore: number;
  metrics: {
    uptime: number; // Percentage
    responseTime: number; // milliseconds
    successRate: number; // Percentage
    liquidityDepth: number; // USD
    volume24h: number; // USD
    totalValueLocked: number; // USD
    slippageAccuracy: number; // How accurate slippage predictions are
    apiReliability: number; // API uptime and consistency
  };
  security: {
    auditScore: number; // 0-100
    bugBountyProgram: boolean;
    timeInOperation: number; // months
    incidentHistory: number; // number of major incidents
    insuranceCoverage: number; // USD
  };
  fees: {
    tradingFee: number; // Percentage
    protocolFee: number; // Percentage
    gasCostMultiplier: number; // Relative to network base
  };
  userExperience: {
    interfaceRating: number; // 0-10
    supportQuality: number; // 0-10
    documentationQuality: number; // 0-10
    communitySize: number; // Active users
  };
  lastUpdated: number;
}

export interface TrustScore {
  overall: number; // 0-100
  breakdown: {
    reliability: number;
    security: number;
    liquidity: number;
    cost: number;
    userExperience: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
  warnings: string[];
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
}

export interface DexRanking {
  dex: string;
  network: string;
  trustScore: TrustScore;
  rank: number;
  category: 'tier_1' | 'tier_2' | 'tier_3' | 'experimental';
  specialties: string[]; // e.g., "stablecoins", "large_trades", "gas_efficiency"
}

export class DexTrustSystem {
  private dexMetrics: Map<string, DexMetrics> = new Map();
  private historicalData: Map<string, DexMetrics[]> = new Map();
  private incidentDatabase: Map<string, any[]> = new Map();
  private userFeedback: Map<string, any[]> = new Map();

  constructor() {
    this.initializeDexMetrics();
  }

  /**
   * Calcula score de confiança para um DEX
   */
  calculateTrustScore(dexName: string, network: string): TrustScore {
    const key = `${dexName}-${network}`;
    const metrics = this.dexMetrics.get(key);
    
    if (!metrics) {
      return this.getDefaultTrustScore(dexName);
    }

    // Calcular scores por categoria
    const reliability = this.calculateReliabilityScore(metrics);
    const security = this.calculateSecurityScore(metrics);
    const liquidity = this.calculateLiquidityScore(metrics);
    const cost = this.calculateCostScore(metrics);
    const userExperience = this.calculateUserExperienceScore(metrics);

    // Peso para cada categoria
    const weights = {
      reliability: 0.25,
      security: 0.25,
      liquidity: 0.20,
      cost: 0.15,
      userExperience: 0.15
    };

    // Score geral ponderado
    const overall = Math.round(
      reliability * weights.reliability +
      security * weights.security +
      liquidity * weights.liquidity +
      cost * weights.cost +
      userExperience * weights.userExperience
    );

    // Determinar tendência baseada em dados históricos
    const trend = this.calculateTrend(dexName, network);
    
    // Gerar recomendações e avisos
    const { recommendations, warnings } = this.generateInsights(metrics, overall);
    
    // Determinar nível de risco
    const riskLevel = this.determineRiskLevel(overall, metrics);

    return {
      overall,
      breakdown: {
        reliability,
        security,
        liquidity,
        cost,
        userExperience
      },
      trend,
      recommendations,
      warnings,
      riskLevel
    };
  }

  /**
   * Obtém ranking completo de DEXs para uma rede
   */
  getDexRanking(network: string, filters?: {
    minLiquidity?: number;
    maxRisk?: 'low' | 'medium' | 'high';
    specialty?: string;
  }): DexRanking[] {
    const networkDexs = Array.from(this.dexMetrics.values())
      .filter(metrics => metrics.network === network);

    // Aplicar filtros se especificados
    let filteredDexs = networkDexs;
    
    if (filters?.minLiquidity) {
      filteredDexs = filteredDexs.filter(d => d.metrics.liquidityDepth >= filters.minLiquidity!);
    }

    // Calcular trust scores e criar rankings
    const rankings: DexRanking[] = filteredDexs.map(metrics => {
      const trustScore = this.calculateTrustScore(metrics.name, metrics.network);
      const category = this.categorizeDex(trustScore.overall, metrics);
      const specialties = this.identifySpecialties(metrics);

      return {
        dex: metrics.name,
        network: metrics.network,
        trustScore,
        rank: 0, // Will be set after sorting
        category,
        specialties
      };
    });

    // Ordenar por trust score
    rankings.sort((a, b) => b.trustScore.overall - a.trustScore.overall);
    
    // Atribuir ranks
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  /**
   * Analisa riscos específicos de um DEX
   */
  analyzeRisks(dexName: string, network: string, tradeAmount: number): {
    risks: Array<{
      type: 'liquidity' | 'smart_contract' | 'bridge' | 'oracle' | 'governance';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      mitigation: string;
    }>;
    riskScore: number;
    recommendation: 'proceed' | 'caution' | 'avoid';
  } {
    const key = `${dexName}-${network}`;
    const metrics = this.dexMetrics.get(key);
    const risks: any[] = [];
    
    if (!metrics) {
      risks.push({
        type: 'smart_contract',
        severity: 'high',
        description: 'DEX não reconhecido ou dados insuficientes',
        mitigation: 'Use apenas DEXs estabelecidos e auditados'
      });
      return { risks, riskScore: 80, recommendation: 'avoid' };
    }

    // Analisar risco de liquidez
    if (tradeAmount > metrics.metrics.liquidityDepth * 0.1) {
      risks.push({
        type: 'liquidity',
        severity: tradeAmount > metrics.metrics.liquidityDepth * 0.3 ? 'critical' : 'high',
        description: 'Trade representa parcela significativa da liquidez disponível',
        mitigation: 'Dividir trade em múltiplas transações menores'
      });
    }

    // Analisar risco de smart contract
    if (metrics.security.auditScore < 70) {
      risks.push({
        type: 'smart_contract',
        severity: metrics.security.auditScore < 50 ? 'critical' : 'high',
        description: 'Score de auditoria baixo',
        mitigation: 'Verificar auditorias recentes e considerar DEX alternativo'
      });
    }

    // Analisar histórico de incidentes
    const incidents = this.incidentDatabase.get(key) || [];
    const recentIncidents = incidents.filter(i => Date.now() - i.timestamp < 90 * 24 * 60 * 60 * 1000); // 90 dias
    
    if (recentIncidents.length > 0) {
      risks.push({
        type: 'smart_contract',
        severity: 'medium',
        description: `${recentIncidents.length} incidente(s) nos últimos 90 dias`,
        mitigation: 'Monitorar situação e considerar aguardar estabilização'
      });
    }

    // Calcular score de risco geral
    const riskScore = this.calculateOverallRiskScore(risks, metrics);
    
    // Gerar recomendação
    let recommendation: 'proceed' | 'caution' | 'avoid' = 'proceed';
    if (riskScore > 70) recommendation = 'avoid';
    else if (riskScore > 40) recommendation = 'caution';

    return { risks, riskScore, recommendation };
  }

  /**
   * Monitora performance de DEX em tempo real
   */
  async monitorDexPerformance(
    dexName: string,
    network: string,
    callback: (metrics: DexMetrics) => void,
    interval: number = 60000 // 1 minuto
  ): Promise<() => void> {
    const key = `${dexName}-${network}`;
    
    const monitor = setInterval(async () => {
      try {
        // Simular coleta de métricas em tempo real
        const updatedMetrics = await this.fetchLatestMetrics(dexName, network);
        if (updatedMetrics) {
          this.dexMetrics.set(key, updatedMetrics);
          callback(updatedMetrics);
        }
      } catch (error) {
        console.error(`Erro no monitoramento de ${dexName}:`, error);
      }
    }, interval);

    return () => clearInterval(monitor);
  }

  /**
   * Registra feedback do usuário sobre experiência com DEX
   */
  reportUserExperience(
    dexName: string,
    network: string,
    feedback: {
      successful: boolean;
      actualSlippage: number;
      expectedSlippage: number;
      executionTime: number;
      gasUsed: number;
      rating: number; // 1-5
      comments?: string;
    }
  ): void {
    const key = `${dexName}-${network}`;
    const existingFeedback = this.userFeedback.get(key) || [];
    
    existingFeedback.push({
      ...feedback,
      timestamp: Date.now()
    });
    
    this.userFeedback.set(key, existingFeedback);
    
    // Atualizar métricas baseado no feedback
    this.updateMetricsFromFeedback(dexName, network);
  }

  /**
   * Calcula score de confiabilidade
   */
  private calculateReliabilityScore(metrics: DexMetrics): number {
    const uptimeScore = metrics.metrics.uptime;
    const responseScore = Math.max(0, 100 - (metrics.metrics.responseTime / 100)); // Penalizar > 10s
    const successScore = metrics.metrics.successRate;
    const apiScore = metrics.metrics.apiReliability;
    
    return Math.round((uptimeScore + responseScore + successScore + apiScore) / 4);
  }

  /**
   * Calcula score de segurança
   */
  private calculateSecurityScore(metrics: DexMetrics): number {
    const auditScore = metrics.security.auditScore;
    const operationScore = Math.min(100, (metrics.security.timeInOperation / 12) * 20); // Máximo 5 anos
    const incidentScore = Math.max(0, 100 - (metrics.security.incidentHistory * 20));
    const bountyScore = metrics.security.bugBountyProgram ? 20 : 0;
    const insuranceScore = metrics.security.insuranceCoverage > 0 ? 15 : 0;
    
    return Math.round((auditScore * 0.4 + operationScore * 0.2 + incidentScore * 0.2 + bountyScore * 0.1 + insuranceScore * 0.1));
  }

  /**
   * Calcula score de liquidez
   */
  private calculateLiquidityScore(metrics: DexMetrics): number {
    const depthScore = Math.min(100, (metrics.metrics.liquidityDepth / 10000000) * 50); // $10M = 50 pontos
    const volumeScore = Math.min(100, (metrics.metrics.volume24h / 50000000) * 30); // $50M = 30 pontos
    const tvlScore = Math.min(100, (metrics.metrics.totalValueLocked / 100000000) * 20); // $100M = 20 pontos
    
    return Math.round(depthScore + volumeScore + tvlScore);
  }

  /**
   * Calcula score de custo
   */
  private calculateCostScore(metrics: DexMetrics): number {
    // Inverter - custos menores = score maior
    const tradingFeeScore = Math.max(0, 100 - (metrics.fees.tradingFee * 10000)); // 1% = 100 pontos de penalidade
    const protocolFeeScore = Math.max(0, 100 - (metrics.fees.protocolFee * 10000));
    const gasScore = Math.max(0, 100 - ((metrics.fees.gasCostMultiplier - 1) * 50));
    
    return Math.round((tradingFeeScore + protocolFeeScore + gasScore) / 3);
  }

  /**
   * Calcula score de experiência do usuário
   */
  private calculateUserExperienceScore(metrics: DexMetrics): number {
    const interfaceScore = (metrics.userExperience.interfaceRating / 10) * 100;
    const supportScore = (metrics.userExperience.supportQuality / 10) * 100;
    const docsScore = (metrics.userExperience.documentationQuality / 10) * 100;
    const communityScore = Math.min(100, (metrics.userExperience.communitySize / 100000) * 25); // 100k users = 25 pontos
    
    return Math.round((interfaceScore + supportScore + docsScore + communityScore) / 4);
  }

  /**
   * Calcula tendência baseada em dados históricos
   */
  private calculateTrend(dexName: string, network: string): 'improving' | 'stable' | 'declining' {
    const key = `${dexName}-${network}`;
    const historical = this.historicalData.get(key) || [];
    
    if (historical.length < 2) return 'stable';
    
    const recent = historical.slice(-5); // Últimas 5 medições
    const older = historical.slice(-10, -5); // 5 medições anteriores
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, m) => sum + m.baseScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.baseScore, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Gera insights e recomendações
   */
  private generateInsights(metrics: DexMetrics, overallScore: number): {
    recommendations: string[];
    warnings: string[];
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (overallScore >= 80) {
      recommendations.push('DEX altamente confiável - ideal para grandes volumes');
    } else if (overallScore >= 60) {
      recommendations.push('DEX confiável - adequado para uso geral');
    } else if (overallScore >= 40) {
      recommendations.push('DEX com riscos moderados - use com cautela');
      warnings.push('Monitore transações de perto');
    } else {
      warnings.push('DEX de alto risco - considere alternativas');
      warnings.push('Não recomendado para grandes volumes');
    }

    if (metrics.metrics.uptime < 95) {
      warnings.push('Uptime instável nos últimos períodos');
    }

    if (metrics.metrics.responseTime > 5000) {
      warnings.push('Tempos de resposta elevados');
    }

    if (metrics.security.auditScore < 70) {
      warnings.push('Score de auditoria baixo');
    }

    if (metrics.metrics.liquidityDepth < 1000000) {
      warnings.push('Liquidez limitada - risco de alto slippage');
    }

    return { recommendations, warnings };
  }

  /**
   * Determina nível de risco
   */
  private determineRiskLevel(score: number, metrics: DexMetrics): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 90) return 'very_low';
    if (score >= 75) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'very_high';
  }

  /**
   * Categoriza DEX em tiers
   */
  private categorizeDex(score: number, metrics: DexMetrics): 'tier_1' | 'tier_2' | 'tier_3' | 'experimental' {
    if (score >= 80 && metrics.security.timeInOperation >= 24) return 'tier_1';
    if (score >= 60 && metrics.security.timeInOperation >= 12) return 'tier_2';
    if (score >= 40 && metrics.security.timeInOperation >= 6) return 'tier_3';
    return 'experimental';
  }

  /**
   * Identifica especialidades do DEX
   */
  private identifySpecialties(metrics: DexMetrics): string[] {
    const specialties: string[] = [];
    
    if (metrics.fees.gasCostMultiplier < 0.8) {
      specialties.push('gas_efficiency');
    }
    
    if (metrics.metrics.liquidityDepth > 50000000) {
      specialties.push('large_trades');
    }
    
    if (metrics.fees.tradingFee < 0.001) {
      specialties.push('low_fees');
    }
    
    if (metrics.metrics.responseTime < 1000) {
      specialties.push('fast_execution');
    }
    
    // Adicionar mais especialidades baseado em dados específicos
    
    return specialties;
  }

  /**
   * Calcula score de risco geral
   */
  private calculateOverallRiskScore(risks: any[], metrics: DexMetrics): number {
    let riskScore = 0;
    
    risks.forEach(risk => {
      switch (risk.severity) {
        case 'critical': riskScore += 25; break;
        case 'high': riskScore += 15; break;
        case 'medium': riskScore += 10; break;
        case 'low': riskScore += 5; break;
      }
    });
    
    // Adicionar score base baseado nas métricas
    if (metrics.security.auditScore < 50) riskScore += 20;
    if (metrics.metrics.uptime < 90) riskScore += 15;
    if (metrics.security.incidentHistory > 2) riskScore += 10;
    
    return Math.min(100, riskScore);
  }

  /**
   * Busca métricas mais recentes (simulado)
   */
  private async fetchLatestMetrics(dexName: string, network: string): Promise<DexMetrics | null> {
    // Simulação - em produção fazer chamadas para APIs reais
    const key = `${dexName}-${network}`;
    const current = this.dexMetrics.get(key);
    
    if (!current) return null;
    
    // Simular pequenas variações nas métricas
    const updated: DexMetrics = {
      ...current,
      metrics: {
        ...current.metrics,
        uptime: current.metrics.uptime,
        responseTime: current.metrics.responseTime,
        successRate: current.metrics.successRate,
        volume24h: current.metrics.volume24h
      },
      lastUpdated: Date.now()
    };
    
    return updated;
  }

  /**
   * Atualiza métricas baseado no feedback do usuário
   */
  private updateMetricsFromFeedback(dexName: string, network: string): void {
    const key = `${dexName}-${network}`;
    const feedback = this.userFeedback.get(key) || [];
    const metrics = this.dexMetrics.get(key);
    
    if (!metrics || feedback.length === 0) return;
    
    const recentFeedback = feedback.filter(f => Date.now() - f.timestamp < 7 * 24 * 60 * 60 * 1000); // 7 dias
    
    if (recentFeedback.length > 0) {
      const avgRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length;
      const successRate = (recentFeedback.filter(f => f.successful).length / recentFeedback.length) * 100;
      
      // Atualizar métricas baseado no feedback
      metrics.metrics.successRate = (metrics.metrics.successRate + successRate) / 2;
      metrics.userExperience.interfaceRating = (metrics.userExperience.interfaceRating + avgRating * 2) / 2;
      
      this.dexMetrics.set(key, metrics);
    }
  }

  /**
   * Score padrão para DEXs desconhecidos
   */
  private getDefaultTrustScore(dexName: string): TrustScore {
    return {
      overall: 30,
      breakdown: {
        reliability: 30,
        security: 20,
        liquidity: 30,
        cost: 40,
        userExperience: 30
      },
      trend: 'stable',
      recommendations: ['DEX não verificado - use com extrema cautela'],
      warnings: ['Dados insuficientes para avaliação completa', 'Considere usar DEXs estabelecidos'],
      riskLevel: 'very_high'
    };
  }

  /**
   * Inicializa métricas para DEXs conhecidos
   */
  private initializeDexMetrics(): void {
    const knownDexs: DexMetrics[] = [
      // Ethereum DEXs
      {
        name: 'UNISWAP_V3',
        network: 'ethereum',
        baseScore: 92,
        metrics: {
          uptime: 99.5,
          responseTime: 800,
          successRate: 98.5,
          liquidityDepth: 500000000,
          volume24h: 1200000000,
          totalValueLocked: 3500000000,
          slippageAccuracy: 95,
          apiReliability: 99
        },
        security: {
          auditScore: 95,
          bugBountyProgram: true,
          timeInOperation: 36,
          incidentHistory: 1,
          insuranceCoverage: 50000000
        },
        fees: {
          tradingFee: 0.003,
          protocolFee: 0,
          gasCostMultiplier: 1.0
        },
        userExperience: {
          interfaceRating: 9,
          supportQuality: 8,
          documentationQuality: 9,
          communitySize: 2000000
        },
        lastUpdated: Date.now()
      },
      {
        name: 'SUSHISWAP',
        network: 'ethereum',
        baseScore: 85,
        metrics: {
          uptime: 98.5,
          responseTime: 1200,
          successRate: 97,
          liquidityDepth: 200000000,
          volume24h: 300000000,
          totalValueLocked: 800000000,
          slippageAccuracy: 92,
          apiReliability: 96
        },
        security: {
          auditScore: 88,
          bugBountyProgram: true,
          timeInOperation: 30,
          incidentHistory: 2,
          insuranceCoverage: 20000000
        },
        fees: {
          tradingFee: 0.003,
          protocolFee: 0.0005,
          gasCostMultiplier: 0.95
        },
        userExperience: {
          interfaceRating: 8,
          supportQuality: 7,
          documentationQuality: 8,
          communitySize: 800000
        },
        lastUpdated: Date.now()
      },
      // Solana DEXs
      {
        name: 'JUPITER',
        network: 'solana',
        baseScore: 88,
        metrics: {
          uptime: 98,
          responseTime: 600,
          successRate: 96,
          liquidityDepth: 150000000,
          volume24h: 400000000,
          totalValueLocked: 600000000,
          slippageAccuracy: 90,
          apiReliability: 97
        },
        security: {
          auditScore: 85,
          bugBountyProgram: true,
          timeInOperation: 18,
          incidentHistory: 0,
          insuranceCoverage: 10000000
        },
        fees: {
          tradingFee: 0.001,
          protocolFee: 0.0001,
          gasCostMultiplier: 0.01
        },
        userExperience: {
          interfaceRating: 9,
          supportQuality: 8,
          documentationQuality: 8,
          communitySize: 500000
        },
        lastUpdated: Date.now()
      }
    ];

    knownDexs.forEach(dex => {
      const key = `${dex.name}-${dex.network}`;
      this.dexMetrics.set(key, dex);
    });
  }
}

// Exportar interfaces para uso em outros módulos
export interface DexQuote {
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
  };
  metadata: {
    poolAddress?: string;
    routerAddress?: string;
    lastUpdated: number;
    dataSource: string;
  };
}

export interface OptimalRoute {
  steps: RouteStep[];
  totalAmountOut: number;
  totalGasCost: number;
  totalPriceImpact: number;
  executionTime: number;
  reliabilityScore: number;
  strategy: 'single' | 'split' | 'multi-hop';
}

export interface RouteStep {
  dex: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  percentage: number;
}