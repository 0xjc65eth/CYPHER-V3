'use client';

/**
 * OrdinalsPage - Professional Bloomberg Terminal-style Bitcoin Ordinals Dashboard
 *
 * Integrates all Ordinals system components:
 * - Original: Collections, Inscriptions, Marketplace, Arbitrage, Analytics
 * - Professional: Portfolio, BRC-20, Rare Sats, Trading Desk, Market Intelligence, Explorer
 * - Wallet connection via SimpleLaserEyesProvider
 * - Keyboard shortcuts (1-0 for tabs, R for refresh)
 * - Auto-refresh every 30 seconds
 */

import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from 'react';
import {
  LayoutGrid,
  List,
  FileText,
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  Wallet,
  Briefcase,
  Search,
  Keyboard,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/primitives/Button';
import { Card } from '@/components/ui/primitives/Card';
import { cn } from '@/lib/utils';

// Import existing Ordinals components
import ProfessionalDashboard from './ProfessionalDashboard';
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

// Import professional components (lazy-loaded for performance)
const PortfolioManager = lazy(() => import('./professional/PortfolioManager'));
// BRC20Terminal removed - consolidated into Portfolio tab
const TransactionExplorer = lazy(() => import('./professional/TransactionExplorer'));
const BlockExplorer = lazy(() => import('./professional/BlockExplorer'));

// Import hooks
import {
  useCollections,
  useMarketMetrics,
  usePriceAlerts,
  useWatchlist
} from '@/hooks/useOrdinals';
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider';
import { useOrdinalsMarketFeed } from '@/hooks/ordinals/useOrdinalsWebSocket';

// Import types
import type {
  ProcessedCollection,
  FilterOptions,
  PriceAlert,
  SortField,
} from '@/types/ordinals';

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

type TabId =
  | 'collections'
  | 'inscriptions'
  | 'marketplace'
  | 'portfolio'
  | 'explorer';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  shortcut: string;
  requiresWallet?: boolean;
}

const TABS: Tab[] = [
  {
    id: 'collections',
    label: 'Overview',
    icon: LayoutGrid,
    description: 'Browse and analyze Bitcoin Ordinals collections',
    shortcut: '1'
  },
  {
    id: 'inscriptions',
    label: 'Inscriptions',
    icon: FileText,
    description: 'Explore individual inscriptions and metadata',
    shortcut: '2'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingCart,
    description: 'Active listings and marketplace analytics',
    shortcut: '3'
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: Briefcase,
    description: 'Manage holdings and track performance',
    shortcut: '4',
    requiresWallet: true
  },
  {
    id: 'explorer',
    label: 'Explorer',
    icon: Search,
    description: 'Block and transaction explorer',
    shortcut: '5'
  },
];

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TabLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#1a1a2e] rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg"></div>
        ))}
      </div>
      <div className="h-64 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg"></div>
    </div>
  );
}

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

  const [activeTab, setActiveTab] = useState<TabId>('collections');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [explorerSubTab, setExplorerSubTab] = useState<'transactions' | 'blocks'>('transactions');

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    minPrice: undefined,
    maxPrice: undefined,
    minVolume: undefined,
    sortBy: 'volume24h' as SortField,
    sortOrder: 'desc',
    showFavoritesOnly: false
  });

  // Modal state
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedCollectionForAlert, setSelectedCollectionForAlert] = useState<ProcessedCollection | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ProcessedCollection | null>(null);
  const [triggeredAlerts, setTriggeredAlerts] = useState<(PriceAlert & { triggered: boolean })[]>([]);

  // ============================================================================
  // HOOKS
  // ============================================================================

  // Wallet connection
  const { address, connected } = useLaserEyes();

  // Watchlist management
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

  // Market metrics (used by ProfessionalDashboard)
  const metrics = useMarketMetrics(collections);

  // Price alerts management
  const priceAlerts = usePriceAlerts();

  // WebSocket for real-time updates
  const { connected: wsConnected, marketUpdates } = useOrdinalsMarketFeed(true);

  // ============================================================================
  // REAL-TIME UPDATES HANDLER
  // ============================================================================

  useEffect(() => {
    if (marketUpdates.length > 0 && !loading) {
      // Refresh collections when new market updates arrive
      const latestUpdate = marketUpdates[0];
      if (latestUpdate.type === 'price_update' || latestUpdate.type === 'volume_update') {
        // Debounce refresh to avoid too many calls
        const timer = setTimeout(() => {
          refresh();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [marketUpdates, loading, refresh]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Tab shortcuts: 1-9, 0
      const tabIndex = e.key === '0' ? 9 : parseInt(e.key) - 1;
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < TABS.length && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveTab(TABS[tabIndex].id);
        return;
      }

      // R = Refresh
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        refresh();
        return;
      }

      // ? = Show shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      // Escape = Close shortcuts modal
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refresh]);

  // ============================================================================
  // AUTO-REFRESH & ALERTS
  // ============================================================================

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

  useEffect(() => {
    if (!loading && collections.length > 0) {
      priceAlerts.checkAlerts(collections);
    }
  }, [collections, loading, priceAlerts]);

  useEffect(() => {
    if (!priceAlerts.notificationsEnabled) {
      priceAlerts.requestNotificationPermission();
    }
  }, [priceAlerts]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleCollectionClick = useCallback((collection: ProcessedCollection) => {
    setSelectedCollection(collection);
    setDetailsModalOpen(true);
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setDetailsModalOpen(false);
    setSelectedCollection(null);
  }, []);

  const handleToggleFavorite = useCallback((collectionId: string) => {
    watchlist.toggleWatchlist(collectionId);
  }, [watchlist]);

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
      <ProfessionalDashboard collections={collections} loading={loading} />

      <Card variant="bordered" padding="lg" className="bg-[#0a0a0f] border-[#2a2a3e]">
        <div className="space-y-4">
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
              <ExportButton data={collections} fileName="ordinals-collections" />
            </div>
          </div>
          <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
        </div>
      </Card>

      {loading && collections.length === 0 ? (
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
        <Card variant="bordered" padding="lg" className="bg-[#1a1a2e] border-[#2a2a3e]">
          <div className="text-center py-12">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No collections found</h3>
            <p className="text-sm text-gray-400">Try adjusting your filters or search query</p>
          </div>
        </Card>
      ) : viewType === 'grid' ? (
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

  const renderExplorerTab = () => (
    <div className="space-y-4">
      {/* Explorer Sub-tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExplorerSubTab('transactions')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold border transition-all',
            explorerSubTab === 'transactions'
              ? 'bg-[#f59e0b] text-white border-[#f59e0b]'
              : 'bg-[#1a1a2e] text-gray-400 border-[#2a2a3e] hover:border-[#f59e0b]/50 hover:text-white'
          )}
        >
          Transactions
        </button>
        <button
          onClick={() => setExplorerSubTab('blocks')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold border transition-all',
            explorerSubTab === 'blocks'
              ? 'bg-[#f59e0b] text-white border-[#f59e0b]'
              : 'bg-[#1a1a2e] text-gray-400 border-[#2a2a3e] hover:border-[#f59e0b]/50 hover:text-white'
          )}
        >
          Blocks
        </button>
      </div>

      <Suspense fallback={<TabLoadingSkeleton />}>
        {explorerSubTab === 'transactions' ? <TransactionExplorer /> : <BlockExplorer />}
      </Suspense>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'collections':
        return renderCollectionsTab();
      case 'inscriptions':
        return <InscriptionsTab />;
      case 'marketplace':
        return <MarketplaceTab />;
      case 'portfolio':
        return (
          <Suspense fallback={<TabLoadingSkeleton />}>
            <PortfolioManager address={address} />
          </Suspense>
        );
      case 'explorer':
        return renderExplorerTab();
      default:
        return null;
    }
  };

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
              {/* Wallet Status */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  connected ? 'bg-green-500' : 'bg-gray-500'
                )}></div>
                <span className="text-xs text-gray-400 font-mono">
                  {connected && address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : 'No Wallet'}
                </span>
              </div>

              {/* Last Updated */}
              <div className="text-right hidden sm:block">
                <div className="text-xs text-gray-500 font-semibold">LAST UPDATE</div>
                <div className="text-sm text-white font-mono">{timeAgo}</div>
              </div>

              {/* Shortcuts Button */}
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                variant="secondary"
                size="md"
                loading={loading}
                className="gap-2"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#2a2a3e]">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap',
                    'text-xs font-semibold border',
                    isActive
                      ? 'bg-[#f59e0b] text-white border-[#f59e0b]'
                      : 'bg-[#1a1a2e] text-gray-400 border-[#2a2a3e] hover:border-[#f59e0b]/50 hover:text-white'
                  )}
                  title={`${tab.description} (${tab.shortcut})`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={cn(
                    'text-[10px] font-mono px-1 rounded',
                    isActive ? 'bg-white/20' : 'bg-[#2a2a3e] text-gray-600'
                  )}>
                    {tab.shortcut}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {renderTabContent()}
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

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0a0f] border border-[#2a2a3e] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-[#f59e0b] font-bold uppercase tracking-wider mb-2">
                Navigation
              </div>
              {TABS.map(tab => (
                <div key={tab.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{tab.label}</span>
                  <kbd className="px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs font-mono text-[#f59e0b]">
                    {tab.shortcut}
                  </kbd>
                </div>
              ))}

              <div className="border-t border-[#2a2a3e] pt-3 mt-3">
                <div className="text-xs text-[#f59e0b] font-bold uppercase tracking-wider mb-2">
                  Actions
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Refresh data</span>
                  <kbd className="px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs font-mono text-[#f59e0b]">R</kbd>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-300">Toggle shortcuts</span>
                  <kbd className="px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs font-mono text-[#f59e0b]">?</kbd>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-300">Close modal</span>
                  <kbd className="px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs font-mono text-[#f59e0b]">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Data Indicator */}
      <div className="fixed bottom-4 left-4 bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400 font-semibold">LIVE DATA</span>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs text-gray-400">Auto-refresh: 30s</span>
          {connected && (
            <>
              <span className="text-xs text-gray-500">|</span>
              <Wallet className="w-3 h-3 text-[#f59e0b]" />
              <span className="text-xs text-[#f59e0b]">Connected</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
