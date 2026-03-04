'use client';

import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/primitives/Card';
import { cn } from '@/lib/utils';
import type { ProcessedCollection } from '@/types/ordinals';
import {
  Sparkline,
  PriceChange,
  FavoriteButton,
  AlertButton
} from './OrdinalsUI';

// ============================================================================
// COLLECTION CARD - GRID VIEW
// ============================================================================

interface CollectionCardGridProps {
  collection: ProcessedCollection;
  onToggleFavorite: (collectionId: string) => void;
  onOpenAlert: (collection: ProcessedCollection) => void;
  onClick: (collection: ProcessedCollection) => void;
  hasActiveAlert?: boolean;
  className?: string;
}

export const CollectionCardGrid = memo<CollectionCardGridProps>(({
  collection,
  onToggleFavorite,
  onOpenAlert,
  onClick,
  hasActiveAlert = false,
  className
}) => {
  // Format BTC values - data is already in BTC from the API, NOT in satoshis
  const formatBTC = useCallback((value: number) => {
    if (value >= 1) return value.toFixed(4);
    if (value >= 0.01) return value.toFixed(6);
    if (value >= 0.0001) return value.toFixed(6);
    return value.toFixed(8);
  }, []);

  // Format large numbers with K/M suffixes
  const formatNumber = useCallback((value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  }, []);

  // Hover state for quick stats
  const [isHovered, setIsHovered] = React.useState(false);

  // Handle favorite toggle
  const handleFavoriteClick = useCallback(() => {
    onToggleFavorite(collection.id);
  }, [collection.id, onToggleFavorite]);

  // Handle alert button click
  const handleAlertClick = useCallback(() => {
    onOpenAlert(collection);
  }, [collection, onOpenAlert]);

  return (
    <Card
      variant="bordered"
      padding="none"
      className={cn(
        'group cursor-pointer transition-all duration-300',
        'hover:border-[#f59e0b] hover:shadow-lg hover:shadow-[#f59e0b]/10',
        'bg-[#0a0a0f] border-[#2a2a3e]',
        className
      )}
      onClick={() => onClick(collection)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Collection Image Header */}
      <div className="relative aspect-square overflow-hidden bg-[#2a2a3e]">
        {collection.image ? (
          <img
            src={collection.image}
            alt={collection.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`absolute inset-0 items-center justify-center bg-[#1a1a2e] ${collection.image ? 'hidden' : 'flex'}`}>
          <span className="text-4xl font-bold text-[#f59e0b]/60">{collection.name?.charAt(0) || '?'}</span>
        </div>

        {/* Hover Overlay with Quick Stats */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 flex items-center justify-center">
            <div className="text-center space-y-2 p-4">
              <div className="text-xs text-gray-500 font-semibold">QUICK STATS</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Listed:</span>
                  <span className="text-xs text-white font-bold">{formatNumber(collection.listed)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Owners:</span>
                  <span className="text-xs text-white font-bold">{formatNumber(collection.owners)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Supply:</span>
                  <span className="text-xs text-white font-bold">{formatNumber(collection.supply)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-400">Market Cap:</span>
                  <span className="text-xs text-[#f59e0b] font-bold">{formatBTC(collection.marketCap)} BTC</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <FavoriteButton
            isFavorite={collection.isFavorite}
            onToggle={handleFavoriteClick}
            size="sm"
            className="bg-black/60 backdrop-blur-sm"
          />
          <AlertButton
            onClick={handleAlertClick}
            hasActiveAlert={hasActiveAlert}
            size="sm"
            className="bg-black/60 backdrop-blur-sm"
          />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Collection Name & Symbol */}
        <div>
          <h3 className="text-base font-bold text-white truncate">
            {collection.name}
          </h3>
          <p className="text-xs text-gray-500 font-mono">{collection.symbol}</p>
        </div>

        {/* Floor Price & 24h Change */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-500 font-semibold mb-0.5">FLOOR</div>
            <div className="text-sm font-mono font-bold text-white">
              {formatBTC(collection.floorPrice)} BTC
            </div>
          </div>
          <PriceChange value={collection.priceChange24h} showIcon={true} />
        </div>

        {/* Volume Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-gray-500 font-semibold mb-0.5">
              {collection.volume24h > 0 ? '24H VOL' : 'TOTAL VOL'}
            </div>
            <div className="text-xs font-mono text-white">
              {formatBTC(collection.volume24h > 0 ? collection.volume24h : (collection.totalVolume ?? 0))} BTC
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-semibold mb-0.5">
              {collection.volume7d > 0 ? '7D VOL' : 'LISTED'}
            </div>
            <div className="text-xs font-mono text-white">
              {collection.volume7d > 0
                ? `${formatBTC(collection.volume7d)} BTC`
                : formatNumber(collection.listed)
              }
            </div>
          </div>
        </div>

        {/* Volume Sparkline */}
        <div className="pt-2 border-t border-[#2a2a3e]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-semibold">7D VOLUME TREND</span>
          </div>
          <Sparkline
            data={collection.volumeHistory}
            width={200}
            height={30}
            color="#f59e0b"
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
});

CollectionCardGrid.displayName = 'CollectionCardGrid';

// ============================================================================
// COLLECTION CARD - TABLE VIEW
// ============================================================================

interface CollectionCardTableProps {
  collection: ProcessedCollection;
  onToggleFavorite: (collectionId: string) => void;
  onOpenAlert: (collection: ProcessedCollection) => void;
  onClick: (collection: ProcessedCollection) => void;
  hasActiveAlert?: boolean;
  className?: string;
}

export const CollectionCardTable = memo<CollectionCardTableProps>(({
  collection,
  onToggleFavorite,
  onOpenAlert,
  onClick,
  hasActiveAlert = false,
  className
}) => {
  // Format BTC values - data is already in BTC from the API, NOT in satoshis
  const formatBTC = useCallback((value: number) => {
    if (value >= 1) return value.toFixed(4);
    if (value >= 0.01) return value.toFixed(6);
    if (value >= 0.0001) return value.toFixed(6);
    return value.toFixed(8);
  }, []);

  // Format large numbers with K/M suffixes
  const formatNumber = useCallback((value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  }, []);

  // Handle favorite toggle
  const handleFavoriteClick = useCallback(() => {
    onToggleFavorite(collection.id);
  }, [collection.id, onToggleFavorite]);

  // Handle alert button click
  const handleAlertClick = useCallback(() => {
    onOpenAlert(collection);
  }, [collection, onOpenAlert]);

  return (
    <div
      className={cn(
        'grid grid-cols-[auto,1fr,120px,120px,120px,120px,80px,100px,60px] gap-4 items-center',
        'px-4 py-3 border-b border-[#2a2a3e] cursor-pointer',
        'transition-all duration-200 hover:bg-[#1a1a2e] hover:border-[#f59e0b]',
        className
      )}
      onClick={() => onClick(collection)}
    >
      {/* Actions */}
      <div className="flex items-center gap-1">
        <FavoriteButton
          isFavorite={collection.isFavorite}
          onToggle={handleFavoriteClick}
          size="sm"
        />
        <AlertButton
          onClick={handleAlertClick}
          hasActiveAlert={hasActiveAlert}
          size="sm"
        />
      </div>

      {/* Collection Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#2a2a3e] flex-shrink-0 relative">
          {collection.image ? (
            <img
              src={collection.image}
              alt={collection.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`absolute inset-0 items-center justify-center bg-[#1a1a2e] ${collection.image ? 'hidden' : 'flex'}`}>
            <span className="text-sm font-bold text-[#f59e0b]/60">{collection.name?.charAt(0) || '?'}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {collection.name}
          </div>
          <div className="text-xs text-gray-500 font-mono">{collection.symbol}</div>
        </div>
      </div>

      {/* Floor Price */}
      <div className="text-right">
        <div className="text-xs font-mono text-white">
          {formatBTC(collection.floorPrice)}
        </div>
        <div className="text-[10px] text-gray-500">BTC</div>
      </div>

      {/* Volume (24h or Total) */}
      <div className="text-right">
        <div className="text-xs font-mono text-white">
          {formatBTC(collection.volume24h > 0 ? collection.volume24h : (collection.totalVolume ?? 0))}
        </div>
        <div className="text-[10px] text-gray-500">
          {collection.volume24h > 0 ? '24h' : 'total'} BTC
        </div>
      </div>

      {/* 7d Volume or Listed */}
      <div className="text-right">
        <div className="text-xs font-mono text-white">
          {collection.volume7d > 0 ? formatBTC(collection.volume7d) : formatNumber(collection.listed)}
        </div>
        <div className="text-[10px] text-gray-500">
          {collection.volume7d > 0 ? 'BTC' : 'listed'}
        </div>
      </div>

      {/* Market Cap */}
      <div className="text-right">
        <div className="text-xs font-mono text-white">
          {formatBTC(collection.marketCap)}
        </div>
        <div className="text-[10px] text-gray-500">BTC</div>
      </div>

      {/* 24h Change */}
      <div className="flex justify-end">
        <PriceChange value={collection.priceChange24h} showIcon={true} />
      </div>

      {/* Volume Sparkline */}
      <div className="flex justify-center">
        <Sparkline
          data={collection.volumeHistory}
          width={80}
          height={24}
          color="#f59e0b"
        />
      </div>

      {/* Stats */}
      <div className="text-right">
        <div className="text-xs text-white">{formatNumber(collection.listed)}</div>
        <div className="text-[10px] text-gray-500">{formatNumber(collection.owners)} own</div>
      </div>
    </div>
  );
});

CollectionCardTable.displayName = 'CollectionCardTable';

// ============================================================================
// TABLE HEADER COMPONENT
// ============================================================================

interface TableHeaderProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}

export const CollectionTableHeader = memo<TableHeaderProps>(({
  sortBy,
  sortOrder,
  onSort,
  className
}) => {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-3 h-3 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const HeaderCell = ({ field, label, align = 'left' }: { field: string; label: string; align?: 'left' | 'right' | 'center' }) => (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#f59e0b] transition-colors',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center'
      )}
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  return (
    <div
      className={cn(
        'grid grid-cols-[auto,1fr,120px,120px,120px,120px,80px,100px,60px] gap-4 items-center',
        'px-4 py-3 bg-[#0a0a0f] border-b-2 border-[#f59e0b] sticky top-0 z-10',
        className
      )}
    >
      <div className="text-xs font-bold text-gray-500"></div>
      <HeaderCell field="name" label="COLLECTION" />
      <HeaderCell field="floorPrice" label="FLOOR" align="right" />
      <HeaderCell field="volume24h" label="VOLUME" align="right" />
      <HeaderCell field="volume7d" label="7D/LISTED" align="right" />
      <HeaderCell field="marketCap" label="MARKET CAP" align="right" />
      <HeaderCell field="priceChange24h" label="24H %" align="right" />
      <div className="text-xs font-bold text-gray-500 text-center">TREND</div>
      <HeaderCell field="listed" label="LISTED" align="right" />
    </div>
  );
});

CollectionTableHeader.displayName = 'CollectionTableHeader';

// ============================================================================
// EXPORTS
// ============================================================================

export { CollectionCardGrid as default };
