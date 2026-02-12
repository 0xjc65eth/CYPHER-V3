import { EventEmitter } from 'events'
import { wsManager } from '../websocket/websocket-manager'
import { binanceEngine, okxEngine, bybitEngine, TradingEngine } from '../trading/trading-engine'

interface ArbitrageOpportunity {
  id: string
  buyExchange: string
  sellExchange: string
  symbol: string
  buyPrice: number
  sellPrice: number
  spread: number
  spreadPercent: number
  volume: number
  estimatedProfit: number
  estimatedFees: number
  netProfit: number
  confidence: number
  timestamp: Date
}

interface PriceData {
  exchange: string
  symbol: string
  bid: number
  ask: number
  volume: number
  timestamp: number
}

export class ArbitrageScanner extends EventEmitter {
  private prices: Map<string, Map<string, PriceData>> = new Map()
  private isScanning: boolean = false
  private scanInterval: NodeJS.Timeout | null = null
  private minSpreadPercent: number = 0.3
  private maxSlippage: number = 0.1
  private tradingEngines: Map<string, TradingEngine> = new Map()
  
  constructor() {
    super()
    this.setupEngines()
    this.setupWebSocketListeners()
  }
  
  private setupEngines() {
    this.tradingEngines.set('binance', binanceEngine)
    this.tradingEngines.set('okx', okxEngine)
    this.tradingEngines.set('bybit', bybitEngine)
  }
  
  private setupWebSocketListeners() {
    wsManager.on('price', ({ exchange, data }) => {
      if (!this.prices.has(data.symbol)) {
        this.prices.set(data.symbol, new Map())
      }
      
      this.prices.get(data.symbol)!.set(exchange, {
        exchange,
        symbol: data.symbol,
        bid: data.price * 0.9995, // Simulated bid
        ask: data.price * 1.0005, // Simulated ask
        volume: data.volume24h,
        timestamp: data.timestamp
      })
      
      // Check for opportunities whenever we get new price data
      if (this.isScanning) {
        this.findOpportunities(data.symbol)
      }
    })
    
    wsManager.on('orderbook', ({ exchange, data }) => {
      if (!this.prices.has(data.symbol)) {
        this.prices.set(data.symbol, new Map())
      }
      
      const bestBid = data.bids[0]?.[0] || 0
      const bestAsk = data.asks[0]?.[0] || 0
      
      this.prices.get(data.symbol)!.set(exchange, {
        exchange,
        symbol: data.symbol,
        bid: bestBid,
        ask: bestAsk,
        volume: 0, // Would need to calculate from order book
        timestamp: data.timestamp
      })
    })
  }
  
  startScanning(symbols: string[], intervalMs: number = 100) {
    if (this.isScanning) return
    
    this.isScanning = true
    
    // Subscribe to symbols on all exchanges
    symbols.forEach(symbol => {
      wsManager.subscribeToSymbol('binance', symbol)
      wsManager.subscribeToSymbol('okx', symbol)
      wsManager.subscribeToSymbol('bybit', symbol)
    })
    
    // Start periodic scanning
    this.scanInterval = setInterval(() => {
      symbols.forEach(symbol => this.findOpportunities(symbol))
    }, intervalMs)
    
    this.emit('scanningStarted')
  }
  
  stopScanning() {
    if (!this.isScanning) return
    
    this.isScanning = false
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
    
    this.emit('scanningStopped')
  }
  
  private findOpportunities(symbol: string) {
    const symbolPrices = this.prices.get(symbol)
    if (!symbolPrices || symbolPrices.size < 2) return
    
    const priceArray = Array.from(symbolPrices.values())
    
    // Check all exchange pairs for opportunities
    for (let i = 0; i < priceArray.length; i++) {
      for (let j = i + 1; j < priceArray.length; j++) {
        const buyExchange = priceArray[i].ask < priceArray[j].ask ? priceArray[i] : priceArray[j]
        const sellExchange = priceArray[i].bid > priceArray[j].bid ? priceArray[i] : priceArray[j]
        
        if (buyExchange.exchange === sellExchange.exchange) continue
        
        const spread = sellExchange.bid - buyExchange.ask
        const spreadPercent = (spread / buyExchange.ask) * 100
        
        if (spreadPercent >= this.minSpreadPercent) {
          // Calculate fees correctly (0.1% on each transaction for 1000 units)
          const tradeAmount = 1000;
          const buyFee = buyExchange.ask * tradeAmount * 0.001;
          const sellFee = sellExchange.bid * tradeAmount * 0.001;
          const totalFees = buyFee + sellFee;
          const grossProfit = spread * tradeAmount;
          const netProfit = grossProfit - totalFees;

          const opportunity: ArbitrageOpportunity = {
            id: `${Date.now()}-${symbol}-${buyExchange.exchange}-${sellExchange.exchange}`,
            buyExchange: buyExchange.exchange,
            sellExchange: sellExchange.exchange,
            symbol,
            buyPrice: buyExchange.ask,
            sellPrice: sellExchange.bid,
            spread,
            spreadPercent,
            volume: Math.min(buyExchange.volume, sellExchange.volume),
            estimatedProfit: grossProfit,
            estimatedFees: totalFees,
            netProfit: netProfit,
            confidence: this.calculateConfidence(spreadPercent, buyExchange.volume, sellExchange.volume),
            timestamp: new Date()
          }

          // Only emit opportunities with positive net profit
          if (netProfit > 0) {
            this.emit('opportunityFound', opportunity)
          }
        }
      }
    }
  }
  
  private calculateConfidence(spreadPercent: number, volume1: number, volume2: number): number {
    let confidence = 0
    
    // Spread confidence (max 40 points)
    if (spreadPercent > 2) confidence += 40
    else if (spreadPercent > 1) confidence += 30
    else if (spreadPercent > 0.5) confidence += 20
    else confidence += 10
    
    // Volume confidence (max 30 points)
    const minVolume = Math.min(volume1, volume2)
    if (minVolume > 1000000) confidence += 30
    else if (minVolume > 500000) confidence += 20
    else if (minVolume > 100000) confidence += 10
    
    // Time confidence (max 30 points)
    // Assuming recent prices are more reliable
    confidence += 30
    
    return confidence
  }
  
  async executeArbitrage(opportunity: ArbitrageOpportunity, amount: number) {
    const buyEngine = this.tradingEngines.get(opportunity.buyExchange)
    const sellEngine = this.tradingEngines.get(opportunity.sellExchange)
    
    if (!buyEngine || !sellEngine) {
      throw new Error('Trading engine not available')
    }
    
    try {
      // Execute both orders simultaneously
      const [buyOrder, sellOrder] = await Promise.all([
        buyEngine.createOrder({
          symbol: opportunity.symbol,
          side: 'buy',
          type: 'limit',
          quantity: amount,
          price: opportunity.buyPrice * (1 + this.maxSlippage),
          timeInForce: 'IOC' // Immediate or cancel
        }),
        sellEngine.createOrder({
          symbol: opportunity.symbol,
          side: 'sell',
          type: 'limit',
          quantity: amount,
          price: opportunity.sellPrice * (1 - this.maxSlippage),
          timeInForce: 'IOC'
        })
      ])
      
      // Calculate actual profit
      const actualProfit = (sellOrder.executedPrice * sellOrder.executedQty) - 
                          (buyOrder.executedPrice * buyOrder.executedQty) -
                          buyOrder.fee - sellOrder.fee
      
      this.emit('arbitrageExecuted', {
        opportunity,
        buyOrder,
        sellOrder,
        actualProfit,
        success: buyOrder.status === 'filled' && sellOrder.status === 'filled'
      })
      
      return { buyOrder, sellOrder, actualProfit }
    } catch (error) {
      this.emit('arbitrageError', { opportunity, error })
      throw error
    }
  }
  
  setMinSpread(percent: number) {
    this.minSpreadPercent = percent
  }
  
  setMaxSlippage(percent: number) {
    this.maxSlippage = percent / 100
  }
  
  getOpportunities(): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = []
    
    this.prices.forEach((symbolPrices, symbol) => {
      this.findOpportunities(symbol)
    })
    
    return opportunities
  }
}

// Export singleton instance
export const arbitrageScanner = new ArbitrageScanner()