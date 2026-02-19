'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function MetricsCard({
  title,
  value,
  change,
  changeLabel = '24h',
  icon: Icon,
  iconColor = 'text-orange-400',
  trend,
  loading = false,
  subtitle,
  onClick,
  className = ''
}: MetricsCardProps) {
  // Auto-detect trend from change if not provided
  const autoTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : undefined);

  const TrendIcon = autoTrend === 'up' ? TrendingUp : autoTrend === 'down' ? TrendingDown : Minus;
  const trendColor = autoTrend === 'up' ? 'text-green-400' : autoTrend === 'down' ? 'text-red-400' : 'text-gray-400';

  if (loading) {
    return (
      <Card className={`bg-gray-900/40 border-gray-800 ${onClick ? 'cursor-pointer hover:border-orange-500/50 transition-colors' : ''} ${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-3 bg-gray-800 rounded w-24 mb-3" />
            <div className="h-6 bg-gray-800 rounded w-32 mb-2" />
            {change !== undefined && (
              <div className="h-3 bg-gray-800 rounded w-16" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      <Card
        className={`
          bg-gray-900/40 border-gray-800 backdrop-blur-sm
          ${onClick ? 'cursor-pointer hover:border-orange-500/50 hover:shadow-glow-sm transition-all duration-200' : ''}
          ${className}
        `}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <motion.h3
                  className="text-2xl font-bold text-white font-mono tabular-nums"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {value}
                </motion.h3>
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {subtitle}
                </p>
              )}
            </div>

            {Icon && (
              <div className={`p-2 rounded-md bg-gray-800/50 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>

          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
              <span className={`text-sm font-semibold font-mono ${trendColor}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-600 ml-1">
                {changeLabel}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export interface MetricsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function MetricsGrid({
  children,
  columns = 4,
  className = ''
}: MetricsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
}
