// =============================================================================
// CYPHER V3 - Runes Page Component
// Página principal integrando busca dinâmica, filtros, alertas e export
// Módulo independente - não depende de Ordinals
// =============================================================================

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  Layers,
  Activity,
  AlertCircle,
  Coins,
  Hammer,
} from 'lucide-react';

import { ProcessedRune, RuneMarketInsight, RunePriceAlert } from '../types/runes';

import {
  useRunes,
  useRuneMarketMetrics,
  useRuneMarketInsights,
  useRunePriceAlerts,
} from '../hooks/useRunes';

import { RuneCard, RuneTable } from './RuneCard';
import {
  RuneFilterBar,
  RuneExportButton,
  RuneAlertModal,
  RuneInsightCard,
  RuneLoadingCard,
  RuneEmptyState,
} from './RunesUI';

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

function formatBtc(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// -----------------------------------------------------------------------------
// Dashboard Metric Card
// -----------------------------------------------------------------------------

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  highlight?: boolean;
  className?: string;
}

function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  highlight = false,
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-zinc-900/80 backdrop-blur-sm border ${
        highlight ? 'border-orange-500/30' : 'border-zinc-800'
      } ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-orange-500/10' : 'bg-zinc-800'}`}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-orange-500' : 'text-orange-500'}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500 mb-1">{title}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Runes Page Component
// -----------------------------------------------------------------------------

type ViewMode = 'grid' | 'table';

export function RunesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedRune, setSelectedRune] = useState<ProcessedRune | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [triggeredAlerts, setTriggeredAlerts] = useState<RunePriceAlert[]>([]);

  const {
    runes,
    filteredRunes,
    isLoading,
    error,
    btcPrice,
    lastUpdated,
    filters,
    setFilters,
    refresh,
    toggleFavorite,
    favorites,
  } = useRunes({
    autoRefresh: true,
    refreshInterval: 60000,
    limit: 100,
  });

  const metrics = useRuneMarketMetrics(runes, btcPrice);
  const insights = useRuneMarketInsights(metrics, runes);
  const { alerts, addAlert, removeAlert, checkAlerts, clearTriggeredAlerts } = useRunePriceAlerts();

  React.useEffect(() => {
    if (runes.length > 0) {
      const newTriggered = checkAlerts(runes);
      if (newTriggered.length > 0) {
        setTriggeredAlerts(prev => [...prev, ...newTriggered]);
      }
    }
  }, [runes, checkAlerts]);

  const alertRuneIds = useMemo(
    () => new Set(alerts.filter(a => !a.triggered).map(a => a.runeId)),
    [alerts]
  );

  const handleAlertClick = useCallback((rune: ProcessedRune) => {
    setSelectedRune(rune);
    setIsAlertModalOpen(true);
  }, []);

  const handleCreateAlert = useCallback(
    (alert: Parameters<typeof addAlert>[0]) => {
      addAlert(alert);
      setIsAlertModalOpen(false);
    },
    [addAlert]
  );

  const handleDismissAlert = useCallback((alertId: string) => {
    setTriggeredAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const handleRuneClick = useCallback((rune: ProcessedRune) => {
    window.open(
      `https://gamma.io/ordinals/collections/${encodeURIComponent(rune.spacedName)}`,
      '_blank'
    );
  }, []);

  if (isLoading && runes.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <RuneLoadingCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && runes.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <RuneEmptyState
          icon={AlertCircle}
          title="Failed to Load Runes"
          description={error}
          action={{ label: 'Try Again', onClick: refresh }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-orange-500">◆</span>
              Runes Market
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {lastUpdated && `Last updated: ${formatTime(lastUpdated)}`}
              {' • '}
              BTC: {formatUsd(btcPrice)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <RuneExportButton runes={filteredRunes} />

            <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total Runes" value={formatNumber(metrics.totalRunes)} icon={Coins} />
          <MetricCard title="Total Market Cap" value={formatUsd(metrics.totalMarketCapUsd)} subValue={`${formatBtc(metrics.totalMarketCap)} BTC`} icon={DollarSign} highlight />
          <MetricCard title="24h Volume" value={formatUsd(metrics.totalVolume24hUsd)} subValue={`${formatBtc(metrics.totalVolume24h)} BTC`} icon={BarChart3} />
          <MetricCard title="7d Volume" value={formatUsd(metrics.totalVolume7dUsd)} subValue={`${formatBtc(metrics.totalVolume7d)} BTC`} icon={Activity} />
          <MetricCard title="Total Holders" value={formatNumber(metrics.totalHolders)} icon={Users} />
          <MetricCard title="Total Listings" value={formatNumber(metrics.totalListings)} icon={Layers} />
          <MetricCard title="Mintable Runes" value={formatNumber(metrics.mintableRunes)} subValue={`${((metrics.mintableRunes / metrics.totalRunes) * 100).toFixed(1)}% of total`} icon={Hammer} highlight />
          <MetricCard title="Avg Unit Price" value={formatUsd(metrics.avgFloorPriceUsd)} icon={TrendingUp} />
        </div>

        {/* Market Insights */}
        {insights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">Market Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {insights.map((insight) => (
                <RuneInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <RuneFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={refresh}
          isLoading={isLoading}
          totalCount={runes.length}
          filteredCount={filteredRunes.length}
          className="mb-6"
        />

        {/* Runes */}
        {filteredRunes.length === 0 ? (
          <RuneEmptyState
            title="No Runes Found"
            description={
              filters.search
                ? `No Runes matching "${filters.search}"`
                : filters.showOnlyFavorites
                ? "You haven't added any favorites yet"
                : filters.showOnlyMintable
                ? "No mintable Runes found"
                : 'No Runes available'
            }
            action={
              filters.search || filters.showOnlyFavorites || filters.showOnlyMintable
                ? {
                    label: 'Clear Filters',
                    onClick: () =>
                      setFilters({
                        ...filters,
                        search: '',
                        showOnlyFavorites: false,
                        showOnlyMintable: false,
                      }),
                  }
                : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRunes.map((rune) => (
              <RuneCard
                key={rune.id}
                rune={rune}
                onFavoriteToggle={toggleFavorite}
                onAlertClick={handleAlertClick}
                hasAlert={alertRuneIds.has(rune.id)}
                onClick={() => handleRuneClick(rune)}
              />
            ))}
          </div>
        ) : (
          <RuneTable
            runes={filteredRunes}
            onFavoriteToggle={toggleFavorite}
            onAlertClick={handleAlertClick}
            alertRuneIds={alertRuneIds}
            onRuneClick={handleRuneClick}
          />
        )}

        {/* Active Alerts Summary */}
        {alerts.filter(a => !a.triggered).length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-3">
              Active Price Alerts ({alerts.filter(a => !a.triggered).length})
            </h3>
            <div className="space-y-2">
              {alerts
                .filter(a => !a.triggered)
                .slice(0, 5)
                .map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                    <div>
                      <span className="text-white text-sm">{alert.runeName}</span>
                      <span className="text-zinc-500 text-xs ml-2">
                        {alert.type === 'below' ? '↓' : '↑'} {alert.targetPrice.toLocaleString()} sats
                      </span>
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="text-zinc-500 hover:text-red-400 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Alert Modal */}
        <RuneAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => setIsAlertModalOpen(false)}
          rune={selectedRune}
          onCreateAlert={handleCreateAlert}
        />
      </div>
    </div>
  );
}

export default RunesPage;
