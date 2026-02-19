'use client';

import React from 'react';
import { WatchlistTable, WatchlistColumn } from './WatchlistTable';

interface IndexAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface IndicesWatchlistProps {
  data: { indices: IndexAsset[]; stocks: StockAsset[] } | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function fmtPrice(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

function chgColor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'text-[#e4e4e7]/40';
  return n >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
}

const indexColumns: WatchlistColumn[] = [
  {
    key: 'symbol',
    label: 'Symbol',
    align: 'left',
    render: (value: string) => (
      <span className="font-bold text-[#F7931A]">{value}</span>
    ),
  },
  {
    key: 'name',
    label: 'Name',
    align: 'left',
    render: (value: string) => (
      <span className="text-[#e4e4e7]/60 truncate max-w-[100px] inline-block">{value}</span>
    ),
  },
  {
    key: 'price',
    label: 'Price',
    align: 'right',
    render: (value: number) => (
      <span className="text-[#e4e4e7]">{fmtPrice(value)}</span>
    ),
  },
  {
    key: 'change',
    label: 'Change',
    align: 'right',
    render: (value: number) => (
      <span className={chgColor(value)}>{fmtChange(value)}</span>
    ),
  },
  {
    key: 'changePercent',
    label: 'Change%',
    align: 'right',
    render: (value: number) => (
      <span className={chgColor(value)}>{fmtPct(value)}</span>
    ),
  },
];

const stockColumns: WatchlistColumn[] = [
  {
    key: 'symbol',
    label: 'Symbol',
    align: 'left',
    render: (value: string) => (
      <span className="font-bold text-[#F7931A]">{value}</span>
    ),
  },
  {
    key: 'name',
    label: 'Name',
    align: 'left',
    render: (value: string) => (
      <span className="text-[#e4e4e7]/60 truncate max-w-[100px] inline-block">{value}</span>
    ),
  },
  {
    key: 'price',
    label: 'Price',
    align: 'right',
    render: (value: number) => (
      <span className="text-[#e4e4e7]">{fmtPrice(value)}</span>
    ),
  },
  {
    key: 'change',
    label: 'Change',
    align: 'right',
    render: (value: number) => (
      <span className={chgColor(value)}>{fmtChange(value)}</span>
    ),
  },
  {
    key: 'changePercent',
    label: 'Change%',
    align: 'right',
    render: (value: number) => (
      <span className={chgColor(value)}>{fmtPct(value)}</span>
    ),
  },
  {
    key: 'volume',
    label: 'Volume',
    align: 'right',
    render: (value: number) => (
      <span className="text-[#e4e4e7]/50">{fmtVolume(value)}</span>
    ),
  },
];

export function IndicesWatchlist({ data, loading, error, onRetry }: IndicesWatchlistProps) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            INDICES & STOCKS
          </h3>
          {data && (
            <span className="text-[10px] font-mono bg-[#F7931A]/20 text-[#F7931A] px-1.5 py-0.5 rounded">
              {(data.indices?.length ?? 0) + (data.stocks?.length ?? 0)}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 px-3 py-3 text-sm font-mono text-[#ff3366]/80">
          <span className="text-sm">!!</span>
          <span className="text-xs">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-auto text-[10px] text-[#00ff88] underline hover:no-underline font-mono"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="px-3 py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 h-7">
              <div className="animate-pulse bg-[#2a2a3e] rounded h-3 w-16" />
              <div className="animate-pulse bg-[#2a2a3e] rounded h-3 flex-1" />
              <div className="animate-pulse bg-[#2a2a3e] rounded h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Indices section */}
      {!loading && !error && data?.indices && (
        <>
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-mono text-[#e4e4e7]/30 tracking-wider uppercase">
              Major Indices
            </span>
          </div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2a2a3e]/60">
                {indexColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-1 font-semibold text-[#e4e4e7]/40 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.indices.map((row, ri) => (
                <tr
                  key={ri}
                  className="h-7 hover:bg-[#2a2a3e]/30 transition-colors border-b border-[#2a2a3e]/20"
                >
                  {indexColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-0 text-[#e4e4e7] ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Divider */}
      {!loading && !error && data?.indices && data?.stocks && (
        <div className="mx-3 my-1 border-t border-[#F7931A]/20" />
      )}

      {/* Stocks section */}
      {!loading && !error && data?.stocks && (
        <>
          <div className="px-3 pt-1 pb-1">
            <span className="text-[10px] font-mono text-[#e4e4e7]/30 tracking-wider uppercase">
              Top Stocks
            </span>
          </div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2a2a3e]/60">
                {stockColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-1 font-semibold text-[#e4e4e7]/40 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.stocks.map((row, ri) => (
                <tr
                  key={ri}
                  className="h-7 hover:bg-[#2a2a3e]/30 transition-colors border-b border-[#2a2a3e]/20 last:border-0"
                >
                  {stockColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-0 text-[#e4e4e7] ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && (!data?.indices?.length && !data?.stocks?.length) && (
        <div className="px-3 py-4 text-center text-xs font-mono text-[#e4e4e7]/30">
          No data available
        </div>
      )}
    </div>
  );
}

export default IndicesWatchlist;
