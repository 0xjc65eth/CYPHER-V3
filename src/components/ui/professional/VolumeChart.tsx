'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { formatCompactNumber } from '@/utils/formatters';

export interface VolumeDataPoint {
  time: number;
  volume: number;
  isPositive: boolean; // Price increased during this period
}

export interface VolumeChartProps {
  data: VolumeDataPoint[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function VolumeChart({
  data,
  height = 150,
  showLegend = true,
  className = ''
}: VolumeChartProps) {
  const { maxVolume, bars } = useMemo(() => {
    const maxVol = Math.max(...data.map(d => d.volume), 1);

    const barData = data.map((point, index) => ({
      ...point,
      heightPercent: (point.volume / maxVol) * 100,
      index
    }));

    return { maxVolume: maxVol, bars: barData };
  }, [data]);

  const formatVolume = (volume: number) => formatCompactNumber(volume);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-gray-900/40 border border-gray-800 rounded-terminal p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
            Volume Profile
          </h3>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Max: {formatVolume(maxVolume)}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500/60 rounded-sm" />
            <span className="text-gray-400">Buy Volume</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500/60 rounded-sm" />
            <span className="text-gray-400">Sell Volume</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-600 font-mono pr-2">
          <span>{formatVolume(maxVolume)}</span>
          <span>{formatVolume(maxVolume * 0.5)}</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className="absolute left-12 right-0 top-0 bottom-0 flex items-end justify-between gap-px">
          {bars.map((bar, index) => (
            <motion.div
              key={index}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${bar.heightPercent}%`, opacity: 1 }}
              transition={{ delay: index * 0.01, duration: 0.3 }}
              className="relative flex-1 group cursor-pointer"
            >
              <div
                className={`w-full rounded-t-sm transition-all duration-150 ${
                  bar.isPositive
                    ? 'bg-green-500/60 hover:bg-green-500/80'
                    : 'bg-red-500/60 hover:bg-red-500/80'
                }`}
                style={{ height: '100%' }}
              />

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                  <div className="text-gray-400">{formatTime(bar.time)}</div>
                  <div className={`font-semibold ${bar.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {formatVolume(bar.volume)}
                  </div>
                </div>
                <div className="w-2 h-2 bg-gray-900 border-l border-b border-gray-700 absolute left-1/2 -translate-x-1/2 -bottom-1 rotate-45" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* X-axis (time labels) */}
      {data.length > 0 && (
        <div className="flex justify-between mt-2 text-[10px] text-gray-600 font-mono pl-12">
          <span>{formatTime(data[0].time)}</span>
          <span>{formatTime(data[Math.floor(data.length / 2)].time)}</span>
          <span>{formatTime(data[data.length - 1].time)}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-800">
        <div>
          <div className="text-[10px] text-gray-600 uppercase">Total Vol</div>
          <div className="text-sm font-bold text-white font-mono">
            {formatVolume(data.reduce((sum, d) => sum + d.volume, 0))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-600 uppercase">Buy Vol</div>
          <div className="text-sm font-bold text-green-400 font-mono">
            {formatVolume(data.filter(d => d.isPositive).reduce((sum, d) => sum + d.volume, 0))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-600 uppercase">Sell Vol</div>
          <div className="text-sm font-bold text-red-400 font-mono">
            {formatVolume(data.filter(d => !d.isPositive).reduce((sum, d) => sum + d.volume, 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline volume bar (for tables)
export function InlineVolumeBar({ volume, maxVolume, isPositive }: {
  volume: number;
  maxVolume: number;
  isPositive: boolean;
}) {
  const percentage = (volume / maxVolume) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isPositive ? 'bg-green-500/60' : 'bg-red-500/60'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {formatCompactNumber(volume)}
      </span>
    </div>
  );
}
