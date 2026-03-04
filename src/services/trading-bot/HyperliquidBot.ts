/**
 * Hyperliquid Trading Bot Integration
 * Advanced automated trading system for CYPHER ORDi Future V3
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { FeeSystem } from '@/lib/fee-system';
import crypto from 'crypto';

// Hyperliquid API Types
export interface HyperliquidConfig {
  apiKey: string;
  privateKey: string;
  accountAddress: string;
  network: 'mainnet' | 'testnet';
  maxPositionSize: number;
  maxDailyLoss: number;
  defaultLeverage: number;
  riskParameters: RiskParameters;
}

export interface RiskParameters {
  maxDrawdown: number;
  maxPositionRisk: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  trailingStopPercentage?: number;
  maxOpenPositions: number;
  minLiquidityRequired: number;
  maxSlippage: number;
  cooldownPeriod: number; // minutes after loss
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: 'scalping' | 'swing' | 'arbitrage' | 'market_making' | 'momentum' | 'mean_reversion';
  enabled: boolean;
  parameters: Record<string, any>;
  indicators: string[];
  timeframe: string;
  minVolume: number;
  maxExposure: number;
  winRateTarget: number;
  profitTarget: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  openTime: number;
  strategyId: string;
}

export interface Order {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  size: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'rejected';
  filledSize: number;
  avgFillPrice: number;
  fee: number;
  timestamp: number;
  strategyId?: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  fundingRate: number;
  openInterest: number;
  timestamp: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  strategy: string;
  indicators: Record<string, number>;
  price: number;
  targetPrice: number;
  stopLoss: number;
  size: number;
  leverage: number;
  timestamp: number;
  expiresAt: number;
}

export interface BotPerformance {
  startTime: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalFees: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number;
  expectancy: number;
  positions: {
    open: number;
    closed: number;
    totalVolume: number;
  };
}

export class HyperliquidBot extends EventEmitter {
  private config: HyperliquidConfig;
  private baseURL: string = 'https://api.hyperliquid.xyz';
  private wsURL: string = 'wss://api.hyperliquid.xyz/ws';
  private ws: WebSocket | null = null;
  private logger: EnhancedLogger;
  private feeSystem: FeeSystem;
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, Order> = new Map();
  private strategies: Map<string, TradingStrategy> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private signals: Map<string, TradingSignal> = new Map();
  private performance: BotPerformance;
  private isRunning: boolean = false;
  private isConnected: boolean = false;
  private tradingEnabled: boolean = false;
  private emergencyStop: boolean = false;

  constructor(config: HyperliquidConfig) {
    super();
    this.config = config;
    this.logger = new EnhancedLogger();
    this.feeSystem = new FeeSystem();
    
    this.performance = {
      startTime: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      totalFees: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      avgWinAmount: 0,
      avgLossAmount: 0,
      profitFactor: 0,
      expectancy: 0,
      positions: {
        open: 0,
        closed: 0,
        totalVolume: 0
      }
    };

    this.logger.info('Hyperliquid Trading Bot initialized', {
      component: 'HyperliquidBot',
      network: config.network,
      address: config.accountAddress
    });
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Trading bot is already running');
      return;
    }

    try {
      this.isRunning = true;
      this.emergencyStop = false;
      
      // Connect to WebSocket
      await this.connectWebSocket();
      
      // Load account state
      await this.loadAccountState();
      
      // Initialize default strategies
      this.initializeDefaultStrategies();
      
      // Start market data monitoring
      this.startMarketDataMonitoring();
      
      // Start strategy execution loop
      this.startStrategyLoop();
      
      // Start risk monitoring
      this.startRiskMonitoring();
      
      this.tradingEnabled = true;
      this.logger.info('Trading bot started successfully');
      this.emit('started');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to start trading bot:');
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the trading bot
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.tradingEnabled = false;
      this.isRunning = false;
      
      // Close all open positions
      await this.closeAllPositions('Bot stopped');
      
      // Cancel all pending orders
      await this.cancelAllOrders();
      
      // Disconnect WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      this.logger.info('Trading bot stopped');
      this.emit('stopped');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error stopping trading bot:');
      throw error;
    }
  }

  /**
   * Emergency stop - immediately halt all trading
   */
  async emergencyStopTrading(reason: string): Promise<void> {
    this.emergencyStop = true;
    this.tradingEnabled = false;
    
    this.logger.error('EMERGENCY STOP ACTIVATED', { reason });
    
    try {
      // Close all positions at market
      await this.closeAllPositions(reason, true);
      
      // Cancel all orders
      await this.cancelAllOrders();
      
      this.emit('emergencyStop', { reason, timestamp: Date.now() });

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error during emergency stop:');
    }
  }

  /**
   * Add or update a trading strategy
   */
  async addStrategy(strategy: TradingStrategy): Promise<void> {
    this.strategies.set(strategy.id, strategy);
    
    if (strategy.enabled && this.isRunning) {
      // Start executing the strategy
      this.executeStrategy(strategy);
    }
    
    this.logger.info('Strategy added/updated', { strategyId: strategy.id });
    this.emit('strategyAdded', strategy);
  }

  /**
   * Execute a manual trade
   */
  async executeTrade(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    type: 'market' | 'limit' = 'market',
    price?: number,
    leverage: number = 1,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<Order> {
    if (!this.tradingEnabled || this.emergencyStop) {
      throw new Error('Trading is disabled');
    }

    try {
      // Risk checks
      await this.performRiskChecks(symbol, side, size, leverage);
      
      // Create order
      const order = await this.createOrder({
        symbol,
        side,
        type,
        size,
        price,
        leverage,
        stopLoss,
        takeProfit
      });
      
      // Collect fees
      const feeCalculation = await this.feeSystem.calculateFee(
        size * (price || this.marketData.get(symbol)?.price || 0),
        'hyperliquid',
        symbol
      );
      
      await this.feeSystem.collectFee(feeCalculation, symbol, this.config.accountAddress);
      
      this.logger.info('Trade executed', { orderId: order.id, symbol, side, size });
      this.emit('tradeExecuted', order);
      
      return order;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to execute trade:');
      throw error;
    }
  }

  /**
   * Get current positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get bot performance metrics
   */
  getPerformance(): BotPerformance {
    return { ...this.performance };
  }

  /**
   * Get active strategies
   */
  getStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Private methods
   */

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsURL);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.logger.info('WebSocket connected to Hyperliquid');
        
        // Authenticate
        this.authenticate();
        
        // Subscribe to channels
        this.subscribeToChannels();
        
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.logger.warn('WebSocket disconnected');
        
        // Attempt reconnection if bot is running
        if (this.isRunning) {
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      };

      this.ws.onerror = (error) => {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'WebSocket error:');
        reject(error);
      };

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private authenticate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const timestamp = Date.now();
    const message = `${timestamp}:auth`;
    const signature = this.signMessage(message);

    this.ws.send(JSON.stringify({
      type: 'auth',
      timestamp,
      signature,
      address: this.config.accountAddress
    }));
  }

  private signMessage(message: string): string {
    return crypto
      .createHmac('sha256', this.config.privateKey)
      .update(message)
      .digest('hex');
  }

  private subscribeToChannels(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to account updates
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channels: ['positions', 'orders', 'fills', 'funding']
    }));

    // Subscribe to market data
    const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD']; // Default symbols
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channels: symbols.map(s => `ticker:${s}`)
    }));
  }

  private async loadAccountState(): Promise<void> {
    try {
      // Load open positions
      const positions = await this.getAccountPositions();
      positions.forEach(pos => this.positions.set(pos.id, pos));

      // Load open orders
      const orders = await this.getAccountOrders();
      orders.forEach(order => this.orders.set(order.id, order));

      // Update performance metrics
      await this.updatePerformanceMetrics();

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to load account state:');
      throw error;
    }
  }

  private initializeDefaultStrategies(): void {
    // Momentum strategy
    this.addStrategy({
      id: 'momentum-btc',
      name: 'BTC Momentum',
      type: 'momentum',
      enabled: true,
      parameters: {
        symbol: 'BTC-USD',
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9
      },
      indicators: ['RSI', 'MACD', 'Volume'],
      timeframe: '15m',
      minVolume: 1000000,
      maxExposure: 0.2,
      winRateTarget: 60,
      profitTarget: 2
    });

    // Market making strategy
    this.addStrategy({
      id: 'mm-eth',
      name: 'ETH Market Making',
      type: 'market_making',
      enabled: false,
      parameters: {
        symbol: 'ETH-USD',
        spreadBps: 10,
        orderSize: 0.1,
        orderCount: 5,
        skew: 0,
        repostThreshold: 5
      },
      indicators: ['OrderBook', 'Spread'],
      timeframe: '1m',
      minVolume: 500000,
      maxExposure: 0.15,
      winRateTarget: 55,
      profitTarget: 0.5
    });
  }

  private startMarketDataMonitoring(): void {
    // Update market data every second
    setInterval(async () => {
      if (!this.isRunning || !this.isConnected) return;

      try {
        const symbols = Array.from(new Set(
          Array.from(this.strategies.values())
            .filter(s => s.enabled)
            .map(s => s.parameters.symbol)
        ));

        for (const symbol of symbols) {
          const marketData = await this.getMarketData(symbol);
          this.marketData.set(symbol, marketData);
        }

      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error updating market data:');
      }
    }, 1000);
  }

  private startStrategyLoop(): void {
    // Execute strategies every 5 seconds
    setInterval(async () => {
      if (!this.tradingEnabled || this.emergencyStop) return;

      for (const strategy of this.strategies.values()) {
        if (strategy.enabled) {
          try {
            await this.executeStrategy(strategy);
          } catch (error) {
            this.logger.error(`Strategy execution error (${strategy.id}):`, error);
          }
        }
      }
    }, 5000);
  }

  private async executeStrategy(strategy: TradingStrategy): Promise<void> {
    const symbol = strategy.parameters.symbol;
    const marketData = this.marketData.get(symbol);
    
    if (!marketData) {
      this.logger.warn(`No market data for ${symbol}`);
      return;
    }

    // Check minimum volume
    if (marketData.volume24h < strategy.minVolume) {
      return;
    }

    // Generate trading signal
    const signal = await this.generateSignal(strategy, marketData);
    
    if (!signal || signal.confidence < 70) {
      return;
    }

    // Check if we already have a position
    const existingPosition = Array.from(this.positions.values())
      .find(p => p.symbol === symbol && p.strategyId === strategy.id);

    if (existingPosition) {
      // Manage existing position
      await this.managePosition(existingPosition, signal);
    } else if (signal.action !== 'hold') {
      // Open new position
      await this.openPosition(signal, strategy);
    }
  }

  private async generateSignal(
    strategy: TradingStrategy,
    marketData: MarketData
  ): Promise<TradingSignal | null> {
    // This would implement actual trading logic based on strategy type
    // For now, returning a mock signal
    
    const signal: TradingSignal = {
      id: `signal-${Date.now()}`,
      symbol: marketData.symbol,
      action: 'hold',
      confidence: 50,
      strategy: strategy.id,
      indicators: {},
      price: marketData.price,
      targetPrice: marketData.price * 1.02,
      stopLoss: marketData.price * 0.98,
      size: 0.01,
      leverage: this.config.defaultLeverage,
      timestamp: Date.now(),
      expiresAt: Date.now() + 300000 // 5 minutes
    };

    // Example momentum strategy logic
    if (strategy.type === 'momentum') {
      const rsi = this.calculateRSI(marketData.symbol, strategy.parameters.rsiPeriod);
      const macd = this.calculateMACD(
        marketData.symbol,
        strategy.parameters.macdFast,
        strategy.parameters.macdSlow,
        strategy.parameters.macdSignal
      );

      signal.indicators = { rsi, macd: macd.histogram };

      if (rsi < strategy.parameters.rsiOversold && macd.histogram > 0) {
        signal.action = 'buy';
        signal.confidence = 85;
      } else if (rsi > strategy.parameters.rsiOverbought && macd.histogram < 0) {
        signal.action = 'sell';
        signal.confidence = 85;
      }
    }

    this.signals.set(signal.id, signal);
    return signal;
  }

  private async openPosition(signal: TradingSignal, strategy: TradingStrategy): Promise<void> {
    try {
      const order = await this.executeTrade(
        signal.symbol,
        signal.action as 'buy' | 'sell',
        signal.size,
        'market',
        undefined,
        signal.leverage,
        signal.stopLoss,
        signal.targetPrice
      );

      this.logger.info('Position opened', {
        strategyId: strategy.id,
        orderId: order.id,
        symbol: signal.symbol,
        side: signal.action
      });

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to open position:');
    }
  }

  private async managePosition(position: Position, signal: TradingSignal): Promise<void> {
    // Update stop loss if price moved favorably
    if (position.side === 'long' && signal.price > position.entryPrice * 1.01) {
      const newStopLoss = position.entryPrice * 1.005; // Move to breakeven
      if (!position.stopLoss || newStopLoss > position.stopLoss) {
        await this.updatePositionStopLoss(position.id, newStopLoss);
      }
    }

    // Close position on opposite signal
    if (
      (position.side === 'long' && signal.action === 'sell') ||
      (position.side === 'short' && signal.action === 'buy')
    ) {
      await this.closePosition(position.id, 'Signal reversal');
    }
  }

  private startRiskMonitoring(): void {
    // Monitor risk metrics every 10 seconds
    setInterval(async () => {
      if (!this.tradingEnabled) return;

      try {
        // Check daily loss limit
        if (this.performance.totalPnL < -this.config.maxDailyLoss) {
          await this.emergencyStopTrading('Daily loss limit exceeded');
          return;
        }

        // Check max drawdown
        if (this.performance.currentDrawdown > this.config.riskParameters.maxDrawdown) {
          await this.emergencyStopTrading('Max drawdown exceeded');
          return;
        }

        // Check position limits
        const openPositions = this.positions.size;
        if (openPositions > this.config.riskParameters.maxOpenPositions) {
          this.tradingEnabled = false;
          this.logger.warn('Max open positions reached, pausing new trades');
        }

      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Risk monitoring error:');
      }
    }, 10000);
  }

  private async performRiskChecks(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    leverage: number
  ): Promise<void> {
    // Check position size
    const marketData = this.marketData.get(symbol);
    if (!marketData) throw new Error('No market data available');

    const positionValue = size * marketData.price * leverage;
    if (positionValue > this.config.maxPositionSize) {
      throw new Error('Position size exceeds maximum allowed');
    }

    // Check account margin
    const requiredMargin = positionValue / leverage;
    const availableMargin = await this.getAvailableMargin();
    
    if (requiredMargin > availableMargin) {
      throw new Error('Insufficient margin');
    }

    // Check existing exposure
    const currentExposure = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.size * pos.currentPrice, 0);
    
    if (currentExposure + positionValue > this.config.maxPositionSize * 3) {
      throw new Error('Total exposure limit exceeded');
    }
  }

  private async createOrder(params: any): Promise<Order> {
    const order: Order = {
      id: `order-${Date.now()}`,
      clientOrderId: `client-${Date.now()}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      size: params.size,
      price: params.price,
      status: 'pending',
      filledSize: 0,
      avgFillPrice: 0,
      fee: 0,
      timestamp: Date.now(),
      strategyId: params.strategyId
    };

    // Send order to Hyperliquid API
    const response = await this.makeRequest('/orders', 'POST', {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      size: order.size,
      price: order.price,
      leverage: params.leverage,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit
    });

    order.id = response.orderId;
    this.orders.set(order.id, order);

    return order;
  }

  private async closePosition(positionId: string, reason: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) return;

    const closeSide = position.side === 'long' ? 'sell' : 'buy';
    
    await this.executeTrade(
      position.symbol,
      closeSide,
      position.size,
      'market'
    );

    this.logger.info('Position closed', { positionId, reason });
  }

  private async closeAllPositions(reason: string, emergency: boolean = false): Promise<void> {
    const positions = Array.from(this.positions.values());
    
    await Promise.all(
      positions.map(position => 
        this.closePosition(position.id, reason)
      )
    );
  }

  private async cancelAllOrders(): Promise<void> {
    const orders = Array.from(this.orders.values())
      .filter(o => o.status === 'pending' || o.status === 'partial');
    
    await Promise.all(
      orders.map(order => this.cancelOrder(order.id))
    );
  }

  private async cancelOrder(orderId: string): Promise<void> {
    await this.makeRequest(`/orders/${orderId}`, 'DELETE');
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'cancelled';
    }
  }

  private async updatePositionStopLoss(positionId: string, stopLoss: number): Promise<void> {
    await this.makeRequest(`/positions/${positionId}`, 'PUT', { stopLoss });
    const position = this.positions.get(positionId);
    if (position) {
      position.stopLoss = stopLoss;
    }
  }

  private async getAccountPositions(): Promise<Position[]> {
    const response = await this.makeRequest('/positions');
    return response.positions || [];
  }

  private async getAccountOrders(): Promise<Order[]> {
    const response = await this.makeRequest('/orders');
    return response.orders || [];
  }

  private async getMarketData(symbol: string): Promise<MarketData> {
    const response = await this.makeRequest(`/market/${symbol}`);
    return {
      symbol,
      price: response.price,
      bid: response.bid,
      ask: response.ask,
      spread: response.ask - response.bid,
      volume24h: response.volume24h,
      high24h: response.high24h,
      low24h: response.low24h,
      change24h: response.change24h,
      fundingRate: response.fundingRate,
      openInterest: response.openInterest,
      timestamp: Date.now()
    };
  }

  private async getAvailableMargin(): Promise<number> {
    const response = await this.makeRequest('/account');
    return response.availableMargin || 0;
  }

  private async updatePerformanceMetrics(): Promise<void> {
    // Calculate performance from positions and orders
    const closedPositions = Array.from(this.positions.values())
      .filter(p => p.realizedPnL !== 0);
    
    this.performance.totalTrades = closedPositions.length;
    this.performance.winningTrades = closedPositions.filter(p => p.realizedPnL > 0).length;
    this.performance.losingTrades = closedPositions.filter(p => p.realizedPnL < 0).length;
    this.performance.winRate = this.performance.totalTrades > 0 
      ? (this.performance.winningTrades / this.performance.totalTrades) * 100 
      : 0;
    
    this.performance.totalPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
    this.performance.positions.open = this.positions.size;
    this.performance.positions.closed = closedPositions.length;
  }

  private calculateRSI(symbol: string, period: number): number {
    // Deterministic neutral RSI (no live data)
    return 50;
  }

  private calculateMACD(symbol: string, fast: number, slow: number, signal: number): any {
    // Deterministic neutral MACD (no live data)
    return {
      macd: 0,
      signal: 0,
      histogram: 0
    };
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'position':
          this.handlePositionUpdate(message.data);
          break;
        case 'order':
          this.handleOrderUpdate(message.data);
          break;
        case 'fill':
          this.handleFillUpdate(message.data);
          break;
        case 'ticker':
          this.handleTickerUpdate(message.data);
          break;
        default:
          this.logger.debug('Unknown message type:', message.type);
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error handling WebSocket message:');
    }
  }

  private handlePositionUpdate(data: any): void {
    const position: Position = {
      ...data,
      unrealizedPnL: (data.currentPrice - data.entryPrice) * data.size * (data.side === 'long' ? 1 : -1)
    };
    
    this.positions.set(position.id, position);
    this.emit('positionUpdate', position);
  }

  private handleOrderUpdate(data: any): void {
    const order = this.orders.get(data.id);
    if (order) {
      Object.assign(order, data);
      this.emit('orderUpdate', order);
    }
  }

  private handleFillUpdate(data: any): void {
    this.emit('fill', data);
    this.updatePerformanceMetrics();
  }

  private handleTickerUpdate(data: any): void {
    const marketData = this.marketData.get(data.symbol);
    if (marketData) {
      Object.assign(marketData, data);
    }
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const timestamp = Date.now();
    const message = `${timestamp}:${method}:${endpoint}:${data ? JSON.stringify(data) : ''}`;
    const signature = this.signMessage(message);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp.toString(),
      'X-Signature': signature,
      'X-Account': this.config.accountAddress
    };

    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Hyperliquid API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }
}

// Export factory function
export const createHyperliquidBot = (config: HyperliquidConfig): HyperliquidBot => {
  return new HyperliquidBot(config);
};