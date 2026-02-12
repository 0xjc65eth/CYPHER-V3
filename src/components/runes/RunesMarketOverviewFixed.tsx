'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Star,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Types from Hiro API
interface HiroRune {
  id: string;
  name: string;
  spaced_name: string;
  number: number;
  symbol: string;
  decimals: number;
  supply: string;
  burned: string;
  premine: string;
  mint_terms?: any;
  turbo: boolean;
  timestamp: string | null;
  etching_tx_id: string | null;
  etching_block_height: number | null;
  holders: number | null;
}

interface MarketStats {
  totalRunes: number;
  totalHolders: number;
  totalSupply: string;
  averageHolders: number;
}

type SortKey = 'number' | 'name' | 'supply' | 'holders' | 'timestamp';
type SortDir = 'asc' | 'desc';

const WATCHLIST_STORAGE_KEY = 'runes_watchlist';

export default function RunesMarketOverviewFixed() {
  const [runes, setRunes] = useState<HiroRune[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showOnlyWatchlist, setShowOnlyWatchlist] = useState(false);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  }, []);

  // Toggle watchlist
  const toggleWatchlist = useCallback((runeName: string) => {
    setWatchlist((prev) => {
      const newWatchlist = prev.includes(runeName)
        ? prev.filter((name) => name !== runeName)
        : [...prev, runeName];

      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newWatchlist));
      } catch (error) {
        console.error('Failed to save watchlist:', error);
      }

      return newWatchlist;
    });
  }, []);

  // Fetch runes data - try Magic Eden (popular) first, fallback to Hiro
  const fetchRunesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try Magic Eden API first (has real market data, volume, prices)
      let response = await fetch('/api/runes/popular?limit=60&offset=0&sort=volume24h');

      // Fallback to Hiro API if Magic Eden fails
      if (!response.ok) {
        response = await fetch('/api/runes/list?limit=60&offset=0');
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setRunes(data.data);
        setLastUpdate(Date.now());
      } else {
        throw new Error(data.error || 'Failed to fetch runes data');
      }
    } catch (err) {
      console.error('Error fetching runes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchRunesData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchRunesData, 30000);

    return () => clearInterval(interval);
  }, [fetchRunesData]);

  // Calculate market stats
  const marketStats: MarketStats = React.useMemo(() => {
    const totalHolders = runes.reduce((sum, rune) => sum + (rune.holders || 0), 0);
    const runesWithHolders = runes.filter(r => r.holders && r.holders > 0);

    return {
      totalRunes: runes.length,
      totalHolders,
      totalSupply: runes.reduce((sum, r) => {
        const supply = r.supply || 0;
        const parsed = typeof supply === 'string' ? parseFloat(supply) : supply;
        return sum + BigInt(Math.floor(parsed));
      }, BigInt(0)).toString(),
      averageHolders: runesWithHolders.length > 0
        ? Math.round(totalHolders / runesWithHolders.length)
        : 0
    };
  }, [runes]);

  // Filter and sort runes
  const processedRunes = React.useMemo(() => {
    let filtered = [...runes];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rune) =>
          rune.name.toLowerCase().includes(search) ||
          rune.spaced_name.toLowerCase().includes(search) ||
          rune.symbol.toLowerCase().includes(search)
      );
    }

    // Apply watchlist filter
    if (showOnlyWatchlist) {
      filtered = filtered.filter((rune) => watchlist.includes(rune.name));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case 'number':
          aValue = a.number;
          bValue = b.number;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'supply':
          aValue = BigInt(a.supply || 0);
          bValue = BigInt(b.supply || 0);
          break;
        case 'holders':
          aValue = a.holders || 0;
          bValue = b.holders || 0;
          break;
        case 'timestamp':
          aValue = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          bValue = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (isNaN(aValue)) aValue = 0;
          if (isNaN(bValue)) bValue = 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDir === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'bigint') {
        return sortDir === 'asc'
          ? aValue < bValue ? -1 : aValue > bValue ? 1 : 0
          : bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }

      return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [runes, searchTerm, sortKey, sortDir, showOnlyWatchlist, watchlist]);

  // Handle sort column click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Format functions
  const formatNumber = (num: number | string): string => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '--';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const formatSupply = (supply: string): string => {
    try {
      const supplyNum = Number(supply) / 1e8; // Assuming 8 decimals
      return formatNumber(supplyNum);
    } catch {
      return '--';
    }
  };

  const timeAgo = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '--';
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return '--';
    const diff = Date.now() - time;
    if (diff < 0 || diff > 365 * 86_400_000) return '--';
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === 'asc' ?
      <TrendingUp className="h-3 w-3 ml-1 text-green-400" /> :
      <TrendingDown className="h-3 w-3 ml-1 text-red-400" />;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Runes Market Overview</h1>
          <p className="text-sm text-gray-400 mt-1">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>

        <Button
          onClick={fetchRunesData}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Market Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Runes</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {marketStats.totalRunes}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Holders</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatNumber(marketStats.totalHolders)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Holders</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatNumber(marketStats.averageHolders)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Watchlist</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {watchlist.length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <Button
              variant={showOnlyWatchlist ? 'default' : 'outline'}
              onClick={() => setShowOnlyWatchlist(!showOnlyWatchlist)}
              className={showOnlyWatchlist ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
            >
              <Star className="h-4 w-4 mr-2" />
              Watchlist ({watchlist.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Runes Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">
            Runes List ({processedRunes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500 rounded text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading && !runes.length ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
              <span className="ml-3 text-gray-400">Loading runes data...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">
                      <button
                        onClick={() => handleSort('number')}
                        className="flex items-center hover:text-white"
                      >
                        # {getSortIndicator('number')}
                      </button>
                    </TableHead>
                    <TableHead className="text-gray-400">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-white"
                      >
                        Rune {getSortIndicator('name')}
                      </button>
                    </TableHead>
                    <TableHead className="text-gray-400">Symbol</TableHead>
                    <TableHead className="text-gray-400 text-right">
                      <button
                        onClick={() => handleSort('supply')}
                        className="flex items-center ml-auto hover:text-white"
                      >
                        Supply {getSortIndicator('supply')}
                      </button>
                    </TableHead>
                    <TableHead className="text-gray-400 text-right">
                      <button
                        onClick={() => handleSort('holders')}
                        className="flex items-center ml-auto hover:text-white"
                      >
                        Holders {getSortIndicator('holders')}
                      </button>
                    </TableHead>
                    <TableHead className="text-gray-400">
                      <button
                        onClick={() => handleSort('timestamp')}
                        className="flex items-center hover:text-white"
                      >
                        Created {getSortIndicator('timestamp')}
                      </button>
                    </TableHead>
                    <TableHead className="text-gray-400 text-center">Watch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRunes.map((rune) => (
                    <TableRow
                      key={rune.id}
                      className="border-gray-700 hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="text-gray-400">
                        #{rune.number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {rune.spaced_name || rune.name}
                          </div>
                          {rune.turbo && (
                            <Badge className="mt-1 bg-orange-500/20 text-orange-400 text-xs">
                              TURBO
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {rune.symbol || '--'}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {formatSupply(rune.supply)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rune.holders ? (
                          <span className="text-blue-400">{formatNumber(rune.holders)}</span>
                        ) : (
                          <span className="text-gray-500">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {timeAgo(rune.timestamp)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => toggleWatchlist(rune.name)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              watchlist.includes(rune.name)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {processedRunes.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                  {showOnlyWatchlist
                    ? 'No runes in your watchlist'
                    : 'No runes found'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
