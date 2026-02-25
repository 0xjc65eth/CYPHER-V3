'use client';

import React from 'react';
import { WatchlistTable, WatchlistColumn } from './WatchlistTable';

interface CommodityAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

interface CommoditiesWatchlistProps {
  data: CommodityAsset[] | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function fmtPrice(n: number): string {
  if (!n || n === 0) return 'N/A';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(n: number): string {
  if (!n || n === 0) return '--';
  return `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(n: number): string {
  if (!n || n === 0) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function chgColor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'text-[#e4e4e7]/40';
  return n >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
}

const columns: WatchlistColumn[] = [
  {
    key: 'name',
    label: 'Name',
    align: 'left',
    render: (value: string) => (
      <span className="font-bold text-[#F7931A]">{value}</span>
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
    key: 'unit',
    label: 'Unit',
    align: 'right',
    render: (value: string) => (
      <span className="text-[#e4e4e7]/40">{value}</span>
    ),
  },
];

export function CommoditiesWatchlist({ data, loading, error, onRetry }: CommoditiesWatchlistProps) {
  return (
    <WatchlistTable
      title="COMMODITIES"
      columns={columns}
      data={data as Record<string, any>[] | null}
      loading={loading}
      error={error}
      defaultSort={{ key: 'name', asc: true }}
      onRetry={onRetry}
    />
  );
}

export default CommoditiesWatchlist;
