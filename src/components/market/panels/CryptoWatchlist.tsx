'use client';

import React from 'react';
import { WatchlistTable, WatchlistColumn } from './WatchlistTable';

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  image: string;
}

interface CryptoWatchlistProps {
  data: CryptoAsset[] | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function fmtPrice(n: number): string {
  if (n >= 1000) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (n >= 1) {
    return `$${n.toFixed(2)}`;
  }
  return `$${n.toFixed(6)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function chgColor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'text-[#e4e4e7]/40';
  return n >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
}

const columns: WatchlistColumn[] = [
  {
    key: 'symbol',
    label: 'Symbol',
    align: 'left',
    render: (value: string, row: CryptoAsset) => (
      <div className="flex items-center gap-1.5">
        {row.image && (
          <img
            src={row.image}
            alt={row.symbol}
            className="w-4 h-4 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="font-bold text-[#F7931A]">{(value || '').toUpperCase()}</span>
      </div>
    ),
  },
  {
    key: 'name',
    label: 'Name',
    align: 'left',
    render: (value: string) => (
      <span className="text-[#e4e4e7]/60 truncate max-w-[80px] inline-block">{value}</span>
    ),
  },
  {
    key: 'price',
    label: 'Price',
    align: 'right',
    render: (value: number) => <span className="text-[#e4e4e7]">{fmtPrice(value)}</span>,
  },
  {
    key: 'change1h',
    label: '1h%',
    align: 'right',
    render: (value: number) => <span className={chgColor(value)}>{fmtPct(value)}</span>,
  },
  {
    key: 'change24h',
    label: '24h%',
    align: 'right',
    render: (value: number) => <span className={chgColor(value)}>{fmtPct(value)}</span>,
  },
  {
    key: 'change7d',
    label: '7d%',
    align: 'right',
    render: (value: number) => <span className={chgColor(value)}>{fmtPct(value)}</span>,
  },
  {
    key: 'marketCap',
    label: 'Mkt Cap',
    align: 'right',
    render: (value: number) => (
      <span className="text-[#e4e4e7]/70">{value ? fmtCompact(value) : '--'}</span>
    ),
  },
  {
    key: 'volume24h',
    label: 'Volume',
    align: 'right',
    render: (value: number) => (
      <span className="text-[#e4e4e7]/70">{value ? fmtCompact(value) : '--'}</span>
    ),
  },
];

export function CryptoWatchlist({ data, loading, error, onRetry }: CryptoWatchlistProps) {
  const top15 = data ? data.slice(0, 15) : null;

  return (
    <WatchlistTable
      title="CRYPTO"
      columns={columns}
      data={top15 as Record<string, any>[] | null}
      loading={loading}
      error={error}
      defaultSort={{ key: 'marketCap', asc: false }}
      maxHeight="420px"
      onRetry={onRetry}
    />
  );
}

export default CryptoWatchlist;
