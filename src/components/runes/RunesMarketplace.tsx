'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart, TrendingUp, DollarSign, Activity, Search,
  RefreshCw, ExternalLink, AlertTriangle, Copy,
} from 'lucide-react';
import {
  ProfessionalTable,
  TableColumn,
  MetricsCard,
  MetricsGrid,
} from '@/components/ui/professional';
import { ExportButton } from '@/components/common/ExportButton';

// Gamma.io removed — using Xverse + UniSat as data sources

const safeFixed = (value: any, decimals = 2): string =>
  (typeof value === 'number' && !isNaN(value)) ? value.toFixed(decimals) : '0'.padEnd(decimals > 0 ? decimals + 2 : 1, '0');

// Types
interface RuneListing {
  id: string;
  rune: string;
  runeName: string;
  amount: number;
  unitPrice: number; // sats per rune
  totalPrice: number; // total sats
  seller: string;
  source: 'UniSat' | 'Xverse';
  listedAt: string;
  txid?: string;
}

interface MarketplaceStats {
  totalListings: number;
  totalVolume24h: number;
  uniqueSellers: number;
  avgPrice: number;
}

export default function RunesMarketplace() {
  const [listings, setListings] = useState<RuneListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRune, setSelectedRune] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [btcPrice, setBtcPrice] = useState(0);

  // Fetch real BTC price for USD conversions
  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        const res = await fetch('/api/market/bitcoin/');
        if (res.ok) {
          const data = await res.json();
          const price = data.price || data.data?.price || 0;
          if (price > 0) setBtcPrice(price);
        }
      } catch { /* use 0 — show BTC only */ }
    };
    fetchBtcPrice();
    const interval = setInterval(fetchBtcPrice, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch marketplace listings from Xverse + UniSat
  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from Xverse (recent trades) and UniSat (auctions) in parallel
      const [xverseRes, auctionsRes, runesRes] = await Promise.all([
        fetch('/api/runes/market-overview/?limit=50'),
        fetch('/api/unisat/runes/auctions/?limit=100'),
        fetch('/api/unisat/runes/list/?limit=50')
      ]);

      const xverseData = xverseRes.ok ? await xverseRes.json() : { data: [] };
      const unisatAuctions = auctionsRes.ok ? await auctionsRes.json() : { list: [] };
      const topRunes = runesRes.ok ? await runesRes.json() : { list: [] };

      const auctionList = Array.isArray(unisatAuctions?.list) ? unisatAuctions.list : [];

      // Convert UniSat auctions to listings
      const unisatListings: RuneListing[] = auctionList.map((auction: any) => {
        const unitPrice = parseFloat(auction.unitPrice || '0');
        const amount = parseFloat(auction.amount || '0');

        return {
          id: auction.orderId || `${auction.txid}-${Date.now()}`,
          rune: auction.rune || auction.runeName || 'UNKNOWN',
          runeName: auction.spacedRune || auction.rune || 'UNKNOWN',
          amount: amount,
          unitPrice: unitPrice,
          totalPrice: unitPrice * amount,
          seller: auction.seller || auction.address || 'Unknown',
          source: 'UniSat' as const,
          listedAt: auction.timestamp || new Date().toISOString(),
          txid: auction.txid
        };
      });

      // Convert Xverse market data to listings (these have real floor prices)
      const xverseRunes = Array.isArray(xverseData?.data) ? xverseData.data : [];
      const xverseListings: RuneListing[] = xverseRunes
        .filter((r: any) => r.floorPrice > 0)
        .map((r: any, idx: number) => ({
          id: `xverse-${r.id || idx}`,
          rune: r.name || 'UNKNOWN',
          runeName: r.spaced_name || r.name || 'UNKNOWN',
          amount: r.listed || 1,
          unitPrice: r.floorPrice || 0,
          totalPrice: (r.floorPrice || 0) * (r.listed || 1),
          seller: 'Market Floor',
          source: 'UniSat' as const,
          listedAt: new Date().toISOString(),
        }));

      // Combine and sort by price
      const allListings = [...unisatListings, ...xverseListings]
        .filter(l => l.unitPrice > 0)
        .sort((a, b) => a.unitPrice - b.unitPrice);

      setListings(allListings);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[Marketplace] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch marketplace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      const matchesSearch = searchTerm === '' ||
        listing.runeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRune = selectedRune === 'all' || listing.runeName === selectedRune;
      return matchesSearch && matchesRune;
    });
  }, [listings, searchTerm, selectedRune]);

  // Calculate stats
  const stats: MarketplaceStats = useMemo(() => {
    const totalListings = filteredListings.length;
    const totalVolume24h = filteredListings.reduce((sum, l) => sum + l.totalPrice, 0);
    const uniqueSellers = new Set(filteredListings.map(l => l.seller)).size;
    const avgPrice = totalListings > 0 ? totalVolume24h / totalListings : 0;

    return {
      totalListings,
      totalVolume24h,
      uniqueSellers,
      avgPrice
    };
  }, [filteredListings]);

  // Get unique runes for filter
  const uniqueRunes = useMemo(() => {
    return Array.from(new Set(listings.map(l => l.runeName))).sort();
  }, [listings]);

  // Table columns
  // FIX: format signature is (cellValue, row, index) not (row)!
  const columns: TableColumn<RuneListing>[] = [
    {
      key: 'runeName',
      label: 'Rune',
      sortable: true,
      filterable: true,
      format: (_value, listing) => (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">
            {listing.runeName}
          </span>
          <Badge variant="outline" className="text-xs">
            {listing.source}
          </Badge>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      format: (_value, listing) => (
        <span className="text-gray-300 text-sm font-mono">
          {listing.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      label: 'Unit Price',
      sortable: true,
      format: (_value, listing) => (
        <div className="flex flex-col">
          <span className="text-white text-sm font-mono">
            {listing.unitPrice.toLocaleString()} sats
          </span>
          <span className="text-xs text-gray-500">
            {btcPrice > 0 ? `$${safeFixed(listing.unitPrice * (btcPrice / 100_000_000), 6)}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'totalPrice',
      label: 'Total Price',
      sortable: true,
      format: (_value, listing) => (
        <div className="flex flex-col">
          <span className="text-white text-sm font-mono">
            {safeFixed(listing.totalPrice / 100_000_000, 8)} BTC
          </span>
          <span className="text-xs text-gray-500">
            {btcPrice > 0 ? `$${safeFixed((listing.totalPrice / 100_000_000) * btcPrice, 2)}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'seller',
      label: 'Seller',
      format: (_value, listing) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-mono">
            {listing.seller.slice(0, 8)}...{listing.seller.slice(-6)}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(listing.seller);
            }}
            className="hover:text-orange-400 text-gray-600"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      ),
    },
    {
      key: 'listedAt',
      label: 'Listed',
      sortable: true,
      format: (_value, listing) => {
        const diff = Date.now() - new Date(listing.listedAt).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        return (
          <span className="text-gray-400 text-xs">
            {days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : '<1h ago'}
          </span>
        );
      },
    },
    {
      key: 'txid',
      label: 'Actions',
      format: (_value, listing) => (
        <div className="flex gap-1">
          {listing.txid && (
            <a
              href={`https://mempool.space/tx/${listing.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  if (loading && listings.length === 0) {
    return (
      <div className="space-y-4 bg-black p-4">
        <MetricsGrid columns={4}>
          <MetricsCard title="Total Listings" value="..." icon={ShoppingCart} loading />
          <MetricsCard title="24h Volume" value="..." icon={DollarSign} loading />
          <MetricsCard title="Sellers" value="..." icon={Activity} loading />
          <MetricsCard title="Avg Price" value="..." icon={TrendingUp} loading />
        </MetricsGrid>
        <div className="flex items-center justify-center h-96 bg-gray-900/40 border border-gray-800 rounded">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-orange-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading marketplace from Xverse + UniSat...</p>
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
            onClick={fetchListings}
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
          title="Total Listings"
          value={stats.totalListings.toLocaleString()}
          subtitle="Active orders"
          icon={ShoppingCart}
          iconColor="text-orange-500"
        />
        <MetricsCard
          title="24h Volume"
          value={`${safeFixed(stats.totalVolume24h / 100_000_000, 2)} BTC`}
          subtitle={btcPrice > 0 ? `$${((stats.totalVolume24h / 100_000_000) * btcPrice).toLocaleString()}` : 'BTC only'}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <MetricsCard
          title="Unique Sellers"
          value={stats.uniqueSellers.toLocaleString()}
          subtitle="Active sellers"
          icon={Activity}
          iconColor="text-blue-500"
        />
        <MetricsCard
          title="Avg Price"
          value={`${safeFixed(stats.avgPrice / 100_000_000, 8)} BTC`}
          subtitle="Per listing"
          icon={TrendingUp}
          iconColor="text-purple-500"
        />
      </MetricsGrid>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-gray-900/40 border border-gray-800 rounded p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search runes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
        <select
          value={selectedRune}
          onChange={(e) => setSelectedRune(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-2 text-sm"
        >
          <option value="all">All Runes</option>
          {uniqueRunes.map(rune => (
            <option key={rune} value={rune}>{rune}</option>
          ))}
        </select>
      </div>

      {/* Listings Table */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-terminal overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
              Active Marketplace Listings
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time orders from Xverse + UniSat • Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              type="custom"
              data={filteredListings}
              columns={[
                { key: 'runeName', label: 'Rune' },
                { key: 'amount', label: 'Amount' },
                { key: 'unitPrice', label: 'Unit Price (sats)' },
                { key: 'totalPrice', label: 'Total Price (sats)' },
                { key: 'seller', label: 'Seller' },
                { key: 'source', label: 'Source' },
              ]}
              title="Runes Marketplace Listings"
              filename="runes-marketplace"
              size="sm"
              variant="outline"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchListings}
              disabled={loading}
              className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <ProfessionalTable
          data={filteredListings}
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
          emptyMessage="No listings found"
        />
      </div>

      {/* Data Source Attribution */}
      <div className="text-xs text-gray-600 text-center">
        Marketplace data from Xverse + UniSat Runes APIs • Updated every 60 seconds
      </div>
    </div>
  );
}
