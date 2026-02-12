// =============================================================================
// CYPHER V3 - Runes UI Components
// Componentes de interface para exibição de dados de Runes
// Módulo independente - não depende de Ordinals
// =============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  Bell,
  BellOff,
  Download,
  Search,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Info,
  X,
  Coins,
  Hammer,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { ProcessedRune, RunePriceAlert, RuneMarketInsight, RuneFilters, RUNE_SORT_OPTIONS } from '../types/runes';

// -----------------------------------------------------------------------------
// Sparkline - Mini gráfico de linha
// -----------------------------------------------------------------------------

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#f97316',
  showTrend = true,
  className = '',
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className={`w-[${width}px] h-[${height}px] ${className}`} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  const isPositive = data[data.length - 1] >= data[0];
  const trendColor = showTrend ? (isPositive ? '#22c55e' : '#ef4444') : color;
  const trendFill = showTrend
    ? (isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)')
    : 'rgba(249, 115, 22, 0.1)';

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path d={areaD} fill={trendFill} />
      <path d={pathD} fill="none" stroke={trendColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r={2} fill={trendColor} />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// PriceChange - Badge de variação de preço
// -----------------------------------------------------------------------------

interface PriceChangeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function PriceChange({
  value,
  size = 'md',
  showIcon = true,
  className = '',
}: PriceChangeProps) {
  const isPositive = value >= 0;
  const isNeutral = Math.abs(value) < 0.01;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const colorClasses = isNeutral
    ? 'bg-zinc-800 text-zinc-400'
    : isPositive
    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
    : 'bg-red-500/10 text-red-400 border border-red-500/20';

  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeClasses[size]} ${colorClasses} ${className}`}
    >
      {showIcon && !isNeutral && <Icon className="w-3 h-3" />}
      <span>
        {isPositive && !isNeutral ? '+' : ''}
        {value.toFixed(2)}%
      </span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// MintBadge - Badge de status de mint
// -----------------------------------------------------------------------------

interface MintBadgeProps {
  mintable: boolean;
  mintProgress: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function MintBadge({
  mintable,
  mintProgress,
  size = 'sm',
  className = '',
}: MintBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  if (!mintable) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md ${sizeClasses[size]} bg-zinc-800 text-zinc-500 ${className}`}>
        <CheckCircle className="w-3 h-3" />
        <span>Minted</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-md ${sizeClasses[size]} bg-orange-500/10 text-orange-400 border border-orange-500/20 ${className}`}>
      <Hammer className="w-3 h-3" />
      <span>{mintProgress.toFixed(0)}% Minted</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// TurboBadge - Badge de Turbo Rune
// -----------------------------------------------------------------------------

interface TurboBadgeProps {
  turbo: boolean;
  className?: string;
}

export function TurboBadge({ turbo, className = '' }: TurboBadgeProps) {
  if (!turbo) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 ${className}`}>
      <Zap className="w-3 h-3" />
      <span>Turbo</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// FavoriteButton
// -----------------------------------------------------------------------------

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({
  isFavorite,
  onClick,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        isFavorite
          ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
          : 'text-zinc-500 hover:text-yellow-400 hover:bg-zinc-800'
      } ${className}`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? <Star className={`${sizeClasses[size]} fill-current`} /> : <StarOff className={sizeClasses[size]} />}
    </button>
  );
}

// -----------------------------------------------------------------------------
// AlertButton
// -----------------------------------------------------------------------------

interface AlertButtonProps {
  hasAlert: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AlertButton({
  hasAlert,
  onClick,
  size = 'md',
  className = '',
}: AlertButtonProps) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        hasAlert
          ? 'text-orange-400 bg-orange-400/10 hover:bg-orange-400/20'
          : 'text-zinc-500 hover:text-orange-400 hover:bg-zinc-800'
      } ${className}`}
      title={hasAlert ? 'Manage alert' : 'Create price alert'}
    >
      {hasAlert ? <Bell className={`${sizeClasses[size]} fill-current`} /> : <BellOff className={sizeClasses[size]} />}
    </button>
  );
}

// -----------------------------------------------------------------------------
// RuneInsightCard
// -----------------------------------------------------------------------------

interface RuneInsightCardProps {
  insight: RuneMarketInsight;
  className?: string;
}

export function RuneInsightCard({ insight, className = '' }: RuneInsightCardProps) {
  const typeStyles = {
    bullish: { bg: 'bg-green-500/10', border: 'border-green-500/20', icon: TrendingUp, iconColor: 'text-green-400' },
    bearish: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: TrendingDown, iconColor: 'text-red-400' },
    neutral: { bg: 'bg-zinc-800', border: 'border-zinc-700', icon: Info, iconColor: 'text-zinc-400' },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Info, iconColor: 'text-blue-400' },
    mint: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Hammer, iconColor: 'text-orange-400' },
  };

  const style = typeStyles[insight.type];
  const Icon = style.icon;

  return (
    <div className={`p-4 rounded-xl border ${style.bg} ${style.border} ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.bg}`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm">{insight.title}</h4>
          <p className="text-zinc-400 text-xs mt-1">{insight.description}</p>
          {insight.metric && (
            <p className={`text-sm font-medium mt-2 ${style.iconColor}`}>{insight.metric}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// RuneFilterBar
// -----------------------------------------------------------------------------

interface RuneFilterBarProps {
  filters: RuneFilters;
  onFiltersChange: (filters: RuneFilters) => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
  filteredCount: number;
  className?: string;
}

export function RuneFilterBar({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading,
  totalCount,
  filteredCount,
  className = '',
}: RuneFilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search Runes..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 transition-colors"
        />
      </div>

      <select
        value={filters.sortBy}
        onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as any })}
        className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-orange-500/50 cursor-pointer"
      >
        {RUNE_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <button
        onClick={() => onFiltersChange({ ...filters, sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })}
        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
      >
        {filters.sortDirection === 'asc' ? '↑' : '↓'}
      </button>

      <button
        onClick={() => onFiltersChange({ ...filters, showOnlyMintable: !filters.showOnlyMintable })}
        className={`p-2 rounded-lg border transition-colors ${
          filters.showOnlyMintable
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
        }`}
        title="Show mintable only"
      >
        <Hammer className="w-4 h-4" />
      </button>

      <button
        onClick={() => onFiltersChange({ ...filters, showOnlyFavorites: !filters.showOnlyFavorites })}
        className={`p-2 rounded-lg border transition-colors ${
          filters.showOnlyFavorites
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
        }`}
        title="Show favorites only"
      >
        <Star className="w-4 h-4" />
      </button>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
        title="Refresh data"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>

      <span className="text-zinc-500 text-sm">
        {filteredCount === totalCount ? `${totalCount} Runes` : `${filteredCount} of ${totalCount}`}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// RuneExportButton
// -----------------------------------------------------------------------------

interface RuneExportButtonProps {
  runes: ProcessedRune[];
  filename?: string;
  className?: string;
}

export function RuneExportButton({
  runes,
  filename = 'runes-market-data',
  className = '',
}: RuneExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const XLSX = await import('xlsx');

      const data = runes.map((r) => ({
        'Rune': r.spacedName,
        'Symbol': r.symbol,
        'Unit Price (sats)': r.floorPriceSats,
        'Unit Price (USD)': r.floorPriceUsd.toFixed(6),
        'Market Cap (BTC)': r.marketCap.toFixed(4),
        'Market Cap (USD)': r.marketCapUsd.toFixed(2),
        'Volume 24h (BTC)': r.volume24h.toFixed(6),
        'Volume 7d (BTC)': r.volume7d.toFixed(6),
        'Change 24h (%)': r.priceChange24h.toFixed(2),
        'Change 7d (%)': r.priceChange7d.toFixed(2),
        'Holders': r.holders,
        'Listed': r.listed,
        'Total Supply': r.totalSupply,
        'Mintable': r.mintable ? 'Yes' : 'No',
        'Mint Progress (%)': r.mintProgress.toFixed(2),
        'Divisibility': r.divisibility,
        'Verified': r.verified ? 'Yes' : 'No',
        'Favorite': r.isFavorite ? 'Yes' : 'No',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Runes');

      const colWidths = Object.keys(data[0] || {}).map((key) => ({ wch: Math.max(key.length, 15) }));
      ws['!cols'] = colWidths;

      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${filename}-${date}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [runes, filename]);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || runes.length === 0}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm font-medium hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'Exporting...' : 'Export Excel'}
    </button>
  );
}

// -----------------------------------------------------------------------------
// RuneAlertModal
// -----------------------------------------------------------------------------

interface RuneAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  rune: ProcessedRune | null;
  onCreateAlert: (alert: Omit<RunePriceAlert, 'id' | 'createdAt' | 'triggered' | 'triggeredAt' | 'notificationSent'>) => void;
}

export function RuneAlertModal({ isOpen, onClose, rune, onCreateAlert }: RuneAlertModalProps) {
  const [alertType, setAlertType] = useState<'below' | 'above'>('below');
  const [targetPrice, setTargetPrice] = useState('');

  React.useEffect(() => {
    if (rune) {
      setTargetPrice(rune.floorPriceSats.toString());
    }
  }, [rune]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rune || !targetPrice) return;

    onCreateAlert({
      runeId: rune.id,
      runeName: rune.spacedName,
      type: alertType,
      targetPrice: parseFloat(targetPrice),
      currentPrice: rune.floorPriceSats,
    });

    onClose();
  };

  if (!isOpen || !rune) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Create Price Alert</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold">
            {rune.symbol}
          </div>
          <div>
            <p className="font-medium text-white">{rune.name}</p>
            <p className="text-sm text-zinc-400">Current: {rune.floorPriceSats.toLocaleString()} sats/unit</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Alert when price goes</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAlertType('below')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                  alertType === 'below'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                }`}
              >
                Below ↓
              </button>
              <button
                type="button"
                onClick={() => setAlertType('above')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                  alertType === 'above'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                }`}
              >
                Above ↑
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Target Price (sats/unit)</label>
            <input
              type="number"
              step="1"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
              placeholder="0"
              required
            />
          </div>

          <div className="flex gap-2">
            {[-20, -10, -5, 5, 10, 20].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  const newPrice = Math.round(rune.floorPriceSats * (1 + pct / 100));
                  setTargetPrice(newPrice.toString());
                  setAlertType(pct < 0 ? 'below' : 'above');
                }}
                className="flex-1 py-1 px-2 rounded text-xs font-medium bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                {pct > 0 ? '+' : ''}{pct}%
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold transition-colors"
          >
            Create Alert
          </button>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Loading & Empty States
// -----------------------------------------------------------------------------

export function RuneLoadingCard() {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-800" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-16 bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-zinc-800 rounded" />
        <div className="h-3 w-3/4 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: { label: string; onClick: () => void };
}

export function RuneEmptyState({ title, description, icon: Icon = Info, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm max-w-sm mb-4">{description}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-medium text-sm transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
