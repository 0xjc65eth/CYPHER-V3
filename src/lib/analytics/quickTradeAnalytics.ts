// Comprehensive performance monitoring and analytics system for QuickTrade
import { quickTradeCache } from '../cache/advancedQuickTradeCache';
import { quickTradeErrorHandler } from '../errorHandling/quickTradeErrorHandler';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
}

interface TradeAnalytics {
  tradeId: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  network: string;
  dex: string;
  gasUsed: string;
  gasCostUSD: number;
  feeAmountUSD: number;
  priceImpact: number;
  slippage: number;
  executionTime: number;
  routeHops: number;
  success: boolean;
  timestamp: number;
}

interface SystemHealthMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  activeConnections: number;
  cacheHitRate: number;
  errorRate: number;
  responseTime: number;
  throughput: number;
}

interface MarketAnalytics {
  network: string;
  dex: string;
  volume24h: number;
  trades24h: number;
  averageTradeSize: number;
  averageGasCost: number;
  successRate: number;
  popularPairs: Array<{
    pair: string;
    volume: number;
    trades: number;
  }>;
  timestamp: number;
}

interface RevenueAnalytics {
  totalRevenue: number;
  revenueByNetwork: Record<string, number>;
  revenueByDEX: Record<string, number>;
  averageFeePerTrade: number;
  profitMargin: number;
  projectedMonthly: number;
  timestamp: number;
}

class QuickTradeAnalytics {
  private metrics = new Map<string, PerformanceMetric[]>();
  private trades = new Map<string, TradeAnalytics>();
  private systemHealth = new Map<number, SystemHealthMetrics>();
  private marketData = new Map<string, MarketAnalytics>();
  private revenueData: RevenueAnalytics[] = [];

  // Performance tracking
  private performanceTimers = new Map<string, number>();
  private requestCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();

  // Real-time metrics
  private metricsBuffer = new Map<string, any[]>();
  private readonly bufferSize = 1000;
  private readonly retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.startMetricsCollection();
    this.startDataAggregation();
    this.startCleanupRoutine();
  }

  private startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect market metrics every 5 minutes
    setInterval(() => {
      this.collectMarketMetrics();
    }, 300000);

    // Calculate revenue metrics every hour
    setInterval(() => {
      this.calculateRevenueMetrics();
    }, 3600000);
  }

  private startDataAggregation() {
    // Aggregate hourly data every hour
    setInterval(() => {
      this.aggregateHourlyData();
    }, 3600000);

    // Generate daily reports every 24 hours
    setInterval(() => {
      this.generateDailyReport();
    }, 86400000);
  }

  private startCleanupRoutine() {
    // Clean old data every 6 hours
    setInterval(() => {
      this.cleanOldData();
    }, 21600000);
  }

  // Performance tracking methods
  startTimer(operation: string, tags: Record<string, string> = {}): string {
    const timerId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.performanceTimers.set(timerId, performance.now());
    
    // Track request count
    const key = `${operation}:${JSON.stringify(tags)}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    
    return timerId;
  }

  endTimer(timerId: string, operation: string, tags: Record<string, string> = {}): number {
    const startTime = this.performanceTimers.get(timerId);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.performanceTimers.delete(timerId);

    // Record performance metric
    this.recordMetric({
      name: `${operation}_duration`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags
    });

    return duration;
  }

  recordError(operation: string, error: Error, tags: Record<string, string> = {}): void {
    const key = `${operation}:error`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    this.recordMetric({
      name: `${operation}_error`,
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      tags: {
        ...tags,
        errorType: error.name,
        errorMessage: error.message.substring(0, 100)
      }
    });
  }

  recordTrade(trade: TradeAnalytics): void {
    this.trades.set(trade.tradeId, trade);
    
    // Buffer for real-time analytics
    const buffer = this.metricsBuffer.get('trades') || [];
    buffer.push(trade);
    
    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }
    
    this.metricsBuffer.set('trades', buffer);

    // Record trade metrics
    this.recordMetric({
      name: 'trade_volume',
      value: parseFloat(trade.amountIn),
      unit: 'tokens',
      timestamp: trade.timestamp,
      tags: {
        network: trade.network,
        dex: trade.dex,
        fromToken: trade.fromToken,
        toToken: trade.toToken
      }
    });

    this.recordMetric({
      name: 'trade_execution_time',
      value: trade.executionTime,
      unit: 'ms',
      timestamp: trade.timestamp,
      tags: {
        network: trade.network,
        dex: trade.dex,
        success: trade.success.toString()
      }
    });

    console.log(`📊 Trade recorded: ${trade.tradeId}`, {
      volume: parseFloat(trade.amountIn),
      dex: trade.dex,
      network: trade.network,
      success: trade.success
    });
  }

  private recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricsList = this.metrics.get(key)!;
    metricsList.push(metric);
    
    // Keep only recent metrics in memory
    if (metricsList.length > 1000) {
      metricsList.shift();
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Mock system metrics - in production, use actual system monitoring
      const healthMetrics: SystemHealthMetrics = {
        timestamp,
        cpu: 0,
        memory: 0,
        activeConnections: 0,
        cacheHitRate: await this.calculateCacheHitRate(),
        errorRate: this.calculateErrorRate(),
        responseTime: this.calculateAverageResponseTime(),
        throughput: this.calculateThroughput()
      };

      this.systemHealth.set(timestamp, healthMetrics);

      // Cache system metrics
      await quickTradeCache.cacheAnalytics('system_health', healthMetrics);
    } catch (error) {
      console.error('❌ Failed to collect system metrics:', error);
    }
  }

  private async collectMarketMetrics(): Promise<void> {
    try {
      const networks = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'solana'];
      const dexs = ['uniswap', 'sushiswap', '1inch', 'jupiter', 'orca'];

      for (const network of networks) {
        for (const dex of dexs) {
          const marketAnalytics = await this.calculateMarketAnalytics(network, dex);
          this.marketData.set(`${network}:${dex}`, marketAnalytics);
        }
      }
    } catch (error) {
      console.error('❌ Failed to collect market metrics:', error);
    }
  }

  private async calculateMarketAnalytics(network: string, dex: string): Promise<MarketAnalytics> {
    const recentTrades = this.getRecentTrades(24 * 60 * 60 * 1000); // 24 hours
    const relevantTrades = recentTrades.filter(trade => 
      trade.network === network && trade.dex === dex
    );

    const volume24h = relevantTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.amountIn), 0
    );
    
    const trades24h = relevantTrades.length;
    const averageTradeSize = volume24h / Math.max(trades24h, 1);
    const averageGasCost = relevantTrades.reduce((sum, trade) => 
      sum + trade.gasCostUSD, 0
    ) / Math.max(trades24h, 1);
    
    const successfulTrades = relevantTrades.filter(trade => trade.success);
    const successRate = (successfulTrades.length / Math.max(trades24h, 1)) * 100;

    // Calculate popular pairs
    const pairCounts = new Map<string, { volume: number; trades: number }>();
    
    relevantTrades.forEach(trade => {
      const pair = `${trade.fromToken}/${trade.toToken}`;
      const existing = pairCounts.get(pair) || { volume: 0, trades: 0 };
      pairCounts.set(pair, {
        volume: existing.volume + parseFloat(trade.amountIn),
        trades: existing.trades + 1
      });
    });

    const popularPairs = Array.from(pairCounts.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    return {
      network,
      dex,
      volume24h,
      trades24h,
      averageTradeSize,
      averageGasCost,
      successRate,
      popularPairs,
      timestamp: Date.now()
    };
  }

  private calculateRevenueMetrics(): void {
    const recentTrades = this.getRecentTrades(24 * 60 * 60 * 1000); // 24 hours
    
    const totalRevenue = recentTrades.reduce((sum, trade) => 
      sum + trade.feeAmountUSD, 0
    );

    const revenueByNetwork: Record<string, number> = {};
    const revenueByDEX: Record<string, number> = {};

    recentTrades.forEach(trade => {
      revenueByNetwork[trade.network] = (revenueByNetwork[trade.network] || 0) + trade.feeAmountUSD;
      revenueByDEX[trade.dex] = (revenueByDEX[trade.dex] || 0) + trade.feeAmountUSD;
    });

    const totalCosts = recentTrades.reduce((sum, trade) => 
      sum + trade.gasCostUSD, 0
    );

    const averageFeePerTrade = totalRevenue / Math.max(recentTrades.length, 1);
    const profitMargin = ((totalRevenue - totalCosts) / Math.max(totalRevenue, 1)) * 100;
    const projectedMonthly = totalRevenue * 30; // Daily * 30 days

    const revenueAnalytics: RevenueAnalytics = {
      totalRevenue,
      revenueByNetwork,
      revenueByDEX,
      averageFeePerTrade,
      profitMargin,
      projectedMonthly,
      timestamp: Date.now()
    };

    this.revenueData.push(revenueAnalytics);
    
    // Keep only last 30 days
    if (this.revenueData.length > 30) {
      this.revenueData.shift();
    }
  }

  // Analytics calculation methods
  private async calculateCacheHitRate(): Promise<number> {
    try {
      const cacheStats = await quickTradeCache.getStats();
      return cacheStats.hitRate * 100;
    } catch (error) {
      return 75; // Fallback value
    }
  }

  private calculateErrorRate(): number {
    const totalRequests = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private calculateAverageResponseTime(): number {
    const durationMetrics = Array.from(this.metrics.values())
      .flat()
      .filter(metric => metric.name.includes('_duration'))
      .slice(-100); // Last 100 measurements

    if (durationMetrics.length === 0) return 0;

    const avgDuration = durationMetrics.reduce((sum, metric) => sum + metric.value, 0) / durationMetrics.length;
    return avgDuration;
  }

  private calculateThroughput(): number {
    const recentTrades = this.getRecentTrades(60 * 60 * 1000); // Last hour
    return recentTrades.length; // Trades per hour
  }

  private getRecentTrades(timeWindow: number): TradeAnalytics[] {
    const cutoff = Date.now() - timeWindow;
    return Array.from(this.trades.values())
      .filter(trade => trade.timestamp > cutoff);
  }

  // Data aggregation methods
  private async aggregateHourlyData(): Promise<void> {
    try {
      const hourlyData = {
        timestamp: Date.now(),
        trades: this.getHourlyTradeStats(),
        revenue: this.getHourlyRevenueStats(),
        performance: this.getHourlyPerformanceStats(),
        errors: this.getHourlyErrorStats()
      };

      await quickTradeCache.cacheAnalytics('hourly_aggregate', hourlyData);
      
      console.log('📈 Hourly data aggregated', {
        trades: hourlyData.trades.count,
        revenue: hourlyData.revenue.total.toFixed(2),
        avgResponseTime: hourlyData.performance.avgResponseTime.toFixed(2)
      });
    } catch (error) {
      console.error('❌ Failed to aggregate hourly data:', error);
    }
  }

  private getHourlyTradeStats() {
    const recentTrades = this.getRecentTrades(60 * 60 * 1000); // Last hour
    
    return {
      count: recentTrades.length,
      volume: recentTrades.reduce((sum, trade) => sum + parseFloat(trade.amountIn), 0),
      successRate: (recentTrades.filter(t => t.success).length / Math.max(recentTrades.length, 1)) * 100,
      averageExecutionTime: recentTrades.reduce((sum, trade) => sum + trade.executionTime, 0) / Math.max(recentTrades.length, 1),
      networkDistribution: this.getDistribution(recentTrades, 'network'),
      dexDistribution: this.getDistribution(recentTrades, 'dex')
    };
  }

  private getHourlyRevenueStats() {
    const recentTrades = this.getRecentTrades(60 * 60 * 1000);
    
    return {
      total: recentTrades.reduce((sum, trade) => sum + trade.feeAmountUSD, 0),
      costs: recentTrades.reduce((sum, trade) => sum + trade.gasCostUSD, 0),
      averagePerTrade: recentTrades.reduce((sum, trade) => sum + trade.feeAmountUSD, 0) / Math.max(recentTrades.length, 1),
      profitMargin: 0 // Calculated separately
    };
  }

  private getHourlyPerformanceStats() {
    return {
      avgResponseTime: this.calculateAverageResponseTime(),
      throughput: this.calculateThroughput(),
      errorRate: this.calculateErrorRate(),
      cacheHitRate: 0 // Will be filled asynchronously
    };
  }

  private getHourlyErrorStats() {
    const errors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({ operation: key.split(':')[0], count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: errors.reduce((sum, error) => sum + error.count, 0),
      byOperation: errors.slice(0, 10) // Top 10 error sources
    };
  }

  private getDistribution(trades: TradeAnalytics[], field: keyof TradeAnalytics): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    trades.forEach(trade => {
      const value = String(trade[field]);
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return distribution;
  }

  private async generateDailyReport(): Promise<void> {
    try {
      const dailyStats = {
        date: new Date().toISOString().split('T')[0],
        trades: this.getDailyTradeStats(),
        revenue: this.getDailyRevenueStats(),
        performance: this.getDailyPerformanceStats(),
        topPairs: this.getTopTradingPairs(),
        insights: this.generateInsights()
      };

      await quickTradeCache.cacheAnalytics('daily_report', dailyStats);
      
      console.log('📊 Daily report generated', {
        trades: dailyStats.trades.count,
        revenue: dailyStats.revenue.total.toFixed(2),
        successRate: dailyStats.trades.successRate.toFixed(1)
      });
    } catch (error) {
      console.error('❌ Failed to generate daily report:', error);
    }
  }

  private getDailyTradeStats() {
    const dailyTrades = this.getRecentTrades(24 * 60 * 60 * 1000);
    
    return {
      count: dailyTrades.length,
      volume: dailyTrades.reduce((sum, trade) => sum + parseFloat(trade.amountIn), 0),
      successRate: (dailyTrades.filter(t => t.success).length / Math.max(dailyTrades.length, 1)) * 100,
      averageSize: dailyTrades.reduce((sum, trade) => sum + parseFloat(trade.amountIn), 0) / Math.max(dailyTrades.length, 1),
      networkBreakdown: this.getDistribution(dailyTrades, 'network'),
      dexBreakdown: this.getDistribution(dailyTrades, 'dex')
    };
  }

  private getDailyRevenueStats() {
    const dailyTrades = this.getRecentTrades(24 * 60 * 60 * 1000);
    const totalRevenue = dailyTrades.reduce((sum, trade) => sum + trade.feeAmountUSD, 0);
    const totalCosts = dailyTrades.reduce((sum, trade) => sum + trade.gasCostUSD, 0);
    
    return {
      total: totalRevenue,
      costs: totalCosts,
      profit: totalRevenue - totalCosts,
      profitMargin: ((totalRevenue - totalCosts) / Math.max(totalRevenue, 1)) * 100,
      projectedMonthly: totalRevenue * 30,
      projectedAnnual: totalRevenue * 365
    };
  }

  private getDailyPerformanceStats() {
    return {
      averageResponseTime: this.calculateAverageResponseTime(),
      peakThroughput: this.calculateThroughput(),
      uptime: 99.9, // Mock - would need actual monitoring
      errorRate: this.calculateErrorRate()
    };
  }

  private getTopTradingPairs(): Array<{ pair: string; volume: number; trades: number }> {
    const dailyTrades = this.getRecentTrades(24 * 60 * 60 * 1000);
    const pairStats = new Map<string, { volume: number; trades: number }>();

    dailyTrades.forEach(trade => {
      const pair = `${trade.fromToken}/${trade.toToken}`;
      const existing = pairStats.get(pair) || { volume: 0, trades: 0 };
      pairStats.set(pair, {
        volume: existing.volume + parseFloat(trade.amountIn),
        trades: existing.trades + 1
      });
    });

    return Array.from(pairStats.entries())
      .map(([pair, stats]) => ({ pair, ...stats }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 20);
  }

  private generateInsights(): string[] {
    const insights: string[] = [];
    const dailyTrades = this.getRecentTrades(24 * 60 * 60 * 1000);
    const weeklyTrades = this.getRecentTrades(7 * 24 * 60 * 60 * 1000);
    
    // Growth insights
    const dailyVolume = dailyTrades.reduce((sum, trade) => sum + parseFloat(trade.amountIn), 0);
    const weeklyAvgVolume = weeklyTrades.reduce((sum, trade) => sum + parseFloat(trade.amountIn), 0) / 7;
    
    if (dailyVolume > weeklyAvgVolume * 1.2) {
      insights.push('📈 Daily volume is 20% above weekly average');
    }
    
    // Success rate insights
    const successRate = (dailyTrades.filter(t => t.success).length / Math.max(dailyTrades.length, 1)) * 100;
    if (successRate > 95) {
      insights.push('✅ Excellent success rate above 95%');
    } else if (successRate < 90) {
      insights.push('⚠️ Success rate below 90% - investigate issues');
    }
    
    // Network insights
    const networkStats = this.getDistribution(dailyTrades, 'network');
    const dominantNetwork = Object.entries(networkStats)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (dominantNetwork && dominantNetwork[1] > dailyTrades.length * 0.5) {
      insights.push(`🌐 ${dominantNetwork[0]} dominates with ${((dominantNetwork[1] / dailyTrades.length) * 100).toFixed(1)}% of trades`);
    }

    return insights;
  }

  private cleanOldData(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    
    // Clean old trades
    for (const [id, trade] of this.trades) {
      if (trade.timestamp < cutoff) {
        this.trades.delete(id);
      }
    }
    
    // Clean old metrics
    for (const [key, metricsList] of this.metrics) {
      const filtered = metricsList.filter(metric => metric.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
    
    // Clean old system health data
    for (const [timestamp] of this.systemHealth) {
      if (timestamp < cutoff) {
        this.systemHealth.delete(timestamp);
      }
    }

    console.log('🧹 Old analytics data cleaned', {
      tradesRetained: this.trades.size,
      metricsRetained: this.metrics.size,
      healthRecordsRetained: this.systemHealth.size
    });
  }

  // Public API methods
  async getAnalyticsDashboard(): Promise<any> {
    const recentTrades = this.getRecentTrades(24 * 60 * 60 * 1000);
    const recentRevenue = this.revenueData[this.revenueData.length - 1];
    
    return {
      overview: {
        totalTrades: recentTrades.length,
        totalVolume: recentTrades.reduce((sum, trade) => sum + parseFloat(trade.amountIn), 0),
        totalRevenue: recentRevenue?.totalRevenue || 0,
        successRate: (recentTrades.filter(t => t.success).length / Math.max(recentTrades.length, 1)) * 100,
        averageResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateErrorRate()
      },
      networks: Object.keys(recentRevenue?.revenueByNetwork || {}),
      dexs: Object.keys(recentRevenue?.revenueByDEX || {}),
      topPairs: this.getTopTradingPairs().slice(0, 10),
      recentInsights: this.generateInsights()
    };
  }

  async getMetricsForPeriod(
    metricName: string, 
    startTime: number, 
    endTime: number,
    tags: Record<string, string> = {}
  ): Promise<PerformanceMetric[]> {
    const key = `${metricName}:${JSON.stringify(tags)}`;
    const metricsList = this.metrics.get(key) || [];
    
    return metricsList.filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  async getTradeHistory(
    limit: number = 100,
    filters: Partial<TradeAnalytics> = {}
  ): Promise<TradeAnalytics[]> {
    let trades = Array.from(this.trades.values());
    
    // Apply filters
    if (filters.network) {
      trades = trades.filter(trade => trade.network === filters.network);
    }
    if (filters.dex) {
      trades = trades.filter(trade => trade.dex === filters.dex);
    }
    if (filters.success !== undefined) {
      trades = trades.filter(trade => trade.success === filters.success);
    }
    
    return trades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getSystemHealth(): any {
    const latest = Array.from(this.systemHealth.values())
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return latest || {
      timestamp: Date.now(),
      cpu: 0,
      memory: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      errorRate: 0,
      responseTime: 0,
      throughput: 0
    };
  }

  getRevenueAnalytics(): RevenueAnalytics | null {
    return this.revenueData[this.revenueData.length - 1] || null;
  }

  async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      trades: Array.from(this.trades.values()),
      revenue: this.revenueData,
      systemHealth: Array.from(this.systemHealth.values()),
      marketData: Array.from(this.marketData.values())
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV export would be implemented here
      return 'CSV export not implemented yet';
    }
  }
}

// Export singleton instance
export const quickTradeAnalytics = new QuickTradeAnalytics();

// Export types
export type {
  PerformanceMetric,
  TradeAnalytics,
  SystemHealthMetrics,
  MarketAnalytics,
  RevenueAnalytics,
};
export { QuickTradeAnalytics };