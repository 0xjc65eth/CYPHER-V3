'use client';

import React from 'react';
import { WatchlistTable, WatchlistColumn } from './WatchlistTable';

interface ForexPair {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

interface ForexWatchlistProps {
  data: ForexPair[] | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const JPY_PAIRS = new Set(['USD/JPY']);

function fmtForexPrice(price: number, pair: string): string {
  if (!price || price === 0) return 'N/A';
  const isJpy = JPY_PAIRS.has(pair) || pair.includes('JPY');
  return price.toFixed(isJpy ? 2 : 4);
}

function fmtChange(n: number, pair: string): string {
  if (!n || n === 0) return '--';
  const isJpy = JPY_PAIRS.has(pair) || pair.includes('JPY');
  const prefix = n >= 0 ? '+' : '';
  return `${prefix}${n.toFixed(isJpy ? 2 : 4)}`;
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
    key: 'pair',
    label: 'Pair',
    align: 'left',
    render: (value: string) => (
      <span className="font-bold text-[#F7931A]">{value}</span>
    ),
  },
  {
    key: 'price',
    label: 'Price',
    align: 'right',
    render: (value: number, row: ForexPair) => (
      <span className="text-[#e4e4e7]">{fmtForexPrice(value, row.pair)}</span>
    ),
  },
  {
    key: 'change',
    label: 'Change',
    align: 'right',
    render: (value: number, row: ForexPair) => (
      <span className={chgColor(value)}>{fmtChange(value, row.pair)}</span>
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

export function ForexWatchlist({ data, loading, error, onRetry }: ForexWatchlistProps) {
  return (
    <WatchlistTable
      title="FOREX"
      columns={columns}
      data={data as Record<string, any>[] | null}
      loading={loading}
      error={error}
      defaultSort={{ key: 'pair', asc: true }}
      onRetry={onRetry}
    />
  );
}

export default ForexWatchlist;
