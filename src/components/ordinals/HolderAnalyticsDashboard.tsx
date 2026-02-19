'use client';

import React, { useState } from 'react';
import { Users, TrendingUp, PieChart, Trophy } from 'lucide-react';
import { HolderMetrics } from './HolderMetrics';
import { HolderDistribution } from './HolderDistribution';
import { WhaleTracker } from './WhaleTracker';
import { CollectionLeaderboard } from './CollectionLeaderboard';

interface HolderAnalyticsDashboardProps {
  collections: Array<{ symbol: string; name: string }>;
  selectedCollection?: string;
  className?: string;
}

export function HolderAnalyticsDashboard({
  collections,
  selectedCollection,
  className = ''
}: HolderAnalyticsDashboardProps) {
  const [activeCollection, setActiveCollection] = useState<string>(
    selectedCollection || collections[0]?.symbol || ''
  );
  const [viewMode, setViewMode] = useState<'overview' | 'distribution' | 'whales' | 'leaderboard'>('overview');

  if (!activeCollection || collections.length === 0) {
    return (
      <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
        <div className="text-gray-400 text-sm">
          No collections available for holder analytics
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Collection Selector */}
      <div className="bg-black/40 border border-[#FF6B00]/20 rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#FF6B00] font-semibold text-xl flex items-center gap-2">
            <Users className="w-5 h-5" />
            Holder Analytics
          </h2>

          {/* Collection Selector */}
          <select
            value={activeCollection}
            onChange={(e) => setActiveCollection(e.target.value)}
            className="px-4 py-2 bg-black/60 border border-[#FF6B00]/30 rounded text-white text-sm focus:outline-none focus:border-[#FF6B00]"
          >
            {collections.map((col) => (
              <option key={col.symbol} value={col.symbol}>
                {col.name || col.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          <ViewModeButton
            icon={<TrendingUp className="w-4 h-4" />}
            label="Overview"
            active={viewMode === 'overview'}
            onClick={() => setViewMode('overview')}
          />
          <ViewModeButton
            icon={<PieChart className="w-4 h-4" />}
            label="Distribution"
            active={viewMode === 'distribution'}
            onClick={() => setViewMode('distribution')}
          />
          <ViewModeButton
            icon={<span className="text-lg">🐋</span>}
            label="Whales"
            active={viewMode === 'whales'}
            onClick={() => setViewMode('whales')}
          />
          <ViewModeButton
            icon={<Trophy className="w-4 h-4" />}
            label="Leaderboard"
            active={viewMode === 'leaderboard'}
            onClick={() => setViewMode('leaderboard')}
          />
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          <HolderMetrics collectionSymbol={activeCollection} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HolderDistribution collectionSymbol={activeCollection} />
            <div className="space-y-6">
              <div className="bg-black/40 border border-[#FF6B00]/20 rounded p-4">
                <h4 className="text-[#FF6B00] font-medium mb-3">Quick Whale Stats</h4>
                <WhaleQuickStats collectionSymbol={activeCollection} />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'distribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HolderMetrics collectionSymbol={activeCollection} />
          <HolderDistribution collectionSymbol={activeCollection} />
        </div>
      )}

      {viewMode === 'whales' && (
        <WhaleTracker collectionSymbol={activeCollection} />
      )}

      {viewMode === 'leaderboard' && (
        <CollectionLeaderboard collectionSymbol={activeCollection} limit={100} />
      )}
    </div>
  );
}

interface ViewModeButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ViewModeButton({ icon, label, active, onClick }: ViewModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all ${
        active
          ? 'bg-[#FF6B00] text-white'
          : 'bg-black/40 text-gray-400 hover:bg-black/60 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Quick whale stats component for overview
function WhaleQuickStats({ collectionSymbol }: { collectionSymbol: string }) {
  // This would use the whale tracker hook
  // For now, placeholder
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">
        Whale tracking and alerts will appear here
      </div>
      <div className="text-sm text-gray-500">
        Switch to Whales tab for detailed analysis
      </div>
    </div>
  );
}
