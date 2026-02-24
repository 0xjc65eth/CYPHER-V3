'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { MetricsCard, MetricsGrid } from '@/components/ui/professional';
import {
  ArrowLeftRight, TrendingUp, Shield, Zap, RefreshCw, Search,
  ChevronDown, ChevronUp, AlertTriangle, Clock, Filter, ExternalLink,
} from 'lucide-react';
import { ExportButton } from '@/components/common/ExportButton';
import { spreadColor, profitColor } from '@/lib/utils/runes-formatters';

import type { ArbitrageOpportunity, SortKey } from './arbitrage/types';
import { MARKETPLACES, REFRESH_INTERVAL, FEE_TOTAL } from './arbitrage/types';
import { generateOpportunities } from './arbitrage/fetch-prices';
import { DetailPanel } from './arbitrage/DetailPanel';

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function liquidityBadge(liq: 'High' | 'Medium' | 'Low') {
  const colors: Record<string, string> = {
    High: 'bg-green-900/50 text-green-400 border-green-700',
    Medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    Low: 'bg-red-900/50 text-red-400 border-red-700',
  };
  return <Badge className={`${colors[liq]} text-[10px] px-1.5 py-0`}>{liq}</Badge>;
}

function difficultyBadge(diff: 'Easy' | 'Medium' | 'Hard') {
  const colors: Record<string, string> = {
    Easy: 'bg-green-900/50 text-green-400 border-green-700',
    Medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    Hard: 'bg-red-900/50 text-red-400 border-red-700',
  };
  return <Badge className={`${colors[diff]} text-[10px] px-1.5 py-0`}>{diff}</Badge>;
}

function confidenceColor(c: number) {
  if (c >= 70) return 'bg-green-500';
  if (c >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RunesArbitrage() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minSpread, setMinSpread] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('spread');
  const [marketplaceFilter, setMarketplaceFilter] = useState<Record<string, boolean>>({
    'Magic Eden': true, UniSat: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Race the entire pipeline against a 30s deadline
      const result = await Promise.race([
        (async () => {
          const res = await fetch('/api/runes/popular/?limit=60&offset=0');
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const json = await res.json();
          if (!json.success || !json.data) throw new Error('Invalid API response');
          return generateOpportunities(json.data);
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: scan took too long')), 30000)
        ),
      ]);
      setOpportunities(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { fetchData(); return REFRESH_INTERVAL; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------
  const filtered = opportunities
    .filter((o) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!o.runeName.toLowerCase().includes(q) && !o.spacedName.toLowerCase().includes(q)) return false;
      }
      if (o.spread < minSpread) return false;
      const activeMarkets = Object.entries(marketplaceFilter).filter(([, v]) => v).map(([k]) => k);
      if (!activeMarkets.includes(o.bestBuy) && !activeMarkets.includes(o.bestSell)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'spread') return b.spread - a.spread;
      if (sortKey === 'netProfit') return b.netProfit - a.netProfit;
      return b.confidence - a.confidence;
    });

  const stats = {
    active: filtered.length,
    avgSpread: filtered.length > 0
      ? (filtered.reduce((s, o) => s + o.spread, 0) / filtered.length).toFixed(2) : '0.00',
    bestSpread: filtered.length > 0
      ? Math.max(...filtered.map((o) => o.spread)).toFixed(2) : '0.00',
    highProfitCount: filtered.filter((o) => o.netProfit > 5).length,
    avgConfidence: filtered.length > 0
      ? Math.round(filtered.reduce((s, o) => s + o.confidence, 0) / filtered.length) : 0,
  };

  const selectedOpp = opportunities.find((o) => o.id === selectedId) || null;

  // -----------------------------------------------------------------------
  // Loading / Error states
  // -----------------------------------------------------------------------
  if (loading && opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg border border-gray-700">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
          <span className="text-sm text-gray-400">Scanning cross-exchange prices...</span>
        </div>
      </div>
    );
  }

  if (error && opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg border border-gray-700">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <span className="text-sm text-red-400">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchData} className="border-gray-600 text-gray-300 hover:bg-gray-800">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-4 bg-black p-4 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-white">Arbitrage Scanner</h2>
          <Badge className="bg-green-900/50 text-green-400 border-green-700 text-[10px]">LIVE</Badge>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            type="custom" data={filtered}
            columns={[
              { key: 'runeName', label: 'Rune' },
              { key: 'spread', label: 'Spread %' },
              { key: 'netProfit', label: 'Net Profit %' },
              { key: 'bestBuy', label: 'Buy At' },
              { key: 'bestSell', label: 'Sell At' },
              { key: 'liquidity', label: 'Liquidity' },
              { key: 'confidence', label: 'Confidence %' },
              { key: 'executionDifficulty', label: 'Difficulty' },
              { key: 'estimatedTimeMinutes', label: 'Est. Time (min)' },
            ]}
            title="Runes Arbitrage Opportunities" filename="runes-arbitrage" size="sm" variant="outline"
          />
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Refresh in <span className="text-orange-400 font-mono">{countdown}s</span></span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="border-gray-600 text-gray-300 hover:bg-gray-800 h-7 px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <MetricsGrid columns={6}>
        <MetricsCard title="Active Opportunities" value={stats.active.toString()} icon={Zap} iconColor="text-orange-500" loading={loading} />
        <MetricsCard title="Avg Spread" value={`${stats.avgSpread}%`} icon={TrendingUp} iconColor="text-yellow-500" loading={loading} />
        <MetricsCard title="Best Spread" value={`${stats.bestSpread}%`} icon={ArrowLeftRight} iconColor="text-green-500" loading={loading} />
        <MetricsCard title="High Profit Alerts" value={stats.highProfitCount.toString()} subtitle=">5% net profit" icon={AlertTriangle} iconColor="text-orange-500" loading={loading} />
        <MetricsCard title="Avg Confidence" value={`${stats.avgConfidence}/100`} icon={Shield} iconColor="text-blue-500" loading={loading} />
      </MetricsGrid>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input placeholder="Search rune name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-gray-900 border-gray-700 text-gray-200 text-sm placeholder:text-gray-600" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Min spread:</span>
          <Input type="number" min={0} max={50} step={0.5} value={minSpread} onChange={(e) => setMinSpread(Number(e.target.value))}
            className="w-16 h-8 bg-gray-900 border-gray-700 text-gray-200 text-sm" />
          <span className="text-[11px] text-gray-400">%</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
          className="border-gray-600 text-gray-300 hover:bg-gray-800 h-8 gap-1 text-xs">
          <Filter className="w-3 h-3" /> Filters
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Sort:</span>
          {(['spread', 'netProfit', 'confidence'] as SortKey[]).map((key) => (
            <Button key={key} variant="outline" size="sm" onClick={() => setSortKey(key)}
              className={`h-7 px-2 text-[11px] border-gray-600 ${
                sortKey === key ? 'bg-orange-900/40 text-orange-400 border-orange-700' : 'text-gray-400 hover:bg-gray-800'
              }`}>
              {key === 'netProfit' ? 'Profit' : key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex items-center gap-4 p-3 bg-gray-900 rounded border border-gray-700">
          <span className="text-xs text-gray-400">Marketplaces:</span>
          {MARKETPLACES.map((mp) => (
            <label key={mp} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={marketplaceFilter[mp]}
                onChange={() => setMarketplaceFilter((prev) => ({ ...prev, [mp]: !prev[mp] }))}
                className="accent-orange-500 w-3.5 h-3.5" />
              {mp}
            </label>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-transparent">
              <TableHead className="text-gray-400 text-[11px] font-semibold">RUNE</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">MAGIC EDEN</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">UNISAT</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">SPREAD %</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold">BUY</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold">SELL</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">NET PROFIT %</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-center">LIQ</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-center">DIFFICULTY</TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-center">CONF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-gray-500">No arbitrage opportunities match your filters.</span>
                    <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setMinSpread(0); }}
                      className="h-7 border-gray-700 text-xs text-gray-400 hover:bg-gray-800">
                      Clear Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((opp) => (
                <React.Fragment key={opp.id}>
                  <TableRow
                    className={`border-gray-800 cursor-pointer transition-colors ${
                      selectedId === opp.id ? 'bg-gray-800/80' : 'hover:bg-gray-800/40'
                    }`}
                    onClick={() => setSelectedId(selectedId === opp.id ? null : opp.id)}
                  >
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-900/40 rounded flex items-center justify-center border border-orange-700/40">
                          <span className="text-[9px] font-bold text-orange-400">R</span>
                        </div>
                        <a href={`https://ordinals.com/rune/${encodeURIComponent(opp.spacedName)}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-white font-medium truncate max-w-[120px] hover:text-blue-400 transition-colors">
                          {opp.spacedName} <ExternalLink className="h-3 w-3 inline ml-0.5" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-xs text-gray-300 font-mono">{opp.magicEdenPrice.toLocaleString()}</TableCell>
                    <TableCell className="py-2 px-3 text-right text-xs text-gray-300 font-mono">{opp.uniSatPrice.toLocaleString()}</TableCell>
                    <TableCell className={`py-2 px-3 text-right text-xs font-bold font-mono ${spreadColor(opp.spread)}`}>{opp.spread.toFixed(2)}%</TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge className="bg-blue-900/40 text-blue-400 border-blue-700 text-[10px] px-1.5 py-0">{opp.bestBuy}</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge className="bg-purple-900/40 text-purple-400 border-purple-700 text-[10px] px-1.5 py-0">{opp.bestSell}</Badge>
                    </TableCell>
                    <TableCell className={`py-2 px-3 text-right text-xs font-bold font-mono ${profitColor(opp.netProfit)}`}>
                      {opp.netProfit > 0 ? '+' : ''}{opp.netProfit.toFixed(2)}%
                    </TableCell>
                    <TableCell className="py-2 px-3 text-center">{liquidityBadge(opp.liquidity)}</TableCell>
                    <TableCell className="py-2 px-3 text-center">{difficultyBadge(opp.executionDifficulty)}</TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-full max-w-[40px]">
                          <Progress value={opp.confidence} className={`h-1.5 ${confidenceColor(opp.confidence)}`} />
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono w-6 text-right">{opp.confidence}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {selectedId === opp.id && selectedOpp && (
                    <TableRow className="border-gray-800 bg-gray-900/60">
                      <TableCell colSpan={11} className="p-0">
                        <DetailPanel opp={selectedOpp} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-[10px] text-gray-600 text-right">
        Real-time prices from Magic Eden & UniSat APIs. Fees: {FEE_TOTAL}% total. Updated every {REFRESH_INTERVAL}s. Not financial advice.
      </div>
    </div>
  );
}
