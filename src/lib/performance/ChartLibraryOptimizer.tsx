/**
 * 📊 CHART LIBRARY OPTIMIZER - Performance Agent #11
 * Optimizes chart library usage, implements lazy loading, and reduces bundle size
 * Manages multiple chart libraries efficiently and prevents redundant imports
 */

import { logger } from '@/lib/logger';
import { lazy, ComponentType } from 'react';

interface ChartComponent {
  name: string;
  library: 'recharts' | 'lightweight-charts' | 'custom';
  size: number; // Estimated bundle size in KB
  usage: number; // Usage frequency
  lastUsed: number;
  component?: ComponentType<any>;
  loader?: () => Promise<{ default: ComponentType<any> }>;
}

interface ChartMetrics {
  totalCharts: number;
  lazyCharts: number;
  bundleSavings: number; // KB saved
  renderTime: Map<string, number>;
  lastOptimization: number;
}

export class ChartLibraryOptimizer {
  private static instance: ChartLibraryOptimizer | null = null;
  private chartRegistry: Map<string, ChartComponent> = new Map();
  private lazyComponents: Map<string, ComponentType<any>> = new Map();
  private metrics: ChartMetrics;
  private readonly USAGE_THRESHOLD = 5; // Charts used less than 5 times should be lazy loaded
  private readonly SIZE_THRESHOLD = 50; // Charts larger than 50KB should be lazy loaded

  constructor() {
    this.metrics = {
      totalCharts: 0,
      lazyCharts: 0,
      bundleSavings: 0,
      renderTime: new Map(),
      lastOptimization: Date.now()
    };

    this.initializeChartRegistry();
    logger.info('ChartLibraryOptimizer initialized');
  }

  static getInstance(): ChartLibraryOptimizer {
    if (!ChartLibraryOptimizer.instance) {
      ChartLibraryOptimizer.instance = new ChartLibraryOptimizer();
    }
    return ChartLibraryOptimizer.instance;
  }

  /**
   * Initialize chart registry with known charts
   */
  private initializeChartRegistry(): void {
    // Recharts components (lighter, keep eagerly loaded)
    this.registerChart('LineChart', 'recharts', 15, () => 
      import('recharts').then(m => ({ default: m.LineChart as any }))
    );
    this.registerChart('AreaChart', 'recharts', 18, () => 
      import('recharts').then(m => ({ default: m.AreaChart as any }))
    );
    this.registerChart('BarChart', 'recharts', 20, () => 
      import('recharts').then(m => ({ default: m.BarChart as any }))
    );
    this.registerChart('PieChart', 'recharts', 22, () => 
      import('recharts').then(m => ({ default: m.PieChart as any }))
    );

    // Lightweight Charts (heavier, lazy load)
    this.registerChart('LightweightChart', 'lightweight-charts', 120, () => 
      import('./LightweightChartWrapper').then(m => ({ default: m.default }))
    );

    // Custom optimized charts
    this.registerChart('BitcoinPriceChart', 'custom', 8, () => 
      import('@/components/charts/optimized/BitcoinPriceChart').then(m => ({ default: m.default }))
    );
    this.registerChart('VolumeChart', 'custom', 10, () => 
      import('@/components/charts/optimized/VolumeChart').then(m => ({ default: m.default }))
    );
    this.registerChart('TradingViewChart', 'custom', 15, () => 
      import('@/components/charts/optimized/TradingViewChart').then(m => ({ default: m.default }))
    );
  }

  /**
   * Register a chart component
   */
  private registerChart(
    name: string, 
    library: ChartComponent['library'], 
    size: number,
    loader: () => Promise<{ default: ComponentType<any> }>
  ): void {
    const shouldLazyLoad = size > this.SIZE_THRESHOLD;
    
    this.chartRegistry.set(name, {
      name,
      library,
      size,
      usage: 0,
      lastUsed: 0,
      loader: shouldLazyLoad ? loader : undefined
    });

    // If not lazy loading, load immediately for small components
    if (!shouldLazyLoad) {
      loader().then(module => {
        const chart = this.chartRegistry.get(name);
        if (chart) {
          chart.component = module.default;
        }
      }).catch(error => {
        logger.warn(`Failed to preload chart ${name}:`, error);
      });
    }

    this.metrics.totalCharts++;
    if (shouldLazyLoad) {
      this.metrics.lazyCharts++;
      this.metrics.bundleSavings += size;
    }
  }

  /**
   * Get a chart component (lazy loaded if needed)
   */
  async getChartComponent(name: string): Promise<ComponentType<any> | null> {
    const chart = this.chartRegistry.get(name);
    if (!chart) {
      logger.error(`Chart component not found: ${name}`);
      return null;
    }

    // Update usage tracking
    chart.usage++;
    chart.lastUsed = Date.now();

    // Return cached component if available
    if (chart.component) {
      return chart.component;
    }

    // Load component dynamically
    if (chart.loader) {
      try {
        const startTime = performance.now();
        const module = await chart.loader();
        const loadTime = performance.now() - startTime;
        
        chart.component = module.default;
        this.metrics.renderTime.set(name, loadTime);
        
        logger.debug(`Lazy loaded chart ${name} in ${loadTime.toFixed(2)}ms`);
        return chart.component;
      } catch (error) {
        logger.error(`Failed to load chart ${name}:`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * Create a lazy chart wrapper
   */
  createLazyChart<T = any>(name: string) {
    return lazy(async (): Promise<{ default: ComponentType<any> }> => {
      const component = await this.getChartComponent(name);
      if (!component) {
        // Return fallback component
        return {
          default: () => (
            <div className="bg-gray-900 border border-orange-500/20 rounded p-4 text-center">
              <div className="text-orange-400 text-sm">Chart unavailable: {name}</div>
            </div>
          )
        };
      }
      return { default: component };
    });
  }

  /**
   * Optimize chart usage based on analytics
   */
  optimizeChartUsage(): void {
    const now = Date.now();
    let optimizationsApplied = 0;

    for (const [name, chart] of this.chartRegistry) {
      // Convert rarely used charts to lazy loading
      if (chart.usage < this.USAGE_THRESHOLD && !chart.loader && chart.size > 10) {
        logger.info(`Converting ${name} to lazy loading (usage: ${chart.usage})`);
        
        // Store the current component and create a loader
        const currentComponent = chart.component;
        chart.loader = async () => ({ default: currentComponent! });
        chart.component = undefined;
        
        this.metrics.lazyCharts++;
        this.metrics.bundleSavings += chart.size;
        optimizationsApplied++;
      }

      // Preload frequently used lazy charts
      if (chart.usage > this.USAGE_THRESHOLD * 2 && chart.loader && !chart.component) {
        logger.info(`Preloading frequently used chart: ${name} (usage: ${chart.usage})`);
        
        chart.loader().then(module => {
          chart.component = module.default;
        }).catch(error => {
          logger.warn(`Failed to preload ${name}:`, error);
        });
        
        optimizationsApplied++;
      }
    }

    this.metrics.lastOptimization = now;
    
    if (optimizationsApplied > 0) {
      logger.info(`Applied ${optimizationsApplied} chart optimizations`);
    }
  }

  /**
   * Cleanup unused charts from memory
   */
  cleanupUnusedCharts(): void {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 10 * 60 * 1000; // 10 minutes
    let cleanedUp = 0;

    for (const [name, chart] of this.chartRegistry) {
      // Only cleanup lazy-loaded components that haven't been used recently
      if (chart.component && chart.loader && (now - chart.lastUsed) > CLEANUP_THRESHOLD) {
        logger.debug(`Cleaning up unused chart: ${name}`);
        chart.component = undefined;
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      logger.info(`Cleaned up ${cleanedUp} unused chart components`);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): ChartMetrics & {
    chartUsage: Array<{ name: string; usage: number; size: number; library: string }>;
    renderTimes: Array<{ name: string; time: number }>;
  } {
    const chartUsage = Array.from(this.chartRegistry.values()).map(chart => ({
      name: chart.name,
      usage: chart.usage,
      size: chart.size,
      library: chart.library
    }));

    const renderTimes = Array.from(this.metrics.renderTime.entries()).map(([name, time]) => ({
      name,
      time
    }));

    return {
      ...this.metrics,
      chartUsage,
      renderTimes
    };
  }

  /**
   * Preload critical charts
   */
  async preloadCriticalCharts(): Promise<void> {
    const criticalCharts = ['LineChart', 'AreaChart', 'BitcoinPriceChart'];
    
    const preloadPromises = criticalCharts.map(async (name) => {
      try {
        await this.getChartComponent(name);
        logger.debug(`Preloaded critical chart: ${name}`);
      } catch (error) {
        logger.warn(`Failed to preload critical chart ${name}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    logger.info('Critical charts preloading completed');
  }

  /**
   * Create virtualized chart for large datasets
   */
  createVirtualizedChart(name: string, dataSize: number) {
    if (dataSize < 1000) {
      // Use regular chart for small datasets
      return this.createLazyChart(name);
    }

    // Create virtualized wrapper for large datasets
    return lazy(async () => {
      const [chartComponent, virtualization] = await Promise.all([
        this.getChartComponent(name),
        import('./ChartVirtualization').then(m => m.default)
      ]);

      if (!chartComponent) {
        throw new Error(`Chart component not found: ${name}`);
      }

      return {
        default: (props: any) => virtualization(chartComponent, props)
      };
    });
  }

  /**
   * Start optimization loop
   */
  startOptimization(): void {
    // Run optimizations every 5 minutes
    setInterval(() => {
      this.optimizeChartUsage();
      this.cleanupUnusedCharts();
    }, 5 * 60 * 1000);

    logger.info('Chart optimization loop started');
  }
}

// Export singleton instance
export const chartLibraryOptimizer = ChartLibraryOptimizer.getInstance();

// Auto-start optimization
chartLibraryOptimizer.startOptimization();

export default chartLibraryOptimizer;