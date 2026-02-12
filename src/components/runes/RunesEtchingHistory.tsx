'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Hash,
  Zap,
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface MintTerms {
  amount: string | null;
  cap: string | null;
  height_start: number | null;
  height_end: number | null;
  offset_start: number | null;
  offset_end: number | null;
}

interface RuneEntry {
  id: string;
  name: string;
  spaced_name: string;
  number: number;
  symbol: string;
  supply: string;
  burned: string;
  premine: string;
  mint_terms: MintTerms;
  turbo: boolean;
  timestamp: string | null;
  etching_tx_id: string | null;
  etching_block_height: number | null;
  holders: number | null;
  decimals?: number;
}

type FilterMode = 'all' | 'open' | 'turbo';
type SortMode = 'newest' | 'oldest' | 'supply' | 'holders';

function formatSupply(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toLocaleString();
}

function timeAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return '--';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  if (isNaN(then)) return '--';
  const diff = now - then;
  if (diff < 0 || diff > 365 * 86_400_000) return '--';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function truncateTxId(txId: string): string {
  if (!txId || txId.length < 16) return txId || '---';
  return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
}

function isOpenMint(rune: RuneEntry): boolean {
  return !!(
    rune.mint_terms &&
    rune.mint_terms.cap !== null &&
    rune.mint_terms.amount !== null
  );
}

function getMintProgress(rune: RuneEntry): number {
  if (!isOpenMint(rune)) return 0;
  const supply = parseFloat(rune.supply);
  const premine = parseFloat(rune.premine);
  const minted = supply - premine;
  const cap = parseFloat(rune.mint_terms.cap || '0');
  const amountPerMint = parseFloat(rune.mint_terms.amount || '0');
  if (cap <= 0 || amountPerMint <= 0) return 0;
  const totalMintable = cap * amountPerMint;
  if (totalMintable <= 0) return 0;
  return Math.min(100, (minted / totalMintable) * 100);
}

function getPreminePercent(rune: RuneEntry): number {
  const supply = parseFloat(rune.supply);
  const premine = parseFloat(rune.premine);
  if (supply <= 0) return 0;
  return (premine / supply) * 100;
}

export default function RunesEtchingHistory() {
  const [runes, setRunes] = useState<RuneEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const fetchRunes = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/runes/list?limit=60&offset=0');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results: RuneEntry[] = data.results || data.data || data || [];
      setRunes(Array.isArray(results) ? results : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch runes';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunes();
    const interval = setInterval(fetchRunes, 45000);
    return () => clearInterval(interval);
  }, [fetchRunes]);

  const filtered = useMemo(() => {
    let list = [...runes];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.spaced_name.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          String(r.number).includes(q)
      );
    }

    // Filter mode
    if (filterMode === 'open') {
      list = list.filter(isOpenMint);
    } else if (filterMode === 'turbo') {
      list = list.filter((r) => r.turbo);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortMode) {
        case 'newest': {
          const aT = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bT = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return (isNaN(bT) ? 0 : bT) - (isNaN(aT) ? 0 : aT);
        }
        case 'oldest': {
          const aT = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bT = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return (isNaN(aT) ? 0 : aT) - (isNaN(bT) ? 0 : bT);
        }
        case 'supply':
          return parseFloat(b.supply) - parseFloat(a.supply);
        case 'holders':
          return (b.holders || 0) - (a.holders || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [runes, search, filterMode, sortMode]);

  // Stats
  const stats = useMemo(() => {
    const total = runes.length;
    const openMints = runes.filter(isOpenMint).length;
    const avgPremine =
      total > 0
        ? runes.reduce((sum, r) => sum + getPreminePercent(r), 0) / total
        : 0;
    const turboCount = runes.filter((r) => r.turbo).length;
    return { total, openMints, avgPremine, turboCount };
  }, [runes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="text-gray-400 text-sm">Loading Etching History...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-black">
        <Card className="bg-gray-900 border-red-500/50 p-6">
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <span className="text-red-400 text-sm">{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchRunes();
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-black p-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-gray-400 font-normal flex items-center gap-1">
              <Hash className="h-3 w-3" /> Total Etchings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <span className="text-xl font-bold text-white">{stats.total}</span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-gray-400 font-normal flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Open Mints
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <span className="text-xl font-bold text-green-400">{stats.openMints}</span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-gray-400 font-normal flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Avg Premine
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <span className="text-xl font-bold text-orange-400">
              {stats.avgPremine.toFixed(1)}%
            </span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-gray-400 font-normal flex items-center gap-1">
              <Zap className="h-3 w-3" /> Turbo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <span className="text-xl font-bold text-yellow-400">{stats.turboCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search runes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Filter toggles */}
          {(['all', 'open', 'turbo'] as FilterMode[]).map((mode) => (
            <Button
              key={mode}
              variant={filterMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode(mode)}
              className={
                filterMode === mode
                  ? 'bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800 h-8 text-xs'
              }
            >
              {mode === 'all' && 'All'}
              {mode === 'open' && 'Open Mints'}
              {mode === 'turbo' && 'Turbo Only'}
            </Button>
          ))}
          {/* Sort */}
          <div className="flex items-center gap-1 ml-2">
            <ArrowUpDown className="h-3 w-3 text-gray-500" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded px-2 h-8 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="supply">Most Supply</option>
              <option value="holders">Most Holders</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchRunes();
            }}
            className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        Showing {filtered.length} of {runes.length} runes
      </div>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-transparent">
              <TableHead className="text-gray-400 text-xs font-medium">#</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium">Rune</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium">Supply</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium">Premine</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium">Mint Status</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium hidden lg:table-cell">Block</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium hidden md:table-cell">Tx ID</TableHead>
              <TableHead className="text-gray-400 text-xs font-medium text-right">
                <Clock className="h-3 w-3 inline" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-gray-700">
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No runes found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rune) => {
                const open = isOpenMint(rune);
                const progress = getMintProgress(rune);
                const premineP = getPreminePercent(rune);
                return (
                  <TableRow
                    key={rune.id}
                    className="border-gray-800 hover:bg-gray-800/50"
                  >
                    {/* Number */}
                    <TableCell className="text-gray-500 text-xs font-mono py-2">
                      {rune.number}
                    </TableCell>

                    {/* Name + Symbol + Turbo */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" title={rune.symbol}>
                          {rune.symbol}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-semibold">
                            {rune.spaced_name}
                          </span>
                          <div className="flex items-center gap-1">
                            {rune.turbo && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                TURBO
                              </Badge>
                            )}
                            {rune.decimals != null && !isNaN(rune.decimals) && (
                              <span className="text-[10px] text-gray-500">
                                {rune.decimals} dec
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Supply */}
                    <TableCell className="text-gray-300 text-xs font-mono py-2">
                      {formatSupply(rune.supply)}
                    </TableCell>

                    {/* Premine % */}
                    <TableCell className="py-2">
                      <span
                        className={`text-xs font-mono ${
                          premineP >= 100
                            ? 'text-red-400'
                            : premineP >= 50
                            ? 'text-orange-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {premineP.toFixed(1)}%
                      </span>
                    </TableCell>

                    {/* Mint Status */}
                    <TableCell className="py-2">
                      {open ? (
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0 w-fit">
                            OPEN
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <Progress
                              value={progress}
                              className="h-1.5 w-16 bg-gray-700"
                            />
                            <span className="text-[10px] text-gray-500">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
                          CLOSED
                        </Badge>
                      )}
                    </TableCell>

                    {/* Block */}
                    <TableCell className="text-gray-400 text-xs font-mono py-2 hidden lg:table-cell">
                      {rune.etching_block_height?.toLocaleString() || '---'}
                    </TableCell>

                    {/* Tx ID */}
                    <TableCell className="py-2 hidden md:table-cell">
                      <span
                        className="text-[11px] text-gray-500 font-mono cursor-pointer hover:text-orange-400 flex items-center gap-1"
                        title={rune.etching_tx_id}
                      >
                        {truncateTxId(rune.etching_tx_id)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </TableCell>

                    {/* Time ago */}
                    <TableCell className="text-gray-500 text-xs text-right py-2">
                      {timeAgo(rune.timestamp)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
