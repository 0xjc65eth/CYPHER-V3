'use client';

import React, { useMemo } from 'react';
import { Grid3x3 } from 'lucide-react';

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

interface AssetHeatmapProps {
  data: MultiAssetData | null;
  loading: boolean;
}

type Category = 'crypto' | 'forex' | 'commodities' | 'indices' | 'stocks';

const CATEGORY_DOT_COLOR: Record<Category, string> = {
  crypto: '#F7931A',
  forex: '#3b82f6',
  commodities: '#eab308',
  indices: '#00ff88',
  stocks: '#a855f7',
};

// Top assets get larger cells
const LARGE_SYMBOLS = new Set(['BTC', 'ETH', 'SPX', 'NDX', 'DXY', 'GOLD']);

function changeToColor(change: number): string {
  const abs = Math.abs(change);
  const intensity = Math.min(abs / 5, 1); // 5% = max intensity

  if (change > 0) {
    const r = Math.round(0 + (0 - 0) * intensity);
    const g = Math.round(30 + (255 - 30) * intensity);
    const b = Math.round(20 + (136 - 20) * intensity);
    const a = 0.15 + intensity * 0.45;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } else if (change < 0) {
    const r = Math.round(255 * (0.15 + intensity * 0.45));
    const g = Math.round(51 * (0.15 + intensity * 0.15));
    const b = Math.round(102 * (0.15 + intensity * 0.25));
    const a = 0.15 + intensity * 0.45;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return 'rgba(42, 42, 62, 0.3)';
}

function SkeletonHeatmap() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className={`bg-[#2a2a3e]/30 animate-pulse rounded h-14 ${
            i < 2 ? 'col-span-2' : ''
          }`}
        />
      ))}
    </div>
  );
}

interface FlatAsset {
  symbol: string;
  name: string;
  changePercent: number;
  category: Category;
  isLarge: boolean;
  hasData: boolean;
}

export function AssetHeatmap({ data, loading }: AssetHeatmapProps) {
  const flatAssets = useMemo<FlatAsset[]>(() => {
    if (!data) return [];

    const result: FlatAsset[] = [];
    const categories: Category[] = ['crypto', 'forex', 'commodities', 'indices', 'stocks'];

    for (const cat of categories) {
      const assets = data[cat];
      if (!assets) continue;
      for (const asset of assets) {
        const a = asset as any;
        // Crypto uses change24h, forex/commodities/indices/stocks use changePercent
        const rawChange = a.changePercent ?? a.change24h ?? null;
        const change = typeof rawChange === 'number' ? rawChange : 0;
        const hasData = typeof rawChange === 'number';
        // For forex, use 'pair' as symbol if 'symbol' is missing
        const symbol = a.symbol || a.pair || '';
        result.push({
          symbol,
          name: a.name || symbol,
          changePercent: change,
          category: cat,
          isLarge: LARGE_SYMBOLS.has(symbol.toUpperCase()),
          hasData,
        });
      }
    }

    // Sort by absolute change descending
    result.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    return result;
  }, [data]);

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Grid3x3 className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
          Market Heatmap
        </span>
        {flatAssets.length > 0 && (
          <span className="text-[9px] font-mono text-[#e4e4e7]/30 ml-auto">
            {flatAssets.length} assets
          </span>
        )}
      </div>

      {loading ? (
        <SkeletonHeatmap />
      ) : flatAssets.length === 0 ? (
        <div className="py-8 text-center text-[10px] text-[#e4e4e7]/30 font-mono">
          No market data available
        </div>
      ) : (
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          }}
        >
          {flatAssets.map((asset) => {
            const bg = changeToColor(asset.changePercent);
            const textColor =
              asset.changePercent > 0
                ? 'text-[#00ff88]'
                : asset.changePercent < 0
                ? 'text-[#ff3366]'
                : 'text-[#e4e4e7]/50';

            const noData = !asset.hasData;

            return (
              <div
                key={`${asset.category}-${asset.symbol}`}
                className={`relative rounded p-2 flex flex-col items-center justify-center transition-all hover:brightness-125 cursor-default ${
                  asset.isLarge ? 'col-span-2 min-h-[56px]' : 'min-h-[48px]'
                }${noData ? ' opacity-40' : ''}`}
                style={{ backgroundColor: noData ? 'rgba(42, 42, 62, 0.3)' : bg }}
                title={`${asset.name} (${asset.category}): ${noData ? 'N/A' : `${asset.changePercent > 0 ? '+' : ''}${asset.changePercent.toFixed(2)}%`}`}
              >
                {/* Category dot */}
                <div
                  className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_DOT_COLOR[asset.category] }}
                />
                <span className="text-xs font-bold text-[#e4e4e7] font-mono leading-none">
                  {asset.symbol}
                </span>
                <span className={`text-[10px] font-mono font-medium ${noData ? 'text-[#e4e4e7]/30' : textColor} leading-none mt-1`}>
                  {noData ? 'N/A' : `${asset.changePercent > 0 ? '+' : ''}${asset.changePercent.toFixed(2)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {flatAssets.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-[#2a2a3e]/30">
          {(Object.entries(CATEGORY_DOT_COLOR) as [Category, string][]).map(([cat, color]) => {
            const count = flatAssets.filter((a) => a.category === cat).length;
            if (count === 0) return null;
            return (
              <div key={cat} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[8px] font-mono text-[#e4e4e7]/30 uppercase">{cat}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
