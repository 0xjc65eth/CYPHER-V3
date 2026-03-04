import { logger } from '@/lib/enhanced-logger'

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percent'
  timestamp: string
  tags?: Record<string, string | number>
  threshold?: {
    warning: number
    critical: number
  }
}

export interface NavigationTiming {
  dns: number
  tcp: number
  request: number
  response: number
  dom: number
  load: number
  total: number
}

export interface ResourceTiming {
  name: string
  type: string
  duration: number
  size: number
  cached: boolean
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private isMonitoring = false
  private observer: PerformanceObserver | null = null
  private vitalsObserver: PerformanceObserver | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.init()
    }
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    this.setupPerformanceObserver()
    this.setupWebVitalsObserver()
    this.monitorPageLoad()
    this.monitorMemoryUsage()
    
    // Start monitoring
    this.isMonitoring = true
    logger.info('Performance monitoring initialized')
  }

  /**
   * Set up performance observer for various metrics
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'navigation':
              this.handleNavigationTiming(entry as PerformanceNavigationTiming)
              break
            case 'resource':
              this.handleResourceTiming(entry as PerformanceResourceTiming)
              break
            case 'paint':
              this.handlePaintTiming(entry)
              break
            case 'largest-contentful-paint':
              this.handleLCPTiming(entry)
              break
            case 'first-input':
              this.handleFIDTiming(entry)
              break
            case 'layout-shift':
              this.handleCLSTiming(entry)
              break
          }
        })
      })

      // Observe multiple entry types
      const entryTypes = [
        'navigation',
        'resource',
        'paint',
        'largest-contentful-paint',
        'first-input',
        'layout-shift'
      ]

      entryTypes.forEach(type => {
        try {
          this.observer!.observe({ entryTypes: [type] })
        } catch (error) {
          // Some entry types might not be supported
          logger.warn(`Performance observer type not supported: ${type}`)
        }
      })
    } catch (error) {
      logger.error('Failed to setup performance observer', { error })
    }
  }

  /**
   * Set up Web Vitals observer
   */
  private setupWebVitalsObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      this.vitalsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // Report Web Vitals
          this.recordMetric({
            name: `web_vitals_${entry.name}`,
            value: (entry as any).value || (entry as any).processingStart || entry.startTime,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            tags: {
              entryType: entry.entryType,
              page: window.location.pathname
            },
            threshold: this.getWebVitalThreshold(entry.name)
          })
        })
      })

      this.vitalsObserver.observe({ entryTypes: ['element'] })
    } catch (error) {
      logger.warn('Web Vitals observer not supported', { error })
    }
  }

  /**
   * Monitor page load performance
   */
  private monitorPageLoad(): void {
    if (document.readyState === 'complete') {
      this.collectPageMetrics()
    } else {
      window.addEventListener('load', () => {
        // Wait a bit for all resources to finish loading
        setTimeout(() => this.collectPageMetrics(), 1000)
      })
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory
        
        this.recordMetric({
          name: 'memory_used',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: new Date().toISOString(),
          threshold: {
            warning: memory.jsHeapSizeLimit * 0.7,
            critical: memory.jsHeapSizeLimit * 0.9
          }
        })

        this.recordMetric({
          name: 'memory_total',
          value: memory.totalJSHeapSize,
          unit: 'bytes',
          timestamp: new Date().toISOString()
        })
      }

      // Check memory usage periodically
      checkMemory()
      setInterval(checkMemory, 30000) // Every 30 seconds
    }
  }

  /**
   * Handle navigation timing
   */
  private handleNavigationTiming(entry: PerformanceNavigationTiming): void {
    const timing: NavigationTiming = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.startTime
    }

    Object.entries(timing).forEach(([key, value]) => {
      this.recordMetric({
        name: `navigation_${key}`,
        value,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {
          page: window.location.pathname,
          type: entry.type
        },
        threshold: this.getNavigationThreshold(key)
      })
    })
  }

  /**
   * Handle resource timing
   */
  private handleResourceTiming(entry: PerformanceResourceTiming): void {
    const resource: ResourceTiming = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      duration: entry.responseEnd - entry.startTime,
      size: entry.transferSize || 0,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0
    }

    this.recordMetric({
      name: 'resource_load_time',
      value: resource.duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: {
        resource: resource.name,
        type: resource.type,
        cached: resource.cached.toString(),
        page: window.location.pathname
      },
      threshold: this.getResourceThreshold(resource.type)
    })

    if (resource.size > 0) {
      this.recordMetric({
        name: 'resource_size',
        value: resource.size,
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        tags: {
          resource: resource.name,
          type: resource.type
        }
      })
    }
  }

  /**
   * Handle paint timing
   */
  private handlePaintTiming(entry: PerformanceEntry): void {
    this.recordMetric({
      name: entry.name.replace('-', '_'),
      value: entry.startTime,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: {
        page: window.location.pathname
      },
      threshold: this.getPaintThreshold(entry.name)
    })
  }

  /**
   * Handle Largest Contentful Paint
   */
  private handleLCPTiming(entry: PerformanceEntry): void {
    this.recordMetric({
      name: 'largest_contentful_paint',
      value: entry.startTime,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: {
        page: window.location.pathname
      },
      threshold: {
        warning: 2500,
        critical: 4000
      }
    })
  }

  /**
   * Handle First Input Delay
   */
  private handleFIDTiming(entry: any): void {
    this.recordMetric({
      name: 'first_input_delay',
      value: entry.processingStart - entry.startTime,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: {
        page: window.location.pathname
      },
      threshold: {
        warning: 100,
        critical: 300
      }
    })
  }

  /**
   * Handle Cumulative Layout Shift
   */
  private handleCLSTiming(entry: any): void {
    this.recordMetric({
      name: 'cumulative_layout_shift',
      value: entry.value,
      unit: 'count',
      timestamp: new Date().toISOString(),
      tags: {
        page: window.location.pathname
      },
      threshold: {
        warning: 0.1,
        critical: 0.25
      }
    })
  }

  /**
   * Collect page-level metrics
   */
  private collectPageMetrics(): void {
    if (!performance.getEntriesByType) return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      this.handleNavigationTiming(navigation)
    }

    // Collect paint metrics
    const paintMetrics = performance.getEntriesByType('paint')
    paintMetrics.forEach(entry => this.handlePaintTiming(entry))
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // Check thresholds and log warnings/errors
    if (metric.threshold) {
      if (metric.value >= metric.threshold.critical) {
        logger.error('Performance metric exceeded critical threshold', {
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold.critical,
          tags: metric.tags
        })
      } else if (metric.value >= metric.threshold.warning) {
        logger.warn('Performance metric exceeded warning threshold', {
          metric: metric.name,
          value: metric.value,
          threshold: metric.threshold.warning,
          tags: metric.tags
        })
      }
    }

    // Keep only recent metrics (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name)
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    pageLoad: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint?: number
    firstInputDelay?: number
    cumulativeLayoutShift?: number
    memoryUsage?: number
  } {
    const summary: any = {}

    const getLatestMetric = (name: string) => {
      const metrics = this.getMetricsByName(name)
      return metrics.length > 0 ? metrics[metrics.length - 1].value : undefined
    }

    summary.pageLoad = getLatestMetric('navigation_total') || 0
    summary.firstPaint = getLatestMetric('first-paint') || 0
    summary.firstContentfulPaint = getLatestMetric('first-contentful-paint') || 0
    summary.largestContentfulPaint = getLatestMetric('largest_contentful_paint')
    summary.firstInputDelay = getLatestMetric('first_input_delay')
    summary.cumulativeLayoutShift = getLatestMetric('cumulative_layout_shift')
    summary.memoryUsage = getLatestMetric('memory_used')

    return summary
  }

  /**
   * Start custom performance measurement
   */
  startMeasurement(name: string): void {
    if (performance.mark) {
      performance.mark(`${name}_start`)
    }
  }

  /**
   * End custom performance measurement
   */
  endMeasurement(name: string, tags?: Record<string, string | number>): void {
    if (performance.mark && performance.measure) {
      const endMark = `${name}_end`
      const measureName = `${name}_duration`
      
      performance.mark(endMark)
      performance.measure(measureName, `${name}_start`, endMark)
      
      const measure = performance.getEntriesByName(measureName)[0]
      if (measure) {
        this.recordMetric({
          name: measureName,
          value: measure.duration,
          unit: 'ms',
          timestamp: new Date().toISOString(),
          tags
        })
      }
    }
  }

  /**
   * Utility functions for thresholds
   */
  private getNavigationThreshold(key: string): { warning: number; critical: number } | undefined {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      total: { warning: 3000, critical: 5000 },
      dns: { warning: 100, critical: 300 },
      tcp: { warning: 100, critical: 300 },
      request: { warning: 200, critical: 500 },
      response: { warning: 500, critical: 1000 },
      dom: { warning: 500, critical: 1000 },
      load: { warning: 1000, critical: 2000 }
    }
    return thresholds[key]
  }

  private getResourceThreshold(type: string): { warning: number; critical: number } | undefined {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      script: { warning: 500, critical: 1000 },
      css: { warning: 300, critical: 600 },
      image: { warning: 1000, critical: 2000 },
      font: { warning: 500, critical: 1000 },
      fetch: { warning: 300, critical: 1000 }
    }
    return thresholds[type]
  }

  private getPaintThreshold(name: string): { warning: number; critical: number } | undefined {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      'first-paint': { warning: 1000, critical: 2000 },
      'first-contentful-paint': { warning: 1500, critical: 3000 }
    }
    return thresholds[name]
  }

  private getWebVitalThreshold(name: string): { warning: number; critical: number } | undefined {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      lcp: { warning: 2500, critical: 4000 },
      fid: { warning: 100, critical: 300 },
      cls: { warning: 0.1, critical: 0.25 }
    }
    return thresholds[name]
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'css'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font'
    if (url.includes('/api/')) return 'fetch'
    return 'other'
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    if (this.vitalsObserver) {
      this.vitalsObserver.disconnect()
      this.vitalsObserver = null
    }
    this.isMonitoring = false
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()