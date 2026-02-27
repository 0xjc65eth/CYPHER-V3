'use client';

import React, { useMemo } from 'react';
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

// Display names and units for commodity symbols
const COMMODITY_META: Record<string, { name: string; unit: string }> = {
  'XAU/USD': { name: 'Gold', unit: 'oz' },
  'XAG/USD': { name: 'Silver', unit: 'oz' },
  'CL=F':    { name: 'Crude Oil WTI', unit: 'barrel' },
  'NG=F':    { name: 'Natural Gas', unit: 'MMBtu' },
  'PL=F':    { name: 'Platinum', unit: 'oz' },
  'HG=F':    { name: 'Copper', unit: 'lb' },
};

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n === 0) return 'N/A';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n === 0) return '--';
  return `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n === 0) return '--';
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
    render: (value: string, row: any) => (
      <span className="font-bold text-[#F7931A]">
        {value || COMMODITY_META[row?.symbol]?.name || row?.symbol || 'N/A'}
      </span>
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
    render: (value: string, row: any) => (
      <span className="text-[#e4e4e7]/40">
        {value || COMMODITY_META[row?.symbol]?.unit || '--'}
      </span>
    ),
  },
];

/**
 * Normalize commodity data: apply correct display names and units from COMMODITY_META
 * when the API returns generic or missing values.
 */
function normalizeCommodities(data: CommodityAsset[]): CommodityAsset[] {
  return data.map((item) => {
    const meta = COMMODITY_META[item.symbol];
    return {
      ...item,
      name: item.name && item.name !== item.symbol ? item.name : meta?.name || item.symbol,
      unit: item.unit && item.unit !== 'oz' ? item.unit : meta?.unit || item.unit || '--',
      price: item.price ?? 0,
      change: item.change ?? 0,
      changePercent: item.changePercent ?? 0,
    };
  });
}

export function CommoditiesWatchlist({ data, loading, error, onRetry }: CommoditiesWatchlistProps) {
  const normalizedData = useMemo(() => {
    if (!data) return null;
    return normalizeCommodities(data);
  }, [data]);

  return (
    <WatchlistTable
      title="COMMODITIES"
      columns={columns}
      data={normalizedData as Record<string, any>[] | null}
      loading={loading}
      error={error}
      defaultSort={{ key: 'name', asc: true }}
      onRetry={onRetry}
    />
  );
}

export default CommoditiesWatchlist;
