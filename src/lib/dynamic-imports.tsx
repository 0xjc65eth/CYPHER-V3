/**
 * Dynamic Import Utilities for Bundle Size Optimization
 * This file contains utilities for lazy loading heavy components and libraries
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component for dynamic imports
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="flex items-center justify-center p-8 bg-red-900/20 border border-red-500 rounded">
    <div className="text-red-400 text-sm">
      Failed to load component: {error.message}
    </div>
  </div>
);

/**
 * Creates a dynamically imported component with loading and error states
 */
export function createDynamicComponent<T = {}>(
  importFunction: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFunction as any, {
    loading: (options?.loading || LoadingSpinner) as any,
    ssr: options?.ssr ?? false,
  });
}

/**
 * Chart Components - Dynamically loaded to reduce initial bundle size
 */
export const DynamicRechartsLineChart = createDynamicComponent(
  (() => import('recharts').then(mod => ({ default: mod.LineChart }))) as any
);

export const DynamicRechartsAreaChart = createDynamicComponent(
  (() => import('recharts').then(mod => ({ default: mod.AreaChart }))) as any
);

export const DynamicRechartsBarChart = createDynamicComponent(
  (() => import('recharts').then(mod => ({ default: mod.BarChart }))) as any
);

export const DynamicLightweightChart = createDynamicComponent(
  (() => import('lightweight-charts').then(mod => ({ default: mod.createChart }))) as any
);

/**
 * Note: ApexCharts, TensorFlow, and D3 dynamic imports removed during dependency cleanup.
 * - ApexCharts: replaced by lightweight-charts and recharts
 * - TensorFlow: moved to server-side only (@tensorflow/tfjs-node)
 * - D3: replaced by recharts
 */

/**
 * Utility function to dynamically import libraries
 */
export async function importLibrary<T>(
  importFunction: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await importFunction();
  } catch (error) {
    console.error('Failed to import library:', error);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Pre-load critical libraries for better UX
 */
export function preloadCriticalLibraries() {
  // Pre-load Recharts on idle
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      import('recharts').catch(() => {
        // Silently fail - not critical
      });
    });
  }
}

/**
 * Bundle size monitoring utilities
 */
export const bundleMetrics = {
  trackComponentLoad: (componentName: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      const mark = `component-${componentName}-loaded`;
      window.performance.mark(mark);
    }
  },
  
  trackLibraryLoad: (libraryName: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      const mark = `library-${libraryName}-loaded`;
      window.performance.mark(mark);
    }
  }
};

export default {
  createDynamicComponent,
  importLibrary,
  preloadCriticalLibraries,
  bundleMetrics,
  // Chart components
  DynamicRechartsLineChart,
  DynamicRechartsAreaChart,
  DynamicRechartsBarChart,
  DynamicLightweightChart,
};