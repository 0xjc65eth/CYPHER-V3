'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface HeatmapCell {
  id: string;
  label: string;
  value: number;
  change: number;
  size: number; // Market cap or volume for sizing
}

export interface MarketHeatmapProps {
  data: HeatmapCell[];
  onCellClick?: (cell: HeatmapCell) => void;
  loading?: boolean;
  className?: string;
}

export function MarketHeatmap({
  data,
  onCellClick,
  loading = false,
  className = ''
}: MarketHeatmapProps) {
  // Calculate sizes for treemap layout
  const cellsWithSizes = useMemo(() => {
    const totalSize = data.reduce((sum, cell) => sum + cell.size, 0);
    return data.map(cell => ({
      ...cell,
      percentage: (cell.size / totalSize) * 100
    }));
  }, [data]);

  // Get color based on change percentage
  const getColor = (change: number) => {
    const absChange = Math.abs(change);
    const opacity = Math.min(absChange / 20, 1); // Max opacity at 20% change

    if (change > 0) {
      // Green gradient
      return `rgba(16, 185, 129, ${0.2 + opacity * 0.6})`;
    } else if (change < 0) {
      // Red gradient
      return `rgba(239, 68, 68, ${0.2 + opacity * 0.6})`;
    } else {
      // Neutral gray
      return 'rgba(107, 114, 128, 0.2)';
    }
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-6 gap-2 ${className}`}>
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-800/50 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-6 gap-2 ${className}`}>
      {cellsWithSizes.map((cell, index) => {
        const bgColor = getColor(cell.change);
        const isPositive = cell.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <motion.div
            key={cell.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.3 }}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCellClick?.(cell)}
            className="aspect-square rounded border border-gray-800 cursor-pointer overflow-hidden relative group"
            style={{ backgroundColor: bgColor }}
          >
            {/* Content */}
            <div className="absolute inset-0 p-2 flex flex-col justify-between">
              <div className="text-[10px] font-mono font-semibold text-white truncate">
                {cell.label}
              </div>

              <div className="flex flex-col items-end">
                <div className={`text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{cell.change.toFixed(1)}%
                </div>
                <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="text-center px-1">
                <div className="text-xs font-bold text-white mb-1">
                  {cell.label}
                </div>
                <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{cell.change.toFixed(2)}%
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Legend component
export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span className="font-semibold">Performance:</span>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
        <span>-20%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(107, 114, 128, 0.2)' }} />
        <span>0%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.8)' }} />
        <span>+20%</span>
      </div>
    </div>
  );
}
