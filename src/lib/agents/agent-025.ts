/**
 * @deprecated Use src/agent/ architecture instead (AgentOrchestrator + strategies).
 * This legacy agent is kept only because multiAgentSystem.ts imports from it.
 *
 * 🤖 AGENT_025: Auto-Trading Engine
 * 24/7 automated trade execution with risk management
 */

import { EventEmitter } from 'events';
import { TradingSignal } from './agent-024';
import { TradingEngine, Order } from '../trading/trading-engine';

export interface AutoTradingConfig {
  enabled: boolean;
  maxPositionSize: number; // % of portfolio
  maxDailyLoss: number; // % stop loss for the day
  minConfidence: number; // Minimum signal confidence
  cooldownPeriod: number; // ms between trades
  emergencyStop: boolean;
}

export interface TradeExecution {
  id: string;
  signalId: string;
  orderId: string;
  timestamp: Date;
  symbol: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
}

export class Agent025_AutoTrading extends EventEmitter {
  private isActive: boolean = false;
  private tradingEngine: TradingEngine | null = null;
  private lastTradeTime: Date | null = null;
  private dailyPnL: number = 0;
  private executionHistory: TradeExecution[] = [];
  
  private config: AutoTradingConfig = {
    enabled: false,
    maxPositionSize: 5, // 5% of portfolio
    maxDailyLoss: 2, // 2% daily stop loss
    minConfidence: 0.75,
    cooldownPeriod: 60000, // 1 minute
    emergencyStop: false
  };

  constructor(tradingEngine: TradingEngine) {
    super();
    this.tradingEngine = tradingEngine;
  }

  start() {
    if (this.isActive || !this.tradingEngine) return;
    
    this.isActive = true;
    this.config.enabled = true;
    this.config.emergencyStop = false;
    
    this.emit('agent:started');
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.config.enabled = false;
    
    this.emit('agent:stopped');
  }

  emergencyStop() {
    this.config.emergencyStop = true;
    this.stop();
    
    // Cancel all pending orders
    this.emit('emergency:stop');
  }

  async processSignal(signal: TradingSignal): Promise<TradeExecution | null> {
    // Validation checks
    if (!this.canExecuteTrade(signal)) {
      return null;
    }

    try {
      // Calculate position size
      const positionSize = this.calculatePositionSize(signal);
      
      // Create order
      const order = await this.tradingEngine!.createOrder({
        symbol: signal.symbol,
        side: signal.action === 'BUY' ? 'buy' : 'sell',
        type: 'market',
        quantity: positionSize,
        price: signal.price
      });

      // Record execution
      const execution: TradeExecution = {
        id: `EXEC-${Date.now()}`,
        signalId: signal.id,
        orderId: order.id,
        timestamp: new Date(),
        symbol: signal.symbol,
        action: signal.action as 'BUY' | 'SELL',
        amount: positionSize,
        price: signal.price,
        status: 'SUCCESS'
      };

      this.executionHistory.push(execution);
      this.lastTradeTime = new Date();
      
      this.emit('trade:executed', execution);
      
      return execution;
    } catch (error: any) {
      const failedExecution: TradeExecution = {
        id: `EXEC-${Date.now()}`,
        signalId: signal.id,
        orderId: '',
        timestamp: new Date(),
        symbol: signal.symbol,
        action: signal.action as 'BUY' | 'SELL',
        amount: 0,
        price: signal.price,
        status: 'FAILED',
        error: error.message
      };

      this.executionHistory.push(failedExecution);
      this.emit('trade:failed', failedExecution);
      console.error(`❌ Trade failed: ${error.message}`);
      
      return failedExecution;
    }
  }

  private canExecuteTrade(signal: TradingSignal): boolean {
    // Check if auto-trading is enabled
    if (!this.config.enabled || this.config.emergencyStop) {
      return false;
    }

    // Check confidence threshold
    if (signal.confidence < this.config.minConfidence) {
      return false;
    }

    // Check cooldown period
    if (this.lastTradeTime) {
      const timeSinceLastTrade = Date.now() - this.lastTradeTime.getTime();
      if (timeSinceLastTrade < this.config.cooldownPeriod) {
        return false;
      }
    }

    // Check daily loss limit
    if (this.dailyPnL < -this.config.maxDailyLoss) {
      this.emergencyStop();
      return false;
    }

    // Skip HOLD signals
    if (signal.action === 'HOLD') {
      return false;
    }

    return true;
  }

  private calculatePositionSize(signal: TradingSignal): number {
    // Kelly Criterion-inspired position sizing
    const kellyFraction = (signal.confidence - 0.5) * 2; // Simplified Kelly
    const maxPosition = this.config.maxPositionSize / 100;
    const positionSize = Math.min(kellyFraction * maxPosition, maxPosition);
    
    // Mock calculation - in production, use actual portfolio value
    const portfolioValue = 100000;
    const btcPrice = signal.price;
    const usdAmount = portfolioValue * positionSize;
    const btcAmount = usdAmount / btcPrice;
    
    return Number(btcAmount.toFixed(8));
  }

  updateConfig(newConfig: Partial<AutoTradingConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', this.config);
  }

  getStatus() {
    return {
      isActive: this.isActive,
      autoTradingEnabled: this.config.enabled,
      emergencyStop: this.config.emergencyStop,
      dailyPnL: this.dailyPnL,
      totalExecutions: this.executionHistory.length,
      recentExecutions: this.executionHistory.slice(-10)
    };
  }

  getExecutionHistory(): TradeExecution[] {
    return this.executionHistory;
  }
}