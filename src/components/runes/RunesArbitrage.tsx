'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowLeftRight,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Filter,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArbitrageOpportunity {
  id: string;
  runeName: string;
  spacedName: string;
  magicEdenPrice: number;
  okxPrice: number;
  uniSatPrice: number;
  spread: number;
  bestBuy: string;
  bestSell: string;
  netProfit: number;
  liquidity: 'High' | 'Medium' | 'Low';
  confidence: number;
}

type SortKey = 'spread' | 'netProfit' | 'confidence';

const MARKETPLACES = ['Magic Eden', 'OKX', 'UniSat'] as const;
const REFRESH_INTERVAL = 30;
const FEE_TOTAL = 4; // 2% buy + 2% sell

// ---------------------------------------------------------------------------
// Deterministic price generation from rune name
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateOpportunities(
  runeNames: { name: string; spaced_name: string }[]
): ArbitrageOpportunity[] {
  return runeNames.map((rune) => {
    const seed = hashString(rune.name) + Math.floor(Date.now() / 30000);
    const rand = seededRandom(seed);

    const basePrice = Math.round(50 + rand() * 49950); // 50-50000 sats
    const variance1 = 1 + (rand() * 0.15 - 0.02); // -2% to +13%
    const variance2 = 1 + (rand() * 0.15 - 0.02);
    const variance3 = 1 + (rand() * 0.15 - 0.02);

    const magicEdenPrice = Math.round(basePrice * variance1);
    const okxPrice = Math.round(basePrice * variance2);
    const uniSatPrice = Math.round(basePrice * variance3);

    const prices = [
      { price: magicEdenPrice, name: 'Magic Eden' },
      { price: okxPrice, name: 'OKX' },
      { price: uniSatPrice, name: 'UniSat' },
    ];

    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const minPrice = sorted[0].price;
    const maxPrice = sorted[sorted.length - 1].price;
    const spread = ((maxPrice - minPrice) / minPrice) * 100;
    const netProfit = spread - FEE_TOTAL;

    const liquidityOptions: ('High' | 'Medium' | 'Low')[] = [
      'High',
      'Medium',
      'Low',
    ];
    const liquidity = liquidityOptions[Math.floor(rand() * 3)];

    const confidence = Math.round(30 + rand() * 70);

    return {
      id: rune.name,
      runeName: rune.name,
      spacedName: rune.spaced_name || rune.name,
      magicEdenPrice,
      okxPrice,
      uniSatPrice,
      spread: Math.round(spread * 100) / 100,
      bestBuy: sorted[0].name,
      bestSell: sorted[sorted.length - 1].name,
      netProfit: Math.round(netProfit * 100) / 100,
      liquidity,
      confidence,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RunesArbitrage() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minSpread, setMinSpread] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('spread');
  const [marketplaceFilter, setMarketplaceFilter] = useState<
    Record<string, boolean>
  >({
    'Magic Eden': true,
    OKX: true,
    UniSat: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/runes/popular?limit=60&offset=0');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error('Invalid API response');
      const opps = generateOpportunities(json.data);
      setOpportunities(opps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filtered = opportunities
    .filter((o) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !o.runeName.toLowerCase().includes(q) &&
          !o.spacedName.toLowerCase().includes(q)
        )
          return false;
      }
      if (o.spread < minSpread) return false;
      // marketplace filter: show if bestBuy or bestSell is in active marketplaces
      const activeMarkets = Object.entries(marketplaceFilter)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (
        !activeMarkets.includes(o.bestBuy) &&
        !activeMarkets.includes(o.bestSell)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'spread') return b.spread - a.spread;
      if (sortKey === 'netProfit') return b.netProfit - a.netProfit;
      return b.confidence - a.confidence;
    });

  const stats = {
    active: filtered.length,
    avgSpread:
      filtered.length > 0
        ? (
            filtered.reduce((s, o) => s + o.spread, 0) / filtered.length
          ).toFixed(2)
        : '0.00',
    bestSpread:
      filtered.length > 0
        ? Math.max(...filtered.map((o) => o.spread)).toFixed(2)
        : '0.00',
    totalProfit:
      filtered.length > 0
        ? (
            filtered
              .filter((o) => o.netProfit > 0)
              .reduce((s, o) => s + o.netProfit * 0.0001, 0)
          ).toFixed(6)
        : '0.000000',
  };

  const selectedOpp = opportunities.find((o) => o.id === selectedId) || null;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function spreadColor(spread: number) {
    if (spread > 5) return 'text-green-400';
    if (spread >= 2) return 'text-yellow-400';
    return 'text-gray-400';
  }

  function profitColor(val: number) {
    if (val > 0) return 'text-green-400';
    if (val < 0) return 'text-red-400';
    return 'text-gray-400';
  }

  function liquidityBadge(liq: 'High' | 'Medium' | 'Low') {
    const colors: Record<string, string> = {
      High: 'bg-green-900/50 text-green-400 border-green-700',
      Medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      Low: 'bg-red-900/50 text-red-400 border-red-700',
    };
    return (
      <Badge className={`${colors[liq]} text-[10px] px-1.5 py-0`}>
        {liq}
      </Badge>
    );
  }

  function confidenceColor(c: number) {
    if (c >= 70) return 'bg-green-500';
    if (c >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading && opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg border border-gray-700">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
          <span className="text-sm text-gray-400">
            Loading arbitrage scanner...
          </span>
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
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-black p-4 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-white">Arbitrage Scanner</h2>
          <Badge className="bg-green-900/50 text-green-400 border-green-700 text-[10px]">
            LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Refresh in{' '}
              <span className="text-orange-400 font-mono">{countdown}s</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800 h-7 px-2"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] text-gray-400 font-normal flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-500" />
              Active Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <span className="text-xl font-bold text-white">{stats.active}</span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] text-gray-400 font-normal flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-yellow-500" />
              Avg Spread %
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <span className="text-xl font-bold text-yellow-400">
              {stats.avgSpread}%
            </span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] text-gray-400 font-normal flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3 text-green-500" />
              Best Spread
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <span className="text-xl font-bold text-green-400">
              {stats.bestSpread}%
            </span>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] text-gray-400 font-normal flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-orange-500" />
              Est. Profit (BTC)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <span className="text-xl font-bold text-orange-400">
              {stats.totalProfit}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Controls: Search, Filters, Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            placeholder="Search rune name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-gray-900 border-gray-700 text-gray-200 text-sm placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Min spread:</span>
          <Input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={minSpread}
            onChange={(e) => setMinSpread(Number(e.target.value))}
            className="w-16 h-8 bg-gray-900 border-gray-700 text-gray-200 text-sm"
          />
          <span className="text-[11px] text-gray-400">%</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="border-gray-600 text-gray-300 hover:bg-gray-800 h-8 gap-1 text-xs"
        >
          <Filter className="w-3 h-3" />
          Filters
          {showFilters ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </Button>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Sort:</span>
          {(['spread', 'netProfit', 'confidence'] as SortKey[]).map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => setSortKey(key)}
              className={`h-7 px-2 text-[11px] border-gray-600 ${
                sortKey === key
                  ? 'bg-orange-900/40 text-orange-400 border-orange-700'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {key === 'netProfit'
                ? 'Profit'
                : key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex items-center gap-4 p-3 bg-gray-900 rounded border border-gray-700">
          <span className="text-xs text-gray-400">Marketplaces:</span>
          {MARKETPLACES.map((mp) => (
            <label
              key={mp}
              className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={marketplaceFilter[mp]}
                onChange={() =>
                  setMarketplaceFilter((prev) => ({
                    ...prev,
                    [mp]: !prev[mp],
                  }))
                }
                className="accent-orange-500 w-3.5 h-3.5"
              />
              {mp}
            </label>
          ))}
        </div>
      )}

      {/* Arbitrage Table */}
      <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-transparent">
              <TableHead className="text-gray-400 text-[11px] font-semibold">
                RUNE
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">
                MAGIC EDEN
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">
                OKX
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">
                UNISAT
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">
                SPREAD %
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold">
                BUY
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold">
                SELL
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-right">
                NET PROFIT %
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-center">
                LIQ
              </TableHead>
              <TableHead className="text-gray-400 text-[11px] font-semibold text-center">
                CONF
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell
                  colSpan={10}
                  className="text-center text-gray-500 text-sm py-8"
                >
                  No arbitrage opportunities match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((opp) => (
                <React.Fragment key={opp.id}>
                  <TableRow
                    className={`border-gray-800 cursor-pointer transition-colors ${
                      selectedId === opp.id
                        ? 'bg-gray-800/80'
                        : 'hover:bg-gray-800/40'
                    }`}
                    onClick={() =>
                      setSelectedId(selectedId === opp.id ? null : opp.id)
                    }
                  >
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-900/40 rounded flex items-center justify-center border border-orange-700/40">
                          <span className="text-[9px] font-bold text-orange-400">
                            R
                          </span>
                        </div>
                        <span className="text-xs text-white font-medium truncate max-w-[120px]">
                          {opp.spacedName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-xs text-gray-300 font-mono">
                      {opp.magicEdenPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-xs text-gray-300 font-mono">
                      {opp.okxPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-xs text-gray-300 font-mono">
                      {opp.uniSatPrice.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={`py-2 px-3 text-right text-xs font-bold font-mono ${spreadColor(opp.spread)}`}
                    >
                      {opp.spread.toFixed(2)}%
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge className="bg-blue-900/40 text-blue-400 border-blue-700 text-[10px] px-1.5 py-0">
                        {opp.bestBuy}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge className="bg-purple-900/40 text-purple-400 border-purple-700 text-[10px] px-1.5 py-0">
                        {opp.bestSell}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`py-2 px-3 text-right text-xs font-bold font-mono ${profitColor(opp.netProfit)}`}
                    >
                      {opp.netProfit > 0 ? '+' : ''}
                      {opp.netProfit.toFixed(2)}%
                    </TableCell>
                    <TableCell className="py-2 px-3 text-center">
                      {liquidityBadge(opp.liquidity)}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-full max-w-[40px]">
                          <Progress
                            value={opp.confidence}
                            className={`h-1.5 ${confidenceColor(opp.confidence)}`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono w-6 text-right">
                          {opp.confidence}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Detail Panel */}
                  {selectedId === opp.id && selectedOpp && (
                    <TableRow className="border-gray-800 bg-gray-900/60">
                      <TableCell colSpan={10} className="p-0">
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
        Prices are simulated for demonstration. Fees estimated at {FEE_TOTAL}%
        total (2% buy + 2% sell). Not financial advice.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel Sub-component
// ---------------------------------------------------------------------------

function DetailPanel({ opp }: { opp: ArbitrageOpportunity }) {
  const prices = [
    { name: 'Magic Eden', price: opp.magicEdenPrice, color: 'bg-pink-500' },
    { name: 'OKX', price: opp.okxPrice, color: 'bg-blue-500' },
    { name: 'UniSat', price: opp.uniSatPrice, color: 'bg-yellow-500' },
  ];
  const maxPrice = Math.max(...prices.map((p) => p.price));

  const buyFee = opp.magicEdenPrice * 0.02;
  const sellFee = opp.magicEdenPrice * 0.02;
  const networkFee = opp.magicEdenPrice * 0.005;
  const totalFees = buyFee + sellFee + networkFee;

  const riskLevel =
    opp.confidence >= 70 ? 'Low' : opp.confidence >= 40 ? 'Medium' : 'High';
  const riskColor =
    riskLevel === 'Low'
      ? 'text-green-400'
      : riskLevel === 'Medium'
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="p-4 space-y-4 border-t border-gray-700/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Price Comparison Bar Chart */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Price Comparison (sats)
          </h4>
          <div className="space-y-1.5">
            {prices.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-16 truncate">
                  {p.name}
                </span>
                <div className="flex-1 bg-gray-800 rounded h-4 overflow-hidden">
                  <div
                    className={`${p.color} h-full rounded transition-all`}
                    style={{
                      width: `${maxPrice > 0 ? (p.price / maxPrice) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-300 font-mono w-14 text-right">
                  {p.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Fee Breakdown (sats)
          </h4>
          <div className="bg-gray-800/60 rounded border border-gray-700 text-[11px]">
            <div className="flex justify-between px-3 py-1.5 border-b border-gray-700/50">
              <span className="text-gray-400">Buy Fee (2%)</span>
              <span className="text-gray-300 font-mono">
                {Math.round(buyFee).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-3 py-1.5 border-b border-gray-700/50">
              <span className="text-gray-400">Sell Fee (2%)</span>
              <span className="text-gray-300 font-mono">
                {Math.round(sellFee).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-3 py-1.5 border-b border-gray-700/50">
              <span className="text-gray-400">Network Fee (~0.5%)</span>
              <span className="text-gray-300 font-mono">
                {Math.round(networkFee).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-3 py-1.5 font-semibold">
              <span className="text-gray-200">Total Fees</span>
              <span className="text-orange-400 font-mono">
                {Math.round(totalFees).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Execution Steps */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Execution Plan
          </h4>
          <div className="space-y-1.5">
            {[
              `Buy on ${opp.bestBuy} at ${Math.min(opp.magicEdenPrice, opp.okxPrice, opp.uniSatPrice).toLocaleString()} sats`,
              `Transfer to ${opp.bestSell} wallet`,
              `Sell on ${opp.bestSell} at ${Math.max(opp.magicEdenPrice, opp.okxPrice, opp.uniSatPrice).toLocaleString()} sats`,
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-900/50 border border-orange-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] text-orange-400 font-bold">
                    {i + 1}
                  </span>
                </div>
                <span className="text-[11px] text-gray-300">{step}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-1 text-[10px]">
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. time: 10-30 min
            </span>
            <span className={`flex items-center gap-1 ${riskColor}`}>
              <Shield className="w-3 h-3" />
              Risk: {riskLevel}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 pt-0.5">
            <ArrowRight className="w-3 h-3" />
            <span>
              Net result:{' '}
              <span
                className={
                  opp.netProfit > 0 ? 'text-green-400' : 'text-red-400'
                }
              >
                {opp.netProfit > 0 ? '+' : ''}
                {opp.netProfit.toFixed(2)}% after all fees
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
