/**
 * Advanced Ordinals Automated Trading System
 * Intelligent trading bot with risk management and strategy optimization
 */

import {
  OrdinalsMarketplace,
  OrdinalsMarketplaceFactory,
  StandardizedInscription,
  StandardizedCollection
} from './integrations';
import { OrdinalsAnalytics, TradingOpportunity, CollectionAnalysis } from './OrdinalsAnalytics';

export interface TradingStrategy {
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number; // Expected annual return percentage
  maxDrawdown: number; // Maximum acceptable drawdown percentage
  timeframe: 'short' | 'medium' | 'long';
  priority: number; // 1-10, higher is more priority
}

export interface TradingPosition {
  id: string;
  inscriptionId: string;
  inscriptionNumber: number;
  collectionId: string;
  strategy: string;
  type: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  entryTimestamp: number;
  marketplace: OrdinalsMarketplace;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  status: 'open' | 'closed' | 'pending';
  metadata?: Record<string, any>;
}

export interface TradingOrder {
  id: string;
  inscriptionId: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop_loss' | 'take_profit';
  price?: number;
  triggerPrice?: number;
  quantity: number;
  marketplace: OrdinalsMarketplace;
  strategy: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number;
  filledAt?: number;
  filledPrice?: number;
  error?: string;
}

export interface RiskParameters {
  maxPositionSize: number; // Maximum position size as percentage of portfolio
  maxPortfolioRisk: number; // Maximum portfolio risk percentage
  maxDailyLoss: number; // Maximum daily loss percentage
  maxDrawdown: number; // Maximum drawdown before stopping trading
  minLiquidityScore: number; // Minimum liquidity score to trade
  maxConcentration: number; // Maximum concentration in single collection
  stopLossPercentage: number; // Default stop loss percentage
  takeProfitPercentage: number; // Default take profit percentage
  cooldownPeriod: number; // Cooldown period after loss (in minutes)
}

export interface TradingPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalPnLPercentage: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number; // Gross profit / Gross loss
  sharpeRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  totalFees: number;
  netPnL: number;
  averageHoldingPeriod: number; // In hours
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  monthlyReturns: Array<{
    month: string;
    return: number;
    trades: number;
  }>;
}

export interface TradingSession {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'stopped' | 'error';
  strategies: TradingStrategy[];
  riskParameters: RiskParameters;
  performance: TradingPerformance;
  currentPositions: TradingPosition[];
  pendingOrders: TradingOrder[];
  portfolioValue: number;
  availableBalance: number;
  errorLog: Array<{
    timestamp: number;
    error: string;
    context: string;
  }>;
}

export class OrdinalsTrader {
  private analytics: OrdinalsAnalytics;
  private clients: Record<OrdinalsMarketplace, any>;
  private session: TradingSession | null = null;
  private positionMonitorInterval: NodeJS.Timeout | null = null;
  private orderProcessingInterval: NodeJS.Timeout | null = null;
  private riskCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: { uniSatApiKey?: string }) {
    this.analytics = new OrdinalsAnalytics(config);
    this.clients = OrdinalsMarketplaceFactory.getAllClients(config);
  }

  /**
   * Start a new trading session with specified strategies and risk parameters
   */
  async startTradingSession(
    strategies: TradingStrategy[],
    riskParameters: RiskParameters,
    initialBalance: number
  ): Promise<string> {
    if (this.session && this.session.status === 'active') {
      throw new Error('Trading session already active');
    }

    const sessionId = `session_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;

    this.session = {
      id: sessionId,
      startTime: Date.now(),
      status: 'active',
      strategies: strategies.filter(s => s.enabled),
      riskParameters,
      performance: this.initializePerformance(),
      currentPositions: [],
      pendingOrders: [],
      portfolioValue: initialBalance,
      availableBalance: initialBalance,
      errorLog: []
    };

    // Start monitoring intervals
    this.startMonitoring();

    return sessionId;
  }

  /**
   * Stop the current trading session
   */
  async stopTradingSession(): Promise<void> {
    if (!this.session) {
      throw new Error('No active trading session');
    }

    this.session.status = 'stopped';
    this.session.endTime = Date.now();

    // Close all monitoring intervals
    this.stopMonitoring();

    // Cancel all pending orders
    await this.cancelAllOrders();

    // Optionally close all positions (depending on strategy)
    // await this.closeAllPositions();

  }

  /**
   * Pause/resume trading session
   */
  async pauseTradingSession(): Promise<void> {
    if (!this.session) {
      throw new Error('No active trading session');
    }

    if (this.session.status === 'active') {
      this.session.status = 'paused';
      this.stopMonitoring();
    } else if (this.session.status === 'paused') {
      this.session.status = 'active';
      this.startMonitoring();
    }
  }

  /**
   * Get current trading session status
   */
  getSessionStatus(): TradingSession | null {
    return this.session;
  }

  /**
   * Execute a manual trade
   */
  async executeTrade(
    inscriptionId: string,
    type: 'buy' | 'sell',
    price: number,
    marketplace: OrdinalsMarketplace,
    strategy: string = 'manual'
  ): Promise<TradingOrder> {
    if (!this.session || this.session.status !== 'active') {
      throw new Error('No active trading session');
    }

    // Validate trade against risk parameters
    const riskCheck = await this.validateTradeRisk(inscriptionId, type, price, 1);
    if (!riskCheck.approved) {
      throw new Error(`Trade rejected: ${riskCheck.reason}`);
    }

    const order: TradingOrder = {
      id: `order_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      inscriptionId,
      type,
      orderType: 'market',
      price,
      quantity: 1,
      marketplace,
      strategy,
      status: 'pending',
      createdAt: Date.now()
    };

    this.session.pendingOrders.push(order);

    try {
      await this.processOrder(order);
      return order;
    } catch (error) {
      order.status = 'rejected';
      order.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Set stop loss and take profit for a position
   */
  async setPositionLimits(
    positionId: string,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<void> {
    if (!this.session) {
      throw new Error('No active trading session');
    }

    const position = this.session.currentPositions.find(p => p.id === positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    position.stopLoss = stopLoss;
    position.takeProfit = takeProfit;

    // Create stop loss order if specified
    if (stopLoss && position.type === 'long') {
      const stopOrder: TradingOrder = {
        id: `stop_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        inscriptionId: position.inscriptionId,
        type: 'sell',
        orderType: 'stop_loss',
        triggerPrice: stopLoss,
        quantity: position.quantity,
        marketplace: position.marketplace,
        strategy: position.strategy,
        status: 'pending',
        createdAt: Date.now()
      };

      this.session.pendingOrders.push(stopOrder);
    }

    // Create take profit order if specified
    if (takeProfit && position.type === 'long') {
      const profitOrder: TradingOrder = {
        id: `profit_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        inscriptionId: position.inscriptionId,
        type: 'sell',
        orderType: 'take_profit',
        triggerPrice: takeProfit,
        quantity: position.quantity,
        marketplace: position.marketplace,
        strategy: position.strategy,
        status: 'pending',
        createdAt: Date.now()
      };

      this.session.pendingOrders.push(profitOrder);
    }
  }

  /**
   * Close a specific position
   */
  async closePosition(positionId: string): Promise<void> {
    if (!this.session) {
      throw new Error('No active trading session');
    }

    const position = this.session.currentPositions.find(p => p.id === positionId);
    if (!position) {
      throw new Error('Position not found');
    }

    const sellOrder: TradingOrder = {
      id: `close_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      inscriptionId: position.inscriptionId,
      type: 'sell',
      orderType: 'market',
      quantity: position.quantity,
      marketplace: position.marketplace,
      strategy: position.strategy,
      status: 'pending',
      createdAt: Date.now()
    };

    this.session.pendingOrders.push(sellOrder);
    await this.processOrder(sellOrder);
  }

  /**
   * Get trading opportunities and execute based on strategies
   */
  private async scanForOpportunities(): Promise<void> {
    if (!this.session || this.session.status !== 'active') {
      return;
    }

    try {
      // Get opportunities based on enabled strategies
      const strategyTypes = this.session.strategies.map(s => this.mapStrategyToType(s.name));
      const opportunities = await this.analytics.findTradingOpportunities(undefined, strategyTypes);

      for (const opportunity of opportunities.slice(0, 10)) { // Limit to top 10
        // Check if we should act on this opportunity
        const strategy = this.session.strategies.find(s => 
          this.mapStrategyToType(s.name) === opportunity.type
        );

        if (!strategy || !this.shouldExecuteOpportunity(opportunity, strategy)) {
          continue;
        }

        // Execute the opportunity
        await this.executeOpportunity(opportunity, strategy);
      }
    } catch (error) {
      this.logError('Error scanning for opportunities', error);
    }
  }

  /**
   * Monitor existing positions for stop loss, take profit, and updates
   */
  private async monitorPositions(): Promise<void> {
    if (!this.session || this.session.status !== 'active') {
      return;
    }

    try {
      for (const position of this.session.currentPositions) {
        await this.updatePositionPrice(position);
        await this.checkPositionLimits(position);
      }
    } catch (error) {
      this.logError('Error monitoring positions', error);
    }
  }

  /**
   * Process pending orders
   */
  private async processPendingOrders(): Promise<void> {
    if (!this.session || this.session.status !== 'active') {
      return;
    }

    const pendingOrders = this.session.pendingOrders.filter(o => o.status === 'pending');

    for (const order of pendingOrders) {
      try {
        await this.processOrder(order);
      } catch (error) {
        order.status = 'rejected';
        order.error = error instanceof Error ? error.message : 'Unknown error';
        this.logError(`Error processing order ${order.id}`, error);
      }
    }
  }

  /**
   * Perform risk checks and portfolio rebalancing
   */
  private async performRiskChecks(): Promise<void> {
    if (!this.session || this.session.status !== 'active') {
      return;
    }

    try {
      // Check portfolio risk metrics
      const riskMetrics = this.calculateCurrentRisk();

      // Check if we exceed risk limits
      if (riskMetrics.currentDrawdown > this.session.riskParameters.maxDrawdown) {
        await this.pauseTradingSession();
        return;
      }

      if (riskMetrics.dailyLoss > this.session.riskParameters.maxDailyLoss) {
        await this.pauseTradingSession();
        return;
      }

      // Check concentration risk
      const concentrationRisk = this.calculateConcentrationRisk();
      if (concentrationRisk > this.session.riskParameters.maxConcentration) {
        await this.reduceConcentration();
      }

    } catch (error) {
      this.logError('Error performing risk checks', error);
    }
  }

  /**
   * Update position with current market price
   */
  private async updatePositionPrice(position: TradingPosition): Promise<void> {
    try {
      // Get current market price from the marketplace
      const currentPrice = await this.getCurrentPrice(position.inscriptionId, position.marketplace);
      
      if (currentPrice > 0) {
        position.currentPrice = currentPrice;
        position.unrealizedPnL = (currentPrice - position.entryPrice) * position.quantity;
        position.unrealizedPnLPercentage = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      }
    } catch (error) {
      this.logError(`Error updating price for position ${position.id}`, error);
    }
  }

  /**
   * Check if position hits stop loss or take profit levels
   */
  private async checkPositionLimits(position: TradingPosition): Promise<void> {
    if (position.status !== 'open') {
      return;
    }

    // Check stop loss
    if (position.stopLoss && position.currentPrice <= position.stopLoss) {
      await this.closePosition(position.id);
      return;
    }

    // Check take profit
    if (position.takeProfit && position.currentPrice >= position.takeProfit) {
      await this.closePosition(position.id);
      return;
    }

    // Check dynamic stop loss (trailing stop)
    const strategy = this.session?.strategies.find(s => s.name === position.strategy);
    if (strategy?.parameters.trailingStop) {
      const trailingStopPrice = position.currentPrice * (1 - strategy.parameters.trailingStopPercentage / 100);
      if (!position.stopLoss || trailingStopPrice > position.stopLoss) {
        position.stopLoss = trailingStopPrice;
      }
    }
  }

  /**
   * Execute a trading opportunity
   */
  private async executeOpportunity(opportunity: TradingOpportunity, strategy: TradingStrategy): Promise<void> {
    try {
      // Validate the trade
      const riskCheck = await this.validateTradeRisk(
        opportunity.inscriptionId,
        'buy', // Assuming we're buying the opportunity
        opportunity.currentPrice,
        1
      );

      if (!riskCheck.approved) {
        return;
      }

      // Create and execute buy order
      const order: TradingOrder = {
        id: `auto_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        inscriptionId: opportunity.inscriptionId,
        type: 'buy',
        orderType: 'limit',
        price: opportunity.currentPrice,
        quantity: 1,
        marketplace: opportunity.marketplace,
        strategy: strategy.name,
        status: 'pending',
        createdAt: Date.now()
      };

      this.session!.pendingOrders.push(order);
      await this.processOrder(order);


    } catch (error) {
      this.logError(`Error executing opportunity ${opportunity.inscriptionId}`, error);
    }
  }

  /**
   * Process a trading order
   */
  private async processOrder(order: TradingOrder): Promise<void> {
    try {
      // Simulate order execution (in production, this would call marketplace APIs)
      const success = await this.submitOrderToMarketplace(order);

      if (success) {
        order.status = 'filled';
        order.filledAt = Date.now();
        order.filledPrice = order.price || 0;

        // Update position or create new one
        if (order.type === 'buy') {
          await this.createPosition(order);
        } else {
          await this.updateOrClosePosition(order);
        }

        // Update session balances
        this.updateSessionBalances(order);

      } else {
        order.status = 'rejected';
        order.error = 'Order rejected by marketplace';
      }

    } catch (error) {
      order.status = 'rejected';
      order.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Submit order to marketplace (placeholder for actual implementation)
   */
  private async submitOrderToMarketplace(order: TradingOrder): Promise<boolean> {
    // This is a placeholder. In production, you would:
    // 1. Connect to the marketplace API
    // 2. Submit the actual order
    // 3. Handle marketplace-specific requirements
    // 4. Return success/failure status

    // Marketplace integration not yet implemented - always return false to prevent fake trades
    return false;
  }

  /**
   * Create a new position from a buy order
   */
  private async createPosition(order: TradingOrder): Promise<void> {
    if (!this.session) return;

    const position: TradingPosition = {
      id: `pos_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      inscriptionId: order.inscriptionId,
      inscriptionNumber: 0, // Would get from inscription data
      collectionId: '', // Would get from inscription data
      strategy: order.strategy,
      type: 'long',
      entryPrice: order.filledPrice || order.price || 0,
      currentPrice: order.filledPrice || order.price || 0,
      quantity: order.quantity,
      entryTimestamp: Date.now(),
      marketplace: order.marketplace,
      unrealizedPnL: 0,
      unrealizedPnLPercentage: 0,
      status: 'open'
    };

    // Set default stop loss and take profit based on strategy
    const strategy = this.session.strategies.find(s => s.name === order.strategy);
    if (strategy) {
      if (strategy.parameters.stopLossPercentage) {
        position.stopLoss = position.entryPrice * (1 - strategy.parameters.stopLossPercentage / 100);
      }
      if (strategy.parameters.takeProfitPercentage) {
        position.takeProfit = position.entryPrice * (1 + strategy.parameters.takeProfitPercentage / 100);
      }
    }

    this.session.currentPositions.push(position);
  }

  /**
   * Update or close position from a sell order
   */
  private async updateOrClosePosition(order: TradingOrder): Promise<void> {
    if (!this.session) return;

    const position = this.session.currentPositions.find(p => 
      p.inscriptionId === order.inscriptionId && p.status === 'open'
    );

    if (position) {
      position.status = 'closed';
      
      // Calculate realized PnL
      const realizedPnL = (order.filledPrice || order.price || 0) - position.entryPrice;
      
      // Update performance metrics
      this.updatePerformanceMetrics(position, realizedPnL);
    }
  }

  /**
   * Update session balances after trade
   */
  private updateSessionBalances(order: TradingOrder): void {
    if (!this.session) return;

    const tradeValue = (order.filledPrice || order.price || 0) * order.quantity;
    const fee = tradeValue * 0.025; // Assume 2.5% fee

    if (order.type === 'buy') {
      this.session.availableBalance -= (tradeValue + fee);
    } else {
      this.session.availableBalance += (tradeValue - fee);
    }

    this.session.performance.totalFees += fee;
  }

  /**
   * Update performance metrics after closing position
   */
  private updatePerformanceMetrics(position: TradingPosition, realizedPnL: number): void {
    if (!this.session) return;

    const perf = this.session.performance;
    
    perf.totalTrades++;
    perf.totalPnL += realizedPnL;
    
    if (realizedPnL > 0) {
      perf.winningTrades++;
      perf.consecutiveWins++;
      perf.consecutiveLosses = 0;
      perf.averageWin = ((perf.averageWin * (perf.winningTrades - 1)) + realizedPnL) / perf.winningTrades;
      
      if (realizedPnL > perf.bestTrade) {
        perf.bestTrade = realizedPnL;
      }
    } else {
      perf.losingTrades++;
      perf.consecutiveLosses++;
      perf.consecutiveWins = 0;
      perf.averageLoss = ((perf.averageLoss * (perf.losingTrades - 1)) + Math.abs(realizedPnL)) / perf.losingTrades;
      
      if (realizedPnL < perf.worstTrade) {
        perf.worstTrade = realizedPnL;
      }
    }

    perf.winRate = (perf.winningTrades / perf.totalTrades) * 100;
    perf.totalPnLPercentage = (perf.totalPnL / this.session.portfolioValue) * 100;
    
    if (perf.averageLoss > 0) {
      perf.profitFactor = perf.averageWin / perf.averageLoss;
    }

    // Calculate holding period
    const holdingPeriod = (Date.now() - position.entryTimestamp) / (1000 * 60 * 60); // in hours
    perf.averageHoldingPeriod = ((perf.averageHoldingPeriod * (perf.totalTrades - 1)) + holdingPeriod) / perf.totalTrades;

    // Update drawdown
    this.updateDrawdownMetrics();
  }

  /**
   * Validate trade against risk parameters
   */
  private async validateTradeRisk(
    inscriptionId: string,
    type: 'buy' | 'sell',
    price: number,
    quantity: number
  ): Promise<{ approved: boolean; reason?: string }> {
    if (!this.session) {
      return { approved: false, reason: 'No active session' };
    }

    const tradeValue = price * quantity;
    const positionSize = (tradeValue / this.session.portfolioValue) * 100;

    // Check position size
    if (positionSize > this.session.riskParameters.maxPositionSize) {
      return { approved: false, reason: 'Position size exceeds limit' };
    }

    // Check available balance
    if (type === 'buy' && tradeValue > this.session.availableBalance) {
      return { approved: false, reason: 'Insufficient balance' };
    }

    // Check daily loss limit
    const dailyPnL = this.calculateDailyPnL();
    if (dailyPnL < -this.session.riskParameters.maxDailyLoss) {
      return { approved: false, reason: 'Daily loss limit reached' };
    }

    // Check portfolio risk
    const portfolioRisk = this.calculatePortfolioRisk();
    if (portfolioRisk > this.session.riskParameters.maxPortfolioRisk) {
      return { approved: false, reason: 'Portfolio risk too high' };
    }

    // Check liquidity (placeholder - would need real liquidity data)
    const liquidityScore = 75; // Mock score
    if (liquidityScore < this.session.riskParameters.minLiquidityScore) {
      return { approved: false, reason: 'Insufficient liquidity' };
    }

    return { approved: true };
  }

  /**
   * Check if we should execute an opportunity based on strategy parameters
   */
  private shouldExecuteOpportunity(opportunity: TradingOpportunity, strategy: TradingStrategy): boolean {
    // Check confidence threshold
    if (opportunity.confidence < (strategy.parameters.minConfidence || 70)) {
      return false;
    }

    // Check expected return threshold
    if (opportunity.expectedReturn < (strategy.parameters.minReturn || 5)) {
      return false;
    }

    // Check if we already have a position in this collection
    const existingPosition = this.session?.currentPositions.find(p => 
      p.collectionId === opportunity.collectionId && p.status === 'open'
    );

    if (existingPosition && !strategy.parameters.allowMultiplePositions) {
      return false;
    }

    // Check strategy-specific parameters
    switch (opportunity.type) {
      case 'arbitrage':
        return opportunity.expectedReturn >= (strategy.parameters.minArbitrageSpread || 2);
      case 'momentum':
        return opportunity.confidence >= (strategy.parameters.minMomentumConfidence || 80);
      default:
        return true;
    }
  }

  /**
   * Map strategy name to opportunity type
   */
  private mapStrategyToType(strategyName: string): 'arbitrage' | 'undervalued' | 'momentum' | 'breakout' | 'mean_reversion' {
    const mapping: Record<string, any> = {
      'arbitrage': 'arbitrage',
      'value_hunting': 'undervalued',
      'momentum_trading': 'momentum',
      'breakout_trading': 'breakout',
      'mean_reversion': 'mean_reversion'
    };

    return mapping[strategyName] || 'undervalued';
  }

  /**
   * Get current price of an inscription
   */
  private async getCurrentPrice(inscriptionId: string, marketplace: OrdinalsMarketplace): Promise<number> {
    try {
      const client = this.clients[marketplace];
      
      switch (marketplace) {
        case OrdinalsMarketplace.GAMMA:
          const meInscription = await client.getInscription(inscriptionId);
          return meInscription?.listedPrice || 0;
        case OrdinalsMarketplace.OKX:
          const okxInscription = await client.getInscription(inscriptionId);
          return parseFloat(okxInscription?.listingInfo?.price || '0');
        case OrdinalsMarketplace.UNISAT:
          const uniInscription = await client.getInscription(inscriptionId);
          return (uniInscription?.price || 0) / 100000000; // Convert sats to BTC
        default:
          return 0;
      }
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate current risk metrics
   */
  private calculateCurrentRisk(): { currentDrawdown: number; dailyLoss: number; portfolioRisk: number } {
    if (!this.session) {
      return { currentDrawdown: 0, dailyLoss: 0, portfolioRisk: 0 };
    }

    const currentValue = this.calculateCurrentPortfolioValue();
    const peakValue = Math.max(this.session.portfolioValue, currentValue);
    const currentDrawdown = ((peakValue - currentValue) / peakValue) * 100;

    const dailyPnL = this.calculateDailyPnL();
    const dailyLoss = Math.abs(Math.min(0, dailyPnL));

    const portfolioRisk = this.calculatePortfolioRisk();

    return { currentDrawdown, dailyLoss, portfolioRisk };
  }

  /**
   * Calculate current portfolio value
   */
  private calculateCurrentPortfolioValue(): number {
    if (!this.session) return 0;

    const positionsValue = this.session.currentPositions
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);

    return this.session.availableBalance + positionsValue;
  }

  /**
   * Calculate daily P&L
   */
  private calculateDailyPnL(): number {
    if (!this.session) return 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTimestamp = startOfDay.getTime();

    // Calculate realized P&L from closed positions today
    const dailyTrades = this.session.currentPositions.filter(p => 
      p.status === 'closed' && p.entryTimestamp >= startOfDayTimestamp
    );

    const realizedPnL = dailyTrades.reduce((sum, p) => {
      // This would need to be calculated from actual trade data
      return sum + p.unrealizedPnL; // Placeholder
    }, 0);

    // Add unrealized P&L from open positions
    const unrealizedPnL = this.session.currentPositions
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + p.unrealizedPnL, 0);

    return realizedPnL + unrealizedPnL;
  }

  /**
   * Calculate portfolio risk score
   */
  private calculatePortfolioRisk(): number {
    if (!this.session || this.session.currentPositions.length === 0) return 0;

    const openPositions = this.session.currentPositions.filter(p => p.status === 'open');
    const totalValue = openPositions.reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);

    if (totalValue === 0) return 0;

    // Calculate concentration risk
    const collectionExposure = new Map<string, number>();
    openPositions.forEach(p => {
      collectionExposure.set(p.collectionId, (collectionExposure.get(p.collectionId) || 0) + (p.currentPrice * p.quantity));
    });

    const maxExposure = Math.max(...Array.from(collectionExposure.values()));
    const concentrationRisk = (maxExposure / totalValue) * 100;

    // Calculate volatility risk (simplified)
    const avgVolatility = openPositions.reduce((sum, p) => {
      // This would need historical volatility data
      return sum + 30; // Placeholder: 30% volatility
    }, 0) / openPositions.length;

    // Combine risk factors
    return (concentrationRisk + avgVolatility) / 2;
  }

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(): number {
    return this.calculatePortfolioRisk(); // Simplified for now
  }

  /**
   * Reduce concentration by closing largest positions
   */
  private async reduceConcentration(): Promise<void> {
    if (!this.session) return;

    const openPositions = this.session.currentPositions.filter(p => p.status === 'open');
    
    // Sort by position value (descending)
    openPositions.sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity));

    // Close the largest position
    if (openPositions.length > 0) {
      await this.closePosition(openPositions[0].id);
    }
  }

  /**
   * Update drawdown metrics
   */
  private updateDrawdownMetrics(): void {
    if (!this.session) return;

    const currentValue = this.calculateCurrentPortfolioValue();
    const perf = this.session.performance;

    // Update peak value
    if (currentValue > this.session.portfolioValue) {
      this.session.portfolioValue = currentValue;
    }

    // Calculate current drawdown
    const currentDrawdown = ((this.session.portfolioValue - currentValue) / this.session.portfolioValue) * 100;
    perf.currentDrawdown = currentDrawdown;

    // Update max drawdown
    if (currentDrawdown > perf.maxDrawdown) {
      perf.maxDrawdown = currentDrawdown;
    }
  }

  /**
   * Cancel all pending orders
   */
  private async cancelAllOrders(): Promise<void> {
    if (!this.session) return;

    this.session.pendingOrders.forEach(order => {
      if (order.status === 'pending') {
        order.status = 'cancelled';
      }
    });
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformance(): TradingPerformance {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      totalPnLPercentage: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      totalFees: 0,
      netPnL: 0,
      averageHoldingPeriod: 0,
      bestTrade: 0,
      worstTrade: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      monthlyReturns: []
    };
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Monitor for new opportunities every 30 seconds
    this.positionMonitorInterval = setInterval(() => {
      this.scanForOpportunities();
    }, 30000);

    // Monitor existing positions every 10 seconds
    this.positionMonitorInterval = setInterval(() => {
      this.monitorPositions();
    }, 10000);

    // Process pending orders every 5 seconds
    this.orderProcessingInterval = setInterval(() => {
      this.processPendingOrders();
    }, 5000);

    // Perform risk checks every minute
    this.riskCheckInterval = setInterval(() => {
      this.performRiskChecks();
    }, 60000);
  }

  /**
   * Stop monitoring intervals
   */
  private stopMonitoring(): void {
    if (this.positionMonitorInterval) {
      clearInterval(this.positionMonitorInterval);
      this.positionMonitorInterval = null;
    }

    if (this.orderProcessingInterval) {
      clearInterval(this.orderProcessingInterval);
      this.orderProcessingInterval = null;
    }

    if (this.riskCheckInterval) {
      clearInterval(this.riskCheckInterval);
      this.riskCheckInterval = null;
    }
  }

  /**
   * Log error to session
   */
  private logError(context: string, error: any): void {
    if (!this.session) return;

    this.session.errorLog.push({
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      context
    });

    console.error(`${context}:`, error);
  }

  /**
   * Get predefined trading strategies
   */
  static getDefaultStrategies(): TradingStrategy[] {
    return [
      {
        name: 'arbitrage',
        description: 'Cross-marketplace arbitrage opportunities',
        enabled: true,
        parameters: {
          minArbitrageSpread: 2, // Minimum 2% spread
          maxPositionSize: 5, // Maximum 5% of portfolio per trade
          minConfidence: 80
        },
        riskLevel: 'low',
        expectedReturn: 15,
        maxDrawdown: 5,
        timeframe: 'short',
        priority: 9
      },
      {
        name: 'value_hunting',
        description: 'Identify undervalued NFTs based on rarity and pricing',
        enabled: true,
        parameters: {
          minReturn: 10, // Minimum 10% expected return
          maxPositionSize: 10,
          minConfidence: 70,
          rarityThreshold: 0.1 // Top 10% rarity
        },
        riskLevel: 'medium',
        expectedReturn: 25,
        maxDrawdown: 15,
        timeframe: 'medium',
        priority: 7
      },
      {
        name: 'momentum_trading',
        description: 'Trade based on price momentum and volume trends',
        enabled: false,
        parameters: {
          momentumThreshold: 20, // 20% price increase
          volumeThreshold: 2, // 2x volume increase
          maxPositionSize: 8,
          stopLossPercentage: 10,
          takeProfitPercentage: 25
        },
        riskLevel: 'high',
        expectedReturn: 35,
        maxDrawdown: 25,
        timeframe: 'short',
        priority: 5
      },
      {
        name: 'mean_reversion',
        description: 'Trade on temporary price deviations from fair value',
        enabled: false,
        parameters: {
          deviationThreshold: 30, // 30% deviation from fair value
          maxPositionSize: 6,
          meanReversionPeriod: 7, // 7 days
          minConfidence: 75
        },
        riskLevel: 'medium',
        expectedReturn: 20,
        maxDrawdown: 12,
        timeframe: 'medium',
        priority: 6
      }
    ];
  }

  /**
   * Get default risk parameters
   */
  static getDefaultRiskParameters(): RiskParameters {
    return {
      maxPositionSize: 10, // 10% of portfolio per position
      maxPortfolioRisk: 50, // 50% maximum portfolio risk
      maxDailyLoss: 5, // 5% maximum daily loss
      maxDrawdown: 20, // 20% maximum drawdown
      minLiquidityScore: 60, // Minimum 60 liquidity score
      maxConcentration: 30, // Maximum 30% in single collection
      stopLossPercentage: 15, // 15% stop loss
      takeProfitPercentage: 30, // 30% take profit
      cooldownPeriod: 60 // 60 minutes cooldown after loss
    };
  }
}

// Singleton instance
export const ordinalsTrader = new OrdinalsTrader();