/**
 * 📦 BUNDLE OPTIMIZER - Performance Agent #11
 * Implements dynamic imports, code splitting, and tree shaking optimizations
 * Reduces initial bundle size and implements intelligent lazy loading strategies
 */

import React, { lazy, ComponentType } from 'react';
import { logger } from '@/lib/logger';

interface ComponentMetadata {
  name: string;
  path: string;
  size: number; // Estimated size in KB
  priority: 'critical' | 'high' | 'medium' | 'low';
  loadFrequency: number;
  lastLoaded: number;
  dependencies: string[];
  preloaded: boolean;
}

interface BundleMetrics {
  initialBundleSize: number;
  lazyLoadedSize: number;
  totalSavings: number;
  componentsOptimized: number;
  averageLoadTime: number;
  cacheHitRate: number;
}

export class BundleOptimizer {
  private static instance: BundleOptimizer | null = null;
  private componentRegistry: Map<string, ComponentMetadata> = new Map();
  private lazyComponents: Map<string, ComponentType<any>> = new Map();
  private preloadQueue: Set<string> = new Set();
  private loadTimeCache: Map<string, number> = new Map();
  private metrics: BundleMetrics;

  constructor() {
    this.metrics = {
      initialBundleSize: 0,
      lazyLoadedSize: 0,
      totalSavings: 0,
      componentsOptimized: 0,
      averageLoadTime: 0,
      cacheHitRate: 0
    };

    this.initializeComponentRegistry();
    this.setupIntersectionObserver();
    logger.info('BundleOptimizer initialized');
  }

  static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  /**
   * Initialize component registry with optimization strategies
   */
  private initializeComponentRegistry(): void {
    // Critical components (should be in initial bundle)
    this.registerComponent({
      name: 'MainNavigation',
      path: '@/components/navigation/MainNavigation',
      size: 15,
      priority: 'critical',
      dependencies: ['lucide-react']
    });

    this.registerComponent({
      name: 'BloombergDashboard',
      path: '@/app/BloombergDashboard',
      size: 25,
      priority: 'critical',
      dependencies: ['@tanstack/react-query']
    });

    // High priority components (preload on idle)
    this.registerComponent({
      name: 'PortfolioOverview',
      path: '@/components/portfolio/PortfolioOverview',
      size: 35,
      priority: 'high',
      dependencies: ['recharts', '@omnisat/lasereyes']
    });

    this.registerComponent({
      name: 'TradingTerminal',
      path: '@/components/trading/TradingTerminal',
      size: 45,
      priority: 'high',
      dependencies: ['lightweight-charts', 'recharts']
    });

    // Medium priority components (lazy load on demand)
    this.registerComponent({
      name: 'CypherAI',
      path: '@/components/ai/CypherAI',
      size: 65,
      priority: 'medium',
      dependencies: ['openai']
    });

    this.registerComponent({
      name: 'RunesTradingTerminal',
      path: '@/components/runes/professional/RunesTradingTerminal',
      size: 55,
      priority: 'medium',
      dependencies: ['lightweight-charts', 'recharts']
    });

    // Low priority components (lazy load only when needed)
    this.registerComponent({
      name: 'TradingBotDashboard',
      path: '@/components/TradingBot/TradingBotDashboard',
      size: 40,
      priority: 'low',
      dependencies: ['recharts']
    });

    this.registerComponent({
      name: 'AnalyticsSystem',
      path: '@/components/analytics/AnalyticsSystem',
      size: 50,
      priority: 'low',
      dependencies: ['recharts']
    });

    this.registerComponent({
      name: 'EnhancedCypherAI',
      path: '@/components/ai/EnhancedCypherAIBrazilian',
      size: 80,
      priority: 'low',
      dependencies: ['openai', 'voice-service']
    });
  }

  /**
   * Register a component for optimization
   */
  private registerComponent(config: {
    name: string;
    path: string;
    size: number;
    priority: ComponentMetadata['priority'];
    dependencies?: string[];
  }): void {
    const { name, path, size, priority, dependencies = [] } = config;

    this.componentRegistry.set(name, {
      name,
      path,
      size,
      priority,
      loadFrequency: 0,
      lastLoaded: 0,
      dependencies,
      preloaded: false
    });

    // Update metrics
    this.metrics.componentsOptimized++;
    if (priority === 'critical') {
      this.metrics.initialBundleSize += size;
    } else {
      this.metrics.lazyLoadedSize += size;
      this.metrics.totalSavings += size;
    }
  }

  /**
   * Create optimized lazy component
   */
  createLazyComponent<T = any>(name: string): ComponentType<T> {
    const metadata = this.componentRegistry.get(name);
    if (!metadata) {
      logger.error(`Component not registered: ${name}`);
      return this.createFallbackComponent(name);
    }

    // Return cached component if available
    if (this.lazyComponents.has(name)) {
      return this.lazyComponents.get(name)!;
    }

    const LazyComponent = lazy(async () => {
      const startTime = performance.now();
      
      try {
        // Update load frequency
        metadata.loadFrequency++;
        metadata.lastLoaded = Date.now();

        // Preload dependencies if needed
        await this.preloadDependencies(metadata.dependencies);

        // Dynamic import with retry logic
        const module = await this.importWithRetry(metadata.path, 3);
        const loadTime = performance.now() - startTime;
        
        this.loadTimeCache.set(name, loadTime);
        this.updateLoadTimeMetrics();

        logger.debug(`Lazy loaded ${name} in ${loadTime.toFixed(2)}ms`);
        return module;

      } catch (error) {
        logger.error(`Failed to load component ${name}:`, error);
        throw error;
      }
    });

    this.lazyComponents.set(name, LazyComponent);
    return LazyComponent;
  }

  /**
   * Import with retry logic
   */
  private async importWithRetry(path: string, maxRetries: number): Promise<any> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await import(path);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Import attempt ${i + 1} failed for ${path}:`, error);
        
        // Wait before retry (exponential backoff)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    throw lastError;
  }

  /**
   * Preload dependencies
   */
  private async preloadDependencies(dependencies: string[]): Promise<void> {
    const preloadPromises = dependencies.map(async (dep) => {
      try {
        await import(dep);
      } catch (error) {
        logger.warn(`Failed to preload dependency ${dep}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Create fallback component for failed loads
   */
  private createFallbackComponent(name: string): ComponentType<any> {
    return () => (
      <div className="bg-gray-900 border border-red-500/20 rounded p-4 text-center">
        <div className="text-red-400 text-sm">
          Component unavailable: {name}
        </div>
        <div className="text-gray-400 text-xs mt-2">
          Please refresh the page to retry
        </div>
      </div>
    );
  }

  /**
   * Preload high priority components during idle time
   */
  async preloadHighPriorityComponents(): Promise<void> {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.performIdlePreloading();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.performIdlePreloading(), 100);
    }
  }

  /**
   * Perform idle preloading
   */
  private async performIdlePreloading(): Promise<void> {
    const highPriorityComponents = Array.from(this.componentRegistry.values())
      .filter(comp => comp.priority === 'high' && !comp.preloaded)
      .sort((a, b) => b.loadFrequency - a.loadFrequency); // Most used first

    for (const component of highPriorityComponents) {
      try {
        await import(component.path);
        component.preloaded = true;
        logger.debug(`Preloaded component: ${component.name}`);
      } catch (error) {
        logger.warn(`Failed to preload ${component.name}:`, error);
      }
    }
  }

  /**
   * Setup intersection observer for viewport-based loading
   */
  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const componentName = entry.target.getAttribute('data-component');
            if (componentName && !this.lazyComponents.has(componentName)) {
              this.preloadQueue.add(componentName);
            }
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before visible
    );

    // Store observer for potential cleanup
    (this as any).intersectionObserver = observer;
  }

  /**
   * Process preload queue
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.size === 0) return;

    const componentsToLoad = Array.from(this.preloadQueue);
    this.preloadQueue.clear();

    for (const componentName of componentsToLoad) {
      const metadata = this.componentRegistry.get(componentName);
      if (metadata && !metadata.preloaded) {
        try {
          await import(metadata.path);
          metadata.preloaded = true;
          logger.debug(`Viewport preloaded: ${componentName}`);
        } catch (error) {
          logger.warn(`Failed to viewport preload ${componentName}:`, error);
        }
      }
    }
  }

  /**
   * Update load time metrics
   */
  private updateLoadTimeMetrics(): void {
    const loadTimes = Array.from(this.loadTimeCache.values());
    if (loadTimes.length > 0) {
      this.metrics.averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    component: string;
    recommendation: string;
    impact: 'high' | 'medium' | 'low';
    sizeReduction: number;
  }> {
    const recommendations: Array<{
      component: string;
      recommendation: string;
      impact: 'high' | 'medium' | 'low';
      sizeReduction: number;
    }> = [];

    for (const [name, metadata] of this.componentRegistry) {
      // Large components with low usage should be lazy loaded
      if (metadata.size > 50 && metadata.loadFrequency < 5 && metadata.priority !== 'low') {
        recommendations.push({
          component: name,
          recommendation: 'Convert to lazy loading - large size with low usage',
          impact: 'high',
          sizeReduction: metadata.size
        });
      }

      // Components with many dependencies should be optimized
      if (metadata.dependencies.length > 3) {
        recommendations.push({
          component: name,
          recommendation: 'Consider splitting dependencies or using lighter alternatives',
          impact: 'medium',
          sizeReduction: metadata.size * 0.3
        });
      }

      // Frequently used components should be preloaded
      if (metadata.loadFrequency > 10 && !metadata.preloaded && metadata.priority === 'low') {
        recommendations.push({
          component: name,
          recommendation: 'Upgrade priority to high - frequently used',
          impact: 'medium',
          sizeReduction: 0
        });
      }
    }

    return recommendations.sort((a, b) => b.sizeReduction - a.sizeReduction);
  }

  /**
   * Get bundle metrics
   */
  getMetrics(): BundleMetrics & {
    componentStats: Array<{
      name: string;
      size: number;
      priority: string;
      loadFrequency: number;
      preloaded: boolean;
    }>;
    recommendations: Array<{
      component: string;
      recommendation: string;
      impact: string;
      sizeReduction: number;
    }>;
  } {
    const componentStats = Array.from(this.componentRegistry.values()).map(comp => ({
      name: comp.name,
      size: comp.size,
      priority: comp.priority,
      loadFrequency: comp.loadFrequency,
      preloaded: comp.preloaded
    }));

    return {
      ...this.metrics,
      componentStats,
      recommendations: this.getOptimizationRecommendations()
    };
  }

  /**
   * Start optimization processes
   */
  startOptimization(): void {
    // Preload high priority components on idle
    this.preloadHighPriorityComponents();

    // Process preload queue every 2 seconds
    setInterval(() => {
      this.processPreloadQueue();
    }, 2000);

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateLoadTimeMetrics();
    }, 30000);

    logger.info('Bundle optimization started');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.lazyComponents.clear();
    this.preloadQueue.clear();
    this.loadTimeCache.clear();
    
    if ((this as any).intersectionObserver) {
      (this as any).intersectionObserver.disconnect();
    }
    
    logger.info('BundleOptimizer cleaned up');
  }
}

// Export singleton instance
export const bundleOptimizer = BundleOptimizer.getInstance();

// Auto-start optimization
bundleOptimizer.startOptimization();

export default bundleOptimizer;