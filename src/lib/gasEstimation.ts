interface NetworkConfig {
  name: string;
  chainId: number;
  nativeToken: string;
  blockTime: number; // seconds
  gasUnit: string;
  decimals: number;
  rpcEndpoints: string[];
  gasApiEndpoints?: string[];
}

interface GasPrice {
  slow: number;
  standard: number;
  fast: number;
  instant: number;
  timestamp: number;
  currency: string;
}

interface GasEstimate {
  networkName: string;
  gasLimit: number;
  gasPrice: GasPrice;
  totalCostNative: {
    slow: number;
    standard: number;
    fast: number;
    instant: number;
  };
  totalCostUSD: {
    slow: number;
    standard: number;
    fast: number;
    instant: number;
  };
  estimatedTime: {
    slow: number; // minutes
    standard: number;
    fast: number;
    instant: number;
  };
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'slow' | 'standard' | 'fast' | 'instant';
  marketConditions: {
    volatility: number;
    volume24h: number;
    priceChange24h: number;
  };
}

interface SwapGasData {
  baseSwap: number;
  multiHop: number;
  approval: number;
  wrapUnwrap: number;
  bridging?: number;
}

export class AdvancedGasEstimator {
  private networkConfigs: Map<string, NetworkConfig> = new Map();
  private gasPriceCache: Map<string, { price: GasPrice; timestamp: number }> = new Map();
  private nativeTokenPrices: Map<string, number> = new Map();
  private readonly CACHE_TTL = 10000; // 10 segundos

  constructor() {
    this.initializeNetworkConfigs();
    this.initializeTokenPrices();
  }

  private initializeNetworkConfigs(): void {
    const configs: NetworkConfig[] = [
      {
        name: 'ethereum',
        chainId: 1,
        nativeToken: 'ETH',
        blockTime: 12,
        gasUnit: 'gwei',
        decimals: 18,
        rpcEndpoints: [
          'https://eth-mainnet.alchemyapi.io/v2/',
          'https://mainnet.infura.io/v3/',
          'https://rpc.ankr.com/eth'
        ],
        gasApiEndpoints: [
          'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
          'https://gasstation-mainnet.matic.network/',
          'https://api.blocknative.com/gasprices/blockprices'
        ]
      },
      {
        name: 'arbitrum',
        chainId: 42161,
        nativeToken: 'ETH',
        blockTime: 0.3,
        gasUnit: 'gwei',
        decimals: 18,
        rpcEndpoints: [
          'https://arb1.arbitrum.io/rpc',
          'https://arbitrum-mainnet.infura.io/v3/'
        ]
      },
      {
        name: 'optimism',
        chainId: 10,
        nativeToken: 'ETH',
        blockTime: 2,
        gasUnit: 'gwei',
        decimals: 18,
        rpcEndpoints: [
          'https://mainnet.optimism.io',
          'https://optimism-mainnet.infura.io/v3/'
        ]
      },
      {
        name: 'polygon',
        chainId: 137,
        nativeToken: 'MATIC',
        blockTime: 2,
        gasUnit: 'gwei',
        decimals: 18,
        rpcEndpoints: [
          'https://polygon-rpc.com/',
          'https://rpc-mainnet.maticvigil.com/',
          'https://polygon-mainnet.infura.io/v3/'
        ],
        gasApiEndpoints: [
          'https://gasstation-mainnet.matic.network/'
        ]
      },
      {
        name: 'base',
        chainId: 8453,
        nativeToken: 'ETH',
        blockTime: 2,
        gasUnit: 'gwei',
        decimals: 18,
        rpcEndpoints: [
          'https://mainnet.base.org',
          'https://base-mainnet.infura.io/v3/'
        ]
      },
      {
        name: 'bsc',
        chainId: 56,
        nativeToken: 'BNB',
        blockTime: 3,
        gasUnit: 'gwei',
        decimals: 18,
        rpcEndpoints: [
          'https://bsc-dataseed.binance.org/',
          'https://bsc-dataseed1.defibit.io/'
        ]
      },
      {
        name: 'avalanche',
        chainId: 43114,
        nativeToken: 'AVAX',
        blockTime: 2,
        gasUnit: 'nAVAX',
        decimals: 18,
        rpcEndpoints: [
          'https://api.avax.network/ext/bc/C/rpc',
          'https://avalanche-mainnet.infura.io/v3/'
        ]
      },
      {
        name: 'solana',
        chainId: 0, // Solana doesn't use chain IDs
        nativeToken: 'SOL',
        blockTime: 0.4,
        gasUnit: 'lamports',
        decimals: 9,
        rpcEndpoints: [
          'https://api.mainnet-beta.solana.com',
          'https://solana-api.projectserum.com'
        ]
      }
    ];

    configs.forEach(config => {
      this.networkConfigs.set(config.name, config);
    });
  }

  private initializeTokenPrices(): void {
    // Preços atualizados periodicamente (em produção via APIs)
    this.nativeTokenPrices.set('ETH', 2850);
    this.nativeTokenPrices.set('MATIC', 0.8);
    this.nativeTokenPrices.set('BNB', 320);
    this.nativeTokenPrices.set('AVAX', 25);
    this.nativeTokenPrices.set('SOL', 95);
  }

  /**
   * Estima gas para uma operação de swap
   */
  async estimateSwapGas(
    network: string,
    swapType: 'simple' | 'multi-hop' | 'bridge',
    tokenPair: { from: string; to: string },
    amount: number,
    options: {
      includeApproval?: boolean;
      priority?: 'slow' | 'standard' | 'fast' | 'instant';
      maxGasPrice?: number;
    } = {}
  ): Promise<GasEstimate> {
    const networkConfig = this.networkConfigs.get(network);
    if (!networkConfig) {
      throw new Error(`Rede não suportada: ${network}`);
    }

    // Obter preços de gas atuais
    const gasPrice = await this.getCurrentGasPrice(network);
    
    // Calcular gas limit baseado no tipo de swap
    const gasLimit = await this.calculateGasLimit(network, swapType, tokenPair, options);
    
    // Calcular custos em moeda nativa
    const totalCostNative = {
      slow: (gasLimit * gasPrice.slow) / Math.pow(10, networkConfig.decimals),
      standard: (gasLimit * gasPrice.standard) / Math.pow(10, networkConfig.decimals),
      fast: (gasLimit * gasPrice.fast) / Math.pow(10, networkConfig.decimals),
      instant: (gasLimit * gasPrice.instant) / Math.pow(10, networkConfig.decimals)
    };

    // Converter para USD
    const tokenPrice = this.nativeTokenPrices.get(networkConfig.nativeToken) || 1;
    const totalCostUSD = {
      slow: totalCostNative.slow * tokenPrice,
      standard: totalCostNative.standard * tokenPrice,
      fast: totalCostNative.fast * tokenPrice,
      instant: totalCostNative.instant * tokenPrice
    };

    // Estimar tempos de confirmação
    const estimatedTime = this.calculateConfirmationTimes(network, gasPrice);
    
    // Avaliar nível de congestionamento
    const congestionLevel = this.assessCongestionLevel(gasPrice);
    
    // Gerar recomendação
    const recommendation = this.generateRecommendation(
      congestionLevel,
      totalCostUSD,
      estimatedTime,
      options.priority
    );

    // Obter condições de mercado
    const marketConditions = await this.getMarketConditions(network);

    return {
      networkName: network,
      gasLimit,
      gasPrice,
      totalCostNative,
      totalCostUSD,
      estimatedTime,
      congestionLevel,
      recommendation,
      marketConditions
    };
  }

  /**
   * Obtém preços de gas atuais da rede
   */
  private async getCurrentGasPrice(network: string): Promise<GasPrice> {
    const cached = this.gasPriceCache.get(network);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    const networkConfig = this.networkConfigs.get(network)!;
    
    try {
      // Tentar APIs específicas da rede primeiro
      if (networkConfig.gasApiEndpoints) {
        for (const endpoint of networkConfig.gasApiEndpoints) {
          try {
            const gasPrice = await this.fetchFromGasAPI(endpoint, network);
            if (gasPrice) {
              this.gasPriceCache.set(network, { price: gasPrice, timestamp: Date.now() });
              return gasPrice;
            }
          } catch (error) {
          }
        }
      }

      // Fallback para RPC
      const gasPrice = await this.fetchGasPriceFromRPC(network);
      this.gasPriceCache.set(network, { price: gasPrice, timestamp: Date.now() });
      return gasPrice;

    } catch (error) {
      console.error(`Erro ao obter gas price para ${network}:`, error);
      return this.getFallbackGasPrice(network);
    }
  }

  /**
   * Busca preços de gas via API especializada
   */
  private async fetchFromGasAPI(endpoint: string, network: string): Promise<GasPrice | null> {
    // Implementação simulada - em produção fazer chamadas HTTP reais
    const basePrice = this.getBaseGasPrice(network);
    
    return {
      slow: basePrice * 0.8,
      standard: basePrice,
      fast: basePrice * 1.2,
      instant: basePrice * 1.5,
      timestamp: Date.now(),
      currency: this.networkConfigs.get(network)!.gasUnit
    };
  }

  /**
   * Busca preço de gas via RPC
   */
  private async fetchGasPriceFromRPC(network: string): Promise<GasPrice> {
    // Implementação simulada - em produção fazer chamadas RPC reais
    const basePrice = this.getBaseGasPrice(network);
    
    return {
      slow: basePrice * 0.9,
      standard: basePrice,
      fast: basePrice * 1.1,
      instant: basePrice * 1.3,
      timestamp: Date.now(),
      currency: this.networkConfigs.get(network)!.gasUnit
    };
  }

  /**
   * Obtém preço base de gas para cada rede
   */
  private getBaseGasPrice(network: string): number {
    const basePrices: { [key: string]: number } = {
      ethereum: 25, // gwei
      arbitrum: 0.1,
      optimism: 0.001,
      polygon: 50,
      base: 0.001,
      bsc: 5,
      avalanche: 25,
      solana: 0.000005
    };

    return basePrices[network] || 20;
  }

  /**
   * Preços de fallback quando APIs falham
   */
  private getFallbackGasPrice(network: string): GasPrice {
    const basePrice = this.getBaseGasPrice(network);
    
    return {
      slow: basePrice * 0.8,
      standard: basePrice,
      fast: basePrice * 1.2,
      instant: basePrice * 1.5,
      timestamp: Date.now(),
      currency: this.networkConfigs.get(network)!.gasUnit
    };
  }

  /**
   * Calcula gas limit baseado no tipo de operação
   */
  private async calculateGasLimit(
    network: string,
    swapType: 'simple' | 'multi-hop' | 'bridge',
    tokenPair: { from: string; to: string },
    options: any
  ): Promise<number> {
    const swapGasData = this.getSwapGasData(network);
    let gasLimit = 0;

    // Gas para aprovação se necessário
    if (options.includeApproval && !this.isNativeToken(tokenPair.from, network)) {
      gasLimit += swapGasData.approval;
    }

    // Gas para wrap/unwrap se necessário
    if (this.needsWrapUnwrap(tokenPair, network)) {
      gasLimit += swapGasData.wrapUnwrap;
    }

    // Gas para o swap principal
    switch (swapType) {
      case 'simple':
        gasLimit += swapGasData.baseSwap;
        break;
      case 'multi-hop':
        gasLimit += swapGasData.multiHop;
        break;
      case 'bridge':
        gasLimit += swapGasData.bridging || swapGasData.baseSwap * 2;
        break;
    }

    // Adicionar buffer de segurança (20%)
    return Math.floor(gasLimit * 1.2);
  }

  /**
   * Dados de gas por rede e tipo de operação
   */
  private getSwapGasData(network: string): SwapGasData {
    const gasData: { [key: string]: SwapGasData } = {
      ethereum: {
        baseSwap: 150000,
        multiHop: 220000,
        approval: 46000,
        wrapUnwrap: 27000,
        bridging: 300000
      },
      arbitrum: {
        baseSwap: 800000,
        multiHop: 1200000,
        approval: 150000,
        wrapUnwrap: 100000,
        bridging: 1500000
      },
      optimism: {
        baseSwap: 200000,
        multiHop: 300000,
        approval: 60000,
        wrapUnwrap: 35000,
        bridging: 400000
      },
      polygon: {
        baseSwap: 130000,
        multiHop: 200000,
        approval: 45000,
        wrapUnwrap: 25000,
        bridging: 250000
      },
      base: {
        baseSwap: 180000,
        multiHop: 280000,
        approval: 55000,
        wrapUnwrap: 30000,
        bridging: 350000
      },
      bsc: {
        baseSwap: 120000,
        multiHop: 180000,
        approval: 40000,
        wrapUnwrap: 22000,
        bridging: 220000
      },
      avalanche: {
        baseSwap: 140000,
        multiHop: 210000,
        approval: 48000,
        wrapUnwrap: 28000,
        bridging: 270000
      },
      solana: {
        baseSwap: 200000, // Compute Units
        multiHop: 350000,
        approval: 0, // Solana não precisa approval
        wrapUnwrap: 100000,
        bridging: 500000
      }
    };

    return gasData[network] || gasData.ethereum;
  }

  /**
   * Verifica se token é nativo da rede
   */
  private isNativeToken(token: string, network: string): boolean {
    const nativeTokens: { [key: string]: string[] } = {
      ethereum: ['ETH', 'WETH'],
      arbitrum: ['ETH', 'WETH'],
      optimism: ['ETH', 'WETH'],
      polygon: ['MATIC', 'WMATIC'],
      base: ['ETH', 'WETH'],
      bsc: ['BNB', 'WBNB'],
      avalanche: ['AVAX', 'WAVAX'],
      solana: ['SOL', 'WSOL']
    };

    return nativeTokens[network]?.includes(token.toUpperCase()) || false;
  }

  /**
   * Verifica se precisa de wrap/unwrap
   */
  private needsWrapUnwrap(tokenPair: { from: string; to: string }, network: string): boolean {
    const { from, to } = tokenPair;
    
    const wrapPairs: { [key: string]: string[][] } = {
      ethereum: [['ETH', 'WETH'], ['WETH', 'ETH']],
      polygon: [['MATIC', 'WMATIC'], ['WMATIC', 'MATIC']],
      bsc: [['BNB', 'WBNB'], ['WBNB', 'BNB']],
      avalanche: [['AVAX', 'WAVAX'], ['WAVAX', 'AVAX']],
      solana: [['SOL', 'WSOL'], ['WSOL', 'SOL']]
    };

    const pairs = wrapPairs[network] || [];
    return pairs.some(([token1, token2]) => 
      (from.toUpperCase() === token1 && to.toUpperCase() === token2) ||
      (from.toUpperCase() === token2 && to.toUpperCase() === token1)
    );
  }

  /**
   * Calcula tempos estimados de confirmação
   */
  private calculateConfirmationTimes(network: string, gasPrice: GasPrice): {
    slow: number;
    standard: number;
    fast: number;
    instant: number;
  } {
    const networkConfig = this.networkConfigs.get(network)!;
    const baseBlockTime = networkConfig.blockTime;

    // Estimativas baseadas no preço de gas e histórico da rede
    const blocksToConfirmation = {
      slow: Math.ceil(10 / baseBlockTime), // ~10 minutos
      standard: Math.ceil(5 / baseBlockTime), // ~5 minutos
      fast: Math.ceil(2 / baseBlockTime), // ~2 minutos
      instant: Math.ceil(0.5 / baseBlockTime) // ~30 segundos
    };

    return {
      slow: blocksToConfirmation.slow * baseBlockTime / 60, // em minutos
      standard: blocksToConfirmation.standard * baseBlockTime / 60,
      fast: blocksToConfirmation.fast * baseBlockTime / 60,
      instant: blocksToConfirmation.instant * baseBlockTime / 60
    };
  }

  /**
   * Avalia nível de congestionamento da rede
   */
  private assessCongestionLevel(gasPrice: GasPrice): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = gasPrice.fast / gasPrice.slow;
    
    if (ratio < 1.3) return 'low';
    if (ratio < 1.7) return 'medium';
    if (ratio < 2.5) return 'high';
    return 'critical';
  }

  /**
   * Gera recomendação de prioridade de gas
   */
  private generateRecommendation(
    congestionLevel: 'low' | 'medium' | 'high' | 'critical',
    totalCostUSD: any,
    estimatedTime: any,
    userPriority?: 'slow' | 'standard' | 'fast' | 'instant'
  ): 'slow' | 'standard' | 'fast' | 'instant' {
    // Se usuário especificou prioridade, usar ela
    if (userPriority) return userPriority;

    // Recomendação baseada no congestionamento
    switch (congestionLevel) {
      case 'low':
        return totalCostUSD.slow < 5 ? 'slow' : 'standard';
      case 'medium':
        return 'standard';
      case 'high':
        return estimatedTime.standard > 10 ? 'fast' : 'standard';
      case 'critical':
        return 'fast';
      default:
        return 'standard';
    }
  }

  /**
   * Obtém condições atuais do mercado
   */
  private async getMarketConditions(network: string): Promise<{
    volatility: number;
    volume24h: number;
    priceChange24h: number;
  }> {
    // Simulação - em produção obter dados reais de APIs
    return {
      volatility: Math.random() * 0.1, // 0-10%
      volume24h: Math.random() * 1000000000, // Volume em USD
      priceChange24h: (Math.random() - 0.5) * 0.2 // -10% a +10%
    };
  }

  /**
   * Otimiza gas baseado em condições de mercado
   */
  async optimizeGasStrategy(
    network: string,
    currentEstimate: GasEstimate,
    tradingAmount: number,
    urgency: 'low' | 'medium' | 'high'
  ): Promise<{
    recommendedGasPrice: number;
    maxGasPrice: number;
    strategy: string;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];
    let recommendedGasPrice = currentEstimate.gasPrice.standard;
    let maxGasPrice = currentEstimate.gasPrice.fast;
    let strategy = 'standard';

    // Ajustar baseado na urgência
    if (urgency === 'high') {
      recommendedGasPrice = currentEstimate.gasPrice.fast;
      maxGasPrice = currentEstimate.gasPrice.instant;
      strategy = 'aggressive';
      reasoning.push('Alta urgência detectada - usando gas agressivo');
    }

    // Ajustar baseado no valor da transação
    const txValueUSD = tradingAmount;
    const gasPercentage = (currentEstimate.totalCostUSD.standard / txValueUSD) * 100;

    if (gasPercentage > 5) {
      // Gas muito alto relativo ao valor - tentar economizar
      recommendedGasPrice = currentEstimate.gasPrice.slow;
      strategy = 'conservative';
      reasoning.push(`Custo de gas alto (${gasPercentage.toFixed(1)}% do valor) - usando estratégia conservadora`);
    } else if (gasPercentage < 0.5) {
      // Gas baixo relativo ao valor - pode usar gas alto
      recommendedGasPrice = currentEstimate.gasPrice.fast;
      strategy = 'optimal';
      reasoning.push(`Custo de gas baixo (${gasPercentage.toFixed(1)}% do valor) - priorizando velocidade`);
    }

    // Ajustar baseado no congestionamento
    if (currentEstimate.congestionLevel === 'critical') {
      recommendedGasPrice = Math.max(recommendedGasPrice, currentEstimate.gasPrice.fast);
      reasoning.push('Rede criticamente congestionada - aumentando gas para garantir execução');
    }

    // Ajustar baseado na volatilidade do mercado
    if (currentEstimate.marketConditions.volatility > 0.05) {
      recommendedGasPrice = Math.max(recommendedGasPrice, currentEstimate.gasPrice.fast);
      reasoning.push('Alta volatilidade detectada - priorizando execução rápida');
    }

    return {
      recommendedGasPrice,
      maxGasPrice,
      strategy,
      reasoning
    };
  }

  /**
   * Monitora e ajusta gas durante execução
   */
  async monitorAndAdjustGas(
    network: string,
    txHash: string,
    originalGasPrice: number,
    maxWaitTime: number = 300000 // 5 minutos
  ): Promise<{
    status: 'pending' | 'confirmed' | 'failed' | 'replaced';
    newGasPrice?: number;
    recommendations: string[];
  }> {
    // Implementação simplificada - em produção monitorar via RPC
    const recommendations: string[] = [];
    
    // Simular verificação de status
    const isConfirmed = Math.random() > 0.3; // 70% chance de confirmação
    
    if (isConfirmed) {
      return {
        status: 'confirmed',
        recommendations: ['Transação confirmada com sucesso']
      };
    }

    // Se não confirmou, verificar se deve aumentar gas
    const currentGasPrice = await this.getCurrentGasPrice(network);
    const shouldIncrease = currentGasPrice.standard > originalGasPrice * 1.2;

    if (shouldIncrease) {
      recommendations.push('Congestionamento detectado - considere acelerar transação');
      recommendations.push(`Gas atual: ${currentGasPrice.standard}, Original: ${originalGasPrice}`);
      
      return {
        status: 'pending',
        newGasPrice: currentGasPrice.fast,
        recommendations
      };
    }

    return {
      status: 'pending',
      recommendations: ['Transação ainda pendente - aguardando confirmação']
    };
  }
}