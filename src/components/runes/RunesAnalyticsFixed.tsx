'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Star,
  RefreshCw,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface AnalyticsData {
  topByHolders: HiroRune[];
  topBySupply: HiroRune[];
  recentlyCreated: HiroRune[];
  turboRunes: HiroRune[];
  marketMetrics: {
    totalRunes: number;
    totalHolders: number;
    averageHolders: number;
    totalSupply: string;
    runesWithHolders: number;
    turboRunesCount: number;
    averageSupply: string;
  };
}

const WATCHLIST_STORAGE_KEY = 'runes_watchlist';

export default function RunesAnalyticsFixed() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Load watchlist from localStorage
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

  // Fetch and process analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch more runes to get better analytics
      const response = await fetch('/api/runes/list?limit=60&offset=0');

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const runes: HiroRune[] = data.data;

        // Calculate analytics
        const totalHolders = runes.reduce((sum, r) => sum + (r.holders || 0), 0);
        const runesWithHolders = runes.filter(r => r.holders && r.holders > 0);
        const totalSupplyBigInt = runes.reduce((sum, r) => {
          const supply = r.supply || 0;
          const parsed = typeof supply === 'string' ? parseFloat(supply) : supply;
          return sum + BigInt(Math.floor(parsed));
        }, BigInt(0));

        const analyticsData: AnalyticsData = {
          // Top 10 by holders
          topByHolders: [...runes]
            .filter(r => r.holders && r.holders > 0)
            .sort((a, b) => (b.holders || 0) - (a.holders || 0))
            .slice(0, 10),

          // Top 10 by supply
          topBySupply: [...runes]
            .sort((a, b) => {
              // Handle supply with decimals (e.g., "630000.00")
              const aSupplyRaw = a.supply || 0;
              const aParsed = typeof aSupplyRaw === 'string' ? parseFloat(aSupplyRaw) : aSupplyRaw;
              const aSupply = BigInt(Math.floor(aParsed));

              const bSupplyRaw = b.supply || 0;
              const bParsed = typeof bSupplyRaw === 'string' ? parseFloat(bSupplyRaw) : bSupplyRaw;
              const bSupply = BigInt(Math.floor(bParsed));

              return aSupply < bSupply ? 1 : aSupply > bSupply ? -1 : 0;
            })
            .slice(0, 10),

          // 10 most recently created
          recentlyCreated: [...runes]
            .sort((a, b) => {
              const aT = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const bT = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return (isNaN(bT) ? 0 : bT) - (isNaN(aT) ? 0 : aT);
            })
            .slice(0, 10),

          // Turbo runes
          turboRunes: runes.filter(r => r.turbo).slice(0, 10),

          marketMetrics: {
            totalRunes: runes.length,
            totalHolders,
            averageHolders: runesWithHolders.length > 0
              ? Math.round(totalHolders / runesWithHolders.length)
              : 0,
            totalSupply: totalSupplyBigInt.toString(),
            runesWithHolders: runesWithHolders.length,
            turboRunesCount: runes.filter(r => r.turbo).length,
            averageSupply: runes.length > 0
              ? (totalSupplyBigInt / BigInt(runes.length)).toString()
              : '0'
          }
        };

        setAnalytics(analyticsData);
        setLastUpdate(Date.now());
      } else {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchAnalytics();

    // Refresh every 60 seconds
    const interval = setInterval(fetchAnalytics, 60000);

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // Format functions
  const formatNumber = (num: number | string): string => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '--';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const formatSupply = (supply: string, decimals: number = 8): string => {
    try {
      const supplyNum = Number(supply) / Math.pow(10, decimals);
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

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="bg-gray-900 border-red-500 max-w-md">
          <CardContent className="p-6">
            <div className="text-red-400 text-center">
              <p className="text-lg font-bold mb-2">Error Loading Analytics</p>
              <p className="text-sm">{error}</p>
              <Button
                onClick={fetchAnalytics}
                className="mt-4 bg-orange-500 hover:bg-orange-600"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Runes Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>

        <Button
          onClick={fetchAnalytics}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Market Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Runes</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {analytics.marketMetrics.totalRunes}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.marketMetrics.turboRunesCount} Turbo
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
                  {formatNumber(analytics.marketMetrics.totalHolders)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Across {analytics.marketMetrics.runesWithHolders} runes
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
                  {formatNumber(analytics.marketMetrics.averageHolders)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Per rune with holders
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-400" />
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
                <p className="text-xs text-gray-500 mt-1">
                  Tracked runes
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top by Holders */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Users className="h-5 w-5 mr-2 text-blue-400" />
              Top Runes by Holders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">#</TableHead>
                  <TableHead className="text-gray-400">Rune</TableHead>
                  <TableHead className="text-gray-400 text-right">Holders</TableHead>
                  <TableHead className="text-gray-400 text-center">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topByHolders.map((rune, index) => (
                  <TableRow key={rune.id} className="border-gray-700">
                    <TableCell className="text-gray-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-white">
                        {rune.spaced_name || rune.name}
                      </div>
                      {rune.turbo && (
                        <Badge className="mt-1 bg-orange-500/20 text-orange-400 text-xs">
                          TURBO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-blue-400">
                      {formatNumber(rune.holders || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleWatchlist(rune.name)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-4 w-4 ${
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
          </CardContent>
        </Card>

        {/* Top by Supply */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <PieChart className="h-5 w-5 mr-2 text-green-400" />
              Top Runes by Supply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">#</TableHead>
                  <TableHead className="text-gray-400">Rune</TableHead>
                  <TableHead className="text-gray-400 text-right">Supply</TableHead>
                  <TableHead className="text-gray-400 text-center">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topBySupply.map((rune, index) => (
                  <TableRow key={rune.id} className="border-gray-700">
                    <TableCell className="text-gray-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-white">
                        {rune.spaced_name || rune.name}
                      </div>
                      {rune.turbo && (
                        <Badge className="mt-1 bg-orange-500/20 text-orange-400 text-xs">
                          TURBO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-green-400">
                      {formatSupply(rune.supply, rune.decimals)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleWatchlist(rune.name)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-4 w-4 ${
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
          </CardContent>
        </Card>

        {/* Recently Created */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <Clock className="h-5 w-5 mr-2 text-purple-400" />
              Recently Created Runes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">#</TableHead>
                  <TableHead className="text-gray-400">Rune</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400 text-center">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.recentlyCreated.map((rune, index) => (
                  <TableRow key={rune.id} className="border-gray-700">
                    <TableCell className="text-gray-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-white">
                        {rune.spaced_name || rune.name}
                      </div>
                      {rune.turbo && (
                        <Badge className="mt-1 bg-orange-500/20 text-orange-400 text-xs">
                          TURBO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-purple-400 text-sm">
                      {timeAgo(rune.timestamp)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleWatchlist(rune.name)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-4 w-4 ${
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
          </CardContent>
        </Card>

        {/* Turbo Runes */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-white">
              <TrendingUp className="h-5 w-5 mr-2 text-orange-400" />
              Turbo Runes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">#</TableHead>
                  <TableHead className="text-gray-400">Rune</TableHead>
                  <TableHead className="text-gray-400 text-right">Holders</TableHead>
                  <TableHead className="text-gray-400 text-center">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.turboRunes.map((rune, index) => (
                  <TableRow key={rune.id} className="border-gray-700">
                    <TableCell className="text-gray-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-orange-400">
                        {rune.spaced_name || rune.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      {rune.holders ? formatNumber(rune.holders) : '--'}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleWatchlist(rune.name)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-4 w-4 ${
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
            {analytics.turboRunes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No turbo runes found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
