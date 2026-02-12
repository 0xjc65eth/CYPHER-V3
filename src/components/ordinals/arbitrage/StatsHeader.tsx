'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/primitives/Card';
import type { OrdinalsArbitrageOpportunity } from '@/types/ordinals-arbitrage';

interface StatsHeaderProps {
  opportunities: OrdinalsArbitrageOpportunity[];
  lastUpdated: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}

export function StatsHeader({
  opportunities,
  lastUpdated,
  autoRefresh,
  onToggleAutoRefresh,
}: StatsHeaderProps) {
  // Calculate statistics from opportunities array
  const stats = useMemo(() => {
    const totalCount = opportunities.length;

    // Calculate average net profit percentage
    const avgNetProfit = totalCount > 0
      ? opportunities.reduce((sum, opp) => sum + opp.netProfitPercentage, 0) / totalCount
      : 0;

    // Count high value opportunities (>15% profit)
    const highValueCount = opportunities.filter(
      opp => opp.netProfitPercentage > 15
    ).length;

    return {
      totalCount,
      avgNetProfit,
      highValueCount,
    };
  }, [opportunities]);

  // Format time elapsed since last update
  const timeElapsed = useMemo(() => {
    const now = Date.now();
    const elapsed = Math.floor((now - lastUpdated) / 1000);

    if (elapsed < 60) return `${elapsed}s ago`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    return `${Math.floor(elapsed / 3600)}h ago`;
  }, [lastUpdated]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Opportunities */}
      <Card variant="bordered" padding="md">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Total Opportunities
          </div>
          <div className="text-3xl font-bold text-[#f59e0b]">
            {stats.totalCount}
          </div>
        </div>
      </Card>

      {/* Average Net Profit */}
      <Card variant="bordered" padding="md">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Avg Net Profit
          </div>
          <div className="text-3xl font-bold text-[#f59e0b]">
            {stats.avgNetProfit.toFixed(2)}%
          </div>
        </div>
      </Card>

      {/* High Value Count */}
      <Card variant="bordered" padding="md">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            High Value (&gt;15%)
          </div>
          <div className="text-3xl font-bold text-[#f59e0b]">
            {stats.highValueCount}
          </div>
        </div>
      </Card>

      {/* Live Indicator & Auto-Refresh Toggle */}
      <Card variant="bordered" padding="md">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={`h-2 w-2 rounded-full ${
                  autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
                {autoRefresh && (
                  <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
                )}
              </div>
              <span className="text-xs font-medium text-white">
                {autoRefresh ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Updated {timeElapsed}
          </div>

          <button
            onClick={onToggleAutoRefresh}
            className={`w-full mt-2 px-3 py-2 text-xs font-semibold rounded transition-colors ${
              autoRefresh
                ? 'bg-[#f59e0b] text-black hover:bg-[#f59e0b]/90'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {autoRefresh ? 'PAUSE AUTO-REFRESH' : 'ENABLE AUTO-REFRESH'}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default StatsHeader;
