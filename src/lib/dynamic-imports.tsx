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
  return dynamic(importFunction, {
    loading: options?.loading || LoadingSpinner,
    ssr: options?.ssr ?? false,
  });
}

/**
 * Chart Components - Dynamically loaded to reduce initial bundle size
 */
export const DynamicRechartsLineChart = createDynamicComponent(
  () => import('recharts').then(mod => ({ default: mod.LineChart }))
);

export const DynamicRechartsAreaChart = createDynamicComponent(
  () => import('recharts').then(mod => ({ default: mod.AreaChart }))
);

export const DynamicRechartsBarChart = createDynamicComponent(
  () => import('recharts').then(mod => ({ default: mod.BarChart }))
);

export const DynamicLightweightChart = createDynamicComponent(
  () => import('lightweight-charts').then(mod => ({ default: mod.createChart }))
);

export const DynamicApexChart = createDynamicComponent(
  () => import('react-apexcharts').then(mod => ({ default: mod.default })),
  { ssr: false }
);

/**
 * Heavy Library Components - Only loaded when needed
 */
export const DynamicTensorFlow = createDynamicComponent(
  () => import('@tensorflow/tfjs').then(mod => ({ default: mod })),
  { ssr: false }
);

export const DynamicD3 = createDynamicComponent(
  () => import('d3').then(mod => ({ default: mod })),
  { ssr: false }
);

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
  DynamicApexChart,
  // Libraries
  DynamicTensorFlow,
  DynamicD3,
};