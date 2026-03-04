import { EventEmitter } from 'events';
import { ExchangeConnector } from './exchanges/ExchangeConnector';
import { RiskManager } from './RiskManager';
import { SecurityManager } from './SecurityManager';
import { logger } from './utils/logger';

export interface ArbitrageOpportunity {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercentage: number;
  estimatedProfit: number;
  profitPercentage: number;
  volume: number;
  timestamp: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  executionTime: number;
  confidence: number;
}

export interface ArbitrageConfig {
  minSpreadPercentage: number;
  maxPositionSize: number;
  enabledExchanges: string[];
  enabledPairs: string[];
  autoExecute: boolean;
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  latencyThreshold: number;
}

export class ArbitrageEngine extends EventEmitter {
  public isRunning = false;
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private exchangeConnectors: Map<string, ExchangeConnector> = new Map();
  private riskManager: RiskManager;
  private securityManager: SecurityManager;
  private priceData: Map<string, Map<string, number>> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  
  constructor(
    private config: ArbitrageConfig,
    exchanges: ExchangeConnector[]
  ) {
    super();
    this.riskManager = new RiskManager(config);
    this.securityManager = new SecurityManager();
    
    // Initialize exchange connectors
    exchanges.forEach(exchange => {
      this.exchangeConnectors.set(exchange.getName(), exchange);
      this.priceData.set(exchange.getName(), new Map());
    });
    
    this.setupEventListeners();
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting arbitrage engine...');
      
      // Initialize security checks
      await this.securityManager.initialize();
      
      // Connect to all exchanges
      const connectionPromises = Array.from(this.exchangeConnectors.values()).map(
        exchange => exchange.connect()
      );
      
      await Promise.all(connectionPromises);
      
      // Subscribe to price feeds
      this.subscribeToDataFeeds();
      
      this.isRunning = true;
      this.emit('started');
      
      logger.info('Arbitrage engine started successfully');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to start arbitrage engine:');
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping arbitrage engine...');
      
      this.isRunning = false;
      
      // Disconnect from all exchanges
      const disconnectionPromises = Array.from(this.exchangeConnectors.values()).map(
        exchange => exchange.disconnect()
      );
      
      await Promise.all(disconnectionPromises);
      
      this.opportunities.clear();
      this.priceData.clear();
      
      this.emit('stopped');
      
      logger.info('Arbitrage engine stopped');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error stopping arbitrage engine:');
    }
  }

  private setupEventListeners(): void {
    // Listen to price updates from all exchanges
    this.exchangeConnectors.forEach((exchange, name) => {
      exchange.on('priceUpdate', (data) => {
        this.handlePriceUpdate(name, data);
      });
      
      exchange.on('error', (error) => {
        logger.error(`Exchange ${name} error:`, error);
        this.emit('exchangeError', { exchange: name, error });
      });
    });
  }

  private subscribeToDataFeeds(): void {
    this.config.enabledPairs.forEach(pair => {
      this.exchangeConnectors.forEach((exchange, name) => {
        if (this.config.enabledExchanges.includes(name)) {
          exchange.subscribeToPriceUpdates(pair);
        }
      });
    });
  }

  private handlePriceUpdate(exchangeName: string, data: any): void {
    if (!this.isRunning) return;
    
    try {
      const { symbol, price, timestamp } = data;
      
      // Store price data
      const exchangePrices = this.priceData.get(exchangeName);
      if (exchangePrices) {
        exchangePrices.set(symbol, price);
        this.lastUpdate.set(`${exchangeName}_${symbol}`, timestamp);
      }
      
      // Check for arbitrage opportunities
      this.scanForOpportunities(symbol);
      
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Error handling price update:');
    }
  }

  private scanForOpportunities(symbol: string): void {
    const exchanges = Array.from(this.exchangeConnectors.keys()).filter(
      exchange => this.config.enabledExchanges.includes(exchange)
    );
    
    // Compare prices across all exchange pairs
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const buyExchange = exchanges[i];
        const sellExchange = exchanges[j];
        
        this.checkArbitrageOpportunity(symbol, buyExchange, sellExchange);
        this.checkArbitrageOpportunity(symbol, sellExchange, buyExchange);
      }
    }
  }

  private checkArbitrageOpportunity(
    symbol: string,
    buyExchange: string,
    sellExchange: string
  ): void {
    const buyPrices = this.priceData.get(buyExchange);
    const sellPrices = this.priceData.get(sellExchange);
    
    if (!buyPrices || !sellPrices) return;
    
    const buyPrice = buyPrices.get(symbol);
    const sellPrice = sellPrices.get(symbol);
    
    if (!buyPrice || !sellPrice) return;
    
    // Check data freshness
    const buyUpdateTime = this.lastUpdate.get(`${buyExchange}_${symbol}`) || 0;
    const sellUpdateTime = this.lastUpdate.get(`${sellExchange}_${symbol}`) || 0;
    const now = Date.now();
    
    if (now - buyUpdateTime > this.config.latencyThreshold ||
        now - sellUpdateTime > this.config.latencyThreshold) {
      return; // Data too old
    }
    
    const spread = sellPrice - buyPrice;
    const spreadPercentage = (spread / buyPrice) * 100;
    
    // Check if spread meets minimum threshold
    if (spreadPercentage < this.config.minSpreadPercentage) return;
    
    // Calculate potential profit
    const positionSize = this.riskManager.calculatePositionSize(symbol, buyPrice);
    const grossProfit = spread * positionSize;
    
    // Account for fees (use default taker fee estimate for sync calculation)
    const defaultFee = 0.001; // 0.1% default taker fee
    const totalFees = (buyPrice * positionSize * defaultFee) + (sellPrice * positionSize * defaultFee);
    const netProfit = grossProfit - totalFees;
    
    if (netProfit <= 0) return; // Not profitable after fees
    
    const profitPercentage = (netProfit / (buyPrice * positionSize)) * 100;
    
    // Risk assessment
    const risk = this.riskManager.assessRisk(symbol, spread, positionSize);
    
    // Create opportunity
    const opportunity: ArbitrageOpportunity = {
      id: `${symbol}_${buyExchange}_${sellExchange}_${now}`,
      pair: symbol,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      spread,
      spreadPercentage,
      estimatedProfit: netProfit,
      profitPercentage,
      volume: positionSize,
      timestamp: now,
      risk,
      executionTime: this.estimateExecutionTime(buyExchange, sellExchange),
      confidence: this.calculateConfidence(symbol, spread, positionSize)
    };
    
    // Store and emit opportunity
    this.opportunities.set(opportunity.id, opportunity);
    this.emit('opportunityFound', opportunity);
    
    // Auto-execute if enabled and conditions are met
    if (this.config.autoExecute && this.shouldAutoExecute(opportunity)) {
      this.executeArbitrage(opportunity);
    }
    
    // Clean up old opportunities
    this.cleanupOldOpportunities();
  }

  private estimateExecutionTime(buyExchange: string, sellExchange: string): number {
    // Estimate based on exchange latencies and order execution times
    const buyConnector = this.exchangeConnectors.get(buyExchange);
    const sellConnector = this.exchangeConnectors.get(sellExchange);
    
    const buyLatency = buyConnector?.getAverageLatency() || 100;
    const sellLatency = sellConnector?.getAverageLatency() || 100;
    
    return Math.max(buyLatency, sellLatency) + 50; // Add buffer
  }

  private calculateConfidence(symbol: string, spread: number, volume: number): number {
    // Calculate confidence based on various factors
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for larger spreads
    confidence += Math.min(spread * 0.1, 0.3);
    
    // Increase confidence for higher volume
    confidence += Math.min(volume * 0.0001, 0.2);
    
    // Factor in historical success rate for this pair
    // (This would require historical data tracking)
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private shouldAutoExecute(opportunity: ArbitrageOpportunity): boolean {
    // Risk checks
    if (opportunity.risk === 'HIGH') return false;
    
    // Profit threshold checks
    if (opportunity.profitPercentage < this.getMinProfitThreshold()) return false;
    
    // Confidence threshold
    if (opportunity.confidence < 0.7) return false;
    
    // Position size limits
    if (opportunity.volume > this.config.maxPositionSize) return false;
    
    return this.riskManager.canExecuteTrade(opportunity);
  }

  private getMinProfitThreshold(): number {
    switch (this.config.riskLevel) {
      case 'CONSERVATIVE': return 0.5;
      case 'MODERATE': return 0.3;
      case 'AGGRESSIVE': return 0.1;
      default: return 0.3;
    }
  }

  async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<boolean> {
    try {
      logger.info(`Executing arbitrage opportunity: ${opportunity.id}`);
      
      // Security validation
      if (!await this.securityManager.validateExecution(opportunity)) {
        logger.warn(`Security validation failed for opportunity: ${opportunity.id}`);
        return false;
      }
      
      // Final risk check
      if (!this.riskManager.canExecuteTrade(opportunity)) {
        logger.warn(`Risk check failed for opportunity: ${opportunity.id}`);
        return false;
      }
      
      const buyConnector = this.exchangeConnectors.get(opportunity.buyExchange);
      const sellConnector = this.exchangeConnectors.get(opportunity.sellExchange);
      
      if (!buyConnector || !sellConnector) {
        throw new Error('Exchange connectors not found');
      }
      
      // Execute trades simultaneously
      const [buyResult, sellResult] = await Promise.all([
        buyConnector.placeBuyOrder(opportunity.pair, opportunity.volume, opportunity.buyPrice),
        sellConnector.placeSellOrder(opportunity.pair, opportunity.volume, opportunity.sellPrice)
      ]);
      
      if (buyResult.success && sellResult.success) {
        logger.info(`Successfully executed arbitrage: ${opportunity.id}`);
        this.emit('executionSuccess', {
          opportunity,
          buyOrder: buyResult,
          sellOrder: sellResult
        });
        
        // Update risk manager with executed trade
        this.riskManager.recordExecution(opportunity);
        
        return true;
      } else {
        logger.error(`Partial execution failure: ${opportunity.id}`);
        this.emit('executionPartialFailure', {
          opportunity,
          buyResult,
          sellResult
        });
        
        // Handle partial execution (cancel successful order if other failed)
        await this.handlePartialExecution(buyResult, sellResult, buyConnector, sellConnector);
        
        return false;
      }
      
    } catch (error) {
      logger.error(`Arbitrage execution failed: ${opportunity.id}`, error);
      this.emit('executionError', { opportunity, error });
      return false;
    }
  }

  private async handlePartialExecution(
    buyResult: any,
    sellResult: any,
    buyConnector: ExchangeConnector,
    sellConnector: ExchangeConnector
  ): Promise<void> {
    try {
      if (buyResult.success && !sellResult.success) {
        // Cancel buy order
        await buyConnector.cancelOrder(buyResult.orderId);
      } else if (!buyResult.success && sellResult.success) {
        // Cancel sell order
        await sellConnector.cancelOrder(sellResult.orderId);
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to handle partial execution:');
    }
  }

  private cleanupOldOpportunities(): void {
    const cutoffTime = Date.now() - 30000; // Remove opportunities older than 30 seconds
    
    for (const [id, opportunity] of this.opportunities.entries()) {
      if (opportunity.timestamp < cutoffTime) {
        this.opportunities.delete(id);
      }
    }
  }

  // Public methods
  getActiveOpportunities(): ArbitrageOpportunity[] {
    return Array.from(this.opportunities.values()).sort(
      (a, b) => b.profitPercentage - a.profitPercentage
    );
  }

  getOpportunityById(id: string): ArbitrageOpportunity | undefined {
    return this.opportunities.get(id);
  }

  updateConfig(newConfig: Partial<ArbitrageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.riskManager.updateConfig(this.config);
    this.emit('configUpdated', this.config);
  }

  getSystemStatus(): any {
    return {
      isRunning: this.isRunning,
      connectedExchanges: Array.from(this.exchangeConnectors.keys()).filter(
        name => this.exchangeConnectors.get(name)?.isConnected()
      ),
      activeOpportunities: this.opportunities.size,
      lastUpdate: Math.max(...Array.from(this.lastUpdate.values())),
      config: this.config
    };
  }
}

export default ArbitrageEngine;