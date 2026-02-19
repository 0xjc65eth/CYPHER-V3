'use client';

import React from 'react';
import { Inscription } from '@/stores/trading-store';

interface CollectionStatsProps {
  collection?: string | null;
  inscriptions: Inscription[];
}

export const CollectionStats: React.FC<CollectionStatsProps> = ({ 
  collection, 
  inscriptions 
}) => {
  // Filter inscriptions by collection if specified
  const filteredInscriptions = collection 
    ? inscriptions.filter(i => i.collection === collection)
    : inscriptions;

  // Calculate statistics
  const totalCount = filteredInscriptions.length;
  const listedCount = filteredInscriptions.filter(i => i.price && i.price > 0).length;
  const floorPrice = Math.min(...filteredInscriptions.map(i => i.price || Infinity).filter(p => p !== Infinity));
  const avgPrice = filteredInscriptions.reduce((sum, i) => sum + (i.price || 0), 0) / listedCount || 0;
  const totalVolume = filteredInscriptions.reduce((sum, i) => sum + (i.price || 0), 0);

  // Rarity distribution
  const rarityCount = filteredInscriptions.reduce((acc, i) => {
    const rarity = i.rarity || 'common';
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent activity (last 24 hours)
  const last24h = Date.now() - (24 * 60 * 60 * 1000);
  const recentInscriptions = filteredInscriptions.filter(i => i.timestamp > last24h);
  const recentVolume = recentInscriptions.reduce((sum, i) => sum + (i.price || 0), 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      case 'uncommon': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full space-y-4">
      {/* Collection Header */}
      <div className="text-center pb-4 border-b border-bloomberg-orange/20">
        <h3 className="text-lg font-terminal text-bloomberg-orange">
          {collection || 'All Collections'}
        </h3>
        <div className="text-xs text-bloomberg-orange/60 mt-1">
          Collection Statistics
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
          <div className="text-xs text-bloomberg-orange/60 mb-1">Total Items</div>
          <div className="text-xl font-terminal text-bloomberg-orange">
            {formatNumber(totalCount)}
          </div>
          <div className="text-xs text-bloomberg-green">
            {listedCount} listed ({listedCount > 0 ? ((listedCount / totalCount) * 100).toFixed(1) : '0'}%)
          </div>
        </div>

        <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
          <div className="text-xs text-bloomberg-orange/60 mb-1">Floor Price</div>
          <div className="text-xl font-terminal text-bloomberg-orange">
            {isFinite(floorPrice) ? `${floorPrice.toFixed(4)}` : '0.0000'}
          </div>
          <div className="text-xs text-bloomberg-orange/60">BTC</div>
        </div>

        <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
          <div className="text-xs text-bloomberg-orange/60 mb-1">Avg Price</div>
          <div className="text-xl font-terminal text-bloomberg-orange">
            {avgPrice.toFixed(4)}
          </div>
          <div className="text-xs text-bloomberg-orange/60">BTC</div>
        </div>

        <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
          <div className="text-xs text-bloomberg-orange/60 mb-1">Total Volume</div>
          <div className="text-xl font-terminal text-bloomberg-orange">
            {totalVolume.toFixed(2)}
          </div>
          <div className="text-xs text-bloomberg-orange/60">BTC</div>
        </div>
      </div>

      {/* Rarity Distribution */}
      <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
        <div className="text-xs text-bloomberg-orange/60 mb-3">Rarity Distribution</div>
        <div className="space-y-2">
          {Object.entries(rarityCount)
            .sort(([,a], [,b]) => b - a)
            .map(([rarity, count]) => (
            <div key={rarity} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getRarityColor(rarity)} bg-current opacity-60`}></div>
                <span className={`text-xs capitalize ${getRarityColor(rarity)}`}>
                  {rarity}
                </span>
              </div>
              <div className="text-xs text-bloomberg-orange/80">
                {count} ({totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0'}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
        <div className="text-xs text-bloomberg-orange/60 mb-3">24h Activity</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-bloomberg-orange/80">New Inscriptions</span>
            <span className="text-xs text-bloomberg-orange font-terminal">
              {recentInscriptions.length}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-bloomberg-orange/80">Volume</span>
            <span className="text-xs text-bloomberg-green font-terminal">
              {recentVolume.toFixed(4)} BTC
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-bloomberg-orange/80">Avg Sale Price</span>
            <span className="text-xs text-bloomberg-orange font-terminal">
              {recentInscriptions.length > 0 
                ? (recentVolume / recentInscriptions.length).toFixed(4) 
                : '0.0000'} BTC
            </span>
          </div>
        </div>
      </div>

      {/* Price History Sparkline */}
      <div className="bg-bloomberg-black-700 p-3 rounded border border-bloomberg-orange/20">
        <div className="text-xs text-bloomberg-orange/60 mb-2">Price Trend (7d)</div>
        {recentInscriptions.length > 0 ? (
          <>
            <div className="h-8 flex items-end justify-between gap-1">
              {/* Use real recent activity distribution across 7 buckets */}
              {Array.from({ length: 7 }, (_, i) => {
                const dayStart = last24h - ((6 - i) * 24 * 60 * 60 * 1000);
                const dayEnd = dayStart + (24 * 60 * 60 * 1000);
                const dayItems = filteredInscriptions.filter(
                  ins => ins.timestamp >= dayStart && ins.timestamp < dayEnd
                );
                const maxDayCount = Math.max(
                  1,
                  ...Array.from({ length: 7 }, (_, j) => {
                    const ds = last24h - ((6 - j) * 24 * 60 * 60 * 1000);
                    const de = ds + (24 * 60 * 60 * 1000);
                    return filteredInscriptions.filter(ins => ins.timestamp >= ds && ins.timestamp < de).length;
                  })
                );
                const height = (dayItems.length / maxDayCount) * 100;
                return (
                  <div
                    key={i}
                    className="bg-bloomberg-orange/60 w-2 rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  ></div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-bloomberg-orange/40 mt-1">
              <span>7d ago</span>
              <span>Today</span>
            </div>
          </>
        ) : (
          <div className="h-8 flex items-center justify-center">
            <span className="text-xs text-bloomberg-orange/40">No activity data available</span>
          </div>
        )}
      </div>

      {totalCount === 0 && (
        <div className="text-center py-8 text-bloomberg-orange/60">
          <div className="text-lg font-terminal">No data available</div>
          <div className="text-sm">
            {collection ? `No inscriptions found for ${collection}` : 'No inscriptions loaded yet'}
          </div>
        </div>
      )}
    </div>
  );
};