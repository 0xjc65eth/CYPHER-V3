import {
  Token,
  Quote,
  SwapParams,
  DEXType,
  DEXConfig,
  SwapResult,
  HealthCheck,
  DEXApiResponse,
  AggregatorSettings,
  DEFAULT_SETTINGS
} from '@/types/quickTrade'

// DEX Configuration
const DEX_CONFIGS: Partial<Record<DEXType, DEXConfig>> = {
  [DEXType.UNISWAP_V2]: {
    type: DEXType.UNISWAP_V2,
    name: 'Uniswap V2',
    logoUri: '/icons/uniswap.png',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    feeNumerator: 30, // 0.3%
    supportedNetworks: [1, 3, 4, 5, 42],
    isActive: true,
    apiEndpoint: 'https://api.uniswap.org/v2'
  },
  [DEXType.UNISWAP_V3]: {
    type: DEXType.UNISWAP_V3,
    name: 'Uniswap V3',
    logoUri: '/icons/uniswap.png',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    feeNumerator: 5, // 0.05% - 1% depending on pool
    supportedNetworks: [1, 42161, 137, 10],
    isActive: true,
    apiEndpoint: 'https://api.uniswap.org/v3'
  },
  [DEXType.SUSHISWAP]: {
    type: DEXType.SUSHISWAP,
    name: 'SushiSwap',
    logoUri: '/icons/sushiswap.png',
    factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    feeNumerator: 30, // 0.3%
    supportedNetworks: [1, 42161, 137, 56],
    isActive: true,
    apiEndpoint: 'https://api.sushi.com'
  },
  [DEXType.JUPITER]: {
    type: DEXType.JUPITER,
    name: 'Jupiter',
    logoUri: '/icons/jupiter.png',
    feeNumerator: 0, // Platform fee varies
    supportedNetworks: [101], // Solana
    isActive: true,
    apiEndpoint: 'https://api.jup.ag/v6',
    swapUrl: 'https://api.jup.ag/v6/swap'
  },
  [DEXType.ORCA]: {
    type: DEXType.ORCA,
    name: 'Orca',
    logoUri: '/icons/orca.png',
    feeNumerator: 30, // 0.3%
    supportedNetworks: [101], // Solana
    isActive: true,
    apiEndpoint: 'https://api.orca.so'
  },
  [DEXType.RUNESDEX]: {
    type: DEXType.RUNESDEX,
    name: 'RunesDEX',
    logoUri: '/icons/runesdex.png',
    feeNumerator: 50, // 0.5%
    supportedNetworks: [0], // Bitcoin
    isActive: true,
    apiEndpoint: 'https://api.runesdex.com'
  },
  [DEXType.LHMA_SWAP]: {
    type: DEXType.LHMA_SWAP,
    name: 'LHMA Swap',
    logoUri: '/icons/lhma.png',
    routerAddress: '0x', // To be configured
    feeNumerator: 25, // 0.25%
    supportedNetworks: [42161], // Arbitrum
    isActive: true,
    apiEndpoint: 'https://api.lhma.xyz'
  },
  [DEXType.ONEINCH]: {
    type: DEXType.ONEINCH,
    name: '1inch',
    logoUri: '/icons/1inch.png',
    feeNumerator: 0, // Aggregator fees vary
    supportedNetworks: [1, 42161, 137, 56],
    isActive: true,
    apiEndpoint: 'https://api.1inch.dev/swap/v6.0'
  },
  [DEXType.PARASWAP]: {
    type: DEXType.PARASWAP,
    name: 'ParaSwap',
    logoUri: '/icons/paraswap.png',
    feeNumerator: 0, // Aggregator fees vary
    supportedNetworks: [1, 42161, 137, 56],
    isActive: true,
    apiEndpoint: 'https://apiv5.paraswap.io'
  },
  [DEXType.PANCAKESWAP]: {
    type: DEXType.PANCAKESWAP,
    name: 'PancakeSwap',
    logoUri: '/icons/pancakeswap.png',
    factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    feeNumerator: 25, // 0.25%
    supportedNetworks: [56], // BSC
    isActive: true,
    apiEndpoint: 'https://api.pancakeswap.info/api/v2'
  }
}

class DEXAggregator {
  private settings: AggregatorSettings
  private healthChecks: Map<string, HealthCheck> = new Map()
  private rateLimit: Map<string, number> = new Map()

  constructor(settings: AggregatorSettings = DEFAULT_SETTINGS) {
    this.settings = settings
    this.initializeHealthChecks()
  }

  private initializeHealthChecks(): void {
    for (const dexType of Object.values(DEXType)) {
      for (const network of DEX_CONFIGS[dexType]?.supportedNetworks ?? []) {
        const key = `${dexType}-${network}`
        this.healthChecks.set(key, {
          dex: dexType,
          network,
          isHealthy: true,
          latency: 0,
          lastCheck: Date.now(),
          errorCount: 0
        })
      }
    }
  }

  // Main aggregation method
  async getQuotes(params: SwapParams): Promise<Quote[]> {
    const quotes: Quote[] = []
    const enabledDEXs = this.settings.enabledDEXs.filter(dex => 
      DEX_CONFIGS[dex]?.supportedNetworks?.includes(params.tokenIn.chainId)
    )

    // Parallel quote fetching
    const quotePromises = enabledDEXs.map(dex => 
      this.getQuoteFromDEX(dex, params).catch(error => {
        console.error(`Error getting quote from ${dex}:`, error)
        return null
      })
    )

    const results = await Promise.allSettled(quotePromises)
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value)
      }
    })

    // Sort by best output amount (considering fees if enabled)
    return this.sortQuotesByValue(quotes)
  }

  private async getQuoteFromDEX(dex: DEXType, params: SwapParams): Promise<Quote | null> {
    const config = DEX_CONFIGS[dex]
    const healthKey = `${dex}-${params.tokenIn.chainId}`
    const health = this.healthChecks.get(healthKey)

    if (!health?.isHealthy) {
      throw new Error(`DEX ${dex} is not healthy`)
    }

    // Rate limiting check
    if (!this.checkRateLimit(dex)) {
      throw new Error(`Rate limit exceeded for ${dex}`)
    }

    const startTime = Date.now()

    try {
      let quote: Quote | null = null

      switch (dex) {
        case DEXType.JUPITER:
          quote = await this.getJupiterQuote(params)
          break
        case DEXType.UNISWAP_V3:
          quote = await this.getUniswapV3Quote(params)
          break
        case DEXType.ONEINCH:
          quote = await this.get1inchQuote(params)
          break
        case DEXType.RUNESDEX:
          quote = await this.getRunesDexQuote(params)
          break
        case DEXType.LHMA_SWAP:
          quote = await this.getLHMAQuote(params)
          break
        default:
          quote = await this.getGenericQuote(dex, params)
      }

      if (quote) {
        // Update health check
        const latency = Date.now() - startTime
        this.updateHealthCheck(healthKey, true, latency)
        
        // Add Cypher fee
        quote = this.addCypherFee(quote)
      }

      return quote
    } catch (error) {
      this.updateHealthCheck(healthKey, false, Date.now() - startTime)
      throw error
    }
  }

  // Jupiter (Solana) quote implementation
  private async getJupiterQuote(params: SwapParams): Promise<Quote | null> {
    const config = DEX_CONFIGS[DEXType.JUPITER]
    
    const queryParams = new URLSearchParams({
      inputMint: params.tokenIn.address,
      outputMint: params.tokenOut.address,
      amount: params.amountIn,
      slippageBps: (params.slippageTolerance * 100).toString(),
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false'
    })

    const response = await fetch(`${config?.apiEndpoint}/quote?${queryParams}`)
    const data = await response.json()

    if (!response.ok || !data.outAmount) {
      throw new Error(`Jupiter API error: ${data.error || 'Unknown error'}`)
    }

    return {
      dex: DEXType.JUPITER,
      inputAmount: params.amountIn,
      outputAmount: data.outAmount,
      priceImpact: data.priceImpactPct || 0,
      estimatedGas: '0', // Solana doesn't use gas
      route: this.parseJupiterRoute(data.routePlan),
      fee: data.contextSlot ? '0' : '5000', // Platform fee
      slippage: params.slippageTolerance,
      executionTime: 2, // Solana is fast
      confidence: 95,
      timestamp: Date.now()
    }
  }

  // Uniswap V3 quote implementation
  private async getUniswapV3Quote(params: SwapParams): Promise<Quote | null> {
    // This would integrate with Uniswap V3 SDK or API
    // For now, returning a mock quote structure
    return {
      dex: DEXType.UNISWAP_V3,
      inputAmount: params.amountIn,
      outputAmount: '0', // Calculate based on pool data
      priceImpact: 0.1,
      estimatedGas: '150000',
      route: [],
      fee: '3000', // 0.3% in basis points
      slippage: params.slippageTolerance,
      executionTime: 15,
      confidence: 90,
      timestamp: Date.now()
    }
  }

  // 1inch aggregator quote
  private async get1inchQuote(params: SwapParams): Promise<Quote | null> {
    const config = DEX_CONFIGS[DEXType.ONEINCH]
    
    const queryParams = new URLSearchParams({
      src: params.tokenIn.address,
      dst: params.tokenOut.address,
      amount: params.amountIn,
      from: params.recipient,
      slippage: params.slippageTolerance.toString(),
      disableEstimate: 'false'
    })

    const response = await fetch(
      `${config?.apiEndpoint}/${params.tokenIn.chainId}/quote?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`1inch API error: ${data.description}`)
    }

    return {
      dex: DEXType.ONEINCH,
      inputAmount: params.amountIn,
      outputAmount: data.toAmount,
      priceImpact: 0, // 1inch doesn't provide this directly
      estimatedGas: data.estimatedGas || '200000',
      route: [], // Parse from protocols used
      fee: '0', // 1inch charges in spread
      slippage: params.slippageTolerance,
      executionTime: 20,
      confidence: 85,
      timestamp: Date.now()
    }
  }

  // RunesDEX (Bitcoin) quote implementation
  private async getRunesDexQuote(params: SwapParams): Promise<Quote | null> {
    const config = DEX_CONFIGS[DEXType.RUNESDEX]
    
    // Mock implementation for RunesDEX
    return {
      dex: DEXType.RUNESDEX,
      inputAmount: params.amountIn,
      outputAmount: '0', // Calculate based on Bitcoin liquidity
      priceImpact: 0.5,
      estimatedGas: '0', // Bitcoin uses fees differently
      route: [],
      fee: '50', // 0.5%
      slippage: params.slippageTolerance,
      executionTime: 600, // Bitcoin confirmation time
      confidence: 80,
      timestamp: Date.now()
    }
  }

  // LHMA Swap (Arbitrum) quote implementation
  private async getLHMAQuote(params: SwapParams): Promise<Quote | null> {
    // Mock implementation for LHMA Swap
    return {
      dex: DEXType.LHMA_SWAP,
      inputAmount: params.amountIn,
      outputAmount: '0', // Calculate based on LHMA pools
      priceImpact: 0.15,
      estimatedGas: '120000',
      route: [],
      fee: '25', // 0.25%
      slippage: params.slippageTolerance,
      executionTime: 10,
      confidence: 88,
      timestamp: Date.now()
    }
  }

  // Generic quote implementation for other DEXs
  private async getGenericQuote(dex: DEXType, params: SwapParams): Promise<Quote | null> {
    const config = DEX_CONFIGS[dex]
    
    return {
      dex,
      inputAmount: params.amountIn,
      outputAmount: '0', // Calculate based on DEX specific logic
      priceImpact: 0.2,
      estimatedGas: '180000',
      route: [],
      fee: (config?.feeNumerator ?? 0).toString(),
      slippage: params.slippageTolerance,
      executionTime: 20,
      confidence: 75,
      timestamp: Date.now()
    }
  }

  // Add Cypher fee to quote
  private addCypherFee(quote: Quote): Quote {
    const cypherFee = BigInt(quote.outputAmount) * BigInt(Math.floor(this.settings.cypherFeeRate * 10000)) / BigInt(10000)
    const adjustedOutput = BigInt(quote.outputAmount) - cypherFee
    
    return {
      ...quote,
      outputAmount: adjustedOutput.toString(),
      fee: (parseFloat(quote.fee) + this.settings.cypherFeeRate * 10000).toString()
    }
  }

  // Sort quotes by best value
  private sortQuotesByValue(quotes: Quote[]): Quote[] {
    return quotes.sort((a, b) => {
      const aOutput = BigInt(a.outputAmount)
      const bOutput = BigInt(b.outputAmount)
      
      if (aOutput > bOutput) return -1
      if (aOutput < bOutput) return 1
      
      // If output amounts are equal, sort by confidence
      return b.confidence - a.confidence
    })
  }

  // Rate limiting
  private checkRateLimit(dex: DEXType): boolean {
    const now = Date.now()
    const key = `${dex}-rate-limit`
    const lastCall = this.rateLimit.get(key) || 0
    
    if (now - lastCall < 100) { // 100ms minimum between calls
      return false
    }
    
    this.rateLimit.set(key, now)
    return true
  }

  // Health check management
  private updateHealthCheck(key: string, success: boolean, latency: number): void {
    const health = this.healthChecks.get(key)
    if (!health) return

    health.latency = latency
    health.lastCheck = Date.now()

    if (success) {
      health.errorCount = Math.max(0, health.errorCount - 1)
      health.isHealthy = true
    } else {
      health.errorCount++
      health.isHealthy = health.errorCount < 5 // Unhealthy after 5 errors
    }
  }

  // Parse Jupiter route data
  private parseJupiterRoute(routePlan: any[]): any[] {
    return routePlan.map(step => ({
      dex: DEXType.JUPITER,
      tokenIn: { address: step.swapInfo.inputMint },
      tokenOut: { address: step.swapInfo.outputMint },
      amountIn: step.swapInfo.inAmount,
      amountOut: step.swapInfo.outAmount,
      priceImpact: step.swapInfo.priceImpactPct || 0
    }))
  }

  // Execute swap
  async executeSwap(quote: Quote, params: SwapParams): Promise<SwapResult> {
    // Implementation would depend on the specific DEX
    // This is a simplified version
    
    try {
      const transaction = await this.buildTransaction(quote, params)
      
      return {
        transaction,
        quote,
        status: 'pending'
      }
    } catch (error) {
      return {
        transaction: {
          to: '',
          data: '',
          value: '0',
          gasLimit: '0'
        },
        quote,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async buildTransaction(quote: Quote, params: SwapParams): Promise<any> {
    // Build transaction based on DEX type
    switch (quote.dex) {
      case DEXType.JUPITER:
        return this.buildJupiterTransaction(quote, params)
      case DEXType.UNISWAP_V3:
        return this.buildUniswapTransaction(quote, params)
      default:
        throw new Error(`Transaction building not implemented for ${quote.dex}`)
    }
  }

  private async buildJupiterTransaction(quote: Quote, params: SwapParams): Promise<any> {
    // Jupiter swap transaction building logic
    return {
      to: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter program
      data: '0x', // Solana transaction data
      value: '0',
      gasLimit: '0'
    }
  }

  private async buildUniswapTransaction(quote: Quote, params: SwapParams): Promise<any> {
    // Uniswap transaction building logic
    const config = DEX_CONFIGS[DEXType.UNISWAP_V3]
    
    return {
      to: config?.routerAddress ?? '',
      data: '0x', // Encoded swap data
      value: params.tokenIn.isNative ? params.amountIn : '0',
      gasLimit: quote.estimatedGas
    }
  }

  // Get health status
  getHealthStatus(): HealthCheck[] {
    return Array.from(this.healthChecks.values())
  }

  // Update settings
  updateSettings(newSettings: Partial<AggregatorSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  // Get supported DEXs for network
  getSupportedDEXs(chainId: number): DEXType[] {
    return Object.values(DEXType).filter(dex => 
      DEX_CONFIGS[dex]?.supportedNetworks?.includes(chainId) &&
      DEX_CONFIGS[dex]?.isActive
    )
  }
}

export default DEXAggregator
export { DEX_CONFIGS }