'use client';

/**
 * OrdinalsPage - Main Integration Component
 * Professional Bloomberg Terminal-style Bitcoin Ordinals Dashboard
 *
 * This component integrates all Ordinals system components:
 * - ProfessionalDashboard for market metrics
 * - Custom hooks (useCollections, useMarketMetrics, usePriceAlerts, useWatchlist)
 * - FilterBar for advanced filtering
 * - CollectionCard components (grid/table view)
 * - ExportButton for Excel export
 * - AlertNotification for price alerts
 * - 5-tab structure (Collections, Inscriptions, Marketplace, Arbitrage, Analytics)
 * - Auto-refresh every 30 seconds
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  FileText,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Settings,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/primitives/Button';
import { Card, CardContent } from '@/components/ui/primitives/Card';
import { cn } from '@/lib/utils';

// Import all Ordinals components
import ProfessionalDashboard from './ProfessionalDashboard';
import OrdinalsArbitrageScanner from './OrdinalsArbitrageScanner';
import InscriptionsTab from './InscriptionsTab';
import MarketplaceTab from './MarketplaceTab';
import {
  FilterBar,
  ExportButton,
  AlertNotification,
  AlertModal
} from './OrdinalsUI';
import {
  CollectionCardGrid,
  CollectionCardTable,
  CollectionTableHeader
} from './CollectionCard';
import { CollectionDetailsModal } from './CollectionDetailsModal';

// Import hooks
import {
  useCollections,
  useMarketMetrics,
  useMarketInsights,
  usePriceAlerts,
  useWatchlist
} from '@/hooks/useOrdinals';

// Import types
import type {
  ProcessedCollection,
  FilterOptions,
  PriceAlert,
  SortField,
  DEFAULT_ORDINALS_CONFIG
} from '@/types/ordinals';

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

type TabId = 'collections' | 'inscriptions' | 'marketplace' | 'arbitrage' | 'analytics';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'collections',
    label: 'Collections',
    icon: LayoutGrid,
    description: 'Browse and analyze Bitcoin Ordinals collections'
  },
  {
    id: 'inscriptions',
    label: 'Inscriptions',
    icon: FileText,
    description: 'Explore individual inscriptions and their metadata'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingCart,
    description: 'Active listings and marketplace analytics'
  },
  {
    id: 'arbitrage',
    label: 'Arbitrage',
    icon: TrendingUp,
    description: 'Cross-marketplace arbitrage opportunities'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Advanced market analytics and insights'
  }
];

// ============================================================================
// VIEW TYPE
// ============================================================================

type ViewType = 'grid' | 'table';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrdinalsPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('collections');

  // View state (grid vs table)
  const [viewType, setViewType] = useState<ViewType>('grid');

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    minPrice: undefined,
    maxPrice: undefined,
    minVolume: undefined,
    sortBy: 'volume24h' as SortField,
    sortOrder: 'desc',
    showFavoritesOnly: false
  });

  // Alert modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedCollectionForAlert, setSelectedCollectionForAlert] = useState<ProcessedCollection | null>(null);

  // Collection details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ProcessedCollection | null>(null);

  // Triggered alerts (for notifications)
  const [triggeredAlerts, setTriggeredAlerts] = useState<(PriceAlert & { triggered: boolean })[]>([]);

  // ============================================================================
  // HOOKS
  // ============================================================================

  // Watchlist management (must be called first!)
  const watchlist = useWatchlist();

  // Collections data with filters applied
  const {
    collections,
    allCollections,
    loading,
    error,
    lastUpdated,
    refresh
  } = useCollections(filters, watchlist.watchlist);

  // Market metrics
  const metrics = useMarketMetrics(collections);

  // Market insights
  const insights = useMarketInsights(metrics, collections);

  // Price alerts management
  const priceAlerts = usePriceAlerts();

  // ============================================================================
  // AUTO-REFRESH LOGIC
  // ============================================================================

  // Auto-refresh is handled by useCollections hook (30s interval)
  // Display last updated timestamp
  const timeAgo = useMemo(() => {
    if (!lastUpdated) return 'Never';

    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);

    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [lastUpdated]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Handle collection click (open details modal)
  const handleCollectionClick = useCallback((collection: ProcessedCollection) => {
    setSelectedCollection(collection);
    setDetailsModalOpen(true);
  }, []);

  // Handle close details modal
  const handleCloseDetailsModal = useCallback(() => {
    setDetailsModalOpen(false);
    setSelectedCollection(null);
  }, []);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback((collectionId: string) => {
    watchlist.toggleWatchlist(collectionId);
  }, [watchlist]);

  // Handle alert creation
  const handleOpenAlert = useCallback((collection: ProcessedCollection) => {
    setSelectedCollectionForAlert(collection);
    setAlertModalOpen(true);
  }, []);

  const handleCloseAlert = useCallback(() => {
    setAlertModalOpen(false);
    setSelectedCollectionForAlert(null);
  }, []);

  const handleSaveAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt'>) => {
    priceAlerts.addAlert(
      alert.collectionId,
      alert.collectionName,
      alert.type,
      alert.targetPrice,
      alert.currentPrice
    );
  }, [priceAlerts]);

  const handleDeleteAlert = useCallback((alertId: string) => {
    priceAlerts.removeAlert(alertId);
  }, [priceAlerts]);

  // Check for triggered alerts
  useEffect(() => {
    if (!loading && collections.length > 0) {
      priceAlerts.checkAlerts(collections);
    }
  }, [collections, loading, priceAlerts]);

  // Request notification permission on mount
  useEffect(() => {
    if (!priceAlerts.notificationsEnabled) {
      priceAlerts.requestNotificationPermission();
    }
  }, [priceAlerts]);

  // Handle table sorting
  const handleTableSort = useCallback((field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field as SortField,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  // Check if collection has active alert
  const hasActiveAlert = useCallback((collectionId: string) => {
    return priceAlerts.alerts.some(
      alert => alert.collectionId === collectionId && alert.isActive
    );
  }, [priceAlerts.alerts]);

  // ============================================================================
  // TAB CONTENT RENDERERS
  // ============================================================================

  const renderCollectionsTab = () => (
    <div className="space-y-6">
      {/* Professional Dashboard */}
      <ProfessionalDashboard collections={collections} loading={loading} />

      {/* Filter Bar & Controls */}
      <Card variant="bordered" padding="lg" className="bg-[#0a0a0f] border-[#2a2a3e]">
        <div className="space-y-4">
          {/* Top Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Filters & Sorting
              </h3>
              <div className="text-xs text-gray-500">
                {collections.length} of {allCollections.length} collections
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-1">
                <button
                  onClick={() => setViewType('grid')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewType === 'grid'
                      ? 'bg-[#f59e0b] text-white'
                      : 'text-gray-500 hover:text-white'
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewType('table')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewType === 'table'
                      ? 'bg-[#f59e0b] text-white'
                      : 'text-gray-500 hover:text-white'
                  )}
                  aria-label="Table view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Export Button */}
              <ExportButton
                data={collections}
                fileName="ordinals-collections"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </Card>

      {/* Collections Display */}
      {loading && collections.length === 0 ? (
        // Loading State
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} variant="bordered" padding="none" className="bg-[#1a1a2e] border-[#2a2a3e]">
              <div className="aspect-square bg-[#2a2a3e] animate-pulse"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-[#2a2a3e] rounded animate-pulse"></div>
                <div className="h-3 bg-[#2a2a3e] rounded w-2/3 animate-pulse"></div>
                <div className="h-6 bg-[#2a2a3e] rounded animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        // Error State
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-red-500/50">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <div>
              <div className="font-semibold">Error loading collections</div>
              <div className="text-sm text-gray-400">{error}</div>
            </div>
          </div>
        </Card>
      ) : collections.length === 0 ? (
        // Empty State
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="text-center py-12">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No collections found</h3>
            <p className="text-sm text-gray-400">
              Try adjusting your filters or search query
            </p>
          </div>
        </Card>
      ) : viewType === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.filter(c => c && c.id).map((collection, index) => (
            <CollectionCardGrid
              key={`${collection.id}-${index}`}
              collection={collection}
              onToggleFavorite={handleToggleFavorite}
              onOpenAlert={handleOpenAlert}
              onClick={handleCollectionClick}
              hasActiveAlert={hasActiveAlert(collection.id)}
            />
          ))}
        </div>
      ) : (
        // Table View
        <Card variant="bordered" padding="none" className="bg-[#0a0a0f] border-[#2a2a3e] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              <CollectionTableHeader
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSort={handleTableSort}
              />
              <div className="bg-[#0a0a0f]">
                {collections.filter(c => c && c.id).map((collection, index) => (
                  <CollectionCardTable
                    key={`${collection.id}-${index}`}
                    collection={collection}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenAlert={handleOpenAlert}
                    onClick={handleCollectionClick}
                    hasActiveAlert={hasActiveAlert(collection.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderInscriptionsTab = () => <InscriptionsTab />;

  const renderMarketplaceTab = () => <MarketplaceTab />;

  const renderArbitrageTab = () => (
    <div>
      <OrdinalsArbitrageScanner />
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Market Insights */}
      <Card variant="bordered" padding="lg" className="bg-[#0a0a0f] border-[#2a2a3e]">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">
          Market Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Market Strength */}
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-3 h-3 rounded-full',
                insights.marketStrength === 'strong' ? 'bg-green-500' :
                insights.marketStrength === 'moderate' ? 'bg-yellow-500' :
                'bg-red-500'
              )}></div>
              <h4 className="text-sm font-bold text-white uppercase">Market Strength</h4>
            </div>
            <div className="text-3xl font-bold mb-2 capitalize">
              {insights.marketStrength === 'strong' && <span className="text-green-400">{insights.marketStrength}</span>}
              {insights.marketStrength === 'moderate' && <span className="text-yellow-400">{insights.marketStrength}</span>}
              {insights.marketStrength === 'weak' && <span className="text-red-400">{insights.marketStrength}</span>}
            </div>
            <p className="text-sm text-gray-400">
              Based on 24h volume trends and market activity
            </p>
          </div>

          {/* Liquidity Score */}
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h4 className="text-sm font-bold text-white uppercase">Liquidity Score</h4>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {insights.liquidityScore}/100
            </div>
            <div className="w-full bg-[#2a2a3e] rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${insights.liquidityScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">
              Market liquidity and trading activity
            </p>
          </div>

          {/* Risk Level */}
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-3 h-3 rounded-full',
                insights.riskLevel === 'low' ? 'bg-green-500' :
                insights.riskLevel === 'medium' ? 'bg-yellow-500' :
                'bg-red-500'
              )}></div>
              <h4 className="text-sm font-bold text-white uppercase">Risk Level</h4>
            </div>
            <div className="text-3xl font-bold mb-2 capitalize">
              {insights.riskLevel === 'low' && <span className="text-green-400">{insights.riskLevel}</span>}
              {insights.riskLevel === 'medium' && <span className="text-yellow-400">{insights.riskLevel}</span>}
              {insights.riskLevel === 'high' && <span className="text-red-400">{insights.riskLevel}</span>}
            </div>
            <p className="text-sm text-gray-400">
              Overall market risk assessment
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="mt-6 bg-[#1a1a2e] border border-[#f59e0b]/20 rounded-lg p-4">
            <h4 className="text-sm font-bold text-[#f59e0b] mb-3 uppercase">Recommendations</h4>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-[#f59e0b] mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Placeholder for Additional Analytics */}
      <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-bold text-white mb-2">Advanced Analytics</h3>
          <p className="text-sm text-gray-400">
            Detailed charts and analytics coming soon
          </p>
        </div>
      </Card>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#0a0a0f] to-[#1a1a2e] border-b border-[#2a2a3e]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-1">
                Bitcoin Ordinals Terminal
              </h1>
              <p className="text-sm text-gray-400">
                Professional-grade Bitcoin Ordinals analytics and trading platform
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Last Updated */}
              <div className="text-right">
                <div className="text-xs text-gray-500 font-semibold">LAST UPDATE</div>
                <div className="text-sm text-white font-mono">{timeAgo}</div>
              </div>

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                variant="secondary"
                size="md"
                loading={loading}
                className="gap-2"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap',
                    'text-sm font-semibold border',
                    isActive
                      ? 'bg-[#f59e0b] text-white border-[#f59e0b]'
                      : 'bg-[#1a1a2e] text-gray-400 border-[#2a2a3e] hover:border-[#f59e0b]/50 hover:text-white'
                  )}
                  title={tab.description}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'collections' && renderCollectionsTab()}
        {activeTab === 'inscriptions' && renderInscriptionsTab()}
        {activeTab === 'marketplace' && renderMarketplaceTab()}
        {activeTab === 'arbitrage' && renderArbitrageTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>

      {/* Collection Details Modal */}
      <CollectionDetailsModal
        isOpen={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        collection={selectedCollection}
        onToggleFavorite={handleToggleFavorite}
        onOpenAlert={handleOpenAlert}
        hasActiveAlert={selectedCollection ? hasActiveAlert(selectedCollection.id) : false}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModalOpen}
        onClose={handleCloseAlert}
        collection={selectedCollectionForAlert}
        onSave={handleSaveAlert}
        onDelete={handleDeleteAlert}
      />

      {/* Alert Notifications */}
      {triggeredAlerts.map(alert => (
        <AlertNotification
          key={alert.id}
          alert={alert}
          onClose={() => {
            setTriggeredAlerts(prev => prev.filter(a => a.id !== alert.id));
          }}
        />
      ))}

      {/* Live Data Indicator */}
      <div className="fixed bottom-4 left-4 bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400 font-semibold">LIVE DATA</span>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs text-gray-400">Auto-refresh: 30s</span>
        </div>
      </div>
    </div>
  );
}
