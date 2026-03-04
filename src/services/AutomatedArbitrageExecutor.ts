/**
 * Automated Arbitrage Execution System
 * Handles automated execution of arbitrage opportunities with risk management
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { exchangeService, ArbitrageOpportunity, ExecutionResult } from './exchanges';
import { arbitrageDetectionEngine, OpportunityAlert } from './ArbitrageDetectionEngine';

export interface ExecutionConfig {
  enabled: boolean;
  maxConcurrentTrades: number;
  maxPositionSize: number;
  minProfitPercent: number;
  maxRiskLevel: 'low' | 'medium' | 'high';
  minConfidence: number;
  cooldownPeriod: number; // milliseconds between executions
  riskLimits: {
    dailyLossLimit: number;
    maxDrawdown: number;
    maxConsecutiveLosses: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
    sound: boolean;
  };
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  successRate: number;
  averageProfit: number;
  averageLoss: number;
  maxProfit: number;
  maxLoss: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
  dailyStats: {
    date: string;
    executions: number;
    profit: number;
    loss: number;
    netProfit: number;
  }[];
  profitByExchange: Record<string, number>;
  profitBySymbol: Record<string, number>;
}

export interface NotificationMessage {
  id: string;
  type: 'execution_started' | 'execution_completed' | 'execution_failed' | 'risk_alert' | 'system_alert';
  title: string;
  message: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('email' | 'sms' | 'webhook' | 'push' | 'sound')[];
}

class AutomatedArbitrageExecutor extends EventEmitter {
  private config: ExecutionConfig;
  private stats: ExecutionStats;
  private isRunning = false;
  private activeExecutions: Map<string, ArbitrageOpportunity> = new Map();
  private executionQueue: ArbitrageOpportunity[] = [];
  private lastExecutionTime = 0;
  private notificationQueue: NotificationMessage[] = [];
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    this.config = {
      enabled: false,
      maxConcurrentTrades: 3,
      maxPositionSize: 10000,
      minProfitPercent: 1.5,
      maxRiskLevel: 'medium',
      minConfidence: 75,
      cooldownPeriod: 30000, // 30 seconds
      riskLimits: {
        dailyLossLimit: 1000,
        maxDrawdown: 2000,
        maxConsecutiveLosses: 5
      },
      notifications: {
        email: true,
        sms: false,
        webhook: true,
        sound: true
      }
    };

    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      successRate: 0,
      averageProfit: 0,
      averageLoss: 0,
      maxProfit: 0,
      maxLoss: 0,
      consecutiveLosses: 0,
      maxConsecutiveLosses: 0,
      dailyStats: [],
      profitByExchange: {},
      profitBySymbol: {}
    };

    this.initializeExecutor();
  }

  private initializeExecutor() {
    // Listen to arbitrage detection events
    arbitrageDetectionEngine.on('crossExchangeOpportunities', (opportunities: ArbitrageOpportunity[]) => {
      this.processOpportunities(opportunities);
    });

    arbitrageDetectionEngine.on('opportunityAlert', (alert: OpportunityAlert) => {
      this.handleAlert(alert);
    });

    // Listen to execution events
    exchangeService.on('executionCompleted', (result: ExecutionResult) => {
      this.handleExecutionResult(result);
    });

    exchangeService.on('executionError', (result: ExecutionResult) => {
      this.handleExecutionResult(result);
    });
  }

  /**
   * Start the automated execution system
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.config.enabled = true;
    
    // Start processing queue
    this.processInterval = setInterval(() => {
      this.processExecutionQueue();
    }, 1000);

    this.sendNotification({
      type: 'system_alert',
      title: 'Automated Execution Started',
      message: 'The automated arbitrage execution system has been started',
      data: { timestamp: Date.now() },
      priority: 'medium',
      channels: ['webhook', 'push']
    });

    this.emit('executorStarted');
    // Executor started
  }

  /**
   * Stop the automated execution system
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.config.enabled = false;
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    // Clear execution queue
    this.executionQueue = [];

    this.sendNotification({
      type: 'system_alert',
      title: 'Automated Execution Stopped',
      message: 'The automated arbitrage execution system has been stopped',
      data: { 
        finalStats: this.getStats(),
        timestamp: Date.now() 
      },
      priority: 'medium',
      channels: ['webhook', 'push']
    });

    this.emit('executorStopped');
    // Executor stopped
  }

  /**
   * Process new arbitrage opportunities
   */
  private processOpportunities(opportunities: ArbitrageOpportunity[]): void {
    if (!this.config.enabled || !this.isRunning) return;

    const filteredOpportunities = this.filterOpportunities(opportunities);
    
    for (const opportunity of filteredOpportunities) {
      if (this.shouldExecute(opportunity)) {
        this.queueExecution(opportunity);
      }
    }
  }

  /**
   * Filter opportunities based on execution config
   */
  private filterOpportunities(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
    return opportunities.filter(opp => {
      // Profit threshold
      if (opp.netProfitPercent < this.config.minProfitPercent) return false;
      
      // Confidence threshold
      if (opp.confidence < this.config.minConfidence) return false;
      
      // Risk level
      const riskLevels = { low: 1, medium: 2, high: 3 };
      if (riskLevels[opp.riskLevel] > riskLevels[this.config.maxRiskLevel]) return false;
      
      // Position size
      const estimatedPositionValue = opp.buyPrice * 1; // Assuming 1 unit trade
      if (estimatedPositionValue > this.config.maxPositionSize) return false;
      
      return true;
    });
  }

  /**
   * Check if an opportunity should be executed
   */
  private shouldExecute(opportunity: ArbitrageOpportunity): boolean {
    // Check if already queued or executing
    if (this.executionQueue.some(opp => opp.id === opportunity.id) ||
        this.activeExecutions.has(opportunity.id)) {
      return false;
    }

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.config.maxConcurrentTrades) {
      return false;
    }

    // Check cooldown period
    if (Date.now() - this.lastExecutionTime < this.config.cooldownPeriod) {
      return false;
    }

    // Check risk limits
    if (!this.checkRiskLimits()) {
      return false;
    }

    return true;
  }

  /**
   * Check risk management limits
   */
  private checkRiskLimits(): boolean {
    const today = new Date().toDateString();
    const todayStats = this.stats.dailyStats.find(stat => stat.date === today);
    
    // Daily loss limit
    if (todayStats && Math.abs(todayStats.loss) >= this.config.riskLimits.dailyLossLimit) {
      this.sendNotification({
        type: 'risk_alert',
        title: 'Daily Loss Limit Reached',
        message: `Daily loss limit of $${this.config.riskLimits.dailyLossLimit} has been reached`,
        data: { dailyLoss: todayStats.loss },
        priority: 'urgent',
        channels: ['email', 'sms', 'webhook', 'push', 'sound']
      });
      return false;
    }

    // Max drawdown
    if (Math.abs(this.stats.netProfit) >= this.config.riskLimits.maxDrawdown) {
      this.sendNotification({
        type: 'risk_alert',
        title: 'Maximum Drawdown Reached',
        message: `Maximum drawdown of $${this.config.riskLimits.maxDrawdown} has been reached`,
        data: { netProfit: this.stats.netProfit },
        priority: 'urgent',
        channels: ['email', 'sms', 'webhook', 'push', 'sound']
      });
      return false;
    }

    // Consecutive losses
    if (this.stats.consecutiveLosses >= this.config.riskLimits.maxConsecutiveLosses) {
      this.sendNotification({
        type: 'risk_alert',
        title: 'Maximum Consecutive Losses Reached',
        message: `${this.config.riskLimits.maxConsecutiveLosses} consecutive losses detected`,
        data: { consecutiveLosses: this.stats.consecutiveLosses },
        priority: 'urgent',
        channels: ['email', 'sms', 'webhook', 'push', 'sound']
      });
      return false;
    }

    return true;
  }

  /**
   * Queue an opportunity for execution
   */
  private queueExecution(opportunity: ArbitrageOpportunity): void {
    this.executionQueue.push(opportunity);
    
    this.sendNotification({
      type: 'execution_started',
      title: 'Opportunity Queued',
      message: `${opportunity.symbol} arbitrage opportunity queued for execution`,
      data: opportunity,
      priority: 'medium',
      channels: ['webhook', 'push']
    });

    this.emit('opportunityQueued', opportunity);
  }

  /**
   * Process the execution queue
   */
  private async processExecutionQueue(): Promise<void> {
    if (!this.config.enabled || !this.isRunning || this.executionQueue.length === 0) return;

    // Check if we can execute more trades
    if (this.activeExecutions.size >= this.config.maxConcurrentTrades) return;

    // Check cooldown
    if (Date.now() - this.lastExecutionTime < this.config.cooldownPeriod) return;

    // Get next opportunity from queue
    const opportunity = this.executionQueue.shift();
    if (!opportunity) return;

    // Check if opportunity is still valid
    if (Date.now() > opportunity.expiresAt) {
      this.sendNotification({
        type: 'execution_failed',
        title: 'Opportunity Expired',
        message: `${opportunity.symbol} opportunity expired before execution`,
        data: opportunity,
        priority: 'low',
        channels: ['webhook']
      });
      return;
    }

    // Execute the opportunity
    await this.executeOpportunity(opportunity);
  }

  /**
   * Execute a specific opportunity
   */
  private async executeOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
    try {
      this.activeExecutions.set(opportunity.id, opportunity);
      this.lastExecutionTime = Date.now();

      this.sendNotification({
        type: 'execution_started',
        title: 'Execution Started',
        message: `Starting execution of ${opportunity.symbol} arbitrage (${opportunity.netProfitPercent.toFixed(2)}% profit)`,
        data: opportunity,
        priority: 'medium',
        channels: ['webhook', 'push']
      });

      this.emit('executionStarted', opportunity);

      // Execute through exchange service
      const result = await exchangeService.executeArbitrage(opportunity.id);
      
      // Handle result is called automatically via event listener
      
    } catch (error) {
      this.activeExecutions.delete(opportunity.id);
      
      this.sendNotification({
        type: 'execution_failed',
        title: 'Execution Error',
        message: `Error executing ${opportunity.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { opportunity, error: error instanceof Error ? error.message : 'Unknown error' },
        priority: 'high',
        channels: ['email', 'webhook', 'push', 'sound']
      });

      this.emit('executionError', { opportunity, error });
    }
  }

  /**
   * Handle execution result
   */
  private handleExecutionResult(result: ExecutionResult): void {
    // Find and remove from active executions
    let opportunity: ArbitrageOpportunity | undefined;
    for (const [id, opp] of this.activeExecutions) {
      if (result.buyOrder?.symbol === opp.symbol) {
        opportunity = opp;
        this.activeExecutions.delete(id);
        break;
      }
    }

    if (!opportunity) return;

    // Update statistics
    this.updateStats(result, opportunity);

    if (result.success) {
      this.sendNotification({
        type: 'execution_completed',
        title: 'Execution Successful',
        message: `${opportunity.symbol} arbitrage completed: $${result.actualProfit?.toFixed(2)} profit`,
        data: { opportunity, result },
        priority: 'medium',
        channels: this.config.notifications.email ? ['email', 'webhook', 'push'] : ['webhook', 'push']
      });
    } else {
      this.sendNotification({
        type: 'execution_failed',
        title: 'Execution Failed',
        message: `${opportunity.symbol} arbitrage failed: ${result.error}`,
        data: { opportunity, result },
        priority: 'high',
        channels: ['email', 'webhook', 'push', 'sound']
      });
    }

    this.emit('executionCompleted', { opportunity, result });
  }

  /**
   * Update execution statistics
   */
  private updateStats(result: ExecutionResult, opportunity: ArbitrageOpportunity): void {
    this.stats.totalExecutions++;
    
    if (result.success && result.actualProfit && result.actualProfit > 0) {
      this.stats.successfulExecutions++;
      this.stats.totalProfit += result.actualProfit;
      this.stats.maxProfit = Math.max(this.stats.maxProfit, result.actualProfit);
      this.stats.consecutiveLosses = 0;
      
      // Update profit by exchange and symbol
      this.stats.profitByExchange[opportunity.buyExchange] = 
        (this.stats.profitByExchange[opportunity.buyExchange] || 0) + result.actualProfit / 2;
      this.stats.profitByExchange[opportunity.sellExchange] = 
        (this.stats.profitByExchange[opportunity.sellExchange] || 0) + result.actualProfit / 2;
      this.stats.profitBySymbol[opportunity.symbol] = 
        (this.stats.profitBySymbol[opportunity.symbol] || 0) + result.actualProfit;
    } else {
      this.stats.failedExecutions++;
      const loss = Math.abs(result.actualProfit || 50); // Estimate loss if not provided
      this.stats.totalLoss += loss;
      this.stats.maxLoss = Math.max(this.stats.maxLoss, loss);
      this.stats.consecutiveLosses++;
      this.stats.maxConsecutiveLosses = Math.max(this.stats.maxConsecutiveLosses, this.stats.consecutiveLosses);
    }

    // Update derived statistics
    this.stats.netProfit = this.stats.totalProfit - this.stats.totalLoss;
    this.stats.successRate = this.stats.successfulExecutions / this.stats.totalExecutions;
    this.stats.averageProfit = this.stats.totalProfit / (this.stats.successfulExecutions || 1);
    this.stats.averageLoss = this.stats.totalLoss / (this.stats.failedExecutions || 1);

    // Update daily statistics
    const today = new Date().toDateString();
    let todayStats = this.stats.dailyStats.find(stat => stat.date === today);
    
    if (!todayStats) {
      todayStats = { date: today, executions: 0, profit: 0, loss: 0, netProfit: 0 };
      this.stats.dailyStats.push(todayStats);
    }

    todayStats.executions++;
    if (result.success && result.actualProfit && result.actualProfit > 0) {
      todayStats.profit += result.actualProfit;
    } else {
      todayStats.loss += Math.abs(result.actualProfit || 50);
    }
    todayStats.netProfit = todayStats.profit - todayStats.loss;

    // Keep only last 30 days
    if (this.stats.dailyStats.length > 30) {
      this.stats.dailyStats = this.stats.dailyStats.slice(-30);
    }

    this.emit('statsUpdated', this.stats);
  }

  /**
   * Handle alert from detection engine
   */
  private handleAlert(alert: OpportunityAlert): void {
    if (alert.type === 'high_profit' && alert.priority === 'urgent') {
      this.sendNotification({
        type: 'system_alert',
        title: 'High Profit Alert',
        message: alert.message,
        data: alert,
        priority: 'urgent',
        channels: ['email', 'sms', 'webhook', 'push', 'sound']
      });
    }
  }

  /**
   * Send notification through configured channels
   */
  private sendNotification(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): void {
    const fullNotification: NotificationMessage = {
      ...notification,
      id: `notif_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
      timestamp: Date.now()
    };

    this.notificationQueue.push(fullNotification);
    
    // Keep queue limited
    if (this.notificationQueue.length > 1000) {
      this.notificationQueue = this.notificationQueue.slice(-500);
    }

    // Process notification based on channels
    this.processNotification(fullNotification);
    
    this.emit('notification', fullNotification);
  }

  /**
   * Process notification through various channels
   */
  private async processNotification(notification: NotificationMessage): Promise<void> {
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'email':
            if (this.config.notifications.email) {
              await this.sendEmailNotification(notification);
            }
            break;
          case 'sms':
            if (this.config.notifications.sms) {
              await this.sendSMSNotification(notification);
            }
            break;
          case 'webhook':
            if (this.config.notifications.webhook) {
              await this.sendWebhookNotification(notification);
            }
            break;
          case 'sound':
            if (this.config.notifications.sound) {
              this.playSoundNotification(notification);
            }
            break;
          case 'push':
            await this.sendPushNotification(notification);
            break;
        }
      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationMessage): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    // TODO: In production, integrate with email service (SendGrid, SES, etc.)
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: NotificationMessage): Promise<void> {
    // In production, integrate with SMS service (Twilio, etc.)
    // TODO: In production, integrate with SMS service (Twilio, etc.)
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: NotificationMessage): Promise<void> {
    // In production, send to configured webhook URLs
    // TODO: In production, send to configured webhook URLs
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: NotificationMessage): Promise<void> {
    // In production, integrate with push notification service
    // TODO: In production, integrate with push notification service
  }

  /**
   * Play sound notification
   */
  private playSoundNotification(notification: NotificationMessage): void {
    // Sound notification would be handled by the UI component
    this.emit('soundNotification', notification);
  }

  /**
   * Get current configuration
   */
  public getConfig(): ExecutionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get execution statistics
   */
  public getStats(): ExecutionStats {
    return { ...this.stats };
  }

  /**
   * Get recent notifications
   */
  public getRecentNotifications(limit: number = 50): NotificationMessage[] {
    return this.notificationQueue.slice(-limit);
  }

  /**
   * Get current execution queue
   */
  public getExecutionQueue(): ArbitrageOpportunity[] {
    return [...this.executionQueue];
  }

  /**
   * Get active executions
   */
  public getActiveExecutions(): ArbitrageOpportunity[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get executor status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: this.config.enabled,
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length,
      stats: this.getStats(),
      lastExecutionTime: this.lastExecutionTime
    };
  }
}

// Export singleton instance
export const automatedArbitrageExecutor = new AutomatedArbitrageExecutor();
export default automatedArbitrageExecutor;