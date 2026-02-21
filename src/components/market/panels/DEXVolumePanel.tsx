'use client';

import React from 'react';

interface DEXRanking {
  rank: number;
  project: string;
  volume7d: number;
  volume24h: number;
}

interface DEXVolumePanelProps {
  data: DEXRanking[] | null;
  loading: boolean;
  error?: string | null;
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n === 0) return '--';
  return `$${n.toFixed(0)}`;
}

export function DEXVolumePanel({ data, loading, error }: DEXVolumePanelProps) {
  return (
    <div className="bg-[#0a0a0a] border border-orange-500/20 rounded">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/20 bg-orange-500/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">DEX Volume</span>
        </div>
        <span className="text-[10px] text-gray-500">Dune Analytics</span>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between animate-pulse">
                <div className="h-3 bg-gray-800 rounded w-20" />
                <div className="h-3 bg-gray-800 rounded w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-xs text-red-400 text-center py-4">{error}</div>
        ) : !data || data.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">No DEX data available</div>
        ) : (
          <div className="space-y-0">
            {/* Column headers */}
            <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase mb-1 px-1">
              <span>Protocol</span>
              <div className="flex gap-4">
                <span className="w-16 text-right">24H Vol</span>
                <span className="w-16 text-right">7D Vol</span>
              </div>
            </div>
            {data.slice(0, 8).map((dex) => (
              <div
                key={dex.rank}
                className="flex items-center justify-between py-1 px-1 hover:bg-orange-500/5 rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-mono w-4 text-right">{dex.rank}</span>
                  <span className="text-gray-200 font-medium">{dex.project}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-orange-400 font-mono w-16 text-right">{formatCompact(dex.volume24h)}</span>
                  <span className="text-gray-400 font-mono w-16 text-right">{formatCompact(dex.volume7d)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
