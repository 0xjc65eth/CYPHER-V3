/**
 * Derivatives Trading Engine for CYPHER ORDi Future V3
 * Advanced futures, options, and perpetual contracts trading
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Derivatives Types
export interface DerivativeContract {
  id: string;
  symbol: string;
  underlying: string;
  type: 'future' | 'option' | 'perpetual' | 'swap';
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  expiryDate?: number;
  strike?: number; // For options
  premium?: number; // For options
  optionType?: 'call' | 'put'; // For options
  fundingRate?: number; // For perpetuals
  margin: {
    initial: number;
    maintenance: number;
    used: number;
    free: number;
  };
  pnl: {
    unrealized: number;
    realized: number;
    funding: number; // For perpetuals
  };
  fees: {
    opening: number;
    funding: number;
    closing: number;
  };
  status: 'open' | 'closed' | 'liquidated' | 'expired';
  userId: string;
  timestamp: number;
  lastUpdate: number;
}

export interface FutureContract {
  symbol: string;
  underlying: string;
  expiryDate: number;
  contractSize: number;
  tickSize: number;
  minNotional: number;
  maxNotional: number;
  marginRequirement: number;
  settlementType: 'cash' | 'physical';
  tradingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  fees: {
    maker: number;
    taker: number;
  };
  isActive: boolean;
}

export interface OptionContract {
  symbol: string;
  underlying: string;
  strike: number;
  expiryDate: number;
  type: 'call' | 'put';
  style: 'european' | 'american';
  contractSize: number;
  premium: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  timeValue: number;
  intrinsicValue: number;
  isActive: boolean;
}

export interface PerpetualContract {
  symbol: string;
  underlying: string;
  fundingRate: number;
  fundingInterval: number; // hours
  nextFundingTime: number;
  openInterest: number;
  maxLeverage: number;
  markPrice: number;
  indexPrice: number;
  fees: {
    maker: number;
    taker: number;
  };
  isActive: boolean;
}

export interface MarginAccount {
  userId: string;
  totalBalance: number;
  availableBalance: number;
  usedMargin: number;
  marginRatio: number;
  maintenanceMargin: number;
  positions: string[]; // Contract IDs
  unrealizedPnL: number;
  equity: number;
  leverage: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskMetrics {
  userId: string;
  portfolioValue: number;
  totalExposure: number;
  netExposure: number;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  expectedShortfall: number;
  maxDrawdown: number;
  beta: number;
  correlation: Record<string, number>;
  concentrationRisk: number;
  leverageRatio: number;
  liquidationRisk: number;
}

export interface OrderRequest {
  userId: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'bracket';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  leverage?: number;
  marginType?: 'isolated' | 'cross';
  reduceOnly?: boolean;
  postOnly?: boolean;
}

export interface LiquidationEvent {
  contractId: string;
  userId: string;
  symbol: string;
  liquidationPrice: number;
  liquidationValue: number;
  timestamp: number;
  reason: 'margin_call' | 'auto_deleveraging' | 'insurance_fund';
  insuranceFundImpact: number;
  adlQueue?: string[]; // Auto-deleveraging queue
}

export class DerivativesEngine extends EventEmitter {
  private logger: EnhancedLogger;
  private contracts: Map<string, DerivativeContract> = new Map();
  private userContracts: Map<string, Set<string>> = new Map();
  private marginAccounts: Map<string, MarginAccount> = new Map();
  private futureContracts: Map<string, FutureContract> = new Map();
  private optionContracts: Map<string, OptionContract> = new Map();
  private perpetualContracts: Map<string, PerpetualContract> = new Map();
  private riskMetrics: Map<string, RiskMetrics> = new Map();
  private priceFeeds: Map<string, { price: number; timestamp: number }> = new Map();

  // Risk management parameters
  private readonly LIQUIDATION_BUFFER = 0.005; // 0.5%
  private readonly MAX_LEVERAGE = 100;
  private readonly INSURANCE_FUND_RATE = 0.0001; // 0.01%
  private readonly ADL_THRESHOLD = 0.8; // 80% margin ratio

  // Supported contracts
  private readonly SUPPORTED_FUTURES = [
    'BTCUSDT-PERP', 'ETHUSDT-PERP', 'SOLUSDT-PERP',
    'BTCUSDT-Q', 'ETHUSDT-Q' // Quarterly futures
  ];

  constructor() {
    super();
    this.logger = new EnhancedLogger();

    this.logger.info('Derivatives Engine initialized', {
      component: 'DerivativesEngine',
      supportedContracts: this.SUPPORTED_FUTURES.length
    });
  }

  /**
   * Initialize derivatives engine
   */
  async initialize(): Promise<void> {
    try {
      // Initialize contract specifications
      await this.initializeContracts();

      // Start price feeds
      this.startPriceFeeds();

      // Start risk monitoring
      this.startRiskMonitoring();

      // Start funding rate updates
      this.startFundingRateUpdater();

      // Start option Greeks calculator
      this.startGreeksCalculator();

      this.logger.info('Derivatives Engine initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Derivatives Engine:');
      throw error;
    }
  }

  /**
   * Open a derivative position
   */
  async openPosition(orderRequest: OrderRequest): Promise<DerivativeContract> {
    try {
      // Validate order
      this.validateOrder(orderRequest);

      // Check margin requirements
      await this.checkMarginRequirements(orderRequest);

      // Calculate position details
      const position = await this.calculatePosition(orderRequest);

      // Execute position
      const contract = await this.executePosition(position, orderRequest);

      // Update margin account
      await this.updateMarginAccount(orderRequest.userId, contract);

      // Update risk metrics
      await this.updateRiskMetrics(orderRequest.userId);

      this.logger.info('Derivative position opened', {
        contractId: contract.id,
        userId: orderRequest.userId,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        size: orderRequest.quantity
      });

      this.emit('positionOpened', contract);
      return contract;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to open position:');
      throw error;
    }
  }

  /**
   * Close a derivative position
   */
  async closePosition(
    contractId: string,
    userId: string,
    quantity?: number
  ): Promise<{
    closedContract: DerivativeContract;
    realizedPnL: number;
    fees: number;
  }> {
    try {
      const contract = this.contracts.get(contractId);
      if (!contract || contract.userId !== userId) {
        throw new Error(`Contract ${contractId} not found or unauthorized`);
      }

      if (contract.status !== 'open') {
        throw new Error(`Contract ${contractId} is not open`);
      }

      const closeQuantity = quantity || contract.size;
      const currentPrice = this.getCurrentPrice(contract.symbol);

      // Calculate PnL
      const pnlInfo = this.calculatePnL(contract, currentPrice, closeQuantity);

      // Calculate fees
      const fees = this.calculateClosingFees(contract, closeQuantity, currentPrice);

      // Update contract
      contract.pnl.realized += pnlInfo.realizedPnL;
      contract.fees.closing += fees;
      contract.size -= closeQuantity;
      contract.lastUpdate = Date.now();

      if (contract.size <= 0) {
        contract.status = 'closed';
        contract.size = 0;
      }

      this.contracts.set(contractId, contract);

      // Update margin account
      await this.updateMarginAccount(userId, contract);

      // Update risk metrics
      await this.updateRiskMetrics(userId);

      this.logger.info('Derivative position closed', {
        contractId,
        userId,
        closedQuantity: closeQuantity,
        realizedPnL: pnlInfo.realizedPnL,
        fees
      });

      const result = {
        closedContract: contract,
        realizedPnL: pnlInfo.realizedPnL,
        fees
      };

      this.emit('positionClosed', result);
      return result;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to close position:');
      throw error;
    }
  }

  /**
   * Calculate option Greeks
   */
  calculateOptionGreeks(
    optionSymbol: string,
    spotPrice: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate: number = 0.05
  ): {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  } {
    const option = this.optionContracts.get(optionSymbol);
    if (!option) {
      throw new Error(`Option contract ${optionSymbol} not found`);
    }

    // Black-Scholes calculations
    const d1 = this.calculateD1(spotPrice, option.strike, timeToExpiry, volatility, riskFreeRate);
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    const nd1 = this.normalCDF(d1);
    const nd2 = this.normalCDF(d2);
    const npd1 = this.normalPDF(d1);

    let delta: number;
    let rho: number;

    if (option.type === 'call') {
      delta = nd1;
      rho = option.strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * nd2 / 100;
    } else {
      delta = nd1 - 1;
      rho = -option.strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * (1 - nd2) / 100;
    }

    const gamma = npd1 / (spotPrice * volatility * Math.sqrt(timeToExpiry));
    const theta = (-spotPrice * npd1 * volatility / (2 * Math.sqrt(timeToExpiry)) 
                  - riskFreeRate * option.strike * Math.exp(-riskFreeRate * timeToExpiry) * nd2) / 365;
    const vega = spotPrice * npd1 * Math.sqrt(timeToExpiry) / 100;

    return { delta, gamma, theta, vega, rho };
  }

  /**
   * Get user margin account
   */
  getMarginAccount(userId: string): MarginAccount | null {
    return this.marginAccounts.get(userId) || null;
  }

  /**
   * Get user positions
   */
  getUserPositions(userId: string): DerivativeContract[] {
    const contractIds = this.userContracts.get(userId) || new Set();
    return Array.from(contractIds)
      .map(id => this.contracts.get(id))
      .filter((contract): contract is DerivativeContract => 
        contract !== undefined && contract.status === 'open'
      );
  }

  /**
   * Get risk metrics for user
   */
  getUserRiskMetrics(userId: string): RiskMetrics | null {
    return this.riskMetrics.get(userId) || null;
  }

  /**
   * Get available contracts
   */
  getAvailableContracts(): {
    futures: FutureContract[];
    options: OptionContract[];
    perpetuals: PerpetualContract[];
  } {
    return {
      futures: Array.from(this.futureContracts.values()).filter(c => c.isActive),
      options: Array.from(this.optionContracts.values()).filter(c => c.isActive),
      perpetuals: Array.from(this.perpetualContracts.values()).filter(c => c.isActive)
    };
  }

  /**
   * Private methods
   */

  private async initializeContracts(): Promise<void> {
    // Initialize perpetual contracts
    const perpetuals: PerpetualContract[] = [
      {
        symbol: 'BTCUSDT-PERP',
        underlying: 'BTC',
        fundingRate: 0.0001,
        fundingInterval: 8,
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
        openInterest: 150000,
        maxLeverage: 100,
        markPrice: 45000,
        indexPrice: 45010,
        fees: { maker: 0.0002, taker: 0.0005 },
        isActive: true
      },
      {
        symbol: 'ETHUSDT-PERP',
        underlying: 'ETH',
        fundingRate: 0.00005,
        fundingInterval: 8,
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
        openInterest: 80000,
        maxLeverage: 75,
        markPrice: 3000,
        indexPrice: 3005,
        fees: { maker: 0.0002, taker: 0.0005 },
        isActive: true
      }
    ];

    perpetuals.forEach(contract => {
      this.perpetualContracts.set(contract.symbol, contract);
    });

    // Initialize futures contracts
    const futures: FutureContract[] = [
      {
        symbol: 'BTCUSDT-Q',
        underlying: 'BTC',
        expiryDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // 3 months
        contractSize: 1,
        tickSize: 0.1,
        minNotional: 10,
        maxNotional: 1000000,
        marginRequirement: 0.05, // 5%
        settlementType: 'cash',
        tradingHours: {
          start: '00:00',
          end: '24:00',
          timezone: 'UTC'
        },
        fees: { maker: 0.0002, taker: 0.0004 },
        isActive: true
      }
    ];

    futures.forEach(contract => {
      this.futureContracts.set(contract.symbol, contract);
    });

    // Initialize option contracts
    const options: OptionContract[] = [
      {
        symbol: 'BTC-50000-C',
        underlying: 'BTC',
        strike: 50000,
        expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 1 month
        type: 'call',
        style: 'european',
        contractSize: 0.01,
        premium: 1500,
        impliedVolatility: 0.8,
        delta: 0.6,
        gamma: 0.0001,
        theta: -25,
        vega: 150,
        rho: 30,
        timeValue: 1000,
        intrinsicValue: 500,
        isActive: true
      }
    ];

    options.forEach(contract => {
      this.optionContracts.set(contract.symbol, contract);
    });
  }

  private validateOrder(orderRequest: OrderRequest): void {
    if (!orderRequest.symbol || !orderRequest.side || !orderRequest.quantity) {
      throw new Error('Missing required order fields');
    }

    if (orderRequest.quantity <= 0) {
      throw new Error('Order quantity must be positive');
    }

    if (orderRequest.leverage && (orderRequest.leverage < 1 || orderRequest.leverage > this.MAX_LEVERAGE)) {
      throw new Error(`Leverage must be between 1 and ${this.MAX_LEVERAGE}`);
    }

    // Check if contract exists
    const isPerpetual = this.perpetualContracts.has(orderRequest.symbol);
    const isFuture = this.futureContracts.has(orderRequest.symbol);
    const isOption = this.optionContracts.has(orderRequest.symbol);

    if (!isPerpetual && !isFuture && !isOption) {
      throw new Error(`Contract ${orderRequest.symbol} not found`);
    }
  }

  private async checkMarginRequirements(orderRequest: OrderRequest): Promise<void> {
    const marginAccount = this.getMarginAccount(orderRequest.userId);
    if (!marginAccount) {
      throw new Error('Margin account not found');
    }

    const requiredMargin = this.calculateRequiredMargin(orderRequest);
    
    if (marginAccount.availableBalance < requiredMargin) {
      throw new Error('Insufficient margin balance');
    }
  }

  private calculateRequiredMargin(orderRequest: OrderRequest): number {
    const currentPrice = this.getCurrentPrice(orderRequest.symbol);
    const notionalValue = orderRequest.quantity * currentPrice;
    
    let marginRequirement = 0.1; // Default 10%
    
    if (orderRequest.leverage) {
      marginRequirement = 1 / orderRequest.leverage;
    } else {
      // Get contract-specific margin requirement
      const perpetual = this.perpetualContracts.get(orderRequest.symbol);
      const future = this.futureContracts.get(orderRequest.symbol);
      
      if (perpetual) {
        marginRequirement = 1 / perpetual.maxLeverage;
      } else if (future) {
        marginRequirement = future.marginRequirement;
      }
    }

    return notionalValue * marginRequirement;
  }

  private async calculatePosition(orderRequest: OrderRequest): Promise<Partial<DerivativeContract>> {
    const currentPrice = this.getCurrentPrice(orderRequest.symbol);
    const notionalValue = orderRequest.quantity * currentPrice;
    
    let contractType: DerivativeContract['type'] = 'perpetual';
    if (this.futureContracts.has(orderRequest.symbol)) contractType = 'future';
    if (this.optionContracts.has(orderRequest.symbol)) contractType = 'option';

    const initialMargin = this.calculateRequiredMargin(orderRequest);
    const maintenanceMargin = initialMargin * 0.5; // 50% of initial
    
    // Calculate liquidation price
    const liquidationPrice = this.calculateLiquidationPrice(
      currentPrice,
      orderRequest.side,
      orderRequest.leverage || 10,
      maintenanceMargin / notionalValue
    );

    return {
      symbol: orderRequest.symbol,
      underlying: this.getUnderlying(orderRequest.symbol),
      type: contractType,
      side: orderRequest.side === 'buy' ? 'long' : 'short' as 'long' | 'short',
      size: orderRequest.quantity,
      entryPrice: currentPrice,
      markPrice: currentPrice,
      liquidationPrice,
      margin: {
        initial: initialMargin,
        maintenance: maintenanceMargin,
        used: initialMargin,
        free: 0
      },
      pnl: {
        unrealized: 0,
        realized: 0,
        funding: 0
      },
      fees: {
        opening: notionalValue * (this.getFees(orderRequest.symbol).taker || 0.0005),
        funding: 0,
        closing: 0
      },
      status: 'open' as const,
      userId: orderRequest.userId,
      timestamp: Date.now(),
      lastUpdate: Date.now()
    };
  }

  private async executePosition(
    position: Partial<DerivativeContract>,
    orderRequest: OrderRequest
  ): Promise<DerivativeContract> {
    const contract: DerivativeContract = {
      id: this.generateContractId(),
      ...position
    } as DerivativeContract;

    this.contracts.set(contract.id, contract);

    // Add to user contracts
    if (!this.userContracts.has(orderRequest.userId)) {
      this.userContracts.set(orderRequest.userId, new Set());
    }
    this.userContracts.get(orderRequest.userId)!.add(contract.id);

    return contract;
  }

  private async updateMarginAccount(userId: string, contract: DerivativeContract): Promise<void> {
    let marginAccount = this.marginAccounts.get(userId);
    
    if (!marginAccount) {
      marginAccount = {
        userId,
        totalBalance: 100000, // Starting balance
        availableBalance: 100000,
        usedMargin: 0,
        marginRatio: 0,
        maintenanceMargin: 0,
        positions: [],
        unrealizedPnL: 0,
        equity: 100000,
        leverage: 1,
        riskLevel: 'low'
      };
    }

    // Update margin usage
    marginAccount.usedMargin += contract.margin.used;
    marginAccount.availableBalance -= contract.margin.used;
    marginAccount.positions.push(contract.id);

    // Calculate margin ratio
    marginAccount.marginRatio = marginAccount.usedMargin / marginAccount.totalBalance;

    // Update risk level
    if (marginAccount.marginRatio > 0.8) marginAccount.riskLevel = 'critical';
    else if (marginAccount.marginRatio > 0.6) marginAccount.riskLevel = 'high';
    else if (marginAccount.marginRatio > 0.4) marginAccount.riskLevel = 'medium';
    else marginAccount.riskLevel = 'low';

    this.marginAccounts.set(userId, marginAccount);
  }

  private calculatePnL(
    contract: DerivativeContract,
    currentPrice: number,
    quantity: number
  ): {
    unrealizedPnL: number;
    realizedPnL: number;
  } {
    const priceDiff = currentPrice - contract.entryPrice;
    const multiplier = contract.side === 'long' ? 1 : -1;
    const pnlPerUnit = priceDiff * multiplier;
    
    const unrealizedPnL = pnlPerUnit * (contract.size - quantity);
    const realizedPnL = pnlPerUnit * quantity;

    return { unrealizedPnL, realizedPnL };
  }

  private calculateClosingFees(
    contract: DerivativeContract,
    quantity: number,
    currentPrice: number
  ): number {
    const notionalValue = quantity * currentPrice;
    const fees = this.getFees(contract.symbol);
    return notionalValue * fees.taker;
  }

  private calculateLiquidationPrice(
    entryPrice: number,
    side: 'buy' | 'sell',
    leverage: number,
    maintenanceMarginRate: number
  ): number {
    const direction = side === 'buy' ? -1 : 1;
    const liquidationDistance = entryPrice * (1 / leverage - maintenanceMarginRate);
    return entryPrice + (direction * liquidationDistance);
  }

  private getCurrentPrice(symbol: string): number {
    const cached = this.priceFeeds.get(symbol);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.price;
    }

    // Mock price data
    const basePrices: Record<string, number> = {
      'BTCUSDT-PERP': 45000,
      'ETHUSDT-PERP': 3000,
      'SOLUSDT-PERP': 100,
      'BTCUSDT-Q': 45200,
      'ETHUSDT-Q': 3020
    };

    const basePrice = basePrices[symbol] || 1000;
    const price = basePrice; // Deterministic: use base price (no random variation)

    this.priceFeeds.set(symbol, { price, timestamp: Date.now() });
    return price;
  }

  private getUnderlying(symbol: string): string {
    if (symbol.includes('BTC')) return 'BTC';
    if (symbol.includes('ETH')) return 'ETH';
    if (symbol.includes('SOL')) return 'SOL';
    return symbol.split('-')[0];
  }

  private getFees(symbol: string): { maker: number; taker: number } {
    const perpetual = this.perpetualContracts.get(symbol);
    if (perpetual) return perpetual.fees;

    const future = this.futureContracts.get(symbol);
    if (future) return future.fees;

    return { maker: 0.0002, taker: 0.0005 }; // Default fees
  }

  private async updateRiskMetrics(userId: string): Promise<void> {
    const positions = this.getUserPositions(userId);
    const marginAccount = this.getMarginAccount(userId);
    
    if (!marginAccount) return;

    // Calculate portfolio metrics
    const totalExposure = positions.reduce((sum, pos) => 
      sum + pos.size * pos.markPrice, 0
    );

    const netExposure = positions.reduce((sum, pos) => {
      const multiplier = pos.side === 'long' ? 1 : -1;
      return sum + (pos.size * pos.markPrice * multiplier);
    }, 0);

    // Simple VaR calculation (95% confidence)
    const var95 = totalExposure * 0.05; // 5% portfolio loss
    const var99 = totalExposure * 0.02; // 2% portfolio loss

    const riskMetrics: RiskMetrics = {
      userId,
      portfolioValue: marginAccount.equity,
      totalExposure,
      netExposure,
      var95,
      var99,
      expectedShortfall: var95 * 1.5,
      maxDrawdown: 0, // Would calculate from historical data
      beta: 1.2, // Mock beta
      correlation: { BTC: 0.8, ETH: 0.7 },
      concentrationRisk: Math.max(...positions.map(p => p.size * p.markPrice)) / totalExposure,
      leverageRatio: totalExposure / marginAccount.equity,
      liquidationRisk: marginAccount.marginRatio > 0.8 ? 1 : 0
    };

    this.riskMetrics.set(userId, riskMetrics);
  }

  private startPriceFeeds(): void {
    setInterval(() => {
      // Update all contract prices
      for (const symbol of this.SUPPORTED_FUTURES) {
        this.getCurrentPrice(symbol);
      }
    }, 1000); // Update every second
  }

  private startRiskMonitoring(): void {
    setInterval(() => {
      this.checkLiquidations();
    }, 5000); // Check every 5 seconds
  }

  private startFundingRateUpdater(): void {
    setInterval(() => {
      this.updateFundingRates();
    }, 8 * 60 * 60 * 1000); // Every 8 hours
  }

  private startGreeksCalculator(): void {
    setInterval(() => {
      this.updateOptionGreeks();
    }, 60 * 1000); // Every minute
  }

  private checkLiquidations(): void {
    for (const contract of this.contracts.values()) {
      if (contract.status !== 'open' || !contract.liquidationPrice) continue;

      const currentPrice = this.getCurrentPrice(contract.symbol);
      const shouldLiquidate = (
        (contract.side === 'long' && currentPrice <= contract.liquidationPrice) ||
        (contract.side === 'short' && currentPrice >= contract.liquidationPrice)
      );

      if (shouldLiquidate) {
        this.liquidatePosition(contract.id);
      }
    }
  }

  private async liquidatePosition(contractId: string): Promise<void> {
    const contract = this.contracts.get(contractId);
    if (!contract) return;

    const liquidationPrice = contract.liquidationPrice!;
    const liquidationValue = contract.size * liquidationPrice;

    // Update contract
    contract.status = 'liquidated';
    contract.pnl.realized = this.calculatePnL(contract, liquidationPrice, contract.size).realizedPnL;
    contract.lastUpdate = Date.now();

    this.contracts.set(contractId, contract);

    // Create liquidation event
    const liquidationEvent: LiquidationEvent = {
      contractId,
      userId: contract.userId,
      symbol: contract.symbol,
      liquidationPrice,
      liquidationValue,
      timestamp: Date.now(),
      reason: 'margin_call',
      insuranceFundImpact: liquidationValue * this.INSURANCE_FUND_RATE
    };

    this.logger.warn('Position liquidated', liquidationEvent);
    this.emit('liquidation', liquidationEvent);
  }

  private updateFundingRates(): void {
    for (const [symbol, contract] of this.perpetualContracts) {
      // Mock funding rate calculation
      const newRate = 0.0001; // Deterministic default funding rate
      contract.fundingRate = newRate;
      contract.nextFundingTime = Date.now() + contract.fundingInterval * 60 * 60 * 1000;
      
      this.perpetualContracts.set(symbol, contract);
    }
  }

  private updateOptionGreeks(): void {
    const currentTime = Date.now();
    
    for (const [symbol, option] of this.optionContracts) {
      const spotPrice = this.getCurrentPrice(option.underlying + 'USDT-PERP');
      const timeToExpiry = (option.expiryDate - currentTime) / (365 * 24 * 60 * 60 * 1000);
      
      if (timeToExpiry > 0) {
        const greeks = this.calculateOptionGreeks(symbol, spotPrice, timeToExpiry, option.impliedVolatility);
        
        option.delta = greeks.delta;
        option.gamma = greeks.gamma;
        option.theta = greeks.theta;
        option.vega = greeks.vega;
        option.rho = greeks.rho;
        
        this.optionContracts.set(symbol, option);
      }
    }
  }

  // Black-Scholes helper functions
  private calculateD1(S: number, K: number, T: number, sigma: number, r: number): number {
    return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private generateContractId(): string {
    return `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const derivativesEngine = new DerivativesEngine();

// Export utility functions
export const DerivativesUtils = {
  /**
   * Calculate Black-Scholes option price
   */
  calculateOptionPrice(
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate: number,
    optionType: 'call' | 'put'
  ): number {
    const d1 = (Math.log(spotPrice / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry) 
               / (volatility * Math.sqrt(timeToExpiry));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    if (optionType === 'call') {
      return spotPrice * this.normalCDF(d1) - strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);
    } else {
      return strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2) - spotPrice * this.normalCDF(-d1);
    }
  },

  /**
   * Calculate implied volatility using Newton-Raphson method
   */
  calculateImpliedVolatility(
    marketPrice: number,
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    riskFreeRate: number,
    optionType: 'call' | 'put'
  ): number {
    let volatility = 0.3; // Initial guess
    const tolerance = 0.0001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      const price = this.calculateOptionPrice(spotPrice, strike, timeToExpiry, volatility, riskFreeRate, optionType);
      const vega = this.calculateVega(spotPrice, strike, timeToExpiry, volatility, riskFreeRate);
      
      const diff = price - marketPrice;
      if (Math.abs(diff) < tolerance) break;
      
      volatility = volatility - diff / vega;
      volatility = Math.max(0.01, Math.min(5.0, volatility)); // Bound volatility
    }

    return volatility;
  },

  /**
   * Calculate portfolio Greeks
   */
  calculatePortfolioGreeks(positions: DerivativeContract[]): {
    totalDelta: number;
    totalGamma: number;
    totalTheta: number;
    totalVega: number;
    totalRho: number;
  } {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let totalRho = 0;

    for (const position of positions) {
      if (position.type === 'option') {
        const multiplier = position.side === 'long' ? 1 : -1;
        // Would fetch Greeks from option contract
        totalDelta += 0.5 * position.size * multiplier; // Mock values
        totalGamma += 0.1 * position.size * multiplier;
        totalTheta += -10 * position.size * multiplier;
        totalVega += 50 * position.size * multiplier;
        totalRho += 20 * position.size * multiplier;
      }
    }

    return { totalDelta, totalGamma, totalTheta, totalVega, totalRho };
  },

  normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  },

  erf(x: number): number {
    // Error function approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  },

  calculateVega(
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate: number
  ): number {
    const d1 = (Math.log(spotPrice / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry) 
               / (volatility * Math.sqrt(timeToExpiry));
    
    return spotPrice * Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI) * Math.sqrt(timeToExpiry) / 100;
  }
};