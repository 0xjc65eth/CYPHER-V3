'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Bell,
  Download,
  Search,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/primitives/Button';
import { Badge } from '@/components/ui/primitives/Badge';
import { Input } from '@/components/ui/primitives/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/primitives/Card';
import { cn } from '@/lib/utils';
import type {
  ProcessedCollection,
  FilterOptions,
  PriceAlert,
  SortField
} from '@/types/ordinals';

// ============================================================================
// SPARKLINE COMPONENT
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const Sparkline = memo<SparklineProps>(({
  data,
  width = 60,
  height = 20,
  color = '#f59e0b',
  className
}) => {
  const points = useMemo(() => {
    if (!data || data.length === 0) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, width, height]);

  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#2a2a3e"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
});

Sparkline.displayName = 'Sparkline';

// ============================================================================
// PRICE CHANGE COMPONENT
// ============================================================================

interface PriceChangeProps {
  value: number;
  className?: string;
  showIcon?: boolean;
}

export const PriceChange = memo<PriceChangeProps>(({
  value,
  className,
  showIcon = true
}) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold',
        isNeutral
          ? 'bg-gray-500/20 text-gray-400'
          : isPositive
          ? 'bg-green-500/20 text-green-400'
          : 'bg-red-500/20 text-red-400',
        className
      )}
    >
      {showIcon && !isNeutral && (
        isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )
      )}
      <span>
        {isPositive && '+'}
        {value.toFixed(2)}%
      </span>
    </div>
  );
});

PriceChange.displayName = 'PriceChange';

// ============================================================================
// FAVORITE BUTTON COMPONENT
// ============================================================================

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FavoriteButton = memo<FavoriteButtonProps>(({
  isFavorite,
  onToggle,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={onToggle}
      className={cn(
        'p-1 rounded transition-all duration-200 hover:bg-[#f59e0b]/10',
        isFavorite ? 'text-[#f59e0b]' : 'text-gray-500 hover:text-[#f59e0b]',
        className
      )}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={cn(sizeClasses[size], 'transition-all')}
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  );
});

FavoriteButton.displayName = 'FavoriteButton';

// ============================================================================
// ALERT BUTTON COMPONENT
// ============================================================================

interface AlertButtonProps {
  onClick: () => void;
  hasActiveAlert?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AlertButton = memo<AlertButtonProps>(({
  onClick,
  hasActiveAlert = false,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-1 rounded transition-all duration-200 hover:bg-[#f59e0b]/10',
        hasActiveAlert ? 'text-[#f59e0b]' : 'text-gray-500 hover:text-white',
        className
      )}
      aria-label="Set price alert"
    >
      <Bell
        className={cn(sizeClasses[size])}
        fill={hasActiveAlert ? 'currentColor' : 'none'}
      />
      {hasActiveAlert && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse" />
      )}
    </button>
  );
});

AlertButton.displayName = 'AlertButton';

// ============================================================================
// FILTER BAR COMPONENT
// ============================================================================

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  className?: string;
}

export const FilterBar = memo<FilterBarProps>(({
  filters,
  onFiltersChange,
  className
}) => {
  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          type="text"
          placeholder="Search collections..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="pl-10 pr-10"
          fullWidth
        />
        {filters.searchQuery && (
          <button
            onClick={() => updateFilter('searchQuery', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Min Price */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-semibold">MIN PRICE (BTC)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={filters.minPrice ?? ''}
            onChange={(e) => updateFilter('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
            step="0.001"
            fullWidth
          />
        </div>

        {/* Max Price */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-semibold">MAX PRICE (BTC)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={filters.maxPrice ?? ''}
            onChange={(e) => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
            step="0.001"
            fullWidth
          />
        </div>

        {/* Min Volume */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-semibold">MIN VOL (BTC)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={filters.minVolume ?? ''}
            onChange={(e) => updateFilter('minVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
            step="0.1"
            fullWidth
          />
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-semibold">SORT BY</label>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [SortField, 'asc' | 'desc'];
              onFiltersChange({ ...filters, sortBy, sortOrder });
            }}
            className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3e] rounded text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/50 focus:border-[#f59e0b]"
          >
            <option value="volume24h-desc">Volume (High to Low)</option>
            <option value="volume24h-asc">Volume (Low to High)</option>
            <option value="floorPrice-desc">Floor Price (High to Low)</option>
            <option value="floorPrice-asc">Floor Price (Low to High)</option>
            <option value="priceChange24h-desc">% Change (High to Low)</option>
            <option value="priceChange24h-asc">% Change (Low to High)</option>
            <option value="marketCap-desc">Market Cap (High to Low)</option>
            <option value="marketCap-asc">Market Cap (Low to High)</option>
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
          </select>
        </div>
      </div>

      {/* Favorites Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateFilter('showFavoritesOnly', !filters.showFavoritesOnly)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
            filters.showFavoritesOnly
              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/50'
              : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e] hover:border-[#f59e0b]/50'
          )}
        >
          <Star className="w-4 h-4" fill={filters.showFavoritesOnly ? 'currentColor' : 'none'} />
          Favorites Only
        </button>
      </div>
    </div>
  );
});

FilterBar.displayName = 'FilterBar';

// ============================================================================
// EXPORT BUTTON COMPONENT
// ============================================================================

interface ExportButtonProps {
  data: ProcessedCollection[];
  fileName?: string;
  className?: string;
}

export const ExportButton = memo<ExportButtonProps>(({
  data,
  fileName = 'ordinals-data',
  className
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Dynamically import xlsx only when needed
      const XLSX = await import('xlsx');

      // Prepare data for Excel
      const exportData = data.map(collection => ({
        Name: collection.name,
        Symbol: collection.symbol,
        'Floor Price (BTC)': collection.floorPrice / 1e8,
        '24h Volume (BTC)': collection.volume24h / 1e8,
        '7d Volume (BTC)': collection.volume7d / 1e8,
        'Market Cap (BTC)': collection.marketCap / 1e8,
        '24h Change (%)': collection.priceChange24h,
        Listed: collection.listed,
        Owners: collection.owners,
        Supply: collection.supply
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ordinals Collections');

      // Set column widths
      const wscols = [
        { wch: 25 }, // Name
        { wch: 10 }, // Symbol
        { wch: 15 }, // Floor Price
        { wch: 15 }, // 24h Volume
        { wch: 15 }, // 7d Volume
        { wch: 15 }, // Market Cap
        { wch: 12 }, // 24h Change
        { wch: 10 }, // Listed
        { wch: 10 }, // Owners
        { wch: 10 }  // Supply
      ];
      ws['!cols'] = wscols;

      // Generate file name with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fullFileName);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  }, [data, fileName]);

  return (
    <Button
      onClick={handleExport}
      variant="secondary"
      size="md"
      loading={exporting}
      disabled={data.length === 0}
      className={className}
    >
      <Download className="w-4 h-4" />
      Export to Excel
    </Button>
  );
});

ExportButton.displayName = 'ExportButton';

// ============================================================================
// ALERT MODAL COMPONENT
// ============================================================================

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: ProcessedCollection | null;
  existingAlert?: PriceAlert;
  onSave: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  onDelete?: (alertId: string) => void;
}

export const AlertModal = memo<AlertModalProps>(({
  isOpen,
  onClose,
  collection,
  existingAlert,
  onSave,
  onDelete
}) => {
  const [alertType, setAlertType] = useState<'above' | 'below'>(existingAlert?.type || 'above');
  const [targetPrice, setTargetPrice] = useState<string>(
    existingAlert ? (existingAlert.targetPrice / 1e8).toString() : ''
  );
  const [isActive, setIsActive] = useState(existingAlert?.isActive ?? true);

  const handleSave = useCallback(() => {
    if (!collection || !targetPrice) return;

    const targetPriceSats = parseFloat(targetPrice) * 1e8;

    onSave({
      collectionId: collection.id,
      collectionName: collection.name,
      type: alertType,
      targetPrice: targetPriceSats,
      currentPrice: collection.floorPrice,
      isActive
    });

    onClose();
  }, [collection, targetPrice, alertType, isActive, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (existingAlert && onDelete) {
      onDelete(existingAlert.id);
      onClose();
    }
  }, [existingAlert, onDelete, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card
          variant="bordered"
          padding="lg"
          className="w-full max-w-md bg-[#0a0a0f] border-[#2a2a3e]"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {existingAlert ? 'Edit Price Alert' : 'Create Price Alert'}
                </h2>
                {collection && (
                  <p className="text-sm text-gray-400">{collection.name}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Current Price */}
            {collection && (
              <div className="p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
                <div className="text-xs text-gray-500 mb-1 font-semibold">CURRENT FLOOR PRICE</div>
                <div className="text-lg font-mono font-bold text-white">
                  {(collection.floorPrice / 1e8).toFixed(8)} BTC
                </div>
              </div>
            )}

            {/* Alert Type */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-semibold">ALERT WHEN PRICE GOES</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAlertType('above')}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-sm font-semibold',
                    alertType === 'above'
                      ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]'
                      : 'border-[#2a2a3e] bg-[#1a1a2e] text-gray-400 hover:border-[#f59e0b]/50'
                  )}
                >
                  <TrendingUp className="w-4 h-4 mx-auto mb-1" />
                  Above Target
                </button>
                <button
                  onClick={() => setAlertType('below')}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-sm font-semibold',
                    alertType === 'below'
                      ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]'
                      : 'border-[#2a2a3e] bg-[#1a1a2e] text-gray-400 hover:border-[#f59e0b]/50'
                  )}
                >
                  <TrendingDown className="w-4 h-4 mx-auto mb-1" />
                  Below Target
                </button>
              </div>
            </div>

            {/* Target Price */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-semibold">TARGET PRICE (BTC)</label>
              <Input
                type="number"
                placeholder="0.00000000"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                step="0.00000001"
                fullWidth
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg">
              <span className="text-sm font-semibold text-white">Alert Active</span>
              <button
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  isActive ? 'bg-[#f59e0b]' : 'bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {existingAlert && onDelete && (
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  Delete Alert
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={!targetPrice || !collection}
                className="flex-1"
              >
                <Check className="w-4 h-4" />
                Save Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
});

AlertModal.displayName = 'AlertModal';

// ============================================================================
// ALERT NOTIFICATION COMPONENT
// ============================================================================

interface AlertNotificationProps {
  alert: PriceAlert & { triggered: boolean };
  onClose: () => void;
  className?: string;
}

export const AlertNotification = memo<AlertNotificationProps>(({
  alert,
  onClose,
  className
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 animate-in slide-in-from-right',
        className
      )}
    >
      <div className="bg-[#0a0a0f] border-2 border-[#f59e0b] rounded-lg p-4 shadow-2xl max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#f59e0b]/20 rounded-lg">
            <Bell className="w-5 h-5 text-[#f59e0b]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Price Alert Triggered</h3>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-300 mb-2">{alert.collectionName}</p>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Alert Type:</span>
                <span className="text-white font-semibold">
                  {alert.type === 'above' ? 'Above' : 'Below'} {(alert.targetPrice / 1e8).toFixed(8)} BTC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Price:</span>
                <span className="text-[#f59e0b] font-semibold">
                  {(alert.currentPrice / 1e8).toFixed(8)} BTC
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#2a2a3e] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-xs text-gray-400">
                {alert.type === 'above' ? 'Price has risen above' : 'Price has fallen below'} your target
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AlertNotification.displayName = 'AlertNotification';
