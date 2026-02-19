'use client';

import React, { useState, useMemo } from 'react';

export interface WatchlistColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface WatchlistTableProps {
  title: string;
  columns: WatchlistColumn[];
  data: Record<string, any>[] | null;
  loading: boolean;
  error?: string | null;
  defaultSort?: { key: string; asc: boolean };
  maxHeight?: string;
  onRetry?: () => void;
}

export function WatchlistTable({
  title,
  columns,
  data,
  loading,
  error,
  defaultSort,
  maxHeight,
  onRetry,
}: WatchlistTableProps) {
  const [sort, setSort] = useState<{ key: string; asc: boolean }>(
    defaultSort ?? { key: columns[0]?.key ?? '', asc: true }
  );

  const sortedData = useMemo(() => {
    if (!data) return null;
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = Number(aVal) - Number(bVal);
      return sort.asc ? diff : -diff;
    });
    return sorted;
  }, [data, sort]);

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: false }
    );
  };

  const count = data?.length ?? 0;

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            {title}
          </h3>
          {count > 0 && (
            <span className="text-[10px] font-mono bg-[#F7931A]/20 text-[#F7931A] px-1.5 py-0.5 rounded">
              {count}
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 h-7">
              {columns.map((col, ci) => (
                <div
                  key={ci}
                  className="animate-pulse bg-[#2a2a3e] rounded h-3 flex-1"
                  style={{ maxWidth: ci === 0 ? '60px' : '80px' }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && !error && sortedData && (
        <div
          className={maxHeight ? 'overflow-y-auto' : ''}
          style={maxHeight ? { maxHeight } : undefined}
        >
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2a2a3e]/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-1.5 font-semibold text-[#e4e4e7]/40 cursor-pointer hover:text-[#e4e4e7]/70 select-none transition-colors ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sort.key === col.key && (
                        <span className="text-[#F7931A] text-[10px]">
                          {sort.asc ? '\u25B2' : '\u25BC'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, ri) => (
                <tr
                  key={ri}
                  className="h-7 hover:bg-[#2a2a3e]/30 transition-colors border-b border-[#2a2a3e]/20 last:border-0"
                >
                  {columns.map((col) => {
                    const value = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-0 text-[#e4e4e7] ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(value, row) : defaultRender(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sortedData && sortedData.length === 0 && (
        <div className="px-3 py-4 text-center text-xs font-mono text-[#e4e4e7]/30">
          No data available
        </div>
      )}
    </div>
  );
}

function defaultRender(value: any): React.ReactNode {
  if (value == null) return <span className="text-[#e4e4e7]/30">--</span>;
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

export default WatchlistTable;
