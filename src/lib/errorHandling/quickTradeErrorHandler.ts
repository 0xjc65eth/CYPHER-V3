// Enhanced error handling system for QuickTrade with circuit breaker and exponential backoff
interface ErrorContext {
  operation: string;
  dex?: string;
  chainId?: string | number;
  attempt: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterRange: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private successes = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: CircuitBreakerConfig) {
    this.name = name;
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        console.warn(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN - operation blocked`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= 3) { // Require 3 successes to close
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        console.log(`✅ Circuit breaker ${this.name} transitioned to CLOSED`);
      }
    } else {
      this.failures = Math.max(0, this.failures - 1); // Gradual recovery
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    if (this.failures >= this.config.failureThreshold && this.state === CircuitState.CLOSED) {
      this.state = CircuitState.OPEN;
      console.warn(`🚨 Circuit breaker ${this.name} transitioned to OPEN after ${this.failures} failures`);
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.warn(`🚨 Circuit breaker ${this.name} transitioned back to OPEN`);
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime
    };
  }
}

class QuickTradeErrorHandler {
  private retryConfigs = new Map<string, RetryConfig>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorStats = new Map<string, Array<{ timestamp: number; error: string }>>();
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterRange: 0.1
  };

  constructor() {
    this.initializeConfigurations();
    this.startErrorStatsCleaner();
  }

  private initializeConfigurations() {
    // DEX-specific retry configurations
    this.retryConfigs.set('jupiter', {
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 15000,
      backoffMultiplier: 1.8,
      jitterRange: 0.15
    });

    this.retryConfigs.set('uniswap', {
      maxRetries: 4,
      baseDelay: 800,
      maxDelay: 20000,
      backoffMultiplier: 2.2,
      jitterRange: 0.12
    });

    this.retryConfigs.set('1inch', {
      maxRetries: 3,
      baseDelay: 1200,
      maxDelay: 25000,
      backoffMultiplier: 2.5,
      jitterRange: 0.08
    });

    // Initialize circuit breakers for each DEX
    const circuitConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000 // 5 minutes
    };

    this.circuitBreakers.set('jupiter', new CircuitBreaker('jupiter', circuitConfig));
    this.circuitBreakers.set('uniswap', new CircuitBreaker('uniswap', circuitConfig));
    this.circuitBreakers.set('1inch', new CircuitBreaker('1inch', { ...circuitConfig, failureThreshold: 3 }));
    this.circuitBreakers.set('orca', new CircuitBreaker('orca', circuitConfig));
    this.circuitBreakers.set('sushiswap', new CircuitBreaker('sushiswap', circuitConfig));
  }

  private startErrorStatsCleaner() {
    setInterval(() => {
      const cutoff = Date.now() - 3600000; // 1 hour
      for (const [key, errors] of this.errorStats) {
        const filtered = errors.filter(e => e.timestamp > cutoff);
        if (filtered.length === 0) {
          this.errorStats.delete(key);
        } else {
          this.errorStats.set(key, filtered);
        }
      }
    }, 300000); // Clean every 5 minutes
  }

  // Main retry method with exponential backoff
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    const config = this.getRetryConfig(context.dex);
    const circuitBreaker = this.getCircuitBreaker(context.dex);

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        context.attempt = attempt;
        
        // Execute through circuit breaker if available
        if (circuitBreaker) {
          return await circuitBreaker.execute(operation);
        } else {
          return await operation();
        }
      } catch (error) {
        this.recordError(context, error as Error);

        // Don't retry on final attempt
        if (attempt >= config.maxRetries) {
          const enhancedError = this.enhanceError(error as Error, context);
          console.error(`🚨 Final retry failed for ${context.operation}:`, enhancedError);
          throw enhancedError;
        }

        // Don't retry certain error types
        if (this.isNonRetryableError(error as Error)) {
          const enhancedError = this.enhanceError(error as Error, context);
          console.error(`❌ Non-retryable error for ${context.operation}:`, enhancedError);
          throw enhancedError;
        }

        const delay = this.calculateDelay(attempt, config);
        console.warn(`⚠️ Retry ${attempt + 1}/${config.maxRetries} for ${context.operation} in ${delay}ms`, {
          error: (error as Error).message,
          context
        });

        await this.sleep(delay);
      }
    }

    throw new Error(`All retries exhausted for ${context.operation}`);
  }

  private getRetryConfig(dex?: string): RetryConfig {
    if (dex && this.retryConfigs.has(dex.toLowerCase())) {
      return this.retryConfigs.get(dex.toLowerCase())!;
    }
    return this.defaultRetryConfig;
  }

  private getCircuitBreaker(dex?: string): CircuitBreaker | undefined {
    if (dex && this.circuitBreakers.has(dex.toLowerCase())) {
      return this.circuitBreakers.get(dex.toLowerCase());
    }
    return undefined;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff with jitter
    const baseDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    const jitter = baseDelay * config.jitterRange * (Math.random() * 2 - 1);
    const delayWithJitter = baseDelay + jitter;
    
    return Math.min(Math.max(delayWithJitter, 0), config.maxDelay);
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /invalid.*token/i,
      /unauthorized/i,
      /forbidden/i,
      /not.*found/i,
      /bad.*request/i,
      /invalid.*signature/i,
      /insufficient.*funds/i,
      /nonce.*too.*low/i,
      /gas.*price.*too.*low/i
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  private enhanceError(error: Error, context: ErrorContext): Error {
    const enhanced = new Error();
    enhanced.name = error.name;
    enhanced.message = `${error.message} [Operation: ${context.operation}, Attempt: ${context.attempt}/${this.getRetryConfig(context.dex).maxRetries}]`;
    enhanced.stack = error.stack;
    
    // Add custom properties
    (enhanced as any).context = context;
    (enhanced as any).originalError = error;
    (enhanced as any).retryable = !this.isNonRetryableError(error);
    
    return enhanced;
  }

  private recordError(context: ErrorContext, error: Error) {
    const key = `${context.operation}:${context.dex || 'unknown'}`;
    
    if (!this.errorStats.has(key)) {
      this.errorStats.set(key, []);
    }
    
    const errors = this.errorStats.get(key)!;
    errors.push({
      timestamp: Date.now(),
      error: error.message
    });
    
    // Keep only last 50 errors per operation
    if (errors.length > 50) {
      errors.shift();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Specialized error handlers for different operations
  async executeQuoteRetrieval<T>(
    operation: () => Promise<T>,
    dex: string,
    tokenPair: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      operation: 'quote_retrieval',
      dex: dex.toLowerCase(),
      attempt: 0,
      timestamp: Date.now(),
      metadata: { tokenPair }
    });
  }

  async executeLiquidityCheck<T>(
    operation: () => Promise<T>,
    dex: string,
    chainId: string | number
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      operation: 'liquidity_check',
      dex: dex.toLowerCase(),
      chainId,
      attempt: 0,
      timestamp: Date.now()
    });
  }

  async executeGasEstimation<T>(
    operation: () => Promise<T>,
    chainId: string | number
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      operation: 'gas_estimation',
      chainId,
      attempt: 0,
      timestamp: Date.now()
    });
  }

  async executePriceQuery<T>(
    operation: () => Promise<T>,
    source: string,
    token: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      operation: 'price_query',
      dex: source.toLowerCase(),
      attempt: 0,
      timestamp: Date.now(),
      metadata: { token }
    });
  }

  // Bulk operation handler with individual error tracking
  async executeBulkOperation<T>(
    operations: Array<{
      operation: () => Promise<T>;
      context: Partial<ErrorContext>;
    }>
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const results = await Promise.allSettled(
      operations.map(({ operation, context }) =>
        this.executeWithRetry(operation, {
          operation: context.operation || 'bulk_operation',
          dex: context.dex,
          chainId: context.chainId,
          attempt: 0,
          timestamp: Date.now(),
          metadata: context.metadata
        })
      )
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { success: true, result: result.value };
      } else {
        return { success: false, error: result.reason };
      }
    });
  }

  // Error analysis and reporting
  getErrorStats(operation?: string, dex?: string): any {
    const stats: Record<string, any> = {};
    
    for (const [key, errors] of this.errorStats) {
      if (operation && !key.includes(operation)) continue;
      if (dex && !key.includes(dex.toLowerCase())) continue;
      
      const recentErrors = errors.filter(e => Date.now() - e.timestamp < 3600000); // Last hour
      
      stats[key] = {
        totalErrors: errors.length,
        recentErrors: recentErrors.length,
        errorRate: recentErrors.length / 60, // errors per minute
        lastError: errors[errors.length - 1]?.timestamp || null,
        commonErrors: this.getCommonErrors(errors)
      };
    }
    
    return stats;
  }

  private getCommonErrors(errors: Array<{ timestamp: number; error: string }>): Record<string, number> {
    const errorCounts: Record<string, number> = {};
    
    for (const { error } of errors) {
      const key = error.substring(0, 100); // Truncate for grouping
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }
    
    // Return top 5 most common errors
    return Object.fromEntries(
      Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    );
  }

  getCircuitBreakerStates(): Record<string, any> {
    const states: Record<string, any> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      states[name] = breaker.getState();
    }
    
    return states;
  }

  // Health check for error handling system
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    details: any;
  } {
    const now = Date.now();
    const recentWindow = 900000; // 15 minutes
    
    let totalRecentErrors = 0;
    let criticalOperations = 0;
    
    for (const [key, errors] of this.errorStats) {
      const recentErrors = errors.filter(e => now - e.timestamp < recentWindow);
      totalRecentErrors += recentErrors.length;
      
      if (recentErrors.length > 10) { // More than 10 errors in 15 minutes
        criticalOperations++;
      }
    }
    
    const circuitBreakerStates = this.getCircuitBreakerStates();
    const openCircuits = Object.values(circuitBreakerStates)
      .filter((state: any) => state.state === CircuitState.OPEN).length;
    
    let status: 'healthy' | 'degraded' | 'critical';
    
    if (criticalOperations > 3 || openCircuits > 2) {
      status = 'critical';
    } else if (criticalOperations > 0 || openCircuits > 0 || totalRecentErrors > 20) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return {
      status,
      details: {
        totalRecentErrors,
        criticalOperations,
        openCircuits,
        circuitBreakerStates,
        errorRatePerMinute: totalRecentErrors / 15
      }
    };
  }

  // Graceful degradation helpers
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await this.executeWithRetry(primaryOperation, context);
    } catch (primaryError) {
      console.warn(`🔄 Primary operation failed, trying fallback for ${context.operation}:`, primaryError);
      
      try {
        return await this.executeWithRetry(fallbackOperation, {
          ...context,
          operation: `${context.operation}_fallback`
        });
      } catch (fallbackError) {
        console.error(`❌ Both primary and fallback failed for ${context.operation}`);
        throw primaryError; // Throw original error
      }
    }
  }
}

// Export singleton instance
export const quickTradeErrorHandler = new QuickTradeErrorHandler();

// Export types and enums
export type { ErrorContext, RetryConfig, CircuitBreakerConfig };
export { CircuitState, QuickTradeErrorHandler };