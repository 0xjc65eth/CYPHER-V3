'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChartSkeletonProps {
  variant?: 'line' | 'bar' | 'candlestick' | 'area' | 'donut' | 'heatmap';
  height?: number | string;
  showLegend?: boolean;
  showControls?: boolean;
  showToolbar?: boolean;
  className?: string;
}

export function ChartSkeleton({
  variant = 'line',
  height = 300,
  showLegend = true,
  showControls = true,
  showToolbar = true,
  className
}: ChartSkeletonProps) {
  const heightClass = typeof height === 'number' ? `h-[${height}px]` : height;

  // Deterministic patterns for skeleton loading (prevents hydration mismatch)
  const lineHeights = [60, 35, 80, 45, 70, 55, 90, 40, 65, 50, 75, 30, 85, 50, 60, 45, 70, 55, 80, 40];
  const barHeights = [65, 45, 80, 55, 70, 50, 85, 40, 75, 60, 50, 70];
  const candleHeights = [15, 22, 18, 25, 20, 16, 28, 19, 24, 17, 21, 26, 15, 23, 19, 22, 18, 25, 20, 16, 28, 19, 24, 17, 21, 26, 15, 23, 19, 22];
  const isGreen = (i: number) => i % 3 !== 0; // 2/3 green, 1/3 red for visual variety

  const renderChartContent = () => {
    switch (variant) {
      case 'line':
        return (
          <div className="relative w-full h-full">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
            
            {/* Chart area */}
            <div className="ml-16 mr-4 h-full flex items-end">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end mx-1">
                  <Skeleton
                    className="w-full bg-blue-500/20"
                    style={{ height: `${lineHeights[i]}%` }}
                  />
                </div>
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="ml-16 mr-4 mt-2 flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
          </div>
        );

      case 'bar':
        return (
          <div className="relative w-full h-full">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
            
            {/* Chart area */}
            <div className="ml-16 mr-4 h-full flex items-end justify-between px-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-8 bg-green-500/20"
                  style={{ height: `${barHeights[i]}%` }}
                />
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="ml-16 mr-4 mt-2 flex justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        );

      case 'candlestick':
        return (
          <div className="relative w-full h-full">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-2 w-16" />
              ))}
            </div>
            
            {/* Chart area with candlesticks */}
            <div className="ml-20 mr-4 h-full flex items-center">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center mx-px">
                  {/* Wick top */}
                  <Skeleton className="w-px h-4 bg-gray-500" />
                  {/* Body */}
                  <Skeleton
                    className={`w-2 ${isGreen(i) ? 'bg-green-500/30' : 'bg-red-500/30'}`}
                    style={{ height: `${candleHeights[i]}px` }}
                  />
                  {/* Wick bottom */}
                  <Skeleton className="w-px h-4 bg-gray-500" />
                </div>
              ))}
            </div>
            
            {/* X-axis labels */}
            <div className="ml-20 mr-4 mt-2 flex justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-2 w-12" />
              ))}
            </div>
          </div>
        );

      case 'area':
        return (
          <div className="relative w-full h-full">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
            
            {/* Chart area with gradient effect */}
            <div className="ml-16 mr-4 h-full relative">
              <Skeleton className="absolute inset-0 bg-gradient-to-b from-blue-500/30 to-blue-500/5 rounded-t-lg" />
              <div className="absolute bottom-0 left-0 right-0 h-1/2">
                <Skeleton className="w-full h-full bg-gradient-to-t from-blue-500/20 to-transparent" />
              </div>
            </div>
            
            {/* X-axis labels */}
            <div className="ml-16 mr-4 mt-2 flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
          </div>
        );

      case 'donut':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <Skeleton className="w-40 h-40 rounded-full bg-gradient-conic from-blue-500/30 via-green-500/30 to-purple-500/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="w-20 h-20 rounded-full bg-background" />
              </div>
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div className="grid grid-cols-10 gap-1 h-full p-4">
            {Array.from({ length: 100 }).map((_, i) => {
              // Deterministic heatmap colors: ~30% red, ~30% green, ~40% gray
              const colorClass = i % 10 < 3 ? 'bg-red-500/30' :
                                i % 10 < 6 ? 'bg-green-500/30' :
                                'bg-gray-500/20';
              return (
                <Skeleton
                  key={i}
                  className={`aspect-square ${colorClass}`}
                />
              );
            })}
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-3/4 h-3/4 rounded-lg" />
          </div>
        );
    }
  };

  return (
    <div className={cn("bg-card border rounded-lg overflow-hidden", className)}>
      {/* Chart Header */}
      {showToolbar && (
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-20 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      {showControls && (
        <div className="border-b p-2">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-12 rounded" />
            ))}
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className={cn("p-4", heightClass)}>
        {renderChartContent()}
      </div>

      {/* Legend */}
      {showLegend && variant !== 'donut' && (
        <div className="border-t p-4">
          <div className="flex items-center justify-center gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Donut Legend */}
      {showLegend && variant === 'donut' && (
        <div className="border-t p-4">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized chart skeletons
export function PriceChartSkeleton({ className }: { className?: string }) {
  return (
    <ChartSkeleton
      variant="candlestick"
      height={400}
      showLegend={false}
      showControls={true}
      showToolbar={true}
      className={className}
    />
  );
}

export function PortfolioChartSkeleton({ className }: { className?: string }) {
  return (
    <ChartSkeleton
      variant="donut"
      height={300}
      showLegend={true}
      showControls={false}
      showToolbar={true}
      className={className}
    />
  );
}

export function VolumeChartSkeleton({ className }: { className?: string }) {
  return (
    <ChartSkeleton
      variant="bar"
      height={200}
      showLegend={false}
      showControls={false}
      showToolbar={false}
      className={className}
    />
  );
}

export function TrendChartSkeleton({ className }: { className?: string }) {
  return (
    <ChartSkeleton
      variant="area"
      height={250}
      showLegend={true}
      showControls={true}
      showToolbar={true}
      className={className}
    />
  );
}

export default ChartSkeleton;