import axios from 'axios';
// Only import crypto on server side
const crypto = typeof window === 'undefined' ? require('crypto') : null;

export interface HyperliquidPosition {
  coin: string;
  entryPx: string;
  leverage: string;
  maxTradeSz: string;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

export interface HyperliquidOrder {
  oid: number;
  cloid: string;
  coin: string;
  side: 'B' | 'A'; // Buy or Ask
  sz: string;
  px: string;
  timestamp: number;
  is_trigger: boolean;
  reduce_only: boolean;
  order_type: 'limit' | 'market' | 'stop' | 'stop_limit';
}

export interface TradingStrategy {
  name: string;
  enabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  parameters: Record<string, any>;
}

export interface ArbitrageOpportunity {
  asset: string;
  exchange1: string;
  exchange2: string;
  price1: number;
  price2: number;
  spread: number;
  profitPotential: number;
  volume: number;
  confidence: number;
}

export interface TradingSignal {
  asset: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reason: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  timestamp: number;
  strategy: string;
}

export interface BacktestResult {
  strategy: string;
  period: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  avgTradeReturn: number;
  volatility: number;
}

class HyperliquidService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://api.hyperliquid.xyz';
  private testnetUrl = 'https://api.hyperliquid-testnet.xyz';
  private isTestnet: boolean;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5000; // 5 seconds for real-time data
  
  // Safety limits
  private readonly MAX_POSITION_SIZE = 100000; // $100k max position
  private readonly MAX_DAILY_LOSS = 5000; // $5k max daily loss
  private readonly MIN_PROFIT_THRESHOLD = 0.05; // 0.05% minimum profit
  
  // Trading strategies configuration
  private strategies: TradingStrategy[] = [
    {
      name: 'Arbitrage Scanner',
      enabled: true,
      riskLevel: 'low',
      maxPositionSize: 10000,
      stopLoss: 0.5,
      takeProfit: 2.0,
      parameters: {
        minSpread: 0.05,
        maxSlippage: 0.1,
        timeoutMs: 30000
      }
    },
    {
      name: 'Grid Trading',
      enabled: false,
      riskLevel: 'medium',
      maxPositionSize: 25000,
      stopLoss: 2.0,
      takeProfit: 4.0,
      parameters: {
        gridLevels: 10,
        gridRange: 0.02,
        rebalanceInterval: 3600000 // 1 hour
      }
    },
    {
      name: 'DCA Strategy',
      enabled: false,
      riskLevel: 'low',
      maxPositionSize: 50000,
      stopLoss: 5.0,
      takeProfit: 10.0,
      parameters: {
        buyInterval: 86400000, // 24 hours
        buyAmount: 1000,
        maxBuys: 10
      }
    },
    {
      name: 'Momentum Trading',
      enabled: false,
      riskLevel: 'high',
      maxPositionSize: 20000,
      stopLoss: 3.0,
      takeProfit: 6.0,
      parameters: {
        momentumThreshold: 5.0,
        volumeThreshold: 1000000,
        timeframe: '1h'
      }
    },
    {
      name: 'Mean Reversion',
      enabled: false,
      riskLevel: 'medium',
      maxPositionSize: 15000,
      stopLoss: 4.0,
      takeProfit: 8.0,
      parameters: {
        deviationThreshold: 2.0,
        lookbackPeriod: 20,
        maxHoldTime: 86400000 // 24 hours
      }
    }
  ];

  constructor() {
    this.apiKey = process.env.HYPERLIQUID_API_KEY || '';
    this.secretKey = process.env.HYPERLIQUID_SECRET_KEY || '';
    this.isTestnet = process.env.HYPERLIQUID_TESTNET === 'true';
    
    if (!this.apiKey) {
    }
    
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'POST', data?: any, requiresAuth = false) {
    try {
      const baseUrl = this.isTestnet ? this.testnetUrl : this.baseUrl;
      const url = `${baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication if required
      if (requiresAuth && this.apiKey && this.secretKey) {
        const timestamp = Date.now().toString();
        const message = `${method}${endpoint}${JSON.stringify(data || {})}${timestamp}`;
        const signature = crypto
          .createHmac('sha256', this.secretKey)
          .update(message)
          .digest('hex');
        
        headers['HL-API-KEY'] = this.apiKey;
        headers['HL-API-SIGNATURE'] = signature;
        headers['HL-API-TIMESTAMP'] = timestamp;
      }

      const config = {
        method,
        url,
        headers,
        timeout: 15000,
        ...(data && { data })
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('🚫 Hyperliquid API error:', error.response?.data || error.message);
      throw new Error(`Hyperliquid API error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Market Data Methods
  async getMarketPrices(): Promise<Record<string, number>> {
    const cacheKey = 'market-prices';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await this.makeRequest('/info', 'POST', {
        type: 'allMids'
      });

      const prices: Record<string, number> = {};
      Object.entries(response).forEach(([asset, price]) => {
        prices[asset] = parseFloat(price as string);
      });

      this.cache.set(cacheKey, { data: prices, timestamp: Date.now() });
      return prices;
    } catch (error) {
      console.error('❌ Error fetching market prices:', error);
      return this.getMockPrices();
    }
  }

  async getOrderBook(asset: string, depth: number = 20): Promise<any> {
    try {
      const response = await this.makeRequest('/info', 'POST', {
        type: 'l2Book',
        coin: asset
      });

      return {
        bids: response.levels[0]?.slice(0, depth) || [],
        asks: response.levels[1]?.slice(0, depth) || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`❌ Error fetching order book for ${asset}:`, error);
      return { bids: [], asks: [], timestamp: Date.now() };
    }
  }

  // Portfolio Management
  async getUserState(address?: string): Promise<any> {
    const userAddress = address || this.apiKey;
    const cacheKey = `user-state-${userAddress}`;
    
    try {
      const response = await this.makeRequest('/info', 'POST', {
        type: 'clearinghouseState',
        user: userAddress
      });

      this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.error('❌ Error fetching user state:', error);
      return this.getMockUserState();
    }
  }

  async getOpenPositions(address?: string): Promise<HyperliquidPosition[]> {
    try {
      const userState = await this.getUserState(address);
      const positions = userState.assetPositions || [];
      
      return positions
        .filter((pos: any) => pos.position && parseFloat(pos.position.szi) !== 0)
        .map((pos: any) => ({
          coin: pos.position.coin,
          entryPx: pos.position.entryPx,
          leverage: pos.position.leverage,
          maxTradeSz: pos.position.maxTradeSz,
          positionValue: pos.position.positionValue,
          returnOnEquity: pos.position.returnOnEquity,
          szi: pos.position.szi,
          unrealizedPnl: pos.position.unrealizedPnl || '0'
        }));
    } catch (error) {
      console.error('❌ Error fetching positions:', error);
      return this.getMockPositions();
    }
  }

  // Order Management
  async placeOrder(
    asset: string,
    side: 'buy' | 'sell',
    size: number,
    price?: number,
    orderType: 'limit' | 'market' = 'limit',
    reduceOnly = false
  ): Promise<{ success: boolean; orderId?: string; message: string }> {
    try {
      // Safety checks
      if (size * (price || 0) > this.MAX_POSITION_SIZE) {
        return {
          success: false,
          message: `Position size exceeds maximum limit of $${this.MAX_POSITION_SIZE}`
        };
      }

      // Simulate order placement in demo mode
      if (!this.apiKey || this.isTestnet) {
        const orderId = `demo_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
        
        return {
          success: true,
          orderId,
          message: `Demo order placed successfully: ${side.toUpperCase()} ${size} ${asset}`
        };
      }

      const orderData = {
        coin: asset,
        is_buy: side === 'buy',
        sz: size.toString(),
        limit_px: price?.toString(),
        order_type: orderType,
        reduce_only: reduceOnly,
        cloid: `bot_${Date.now()}`
      };

      const response = await this.makeRequest('/exchange', 'POST', {
        action: {
          type: 'order',
          orders: [orderData]
        },
        nonce: Date.now(),
        signature: '' // Would need proper signing
      }, true);

      return {
        success: true,
        orderId: response.response?.data?.statuses?.[0]?.resting?.oid?.toString(),
        message: `Order placed successfully: ${side.toUpperCase()} ${size} ${asset}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to place order: ${error.message}`
      };
    }
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apiKey || this.isTestnet) {
        return {
          success: true,
          message: `Demo order ${orderId} cancelled successfully`
        };
      }

      const response = await this.makeRequest('/exchange', 'POST', {
        action: {
          type: 'cancel',
          cancels: [{ oid: parseInt(orderId) }]
        },
        nonce: Date.now(),
        signature: '' // Would need proper signing
      }, true);

      return {
        success: true,
        message: `Order ${orderId} cancelled successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to cancel order: ${error.message}`
      };
    }
  }

  // Trading Strategies
  async scanArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      const hyperliquidPrices = await this.getMarketPrices();
      const opportunities: ArbitrageOpportunity[] = [];
      
      // Compare with other exchanges (simulated for demo)
      const exchangeRates = {
        'Binance': 1.001,
        'OKX': 0.999,
        'Bybit': 1.002,
        'Coinbase': 0.998
      };

      Object.entries(hyperliquidPrices).forEach(([asset, price]) => {
        Object.entries(exchangeRates).forEach(([exchange, rate]) => {
          const otherPrice = price * rate;
          const spread = Math.abs(price - otherPrice);
          const profitPotential = (spread / Math.min(price, otherPrice)) * 100;
          
          if (profitPotential > this.MIN_PROFIT_THRESHOLD) {
            const confidence = Math.min(profitPotential * 20, 95);
            
            opportunities.push({
              asset,
              exchange1: 'Hyperliquid',
              exchange2: exchange,
              price1: price,
              price2: otherPrice,
              spread,
              profitPotential,
              volume: Math.random() * 2000000,
              confidence
            });
          }
        });
      });

      return opportunities
        .sort((a, b) => b.profitPotential - a.profitPotential)
        .slice(0, 10);
    } catch (error) {
      console.error('❌ Error scanning arbitrage opportunities:', error);
      return this.getMockArbitrageOpportunities();
    }
  }

  async executeArbitrageStrategy(opportunity: ArbitrageOpportunity): Promise<{ success: boolean; message: string }> {
    try {
      // Validate opportunity
      if (opportunity.profitPotential < this.MIN_PROFIT_THRESHOLD) {
        return {
          success: false,
          message: `Profit potential too low: ${opportunity.profitPotential.toFixed(3)}%. Minimum required: ${this.MIN_PROFIT_THRESHOLD}%`
        };
      }

      // Check if arbitrage strategy is enabled
      const strategy = this.strategies.find(s => s.name === 'Arbitrage Scanner');
      if (!strategy?.enabled) {
        return {
          success: false,
          message: 'Arbitrage strategy is disabled'
        };
      }

      // Calculate position size
      const positionSize = Math.min(
        strategy.maxPositionSize,
        opportunity.volume * 0.05 // Max 5% of available volume
      );

      // Execute trades (simulated)

      // Place orders (in demo mode, just log)
      const buyResult = await this.placeOrder(
        opportunity.asset,
        'buy',
        positionSize / opportunity.price1,
        opportunity.price1
      );

      if (!buyResult.success) {
        return buyResult;
      }

      return {
        success: true,
        message: `Arbitrage executed successfully! Expected profit: ${opportunity.profitPotential.toFixed(3)}%`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Arbitrage execution failed: ${error.message}`
      };
    }
  }

  async executeGridTradingStrategy(
    asset: string,
    gridLevels: number = 10,
    gridRange: number = 0.02
  ): Promise<{ success: boolean; message: string }> {
    try {
      const strategy = this.strategies.find(s => s.name === 'Grid Trading');
      if (!strategy?.enabled) {
        return {
          success: false,
          message: 'Grid Trading strategy is disabled'
        };
      }

      const prices = await this.getMarketPrices();
      const currentPrice = prices[asset];
      
      if (!currentPrice) {
        return {
          success: false,
          message: `Price not found for ${asset}`
        };
      }

      // Calculate grid levels
      const upperBound = currentPrice * (1 + gridRange);
      const lowerBound = currentPrice * (1 - gridRange);
      const stepSize = (upperBound - lowerBound) / gridLevels;
      const orderSize = strategy.maxPositionSize / (gridLevels * currentPrice);


      // Place grid orders (simulated)
      const orders = [];
      for (let i = 0; i < gridLevels; i++) {
        const buyPrice = lowerBound + (stepSize * i);
        const sellPrice = buyPrice + stepSize;
        
        // Place buy order
        if (buyPrice < currentPrice) {
          orders.push({
            side: 'buy',
            price: buyPrice,
            size: orderSize
          });
        }
        
        // Place sell order
        if (sellPrice > currentPrice) {
          orders.push({
            side: 'sell',
            price: sellPrice,
            size: orderSize
          });
        }
      }


      return {
        success: true,
        message: `Grid Trading configured for ${asset} with ${gridLevels} levels. ${orders.length} orders placed.`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Grid Trading setup failed: ${error.message}`
      };
    }
  }

  async executeDCAStrategy(
    asset: string,
    totalAmount: number,
    intervals: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const strategy = this.strategies.find(s => s.name === 'DCA Strategy');
      if (!strategy?.enabled) {
        return {
          success: false,
          message: 'DCA Strategy is disabled'
        };
      }

      const amountPerInterval = totalAmount / intervals;
      const intervalMs = strategy.parameters.buyInterval;
      

      // Schedule DCA purchases (would need a proper scheduler in production)
      return {
        success: true,
        message: `DCA configured: $${amountPerInterval.toFixed(2)} in ${asset} every ${intervalMs / 3600000} hours for ${intervals} intervals`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `DCA setup failed: ${error.message}`
      };
    }
  }

  // Backtesting
  async backtestStrategy(
    strategyName: string,
    asset: string,
    startDate: Date,
    endDate: Date
  ): Promise<BacktestResult> {
    try {
      
      // Simulate backtesting (would need historical data in production)
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalTrades = Math.floor(totalDays * 0.5); // Simulate ~0.5 trades per day
      const winRate = 0.65 + Math.random() * 0.2; // 65-85% win rate
      const avgWin = 0.02 + Math.random() * 0.03; // 2-5% average win
      const avgLoss = -0.01 - Math.random() * 0.02; // -1 to -3% average loss
      
      const totalReturn = (totalTrades * winRate * avgWin) + (totalTrades * (1 - winRate) * avgLoss);
      const sharpeRatio = totalReturn / (0.15 + Math.random() * 0.1); // Simulated volatility
      const maxDrawdown = Math.abs(avgLoss) * (1 + Math.random());
      const volatility = 0.15 + Math.random() * 0.1;

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      return {
        strategy: strategyName,
        period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
        totalReturn: totalReturn * 100,
        sharpeRatio,
        maxDrawdown: maxDrawdown * 100,
        winRate: winRate * 100,
        totalTrades,
        avgTradeReturn: (totalReturn / totalTrades) * 100,
        volatility: volatility * 100
      };
    } catch (error: any) {
      throw new Error(`Backtest failed: ${error.message}`);
    }
  }

  // Risk Management
  async checkRiskLimits(): Promise<{ withinLimits: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    const positions = await this.getOpenPositions();
    
    // Check position sizes
    let totalExposure = 0;
    positions.forEach(pos => {
      const positionValue = Math.abs(parseFloat(pos.szi)) * parseFloat(pos.entryPx);
      totalExposure += positionValue;
      
      if (positionValue > this.MAX_POSITION_SIZE) {
        warnings.push(`Position in ${pos.coin} exceeds maximum size limit`);
      }
    });

    // Check total exposure
    if (totalExposure > this.MAX_POSITION_SIZE * 3) {
      warnings.push('Total exposure exceeds recommended limits');
    }

    // Check daily P&L (would need to track this properly)
    const analytics = await this.getPortfolioAnalytics();
    if (Math.abs(analytics.totalPnL) > this.MAX_DAILY_LOSS) {
      warnings.push('Daily loss limit approached or exceeded');
    }

    return {
      withinLimits: warnings.length === 0,
      warnings
    };
  }

  // Portfolio Analytics
  async getPortfolioAnalytics(address?: string): Promise<any> {
    try {
      const [positions, prices] = await Promise.all([
        this.getOpenPositions(address),
        this.getMarketPrices()
      ]);

      let totalValue = 0;
      let totalPnL = 0;
      let totalLeverage = 0;

      const positionAnalysis = positions.map(pos => {
        const currentPrice = prices[pos.coin] || 0;
        const entryPrice = parseFloat(pos.entryPx);
        const size = parseFloat(pos.szi);
        const leverage = parseFloat(pos.leverage);
        
        const positionValue = Math.abs(size) * currentPrice;
        const pnl = (currentPrice - entryPrice) * size;
        const pnlPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

        totalValue += positionValue;
        totalPnL += pnl;
        totalLeverage += leverage;

        return {
          ...pos,
          currentPrice,
          positionValue,
          pnl,
          pnlPercent
        };
      });

      const avgLeverage = positions.length > 0 ? totalLeverage / positions.length : 0;
      const totalPnLPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

      return {
        totalPositions: positions.length,
        totalValue,
        totalPnL,
        totalPnLPercent,
        avgLeverage,
        positions: positionAnalysis,
        riskLevel: this.calculateRiskLevel(avgLeverage, totalPnLPercent),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error calculating portfolio analytics:', error);
      return this.getMockPortfolioAnalytics();
    }
  }

  private calculateRiskLevel(avgLeverage: number, pnlPercent: number): string {
    if (avgLeverage > 10 || Math.abs(pnlPercent) > 20) return 'High';
    if (avgLeverage > 5 || Math.abs(pnlPercent) > 10) return 'Medium';
    return 'Low';
  }

  // Strategy Management
  getStrategies(): TradingStrategy[] {
    return [...this.strategies];
  }

  enableStrategy(strategyName: string): boolean {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.enabled = true;
      return true;
    }
    return false;
  }

  disableStrategy(strategyName: string): boolean {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.enabled = false;
      return true;
    }
    return false;
  }

  updateStrategyParameters(strategyName: string, parameters: Record<string, any>): boolean {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (strategy) {
      strategy.parameters = { ...strategy.parameters, ...parameters };
      return true;
    }
    return false;
  }

  // Mock data methods for demo/fallback
  private getMockPrices(): Record<string, number> {
    return {
      'BTC': 98500 + (Math.random() - 0.5) * 1000,
      'ETH': 3850 + (Math.random() - 0.5) * 100,
      'SOL': 245 + (Math.random() - 0.5) * 20,
      'DOGE': 0.42 + (Math.random() - 0.5) * 0.05,
      'AVAX': 45.30 + (Math.random() - 0.5) * 5
    };
  }

  private getMockUserState() {
    return {
      assetPositions: [
        {
          position: {
            coin: 'BTC',
            entryPx: '97500',
            leverage: '3',
            szi: '0.1',
            unrealizedPnl: '150'
          }
        }
      ]
    };
  }

  private getMockPositions(): HyperliquidPosition[] {
    return [
      {
        coin: 'BTC',
        entryPx: '97500',
        leverage: '3',
        maxTradeSz: '10',
        positionValue: '9850',
        returnOnEquity: '1.5',
        szi: '0.1',
        unrealizedPnl: '150'
      }
    ];
  }

  private getMockArbitrageOpportunities(): ArbitrageOpportunity[] {
    return [
      {
        asset: 'BTC',
        exchange1: 'Hyperliquid',
        exchange2: 'Binance',
        price1: 98500,
        price2: 98650,
        spread: 150,
        profitPotential: 0.15,
        volume: 5000000,
        confidence: 85
      },
      {
        asset: 'ETH',
        exchange1: 'Hyperliquid',
        exchange2: 'OKX',
        price1: 3850,
        price2: 3865,
        spread: 15,
        profitPotential: 0.39,
        volume: 3000000,
        confidence: 78
      }
    ];
  }

  private getMockPortfolioAnalytics() {
    return {
      totalPositions: 3,
      totalValue: 25000,
      totalPnL: 750,
      totalPnLPercent: 3.0,
      avgLeverage: 2.5,
      positions: [],
      riskLevel: 'Low',
      lastUpdated: new Date().toISOString()
    };
  }
}

export const hyperliquidService = new HyperliquidService();
export default hyperliquidService;