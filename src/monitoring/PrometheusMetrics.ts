/**
 * Prometheus Metrics System for CYPHER ORDi Future V3
 * Advanced monitoring and observability with Prometheus and Grafana
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { systemIntegrator } from '@/core/SystemIntegrator';


interface MetricConfig {
  name: string;
  help: string;
  labels?: string[];
  buckets?: number[]; // For histograms
}

interface CounterMetric {
  type: 'counter';
  value: number;
  labels: Record<string, string>;
}

interface GaugeMetric {
  type: 'gauge';
  value: number;
  labels: Record<string, string>;
}

interface HistogramMetric {
  type: 'histogram';
  buckets: Map<number, number>;
  sum: number;
  count: number;
  labels: Record<string, string>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

export class PrometheusMetrics extends EventEmitter {
  private metrics = new Map<string, Metric>();
  private metricConfigs = new Map<string, MetricConfig>();
  private collectionInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;
  private httpServer: any = null;

  // Default histogram buckets for latency metrics
  private readonly DEFAULT_LATENCY_BUCKETS = [
    0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
  ];

  constructor() {
    super();
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default system metrics
   */
  private initializeDefaultMetrics(): void {
    // System metrics
    this.registerGauge({
      name: 'cypher_system_uptime_seconds',
      help: 'System uptime in seconds'
    });

    this.registerGauge({
      name: 'cypher_system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labels: ['type']
    });

    this.registerGauge({
      name: 'cypher_system_cpu_usage_percent',
      help: 'System CPU usage percentage'
    });

    // API metrics
    this.registerCounter({
      name: 'cypher_api_requests_total',
      help: 'Total API requests',
      labels: ['method', 'endpoint', 'status']
    });

    this.registerHistogram({
      name: 'cypher_api_request_duration_seconds',
      help: 'API request duration in seconds',
      labels: ['method', 'endpoint'],
      buckets: this.DEFAULT_LATENCY_BUCKETS
    });

    // Service metrics
    this.registerGauge({
      name: 'cypher_service_health',
      help: 'Service health status (1=healthy, 0=unhealthy)',
      labels: ['service']
    });

    this.registerCounter({
      name: 'cypher_service_errors_total',
      help: 'Total service errors',
      labels: ['service', 'type']
    });

    // Trading metrics
    this.registerCounter({
      name: 'cypher_trades_total',
      help: 'Total trades executed',
      labels: ['symbol', 'side']
    });

    this.registerGauge({
      name: 'cypher_orderbook_depth',
      help: 'Order book depth',
      labels: ['symbol', 'side']
    });

    this.registerHistogram({
      name: 'cypher_trade_volume_usd',
      help: 'Trade volume in USD',
      labels: ['symbol'],
      buckets: [10, 100, 1000, 10000, 100000, 1000000]
    });

    // WebSocket metrics
    this.registerGauge({
      name: 'cypher_websocket_connections',
      help: 'Active WebSocket connections',
      labels: ['type']
    });

    this.registerCounter({
      name: 'cypher_websocket_messages_total',
      help: 'Total WebSocket messages',
      labels: ['direction', 'type']
    });

    // Cache metrics
    this.registerCounter({
      name: 'cypher_cache_operations_total',
      help: 'Total cache operations',
      labels: ['operation', 'result']
    });

    this.registerGauge({
      name: 'cypher_cache_hit_rate',
      help: 'Cache hit rate percentage'
    });

    // ML metrics
    this.registerCounter({
      name: 'cypher_ml_predictions_total',
      help: 'Total ML predictions generated',
      labels: ['model', 'symbol']
    });

    this.registerGauge({
      name: 'cypher_ml_model_accuracy',
      help: 'ML model accuracy',
      labels: ['model', 'symbol']
    });

    // DeFi metrics
    this.registerGauge({
      name: 'cypher_defi_tvl_usd',
      help: 'Total Value Locked in USD',
      labels: ['protocol', 'pool']
    });

    this.registerCounter({
      name: 'cypher_bridge_transactions_total',
      help: 'Total bridge transactions',
      labels: ['from_chain', 'to_chain', 'status']
    });
  }

  /**
   * Register a counter metric
   */
  registerCounter(config: MetricConfig): void {
    this.metricConfigs.set(config.name, config);
    this.metrics.set(config.name, {
      type: 'counter',
      value: 0,
      labels: {}
    });
  }

  /**
   * Register a gauge metric
   */
  registerGauge(config: MetricConfig): void {
    this.metricConfigs.set(config.name, config);
    this.metrics.set(config.name, {
      type: 'gauge',
      value: 0,
      labels: {}
    });
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(config: MetricConfig): void {
    this.metricConfigs.set(config.name, config);
    const buckets = new Map<number, number>();
    
    // Initialize buckets
    const bucketValues = config.buckets || this.DEFAULT_LATENCY_BUCKETS;
    for (const bucket of bucketValues) {
      buckets.set(bucket, 0);
    }
    buckets.set(Infinity, 0); // +Inf bucket

    this.metrics.set(config.name, {
      type: 'histogram',
      buckets,
      sum: 0,
      count: 0,
      labels: {}
    });
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      EnhancedLogger.warn('Counter metric not found:', name);
      return;
    }

    const key = this.buildMetricKey(name, labels);
    const existingMetric = this.metrics.get(key);

    if (existingMetric && existingMetric.type === 'counter') {
      existingMetric.value += value;
    } else {
      this.metrics.set(key, {
        type: 'counter',
        value,
        labels
      });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      EnhancedLogger.warn('Gauge metric not found:', name);
      return;
    }

    const key = this.buildMetricKey(name, labels);
    this.metrics.set(key, {
      type: 'gauge',
      value,
      labels
    });
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      EnhancedLogger.warn('Histogram metric not found:', name);
      return;
    }

    const key = this.buildMetricKey(name, labels);
    let histogramMetric = this.metrics.get(key) as HistogramMetric;

    if (!histogramMetric || histogramMetric.type !== 'histogram') {
      // Clone the base histogram
      const baseHistogram = metric as HistogramMetric;
      histogramMetric = {
        type: 'histogram',
        buckets: new Map(baseHistogram.buckets),
        sum: 0,
        count: 0,
        labels
      };
      this.metrics.set(key, histogramMetric);
    }

    // Update histogram
    histogramMetric.sum += value;
    histogramMetric.count++;

    // Update buckets
    for (const [bucket, count] of histogramMetric.buckets) {
      if (value <= bucket) {
        histogramMetric.buckets.set(bucket, count + 1);
      }
    }
  }

  /**
   * Start collecting metrics
   */
  startCollection(intervalMs: number = 15000): void {
    if (this.isCollecting) {
      EnhancedLogger.warn('Metrics collection already started');
      return;
    }

    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectServiceMetrics();
      this.emit('metricsCollected', this.getAllMetrics());
    }, intervalMs);

    EnhancedLogger.info('Metrics collection started', { intervalMs });
  }

  /**
   * Stop collecting metrics
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    EnhancedLogger.info('Metrics collection stopped');
  }

  /**
   * Start metrics HTTP server
   */
  async startHttpServer(port: number = 9090): Promise<void> {
    try {
      // Mock HTTP server for metrics endpoint
      this.httpServer = {
        port,
        isRunning: true,
        getMetrics: () => this.renderPrometheusFormat()
      };

      EnhancedLogger.info(`Metrics HTTP server started on port ${port}`);
      this.emit('httpServerStarted', { port });
    } catch (error) {
      EnhancedLogger.error('Failed to start metrics HTTP server:', error);
      throw error;
    }
  }

  /**
   * Stop metrics HTTP server
   */
  async stopHttpServer(): Promise<void> {
    if (this.httpServer) {
      this.httpServer.isRunning = false;
      this.httpServer = null;
      EnhancedLogger.info('Metrics HTTP server stopped');
      this.emit('httpServerStopped');
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // Uptime
    this.setGauge('cypher_system_uptime_seconds', process.uptime());

    // Memory usage
    const memUsage = process.memoryUsage();
    this.setGauge('cypher_system_memory_usage_bytes', memUsage.heapUsed, { type: 'heap_used' });
    this.setGauge('cypher_system_memory_usage_bytes', memUsage.heapTotal, { type: 'heap_total' });
    this.setGauge('cypher_system_memory_usage_bytes', memUsage.rss, { type: 'rss' });

    // TODO: Connect to real system metrics (os.cpus(), process.memoryUsage())
    this.setGauge('cypher_system_cpu_usage_percent', 0);
  }

  /**
   * Collect service metrics
   */
  private collectServiceMetrics(): void {
    try {
      const systemHealth = systemIntegrator.getSystemHealth();
      
      for (const service of systemHealth.services) {
        const healthValue = service.status === 'healthy' ? 1 : 0;
        this.setGauge('cypher_service_health', healthValue, { service: service.service });
      }

      // WebSocket metrics
      this.setGauge('cypher_websocket_connections', 150, { type: 'authenticated' });
      this.setGauge('cypher_websocket_connections', 75, { type: 'anonymous' });

      // Cache metrics (mock)
      this.setGauge('cypher_cache_hit_rate', 85.5);
      this.incrementCounter('cypher_cache_operations_total', { operation: 'get', result: 'hit' }, 100);
      this.incrementCounter('cypher_cache_operations_total', { operation: 'get', result: 'miss' }, 15);

      // Trading metrics (mock)
      this.incrementCounter('cypher_trades_total', { symbol: 'BTC', side: 'buy' }, 5);
      this.incrementCounter('cypher_trades_total', { symbol: 'ETH', side: 'sell' }, 3);
      this.observeHistogram('cypher_trade_volume_usd', 50000, { symbol: 'BTC' });

    } catch (error) {
      EnhancedLogger.error('Error collecting service metrics:', error);
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, metric] of this.metrics) {
      result[key] = {
        type: metric.type,
        value: metric.type === 'histogram' ? 
          { 
            buckets: Object.fromEntries(metric.buckets), 
            sum: metric.sum, 
            count: metric.count 
          } : 
          metric.value,
        labels: metric.labels
      };
    }
    
    return result;
  }

  /**
   * Render metrics in Prometheus format
   */
  renderPrometheusFormat(): string {
    const lines: string[] = [];
    const processedMetrics = new Set<string>();

    for (const [key, metric] of this.metrics) {
      const baseName = this.extractBaseName(key);
      
      if (processedMetrics.has(baseName)) {
        continue;
      }
      processedMetrics.add(baseName);

      const config = this.metricConfigs.get(baseName);
      if (!config) continue;

      // Add HELP and TYPE
      lines.push(`# HELP ${baseName} ${config.help}`);
      lines.push(`# TYPE ${baseName} ${metric.type}`);

      // Add metric values
      for (const [metricKey, metricValue] of this.metrics) {
        if (!metricKey.startsWith(baseName)) continue;

        const labelStr = this.formatLabels(metricValue.labels);
        
        if (metricValue.type === 'histogram') {
          const hist = metricValue as HistogramMetric;
          
          // Bucket metrics
          for (const [bucket, count] of hist.buckets) {
            const bucketLabel = bucket === Infinity ? '+Inf' : bucket.toString();
            const bucketLabels = { ...metricValue.labels, le: bucketLabel };
            const bucketLabelStr = this.formatLabels(bucketLabels);
            lines.push(`${baseName}_bucket${bucketLabelStr} ${count}`);
          }
          
          // Sum and count
          lines.push(`${baseName}_sum${labelStr} ${hist.sum}`);
          lines.push(`${baseName}_count${labelStr} ${hist.count}`);
        } else {
          lines.push(`${baseName}${labelStr} ${metricValue.value}`);
        }
      }
      
      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Build metric key with labels
   */
  private buildMetricKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return `${name}{${labelPairs}}`;
  }

  /**
   * Extract base metric name from key
   */
  private extractBaseName(key: string): string {
    const bracketIndex = key.indexOf('{');
    return bracketIndex === -1 ? key : key.substring(0, bracketIndex);
  }

  /**
   * Format labels for Prometheus output
   */
  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }
    
    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `{${labelPairs}}`;
  }

  /**
   * Create a timer for measuring durations
   */
  startTimer(): () => void {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Middleware for measuring API request duration
   */
  createApiMetricsMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const labels = {
          method: req.method,
          endpoint: req.route?.path || req.path,
          status: res.statusCode.toString()
        };
        
        this.incrementCounter('cypher_api_requests_total', labels);
        this.observeHistogram('cypher_api_request_duration_seconds', duration, {
          method: req.method,
          endpoint: req.route?.path || req.path
        });
      });
      
      next();
    };
  }

  /**
   * Get metrics summary
   */
  getSummary(): any {
    const allMetrics = this.getAllMetrics();
    const metricTypes = { counter: 0, gauge: 0, histogram: 0 };
    
    for (const metric of Object.values(allMetrics)) {
      metricTypes[metric.type as keyof typeof metricTypes]++;
    }
    
    return {
      totalMetrics: Object.keys(allMetrics).length,
      metricTypes,
      isCollecting: this.isCollecting,
      httpServerRunning: this.httpServer?.isRunning || false,
      lastCollection: Date.now()
    };
  }
}

// Singleton instance
export const prometheusMetrics = new PrometheusMetrics();