/**
 * Hot Reload Utilities for Faster Development
 * Enhanced development experience with smart reloading and state preservation
 */

import { consoleLogger } from './consoleLoggers';

interface HotReloadConfig {
  enabled: boolean;
  preserveState: boolean;
  autoRefresh: boolean;
  notifyUpdates: boolean;
  debounceMs: number;
  excludePatterns: string[];
}

interface ComponentState {
  componentName: string;
  state: any;
  props: any;
  timestamp: Date;
}

class HotReloadManager {
  private static instance: HotReloadManager;
  private config: HotReloadConfig;
  private componentStates = new Map<string, ComponentState>();
  private updateListeners = new Set<(event: HotReloadEvent) => void>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isReloading = false;

  private constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      preserveState: true,
      autoRefresh: true,
      notifyUpdates: true,
      debounceMs: 100,
      excludePatterns: ['node_modules', '.git', '.next']
    };

    this.initializeHotReload();
  }

  static getInstance(): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager();
    }
    return HotReloadManager.instance;
  }

  /**
   * Configure hot reload settings
   */
  configure(config: Partial<HotReloadConfig>): void {
    this.config = { ...this.config, ...config };
    consoleLogger.logPerformance('HotReloadManager', 'Configuration updated', 0);
  }

  /**
   * Initialize hot reload system
   */
  private initializeHotReload(): void {
    if (!this.config.enabled || typeof window === 'undefined') return;

    // Listen for hot module replacement
    const mod = module as any;
    if (mod.hot) {
      mod.hot.accept((err: Error) => {
        if (err) {
          consoleLogger.logError('HotReloadManager', err, { context: 'HMR accept error' });
        } else {
          this.handleModuleUpdate();
        }
      });

      mod.hot.dispose(() => {
        this.cleanup();
      });
    }

    // Listen for file system changes (if available)
    this.setupFileWatcher();

    // Listen for webpack hot updates
    this.setupWebpackListener();

    consoleLogger.logLifecycle('HotReloadManager', 'mount', { config: this.config });
  }

  /**
   * Setup file system watcher for development
   */
  private setupFileWatcher(): void {
    if (typeof window === 'undefined') return;

    // Use EventSource for development server file watching
    if ('EventSource' in window) {
      try {
        const eventSource = new EventSource('/_next/webpack-hmr');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleFileChange(data);
          } catch (error) {
            // Ignore parsing errors for non-JSON messages
          }
        };

        eventSource.onerror = () => {
          // Auto-reconnect on error
          setTimeout(() => this.setupFileWatcher(), 1000);
        };
      } catch (error) {
        consoleLogger.logWarning('HotReloadManager', 'Could not setup EventSource watcher', error);
      }
    }
  }

  /**
   * Setup webpack hot module replacement listener
   */
  private setupWebpackListener(): void {
    if (typeof window === 'undefined') return;

    // Listen for webpack compilation events
    if ((window as any).__webpack_require__) {
      const originalRequire = (window as any).__webpack_require__;
      
      (window as any).__webpack_require__ = (moduleId: string) => {
        const result = originalRequire(moduleId);
        this.trackModuleLoad(moduleId);
        return result;
      };
    }

    // Listen for Next.js fast refresh events
    if ('__NEXT_DATA__' in window) {
      this.setupNextJSListener();
    }
  }

  /**
   * Setup Next.js specific hot reload listener
   */
  private setupNextJSListener(): void {
    // Listen for Next.js router events
    if (typeof window !== 'undefined' && (window as any).next?.router) {
      const router = (window as any).next.router;
      
      router.events.on('routeChangeStart', () => {
        this.handleRouteChange('start');
      });

      router.events.on('routeChangeComplete', () => {
        this.handleRouteChange('complete');
      });

      router.events.on('routeChangeError', (err: Error) => {
        this.handleRouteChange('error', err);
      });
    }
  }

  /**
   * Handle module updates
   */
  private handleModuleUpdate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processModuleUpdate();
    }, this.config.debounceMs);
  }

  /**
   * Process module update with state preservation
   */
  private processModuleUpdate(): void {
    if (this.isReloading) return;

    this.isReloading = true;
    const startTime = performance.now();

    try {
      // Preserve component states
      if (this.config.preserveState) {
        this.preserveComponentStates();
      }

      // Notify listeners
      this.notifyUpdateListeners({
        type: 'module-update',
        timestamp: new Date(),
        preservedStates: this.componentStates.size
      });

      // Auto-refresh if enabled
      if (this.config.autoRefresh) {
        this.scheduleRefresh();
      }

      const duration = performance.now() - startTime;
      consoleLogger.logPerformance('HotReloadManager', 'Module update processed', duration);

    } catch (error) {
      consoleLogger.logError('HotReloadManager', error as Error, { context: 'Module update' });
    } finally {
      this.isReloading = false;
    }
  }

  /**
   * Handle file changes
   */
  private handleFileChange(data: any): void {
    if (!data.action || this.isReloading) return;

    const { action, name } = data;
    
    // Check if file should be excluded
    if (this.shouldExcludeFile(name)) return;

    consoleLogger.logAPI('HotReloadManager', action, name);

    this.handleModuleUpdate();
  }

  /**
   * Handle route changes
   */
  private handleRouteChange(phase: string, error?: Error): void {
    if (error) {
      consoleLogger.logError('HotReloadManager', error, { context: `Route change ${phase}` });
      return;
    }

    this.notifyUpdateListeners({
      type: 'route-change',
      phase,
      timestamp: new Date()
    });

    consoleLogger.logLifecycle('HotReloadManager', 'update', { routePhase: phase });
  }

  /**
   * Track module loading
   */
  private trackModuleLoad(moduleId: string): void {
    // Only track in development
    if (!this.config.enabled) return;

    // Log significant module loads
    if (moduleId.includes('component') || moduleId.includes('chart')) {
      consoleLogger.logAPI('HotReloadManager', 'LOAD', moduleId);
    }
  }

  /**
   * Preserve component states before reload
   */
  private preserveComponentStates(): void {
    // This would typically be handled by React DevTools or state management
    // but we can provide a mechanism for manual state preservation
    
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      try {
        const devTools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (devTools.reactDevtoolsAgent) {
          // Attempt to preserve React component tree state
          consoleLogger.logLifecycle('HotReloadManager', 'update', { action: 'Preserving React state' });
        }
      } catch (error) {
        consoleLogger.logWarning('HotReloadManager', 'Could not preserve React state', error);
      }
    }
  }

  /**
   * Schedule a refresh
   */
  private scheduleRefresh(): void {
    setTimeout(() => {
      if (this.config.notifyUpdates) {
        this.showUpdateNotification();
      }
    }, 100);
  }

  /**
   * Show update notification
   */
  private showUpdateNotification(): void {
    if (typeof window === 'undefined') return;

    // Create a subtle notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: opacity 0.3s ease;
    `;
    notification.textContent = '🔄 Module updated';
    
    document.body.appendChild(notification);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  /**
   * Check if file should be excluded from hot reload
   */
  private shouldExcludeFile(filename: string): boolean {
    return this.config.excludePatterns.some(pattern => 
      filename.includes(pattern)
    );
  }

  /**
   * Add update listener
   */
  onUpdate(listener: (event: HotReloadEvent) => void): () => void {
    this.updateListeners.add(listener);
    
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  /**
   * Notify all update listeners
   */
  private notifyUpdateListeners(event: HotReloadEvent): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        consoleLogger.logError('HotReloadManager', error as Error, { context: 'Update listener' });
      }
    });
  }

  /**
   * Manually trigger a hot reload
   */
  triggerReload(): void {
    consoleLogger.logLifecycle('HotReloadManager', 'update', { action: 'Manual reload triggered' });
    this.handleModuleUpdate();
  }

  /**
   * Register component state for preservation
   */
  registerComponentState(componentName: string, state: any, props: any): void {
    if (!this.config.preserveState) return;

    this.componentStates.set(componentName, {
      componentName,
      state,
      props,
      timestamp: new Date()
    });
  }

  /**
   * Restore component state after reload
   */
  restoreComponentState(componentName: string): ComponentState | null {
    return this.componentStates.get(componentName) || null;
  }

  /**
   * Clear component states
   */
  clearComponentStates(): void {
    this.componentStates.clear();
    consoleLogger.logLifecycle('HotReloadManager', 'update', { action: 'Component states cleared' });
  }

  /**
   * Get hot reload statistics
   */
  getStats(): any {
    return {
      isEnabled: this.config.enabled,
      isReloading: this.isReloading,
      preservedStates: this.componentStates.size,
      updateListeners: this.updateListeners.size,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.updateListeners.clear();
    this.componentStates.clear();
    
    consoleLogger.logLifecycle('HotReloadManager', 'unmount');
  }
}

// Event types
interface HotReloadEvent {
  type: 'module-update' | 'route-change' | 'file-change';
  timestamp: Date;
  phase?: string;
  preservedStates?: number;
  [key: string]: any;
}

// Export singleton
export const hotReloadManager = HotReloadManager.getInstance();

// React hooks for hot reload integration
export function useHotReload(componentName: string) {
  const [updateCount, setUpdateCount] = React.useState(0);
  
  React.useEffect(() => {
    const unsubscribe = hotReloadManager.onUpdate(() => {
      setUpdateCount(count => count + 1);
    });
    
    return unsubscribe;
  }, []);

  const registerState = React.useCallback((state: any, props: any) => {
    hotReloadManager.registerComponentState(componentName, state, props);
  }, [componentName]);

  const restoreState = React.useCallback(() => {
    return hotReloadManager.restoreComponentState(componentName);
  }, [componentName]);

  return {
    updateCount,
    registerState,
    restoreState,
    triggerReload: () => hotReloadManager.triggerReload()
  };
}

// Higher-order component for hot reload support
export function withHotReload<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  displayName?: string
): React.ComponentType<P> {
  const componentName = displayName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';

  return function HotReloadWrapper(props: P) {
    const { registerState, restoreState } = useHotReload(componentName);
    const [componentState, setComponentState] = React.useState(restoreState()?.state);

    // Register current state
    React.useEffect(() => {
      registerState(componentState, props);
    }, [componentState, props, registerState]);

    return React.createElement(WrappedComponent, {
      ...props,
      ...(componentState && { initialState: componentState })
    } as P);
  };
}

import React from 'react';

export default hotReloadManager;