/**
 * CYPHER ORDI FUTURE - Advanced Multi-DEX Price Aggregator v4.0
 * 
 * Sistema avançado de agregação de preços que coleta e compara preços
 * de múltiplas DEXs em tempo real com atualizações via WebSocket.
 * 
 * Features:
 * - Agregação multi-DEX em tempo real
 * - WebSocket connections para updates instantâneos
 * - Sistema de cache inteligente com TTL
 * - Detecção de arbitragem automática
 * - Análise de spread e liquidez
 * - Fallback systems para APIs offline
 * - Rate limiting e throttling
 * - Validação de dados e outlier detection
 */

import { Token, Quote, DEXType, MarketData } from '@/types/quickTrade'

export interface PriceSource {
  dex: DEXType
  name: string
  apiEndpoint: string
  websocketUrl?: string
  rateLimit: number // requests per second
  reliability: number // 0-100
  isActive: boolean
  supportedChains: number[]
  headers?: Record<string, string>
  transformResponse?: (data: any) => PriceData
}

export interface PriceData {
  dex: DEXType
  tokenIn: Token
  tokenOut: Token
  price: number
  amountOut: string
  priceImpact: number
  liquidity: number
  gasEstimate: number
  timestamp: number
  blockNumber?: number
  confidence: number
  metadata: {
    poolAddress?: string
    fee?: number
    spread?: number
    volume24h?: number
    source: string
  }
}

export interface AggregatedPrice {
  tokenPair: string
  bestPrice: PriceData
  allPrices: PriceData[]
  priceSpread: {
    min: number
    max: number
    median: number
    average: number
    standardDeviation: number
  }
  arbitrageOpportunities: ArbitrageOpportunity[]
  lastUpdated: number
  stalePrices: PriceData[]
  validPrices: PriceData[]
}

export interface ArbitrageOpportunity {
  buyDEX: DEXType
  sellDEX: DEXType
  buyPrice: number
  sellPrice: number
  spread: number
  profitMargin: number
  volume: number
  riskScore: number
  minAmount: string
  maxAmount: string
  gasEstimate: number
  confidence: number
}

export interface WebSocketConnection {
  dex: DEXType
  url: string
  connection: WebSocket | null
  lastPing: number
  isConnected: boolean
  reconnectAttempts: number
  maxReconnectAttempts: number
  subscriptions: Set<string>
}

export interface PriceAggregatorConfig {
  updateInterval: number // milliseconds
  maxStaleTime: number // milliseconds
  websocketEnabled: boolean
  cacheEnabled: boolean
  cacheTTL: number
  maxConcurrentRequests: number
  timeout: number
  retryAttempts: number
  outlierDetection: boolean
  arbitrageThreshold: number // minimum spread %
  minLiquidity: number
  enabledSources: DEXType[]
}

export interface RateLimiter {
  requests: number[]
  limit: number
  window: number // milliseconds
}

export class AdvancedPriceAggregator {
  private config: PriceAggregatorConfig
  private priceSources: Map<DEXType, PriceSource> = new Map()
  private priceCache: Map<string, AggregatedPrice> = new Map()
  private websocketConnections: Map<DEXType, WebSocketConnection> = new Map()
  private rateLimiters: Map<DEXType, RateLimiter> = new Map()
  private requestQueue: Map<DEXType, Promise<PriceData | null>[]> = new Map()
  private lastUpdateTimes: Map<string, number> = new Map()
  private performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    websocketUpdates: 0,
    arbitrageOpportunities: 0,
    averageResponseTime: 0
  }

  // Event listeners
  private onPriceUpdateListeners: ((data: AggregatedPrice) => void)[] = []
  private onArbitrageListeners: ((opportunity: ArbitrageOpportunity) => void)[] = []
  private onErrorListeners: ((error: Error, source: DEXType) => void)[] = []

  constructor(config: Partial<PriceAggregatorConfig> = {}) {
    this.config = {
      updateInterval: 5000, // 5 seconds
      maxStaleTime: 30000, // 30 seconds
      websocketEnabled: true,
      cacheEnabled: true,
      cacheTTL: 10000, // 10 seconds
      maxConcurrentRequests: 10,
      timeout: 5000, // 5 seconds
      retryAttempts: 3,
      outlierDetection: true,
      arbitrageThreshold: 0.5, // 0.5%
      minLiquidity: 10000, // $10k
      enabledSources: [
        DEXType.UNISWAP_V3,
        DEXType.JUPITER,
        DEXType.SUSHISWAP,
        DEXType.CURVE,
        DEXType.BALANCER,
        DEXType.PANCAKESWAP
      ],
      ...config
    }

    this.initializePriceSources()
    this.initializeRateLimiters()
    
    if (this.config.websocketEnabled) {
      this.initializeWebSocketConnections()
    }

    // Start periodic updates
    this.startPeriodicUpdates()
  }

  /**
   * Obter preços agregados para um par de tokens
   */
  async getAggregatedPrices(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<AggregatedPrice> {
    const pairKey = this.getPairKey(tokenIn, tokenOut)
    const startTime = Date.now()

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this.getCachedPrice(pairKey)
        if (cached && !this.isStalePrice(cached)) {
          this.performanceMetrics.cacheHits++
          return cached
        }
      }

      // Collect prices from all enabled sources
      const pricePromises: Promise<PriceData | null>[] = []
      
      for (const dex of this.config.enabledSources) {
        const source = this.priceSources.get(dex)
        if (source && source.isActive && this.canMakeRequest(dex)) {
          pricePromises.push(this.fetchPriceFromSource(source, tokenIn, tokenOut, amountIn))
        }
      }

      // Wait for all price requests with timeout
      const prices = await Promise.allSettled(pricePromises)
      const validPrices: PriceData[] = []
      const failedSources: DEXType[] = []

      for (let i = 0; i < prices.length; i++) {
        const result = prices[i]
        if (result.status === 'fulfilled' && result.value) {
          validPrices.push(result.value)
        } else {
          const dex = this.config.enabledSources[i]
          failedSources.push(dex)
          this.performanceMetrics.failedRequests++
        }
      }

      // Detect and filter outliers
      const filteredPrices = this.config.outlierDetection 
        ? this.filterOutliers(validPrices)
        : validPrices

      // Create aggregated result
      const aggregatedPrice = this.createAggregatedPrice(pairKey, filteredPrices, validPrices)

      // Cache the result
      if (this.config.cacheEnabled && filteredPrices.length > 0) {
        this.cachePrice(pairKey, aggregatedPrice)
      }

      // Update performance metrics
      this.updatePerformanceMetrics(startTime, validPrices.length, failedSources.length)

      // Emit events
      this.emitPriceUpdate(aggregatedPrice)
      this.checkAndEmitArbitrageOpportunities(aggregatedPrice)

      return aggregatedPrice

    } catch (error) {
      console.error('❌ Price aggregation error:', error)
      this.performanceMetrics.failedRequests++
      throw new Error(`Price aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Buscar preços de uma fonte específica
   */
  private async fetchPriceFromSource(
    source: PriceSource,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): Promise<PriceData | null> {
    if (!this.canMakeRequest(source.dex)) {
      return null
    }

    try {
      // Add to rate limiter
      this.addRequestToRateLimit(source.dex)

      // Make API request
      const response = await this.makeApiRequest(source, tokenIn, tokenOut, amountIn)
      
      if (!response) {
        return null
      }

      // Transform response using source-specific transformer
      const priceData = source.transformResponse 
        ? source.transformResponse(response)
        : this.defaultTransformResponse(response, source, tokenIn, tokenOut, amountIn)

      // Validate price data
      if (!this.validatePriceData(priceData)) {
        return null
      }

      this.performanceMetrics.successfulRequests++
      return priceData

    } catch (error) {
      console.error(`❌ Error fetching from ${source.name}:`, error)
      this.emitError(new Error(`${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`), source.dex)
      return null
    }
  }

  /**
   * Fazer requisição à API com retry e timeout
   */
  private async makeApiRequest(
    source: PriceSource,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    attempt: number = 1
  ): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      // Construct URL based on DEX
      const url = this.constructApiUrl(source, tokenIn, tokenOut, amountIn)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...source.headers
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (attempt < this.config.retryAttempts) {
        await this.delay(1000 * attempt) // Exponential backoff
        return this.makeApiRequest(source, tokenIn, tokenOut, amountIn, attempt + 1)
      }

      throw error
    }
  }

  /**
   * Construir URL da API baseada na DEX
   */
  private constructApiUrl(
    source: PriceSource,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): string {
    const baseUrl = source.apiEndpoint
    
    // URLs específicas por DEX (mock - implementar URLs reais)
    switch (source.dex) {
      case DEXType.UNISWAP_V3:
        return `${baseUrl}/quote?tokenIn=${tokenIn.address}&tokenOut=${tokenOut.address}&amount=${amountIn}&chainId=${tokenIn.chainId}`
      
      case DEXType.JUPITER:
        return `${baseUrl}/quote?inputMint=${tokenIn.address}&outputMint=${tokenOut.address}&amount=${amountIn}&slippageBps=50`
      
      case DEXType.SUSHISWAP:
        return `${baseUrl}/swap?tokenIn=${tokenIn.address}&tokenOut=${tokenOut.address}&amount=${amountIn}&chainId=${tokenIn.chainId}`
      
      case DEXType.CURVE:
        return `${baseUrl}/get_dy?tokenIn=${tokenIn.address}&tokenOut=${tokenOut.address}&amount=${amountIn}`
      
      case DEXType.BALANCER:
        return `${baseUrl}/sor?sellToken=${tokenIn.address}&buyToken=${tokenOut.address}&sellAmount=${amountIn}&chainId=${tokenIn.chainId}`
      
      default:
        return `${baseUrl}/quote?from=${tokenIn.address}&to=${tokenOut.address}&amount=${amountIn}`
    }
  }

  /**
   * Transformação padrão de resposta
   */
  private defaultTransformResponse(
    response: any,
    source: PriceSource,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string
  ): PriceData {
    // Implementação padrão - cada DEX teria sua própria transformação
    return {
      dex: source.dex,
      tokenIn,
      tokenOut,
      price: response.price || 0,
      amountOut: response.amountOut || response.outputAmount || '0',
      priceImpact: response.priceImpact || 0,
      liquidity: response.liquidity || 0,
      gasEstimate: response.gas || response.gasEstimate || 150000,
      timestamp: Date.now(),
      blockNumber: response.blockNumber,
      confidence: source.reliability,
      metadata: {
        poolAddress: response.poolAddress,
        fee: response.fee || 0.003,
        spread: response.spread || 0,
        volume24h: response.volume24h || 0,
        source: source.name
      }
    }
  }

  /**
   * Validar dados de preço
   */
  private validatePriceData(data: PriceData): boolean {
    return (
      data.price > 0 &&
      parseFloat(data.amountOut) > 0 &&
      data.priceImpact >= 0 &&
      data.priceImpact <= 100 &&
      data.liquidity >= 0 &&
      data.gasEstimate > 0 &&
      data.confidence >= 0 &&
      data.confidence <= 100 &&
      data.timestamp > 0
    )
  }

  /**
   * Filtrar outliers usando IQR method
   */
  private filterOutliers(prices: PriceData[]): PriceData[] {
    if (prices.length < 3) return prices

    const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b)
    const q1Index = Math.floor(sortedPrices.length * 0.25)
    const q3Index = Math.floor(sortedPrices.length * 0.75)
    
    const q1 = sortedPrices[q1Index]
    const q3 = sortedPrices[q3Index]
    const iqr = q3 - q1
    
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return prices.filter(p => p.price >= lowerBound && p.price <= upperBound)
  }

  /**
   * Criar resultado agregado
   */
  private createAggregatedPrice(
    pairKey: string,
    validPrices: PriceData[],
    allPrices: PriceData[]
  ): AggregatedPrice {
    if (validPrices.length === 0) {
      throw new Error('No valid prices found')
    }

    // Sort prices by best output amount
    const sortedPrices = validPrices.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut))
    const bestPrice = sortedPrices[0]

    // Calculate price statistics
    const prices = validPrices.map(p => p.price)
    const priceSpread = this.calculatePriceSpread(prices)

    // Find arbitrage opportunities
    const arbitrageOpportunities = this.findArbitrageOpportunities(validPrices)

    // Identify stale prices
    const stalePrices = allPrices.filter(p => this.isStalePrice({ lastUpdated: p.timestamp } as any))

    return {
      tokenPair: pairKey,
      bestPrice,
      allPrices,
      priceSpread,
      arbitrageOpportunities,
      lastUpdated: Date.now(),
      stalePrices,
      validPrices
    }
  }

  /**
   * Calcular spread de preços
   */
  private calculatePriceSpread(prices: number[]) {
    const sorted = prices.sort((a, b) => a - b)
    const sum = prices.reduce((a, b) => a + b, 0)
    const mean = sum / prices.length
    
    const squaredDiffs = prices.map(price => Math.pow(price - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length
    const standardDeviation = Math.sqrt(variance)

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      average: mean,
      standardDeviation
    }
  }

  /**
   * Encontrar oportunidades de arbitragem
   */
  private findArbitrageOpportunities(prices: PriceData[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = []

    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const price1 = prices[i]
        const price2 = prices[j]

        // Skip if liquidity is too low
        if (price1.liquidity < this.config.minLiquidity || price2.liquidity < this.config.minLiquidity) {
          continue
        }

        const spread = Math.abs(price1.price - price2.price) / Math.min(price1.price, price2.price) * 100

        if (spread >= this.config.arbitrageThreshold) {
          const buyPrice = price1.price < price2.price ? price1 : price2
          const sellPrice = price1.price < price2.price ? price2 : price1

          const opportunity: ArbitrageOpportunity = {
            buyDEX: buyPrice.dex,
            sellDEX: sellPrice.dex,
            buyPrice: buyPrice.price,
            sellPrice: sellPrice.price,
            spread,
            profitMargin: spread - 0.6, // Estimate fees and slippage
            volume: Math.min(buyPrice.liquidity, sellPrice.liquidity),
            riskScore: this.calculateArbitrageRisk(buyPrice, sellPrice),
            minAmount: '1000', // $1000 minimum
            maxAmount: Math.min(buyPrice.liquidity, sellPrice.liquidity).toString(),
            gasEstimate: buyPrice.gasEstimate + sellPrice.gasEstimate,
            confidence: Math.min(buyPrice.confidence, sellPrice.confidence)
          }

          opportunities.push(opportunity)
        }
      }
    }

    return opportunities.sort((a, b) => b.profitMargin - a.profitMargin)
  }

  /**
   * Calcular risco de arbitragem
   */
  private calculateArbitrageRisk(buyPrice: PriceData, sellPrice: PriceData): number {
    let risk = 30 // Base risk

    // Liquidity risk
    if (buyPrice.liquidity < 100000 || sellPrice.liquidity < 100000) risk += 20
    if (buyPrice.liquidity < 50000 || sellPrice.liquidity < 50000) risk += 30

    // Price impact risk
    if (buyPrice.priceImpact > 2 || sellPrice.priceImpact > 2) risk += 15
    if (buyPrice.priceImpact > 5 || sellPrice.priceImpact > 5) risk += 25

    // Confidence risk
    if (buyPrice.confidence < 80 || sellPrice.confidence < 80) risk += 10
    if (buyPrice.confidence < 60 || sellPrice.confidence < 60) risk += 20

    // Gas risk
    const totalGas = buyPrice.gasEstimate + sellPrice.gasEstimate
    if (totalGas > 500000) risk += 15

    return Math.min(100, risk)
  }

  /**
   * Inicializar fontes de preços
   */
  private initializePriceSources(): void {
    const sources: PriceSource[] = [
      {
        dex: DEXType.UNISWAP_V3,
        name: 'Uniswap V3',
        apiEndpoint: 'https://api.uniswap.org/v1',
        websocketUrl: 'wss://api.uniswap.org/v1/ws',
        rateLimit: 5, // 5 requests per second
        reliability: 95,
        isActive: true,
        supportedChains: [1, 42161, 137, 10, 8453]
      },
      {
        dex: DEXType.JUPITER,
        name: 'Jupiter',
        apiEndpoint: 'https://api.jup.ag/v6',
        rateLimit: 10,
        reliability: 92,
        isActive: true,
        supportedChains: [101] // Solana
      },
      {
        dex: DEXType.SUSHISWAP,
        name: 'SushiSwap',
        apiEndpoint: 'https://api.sushi.com',
        rateLimit: 3,
        reliability: 88,
        isActive: true,
        supportedChains: [1, 42161, 137, 56, 43114]
      },
      {
        dex: DEXType.CURVE,
        name: 'Curve',
        apiEndpoint: 'https://api.curve.fi',
        rateLimit: 2,
        reliability: 90,
        isActive: true,
        supportedChains: [1, 137, 42161, 43114]
      },
      {
        dex: DEXType.BALANCER,
        name: 'Balancer',
        apiEndpoint: 'https://api.balancer.fi',
        rateLimit: 2,
        reliability: 87,
        isActive: true,
        supportedChains: [1, 137, 42161]
      },
      {
        dex: DEXType.PANCAKESWAP,
        name: 'PancakeSwap',
        apiEndpoint: 'https://api.pancakeswap.info/api/v2',
        rateLimit: 5,
        reliability: 85,
        isActive: true,
        supportedChains: [56] // BSC
      }
    ]

    sources.forEach(source => {
      this.priceSources.set(source.dex, source)
    })

  }

  /**
   * Inicializar rate limiters
   */
  private initializeRateLimiters(): void {
    this.priceSources.forEach((source, dex) => {
      this.rateLimiters.set(dex, {
        requests: [],
        limit: source.rateLimit,
        window: 1000 // 1 second
      })
    })
  }

  /**
   * Inicializar conexões WebSocket
   */
  private initializeWebSocketConnections(): void {
    this.priceSources.forEach((source, dex) => {
      if (source.websocketUrl) {
        const connection: WebSocketConnection = {
          dex,
          url: source.websocketUrl,
          connection: null,
          lastPing: 0,
          isConnected: false,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5,
          subscriptions: new Set()
        }

        this.websocketConnections.set(dex, connection)
        this.connectWebSocket(connection)
      }
    })
  }

  /**
   * Conectar WebSocket
   */
  private connectWebSocket(connection: WebSocketConnection): void {
    try {
      connection.connection = new WebSocket(connection.url)
      
      connection.connection.onopen = () => {
        connection.isConnected = true
        connection.reconnectAttempts = 0
        connection.lastPing = Date.now()
      }

      connection.connection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleWebSocketMessage(connection.dex, data)
          this.performanceMetrics.websocketUpdates++
        } catch (error) {
          console.error(`❌ WebSocket message error for ${connection.dex}:`, error)
        }
      }

      connection.connection.onclose = () => {
        connection.isConnected = false
        this.scheduleReconnect(connection)
      }

      connection.connection.onerror = (error) => {
        console.error(`❌ WebSocket error for ${connection.dex}:`, error)
        this.emitError(new Error(`WebSocket error: ${error}`), connection.dex)
      }

    } catch (error) {
      console.error(`❌ Failed to connect WebSocket for ${connection.dex}:`, error)
      this.scheduleReconnect(connection)
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(dex: DEXType, data: any): void {
    // Mock implementation - cada DEX teria seu próprio parser
    if (data.type === 'price_update' && data.tokenPair) {
      // Update cache with real-time price
      const cacheKey = data.tokenPair
      const cached = this.priceCache.get(cacheKey)
      
      if (cached) {
        // Update prices in real-time
        const updatedPrice = this.updatePriceFromWebSocket(cached, dex, data)
        if (updatedPrice) {
          this.priceCache.set(cacheKey, updatedPrice)
          this.emitPriceUpdate(updatedPrice)
        }
      }
    }
  }

  private updatePriceFromWebSocket(cached: AggregatedPrice, dex: DEXType, data: any): AggregatedPrice | null {
    // Find and update the price for the specific DEX
    const priceIndex = cached.allPrices.findIndex(p => p.dex === dex)
    if (priceIndex === -1) return null

    const updatedPrices = [...cached.allPrices]
    updatedPrices[priceIndex] = {
      ...updatedPrices[priceIndex],
      price: data.price,
      amountOut: data.amountOut,
      timestamp: Date.now(),
      liquidity: data.liquidity || updatedPrices[priceIndex].liquidity
    }

    // Recalculate aggregated data
    return this.createAggregatedPrice(cached.tokenPair, updatedPrices, updatedPrices)
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(connection: WebSocketConnection): void {
    if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts reached for ${connection.dex}`)
      return
    }

    const delay = Math.pow(2, connection.reconnectAttempts) * 1000 // Exponential backoff
    connection.reconnectAttempts++

    setTimeout(() => {
      this.connectWebSocket(connection)
    }, delay)
  }

  /**
   * Rate limiting check
   */
  private canMakeRequest(dex: DEXType): boolean {
    const limiter = this.rateLimiters.get(dex)
    if (!limiter) return true

    const now = Date.now()
    const windowStart = now - limiter.window

    // Remove old requests
    limiter.requests = limiter.requests.filter(time => time > windowStart)

    return limiter.requests.length < limiter.limit
  }

  private addRequestToRateLimit(dex: DEXType): void {
    const limiter = this.rateLimiters.get(dex)
    if (limiter) {
      limiter.requests.push(Date.now())
    }
  }

  /**
   * Cache management
   */
  private getCachedPrice(pairKey: string): AggregatedPrice | null {
    const cached = this.priceCache.get(pairKey)
    if (cached && !this.isStalePrice(cached)) {
      return cached
    }
    return null
  }

  private cachePrice(pairKey: string, price: AggregatedPrice): void {
    this.priceCache.set(pairKey, price)
    
    // Auto cleanup
    setTimeout(() => {
      this.priceCache.delete(pairKey)
    }, this.config.cacheTTL)
  }

  private isStalePrice(cached: AggregatedPrice): boolean {
    return Date.now() - cached.lastUpdated > this.config.maxStaleTime
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    setInterval(() => {
      this.cleanupStaleCache()
      this.pingWebSocketConnections()
    }, this.config.updateInterval)
  }

  private cleanupStaleCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.priceCache.entries()) {
      if (now - cached.lastUpdated > this.config.cacheTTL) {
        this.priceCache.delete(key)
      }
    }
  }

  private pingWebSocketConnections(): void {
    for (const connection of this.websocketConnections.values()) {
      if (connection.isConnected && connection.connection) {
        try {
          connection.connection.send(JSON.stringify({ type: 'ping' }))
          connection.lastPing = Date.now()
        } catch (error) {
        }
      }
    }
  }

  // Event management
  private emitPriceUpdate(data: AggregatedPrice): void {
    this.onPriceUpdateListeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('❌ Price update listener error:', error)
      }
    })
  }

  private emitError(error: Error, source: DEXType): void {
    this.onErrorListeners.forEach(listener => {
      try {
        listener(error, source)
      } catch (listenerError) {
        console.error('❌ Error listener error:', listenerError)
      }
    })
  }

  private checkAndEmitArbitrageOpportunities(data: AggregatedPrice): void {
    if (data.arbitrageOpportunities.length > 0) {
      this.performanceMetrics.arbitrageOpportunities += data.arbitrageOpportunities.length
      
      data.arbitrageOpportunities.forEach(opportunity => {
        this.onArbitrageListeners.forEach(listener => {
          try {
            listener(opportunity)
          } catch (error) {
            console.error('❌ Arbitrage listener error:', error)
          }
        })
      })
    }
  }

  // Utility methods
  private getPairKey(tokenIn: Token, tokenOut: Token): string {
    return `${tokenIn.chainId}-${tokenIn.address}-${tokenOut.address}`
  }

  private updatePerformanceMetrics(startTime: number, successCount: number, failCount: number): void {
    this.performanceMetrics.totalRequests += successCount + failCount
    this.performanceMetrics.successfulRequests += successCount
    this.performanceMetrics.failedRequests += failCount

    const responseTime = Date.now() - startTime
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - successCount - failCount) + responseTime) / 
      this.performanceMetrics.totalRequests
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public API methods

  /**
   * Add price update listener
   */
  onPriceUpdate(listener: (data: AggregatedPrice) => void): void {
    this.onPriceUpdateListeners.push(listener)
  }

  /**
   * Add arbitrage opportunity listener
   */
  onArbitrage(listener: (opportunity: ArbitrageOpportunity) => void): void {
    this.onArbitrageListeners.push(listener)
  }

  /**
   * Add error listener
   */
  onError(listener: (error: Error, source: DEXType) => void): void {
    this.onErrorListeners.push(listener)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PriceAggregatorConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return { 
      ...this.performanceMetrics,
      cacheSize: this.priceCache.size,
      activeWebSockets: Array.from(this.websocketConnections.values()).filter(c => c.isConnected).length,
      totalWebSockets: this.websocketConnections.size
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PriceAggregatorConfig {
    return { ...this.config }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.priceCache.clear()
    this.lastUpdateTimes.clear()
  }

  /**
   * Close all WebSocket connections
   */
  disconnect(): void {
    for (const connection of this.websocketConnections.values()) {
      if (connection.connection) {
        connection.connection.close()
        connection.isConnected = false
      }
    }
  }
}

export default AdvancedPriceAggregator