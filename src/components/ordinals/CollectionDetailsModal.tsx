'use client';

import React, { memo, useCallback, useState } from 'react';
import {
  X,
  ExternalLink,
  Star,
  Bell,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/primitives/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/primitives/Card';
import { cn } from '@/lib/utils';
import { Sparkline, PriceChange, FavoriteButton, AlertButton } from './OrdinalsUI';
import type { ProcessedCollection } from '@/types/ordinals';

// ============================================================================
// COLLECTION DETAILS MODAL COMPONENT
// ============================================================================

interface CollectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: ProcessedCollection | null;
  onToggleFavorite: (collectionId: string) => void;
  onOpenAlert: (collection: ProcessedCollection) => void;
  hasActiveAlert?: boolean;
}

export const CollectionDetailsModal = memo<CollectionDetailsModalProps>(({
  isOpen,
  onClose,
  collection,
  onToggleFavorite,
  onOpenAlert,
  hasActiveAlert = false
}) => {
  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Stop propagation for modal content clicks
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(() => {
    if (collection) {
      onToggleFavorite(collection.id);
    }
  }, [collection, onToggleFavorite]);

  // Handle alert button
  const handleOpenAlert = useCallback(() => {
    if (collection) {
      onOpenAlert(collection);
    }
  }, [collection, onOpenAlert]);

  if (!isOpen || !collection) return null;

  // Format BTC values - data is already in BTC from the API, NOT in satoshis
  const formatBTC = (value: number) => {
    if (value >= 1) return value.toFixed(4);
    if (value >= 0.01) return value.toFixed(6);
    if (value >= 0.0001) return value.toFixed(6);
    return value.toFixed(8);
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  // Marketplace links (placeholder URLs)
  const marketplaces = [
    { name: 'Magic Eden', url: `https://magiceden.io/ordinals/marketplace/${collection.symbol}` },
    { name: 'UniSat', url: `https://unisat.io/market/collection/${collection.symbol}` },
    { name: 'OKX', url: `https://www.okx.com/web3/marketplace/ordinals/collection/${collection.symbol}` }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <Card
          variant="bordered"
          padding="none"
          className="w-full max-w-4xl bg-[#0a0a0f] border-[#2a2a3e] my-8"
          onClick={handleContentClick}
        >
          {/* Header */}
          <CardHeader className="border-b border-[#2a2a3e] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                {/* Collection Image */}
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-[#2a2a3e] flex-shrink-0">
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%232a2a3e" width="100" height="100"/%3E%3Ctext fill="%23666" font-family="Arial" font-size="40" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E%3F%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2a2a3e] flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Collection Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{collection.name}</h2>
                    {collection.symbol && (
                      <span className="px-2 py-1 bg-[#2a2a3e] text-gray-400 text-xs font-mono rounded">
                        {collection.symbol}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <FavoriteButton
                      isFavorite={collection.isFavorite}
                      onToggle={handleToggleFavorite}
                      size="lg"
                    />
                    <AlertButton
                      onClick={handleOpenAlert}
                      hasActiveAlert={hasActiveAlert}
                      size="lg"
                    />
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Floor Price */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">FLOOR PRICE</div>
                </div>
                <div className="text-xl font-mono font-bold text-white mb-1">
                  {formatBTC(collection.floorPrice)} BTC
                </div>
                <PriceChange value={collection.priceChange24h} showIcon={false} />
              </div>

              {/* 24h Volume (falls back to Total Volume when 24h is 0) */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">
                    {collection.volume24h > 0 ? '24H VOLUME' : 'TOTAL VOLUME'}
                  </div>
                </div>
                <div className="text-xl font-mono font-bold text-white">
                  {formatBTC(collection.volume24h > 0 ? collection.volume24h : (collection.totalVolume ?? 0))} BTC
                </div>
              </div>

              {/* 7d Volume (falls back to Listed count when 7d is 0) */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">
                    {collection.volume7d > 0 ? '7D VOLUME' : 'LISTED'}
                  </div>
                </div>
                <div className="text-xl font-mono font-bold text-white">
                  {collection.volume7d > 0
                    ? `${formatBTC(collection.volume7d)} BTC`
                    : formatNumber(collection.listed)
                  }
                </div>
              </div>

              {/* Market Cap */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">MARKET CAP</div>
                </div>
                <div className="text-xl font-mono font-bold text-white">
                  {formatBTC(collection.marketCap)} BTC
                </div>
              </div>
            </div>

            {/* Additional Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Supply */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">SUPPLY</div>
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  {formatNumber(collection.supply)}
                </div>
              </div>

              {/* Owners */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">OWNERS</div>
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  {formatNumber(collection.owners)}
                </div>
              </div>

              {/* Listed */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">LISTED</div>
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  {formatNumber(collection.listed)}
                </div>
              </div>

              {/* Listed % */}
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-500 font-semibold">LISTED %</div>
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  {collection.supply > 0 ? ((collection.listed / collection.supply) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
            </div>

            {/* Volume Chart */}
            {collection.volumeHistory && collection.volumeHistory.length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase">Volume Trend</h3>
                  <div className="text-xs text-gray-500">Last 7 days</div>
                </div>
                <Sparkline
                  data={collection.volumeHistory}
                  width={800}
                  height={120}
                  color="#f59e0b"
                  className="w-full"
                />
              </div>
            )}

            {/* Price Change Indicator */}
            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase mb-2">24H Price Change</h3>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-mono font-bold">
                      {collection.priceChange24h > 0 ? (
                        <span className="text-green-400">+{collection.priceChange24h.toFixed(2)}%</span>
                      ) : collection.priceChange24h < 0 ? (
                        <span className="text-red-400">{collection.priceChange24h.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-400">{collection.priceChange24h.toFixed(2)}%</span>
                      )}
                    </div>
                    {collection.priceChange24h > 0 ? (
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    ) : collection.priceChange24h < 0 ? (
                      <TrendingDown className="w-8 h-8 text-red-400" />
                    ) : null}
                  </div>
                </div>
                <PriceChange value={collection.priceChange24h} className="text-base px-4 py-2" />
              </div>
            </div>

            {/* Marketplace Links */}
            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              <h3 className="text-sm font-bold text-white uppercase mb-4">View on Marketplaces</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {marketplaces.map((marketplace) => (
                  <a
                    key={marketplace.name}
                    href={marketplace.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg hover:border-[#f59e0b] transition-colors group"
                  >
                    <span className="text-sm font-semibold text-white group-hover:text-[#f59e0b] transition-colors">
                      {marketplace.name}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#f59e0b] transition-colors" />
                  </a>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[#2a2a3e]">
              <Button
                variant="secondary"
                size="lg"
                onClick={onClose}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleToggleFavorite}
                className="flex-1 gap-2"
              >
                <Star className="w-4 h-4" fill={collection.isFavorite ? 'currentColor' : 'none'} />
                {collection.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleOpenAlert}
                className="flex-1 gap-2"
              >
                <Bell className="w-4 h-4" fill={hasActiveAlert ? 'currentColor' : 'none'} />
                {hasActiveAlert ? 'Edit Alert' : 'Set Alert'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
});

CollectionDetailsModal.displayName = 'CollectionDetailsModal';
