'use client'

import {
  Token,
  Quote,
  SwapParams,
  SwapResult,
  DEXType,
  RouteStep,
  DEXConfig
} from '@/types/quickTrade'

// DEX Configuration
const DEX_CONFIGS: Record<DEXType, DEXConfig> = {
  [DEXType.UNISWAP_V2]: {
    type: DEXType.UNISWAP_V2,
    name: 'Uniswap V2',
    logoUri: '/icons/uniswap.png',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    feeNumerator: 30, // 0.30%
    supportedNetworks: [1, 42161, 10],
    isActive: true,
    apiEndpoint: 'https://api.uniswap.org/v2',
    swapUrl: 'https://app.uniswap.org/#/swap'
  },
  [DEXType.UNISWAP_V3]: {
    type: DEXType.UNISWAP_V3,
    name: 'Uniswap V3',
    logoUri: '/icons/uniswap.png',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    feeNumerator: 5, // 0.05% - 1.00% (variable)
    supportedNetworks: [1, 42161, 10, 137, 8453],
    isActive: true,
    apiEndpoint: 'https://api.uniswap.org/v3',
    swapUrl: 'https://app.uniswap.org/#/swap'
  },
  [DEXType.SUSHISWAP]: {
    type: DEXType.SUSHISWAP,
    name: 'SushiSwap',
    logoUri: '/icons/sushi.png',
    factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    feeNumerator: 25, // 0.25%
    supportedNetworks: [1, 42161, 137, 43114],
    isActive: true,
    apiEndpoint: 'https://api.sushi.com',
    swapUrl: 'https://app.sushi.com/swap'
  },
  [DEXType.JUPITER]: {
    type: DEXType.JUPITER,
    name: 'Jupiter',
    logoUri: '/icons/jupiter.png',
    feeNumerator: 0, // Dynamic fees
    supportedNetworks: [101], // Solana
    isActive: true,
    apiEndpoint: 'https://api.jup.ag/v6',
    swapUrl: 'https://jup.ag/swap'
  },
  [DEXType.ORCA]: {
    type: DEXType.ORCA,
    name: 'Orca',
    logoUri: '/icons/orca.png',
    feeNumerator: 30, // 0.30%
    supportedNetworks: [101], // Solana
    isActive: true,
    apiEndpoint: 'https://api.orca.so',
    swapUrl: 'https://www.orca.so/'
  },
  [DEXType.RUNESDEX]: {
    type: DEXType.RUNESDEX,
    name: 'RunesDEX',
    logoUri: '/icons/runes.png',
    feeNumerator: 50, // 0.50%
    supportedNetworks: [0], // Bitcoin
    isActive: true,
    apiEndpoint: 'https://api.runesdex.com',
    swapUrl: 'https://runesdex.com'
  },
  [DEXType.LHMA_SWAP]: {
    type: DEXType.LHMA_SWAP,
    name: 'LHMA Swap',
    logoUri: '/icons/lhma.png',
    feeNumerator: 20, // 0.20%
    supportedNetworks: [42161], // Arbitrum
    isActive: true,
    apiEndpoint: 'https://api.lhma.io',
    swapUrl: 'https://lhma.io/swap'
  },
  [DEXType.ONEINCH]: {
    type: DEXType.ONEINCH,
    name: '1inch',
    logoUri: '/icons/1inch.png',
    feeNumerator: 0, // Aggregator fees vary
    supportedNetworks: [1, 42161, 137, 10, 8453],
    isActive: true,
    apiEndpoint: 'https://api.1inch.dev/swap/v5.2',
    swapUrl: 'https://app.1inch.io/'
  },
  [DEXType.PARASWAP]: {
    type: DEXType.PARASWAP,
    name: 'ParaSwap',
    logoUri: '/icons/paraswap.png',
    feeNumerator: 0, // Aggregator fees vary
    supportedNetworks: [1, 42161, 137, 10, 8453, 43114],
    isActive: true,
    apiEndpoint: 'https://apiv5.paraswap.io',
    swapUrl: 'https://app.paraswap.io/'
  }
}

export class DEXAggregator {
  private configs: Record<DEXType, DEXConfig>
  private cypherFeeRate: number
  private minAmountUSD: number

  constructor(settings: any) {
    this.configs = DEX_CONFIGS
    this.cypherFeeRate = settings.cypherFeeRate || 0.002 // 0.20%
    this.minAmountUSD = settings.minAmountUSD || 10
  }

  // Get quotes from all available DEXs
  async getQuotes(params: SwapParams): Promise<Quote[]> {
    const { tokenIn, tokenOut } = params
    const quotes: Quote[] = []

    // Get available DEXs for the token pair
    const availableDEXs = this.getAvailableDEXs(tokenIn.chainId)

    // Fetch quotes from each DEX in parallel
    const quotePromises = availableDEXs.map(dex => 
      this.getQuoteFromDEX(dex, params).catch(error => {
        console.error(`Failed to get quote from ${dex}:`, error)
        return null
      })
    )

    const results = await Promise.allSettled(quotePromises)
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value)
      }
    })

    // Sort quotes by output amount (descending)
    quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount))

    return quotes
  }

  // Get quote from specific DEX
  private async getQuoteFromDEX(dex: DEXType, params: SwapParams): Promise<Quote | null> {
    const config = this.configs[dex]
    if (!config.isActive) return null

    try {
      switch (dex) {
        case DEXType.UNISWAP_V3:
          return await this.getUniswapV3Quote(params)
        case DEXType.JUPITER:
          return await this.getJupiterQuote(params)
        case DEXType.SUSHISWAP:
          return await this.getSushiswapQuote(params)
        case DEXType.LHMA_SWAP:
          return await this.getLHMASwapQuote(params)
        case DEXType.RUNESDEX:
          return await this.getRunesDEXQuote(params)
        case DEXType.ONEINCH:
          return await this.get1inchQuote(params)
        default:
          return await this.getGenericQuote(dex, params)
      }
    } catch (error) {
      console.error(`Quote failed for ${dex}:`, error)
      return null
    }
  }

  // Uniswap V3 quote implementation
  private async getUniswapV3Quote(params: SwapParams): Promise<Quote> {
    // In production, this would call the actual Uniswap V3 API
    const mockQuote: Quote = {
      dex: DEXType.UNISWAP_V3,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, 0.995), // 0.5% slippage
      priceImpact: 0.12,
      estimatedGas: '150000',
      route: [{
        dex: DEXType.UNISWAP_V3,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: this.calculateMockOutput(params.amountIn, 0.995),
        fee: 500, // 0.05%
        priceImpact: 0.12
      }],
      fee: '500',
      slippage: 0.5,
      executionTime: 15,
      confidence: 95,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // Jupiter (Solana) quote implementation
  private async getJupiterQuote(params: SwapParams): Promise<Quote> {
    // Mock implementation - in production would call Jupiter API
    const mockQuote: Quote = {
      dex: DEXType.JUPITER,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, 0.998), // Better rates
      priceImpact: 0.08,
      estimatedGas: '5000', // Solana uses compute units
      route: [{
        dex: DEXType.JUPITER,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: this.calculateMockOutput(params.amountIn, 0.998),
        priceImpact: 0.08
      }],
      fee: '0',
      slippage: 0.3,
      executionTime: 2, // Solana is fast
      confidence: 98,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // SushiSwap quote implementation
  private async getSushiswapQuote(params: SwapParams): Promise<Quote> {
    const mockQuote: Quote = {
      dex: DEXType.SUSHISWAP,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, 0.9925), // 0.75% total fees
      priceImpact: 0.15,
      estimatedGas: '180000',
      route: [{
        dex: DEXType.SUSHISWAP,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: this.calculateMockOutput(params.amountIn, 0.9925),
        fee: 250, // 0.25%
        priceImpact: 0.15
      }],
      fee: '250',
      slippage: 0.6,
      executionTime: 20,
      confidence: 92,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // LHMA Swap (Arbitrum) quote implementation
  private async getLHMASwapQuote(params: SwapParams): Promise<Quote> {
    const mockQuote: Quote = {
      dex: DEXType.LHMA_SWAP,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, 0.996), // Good rates on Arbitrum
      priceImpact: 0.10,
      estimatedGas: '100000', // Lower gas on L2
      route: [{
        dex: DEXType.LHMA_SWAP,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: this.calculateMockOutput(params.amountIn, 0.996),
        fee: 200, // 0.20%
        priceImpact: 0.10
      }],
      fee: '200',
      slippage: 0.4,
      executionTime: 8, // Fast on L2
      confidence: 94,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // RunesDEX (Bitcoin) quote implementation
  private async getRunesDEXQuote(params: SwapParams): Promise<Quote> {
    const mockQuote: Quote = {
      dex: DEXType.RUNESDEX,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, 0.99), // Higher fees but unique
      priceImpact: 0.25,
      estimatedGas: '10000', // Bitcoin transaction fees
      route: [{
        dex: DEXType.RUNESDEX,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: this.calculateMockOutput(params.amountIn, 0.99),
        fee: 500, // 0.50%
        priceImpact: 0.25
      }],
      fee: '500',
      slippage: 1.0,
      executionTime: 300, // Bitcoin is slow
      confidence: 85,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // 1inch aggregator quote implementation
  private async get1inchQuote(params: SwapParams): Promise<Quote> {
    const mockQuote: Quote = {
      dex: DEXType.ONEINCH,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, 0.997), // Aggregator optimization
      priceImpact: 0.09,
      estimatedGas: '200000',
      route: [
        {
          dex: DEXType.UNISWAP_V3,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: (parseFloat(params.amountIn) * 0.6).toString(),
          amountOut: this.calculateMockOutput((parseFloat(params.amountIn) * 0.6).toString(), 0.997),
          fee: 500,
          priceImpact: 0.09
        },
        {
          dex: DEXType.SUSHISWAP,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: (parseFloat(params.amountIn) * 0.4).toString(),
          amountOut: this.calculateMockOutput((parseFloat(params.amountIn) * 0.4).toString(), 0.997),
          fee: 250,
          priceImpact: 0.09
        }
      ],
      fee: '0',
      slippage: 0.4,
      executionTime: 25,
      confidence: 96,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // Generic quote implementation for other DEXs
  private async getGenericQuote(dex: DEXType, params: SwapParams): Promise<Quote> {
    const config = this.configs[dex]
    const feeMultiplier = 1 - (config.feeNumerator / 10000)
    
    const mockQuote: Quote = {
      dex,
      inputAmount: params.amountIn,
      outputAmount: this.calculateMockOutput(params.amountIn, feeMultiplier),
      priceImpact: 0.15,
      estimatedGas: '160000',
      route: [{
        dex,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOut: this.calculateMockOutput(params.amountIn, feeMultiplier),
        fee: config.feeNumerator,
        priceImpact: 0.15
      }],
      fee: config.feeNumerator.toString(),
      slippage: 0.8,
      executionTime: 18,
      confidence: 88,
      timestamp: Date.now()
    }

    return mockQuote
  }

  // Execute swap
  async executeSwap(quote: Quote, params: SwapParams): Promise<SwapResult> {
    try {
      // In production, this would redirect to the actual DEX
      const config = this.configs[quote.dex]
      
      // Add Cypher fee to the transaction
      const cypherFee = this.calculateCypherFee(params.amountIn, params.tokenIn)
      
      const swapUrl = this.buildSwapUrl(quote, params)
      
      // Redirect to DEX (this is a simulation)
      if (typeof window !== 'undefined') {
        window.open(swapUrl, '_blank')
      }

      return {
        transaction: {
          to: config.routerAddress || '0x0',
          data: '0x',
          value: '0',
          gasLimit: quote.estimatedGas
        },
        quote,
        status: 'pending'
      }
    } catch (error) {
      return {
        transaction: {
          to: '0x0',
          data: '0x',
          value: '0',
          gasLimit: '0'
        },
        quote,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Swap failed'
      }
    }
  }

  // Build swap URL for redirection
  private buildSwapUrl(quote: Quote, params: SwapParams): string {
    const config = this.configs[quote.dex]
    const baseUrl = config.swapUrl
    
    if (!baseUrl) return '#'

    // Build URL with token parameters
    const urlParams = new URLSearchParams({
      inputCurrency: params.tokenIn.address,
      outputCurrency: params.tokenOut.address,
      exactAmount: params.amountIn,
      exactField: 'input'
    })

    return `${baseUrl}?${urlParams.toString()}`
  }

  // Calculate Cypher fee
  private calculateCypherFee(amountIn: string, tokenIn: Token): string {
    const amount = parseFloat(amountIn)
    const fee = amount * this.cypherFeeRate
    return fee.toString()
  }

  // Calculate mock output for testing
  private calculateMockOutput(inputAmount: string, multiplier: number): string {
    const amount = parseFloat(inputAmount)
    const output = amount * multiplier
    return output.toString()
  }

  // Get available DEXs for a chain
  private getAvailableDEXs(chainId: number): DEXType[] {
    return Object.values(DEXType).filter(dex => {
      const config = this.configs[dex]
      return config.isActive && config.supportedNetworks.includes(chainId)
    })
  }

  // Get DEX configuration
  getDEXConfig(dex: DEXType): DEXConfig {
    return this.configs[dex]
  }

  // Health check for DEXs
  async healthCheck(): Promise<Record<DEXType, boolean>> {
    const healthStatus: Record<DEXType, boolean> = {} as any

    for (const dex of Object.values(DEXType)) {
      try {
        // In production, this would ping the actual DEX APIs
        healthStatus[dex] = this.configs[dex].isActive
      } catch {
        healthStatus[dex] = false
      }
    }

    return healthStatus
  }
}

export default DEXAggregator