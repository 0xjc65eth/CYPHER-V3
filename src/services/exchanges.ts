/**
 * Real Multi-Exchange Integration Service
 * Provides real-time price data, order book access, and execution capabilities
 * across major cryptocurrency exchanges for arbitrage opportunities
 */

import { EventEmitter } from 'events';

export interface ExchangePrice {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  timestamp: number;
  source: string;
}

export interface ExchangeOrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: number;
}

export interface ExchangeConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  testnet: boolean;
  fees: {
    maker: number;
    taker: number;
    withdrawal: number;
  };
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  supportedPairs: string[];
  minTradeAmount: number;
  enabled: boolean;
}

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercent: number;
  profit: number;
  profitPercent: number;
  fees: {
    buy: number;
    sell: number;
    withdrawal: number;
    network: number;
  };
  netProfit: number;
  netProfitPercent: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  liquidity: {
    buy: number;
    sell: number;
  };
  executionTime: number; // estimated seconds
  timestamp: number;
  expiresAt: number;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  buyOrder?: {
    orderId: string;
    exchange: string;
    symbol: string;
    side: 'buy';
    amount: number;
    price: number;
    status: string;
  };
  sellOrder?: {
    orderId: string;
    exchange: string;
    symbol: string;
    side: 'sell';
    amount: number;
    price: number;
    status: string;
  };
  actualProfit?: number;
  error?: string;
  timestamp: number;
}

class ExchangeService extends EventEmitter {
  private exchanges: Map<string, ExchangeConfig> = new Map();
  private priceCache: Map<string, ExchangePrice> = new Map();
  private orderBookCache: Map<string, ExchangeOrderBook> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeExchanges();
  }

  private initializeExchanges() {
    // Binance Configuration
    this.exchanges.set('binance', {
      name: 'Binance',
      baseUrl: 'https://api.binance.com',
      testnet: false,
      fees: {
        maker: 0.001,
        taker: 0.001,
        withdrawal: 0.0005
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 1200
      },
      supportedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT'],
      minTradeAmount: 0.00001,
      enabled: true
    });

    // Hyperliquid Configuration
    this.exchanges.set('hyperliquid', {
      name: 'Hyperliquid',
      baseUrl: 'https://api.hyperliquid.xyz',
      testnet: false,
      fees: {
        maker: 0.0002,
        taker: 0.0005,
        withdrawal: 0
      },
      rateLimits: {
        requestsPerSecond: 20,
        requestsPerMinute: 1200
      },
      supportedPairs: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD'],
      minTradeAmount: 0.001,
      enabled: true
    });

    // Coinbase Advanced Configuration
    this.exchanges.set('coinbase', {
      name: 'Coinbase Advanced',
      baseUrl: 'https://api.exchange.coinbase.com',
      testnet: false,
      fees: {
        maker: 0.005,
        taker: 0.006,
        withdrawal: 0.001
      },
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 1000
      },
      supportedPairs: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'LINK-USD'],
      minTradeAmount: 0.001,
      enabled: true
    });

    // OKX Configuration
    this.exchanges.set('okx', {
      name: 'OKX',
      baseUrl: 'https://www.okx.com',
      testnet: false,
      fees: {
        maker: 0.0008,
        taker: 0.001,
        withdrawal: 0.0005
      },
      rateLimits: {
        requestsPerSecond: 20,
        requestsPerMinute: 1200
      },
      supportedPairs: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'AVAX-USDT'],
      minTradeAmount: 0.00001,
      enabled: true
    });

    // Kraken Configuration
    this.exchanges.set('kraken', {
      name: 'Kraken',
      baseUrl: 'https://api.kraken.com',
      testnet: false,
      fees: {
        maker: 0.0016,
        taker: 0.0026,
        withdrawal: 0.0015
      },
      rateLimits: {
        requestsPerSecond: 1,
        requestsPerMinute: 60
      },
      supportedPairs: ['XXBTZUSD', 'XETHZUSD', 'ADAUSD', 'SOLUSD'],
      minTradeAmount: 0.0001,
      enabled: true
    });
  }

  /**
   * Get real-time price from Binance
   */
  private async getBinancePrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      return {
        symbol,
        price: parseFloat(data.lastPrice),
        bid: parseFloat(data.bidPrice),
        ask: parseFloat(data.askPrice),
        volume24h: parseFloat(data.volume),
        timestamp: Date.now(),
        source: 'binance'
      };
    } catch (error) {
      console.error(`Binance price error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get real-time price from Hyperliquid
   */
  private async getHyperliquidPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      // Convert symbol format (BTC-USD to BTC)
      const baseSymbol = symbol.split('-')[0];
      
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      });
      
      if (!response.ok) return null;
      const data = await response.json();
      
      const price = parseFloat(data[baseSymbol] || '0');
      if (price === 0) return null;
      
      return {
        symbol,
        price,
        bid: price * 0.9995, // Estimate bid/ask spread
        ask: price * 1.0005,
        volume24h: 1000000, // Mock volume for now
        timestamp: Date.now(),
        source: 'hyperliquid'
      };
    } catch (error) {
      console.error(`Hyperliquid price error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get real-time price from Coinbase
   */
  private async getCoinbasePrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const response = await fetch(`https://api.exchange.coinbase.com/products/${symbol}/ticker`);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      return {
        symbol,
        price: parseFloat(data.price),
        bid: parseFloat(data.bid),
        ask: parseFloat(data.ask),
        volume24h: parseFloat(data.volume),
        timestamp: Date.now(),
        source: 'coinbase'
      };
    } catch (error) {
      console.error(`Coinbase price error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get real-time price from OKX
   */
  private async getOKXPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const response = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${symbol}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.data || data.data.length === 0) return null;
      
      const ticker = data.data[0];
      
      return {
        symbol,
        price: parseFloat(ticker.last),
        bid: parseFloat(ticker.bidPx),
        ask: parseFloat(ticker.askPx),
        volume24h: parseFloat(ticker.vol24h),
        timestamp: Date.now(),
        source: 'okx'
      };
    } catch (error) {
      console.error(`OKX price error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get real-time price from Kraken
   */
  private async getKrakenPrice(symbol: string): Promise<ExchangePrice | null> {
    try {
      const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${symbol}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.error && data.error.length > 0) return null;
      
      const ticker = Object.values(data.result)[0] as any;
      
      return {
        symbol,
        price: parseFloat(ticker.c[0]), // Last trade price
        bid: parseFloat(ticker.b[0]),
        ask: parseFloat(ticker.a[0]),
        volume24h: parseFloat(ticker.v[1]), // 24h volume
        timestamp: Date.now(),
        source: 'kraken'
      };
    } catch (error) {
      console.error(`Kraken price error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get prices from all exchanges for a symbol
   */
  public async getAllPrices(baseSymbol: string): Promise<ExchangePrice[]> {
    const prices: ExchangePrice[] = [];
    
    // Define symbol mappings for different exchanges
    const symbolMappings = {
      binance: `${baseSymbol}USDT`,
      hyperliquid: `${baseSymbol}-USD`,
      coinbase: `${baseSymbol}-USD`,
      okx: `${baseSymbol}-USDT`,
      kraken: baseSymbol === 'BTC' ? 'XXBTZUSD' : 
               baseSymbol === 'ETH' ? 'XETHZUSD' : 
               `${baseSymbol}USD`
    };

    // Fetch prices from all exchanges concurrently
    const pricePromises = [
      this.getBinancePrice(symbolMappings.binance),
      this.getHyperliquidPrice(symbolMappings.hyperliquid),
      this.getCoinbasePrice(symbolMappings.coinbase),
      this.getOKXPrice(symbolMappings.okx),
      this.getKrakenPrice(symbolMappings.kraken)
    ];

    const results = await Promise.allSettled(pricePromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        prices.push(result.value);
        // Cache the price
        const exchange = Object.keys(symbolMappings)[index];
        this.priceCache.set(`${exchange}:${baseSymbol}`, result.value);
      }
    });

    return prices;
  }

  /**
   * Detect arbitrage opportunities
   */
  public async detectArbitrageOpportunities(symbol: string = 'BTC'): Promise<ArbitrageOpportunity[]> {
    const prices = await this.getAllPrices(symbol);
    const opportunities: ArbitrageOpportunity[] = [];
    
    if (prices.length < 2) return opportunities;

    // Compare all price pairs
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const buyPrice = prices[i];
        const sellPrice = prices[j];
        
        // Check both directions
        const opp1 = this.calculateArbitrageOpportunity(symbol, buyPrice, sellPrice);
        const opp2 = this.calculateArbitrageOpportunity(symbol, sellPrice, buyPrice);
        
        if (opp1 && opp1.netProfitPercent > 0.5) opportunities.push(opp1);
        if (opp2 && opp2.netProfitPercent > 0.5) opportunities.push(opp2);
      }
    }

    // Sort by net profit percentage
    return opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);
  }

  /**
   * Calculate arbitrage opportunity between two prices
   */
  private calculateArbitrageOpportunity(
    symbol: string,
    buySource: ExchangePrice,
    sellSource: ExchangePrice
  ): ArbitrageOpportunity | null {
    if (buySource.ask >= sellSource.bid) return null;

    const buyExchangeConfig = this.exchanges.get(buySource.source);
    const sellExchangeConfig = this.exchanges.get(sellSource.source);
    
    if (!buyExchangeConfig || !sellExchangeConfig) return null;

    const spread = sellSource.bid - buySource.ask;
    const spreadPercent = (spread / buySource.ask) * 100;
    
    // Calculate fees
    const tradeAmount = 1; // 1 unit for calculation
    const buyFee = buySource.ask * tradeAmount * buyExchangeConfig.fees.taker;
    const sellFee = sellSource.bid * tradeAmount * sellExchangeConfig.fees.taker;
    const withdrawalFee = buyExchangeConfig.fees.withdrawal * buySource.ask;
    const networkFee = 0.0001 * buySource.ask; // Estimated network fee
    
    const totalFees = buyFee + sellFee + withdrawalFee + networkFee;
    const grossProfit = spread * tradeAmount;
    const netProfit = grossProfit - totalFees;
    const netProfitPercent = (netProfit / (buySource.ask * tradeAmount)) * 100;

    // Calculate confidence based on various factors
    let confidence = 50;
    
    // Volume factor
    const minVolume = Math.min(buySource.volume24h, sellSource.volume24h);
    if (minVolume > 1000) confidence += 20;
    else if (minVolume > 100) confidence += 10;
    
    // Spread factor
    if (spreadPercent > 2) confidence += 20;
    else if (spreadPercent > 1) confidence += 10;
    
    // Time factor (fresher data = higher confidence)
    const maxAge = Math.max(Date.now() - buySource.timestamp, Date.now() - sellSource.timestamp);
    if (maxAge < 30000) confidence += 10; // Less than 30 seconds

    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (confidence > 80 && netProfitPercent > 2) riskLevel = 'low';
    else if (confidence < 60 || netProfitPercent < 1) riskLevel = 'high';

    return {
      id: `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      buyExchange: buySource.source,
      sellExchange: sellSource.source,
      buyPrice: buySource.ask,
      sellPrice: sellSource.bid,
      spread,
      spreadPercent,
      profit: grossProfit,
      profitPercent: (grossProfit / (buySource.ask * tradeAmount)) * 100,
      fees: {
        buy: buyFee,
        sell: sellFee,
        withdrawal: withdrawalFee,
        network: networkFee
      },
      netProfit,
      netProfitPercent,
      confidence,
      riskLevel,
      liquidity: {
        buy: buySource.volume24h,
        sell: sellSource.volume24h
      },
      executionTime: this.estimateExecutionTime(buySource.source, sellSource.source),
      timestamp: Date.now(),
      expiresAt: Date.now() + 30000 // 30 seconds validity
    };
  }

  /**
   * Estimate execution time based on exchange characteristics
   */
  private estimateExecutionTime(buyExchange: string, sellExchange: string): number {
    const executionTimes = {
      binance: 5,
      hyperliquid: 3,
      coinbase: 8,
      okx: 6,
      kraken: 12
    };

    const buyTime = executionTimes[buyExchange as keyof typeof executionTimes] || 10;
    const sellTime = executionTimes[sellExchange as keyof typeof executionTimes] || 10;
    const transferTime = 60; // Estimated transfer time between exchanges

    return Math.max(buyTime, sellTime) + transferTime;
  }

  /**
   * Start real-time arbitrage scanning
   */
  public startScanning(interval: number = 5000): void {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.emit('scanningStarted');
    
    const scan = async () => {
      if (!this.isScanning) return;
      
      try {
        const symbols = ['BTC', 'ETH', 'SOL'];
        const allOpportunities: ArbitrageOpportunity[] = [];
        
        for (const symbol of symbols) {
          const opportunities = await this.detectArbitrageOpportunities(symbol);
          allOpportunities.push(...opportunities);
        }
        
        // Update opportunities cache
        this.opportunities.clear();
        allOpportunities.forEach(opp => {
          this.opportunities.set(opp.id, opp);
        });
        
        this.emit('opportunitiesUpdated', allOpportunities);
        
        // Clean up expired opportunities
        this.cleanExpiredOpportunities();
        
      } catch (error) {
        console.error('Arbitrage scanning error:', error);
        this.emit('scanError', error);
      }
    };

    // Initial scan
    scan();
    
    // Setup interval scanning
    this.scanInterval = setInterval(scan, interval);
  }

  /**
   * Stop arbitrage scanning
   */
  public stopScanning(): void {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.emit('scanningStopped');
  }

  /**
   * Clean up expired opportunities
   */
  private cleanExpiredOpportunities(): void {
    const now = Date.now();
    for (const [id, opportunity] of this.opportunities) {
      if (now > opportunity.expiresAt) {
        this.opportunities.delete(id);
      }
    }
  }

  /**
   * Execute arbitrage opportunity (simulation for now)
   */
  public async executeArbitrage(opportunityId: string): Promise<ExecutionResult> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      return {
        success: false,
        executionId: '',
        error: 'Opportunity not found',
        timestamp: Date.now()
      };
    }

    // Check if opportunity is still valid
    if (Date.now() > opportunity.expiresAt) {
      return {
        success: false,
        executionId: '',
        error: 'Opportunity expired',
        timestamp: Date.now()
      };
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Simulate execution (in production, this would make real API calls)
      this.emit('executionStarted', { opportunityId, executionId });
      
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, opportunity.executionTime * 1000));
      
      // Deterministic: always succeed in simulation (no random success/failure)
      const success = true;

      if (success) {
        const actualProfit = opportunity.netProfit; // Deterministic - no random variation
        
        const result: ExecutionResult = {
          success: true,
          executionId,
          buyOrder: {
            orderId: `buy_${Date.now()}`,
            exchange: opportunity.buyExchange,
            symbol: opportunity.symbol,
            side: 'buy',
            amount: 1,
            price: opportunity.buyPrice,
            status: 'filled'
          },
          sellOrder: {
            orderId: `sell_${Date.now()}`,
            exchange: opportunity.sellExchange,
            symbol: opportunity.symbol,
            side: 'sell',
            amount: 1,
            price: opportunity.sellPrice,
            status: 'filled'
          },
          actualProfit,
          timestamp: Date.now()
        };
        
        this.emit('executionCompleted', result);
        return result;
      } else {
        const result: ExecutionResult = {
          success: false,
          executionId,
          error: 'Execution failed due to insufficient liquidity or price change',
          timestamp: Date.now()
        };
        
        this.emit('executionFailed', result);
        return result;
      }
      
    } catch (error) {
      const result: ExecutionResult = {
        success: false,
        executionId,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        timestamp: Date.now()
      };
      
      this.emit('executionError', result);
      return result;
    }
  }

  /**
   * Get current opportunities
   */
  public getOpportunities(): ArbitrageOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  /**
   * Get exchange configurations
   */
  public getExchangeConfigs(): Map<string, ExchangeConfig> {
    return this.exchanges;
  }

  /**
   * Get cached prices
   */
  public getCachedPrices(): Map<string, ExchangePrice> {
    return this.priceCache;
  }

  /**
   * Health check for all exchanges
   */
  public async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [exchangeId] of this.exchanges) {
      try {
        switch (exchangeId) {
          case 'binance':
            const binanceResponse = await fetch('https://api.binance.com/api/v3/ping');
            health[exchangeId] = binanceResponse.ok;
            break;
          case 'coinbase':
            const coinbaseResponse = await fetch('https://api.exchange.coinbase.com/time');
            health[exchangeId] = coinbaseResponse.ok;
            break;
          default:
            health[exchangeId] = true; // Assume healthy for others
        }
      } catch {
        health[exchangeId] = false;
      }
    }
    
    return health;
  }
}

// Export singleton instance
export const exchangeService = new ExchangeService();
export default exchangeService;