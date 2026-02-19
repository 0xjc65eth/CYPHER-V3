import { logger } from '@/lib/enhanced-logger'

export interface FeatureFlag {
  name: string
  enabled: boolean
  fallbackValue?: any
  dependencies?: string[]
  timeout?: number
}

export interface ServiceAvailability {
  service: string
  available: boolean
  lastChecked: string
  responseTime?: number
  errorCount: number
  consecutiveFailures: number
}

class GracefulDegradationManager {
  private features: Map<string, FeatureFlag> = new Map()
  private services: Map<string, ServiceAvailability> = new Map()
  private circuitBreakers: Map<string, {
    isOpen: boolean
    failureCount: number
    lastFailure: number
    timeout: number
  }> = new Map()

  private readonly DEFAULT_TIMEOUT = 5000
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000

  constructor() {
    this.initializeDefaultFeatures()
    this.startHealthChecks()
  }

  /**
   * Initialize default features with fallback configurations
   */
  private initializeDefaultFeatures(): void {
    const defaultFeatures: FeatureFlag[] = [
      {
        name: 'real-time-data',
        enabled: true,
        fallbackValue: 'cached-data',
        dependencies: ['websocket', 'api'],
        timeout: 3000
      },
      {
        name: 'advanced-charts',
        enabled: true,
        fallbackValue: 'basic-charts',
        dependencies: ['charting-library'],
        timeout: 2000
      },
      {
        name: 'wallet-integration',
        enabled: true,
        fallbackValue: 'read-only-mode',
        dependencies: ['wallet-provider'],
        timeout: 5000
      },
      {
        name: 'notifications',
        enabled: true,
        fallbackValue: 'basic-alerts',
        dependencies: ['notification-service'],
        timeout: 1000
      },
      {
        name: 'analytics',
        enabled: true,
        fallbackValue: null,
        dependencies: ['analytics-service'],
        timeout: 2000
      },
      {
        name: 'auto-refresh',
        enabled: true,
        fallbackValue: 'manual-refresh',
        dependencies: ['background-sync'],
        timeout: 1000
      }
    ]

    defaultFeatures.forEach(feature => {
      this.features.set(feature.name, feature)
    })

    logger.info('Graceful degradation initialized with default features', {
      featureCount: defaultFeatures.length
    })
  }

  /**
   * Check if a feature is available
   */
  isFeatureAvailable(featureName: string): boolean {
    const feature = this.features.get(featureName)
    if (!feature) return false

    // Check if feature is globally disabled
    if (!feature.enabled) return false

    // Check dependencies
    if (feature.dependencies) {
      for (const dependency of feature.dependencies) {
        if (!this.isServiceAvailable(dependency)) {
          logger.warn('Feature unavailable due to dependency', {
            feature: featureName,
            dependency,
            fallback: feature.fallbackValue
          })
          return false
        }
      }
    }

    return true
  }

  /**
   * Get feature value with fallback
   */
  getFeatureValue(featureName: string): any {
    const feature = this.features.get(featureName)
    if (!feature) return null

    if (this.isFeatureAvailable(featureName)) {
      return true // Feature is available
    }

    // Return fallback value
    logger.info('Using fallback for feature', {
      feature: featureName,
      fallback: feature.fallbackValue
    })
    return feature.fallbackValue
  }

  /**
   * Check if a service is available
   */
  isServiceAvailable(serviceName: string): boolean {
    const service = this.services.get(serviceName)
    if (!service) {
      // Assume service is available if not tracked
      return true
    }

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName)
    if (circuitBreaker?.isOpen) {
      const now = Date.now()
      if (now - circuitBreaker.lastFailure < circuitBreaker.timeout) {
        return false
      } else {
        // Try to close circuit breaker
        circuitBreaker.isOpen = false
        circuitBreaker.failureCount = 0
        logger.info('Circuit breaker reset', { service: serviceName })
      }
    }

    return service.available
  }

  /**
   * Register a service for monitoring
   */
  registerService(serviceName: string, healthCheckUrl?: string): void {
    const service: ServiceAvailability = {
      service: serviceName,
      available: true,
      lastChecked: new Date().toISOString(),
      errorCount: 0,
      consecutiveFailures: 0
    }

    this.services.set(serviceName, service)

    // Initialize circuit breaker
    this.circuitBreakers.set(serviceName, {
      isOpen: false,
      failureCount: 0,
      lastFailure: 0,
      timeout: this.CIRCUIT_BREAKER_TIMEOUT
    })

    logger.info('Service registered for monitoring', {
      service: serviceName,
      healthCheck: !!healthCheckUrl
    })
  }

  /**
   * Report service failure
   */
  reportServiceFailure(serviceName: string, error?: any): void {
    const service = this.services.get(serviceName)
    if (!service) {
      this.registerService(serviceName)
      return this.reportServiceFailure(serviceName, error)
    }

    service.errorCount++
    service.consecutiveFailures++
    service.lastChecked = new Date().toISOString()

    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName)
    if (circuitBreaker) {
      circuitBreaker.failureCount++
      circuitBreaker.lastFailure = Date.now()

      if (circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true
        service.available = false
        
        logger.error('Circuit breaker opened due to failures', {
          service: serviceName,
          failures: circuitBreaker.failureCount,
          error: error?.message
        })
      }
    }

    // Disable related features
    this.disableDependentFeatures(serviceName)

    logger.warn('Service failure reported', {
      service: serviceName,
      consecutiveFailures: service.consecutiveFailures,
      totalErrors: service.errorCount,
      error: error?.message
    })
  }

  /**
   * Report service success
   */
  reportServiceSuccess(serviceName: string, responseTime?: number): void {
    const service = this.services.get(serviceName)
    if (!service) {
      this.registerService(serviceName)
      return this.reportServiceSuccess(serviceName, responseTime)
    }

    service.available = true
    service.consecutiveFailures = 0
    service.lastChecked = new Date().toISOString()
    service.responseTime = responseTime

    // Reset circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceName)
    if (circuitBreaker) {
      circuitBreaker.failureCount = 0
      circuitBreaker.isOpen = false
    }

    // Re-enable related features
    this.enableDependentFeatures(serviceName)
  }

  /**
   * Disable features that depend on a failed service
   */
  private disableDependentFeatures(serviceName: string): void {
    this.features.forEach((feature, featureName) => {
      if (feature.dependencies?.includes(serviceName)) {
        logger.info('Feature disabled due to service failure', {
          feature: featureName,
          service: serviceName,
          fallback: feature.fallbackValue
        })
      }
    })
  }

  /**
   * Re-enable features when service recovers
   */
  private enableDependentFeatures(serviceName: string): void {
    this.features.forEach((feature, featureName) => {
      if (feature.dependencies?.includes(serviceName)) {
        logger.info('Feature re-enabled due to service recovery', {
          feature: featureName,
          service: serviceName
        })
      }
    })
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'critical'
    features: Array<{ name: string; status: 'available' | 'fallback' | 'disabled' }>
    services: Array<{ name: string; status: 'available' | 'unavailable'; responseTime?: number }>
  } {
    const featureStatuses = Array.from(this.features.entries()).map(([name, feature]) => ({
      name,
      status: this.isFeatureAvailable(name) 
        ? 'available' 
        : feature.fallbackValue 
          ? 'fallback' 
          : 'disabled'
    }))

    const serviceStatuses = Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      status: service.available ? 'available' : 'unavailable',
      responseTime: service.responseTime
    }))

    // Determine overall health
    const unavailableServices = serviceStatuses.filter(s => s.status === 'unavailable').length
    const disabledFeatures = featureStatuses.filter(f => f.status === 'disabled').length
    const fallbackFeatures = featureStatuses.filter(f => f.status === 'fallback').length

    let overall: 'healthy' | 'degraded' | 'critical'
    if (disabledFeatures > 0 || unavailableServices > serviceStatuses.length * 0.5) {
      overall = 'critical'
    } else if (fallbackFeatures > 0 || unavailableServices > 0) {
      overall = 'degraded'
    } else {
      overall = 'healthy'
    }

    return {
      overall,
      features: featureStatuses,
      services: serviceStatuses
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Check service health every 30 seconds
    setInterval(() => {
      this.performHealthChecks()
    }, 30000)

    // Initial health check
    setTimeout(() => this.performHealthChecks(), 5000)
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.services.keys()).map(serviceName => 
      this.checkServiceHealth(serviceName)
    )

    await Promise.allSettled(checks)
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string): Promise<void> {
    try {
      const startTime = performance.now()
      
      // Implement specific health checks based on service type
      let isHealthy = true
      
      switch (serviceName) {
        case 'websocket':
          isHealthy = this.checkWebSocketHealth()
          break
        case 'api':
          isHealthy = await this.checkApiHealth()
          break
        case 'wallet-provider':
          isHealthy = this.checkWalletProviderHealth()
          break
        case 'charting-library':
          isHealthy = this.checkChartingLibraryHealth()
          break
        default:
          // Default health check
          isHealthy = await this.performGenericHealthCheck(serviceName)
      }

      const responseTime = performance.now() - startTime

      if (isHealthy) {
        this.reportServiceSuccess(serviceName, responseTime)
      } else {
        this.reportServiceFailure(serviceName, new Error('Health check failed'))
      }
    } catch (error) {
      this.reportServiceFailure(serviceName, error)
    }
  }

  /**
   * Specific health check methods
   */
  private checkWebSocketHealth(): boolean {
    // Check if WebSocket connections are active
    return typeof WebSocket !== 'undefined'
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      // Ping a lightweight health endpoint
      const response = await fetch('/api/health/', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(2000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  private checkWalletProviderHealth(): boolean {
    // Check if wallet providers are available
    return typeof window !== 'undefined' && 
           (window as any).bitcoin !== undefined
  }

  private checkChartingLibraryHealth(): boolean {
    // Check if charting library is loaded
    return typeof window !== 'undefined' && 
           (window as any).TradingView !== undefined
  }

  private async performGenericHealthCheck(serviceName: string): Promise<boolean> {
    // Generic health check - can be overridden
    return true
  }

  /**
   * Enable/disable feature manually
   */
  setFeatureEnabled(featureName: string, enabled: boolean): void {
    const feature = this.features.get(featureName)
    if (feature) {
      feature.enabled = enabled
      logger.info('Feature manually toggled', {
        feature: featureName,
        enabled
      })
    }
  }

  /**
   * Add custom feature
   */
  addFeature(feature: FeatureFlag): void {
    this.features.set(feature.name, feature)
    logger.info('Custom feature added', {
      feature: feature.name,
      dependencies: feature.dependencies
    })
  }

  /**
   * Get degradation recommendations
   */
  getDegradationRecommendations(): Array<{
    feature: string
    recommendation: string
    priority: 'high' | 'medium' | 'low'
  }> {
    const recommendations: Array<{
      feature: string
      recommendation: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    this.features.forEach((feature, featureName) => {
      if (!this.isFeatureAvailable(featureName)) {
        recommendations.push({
          feature: featureName,
          recommendation: feature.fallbackValue 
            ? `Use ${feature.fallbackValue} instead`
            : 'Feature temporarily unavailable',
          priority: feature.fallbackValue ? 'medium' : 'high'
        })
      }
    })

    return recommendations
  }
}

// Export singleton instance
export const gracefulDegradation = new GracefulDegradationManager()

/**
 * React hook for using graceful degradation
 */
export function useGracefulDegradation(featureName: string) {
  const [isAvailable, setIsAvailable] = React.useState(
    gracefulDegradation.isFeatureAvailable(featureName)
  )
  const [fallbackValue, setFallbackValue] = React.useState(
    gracefulDegradation.getFeatureValue(featureName)
  )

  React.useEffect(() => {
    const checkAvailability = () => {
      const available = gracefulDegradation.isFeatureAvailable(featureName)
      const value = gracefulDegradation.getFeatureValue(featureName)
      
      setIsAvailable(available)
      setFallbackValue(value)
    }

    // Check initially
    checkAvailability()

    // Check periodically
    const interval = setInterval(checkAvailability, 5000)

    return () => clearInterval(interval)
  }, [featureName])

  return {
    isAvailable,
    fallbackValue,
    value: isAvailable ? true : fallbackValue
  }
}

// React import for the hook
let React: any
try {
  React = require('react')
} catch {
  // React not available
}