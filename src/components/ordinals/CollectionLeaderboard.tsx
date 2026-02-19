'use client';

import React from 'react';
import { useCollectionLeaderboard } from '@/hooks/useCollectionLeaderboard';
import type { LeaderboardEntry } from '@/types/ordinals-holders';
import { ExportButton } from '@/components/common/ExportButton';

interface CollectionLeaderboardProps {
  collectionSymbol: string;
  limit?: number;
  className?: string;
}

export function CollectionLeaderboard({
  collectionSymbol,
  limit = 50,
  className = ''
}: CollectionLeaderboardProps) {
  const { data, isLoading, error } = useCollectionLeaderboard(collectionSymbol, limit);

  if (isLoading) {
    return (
      <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#FF6B00]/20 rounded w-1/3"></div>
          <div className="h-64 bg-[#FF6B00]/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-black/40 border border-red-500/20 rounded p-6 ${className}`}>
        <div className="text-red-400 text-sm">
          Failed to load leaderboard
        </div>
      </div>
    );
  }

  const { collectionName, topCollectors, totalCollectors, metadata } = data;

  return (
    <div className={`bg-black/40 border border-[#FF6B00]/20 rounded ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-[#FF6B00]/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[#FF6B00] font-semibold text-lg flex items-center gap-2">
            <span>🏆</span>
            Top Collectors
          </h3>
          <div className="flex items-center gap-3">
            <ExportButton
              type="custom"
              data={topCollectors}
              columns={[
                { key: 'rank', label: 'Rank' },
                { key: 'address', label: 'Address' },
                { key: 'inscriptionCount', label: 'Holdings' },
                { key: 'percentage', label: '% Supply' },
                { key: 'estimatedValue', label: 'Est. Value (BTC)' },
              ]}
              title="Collection Leaderboard"
              filename={`${collectionSymbol}-leaderboard`}
              size="sm"
              variant="outline"
            />
            <div className="text-xs text-gray-400">
              {totalCollectors.toLocaleString()} total collectors
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {collectionName} • Floor: {metadata.floorPrice.toFixed(4)} BTC
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="p-6">
        {topCollectors.length === 0 ? (
          <div className="text-gray-400 text-sm">No collector data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-[#FF6B00]/10">
                  <th className="pb-3 w-16">Rank</th>
                  <th className="pb-3">Collector</th>
                  <th className="pb-3 text-right">Holdings</th>
                  <th className="pb-3 text-right">% Supply</th>
                  <th className="pb-3 text-right">Est. Value</th>
                  <th className="pb-3">Achievements</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {topCollectors.map((collector) => (
                  <LeaderboardRow
                    key={collector.address}
                    collector={collector}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  collector: LeaderboardEntry;
}

function LeaderboardRow({ collector }: LeaderboardRowProps) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-[#FF6B00] font-semibold">#{rank}</span>;
  };

  return (
    <tr className="border-b border-gray-800/50 hover:bg-[#FF6B00]/5 transition-colors">
      {/* Rank */}
      <td className="py-4">
        {getRankDisplay(collector.rank)}
      </td>

      {/* Address */}
      <td className="py-4">
        <code className="text-xs text-gray-300 bg-black/40 px-2 py-1 rounded">
          {collector.address.slice(0, 8)}...{collector.address.slice(-6)}
        </code>
      </td>

      {/* Holdings */}
      <td className="py-4 text-right">
        <span className="text-white font-semibold">
          {collector.inscriptionCount.toLocaleString()}
        </span>
      </td>

      {/* % Supply */}
      <td className="py-4 text-right">
        <span
          className={
            collector.percentage >= 10
              ? 'text-red-400 font-bold'
              : collector.percentage >= 5
              ? 'text-orange-400 font-semibold'
              : collector.percentage >= 1
              ? 'text-yellow-400'
              : 'text-gray-300'
          }
        >
          {collector.percentage.toFixed(2)}%
        </span>
      </td>

      {/* Est. Value */}
      <td className="py-4 text-right">
        {collector.estimatedValue ? (
          <div>
            <div className="text-white font-medium">
              {collector.estimatedValue.toFixed(4)} BTC
            </div>
            {collector.profitLoss !== undefined && (
              <div
                className={`text-xs ${
                  collector.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {collector.profitLoss >= 0 ? '+' : ''}
                {collector.profitLoss.toFixed(2)}%
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>

      {/* Badges */}
      <td className="py-4">
        <div className="flex gap-1 flex-wrap">
          {collector.badges?.map((badge) => (
            <BadgeComponent key={badge.type} badge={badge} />
          ))}
        </div>
      </td>
    </tr>
  );
}

function BadgeComponent({ badge }: { badge: { type: string; label: string; icon?: string } }) {
  const getColors = (type: string) => {
    switch (type) {
      case 'whale':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'top10':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'top50':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'diamond_hands':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'complete_set':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'early_adopter':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs rounded border flex items-center gap-1 ${getColors(
        badge.type
      )}`}
      title={badge.label}
    >
      {badge.icon && <span>{badge.icon}</span>}
      {badge.label}
    </span>
  );
}
