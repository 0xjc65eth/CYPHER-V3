export { ArbitrageEngine } from './ArbitrageEngine';
export { RiskManager } from './RiskManager';
export { SecurityManager } from './SecurityManager';

export {
  ExchangeFactory,
  ExchangeConnector,
  BinanceConnector,
  CoinbaseConnector,
  KrakenConnector,
  OKXConnector,
  CoinAPIConnector,
  exchangeUtils
} from './exchanges';

export * from './types';

// Main arbitrage system configuration and initialization
import { ArbitrageEngine, ArbitrageConfig } from './ArbitrageEngine';
import { ExchangeFactory, ExchangeCredentials } from './exchanges';
import { logger } from './utils/logger';

export interface ArbitrageSystemOptions {
  config: ArbitrageConfig;
  credentials: ExchangeCredentials;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableBacktesting?: boolean;
}

export class ArbitrageSystem {
  private engine: ArbitrageEngine | null = null;
  private options: ArbitrageSystemOptions;
  private isInitialized: boolean = false;

  constructor(options: ArbitrageSystemOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing CYPHER Arbitrage System...');

      // Create exchange connectors
      const connectors = ExchangeFactory.createMultipleExchanges(this.options.credentials);
      
      if (connectors.length === 0) {
        throw new Error('No exchange connectors could be created. Please check your credentials.');
      }

      logger.info(`Created ${connectors.length} exchange connectors`);

      // Create arbitrage engine
      this.engine = new ArbitrageEngine(this.options.config, connectors);

      // Set up system-wide event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('CYPHER Arbitrage System initialized successfully');

    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize arbitrage system:');
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.engine) return;

    // Log all opportunities
    this.engine.on('opportunityFound', (opportunity) => {
      if (this.options.enableLogging) {
        logger.info(`Arbitrage opportunity found: ${opportunity.pair} - ${opportunity.spreadPercentage.toFixed(3)}%`);
      }
    });

    // Log executions
    this.engine.on('executionSuccess', (data) => {
      if (this.options.enableLogging) {
        logger.info(`Arbitrage executed successfully: ${data.opportunity.id}`);
      }
    });

    this.engine.on('executionError', (data) => {
      logger.error(`Arbitrage execution failed: ${data.opportunity.id}`, data.error);
    });

    // Log system events
    this.engine.on('started', () => {
      logger.info('Arbitrage engine started');
    });

    this.engine.on('stopped', () => {
      logger.info('Arbitrage engine stopped');
    });

    this.engine.on('exchangeError', (data) => {
      logger.error(`Exchange ${data.exchange} error:`, data.error);
    });
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System must be initialized before starting');
    }

    if (!this.engine) {
      throw new Error('Engine not available');
    }

    await this.engine.start();
  }

  async stop(): Promise<void> {
    if (this.engine) {
      await this.engine.stop();
    }
  }

  getEngine(): ArbitrageEngine | null {
    return this.engine;
  }

  isRunning(): boolean {
    return this.engine?.isRunning || false;
  }

  getStatus(): any {
    if (!this.engine) {
      return {
        initialized: this.isInitialized,
        running: false,
        error: 'Engine not available'
      };
    }

    return {
      initialized: this.isInitialized,
      running: this.isRunning(),
      status: this.engine.getSystemStatus(),
      options: this.options
    };
  }

  updateConfig(newConfig: Partial<ArbitrageConfig>): void {
    if (this.engine) {
      this.engine.updateConfig(newConfig);
    }
    
    this.options.config = { ...this.options.config, ...newConfig };
  }

  // Utility methods
  static createDefaultConfig(): ArbitrageConfig {
    return {
      minSpreadPercentage: 0.5,
      maxPositionSize: 1000,
      enabledExchanges: ['binance', 'coinbase', 'kraken'],
      enabledPairs: ['BTC/USDT', 'ETH/USDT', 'BTC/USD', 'ETH/USD'],
      autoExecute: false,
      riskLevel: 'MODERATE',
      latencyThreshold: 1000
    };
  }

  static validateCredentials(credentials: ExchangeCredentials): boolean {
    const hasValidCredentials = 
      (credentials.binance?.apiKey && credentials.binance?.apiSecret) ||
      (credentials.coinbase?.apiKey && credentials.coinbase?.apiSecret && credentials.coinbase?.passphrase) ||
      (credentials.kraken?.apiKey && credentials.kraken?.apiSecret) ||
      (credentials.okx?.apiKey && credentials.okx?.apiSecret && credentials.okx?.passphrase) ||
      (credentials.coinapi?.apiKey);

    return !!hasValidCredentials;
  }

  static getSupportedExchanges(): string[] {
    return ExchangeFactory.getSupportedExchanges();
  }

  static async testConnection(credentials: ExchangeCredentials): Promise<{
    exchange: string;
    connected: boolean;
    error?: string;
  }[]> {
    const results: Array<{
      exchange: string;
      connected: boolean;
      error?: string;
    }> = [];

    const connectors = ExchangeFactory.createMultipleExchanges(credentials);

    for (const connector of connectors) {
      try {
        await connector.connect();
        await connector.disconnect();
        
        results.push({
          exchange: connector.getName(),
          connected: true
        });
      } catch (error: any) {
        results.push({
          exchange: connector.getName(),
          connected: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Export convenience functions
export async function createArbitrageSystem(
  config: Partial<ArbitrageConfig> = {},
  credentials: ExchangeCredentials
): Promise<ArbitrageSystem> {
  const fullConfig = {
    ...ArbitrageSystem.createDefaultConfig(),
    ...config
  };

  const system = new ArbitrageSystem({
    config: fullConfig,
    credentials,
    enableLogging: true,
    enableMetrics: true
  });

  await system.initialize();
  return system;
}

export async function quickStart(credentials: ExchangeCredentials): Promise<ArbitrageSystem> {
  const system = await createArbitrageSystem({}, credentials);
  await system.start();
  return system;
}

export default ArbitrageSystem;