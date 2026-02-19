'use client';

import React from 'react';
import { useHolderMetrics } from '@/hooks/useHolderMetrics';
import type { ConcentrationMetrics } from '@/types/ordinals-holders';

interface HolderMetricsProps {
  collectionSymbol: string;
  className?: string;
}

export function HolderMetrics({ collectionSymbol, className = '' }: HolderMetricsProps) {
  const { data, isLoading, error } = useHolderMetrics(collectionSymbol);

  if (isLoading) {
    return (
      <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#FF6B00]/20 rounded w-1/3"></div>
          <div className="h-8 bg-[#FF6B00]/20 rounded"></div>
          <div className="h-8 bg-[#FF6B00]/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-black/40 border border-red-500/20 rounded p-6 ${className}`}>
        <div className="text-red-400 text-sm">
          Failed to load holder metrics
        </div>
      </div>
    );
  }

  const { metrics, concentrationMetrics } = data;

  return (
    <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[#FF6B00] font-semibold text-lg">Holder Metrics</h3>
        <div className="text-xs text-gray-400">
          Updated: {new Date(metrics.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Basic Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Holders"
          value={metrics.totalHolders.toLocaleString()}
          icon="👥"
        />
        <MetricCard
          label="Total Supply"
          value={metrics.totalSupply.toLocaleString()}
          icon="📦"
        />
        <MetricCard
          label="Holder %"
          value={`${metrics.holdersPercentage.toFixed(1)}%`}
          subtitle={`${metrics.totalHolders}/${metrics.totalSupply}`}
          icon="📊"
        />
        <MetricCard
          label="Avg Holdings"
          value={metrics.averageHoldingsPerAddress.toFixed(2)}
          subtitle="per address"
          icon="⚖️"
        />
      </div>

      {/* Concentration Metrics */}
      {concentrationMetrics && (
        <ConcentrationSection metrics={concentrationMetrics} />
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

function MetricCard({ label, value, subtitle, icon }: MetricCardProps) {
  return (
    <div className="bg-black/60 border border-[#FF6B00]/10 rounded p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <div className="text-xs text-gray-400">{label}</div>
      </div>
      <div className="text-white font-semibold text-xl">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

interface ConcentrationSectionProps {
  metrics: ConcentrationMetrics;
}

function ConcentrationSection({ metrics }: ConcentrationSectionProps) {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Very High': return 'text-red-400';
      case 'High': return 'text-orange-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-[#FF6B00]/10">
      <h4 className="text-[#FF6B00] font-medium mb-4">Concentration Analysis</h4>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Concentration Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Top 10 Hold</span>
            <span className="text-white font-semibold">
              {metrics.top10Concentration.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Top 50 Hold</span>
            <span className="text-white font-semibold">
              {metrics.top50Concentration.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Top 100 Hold</span>
            <span className="text-white font-semibold">
              {metrics.top100Concentration.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Right: Indices & Rating */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Gini Coefficient</span>
            <span className="text-white font-semibold">
              {metrics.giniCoefficient.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">HHI Index</span>
            <span className="text-white font-semibold">
              {metrics.herfindahlIndex.toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Concentration</span>
            <span className={`font-semibold ${getRatingColor(metrics.concentrationRating)}`}>
              {metrics.concentrationRating}
            </span>
          </div>
        </div>
      </div>

      {/* Concentration Bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B00] to-red-500 transition-all duration-500"
            style={{ width: `${Math.min(metrics.top10Concentration, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Top 10 holders control {metrics.top10Concentration.toFixed(1)}% of supply
        </div>
      </div>
    </div>
  );
}
