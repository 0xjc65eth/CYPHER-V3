'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Activity,
  DollarSign,
  BarChart3,
  Star,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  ProfessionalTable,
  TableColumn,
  MetricsCard,
  MetricsGrid,
} from '@/components/ui/professional';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/common/ExportButton';
import { useRunesMarketOverview, EnrichedRune, MarketStats } from '@/hooks/useRunesMarketOverview';

export default function MarketOverviewPro() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Use React Query hook for data fetching (replaces 101 client-side API calls!)
  const { data, isLoading, error: queryError, refetch } = useRunesMarketOverview({
    limit: 100,
    refetchInterval: 60000, // Auto-refresh every 60s
  });

  // Extract data from query response
  const runes = data?.data || [];
  const stats = data?.stats || {
    totalRunes: 0,
    totalHolders: 0,
    totalVolume24h: 0,
    totalMarketCap: 0,
    turboRunes: 0,
    activeListings: 0,
  };
  const loading = isLoading;
  const error = queryError?.message || null;
  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : new Date();

  // Load watchlist
  useEffect(() => {
    const stored = localStorage.getItem('runes_watchlist');
    if (stored) setWatchlist(JSON.parse(stored));
  }, []);

  // Toggle watchlist
  const toggleWatchlist = (runeName: string) => {
    setWatchlist(prev => {
      const newList = prev.includes(runeName)
        ? prev.filter(n => n !== runeName)
        : [...prev, runeName];
      localStorage.setItem('runes_watchlist', JSON.stringify(newList));
      return newList;
    });
  };

  // Table columns
  // FIX: format signature is (cellValue, row, index) not (row)!
  const columns: TableColumn<EnrichedRune>[] = [
    {
      key: 'number',
      label: '#',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-500 text-xs font-mono">{rune.number}</span>
      ),
    },
    {
      key: 'spaced_name',
      label: 'Rune',
      sortable: true,
      filterable: true,
      format: (_value, rune) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleWatchlist(rune.spaced_name)}
            className="hover:scale-110 transition-transform"
          >
            <Star
              className={`h-4 w-4 ${
                watchlist.includes(rune.spaced_name)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
          <span className="text-lg">{rune.symbol}</span>
          <div className="flex flex-col">
            <span className="text-white text-sm font-semibold">
              {rune.spaced_name}
            </span>
            <span className="text-xs text-gray-500">
              {rune.holders?.toLocaleString() || 0} holders
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'floorPrice',
      label: 'Floor Price',
      sortable: true,
      format: (_value, rune) => (
        <div className="flex flex-col">
          <span className="text-white text-sm font-mono">
            {rune.floorPrice ? `${(rune.floorPrice / 100_000_000).toFixed(8)} BTC` : '—'}
          </span>
          {rune.floorPrice && (
            <span className="text-xs text-gray-500">
              ${((rune.floorPrice / 100_000_000) * 65000).toFixed(2)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'volume24h',
      label: '24h Volume',
      sortable: true,
      format: (_value, rune) => (
        <div className="flex flex-col">
          <span className="text-white text-sm font-mono">
            {rune.volume24h ? `${(rune.volume24h / 100_000_000).toFixed(4)} BTC` : '—'}
          </span>
          {rune.volume24h && (
            <span className="text-xs text-gray-500">
              ${((rune.volume24h / 100_000_000) * 65000).toFixed(0)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'listed',
      label: 'Listed',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-300 text-xs">
          {rune.listed?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      key: 'sales24h',
      label: '24h Sales',
      sortable: true,
      format: (_value, rune) => (
        <span className="text-gray-300 text-xs">
          {rune.sales24h?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      key: 'supply',
      label: 'Supply',
      sortable: true,
      format: (_value, rune) => {
        const supply = parseFloat(rune.supply);
        const formatted = supply >= 1_000_000_000
          ? `${(supply / 1_000_000_000).toFixed(2)}B`
          : supply >= 1_000_000
          ? `${(supply / 1_000_000).toFixed(2)}M`
          : supply.toLocaleString();

        return (
          <span className="text-gray-300 text-xs font-mono">{formatted}</span>
        );
      },
    },
  ];

  if (loading && runes.length === 0) {
    return (
      <div className="space-y-4 bg-black p-4">
        <MetricsGrid columns={4}>
          <MetricsCard title="Total Runes" value="..." icon={Activity} loading />
          <MetricsCard title="Total Holders" value="..." icon={Users} loading />
          <MetricsCard title="24h Volume" value="..." icon={DollarSign} loading />
          <MetricsCard title="Market Cap" value="..." icon={BarChart3} loading />
        </MetricsGrid>
        <div className="flex items-center justify-center h-96 bg-gray-900/40 border border-gray-800 rounded">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-orange-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading real-time market data from Magic Eden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-black p-4">
        <div className="flex flex-col items-center gap-3 p-6 bg-gray-900 border border-red-500/50 rounded-lg">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <span className="text-red-400 text-sm">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-black p-4">
      {/* Professional Metrics */}
      <MetricsGrid columns={4}>
        <MetricsCard
          title="Total Runes"
          value={stats.totalRunes.toLocaleString()}
          subtitle="UniSat Indexer"
          icon={Activity}
          iconColor="text-orange-500"
        />
        <MetricsCard
          title="Total Holders"
          value={stats.totalHolders.toLocaleString()}
          subtitle="Across all runes"
          icon={Users}
          iconColor="text-blue-500"
        />
        <MetricsCard
          title="24h Volume"
          value={`${(stats.totalVolume24h / 100_000_000).toFixed(2)} BTC`}
          subtitle={`$${((stats.totalVolume24h / 100_000_000) * 65000).toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <MetricsCard
          title="Market Cap"
          value={`${(stats.totalMarketCap / 100_000_000).toFixed(2)} BTC`}
          subtitle={`${stats.activeListings.toLocaleString()} active listings`}
          icon={BarChart3}
          iconColor="text-purple-500"
        />
      </MetricsGrid>

      {/* Professional Table */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-terminal overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
              Runes Market Overview
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time data from Magic Eden • Last update: {lastUpdate.toLocaleTimeString()} • Source: {data?.source || 'loading'}
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              type="custom"
              data={runes}
              columns={[
                { key: 'number', label: 'Rune #' },
                { key: 'spaced_name', label: 'Name' },
                { key: 'symbol', label: 'Symbol' },
                { key: 'floorPrice', label: 'Floor Price (sats)' },
                { key: 'volume24h', label: '24h Volume (sats)' },
                { key: 'holders', label: 'Holders' },
                { key: 'supply', label: 'Supply' },
              ]}
              title="Runes Market Overview"
              filename="runes-market-overview"
              size="sm"
              variant="outline"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <ProfessionalTable
          data={runes}
          columns={columns}
          keyField="id"
          searchable
          exportable
          pagination={{
            enabled: true,
            pageSize: 20,
            showPageSizeSelector: true
          }}
          dense
          emptyMessage="No runes found"
        />
      </div>

      {/* Data Source Attribution */}
      <div className="text-xs text-gray-600 text-center">
        Data sourced from UniSat Runes API (indexer) + Magic Eden Runes API (marketplace) • Updated every 60 seconds
      </div>
    </div>
  );
}
