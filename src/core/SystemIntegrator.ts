/**
 * System Integrator for CYPHER ORDi Future V3
 * Central orchestration of all 24 agents and microservices
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Import all agents
import { predictionEngine } from '@/services/ml/PredictionEngine';
import { orderBookEngine } from '@/services/orderbook/OrderBookEngine';
import { yieldFarmingEngine } from '@/services/yield/YieldFarmingEngine';
import { crossChainBridge } from '@/services/bridge/CrossChainBridge';
import { socialTradingPlatform } from '@/services/social/SocialTradingPlatform';
import { derivativesEngine } from '@/services/derivatives/DerivativesEngine';
import { stakingRewardsSystem } from '@/services/staking/StakingRewardsSystem';
import { newsSentimentAnalyzer } from '@/services/news/NewsSentimentAnalyzer';
import { liquidationProtectionSystem } from '@/services/protection/LiquidationProtectionSystem';
import { paymentGateway } from '@/services/payment/PaymentGateway';
import { gamificationSystem } from '@/services/gamification/GamificationSystem';

// System Types
export interface SystemConfiguration {
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: {
    [key: string]: boolean;
  };
  services: {
    [key: string]: ServiceConfig;
  };
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export interface ServiceConfig {
  enabled: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  healthCheck: {
    interval: number;
    timeout: number;
    retries: number;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface MonitoringConfig {
  metricsEnabled: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  alerting: {
    email: string[];
    slack?: string;
    pagerduty?: string;
  };
  healthCheckEndpoint: string;
  metricsEndpoint: string;
}

export interface SecurityConfig {
  authentication: {
    jwtSecret: string;
    sessionTimeout: number;
    maxSessions: number;
  };
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
  };
  rateLimit: {
    global: {
      maxRequests: number;
      windowMs: number;
    };
    perUser: {
      maxRequests: number;
      windowMs: number;
    };
  };
  whitelist: string[];
  blacklist: string[];
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  uptime: number;
  errorRate: number;
  responseTime: number;
  details?: any;
}

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    incoming: number;
    outgoing: number;
    connections: number;
  };
  services: {
    [key: string]: {
      requests: number;
      errors: number;
      latency: number;
    };
  };
}

export class SystemIntegrator extends EventEmitter {
  private config: SystemConfiguration;
  private services: Map<string, any> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private isInitialized: boolean = false;
  private initializationOrder: string[] = [];

  // Service registry
  private readonly SERVICE_REGISTRY = {
    // Core Trading Services
    ml: { instance: predictionEngine, name: 'Machine Learning Engine' },
    orderbook: { instance: orderBookEngine, name: 'OrderBook Engine' },
    derivatives: { instance: derivativesEngine, name: 'Derivatives Engine' },
    
    // DeFi Services
    yield: { instance: yieldFarmingEngine, name: 'Yield Farming Engine' },
    bridge: { instance: crossChainBridge, name: 'Cross-Chain Bridge' },
    staking: { instance: stakingRewardsSystem, name: 'Staking Rewards System' },
    
    // Social & Analytics
    social: { instance: socialTradingPlatform, name: 'Social Trading Platform' },
    news: { instance: newsSentimentAnalyzer, name: 'News Sentiment Analyzer' },
    gamification: { instance: gamificationSystem, name: 'Gamification System' },
    
    // Risk & Compliance
    protection: { instance: liquidationProtectionSystem, name: 'Liquidation Protection' },
    payment: { instance: paymentGateway, name: 'Payment Gateway' }
  };

  constructor(config: SystemConfiguration) {
    super();
    this.config = config;

    EnhancedLogger.info('System Integrator initialized', {
      environment: config.environment,
      version: config.version,
      services: Object.keys(this.SERVICE_REGISTRY).length
    });
  }

  /**
   * Initialize the entire system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      EnhancedLogger.warn('System already initialized');
      return;
    }

    try {
      EnhancedLogger.info('Starting system initialization...');

      // Validate configuration
      this.validateConfiguration();

      // Determine initialization order based on dependencies
      this.initializationOrder = this.determineInitializationOrder();

      // Initialize services in order
      for (const serviceId of this.initializationOrder) {
        if (this.config.services[serviceId]?.enabled) {
          await this.initializeService(serviceId);
        }
      }

      // Set up cross-service event handlers
      this.setupCrossServiceHandlers();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start metrics collection
      this.startMetricsCollection();

      this.isInitialized = true;
      EnhancedLogger.info('System initialization completed successfully');
      this.emit('systemInitialized');

    } catch (error) {
      EnhancedLogger.error('System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown(): Promise<void> {
    EnhancedLogger.info('Starting system shutdown...');

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Shutdown services in reverse order
      const shutdownOrder = [...this.initializationOrder].reverse();
      
      for (const serviceId of shutdownOrder) {
        await this.shutdownService(serviceId);
      }

      this.isInitialized = false;
      EnhancedLogger.info('System shutdown completed');
      this.emit('systemShutdown');

    } catch (error) {
      EnhancedLogger.error('System shutdown error:', error);
      throw error;
    }
  }

  /**
   * Get service instance
   */
  getService(serviceId: string): any {
    return this.services.get(serviceId);
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    uptime: number;
  } {
    const healthStatuses = Array.from(this.serviceHealth.values());
    const unhealthyCount = healthStatuses.filter(s => s.status === 'unhealthy').length;
    const degradedCount = healthStatuses.filter(s => s.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) overall = 'unhealthy';
    else if (degradedCount > 0) overall = 'degraded';

    return {
      overall,
      services: healthStatuses,
      uptime: process.uptime()
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
        cores: 8 // Mock value
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
      },
      network: {
        incoming: 0, // Would need actual network monitoring
        outgoing: 0,
        connections: 100 // Mock value
      },
      services: {}
    };

    // Add service-specific metrics
    for (const [serviceId, health] of this.serviceHealth) {
      metrics.services[serviceId] = {
        requests: 10000, // Mock values
        errors: Math.floor(health.errorRate * 10000),
        latency: health.responseTime
      };
    }

    return metrics;
  }

  /**
   * Private methods
   */

  private validateConfiguration(): void {
    // Validate required configuration
    if (!this.config.environment) {
      throw new Error('Environment not specified in configuration');
    }

    if (!this.config.version) {
      throw new Error('Version not specified in configuration');
    }

    // Validate service configurations
    for (const [serviceId, serviceConfig] of Object.entries(this.config.services)) {
      if (serviceConfig.enabled && serviceConfig.dependencies) {
        for (const dep of serviceConfig.dependencies) {
          if (!this.config.services[dep]?.enabled) {
            throw new Error(`Service ${serviceId} depends on ${dep} which is not enabled`);
          }
        }
      }
    }
  }

  private determineInitializationOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (serviceId: string) => {
      if (visited.has(serviceId)) return;
      if (visiting.has(serviceId)) {
        throw new Error(`Circular dependency detected for service: ${serviceId}`);
      }

      visiting.add(serviceId);

      const config = this.config.services[serviceId];
      if (config?.dependencies) {
        for (const dep of config.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(serviceId);
      visited.add(serviceId);
      order.push(serviceId);
    };

    // Visit all services
    for (const serviceId of Object.keys(this.SERVICE_REGISTRY)) {
      visit(serviceId);
    }

    return order;
  }

  private async initializeService(serviceId: string): Promise<void> {
    try {
      const serviceInfo = this.SERVICE_REGISTRY[serviceId as keyof typeof this.SERVICE_REGISTRY];
      if (!serviceInfo) {
        throw new Error(`Service ${serviceId} not found in registry`);
      }

      EnhancedLogger.info(`Initializing ${serviceInfo.name}...`);

      // Initialize the service
      if ((serviceInfo.instance as any).initialize) {
        await (serviceInfo.instance as any).initialize();
      }

      // Store service instance
      this.services.set(serviceId, serviceInfo.instance);

      // Initialize health tracking
      this.serviceHealth.set(serviceId, {
        service: serviceId,
        status: 'healthy',
        lastCheck: Date.now(),
        uptime: 0,
        errorRate: 0,
        responseTime: 0
      });

      EnhancedLogger.info(`${serviceInfo.name} initialized successfully`);
      this.emit('serviceInitialized', { serviceId, name: serviceInfo.name });

    } catch (error) {
      EnhancedLogger.error(`Failed to initialize service ${serviceId}:`, error);
      throw error;
    }
  }

  private async shutdownService(serviceId: string): Promise<void> {
    try {
      const service = this.services.get(serviceId);
      if (!service) return;

      const serviceInfo = this.SERVICE_REGISTRY[serviceId as keyof typeof this.SERVICE_REGISTRY];
      EnhancedLogger.info(`Shutting down ${serviceInfo.name}...`);

      // Call shutdown method if available
      if (service.shutdown) {
        await service.shutdown();
      }

      this.services.delete(serviceId);
      this.serviceHealth.delete(serviceId);

      EnhancedLogger.info(`${serviceInfo.name} shut down successfully`);
      this.emit('serviceShutdown', { serviceId, name: serviceInfo.name });

    } catch (error) {
      EnhancedLogger.error(`Failed to shutdown service ${serviceId}:`, error);
      // Continue with shutdown even if individual services fail
    }
  }

  private setupCrossServiceHandlers(): void {
    // Set up event handlers for cross-service communication

    // ML predictions trigger orderbook updates
    predictionEngine.on('predictionGenerated', (data) => {
      this.emit('mlPrediction', data);
    });

    // News sentiment affects ML predictions
    newsSentimentAnalyzer.on('sentimentShift', (data) => {
      predictionEngine.updateWithMarketData(data.asset, [data.sentiment]);
    });

    // Social trading signals
    socialTradingPlatform.on('signalPublished', (signal) => {
      this.emit('tradingSignal', signal);
    });

    // Risk events trigger protection
    derivativesEngine.on('liquidation', (event) => {
      liquidationProtectionSystem.executeProtectionAction(
        event.contractId,
        'close',
        100,
        'Auto-protection triggered'
      );
    });

    // Gamification for trading activities
    orderBookEngine.on('tradeExecuted', (trade) => {
      gamificationSystem.awardXP(trade.buyUserId, 'trade');
      gamificationSystem.awardXP(trade.sellUserId, 'trade');
    });

    // Payment completed events
    paymentGateway.on('transactionCompleted', (transaction) => {
      this.emit('paymentCompleted', transaction);
    });

    EnhancedLogger.info('Cross-service event handlers configured');
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceId, service] of this.services) {
      try {
        const startTime = Date.now();
        
        // Perform health check (would be actual health check in production)
        const isHealthy = await this.checkServiceHealth(service);
        
        const health = this.serviceHealth.get(serviceId);
        if (health) {
          health.status = isHealthy ? 'healthy' : 'unhealthy';
          health.lastCheck = Date.now();
          health.responseTime = Date.now() - startTime;
          health.uptime = process.uptime();
          
          this.serviceHealth.set(serviceId, health);
        }
      } catch (error) {
        EnhancedLogger.error(`Health check failed for ${serviceId}:`, error);
        
        const health = this.serviceHealth.get(serviceId);
        if (health) {
          health.status = 'unhealthy';
          health.errorRate = Math.min(1, health.errorRate + 0.1);
          this.serviceHealth.set(serviceId, health);
        }
      }
    }
  }

  private async checkServiceHealth(service: any): Promise<boolean> {
    // Mock health check - in production would check actual service health
    return true; // Deterministic: assume healthy
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.emit('metricsCollected', metrics);
    }, 60000); // Every minute
  }

  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
}

// Create default configuration
export const defaultSystemConfig: SystemConfiguration = {
  environment: 'production',
  version: '3.0.0',
  features: {
    trading: true,
    defi: true,
    social: true,
    analytics: true,
    gamification: true,
    mobile: true
  },
  services: {
    ml: {
      enabled: true,
      priority: 'critical',
      dependencies: [],
      healthCheck: { interval: 30000, timeout: 5000, retries: 3 }
    },
    orderbook: {
      enabled: true,
      priority: 'critical',
      dependencies: ['ml'],
      healthCheck: { interval: 10000, timeout: 3000, retries: 5 }
    },
    derivatives: {
      enabled: true,
      priority: 'high',
      dependencies: ['orderbook'],
      healthCheck: { interval: 20000, timeout: 5000, retries: 3 }
    },
    yield: {
      enabled: true,
      priority: 'high',
      dependencies: [],
      healthCheck: { interval: 60000, timeout: 10000, retries: 2 }
    },
    bridge: {
      enabled: true,
      priority: 'high',
      dependencies: [],
      healthCheck: { interval: 30000, timeout: 5000, retries: 3 }
    },
    staking: {
      enabled: true,
      priority: 'medium',
      dependencies: [],
      healthCheck: { interval: 60000, timeout: 10000, retries: 2 }
    },
    social: {
      enabled: true,
      priority: 'medium',
      dependencies: ['orderbook'],
      healthCheck: { interval: 30000, timeout: 5000, retries: 3 }
    },
    news: {
      enabled: true,
      priority: 'medium',
      dependencies: [],
      healthCheck: { interval: 300000, timeout: 15000, retries: 2 }
    },
    protection: {
      enabled: true,
      priority: 'critical',
      dependencies: ['derivatives'],
      healthCheck: { interval: 5000, timeout: 2000, retries: 5 }
    },
    payment: {
      enabled: true,
      priority: 'high',
      dependencies: [],
      healthCheck: { interval: 30000, timeout: 5000, retries: 3 }
    },
    gamification: {
      enabled: true,
      priority: 'low',
      dependencies: ['social'],
      healthCheck: { interval: 120000, timeout: 10000, retries: 2 }
    }
  },
  monitoring: {
    metricsEnabled: true,
    loggingLevel: 'info',
    alerting: {
      email: ['alerts@cypher-ordi.com'],
      slack: '#cypher-alerts',
      pagerduty: 'cypher-oncall'
    },
    healthCheckEndpoint: '/health',
    metricsEndpoint: '/metrics'
  },
  security: {
    authentication: {
      jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
      sessionTimeout: 3600000, // 1 hour
      maxSessions: 5
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyRotationInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    rateLimit: {
      global: {
        maxRequests: 10000,
        windowMs: 60000 // 1 minute
      },
      perUser: {
        maxRequests: 1000,
        windowMs: 60000 // 1 minute
      }
    },
    whitelist: [],
    blacklist: []
  }
};

// Singleton instance
export const systemIntegrator = new SystemIntegrator(defaultSystemConfig);