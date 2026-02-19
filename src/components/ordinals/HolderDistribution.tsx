'use client';

import React from 'react';
import { useHolderMetrics } from '@/hooks/useHolderMetrics';
import type { HolderDistribution as HolderDistributionType } from '@/types/ordinals-holders';
import { ExportButton } from '@/components/common/ExportButton';

interface HolderDistributionProps {
  collectionSymbol: string;
  className?: string;
}

export function HolderDistribution({ collectionSymbol, className = '' }: HolderDistributionProps) {
  const { data, isLoading, error } = useHolderMetrics(collectionSymbol);

  if (isLoading) {
    return (
      <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#FF6B00]/20 rounded w-1/2"></div>
          <div className="h-64 bg-[#FF6B00]/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data?.distribution) {
    return (
      <div className={`bg-black/40 border border-red-500/20 rounded p-6 ${className}`}>
        <div className="text-red-400 text-sm">
          Distribution data unavailable
        </div>
      </div>
    );
  }

  const { distribution } = data;

  return (
    <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[#FF6B00] font-semibold text-lg">Holder Distribution</h3>
        <div className="flex items-center gap-3">
          <ExportButton
            type="holder-data"
            data={[
              { category: 'Whales (>100)', ...distribution.whales },
              { category: 'Large (10-100)', ...distribution.largeHolders },
              { category: 'Medium (2-9)', ...distribution.mediumHolders },
              { category: 'Small (1)', ...distribution.smallHolders },
            ]}
            size="sm"
            variant="outline"
          />
          {distribution.concentrated && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
              ⚠️ Highly Concentrated
            </span>
          )}
        </div>
      </div>

      {/* Distribution Chart (Horizontal Bars) */}
      <div className="space-y-4 mb-6">
        <DistributionBar
          label="Whales (>100)"
          count={distribution.whales.count}
          inscriptions={distribution.whales.totalInscriptions}
          percentage={distribution.whales.percentage}
          color="from-purple-500 to-pink-500"
        />
        <DistributionBar
          label="Large (10-100)"
          count={distribution.largeHolders.count}
          inscriptions={distribution.largeHolders.totalInscriptions}
          percentage={distribution.largeHolders.percentage}
          color="from-blue-500 to-cyan-500"
        />
        <DistributionBar
          label="Medium (2-9)"
          count={distribution.mediumHolders.count}
          inscriptions={distribution.mediumHolders.totalInscriptions}
          percentage={distribution.mediumHolders.percentage}
          color="from-[#FF6B00] to-yellow-500"
        />
        <DistributionBar
          label="Small (1)"
          count={distribution.smallHolders.count}
          inscriptions={distribution.smallHolders.totalInscriptions}
          percentage={distribution.smallHolders.percentage}
          color="from-green-500 to-emerald-500"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[#FF6B00]/10">
        <StatCard
          label="Whale Avg"
          value={distribution.whales.averageHoldings.toFixed(1)}
          subtitle="inscriptions"
        />
        <StatCard
          label="Large Avg"
          value={distribution.largeHolders.averageHoldings.toFixed(1)}
          subtitle="inscriptions"
        />
        <StatCard
          label="Medium Avg"
          value={distribution.mediumHolders.averageHoldings.toFixed(1)}
          subtitle="inscriptions"
        />
        <StatCard
          label="Small Avg"
          value={distribution.smallHolders.averageHoldings.toFixed(1)}
          subtitle="inscriptions"
        />
      </div>
    </div>
  );
}

interface DistributionBarProps {
  label: string;
  count: number;
  inscriptions: number;
  percentage: number;
  color: string;
}

function DistributionBar({ label, count, inscriptions, percentage, color }: DistributionBarProps) {
  return (
    <div>
      {/* Label and Stats */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium text-sm">{label}</span>
          <span className="text-gray-400 text-xs">
            {count.toLocaleString()} holders
          </span>
        </div>
        <div className="text-right">
          <div className="text-white font-semibold text-sm">{percentage.toFixed(1)}%</div>
          <div className="text-gray-500 text-xs">
            {inscriptions.toLocaleString()} items
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-8 bg-gray-800/50 rounded-lg overflow-hidden relative">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {/* Inner Label */}
        {percentage > 10 && (
          <div className="absolute inset-0 flex items-center px-3">
            <span className="text-white text-xs font-semibold drop-shadow-lg">
              {percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <div className="text-center">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="text-white font-semibold text-lg">{value}</div>
      {subtitle && <div className="text-gray-500 text-xs">{subtitle}</div>}
    </div>
  );
}
