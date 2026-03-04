/**
 * Chart Library Exports and Aliases
 * Central export point for all chart components to prevent "Element type is invalid" errors
 */

import React from 'react';
import {
  LineChart as _LineChart,
  AreaChart as _AreaChart,
  BarChart as _BarChart,
} from 'recharts';

// Re-export all Recharts components with proper aliases
export {
  LineChart,
  AreaChart,
  BarChart,
  ComposedChart,
  PieChart,
  RadarChart,
  ScatterChart,
  Funnel,
  Treemap,
  // Chart elements
  Area,
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Brush,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer,
  // Cell and reference components
  Cell,
  LabelList,
  Label,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ErrorBar,
  // Pie chart components
  Pie,
  Sector,
  // Radar chart components
  Radar,
  RadialBar,
  RadialBarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

// Additional chart type aliases to prevent confusion
export { LineChart as RechartsLineChart } from 'recharts';
export { AreaChart as RechartsAreaChart } from 'recharts';
export { BarChart as RechartsBarChart } from 'recharts';

// Lightweight Charts components (when needed)
// Dynamic import will be used for heavy chart libraries to improve bundle size

// Chart configuration and utilities
export const CHART_COLORS = {
  primary: '#f97316', // orange-500
  secondary: '#3b82f6', // blue-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#6366f1', // indigo-500
  purple: '#8b5cf6', // violet-500
  pink: '#ec4899', // pink-500
  gray: '#6b7280', // gray-500
  dark: '#374151', // gray-700
};

export const CHART_GRADIENTS = {
  orange: 'url(#orangeGradient)',
  blue: 'url(#blueGradient)',
  green: 'url(#greenGradient)',
  purple: 'url(#purpleGradient)',
};

// Common chart configurations
export const DEFAULT_CHART_CONFIG = {
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
  responsive: true,
  animate: true,
  grid: true,
  tooltip: true,
  legend: false,
};

// Chart themes
export const DARK_THEME = {
  background: '#111827', // gray-900
  surface: '#1f2937', // gray-800
  text: '#f9fafb', // gray-50
  textSecondary: '#9ca3af', // gray-400
  border: '#374151', // gray-700
  grid: '#374151', // gray-700
};

// Safe chart wrapper function
export function createSafeChart<T extends any[]>(
  ChartComponent: (...args: T) => JSX.Element | null,
  componentName: string
) {
  return function SafeChart(...args: T): JSX.Element {
    try {
      return ChartComponent(...args) || (
        <div className="bg-gray-900 border border-red-500/20 rounded p-4 text-center">
          <div className="text-red-400 text-sm">
            Chart returned null: {componentName}
          </div>
        </div>
      );
    } catch (error) {
      console.error(`Chart Error in ${componentName}:`, error);
      return (
        <div className="bg-gray-900 border border-red-500/20 rounded p-4 text-center">
          <div className="text-red-400 text-sm">
            Chart temporarily unavailable: {componentName}
          </div>
        </div>
      );
    }
  };
}

// Export chart validation utilities
export function validateChartData(data: any[], requiredFields: string[] = []): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  for (const field of requiredFields) {
    if (!data.every(item => typeof item === 'object' && field in item)) {
      return false;
    }
  }

  return true;
}

// Generate fallback data for charts
export function generateFallbackData(length: number = 10): Array<{
  time: number;
  value: number;
  price: number;
  volume: number;
}> {
  return Array.from({ length }, (_, i) => ({
    time: Date.now() - (length - 1 - i) * 24 * 60 * 60 * 1000,
    value: Math.random() * 0.5 + 0.25,
    price: 40000 + Math.random() * 20000,
    volume: Math.random() * 1000000,
  }));
}

export default {
  LineChart: _LineChart,
  AreaChart: _AreaChart,
  BarChart: _BarChart,
  CHART_COLORS,
  CHART_GRADIENTS,
  DEFAULT_CHART_CONFIG,
  DARK_THEME,
  createSafeChart,
  validateChartData,
  generateFallbackData,
};