/**
 * Performance Profiler for Testing
 * Monitors and profiles system performance metrics
 */

export interface PerformanceMetrics {
  responseTime: number
  memoryUsage: number
  cpuUsage: number
  throughput: number
  errorRate: number
  timestamp: number
}

export interface APIPerformanceData {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  timestamp: number
  errorMessage?: string
}

export interface VoiceAIPerformanceData {
  responseTime: number
  accuracy: number
  confidence: number
  processingSteps: Array<{
    step: string
    duration: number
  }>
  timestamp: number
}

export interface TradingBotPerformanceData {
  executionTime: number
  signalLatency: number
  accuracy: number
  profitLoss: number
  timestamp: number
}

export class PerformanceProfiler {
  private static instance: PerformanceProfiler
  private metrics: PerformanceMetrics[] = []
  private apiMetrics: APIPerformanceData[] = []
  private voiceMetrics: VoiceAIPerformanceData[] = []
  private tradingMetrics: TradingBotPerformanceData[] = []
  private activeTimers: Map<string, number> = new Map()
  private thresholds: {
    responseTime: number
    memoryUsage: number
    errorRate: number
    voiceResponseTime: number
  } = {
    responseTime: 2000, // 2 seconds
    memoryUsage: 80, // 80%
    errorRate: 5, // 5%
    voiceResponseTime: 2000 // 2 seconds
  }

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler()
    }
    return PerformanceProfiler.instance
  }

  // Start timing operation
  startTimer(operationId: string): void {
    this.activeTimers.set(operationId, Date.now())
  }

  // End timing operation and return duration
  endTimer(operationId: string): number {
    const startTime = this.activeTimers.get(operationId)
    if (!startTime) {
      throw new Error(`Timer not found for operation: ${operationId}`)
    }
    
    const duration = Date.now() - startTime
    this.activeTimers.delete(operationId)
    return duration
  }

  // Record API performance
  recordAPIPerformance(data: Omit<APIPerformanceData, 'timestamp'>): void {
    this.apiMetrics.push({
      ...data,
      timestamp: Date.now()
    })

    // Keep only last 1000 records
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics = this.apiMetrics.slice(-1000)
    }
  }

  // Record Voice AI performance
  recordVoiceAIPerformance(data: Omit<VoiceAIPerformanceData, 'timestamp'>): void {
    this.voiceMetrics.push({
      ...data,
      timestamp: Date.now()
    })

    // Keep only last 500 records
    if (this.voiceMetrics.length > 500) {
      this.voiceMetrics = this.voiceMetrics.slice(-500)
    }
  }

  // Record trading bot performance
  recordTradingBotPerformance(data: Omit<TradingBotPerformanceData, 'timestamp'>): void {
    this.tradingMetrics.push({
      ...data,
      timestamp: Date.now()
    })

    // Keep only last 500 records
    if (this.tradingMetrics.length > 500) {
      this.tradingMetrics = this.tradingMetrics.slice(-500)
    }
  }

  // Record system metrics
  recordSystemMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    })

    // Keep only last 1000 records
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  // Measure function execution time
  async measureAsync<T>(operationName: string, fn: () => Promise<T>): Promise<{
    result: T
    duration: number
    memoryBefore: number
    memoryAfter: number
  }> {
    const memoryBefore = this.getMemoryUsage()
    const startTime = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      
      // Record the measurement
      this.recordAPIPerformance({
        endpoint: operationName,
        method: 'ASYNC',
        responseTime: duration,
        statusCode: 200
      })
      
      return {
        result,
        duration,
        memoryBefore,
        memoryAfter
      }
    } catch (error) {
      const duration = performance.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      
      // Record the error
      this.recordAPIPerformance({
        endpoint: operationName,
        method: 'ASYNC',
        responseTime: duration,
        statusCode: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  // Measure synchronous function execution
  measureSync<T>(operationName: string, fn: () => T): {
    result: T
    duration: number
    memoryBefore: number
    memoryAfter: number
  } {
    const memoryBefore = this.getMemoryUsage()
    const startTime = performance.now()
    
    try {
      const result = fn()
      const duration = performance.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      
      // Record the measurement
      this.recordAPIPerformance({
        endpoint: operationName,
        method: 'SYNC',
        responseTime: duration,
        statusCode: 200
      })
      
      return {
        result,
        duration,
        memoryBefore,
        memoryAfter
      }
    } catch (error) {
      const duration = performance.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      
      // Record the error
      this.recordAPIPerformance({
        endpoint: operationName,
        method: 'SYNC',
        responseTime: duration,
        statusCode: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  // Get current memory usage (mock implementation for browser)
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.totalJSHeapSize * 100
    }
    // Mock memory usage for testing
    return Math.random() * 100
  }

  // Get performance statistics
  getPerformanceStats(timeRange?: number): {
    api: {
      averageResponseTime: number
      errorRate: number
      throughput: number
      slowestEndpoints: Array<{ endpoint: string; avgTime: number }>
    }
    voice: {
      averageResponseTime: number
      averageAccuracy: number
      averageConfidence: number
    }
    trading: {
      averageExecutionTime: number
      averageSignalLatency: number
      averageAccuracy: number
      totalProfitLoss: number
    }
    system: {
      averageMemoryUsage: number
      peakMemoryUsage: number
      averageResponseTime: number
    }
    alerts: string[]
  } {
    const cutoffTime = timeRange ? Date.now() - timeRange : 0
    
    // Filter metrics by time range
    const recentApiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoffTime)
    const recentVoiceMetrics = this.voiceMetrics.filter(m => m.timestamp > cutoffTime)
    const recentTradingMetrics = this.tradingMetrics.filter(m => m.timestamp > cutoffTime)
    const recentSystemMetrics = this.metrics.filter(m => m.timestamp > cutoffTime)
    
    // Calculate API stats
    const apiStats = this.calculateAPIStats(recentApiMetrics)
    const voiceStats = this.calculateVoiceStats(recentVoiceMetrics)
    const tradingStats = this.calculateTradingStats(recentTradingMetrics)
    const systemStats = this.calculateSystemStats(recentSystemMetrics)
    
    // Generate alerts
    const alerts = this.generateAlerts(apiStats, voiceStats, systemStats)
    
    return {
      api: apiStats,
      voice: voiceStats,
      trading: tradingStats,
      system: systemStats,
      alerts
    }
  }

  private calculateAPIStats(metrics: APIPerformanceData[]) {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        slowestEndpoints: []
      }
    }

    const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0)
    const errorCount = metrics.filter(m => m.statusCode >= 400).length
    const endpointGroups = this.groupBy(metrics, 'endpoint')
    
    const slowestEndpoints = Object.entries(endpointGroups)
      .map(([endpoint, endpointMetrics]) => ({
        endpoint,
        avgTime: endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0) / endpointMetrics.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5)

    return {
      averageResponseTime: totalResponseTime / metrics.length,
      errorRate: (errorCount / metrics.length) * 100,
      throughput: metrics.length / (60000) * 1000, // requests per second
      slowestEndpoints
    }
  }

  private calculateVoiceStats(metrics: VoiceAIPerformanceData[]) {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        averageAccuracy: 0,
        averageConfidence: 0
      }
    }

    return {
      averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      averageAccuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
      averageConfidence: metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length
    }
  }

  private calculateTradingStats(metrics: TradingBotPerformanceData[]) {
    if (metrics.length === 0) {
      return {
        averageExecutionTime: 0,
        averageSignalLatency: 0,
        averageAccuracy: 0,
        totalProfitLoss: 0
      }
    }

    return {
      averageExecutionTime: metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length,
      averageSignalLatency: metrics.reduce((sum, m) => sum + m.signalLatency, 0) / metrics.length,
      averageAccuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
      totalProfitLoss: metrics.reduce((sum, m) => sum + m.profitLoss, 0)
    }
  }

  private calculateSystemStats(metrics: PerformanceMetrics[]) {
    if (metrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageResponseTime: 0
      }
    }

    return {
      averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
      peakMemoryUsage: Math.max(...metrics.map(m => m.memoryUsage)),
      averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
    }
  }

  private generateAlerts(apiStats: any, voiceStats: any, systemStats: any): string[] {
    const alerts: string[] = []

    // API response time alerts
    if (apiStats.averageResponseTime > this.thresholds.responseTime) {
      alerts.push(`API response time (${apiStats.averageResponseTime.toFixed(0)}ms) exceeds threshold (${this.thresholds.responseTime}ms)`)
    }

    // Error rate alerts
    if (apiStats.errorRate > this.thresholds.errorRate) {
      alerts.push(`API error rate (${apiStats.errorRate.toFixed(1)}%) exceeds threshold (${this.thresholds.errorRate}%)`)
    }

    // Memory usage alerts
    if (systemStats.averageMemoryUsage > this.thresholds.memoryUsage) {
      alerts.push(`Memory usage (${systemStats.averageMemoryUsage.toFixed(1)}%) exceeds threshold (${this.thresholds.memoryUsage}%)`)
    }

    // Voice AI response time alerts
    if (voiceStats.averageResponseTime > this.thresholds.voiceResponseTime) {
      alerts.push(`Voice AI response time (${voiceStats.averageResponseTime.toFixed(0)}ms) exceeds threshold (${this.thresholds.voiceResponseTime}ms)`)
    }

    return alerts
  }

  // Helper method to group array by property
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key])
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }

  // Set performance thresholds
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = []
    this.apiMetrics = []
    this.voiceMetrics = []
    this.tradingMetrics = []
    this.activeTimers.clear()
  }

  // Export metrics for analysis
  exportMetrics(): {
    system: PerformanceMetrics[]
    api: APIPerformanceData[]
    voice: VoiceAIPerformanceData[]
    trading: TradingBotPerformanceData[]
  } {
    return {
      system: [...this.metrics],
      api: [...this.apiMetrics],
      voice: [...this.voiceMetrics],
      trading: [...this.tradingMetrics]
    }
  }

  // Generate performance report
  generateReport(timeRange?: number): string {
    const stats = this.getPerformanceStats(timeRange)
    const timeRangeStr = timeRange ? `last ${timeRange / 1000}s` : 'all time'
    
    return `
CYPHER ORDi Future V3 - Performance Report (${timeRangeStr})
================================================================

API Performance:
- Average Response Time: ${stats.api.averageResponseTime.toFixed(2)}ms
- Error Rate: ${stats.api.errorRate.toFixed(2)}%
- Throughput: ${stats.api.throughput.toFixed(2)} req/s

Voice AI Performance:
- Average Response Time: ${stats.voice.averageResponseTime.toFixed(2)}ms
- Average Accuracy: ${stats.voice.averageAccuracy.toFixed(2)}%
- Average Confidence: ${stats.voice.averageConfidence.toFixed(2)}%

Trading Bot Performance:
- Average Execution Time: ${stats.trading.averageExecutionTime.toFixed(2)}ms
- Average Signal Latency: ${stats.trading.averageSignalLatency.toFixed(2)}ms
- Average Accuracy: ${stats.trading.averageAccuracy.toFixed(2)}%
- Total P&L: ${stats.trading.totalProfitLoss.toFixed(4)} BTC

System Performance:
- Average Memory Usage: ${stats.system.averageMemoryUsage.toFixed(2)}%
- Peak Memory Usage: ${stats.system.peakMemoryUsage.toFixed(2)}%
- Average Response Time: ${stats.system.averageResponseTime.toFixed(2)}ms

${stats.alerts.length > 0 ? `\nALERTS:\n${stats.alerts.map(alert => `⚠️  ${alert}`).join('\n')}` : '\n✅ No performance alerts'}

Slowest Endpoints:
${stats.api.slowestEndpoints.map((endpoint, i) => `${i + 1}. ${endpoint.endpoint}: ${endpoint.avgTime.toFixed(2)}ms`).join('\n')}
`
  }
}

export default PerformanceProfiler.getInstance()