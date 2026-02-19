'use client';

import React, { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface AssetEntry {
  symbol: string;
  name?: string;
  price?: number;
  changePercent: number;
}

export interface MultiAssetData {
  crypto?: AssetEntry[];
  forex?: AssetEntry[];
  commodities?: AssetEntry[];
  indices?: AssetEntry[];
  stocks?: AssetEntry[];
}

interface MarketBreadthProps {
  data: MultiAssetData | null;
  loading: boolean;
}

type Category = 'crypto' | 'forex' | 'commodities' | 'indices' | 'stocks';

const CATEGORY_LABELS: Record<Category, string> = {
  crypto: 'CRYPTO',
  forex: 'FOREX',
  commodities: 'COMMODITIES',
  indices: 'INDICES',
  stocks: 'STOCKS',
};

const CATEGORY_COLORS: Record<Category, string> = {
  crypto: '#F7931A',
  forex: '#3b82f6',
  commodities: '#eab308',
  indices: '#00ff88',
  stocks: '#a855f7',
};

interface FlatAsset {
  symbol: string;
  changePercent: number;
  category: Category;
}

interface CategoryStats {
  category: Category;
  avgChange: number;
  count: number;
}

function SkeletonContent() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 bg-[#2a2a3e]/40 rounded" />
      <div className="h-12 bg-[#2a2a3e]/30 rounded" />
      <div className="h-12 bg-[#2a2a3e]/30 rounded" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 bg-[#2a2a3e]/20 rounded" />
        ))}
      </div>
    </div>
  );
}

export function MarketBreadth({ data, loading }: MarketBreadthProps) {
  const { allAssets, advancing, declining, strongest, weakest, categoryStats } = useMemo(() => {
    if (!data) {
      return {
        allAssets: [] as FlatAsset[],
        advancing: 0,
        declining: 0,
        strongest: [] as FlatAsset[],
        weakest: [] as FlatAsset[],
        categoryStats: [] as CategoryStats[],
      };
    }

    const flat: FlatAsset[] = [];
    const categories: Category[] = ['crypto', 'forex', 'commodities', 'indices', 'stocks'];

    for (const cat of categories) {
      const assets = data[cat];
      if (!assets) continue;
      for (const a of assets) {
        flat.push({ symbol: a.symbol, changePercent: a.changePercent ?? 0, category: cat });
      }
    }

    const adv = flat.filter((a) => a.changePercent > 0).length;
    const dec = flat.filter((a) => a.changePercent < 0).length;

    const sorted = [...flat].sort((a, b) => b.changePercent - a.changePercent);
    const top3 = sorted.slice(0, 3);
    const bottom3 = sorted.slice(-3).reverse();

    const stats: CategoryStats[] = categories
      .map((cat) => {
        const items = flat.filter((a) => a.category === cat);
        if (items.length === 0) return null;
        const avg = items.reduce((s, a) => s + a.changePercent, 0) / items.length;
        return { category: cat, avgChange: avg, count: items.length };
      })
      .filter(Boolean) as CategoryStats[];

    return {
      allAssets: flat,
      advancing: adv,
      declining: dec,
      strongest: top3,
      weakest: bottom3,
      categoryStats: stats,
    };
  }, [data]);

  const total = advancing + declining;
  const advPercent = total > 0 ? (advancing / total) * 100 : 50;

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
          Market Breadth
        </span>
      </div>

      {loading ? (
        <SkeletonContent />
      ) : allAssets.length === 0 ? (
        <div className="py-6 text-center text-[10px] text-[#e4e4e7]/30 font-mono">
          No market data available
        </div>
      ) : (
        <div className="space-y-4">
          {/* Advances / Declines bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-[#00ff88]">
                {advancing} advancing
              </span>
              <span className="text-[10px] font-mono text-[#ff3366]">
                {declining} declining
              </span>
            </div>
            <div className="h-3 bg-[#0a0a0f] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#00ff88]/60 transition-all duration-500 rounded-l-full"
                style={{ width: `${advPercent}%` }}
              />
              <div
                className="h-full bg-[#ff3366]/60 transition-all duration-500 rounded-r-full"
                style={{ width: `${100 - advPercent}%` }}
              />
            </div>
            <div className="text-center mt-1">
              <span className="text-[9px] font-mono text-[#e4e4e7]/25">
                {total} assets tracked
              </span>
            </div>
          </div>

          {/* Strongest / Weakest */}
          <div className="grid grid-cols-2 gap-2">
            {/* Strongest */}
            <div className="bg-[#0a0a0f] rounded border border-[#2a2a3e]/50 p-2.5">
              <div className="flex items-center gap-1 mb-2">
                <TrendingUp className="w-3 h-3 text-[#00ff88]" />
                <span className="text-[9px] font-mono text-[#e4e4e7]/40 uppercase">
                  Strongest
                </span>
              </div>
              <div className="space-y-1.5">
                {strongest.map((a, i) => (
                  <div key={a.symbol} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#e4e4e7]/70">
                      {i + 1}. {a.symbol}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#00ff88]">
                      +{a.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weakest */}
            <div className="bg-[#0a0a0f] rounded border border-[#2a2a3e]/50 p-2.5">
              <div className="flex items-center gap-1 mb-2">
                <TrendingDown className="w-3 h-3 text-[#ff3366]" />
                <span className="text-[9px] font-mono text-[#e4e4e7]/40 uppercase">
                  Weakest
                </span>
              </div>
              <div className="space-y-1.5">
                {weakest.map((a, i) => (
                  <div key={a.symbol} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#e4e4e7]/70">
                      {i + 1}. {a.symbol}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#ff3366]">
                      {a.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <div className="text-[9px] font-mono text-[#e4e4e7]/40 uppercase mb-2">
              Category Avg Change
            </div>
            <div className="space-y-1.5">
              {categoryStats.map((stat) => {
                const isPos = stat.avgChange >= 0;
                const barWidth = Math.min(Math.abs(stat.avgChange) * 10, 100); // Scale: 10% = full width
                const color = CATEGORY_COLORS[stat.category];

                return (
                  <div key={stat.category} className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-mono w-[78px] flex-shrink-0 text-right"
                      style={{ color }}
                    >
                      {CATEGORY_LABELS[stat.category]}
                    </span>
                    <div className="flex-1 h-2.5 bg-[#0a0a0f] rounded-full overflow-hidden relative">
                      {/* Center line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#2a2a3e]" />
                      {isPos ? (
                        <div
                          className="absolute top-0 bottom-0 left-1/2 rounded-r-full transition-all duration-500"
                          style={{
                            width: `${barWidth / 2}%`,
                            backgroundColor: '#00ff88',
                            opacity: 0.5,
                          }}
                        />
                      ) : (
                        <div
                          className="absolute top-0 bottom-0 right-1/2 rounded-l-full transition-all duration-500"
                          style={{
                            width: `${barWidth / 2}%`,
                            backgroundColor: '#ff3366',
                            opacity: 0.5,
                          }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold w-12 text-right ${
                        isPos ? 'text-[#00ff88]' : 'text-[#ff3366]'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {stat.avgChange.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
