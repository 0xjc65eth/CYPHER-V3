/**
 * 🤖 AGENT_025: AUTO-TRADING ENGINE - Automated Execution & Monitoring  
 * 24/7 automated trading system with risk management
 * Based on research: Exchange APIs + Risk Management + Emergency Controls
 */

import { EventEmitter } from 'events';
import { TradingSignal, RiskAssessment, MarketAnalysis } from './cypher-ai-core';

// Core Interfaces
export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: Date;
  clientOrderId?: string;
}

export interface ExecutionResult {
  orderId: string;
  symbol: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  executedQty: number;
  executedPrice: number;
  commission: number;
  timestamp: Date;
  error?: string;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  percentage: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
}

export interface PortfolioStats {
  totalValue: number;
  availableBalance: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnLPercent: number;
  openPositions: number;
  dailyTrades: number;
  winRate: number;
  sharpeRatio: number;
}

export interface TradingMetrics {
  totalTrades: number;
  successfulTrades: number;
  winRate: number;
  totalPnL: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  lastUpdated: Date;
}

export interface ExchangeConfig {
  name: string;
  apiKey: string;
  secretKey: string;
  testnet: boolean;
  rateLimit: number;
  maxOrdersPerSecond: number;
  supportedPairs: string[];
}

export interface RiskConfig {
  maxDrawdownPercent: number; // 2% max drawdown
  maxPositionSizePercent: number; // 10% max per position  
  maxDailyTrades: number; // 20 max daily trades
  minRiskReward: number; // 1.5 minimum risk/reward
  stopLossPercent: number; // Default stop loss %
  emergencyStopTrigger: number; // Emergency stop at X% loss
  correlationLimit: number; // Max correlation between positions
}

/**
 * 🚀 AUTO-TRADING ENGINE - 24/7 Automated Trading System
 * Implements best practices from research: APIs + Risk Management + Monitoring
 */
export class AutoTradingEngine extends EventEmitter {
  private exchangeConfig: ExchangeConfig;
  private riskConfig: RiskConfig;
  private isActive: boolean = false;
  private emergencyStop: boolean = false;
  
  private activeOrders: Map<string, Order> = new Map();
  private openPositions: Map<string, Position> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private metrics: TradingMetrics;
  
  private dailyTradeCount: number = 0;
  private lastTradeReset: Date = new Date();
  
  constructor(exchangeConfig: ExchangeConfig, riskConfig?: Partial<RiskConfig>) {
    super();
    
    this.exchangeConfig = exchangeConfig;
    this.riskConfig = {
      maxDrawdownPercent: 2.0, // 2% max drawdown based on research
      maxPositionSizePercent: 10.0, // 10% max per position
      maxDailyTrades: 20, // Limit to prevent overtrading
      minRiskReward: 1.5, // 1.5:1 minimum risk/reward
      stopLossPercent: 2.0, // 2% default stop loss
      emergencyStopTrigger: 5.0, // 5% portfolio loss triggers emergency stop
      correlationLimit: 0.7, // Max 70% correlation between positions
      ...riskConfig
    };
    
    this.metrics = {
      totalTrades: 0,
      successfulTrades: 0,
      winRate: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      lastUpdated: new Date()
    };
    
    this.initializeEngine();
  }

  /**
   * Initialize the trading engine and start monitoring
   */
  private initializeEngine(): void {
    this.startMarketMonitoring();
    this.startRiskMonitoring();
    this.startPerformanceTracking();
    
    this.emit('engine_initialized', {
      exchange: this.exchangeConfig.name,
      testnet: this.exchangeConfig.testnet,
      riskConfig: this.riskConfig
    });
  }

  /**
   * 🎯 Execute trading signal with full risk management
   */
  async executeSignal(signal: TradingSignal, riskAssessment: RiskAssessment): Promise<ExecutionResult> {
    try {
      // Pre-execution checks
      if (this.emergencyStop) {
        throw new Error('Trading halted: Emergency stop active');
      }
      
      if (!this.isActive) {
        throw new Error('Trading engine not active');
      }
      
      // Risk validation
      const riskCheck = await this.validateSignalRisk(signal, riskAssessment);
      if (!riskCheck.approved) {
        throw new Error(`Risk check failed: ${riskCheck.reason}`);
      }
      
      // Check daily trade limits
      if (this.dailyTradeCount >= this.riskConfig.maxDailyTrades) {
        throw new Error('Daily trade limit reached');
      }
      
      // Calculate position size based on risk
      const positionSize = this.calculatePositionSize(signal, riskAssessment);
      
      // Create and execute order
      const order = await this.createOrder(signal, positionSize);
      const result = await this.executeOrder(order);
      
      if (result.status === 'SUCCESS') {
        await this.managePosition(signal, result);
        this.dailyTradeCount++;
        this.updateMetrics(result);
      }
      
      this.emit('signal_executed', { signal, result, riskAssessment });
      return result;
      
    } catch (error) {
      this.emit('execution_error', { signal, error: (error as any).message });
      throw error;
    }
  }

  /**
   * 📊 Continuous market monitoring for all positions
   */
  async monitorMarkets(): Promise<void> {
    if (this.emergencyStop || !this.isActive) return;
    
    const marketData: any[] = [];
    
    try {
      // Monitor all open positions
      for (const [symbol, position] of this.openPositions) {
        const currentPrice = await this.getCurrentPrice(symbol);
        const updatedPosition = await this.updatePosition(position, currentPrice);
        
        // Check for stop-loss or take-profit triggers
        if (this.shouldClosePosition(updatedPosition)) {
          await this.closePosition(updatedPosition, 'AUTOMATED');
        }
        
        marketData.push({
          symbol,
          currentPrice,
          position: updatedPosition,
          timestamp: new Date()
        });
      }
      
      this.emit('markets_monitored', marketData);
      
    } catch (error) {
      this.emit('monitoring_error', { error: (error as any).message });
    }
  }

  /**
   * 🛡️ Real-time risk monitoring and emergency protocols
   */
  private async startRiskMonitoring(): Promise<void> {
    setInterval(async () => {
      if (!this.isActive) return;
      
      try {
        const portfolioStats = await this.calculatePortfolioStats();
        
        // Check for maximum drawdown
        if (Math.abs(portfolioStats.unrealizedPnL) > this.riskConfig.maxDrawdownPercent) {
          await this.triggerEmergencyStop('Maximum drawdown exceeded');
          return;
        }
        
        // Check for emergency stop trigger
        if (portfolioStats.totalPnLPercent < -this.riskConfig.emergencyStopTrigger) {
          await this.triggerEmergencyStop('Emergency stop loss triggered');
          return;
        }
        
        // Check correlation limits
        await this.checkCorrelationRisk();
        
        this.emit('risk_monitored', portfolioStats);
        
      } catch (error) {
        this.emit('risk_monitoring_error', { error: (error as any).message });
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * ⚡ Real-time order management and execution
   */
  private async executeOrder(order: Order): Promise<ExecutionResult> {
    try {
      // Simulate order execution (in production, use real exchange APIs)
      const executionPrice = order.price || await this.getCurrentPrice(order.symbol);
      const commission = order.quantity * executionPrice * 0.001; // 0.1% commission
      
      const result: ExecutionResult = {
        orderId: order.id,
        symbol: order.symbol,
        status: 'SUCCESS',
        executedQty: order.quantity,
        executedPrice: executionPrice,
        commission,
        timestamp: new Date()
      };
      
      // Update order status
      order.status = 'FILLED';
      this.activeOrders.set(order.id, order);
      this.executionHistory.push(result);
      
      this.emit('order_executed', result);
      return result;
      
    } catch (error) {
      return {
        orderId: order.id,
        symbol: order.symbol,
        status: 'FAILED',
        executedQty: 0,
        executedPrice: 0,
        commission: 0,
        timestamp: new Date(),
        error: (error as any).message
      };
    }
  }

  /**
   * 🚨 Emergency stop all trading activities
   */
  async emergencyStopAll(reason: string = 'Manual trigger'): Promise<void> {
    this.emergencyStop = true;
    this.isActive = false;
    
    try {
      // Cancel all pending orders
      const cancelPromises = Array.from(this.activeOrders.values())
        .filter(order => order.status === 'PENDING')
        .map(order => this.cancelOrder(order.id));
      
      await Promise.all(cancelPromises);
      
      // Optionally close all positions (configurable)
      // await this.closeAllPositions('EMERGENCY');
      
      this.emit('emergency_stop_activated', {
        reason,
        timestamp: new Date(),
        activeOrders: this.activeOrders.size,
        openPositions: this.openPositions.size
      });
      
    } catch (error) {
      this.emit('emergency_stop_error', { error: (error as any).message });
    }
  }

  /**
   * 📈 Calculate real-time portfolio statistics
   */
  async calculatePortfolioStats(): Promise<PortfolioStats> {
    let totalValue = 10000; // Starting balance (in production, get from exchange)
    let unrealizedPnL = 0;
    let realizedPnL = 0;
    
    // Calculate unrealized P&L from open positions
    for (const position of this.openPositions.values()) {
      const currentPrice = await this.getCurrentPrice(position.symbol);
      const positionValue = position.size * currentPrice;
      const costBasis = position.size * position.entryPrice;
      
      if (position.side === 'LONG') {
        unrealizedPnL += positionValue - costBasis;
      } else {
        unrealizedPnL += costBasis - positionValue;
      }
      
      totalValue += positionValue;
    }
    
    // Calculate realized P&L from execution history
    realizedPnL = this.executionHistory
      .filter(execution => execution.status === 'SUCCESS')
      .reduce((sum, execution) => {
        // Simplified P&L calculation
        return sum + (execution.executedQty * execution.executedPrice * 0.01); // 1% profit simulation
      }, 0);
    
    const totalPnL = unrealizedPnL + realizedPnL;
    const totalPnLPercent = (totalPnL / 10000) * 100; // Percentage based on starting balance
    
    return {
      totalValue,
      availableBalance: totalValue - unrealizedPnL,
      unrealizedPnL,
      realizedPnL,
      totalPnLPercent,
      openPositions: this.openPositions.size,
      dailyTrades: this.dailyTradeCount,
      winRate: this.metrics.winRate,
      sharpeRatio: this.metrics.sharpeRatio
    };
  }

  /**
   * 📊 Update trading metrics based on execution results
   */
  private updateMetrics(result: ExecutionResult): void {
    this.metrics.totalTrades++;
    
    if (result.status === 'SUCCESS') {
      this.metrics.successfulTrades++;
      // Simplified P&L calculation for metrics
      const pnl = result.executedQty * result.executedPrice * 0.01; // 1% profit simulation
      this.metrics.totalPnL += pnl;
      
      if (pnl > 0) {
        this.metrics.averageWin = (this.metrics.averageWin + pnl) / 2;
      } else {
        this.metrics.averageLoss = (this.metrics.averageLoss + Math.abs(pnl)) / 2;
      }
    }
    
    this.metrics.winRate = (this.metrics.successfulTrades / this.metrics.totalTrades) * 100;
    this.metrics.profitFactor = this.metrics.averageWin / Math.max(this.metrics.averageLoss, 0.01);
    this.metrics.lastUpdated = new Date();
  }

  /**
   * 🎯 Validate signal against risk parameters
   */
  private async validateSignalRisk(signal: TradingSignal, risk: RiskAssessment): Promise<{approved: boolean, reason?: string}> {
    // Check risk/reward ratio
    if (signal.riskReward < this.riskConfig.minRiskReward) {
      return { approved: false, reason: `Risk/reward ratio ${signal.riskReward} below minimum ${this.riskConfig.minRiskReward}` };
    }
    
    // Check position size
    if (risk.positionSize > this.riskConfig.maxPositionSizePercent / 100) {
      return { approved: false, reason: `Position size ${risk.positionSize * 100}% exceeds maximum ${this.riskConfig.maxPositionSizePercent}%` };
    }
    
    // Check signal confidence
    if (signal.confidence < 0.6) {
      return { approved: false, reason: `Signal confidence ${signal.confidence} too low` };
    }
    
    // Check if signal is not expired
    if (new Date() > signal.expiresAt) {
      return { approved: false, reason: 'Signal expired' };
    }
    
    return { approved: true };
  }

  /**
   * 💰 Calculate optimal position size using Kelly Criterion
   */
  private calculatePositionSize(signal: TradingSignal, risk: RiskAssessment): number {
    const winRate = this.metrics.winRate / 100 || 0.6; // Default 60%
    const avgWin = this.metrics.averageWin || 0.05; // Default 5%
    const avgLoss = this.metrics.averageLoss || 0.02; // Default 2%
    
    // Kelly Criterion: f = (bp - q) / b
    // where b = odds received, p = probability of winning, q = probability of losing
    const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    
    // Use conservative Kelly (50% of calculated Kelly)
    const conservativeKelly = kellyPercent * 0.5;
    
    // Ensure within risk limits
    const maxAllowed = this.riskConfig.maxPositionSizePercent / 100;
    const finalSize = Math.min(Math.max(conservativeKelly, 0.01), maxAllowed);
    
    return finalSize;
  }

  /**
   * 📋 Create order from trading signal
   */
  private async createOrder(signal: TradingSignal, positionSize: number): Promise<Order> {
    const portfolioStats = await this.calculatePortfolioStats();
    const positionValue = portfolioStats.totalValue * positionSize;
    const quantity = positionValue / signal.entryPrice;
    
    return {
      id: `ORDER_${Date.now()}_${signal.asset}`,
      symbol: signal.asset,
      side: signal.action === 'BUY' ? 'BUY' : 'SELL',
      type: 'MARKET',
      quantity,
      timeInForce: 'GTC',
      status: 'PENDING',
      timestamp: new Date(),
      clientOrderId: signal.id
    };
  }

  /**
   * 🏢 Manage position after successful execution
   */
  private async managePosition(signal: TradingSignal, execution: ExecutionResult): Promise<void> {
    const position: Position = {
      symbol: execution.symbol,
      side: signal.action === 'BUY' ? 'LONG' : 'SHORT',
      size: execution.executedQty,
      entryPrice: execution.executedPrice,
      currentPrice: execution.executedPrice,
      unrealizedPnL: 0,
      realizedPnL: 0,
      percentage: 0,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      timestamp: new Date()
    };
    
    this.openPositions.set(execution.symbol, position);
    
    // Set up automatic stop-loss and take-profit orders
    await this.setStopLossOrder(position);
    await this.setTakeProfitOrder(position);
    
    this.emit('position_opened', position);
  }

  /**
   * ⛔ Set stop-loss order for position
   */
  private async setStopLossOrder(position: Position): Promise<void> {
    if (!position.stopLoss) return;
    
    const stopOrder: Order = {
      id: `STOP_${Date.now()}_${position.symbol}`,
      symbol: position.symbol,
      side: position.side === 'LONG' ? 'SELL' : 'BUY',
      type: 'STOP_LOSS',
      quantity: position.size,
      stopPrice: position.stopLoss,
      timeInForce: 'GTC',
      status: 'PENDING',
      timestamp: new Date()
    };
    
    this.activeOrders.set(stopOrder.id, stopOrder);
    this.emit('stop_loss_set', { position, stopOrder });
  }

  /**
   * 🎯 Set take-profit order for position
   */
  private async setTakeProfitOrder(position: Position): Promise<void> {
    if (!position.takeProfit) return;
    
    const takeProfitOrder: Order = {
      id: `TP_${Date.now()}_${position.symbol}`,
      symbol: position.symbol,
      side: position.side === 'LONG' ? 'SELL' : 'BUY',
      type: 'TAKE_PROFIT',
      quantity: position.size,
      price: position.takeProfit,
      timeInForce: 'GTC',
      status: 'PENDING',
      timestamp: new Date()
    };
    
    this.activeOrders.set(takeProfitOrder.id, takeProfitOrder);
    this.emit('take_profit_set', { position, takeProfitOrder });
  }

  /**
   * 📊 Update position with current market price
   */
  private async updatePosition(position: Position, currentPrice: number): Promise<Position> {
    const oldPrice = position.currentPrice;
    position.currentPrice = currentPrice;
    
    // Calculate unrealized P&L
    if (position.side === 'LONG') {
      position.unrealizedPnL = (currentPrice - position.entryPrice) * position.size;
    } else {
      position.unrealizedPnL = (position.entryPrice - currentPrice) * position.size;
    }
    
    // Calculate percentage return
    position.percentage = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    if (position.side === 'SHORT') position.percentage *= -1;
    
    this.openPositions.set(position.symbol, position);
    
    if (oldPrice !== currentPrice) {
      this.emit('position_updated', position);
    }
    
    return position;
  }

  /**
   * 🎯 Check if position should be closed automatically
   */
  private shouldClosePosition(position: Position): boolean {
    // Check stop-loss
    if (position.stopLoss) {
      if (position.side === 'LONG' && position.currentPrice <= position.stopLoss) {
        return true;
      }
      if (position.side === 'SHORT' && position.currentPrice >= position.stopLoss) {
        return true;
      }
    }
    
    // Check take-profit
    if (position.takeProfit) {
      if (position.side === 'LONG' && position.currentPrice >= position.takeProfit) {
        return true;
      }
      if (position.side === 'SHORT' && position.currentPrice <= position.takeProfit) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 🚪 Close position
   */
  private async closePosition(position: Position, reason: string): Promise<void> {
    try {
      const closeOrder: Order = {
        id: `CLOSE_${Date.now()}_${position.symbol}`,
        symbol: position.symbol,
        side: position.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: position.size,
        timeInForce: 'GTC',
        status: 'PENDING',
        timestamp: new Date()
      };
      
      const result = await this.executeOrder(closeOrder);
      
      if (result.status === 'SUCCESS') {
        // Update position with realized P&L
        position.realizedPnL = position.unrealizedPnL;
        position.unrealizedPnL = 0;
        
        // Remove from open positions
        this.openPositions.delete(position.symbol);
        
        // Cancel related orders (stop-loss, take-profit)
        await this.cancelRelatedOrders(position.symbol);
        
        this.emit('position_closed', { position, reason, result });
      }
      
    } catch (error) {
      this.emit('position_close_error', { position, error: (error as any).message });
    }
  }

  /**
   * ❌ Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) return false;
    
    try {
      order.status = 'CANCELLED';
      this.activeOrders.set(orderId, order);
      
      this.emit('order_cancelled', order);
      return true;
      
    } catch (error) {
      this.emit('order_cancel_error', { orderId, error: (error as any).message });
      return false;
    }
  }

  /**
   * ❌ Cancel related orders for a symbol
   */
  private async cancelRelatedOrders(symbol: string): Promise<void> {
    const relatedOrders = Array.from(this.activeOrders.values())
      .filter(order => order.symbol === symbol && order.status === 'PENDING');
    
    const cancelPromises = relatedOrders.map(order => this.cancelOrder(order.id));
    await Promise.all(cancelPromises);
  }

  /**
   * 🔗 Check correlation risk between positions
   */
  private async checkCorrelationRisk(): Promise<void> {
    // Simplified correlation check (in production, use real correlation data)
    const symbols = Array.from(this.openPositions.keys());
    
    if (symbols.length > 1) {
      // Check if too many correlated assets (BTC, ETH are highly correlated)
      const cryptoPositions = symbols.filter(s => ['BTC', 'ETH', 'LTC'].includes(s));
      
      if (cryptoPositions.length > 2) {
        this.emit('correlation_warning', {
          message: 'High correlation risk detected',
          symbols: cryptoPositions
        });
      }
    }
  }

  /**
   * 🚨 Trigger emergency stop
   */
  private async triggerEmergencyStop(reason: string): Promise<void> {
    await this.emergencyStopAll(reason);
  }

  /**
   * 💹 Get current price (simulation)
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    // Simulate price movement (in production, use real exchange APIs)
    const basePrices: Record<string, number> = { BTC: 45000, ETH: 3000, ADA: 0.5, LTC: 100 };
    const basePrice = basePrices[symbol] || 1000;
    const volatility = 0.01; // 1% volatility
    
    return basePrice; // Deterministic: return base price without random variation
  }

  /**
   * 🎮 Start/Stop engine controls
   */
  async startEngine(): Promise<void> {
    if (this.emergencyStop) {
      throw new Error('Cannot start: Emergency stop active. Please reset first.');
    }
    
    this.isActive = true;
    this.dailyTradeCount = 0;
    this.lastTradeReset = new Date();
    
    this.emit('engine_started', { timestamp: new Date() });
  }

  async stopEngine(): Promise<void> {
    this.isActive = false;
    this.emit('engine_stopped', { timestamp: new Date() });
  }

  async resetEmergencyStop(): Promise<void> {
    this.emergencyStop = false;
    this.emit('emergency_stop_reset', { timestamp: new Date() });
  }

  /**
   * 📊 Get comprehensive trading metrics
   */
  getTradingMetrics(): TradingMetrics {
    return { ...this.metrics };
  }

  /**
   * 📈 Get current portfolio statistics
   */
  async getPortfolioStats(): Promise<PortfolioStats> {
    return await this.calculatePortfolioStats();
  }

  /**
   * 📋 Get all active orders
   */
  getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * 📊 Get all open positions
   */
  getOpenPositions(): Position[] {
    return Array.from(this.openPositions.values());
  }

  /**
   * 📊 Start performance tracking
   */
  private startPerformanceTracking(): void {
    setInterval(() => {
      if (this.isActive) {
        this.emit('performance_update', {
          metrics: this.metrics,
          activeOrders: this.activeOrders.size,
          openPositions: this.openPositions.size,
          timestamp: new Date()
        });
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * 📊 Start market monitoring loop
   */
  private startMarketMonitoring(): void {
    setInterval(async () => {
      if (this.isActive && !this.emergencyStop) {
        await this.monitorMarkets();
      }
    }, 10000); // Monitor every 10 seconds
  }

  /**
   * 🔄 Reset daily counters
   */
  private resetDailyCounters(): void {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - this.lastTradeReset.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      this.dailyTradeCount = 0;
      this.lastTradeReset = now;
      this.emit('daily_reset', { timestamp: now });
    }
  }

  /**
   * 📊 Get engine status
   */
  getEngineStatus() {
    return {
      isActive: this.isActive,
      emergencyStop: this.emergencyStop,
      dailyTrades: this.dailyTradeCount,
      maxDailyTrades: this.riskConfig.maxDailyTrades,
      activeOrders: this.activeOrders.size,
      openPositions: this.openPositions.size,
      riskConfig: this.riskConfig,
      metrics: this.metrics,
      lastUpdated: new Date()
    };
  }
}

export default AutoTradingEngine;
