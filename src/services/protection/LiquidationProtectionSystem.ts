/**
 * Liquidation Protection System for CYPHER ORDi Future V3
 * Advanced risk management, auto-deleveraging, and position protection
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Protection Types
export interface ProtectedPosition {
  id: string;
  userId: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  liquidationPrice: number;
  marginRatio: number;
  maintenanceMargin: number;
  protectionLevel: ProtectionLevel;
  protectionSettings: ProtectionSettings;
  riskMetrics: RiskMetrics;
  alerts: PositionAlert[];
  status: 'active' | 'at_risk' | 'protected' | 'liquidated';
  lastUpdate: number;
}

export interface ProtectionSettings {
  enabled: boolean;
  autoRebalance: boolean;
  maxLoss: number; // percentage
  stopLoss: number; // percentage
  takeProfit?: number; // percentage
  emergencyClose: boolean;
  hedgeRatio: number; // 0-1
  riskBudget: number; // dollar amount
  alertThresholds: {
    warning: number; // margin ratio
    critical: number; // margin ratio
    emergency: number; // margin ratio
  };
  actionTriggers: {
    addMargin: boolean;
    reducePosition: boolean;
    hedge: boolean;
    close: boolean;
  };
}

export type ProtectionLevel = 'basic' | 'standard' | 'premium' | 'institutional';

export interface RiskMetrics {
  marginRatio: number;
  liquidationDistance: number; // percentage
  timeToLiquidation: number; // estimated hours
  valueAtRisk: number; // 95% VaR
  expectedShortfall: number;
  leverage: number;
  correlationRisk: number;
  portfolioHeat: number; // 0-100 risk score
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PositionAlert {
  id: string;
  type: 'margin_call' | 'risk_warning' | 'liquidation_imminent' | 'protection_triggered';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  actionTaken?: string;
}

export interface ProtectionAction {
  id: string;
  positionId: string;
  type: 'add_margin' | 'reduce_position' | 'hedge' | 'close' | 'rebalance';
  amount: number;
  targetPrice?: number;
  reasoning: string;
  executedAt?: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: {
    success: boolean;
    newMarginRatio?: number;
    newLiquidationPrice?: number;
    cost: number;
    error?: string;
  };
}

export interface HedgeStrategy {
  id: string;
  name: string;
  description: string;
  type: 'delta_neutral' | 'correlation' | 'volatility' | 'cross_asset';
  instruments: HedgeInstrument[];
  effectiveness: number; // 0-1
  cost: number; // basis points
  maxHedgeRatio: number;
  dynamicAdjustment: boolean;
  conditions: {
    minPosition: number;
    maxRisk: number;
    marketConditions: string[];
  };
}

export interface HedgeInstrument {
  symbol: string;
  type: 'spot' | 'future' | 'option' | 'swap';
  ratio: number; // hedge ratio
  direction: 'long' | 'short';
  cost: number; // execution cost
  liquidity: number; // 0-1
  correlation: number; // -1 to 1
}

export interface InsuranceFund {
  totalBalance: number;
  availableBalance: number;
  utilizationRate: number;
  contributions: ContributionRecord[];
  payouts: PayoutRecord[];
  performance: {
    totalContributions: number;
    totalPayouts: number;
    netPosition: number;
    roi: number;
  };
}

export interface ContributionRecord {
  id: string;
  userId: string;
  amount: number;
  timestamp: number;
  source: 'trading_fees' | 'voluntary' | 'liquidation_surplus';
}

export interface PayoutRecord {
  id: string;
  positionId: string;
  userId: string;
  amount: number;
  timestamp: number;
  reason: 'socialized_loss' | 'liquidation_support' | 'emergency_fund';
}

export interface AutoDeleveraging {
  enabled: boolean;
  queue: ADLQueueEntry[];
  lastExecution: number;
  totalDeleveraged: number;
  fairnessScore: number; // 0-1, higher = more fair
  parameters: {
    maxQueueSize: number;
    executionDelay: number; // milliseconds
    minProfitThreshold: number; // percentage
    priorityWeights: {
      profit: number;
      leverage: number;
      position_size: number;
      time_in_profit: number;
    };
  };
}

export interface ADLQueueEntry {
  userId: string;
  positionId: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  unrealizedPnL: number;
  leverage: number;
  priority: number;
  addedAt: number;
}

export interface ProtectionReport {
  userId?: string;
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalPositions: number;
    protectedPositions: number;
    liquidationsPrevented: number;
    totalSaved: number; // USD value
    averageRiskReduction: number; // percentage
  };
  actions: {
    marginAdded: number;
    positionsReduced: number;
    hedgesCreated: number;
    emergencyCloses: number;
  };
  performance: {
    successRate: number;
    avgResponseTime: number; // milliseconds
    costEfficiency: number; // cost vs. savings ratio
    userSatisfaction: number; // 0-100
  };
  risks: {
    highestRisk: number;
    averageRisk: number;
    riskTrends: number[];
  };
}

export class LiquidationProtectionSystem extends EventEmitter {
  private logger: EnhancedLogger;
  private protectedPositions: Map<string, ProtectedPosition> = new Map();
  private userPositions: Map<string, Set<string>> = new Map();
  private protectionActions: Map<string, ProtectionAction[]> = new Map();
  private hedgeStrategies: Map<string, HedgeStrategy> = new Map();
  private insuranceFund: InsuranceFund;
  private autoDeleveraging: AutoDeleveraging;
  private priceFeeds: Map<string, { price: number; timestamp: number }> = new Map();

  // Protection parameters
  private readonly PROTECTION_LEVELS: Record<ProtectionLevel, {
    maxPositions: number;
    responseTime: number; // milliseconds
    features: string[];
    cost: number; // basis points per month
  }> = {
    basic: {
      maxPositions: 10,
      responseTime: 30000, // 30 seconds
      features: ['margin_alerts', 'basic_hedging'],
      cost: 5
    },
    standard: {
      maxPositions: 50,
      responseTime: 10000, // 10 seconds
      features: ['margin_alerts', 'auto_rebalance', 'advanced_hedging', 'insurance'],
      cost: 15
    },
    premium: {
      maxPositions: 200,
      responseTime: 5000, // 5 seconds
      features: ['real_time_protection', 'AI_risk_management', 'custom_strategies', 'priority_support'],
      cost: 50
    },
    institutional: {
      maxPositions: 1000,
      responseTime: 1000, // 1 second
      features: ['ultra_fast_execution', 'dedicated_support', 'custom_algorithms', 'regulatory_compliance'],
      cost: 200
    }
  };

  private readonly DEFAULT_PROTECTION_SETTINGS: ProtectionSettings = {
    enabled: true,
    autoRebalance: true,
    maxLoss: 20, // 20% max loss
    stopLoss: 15, // 15% stop loss
    takeProfit: undefined,
    emergencyClose: true,
    hedgeRatio: 0.5,
    riskBudget: 10000, // $10k risk budget
    alertThresholds: {
      warning: 0.3, // 30% margin ratio
      critical: 0.15, // 15% margin ratio
      emergency: 0.05 // 5% margin ratio
    },
    actionTriggers: {
      addMargin: true,
      reducePosition: true,
      hedge: true,
      close: true
    }
  };

  constructor() {
    super();
    this.logger = new EnhancedLogger();

    // Initialize insurance fund
    this.insuranceFund = {
      totalBalance: 5000000, // $5M
      availableBalance: 4500000, // $4.5M available
      utilizationRate: 0.1, // 10% utilized
      contributions: [],
      payouts: [],
      performance: {
        totalContributions: 5500000,
        totalPayouts: 500000,
        netPosition: 5000000,
        roi: 12.5
      }
    };

    // Initialize auto-deleveraging
    this.autoDeleveraging = {
      enabled: true,
      queue: [],
      lastExecution: 0,
      totalDeleveraged: 0,
      fairnessScore: 0.85,
      parameters: {
        maxQueueSize: 1000,
        executionDelay: 5000,
        minProfitThreshold: 0.5,
        priorityWeights: {
          profit: 0.4,
          leverage: 0.3,
          position_size: 0.2,
          time_in_profit: 0.1
        }
      }
    };

    this.logger.info('Liquidation Protection System initialized', {
      component: 'LiquidationProtectionSystem',
      protectionLevels: Object.keys(this.PROTECTION_LEVELS).length
    });
  }

  /**
   * Initialize protection system
   */
  async initialize(): Promise<void> {
    try {
      // Load hedge strategies
      await this.loadHedgeStrategies();

      // Start protection monitoring
      this.startProtectionMonitoring();

      // Start risk assessment
      this.startRiskAssessment();

      // Start auto-deleveraging processor
      this.startADLProcessor();

      // Start insurance fund manager
      this.startInsuranceFundManager();

      this.logger.info('Liquidation Protection System initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Liquidation Protection System:');
      throw error;
    }
  }

  /**
   * Enable protection for a position
   */
  async enableProtection(
    positionId: string,
    userId: string,
    protectionLevel: ProtectionLevel = 'standard',
    customSettings?: Partial<ProtectionSettings>
  ): Promise<ProtectedPosition> {
    try {
      // Validate protection level limits
      const level = this.PROTECTION_LEVELS[protectionLevel];
      const userPositionCount = (this.userPositions.get(userId) || new Set()).size;
      
      if (userPositionCount >= level.maxPositions) {
        throw new Error(`Maximum positions (${level.maxPositions}) reached for ${protectionLevel} protection level`);
      }

      // Get position data (mock - would fetch from actual position)
      const positionData = await this.getPositionData(positionId);

      // Merge settings
      const settings: ProtectionSettings = {
        ...this.DEFAULT_PROTECTION_SETTINGS,
        ...customSettings
      };

      // Calculate initial risk metrics
      const riskMetrics = await this.calculateRiskMetrics(positionData);

      const protectedPosition: ProtectedPosition = {
        id: positionId,
        userId,
        symbol: positionData.symbol,
        side: positionData.side,
        size: positionData.size,
        entryPrice: positionData.entryPrice,
        currentPrice: positionData.currentPrice,
        liquidationPrice: positionData.liquidationPrice,
        marginRatio: positionData.marginRatio,
        maintenanceMargin: positionData.maintenanceMargin,
        protectionLevel,
        protectionSettings: settings,
        riskMetrics,
        alerts: [],
        status: riskMetrics.marginRatio < settings.alertThresholds.critical ? 'at_risk' : 'active',
        lastUpdate: Date.now()
      };

      // Store position
      this.protectedPositions.set(positionId, protectedPosition);

      // Add to user positions
      if (!this.userPositions.has(userId)) {
        this.userPositions.set(userId, new Set());
      }
      const userPositionSet = this.userPositions.get(userId);
      if (userPositionSet) {
        userPositionSet.add(positionId);
      }

      // Initialize action history
      this.protectionActions.set(positionId, []);

      this.logger.info('Protection enabled for position', {
        positionId,
        userId,
        protectionLevel,
        symbol: protectedPosition.symbol,
        marginRatio: protectedPosition.marginRatio
      });

      this.emit('protectionEnabled', protectedPosition);
      return protectedPosition;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to enable protection:');
      throw error;
    }
  }

  /**
   * Disable protection for a position
   */
  async disableProtection(positionId: string, userId: string): Promise<void> {
    const position = this.protectedPositions.get(positionId);
    if (!position || position.userId !== userId) {
      throw new Error(`Protected position ${positionId} not found or unauthorized`);
    }

    // Remove from maps
    this.protectedPositions.delete(positionId);
    this.userPositions.get(userId)?.delete(positionId);
    this.protectionActions.delete(positionId);

    this.logger.info('Protection disabled for position', { positionId, userId });
    this.emit('protectionDisabled', { positionId, userId });
  }

  /**
   * Execute protection action
   */
  async executeProtectionAction(
    positionId: string,
    actionType: ProtectionAction['type'],
    amount: number,
    reasoning: string
  ): Promise<ProtectionAction> {
    try {
      const position = this.protectedPositions.get(positionId);
      if (!position) {
        throw new Error(`Protected position ${positionId} not found`);
      }

      const action: ProtectionAction = {
        id: this.generateActionId(),
        positionId,
        type: actionType,
        amount,
        reasoning,
        status: 'pending'
      };

      // Add to action history
      const actions = this.protectionActions.get(positionId) || [];
      actions.push(action);
      this.protectionActions.set(positionId, actions);

      // Execute action based on type
      action.status = 'executing';
      let result: ProtectionAction['result'];

      switch (actionType) {
        case 'add_margin':
          result = await this.executeAddMargin(position, amount);
          break;
        case 'reduce_position':
          result = await this.executeReducePosition(position, amount);
          break;
        case 'hedge':
          result = await this.executeHedge(position, amount);
          break;
        case 'close':
          result = await this.executeClose(position);
          break;
        case 'rebalance':
          result = await this.executeRebalance(position);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      action.status = result!.success ? 'completed' : 'failed';
      action.result = result;
      action.executedAt = Date.now();

      // Update position if successful
      if (result?.success) {
        if (result?.newMarginRatio !== undefined) position.marginRatio = result.newMarginRatio;
        if (result?.newLiquidationPrice !== undefined) position.liquidationPrice = result.newLiquidationPrice;
        position.lastUpdate = Date.now();

        // Recalculate risk metrics
        position.riskMetrics = await this.calculateRiskMetrics(position);

        this.protectedPositions.set(positionId, position);
      }

      this.logger.info('Protection action executed', {
        actionId: action.id,
        positionId,
        type: actionType,
        success: result?.success || false,
        cost: result?.cost || 0
      });

      this.emit('actionExecuted', action);
      return action;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to execute protection action:');
      throw error;
    }
  }

  /**
   * Get user protected positions
   */
  getUserProtectedPositions(userId: string): ProtectedPosition[] {
    const positionIds = this.userPositions.get(userId) || new Set();
    return Array.from(positionIds)
      .map(id => this.protectedPositions.get(id))
      .filter((position): position is ProtectedPosition => position !== undefined);
  }

  /**
   * Get protection actions for a position
   */
  getProtectionActions(positionId: string): ProtectionAction[] {
    return this.protectionActions.get(positionId) || [];
  }

  /**
   * Get insurance fund status
   */
  getInsuranceFundStatus(): InsuranceFund {
    return { ...this.insuranceFund };
  }

  /**
   * Get protection report
   */
  generateProtectionReport(
    userId?: string,
    startDate?: number,
    endDate?: number
  ): ProtectionReport {
    const start = startDate || Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const end = endDate || Date.now();

    const positions = userId 
      ? this.getUserProtectedPositions(userId)
      : Array.from(this.protectedPositions.values());

    const relevantPositions = positions.filter(p =>
      p?.lastUpdate >= start && p?.lastUpdate <= end
    );

    const allActions = Array.from(this.protectionActions.values()).flat()
      .filter(a => a?.executedAt && a.executedAt >= start && a.executedAt <= end);

    const successfulActions = allActions.filter(a => a?.result?.success);

    return {
      userId,
      period: { start, end },
      summary: {
        totalPositions: relevantPositions.length,
        protectedPositions: relevantPositions.filter(p => p.status === 'protected').length,
        liquidationsPrevented: successfulActions.filter(a => a.type === 'close').length,
        totalSaved: successfulActions.reduce((sum, a) => sum + (a.result?.cost || 0), 0),
        averageRiskReduction: this.calculateAverageRiskReduction(relevantPositions)
      },
      actions: {
        marginAdded: successfulActions.filter(a => a.type === 'add_margin').length,
        positionsReduced: successfulActions.filter(a => a.type === 'reduce_position').length,
        hedgesCreated: successfulActions.filter(a => a.type === 'hedge').length,
        emergencyCloses: successfulActions.filter(a => a.type === 'close').length
      },
      performance: {
        successRate: allActions.length > 0 ? (successfulActions.length / allActions.length) * 100 : 0,
        avgResponseTime: this.calculateAverageResponseTime(allActions),
        costEfficiency: this.calculateCostEfficiency(successfulActions),
        userSatisfaction: 85 // Mock - would be from user feedback
      },
      risks: {
        highestRisk: relevantPositions.length > 0 ? Math.max(...relevantPositions.map(p => p?.riskMetrics?.portfolioHeat || 0)) : 0,
        averageRisk: relevantPositions.length > 0 ? relevantPositions.reduce((sum, p) => sum + (p?.riskMetrics?.portfolioHeat || 0), 0) / relevantPositions.length : 0,
        riskTrends: this.calculateRiskTrends(relevantPositions)
      }
    };
  }

  /**
   * Private methods
   */

  private async getPositionData(positionId: string): Promise<any> {
    // Mock position data - in production would fetch from derivatives engine
    return {
      symbol: 'BTCUSDT-PERP',
      side: 'long',
      size: 1.5,
      entryPrice: 45000,
      currentPrice: 44000,
      liquidationPrice: 40000,
      marginRatio: 0.25,
      maintenanceMargin: 0.05
    };
  }

  private async calculateRiskMetrics(position: any): Promise<RiskMetrics> {
    const currentPrice = this.getCurrentPrice(position.symbol);
    const liquidationDistance = Math.abs(currentPrice - position.liquidationPrice) / currentPrice;
    const leverage = position.entryPrice / (position.entryPrice - position.liquidationPrice);
    
    // Mock advanced risk calculations
    return {
      marginRatio: position.marginRatio,
      liquidationDistance: liquidationDistance * 100,
      timeToLiquidation: this.estimateTimeToLiquidation(position),
      valueAtRisk: position.size * currentPrice * 0.05, // 5% VaR
      expectedShortfall: position.size * currentPrice * 0.08, // 8% ES
      leverage,
      correlationRisk: 0.3, // Mock correlation risk
      portfolioHeat: Math.max(0, Math.min(100, (1 - position.marginRatio) * 100)),
      sharpeRatio: 1.2, // Mock Sharpe ratio
      maxDrawdown: 0.15 // Mock max drawdown
    };
  }

  private getCurrentPrice(symbol: string): number {
    const cached = this.priceFeeds.get(symbol);
    if (cached && Date.now() - (cached?.timestamp || 0) < 5000) {
      return cached?.price || 0;
    }

    // Mock price with small random movement
    const basePrices: Record<string, number> = {
      'BTCUSDT-PERP': 44000,
      'ETHUSDT-PERP': 2800,
      'SOLUSDT-PERP': 95
    };

    const basePrice = basePrices[symbol] || 1000;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.01); // ±0.5% random

    this.priceFeeds.set(symbol, { price, timestamp: Date.now() });
    return price;
  }

  private estimateTimeToLiquidation(position: any): number {
    // Simple estimation based on current volatility
    const dailyVolatility = 0.04; // 4% daily volatility
    const liquidationDistance = Math.abs(position.currentPrice - position.liquidationPrice) / position.currentPrice;
    
    // Time in hours until liquidation at current volatility
    return (liquidationDistance / dailyVolatility) * 24;
  }

  private async loadHedgeStrategies(): Promise<void> {
    const strategies: HedgeStrategy[] = [
      {
        id: 'delta_neutral_btc',
        name: 'Bitcoin Delta Neutral',
        description: 'Hedge BTC long positions with BTC shorts',
        type: 'delta_neutral',
        instruments: [
          {
            symbol: 'BTCUSDT-PERP',
            type: 'future',
            ratio: -1,
            direction: 'short',
            cost: 5, // 5 bps
            liquidity: 0.95,
            correlation: -0.98
          }
        ],
        effectiveness: 0.92,
        cost: 8,
        maxHedgeRatio: 1.0,
        dynamicAdjustment: true,
        conditions: {
          minPosition: 1000,
          maxRisk: 0.8,
          marketConditions: ['normal', 'volatile']
        }
      }
    ];

    for (const strategy of strategies) {
      this.hedgeStrategies.set(strategy.id, strategy);
    }
  }

  private async executeAddMargin(position: ProtectedPosition, amount: number): Promise<ProtectionAction['result']> {
    try {
      // Mock margin addition
      const newMarginRatio = position.marginRatio + (amount / (position.size * position.currentPrice));
      const newLiquidationPrice = this.calculateNewLiquidationPrice(position, newMarginRatio);

      return {
        success: true,
        newMarginRatio: Math.min(1, newMarginRatio),
        newLiquidationPrice,
        cost: amount * 0.001 // 0.1% fee
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: (error as Error).message
      };
    }
  }

  private async executeReducePosition(position: ProtectedPosition, percentage: number): Promise<ProtectionAction['result']> {
    try {
      const reduceAmount = position.size * (percentage / 100);
      const newSize = position.size - reduceAmount;
      const newMarginRatio = position.marginRatio * (position.size / newSize);

      return {
        success: true,
        newMarginRatio: Math.min(1, newMarginRatio),
        cost: reduceAmount * position.currentPrice * 0.0005 // 0.05% trading fee
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: (error as Error).message
      };
    }
  }

  private async executeHedge(position: ProtectedPosition, hedgeRatio: number): Promise<ProtectionAction['result']> {
    try {
      const strategy = Array.from(this.hedgeStrategies.values())[0]; // Use first available strategy
      const hedgeSize = position.size * hedgeRatio;
      const hedgeCost = hedgeSize * position.currentPrice * (strategy.cost / 10000);

      return {
        success: true,
        cost: hedgeCost
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: (error as Error).message
      };
    }
  }

  private async executeClose(position: ProtectedPosition): Promise<ProtectionAction['result']> {
    try {
      const closeCost = position.size * position.currentPrice * 0.0005; // 0.05% trading fee

      return {
        success: true,
        newMarginRatio: 0,
        cost: closeCost
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: (error as Error).message
      };
    }
  }

  private async executeRebalance(position: ProtectedPosition): Promise<ProtectionAction['result']> {
    try {
      // Mock rebalancing
      const rebalanceCost = position.size * position.currentPrice * 0.0002; // 0.02% cost

      return {
        success: true,
        newMarginRatio: position.marginRatio * 1.1, // 10% improvement
        cost: rebalanceCost
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: (error as Error).message
      };
    }
  }

  private calculateNewLiquidationPrice(position: ProtectedPosition, newMarginRatio: number): number {
    // Simplified calculation
    const leverage = 1 / newMarginRatio;
    const direction = position.side === 'long' ? -1 : 1;
    return position.entryPrice * (1 + direction * (1 / leverage));
  }

  private startProtectionMonitoring(): void {
    setInterval(() => {
      this.monitorProtectedPositions();
    }, 1000); // Monitor every second
  }

  private startRiskAssessment(): void {
    setInterval(() => {
      this.assessRisks();
    }, 5000); // Assess every 5 seconds
  }

  private startADLProcessor(): void {
    setInterval(() => {
      this.processAutoDeleveraging();
    }, 10000); // Process every 10 seconds
  }

  private startInsuranceFundManager(): void {
    setInterval(() => {
      this.manageInsuranceFund();
    }, 60000); // Manage every minute
  }

  private async monitorProtectedPositions(): Promise<void> {
    for (const position of this.protectedPositions.values()) {
      // Update current price
      position.currentPrice = this.getCurrentPrice(position.symbol);
      
      // Recalculate metrics
      position.riskMetrics = await this.calculateRiskMetrics(position);
      position.marginRatio = position.riskMetrics.marginRatio;
      
      // Check alert thresholds
      await this.checkAlertThresholds(position);
      
      // Trigger protection actions if needed
      await this.triggerProtectionActions(position);
      
      position.lastUpdate = Date.now();
      this.protectedPositions.set(position.id, position);
    }
  }

  private async checkAlertThresholds(position: ProtectedPosition): Promise<void> {
    const { alertThresholds } = position.protectionSettings;
    
    if (position.marginRatio <= alertThresholds.emergency) {
      await this.createAlert(position, 'liquidation_imminent', 'emergency', 
        'Emergency: Position near liquidation!');
    } else if (position.marginRatio <= alertThresholds.critical) {
      await this.createAlert(position, 'margin_call', 'critical', 
        'Critical: Margin call threshold reached');
    } else if (position.marginRatio <= alertThresholds.warning) {
      await this.createAlert(position, 'risk_warning', 'warning', 
        'Warning: Position approaching risk limits');
    }
  }

  private async createAlert(
    position: ProtectedPosition,
    type: PositionAlert['type'],
    severity: PositionAlert['severity'],
    message: string
  ): Promise<void> {
    const alert: PositionAlert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      acknowledged: false
    };

    position.alerts.push(alert);
    this.emit('alert', { position, alert });
  }

  private async triggerProtectionActions(position: ProtectedPosition): Promise<void> {
    const { protectionSettings, marginRatio } = position;
    
    if (!protectionSettings.enabled) return;

    // Emergency close
    if (marginRatio <= protectionSettings.alertThresholds.emergency && 
        protectionSettings.emergencyClose && 
        protectionSettings.actionTriggers.close) {
      
      await this.executeProtectionAction(
        position.id,
        'close',
        100, // Close 100%
        'Emergency close due to critical margin ratio'
      );
    }
    // Add margin
    else if (marginRatio <= protectionSettings.alertThresholds.critical && 
             protectionSettings.actionTriggers.addMargin) {
      
      const marginToAdd = position.size * position.currentPrice * 0.1; // Add 10% margin
      await this.executeProtectionAction(
        position.id,
        'add_margin',
        marginToAdd,
        'Auto-add margin to prevent liquidation'
      );
    }
    // Reduce position
    else if (marginRatio <= protectionSettings.alertThresholds.warning && 
             protectionSettings.actionTriggers.reducePosition) {
      
      await this.executeProtectionAction(
        position.id,
        'reduce_position',
        25, // Reduce by 25%
        'Auto-reduce position to lower risk'
      );
    }
  }

  private async assessRisks(): Promise<void> {
    // Assess overall portfolio risk
    const allPositions = Array.from(this.protectedPositions.values());
    const avgRisk = allPositions.length > 0
      ? allPositions.reduce((sum, p) => sum + (p?.riskMetrics?.portfolioHeat || 0), 0) / allPositions.length
      : 0;

    if (avgRisk > 80) {
      this.emit('portfolioRiskHigh', { avgRisk, positionCount: allPositions.length });
    }
  }

  private async processAutoDeleveraging(): Promise<void> {
    if (!this.autoDeleveraging.enabled || this.autoDeleveraging.queue.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - this.autoDeleveraging.lastExecution < this.autoDeleveraging.parameters.executionDelay) {
      return;
    }

    // Process top priority positions
    const toDeleverage = this.autoDeleveraging.queue
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Process up to 5 at a time

    for (const entry of toDeleverage) {
      await this.executeAutoDeleverage(entry);
    }

    this.autoDeleveraging.lastExecution = now;
  }

  private async executeAutoDeleverage(entry: ADLQueueEntry): Promise<void> {
    // Mock ADL execution
    this.logger.info('Auto-deleveraging executed', {
      userId: entry.userId,
      positionId: entry.positionId,
      size: entry.size,
      priority: entry.priority
    });

    // Remove from queue
    this.autoDeleveraging.queue = this.autoDeleveraging.queue.filter(e => e.positionId !== entry.positionId);
    this.autoDeleveraging.totalDeleveraged += entry.size;
  }

  private async manageInsuranceFund(): Promise<void> {
    // Update insurance fund metrics
    this.insuranceFund.utilizationRate = 
      (this.insuranceFund.totalBalance - this.insuranceFund.availableBalance) / this.insuranceFund.totalBalance;
    
    // Check if fund needs replenishment
    if (this.insuranceFund.utilizationRate > 0.8) {
      this.emit('insuranceFundLow', this.insuranceFund);
    }
  }

  private calculateAverageRiskReduction(positions: ProtectedPosition[]): number {
    // Mock calculation
    return positions.length > 0 ? 25 : 0; // 25% average risk reduction
  }

  private calculateAverageResponseTime(actions: ProtectionAction[]): number {
    const executedActions = actions.filter(a => a?.executedAt);
    if (executedActions.length === 0) return 0;

    const totalTime = executedActions.reduce((sum, a) => sum + ((a?.executedAt || 0) - Date.now()), 0);
    return totalTime / executedActions.length;
  }

  private calculateCostEfficiency(actions: ProtectionAction[]): number {
    const totalCost = actions.reduce((sum, a) => sum + (a.result?.cost || 0), 0);
    const totalSaved = actions.length * 1000; // Mock savings
    return totalSaved > 0 ? totalCost / totalSaved : 0;
  }

  private calculateRiskTrends(positions: ProtectedPosition[]): number[] {
    // Mock risk trend data for last 30 days
    return Array.from({ length: 30 }, () => Math.random() * 100);
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const liquidationProtectionSystem = new LiquidationProtectionSystem();

// Export utility functions
export const ProtectionUtils = {
  /**
   * Calculate optimal hedge ratio
   */
  calculateOptimalHedgeRatio(
    correlation: number,
    volatilityRatio: number,
    riskTolerance: number
  ): number {
    const baseHedgeRatio = correlation * volatilityRatio;
    return Math.max(0, Math.min(1, baseHedgeRatio * riskTolerance));
  },

  /**
   * Calculate position risk score
   */
  calculateRiskScore(
    marginRatio: number,
    leverage: number,
    volatility: number,
    liquidationDistance: number
  ): number {
    const marginScore = Math.max(0, (0.5 - marginRatio) / 0.5) * 40; // 40% weight
    const leverageScore = Math.min(40, leverage / 10 * 40); // 40% weight, max at 10x
    const volatilityScore = Math.min(15, volatility * 100 * 15); // 15% weight
    const liquidationScore = Math.max(0, (0.1 - liquidationDistance) / 0.1) * 5; // 5% weight
    
    return Math.min(100, marginScore + leverageScore + volatilityScore + liquidationScore);
  },

  /**
   * Calculate insurance fund contribution
   */
  calculateInsuranceContribution(
    tradingVolume: number,
    profitLoss: number,
    riskLevel: number
  ): number {
    const baseRate = 0.001; // 0.1% of volume
    const riskMultiplier = 1 + (riskLevel / 100);
    const profitAdjustment = profitLoss > 0 ? 1.1 : 0.9; // Higher contribution for profits
    
    return tradingVolume * baseRate * riskMultiplier * profitAdjustment;
  },

  /**
   * Estimate liquidation probability
   */
  estimateLiquidationProbability(
    currentPrice: number,
    liquidationPrice: number,
    volatility: number,
    timeHorizon: number // hours
  ): number {
    const priceDistance = Math.abs(currentPrice - liquidationPrice) / currentPrice;
    const timeAdjustedVolatility = volatility * Math.sqrt(timeHorizon / 24); // Adjust for time horizon
    
    // Simple Black-Scholes-inspired probability calculation
    const d = Math.log(currentPrice / liquidationPrice) / timeAdjustedVolatility;
    return Math.max(0, Math.min(1, 0.5 - d / 4)); // Approximate probability
  }
};