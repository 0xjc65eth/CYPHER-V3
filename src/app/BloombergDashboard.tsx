'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Zap,
  RefreshCw, AlertTriangle, ExternalLink,
  ChevronUp, ChevronDown, Cpu, Database,
  Newspaper, Wifi, Globe, Layers, Shield,
  ArrowUpRight, ArrowDownRight, Hash, Clock,
  DollarSign, Percent, BarChart2, Radio
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FearGreedGauge } from '@/components/dashboard/FearGreedGauge';
import { LivePriceTicker } from '@/components/dashboard/LivePriceTicker';
import { ExportButton } from '@/components/common/ExportButton';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PriceData {
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  timestamp: number;
}

interface GlobalData {
  totalMarketCap: number | null;
  totalVolume24h: number | null;
  btcDominance: number | null;
  marketCapChange24h: number;
  timestamp: number;
}

interface FeeData {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
  timestamp: number;
}

interface MempoolData {
  count: number;
  vsize: number;
  total_fee: number;
  timestamp: number;
}

interface BlockData {
  height: number;
  timestamp: number;
  tx_count: number;
  size: number;
  hash: string;
  difficulty: number;
  median_fee?: number;
}

interface NewsArticle {
  title: string;
  body: string;
  url: string;
  source: string;
  imageUrl: string;
  publishedAt: number;
  categories: string;
  sentiment: string;
}

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  image?: string;
}

interface MiningData {
  hashrate: number;
  difficulty: number;
  blocksMinedToday: number;
  avgBlockTime: number;
  timestamp: number;
}

interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  timestamp: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() / 1000) - ts);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function secondsAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function formatUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatCompact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatHashrate(h: number | { current?: number; [key: string]: unknown }): string {
  const val = typeof h === 'object' && h !== null ? (h.current ?? 0) : h;
  if (typeof val !== 'number' || isNaN(val)) return '---';
  if (val >= 1e18) return `${(val / 1e18).toFixed(1)} EH/s`;
  if (val >= 1e15) return `${(val / 1e15).toFixed(1)} PH/s`;
  return `${val.toLocaleString()} H/s`;
}

function formatDifficulty(d: number | { current?: number; [key: string]: unknown } | undefined): string {
  if (!d) return '---';
  const val = typeof d === 'object' && d !== null ? (d.current ?? 0) : d;
  if (typeof val !== 'number' || isNaN(val) || val === 0) return '---';
  return `${(val / 1e12).toFixed(2)}T`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

// ─── Skeleton Pulse ─────────────────────────────────────────────────────────

function Pulse({ w = 'w-20', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded bg-[#1a1a2e] animate-pulse`} />;
}

// ─── Section Wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  updatedAt,
  error,
  onRetry,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  updatedAt?: number;
  error?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-bold text-[#e4e4e7]/80 font-mono tracking-wider uppercase">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="flex items-center gap-1 text-[9px] text-[#f59e0b] font-mono">
              <AlertTriangle className="w-3 h-3" /> Stale
            </span>
          )}
          {updatedAt ? (
            <span className="text-[9px] text-[#e4e4e7]/30 font-mono">
              {secondsAgo(updatedAt)}
            </span>
          ) : null}
          {onRetry && (
            <button onClick={onRetry} className="text-[#e4e4e7]/20 hover:text-[#F7931A] transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Sentiment Badge ────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    very_bullish: { label: 'BULLISH', color: '#00D4AA', bg: 'rgba(0,212,170,0.12)' },
    bullish: { label: 'BULL', color: '#00D4AA', bg: 'rgba(0,212,170,0.08)' },
    neutral: { label: 'NEUTRAL', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    bearish: { label: 'BEAR', color: '#FF4757', bg: 'rgba(255,71,87,0.08)' },
    very_bearish: { label: 'BEARISH', color: '#FF4757', bg: 'rgba(255,71,87,0.12)' },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <span
      className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  );
}

// ─── Custom Hook: fetch with auto-refresh ───────────────────────────────────

function useAutoFetch<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mountedRef.current) {
        setData(json);
        setError(false);
        setUpdatedAt(Date.now());
      }
    } catch {
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchData, intervalMs]);

  return { data, loading, error, updatedAt, refetch: fetchData };
}

// ─── Error State ────────────────────────────────────────────────────────────

function ErrorState({ message = 'Data unavailable' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-4 justify-center">
      <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
      <span className="text-[10px] text-[#f59e0b]/70 font-mono">{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFESSIONAL CHART - Real Binance Klines
// ═══════════════════════════════════════════════════════════════════════════

function ProfessionalPriceChart() {
  const [asset, setAsset] = useState('BTCUSDT');
  const [interval, setInterval_] = useState('1h');
  const { data, loading, error, refetch } = useAutoFetch<{ data: KlineData[]; source: string }>(
    `/api/binance/klines?symbol=${asset}&interval=${interval}&limit=60`,
    30000
  );

  const klines = data?.data ?? [];

  const assets = [
    { symbol: 'BTCUSDT', label: 'BTC' },
    { symbol: 'ETHUSDT', label: 'ETH' },
    { symbol: 'SOLUSDT', label: 'SOL' },
    { symbol: 'BNBUSDT', label: 'BNB' },
  ];

  const intervals = [
    { value: '15m', label: '15M' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
  ];

  // Chart rendering
  const chartWidth = 700;
  const chartHeight = 280;
  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const { svgPath, areaPath, priceLabels, currentPrice, priceChange, high, low, volumeBars } = useMemo(() => {
    if (klines.length === 0) return { svgPath: '', areaPath: '', priceLabels: [] as { y: number; label: string }[], currentPrice: 0, priceChange: 0, high: 0, low: 0, volumeBars: [] as { x: number; h: number; up: boolean }[] };

    const prices = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const minP = Math.min(...lows) * 0.999;
    const maxP = Math.max(...highs) * 1.001;
    const range = maxP - minP || 1;

    const xStep = innerW / (klines.length - 1 || 1);

    const points = prices.map((p, i) => ({
      x: padding.left + i * xStep,
      y: padding.top + innerH - ((p - minP) / range) * innerH,
    }));

    const pathStr = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const areaStr = `${pathStr} L ${points[points.length - 1].x.toFixed(1)},${padding.top + innerH} L ${points[0].x.toFixed(1)},${padding.top + innerH} Z`;

    // Price labels on right axis
    const labelCount = 5;
    const labels = Array.from({ length: labelCount }, (_, i) => {
      const p = minP + (range * i) / (labelCount - 1);
      const y = padding.top + innerH - ((p - minP) / range) * innerH;
      return { y, label: `$${formatPrice(p)}` };
    });

    const lastPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const change = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    // Volume bars
    const maxVol = Math.max(...klines.map(k => k.volume)) || 1;
    const volBars = klines.map((k, i) => ({
      x: padding.left + i * xStep,
      h: (k.volume / maxVol) * 40,
      up: k.close >= k.open,
    }));

    return {
      svgPath: pathStr,
      areaPath: areaStr,
      priceLabels: labels,
      currentPrice: lastPrice,
      priceChange: change,
      high: Math.max(...highs),
      low: Math.min(...lows),
      volumeBars: volBars,
    };
  }, [klines, innerW, innerH, padding.left, padding.top]);

  const isUp = priceChange >= 0;
  const selectedLabel = assets.find(a => a.symbol === asset)?.label ?? 'BTC';

  return (
    <div className="space-y-3">
      {/* Chart Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Asset Selector */}
          <div className="flex gap-0.5">
            {assets.map(a => (
              <button
                key={a.symbol}
                onClick={() => setAsset(a.symbol)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold transition-all rounded-sm ${
                  asset === a.symbol
                    ? 'bg-[#F7931A] text-black'
                    : 'text-[#e4e4e7]/50 hover:text-[#e4e4e7] hover:bg-[#1a1a2e]'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-[#1a1a2e]" />
          {/* Interval Selector */}
          <div className="flex gap-0.5">
            {intervals.map(i => (
              <button
                key={i.value}
                onClick={() => setInterval_(i.value)}
                className={`px-2 py-1 text-[10px] font-mono transition-all rounded-sm ${
                  interval === i.value
                    ? 'bg-[#F7931A]/20 text-[#F7931A]'
                    : 'text-[#e4e4e7]/40 hover:text-[#e4e4e7]/70 hover:bg-[#1a1a2e]'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Info */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#e4e4e7]/40 text-[10px]">{selectedLabel}/USD</span>
            <span className={`font-bold text-sm ${isUp ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              ${formatPrice(currentPrice)}
            </span>
            <span className={`text-[10px] flex items-center gap-0.5 ${isUp ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isUp ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
          <div className="flex gap-3 text-[10px] text-[#e4e4e7]/30">
            <span>H: <span className="text-[#e4e4e7]/60">${formatPrice(high)}</span></span>
            <span>L: <span className="text-[#e4e4e7]/60">${formatPrice(low)}</span></span>
          </div>
          {data?.source && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              data.source === 'binance' ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
            }`}>
              {data.source === 'binance' ? 'LIVE' : 'CACHED'}
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative bg-[#08080e] rounded border border-[#1a1a2e] overflow-hidden">
        {loading && klines.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto" />
              <span className="text-[10px] text-[#e4e4e7]/30 font-mono">Loading chart data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-[280px] flex items-center justify-center">
            <ErrorState message="Chart data unavailable" />
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isUp ? '#00D4AA' : '#FF4757'} stopOpacity="0.15" />
                <stop offset="100%" stopColor={isUp ? '#00D4AA' : '#FF4757'} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={isUp ? '#00D4AA' : '#FF4757'} stopOpacity="0.5" />
                <stop offset="100%" stopColor={isUp ? '#00D4AA' : '#FF4757'} stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {priceLabels.map((pl, i) => (
              <g key={i}>
                <line
                  x1={padding.left} y1={pl.y}
                  x2={chartWidth - padding.right} y2={pl.y}
                  stroke="#1a1a2e" strokeWidth="0.5"
                />
                <text
                  x={chartWidth - padding.right + 5} y={pl.y + 3}
                  fill="#e4e4e7" fillOpacity="0.25"
                  fontSize="8" fontFamily="monospace"
                >
                  {pl.label}
                </text>
              </g>
            ))}

            {/* Volume bars */}
            {volumeBars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x - 2} y={chartHeight - padding.bottom - bar.h}
                width={4} height={bar.h}
                fill={bar.up ? '#00D4AA' : '#FF4757'}
                fillOpacity="0.12"
                rx="0.5"
              />
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Price line */}
            <path
              d={svgPath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current price indicator */}
            {klines.length > 0 && (
              <>
                <line
                  x1={padding.left}
                  y1={padding.top + innerH - ((currentPrice - (Math.min(...klines.map(k => k.low)) * 0.999)) / ((Math.max(...klines.map(k => k.high)) * 1.001) - (Math.min(...klines.map(k => k.low)) * 0.999) || 1)) * innerH}
                  x2={chartWidth - padding.right}
                  y2={padding.top + innerH - ((currentPrice - (Math.min(...klines.map(k => k.low)) * 0.999)) / ((Math.max(...klines.map(k => k.high)) * 1.001) - (Math.min(...klines.map(k => k.low)) * 0.999) || 1)) * innerH}
                  stroke={isUp ? '#00D4AA' : '#FF4757'}
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                  opacity="0.4"
                />
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET LEADERS TABLE - Top coins with real data
// ═══════════════════════════════════════════════════════════════════════════

function MarketLeadersTable() {
  const { data, loading, error, updatedAt, refetch } = useAutoFetch<{ data: MarketCoin[] } | MarketCoin[]>(
    '/api/market/data',
    60000
  );
  const [sortBy, setSortBy] = useState<'market_cap' | 'price_change_percentage_24h' | 'total_volume'>('market_cap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const coins: MarketCoin[] = useMemo(() => {
    const nested = (data as any)?.data;
    // API returns { data: { tickers: [...] } } — extract tickers array
    const raw: MarketCoin[] = Array.isArray(data)
      ? data
      : Array.isArray(nested)
        ? nested
        : Array.isArray(nested?.tickers)
          ? nested.tickers.map((t: any) => ({
              id: t.id || t.symbol?.toLowerCase() || '',
              symbol: t.symbol || '',
              name: t.name || '',
              current_price: t.price ?? 0,
              price_change_percentage_24h: t.change24h ?? t.change24hPercent ?? 0,
              market_cap: t.marketCap ?? 0,
              total_volume: t.volume24h ?? 0,
              image: t.image || undefined,
            }))
          : [];
    return raw.slice().sort((a, b) => {
      const valA = (a as unknown as Record<string, number>)[sortBy] ?? 0;
      const valB = (b as unknown as Record<string, number>)[sortBy] ?? 0;
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });
  }, [data, sortBy, sortDir]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown className="w-2.5 h-2.5 opacity-20" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-2.5 h-2.5 text-[#F7931A]" />
      : <ChevronUp className="w-2.5 h-2.5 text-[#F7931A]" />;
  };

  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => <Pulse key={i} w="w-full" h="h-8" />)}
      </div>
    );
  }

  if (error || coins.length === 0) {
    return <ErrorState message="Market data unavailable" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ExportButton
          type="market-data"
          data={coins.slice(0, 15)}
          size="sm"
          variant="outline"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-[9px] text-[#e4e4e7]/30 uppercase border-b border-[#1a1a2e]">
            <th className="text-left py-2 px-2 w-8">#</th>
            <th className="text-left py-2 px-2">Asset</th>
            <th className="text-right py-2 px-2">Price</th>
            <th
              className="text-right py-2 px-2 cursor-pointer hover:text-[#F7931A]/60 select-none"
              onClick={() => handleSort('price_change_percentage_24h')}
            >
              <span className="inline-flex items-center gap-0.5">24h <SortIcon col="price_change_percentage_24h" /></span>
            </th>
            <th
              className="text-right py-2 px-2 cursor-pointer hover:text-[#F7931A]/60 select-none hidden md:table-cell"
              onClick={() => handleSort('total_volume')}
            >
              <span className="inline-flex items-center gap-0.5">Volume <SortIcon col="total_volume" /></span>
            </th>
            <th
              className="text-right py-2 px-2 cursor-pointer hover:text-[#F7931A]/60 select-none hidden lg:table-cell"
              onClick={() => handleSort('market_cap')}
            >
              <span className="inline-flex items-center gap-0.5">Market Cap <SortIcon col="market_cap" /></span>
            </th>
            <th className="text-right py-2 px-2 w-24 hidden lg:table-cell">7D Trend</th>
          </tr>
        </thead>
        <tbody>
          {coins.slice(0, 15).map((coin, idx) => {
            const change = coin.price_change_percentage_24h ?? 0;
            const isUp = change >= 0;
            return (
              <tr
                key={coin.id}
                className="border-b border-[#1a1a2e]/50 hover:bg-[#F7931A]/[0.03] transition-colors group"
              >
                <td className="py-2 px-2 text-[#e4e4e7]/20">{idx + 1}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    {coin.image && (
                      <img src={coin.image} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
                    )}
                    <span className="text-[#e4e4e7] font-bold group-hover:text-[#F7931A] transition-colors">
                      {coin.symbol.toUpperCase()}
                    </span>
                    <span className="text-[#e4e4e7]/25 text-[9px] hidden sm:inline">{coin.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right text-[#e4e4e7] font-bold">
                  ${formatPrice(coin.current_price)}
                </td>
                <td className={`py-2 px-2 text-right font-bold ${isUp ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                  <span className="inline-flex items-center gap-0.5">
                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(change).toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right text-[#e4e4e7]/50 hidden md:table-cell">
                  {formatUsd(coin.total_volume)}
                </td>
                <td className="py-2 px-2 text-right text-[#e4e4e7]/50 hidden lg:table-cell">
                  {formatUsd(coin.market_cap)}
                </td>
                <td className="py-2 px-2 text-right hidden lg:table-cell">
                  <MiniSparkline change={change} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ─── Mini Sparkline for table ────────────────────────────────────────────────

function MiniSparkline({ change }: { change: number }) {
  const isUp = change >= 0;
  // Decorative sparkline for UI only - uses deterministic values seeded from
  // the change percentage so the shape is stable across re-renders.
  const points = useMemo(() => {
    const pts = [];
    let y = 12;
    const seed = Math.abs(Math.round(change * 1000));
    for (let i = 0; i < 12; i++) {
      // Deterministic pseudo-noise from seed + index (Knuth multiplicative hash)
      const noise = ((((seed + i * 7 + 13) * 2654435761) >>> 0) % 100) / 100;
      y = Math.max(2, Math.min(22, y + (noise - (isUp ? 0.35 : 0.65)) * 3));
      pts.push(`${i * 7},${isUp ? 24 - y : y}`);
    }
    return pts.join(' ');
  }, [isUp, change]);

  return (
    <svg width="80" height="24" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#00D4AA' : '#FF4757'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BITCOIN NETWORK HEALTH PANEL (Compact Sidebar)
// ═══════════════════════════════════════════════════════════════════════════

function NetworkHealthPanel({ mempool, fees, blocks }: {
  mempool: ReturnType<typeof useAutoFetch<MempoolData>>;
  fees: ReturnType<typeof useAutoFetch<FeeData>>;
  blocks: ReturnType<typeof useAutoFetch<{ blocks: BlockData[] }>>;
}) {
  const mining = useAutoFetch<MiningData>('/api/onchain/mining/', 60000);

  const latestBlock = blocks.data?.blocks?.[0];

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1a1a2e] flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[10px] font-bold text-[#e4e4e7]/80 font-mono tracking-wider uppercase">
          Bitcoin Network
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
          <span className="text-[8px] text-[#00D4AA] font-mono">LIVE</span>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {/* Hashrate */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">HASHRATE</span>
          {mining.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#00D4AA] font-mono font-bold">
              {mining.data ? formatHashrate(mining.data.hashrate) : '---'}
            </span>
          )}
        </div>
        {/* Difficulty */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">DIFFICULTY</span>
          {mining.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#e4e4e7]/70 font-mono">
              {formatDifficulty(mining.data?.difficulty)}
            </span>
          )}
        </div>
        {/* Block Height */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">BLOCK</span>
          {blocks.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#F7931A] font-mono font-bold">
              #{latestBlock?.height?.toLocaleString() ?? '---'}
            </span>
          )}
        </div>
        {/* Avg Block Time */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">AVG BLOCK</span>
          {mining.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#e4e4e7]/70 font-mono">
              {mining.data?.avgBlockTime ? `${mining.data.avgBlockTime.toFixed(1)} min` : '~10 min'}
            </span>
          )}
        </div>

        <div className="h-px bg-[#1a1a2e]" />

        {/* Mempool Section */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">MEMPOOL TXS</span>
          {mempool.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#e4e4e7] font-mono font-bold">
              {mempool.data?.count?.toLocaleString() ?? '---'}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">MEM SIZE</span>
          {mempool.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#e4e4e7]/70 font-mono">
              {mempool.data?.vsize ? `${(mempool.data.vsize / 1e6).toFixed(1)} MvB` : '---'}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#e4e4e7]/35 font-mono">MEM FEES</span>
          {mempool.loading ? <Pulse w="w-16" h="h-3" /> : (
            <span className="text-[11px] text-[#f59e0b] font-mono">
              {mempool.data?.total_fee ? `${(mempool.data.total_fee / 1e8).toFixed(4)} BTC` : '---'}
            </span>
          )}
        </div>

        {/* Congestion Bar */}
        {mempool.data && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[8px] text-[#e4e4e7]/25 font-mono">CONGESTION</span>
              <span className="text-[8px] text-[#e4e4e7]/25 font-mono">
                {Math.min(100, Math.round((mempool.data.count / 200000) * 100))}%
              </span>
            </div>
            <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (mempool.data.count / 200000) * 100)}%`,
                  background: mempool.data.count > 150000 ? '#FF4757' : mempool.data.count > 80000 ? '#f59e0b' : '#00D4AA',
                }}
              />
            </div>
          </div>
        )}

        <div className="h-px bg-[#1a1a2e]" />

        {/* Fee Rates */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#e4e4e7]/35 font-mono">FAST FEE</span>
            {fees.loading ? <Pulse w="w-14" h="h-3" /> : (
              <span className="text-[11px] text-[#FF4757] font-mono font-bold">
                {fees.data?.fastestFee ?? '---'} <span className="text-[8px] text-[#e4e4e7]/25">sat/vB</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#e4e4e7]/35 font-mono">MED FEE</span>
            {fees.loading ? <Pulse w="w-14" h="h-3" /> : (
              <span className="text-[11px] text-[#f59e0b] font-mono">
                {fees.data?.halfHourFee ?? '---'} <span className="text-[8px] text-[#e4e4e7]/25">sat/vB</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#e4e4e7]/35 font-mono">LOW FEE</span>
            {fees.loading ? <Pulse w="w-14" h="h-3" /> : (
              <span className="text-[11px] text-[#00D4AA] font-mono">
                {fees.data?.hourFee ?? '---'} <span className="text-[8px] text-[#e4e4e7]/25">sat/vB</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET PULSE: HEATMAP
// ═══════════════════════════════════════════════════════════════════════════

function MarketPulseHeatmap() {
  const { data, loading, error, refetch } = useAutoFetch<{ data: MarketCoin[] } | MarketCoin[]>(
    '/api/market/data',
    60000
  );

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-1.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <Pulse key={i} w="w-full" h="h-16" />
        ))}
      </div>
    );
  }

  // API returns { success, data: { tickers: [...], overview, trending } } or MarketCoin[]
  let coins: MarketCoin[] = [];
  if (Array.isArray(data)) {
    coins = data;
  } else if (data && typeof data === 'object') {
    const inner = (data as any).data;
    if (Array.isArray(inner)) {
      coins = inner;
    } else if (inner && Array.isArray(inner.tickers)) {
      // Map API ticker format → MarketCoin
      coins = inner.tickers.map((t: any) => ({
        id: t.id || t.symbol?.toLowerCase() || '',
        symbol: t.symbol || '',
        name: t.name || '',
        current_price: t.price ?? 0,
        price_change_percentage_24h: t.change24h ?? t.change24hPercent ?? 0,
        market_cap: t.marketCap ?? 0,
        total_volume: t.volume24h ?? 0,
        image: t.image || undefined,
      }));
    }
  }

  if (error || coins.length === 0) {
    return <ErrorState message="Market data unavailable" />;
  }

  // Sort by market cap for treemap-like effect (bigger coins get bigger cells)
  const sorted = coins.slice().sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
  const top = sorted.slice(0, 30);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
      {top.map((coin, idx) => {
        const change = coin.price_change_percentage_24h ?? 0;
        const isUp = change >= 0;
        const intensity = Math.min(Math.abs(change) / 8, 1);
        const bgColor = isUp
          ? `rgba(0, 212, 170, ${0.04 + intensity * 0.2})`
          : `rgba(255, 71, 87, ${0.04 + intensity * 0.2})`;
        const isLarge = idx < 3;

        return (
          <div
            key={coin.id}
            className={`rounded border border-[#1a1a2e] p-2.5 transition-all hover:border-[#F7931A]/40 ${
              isLarge ? 'col-span-1 sm:col-span-1' : ''
            }`}
            style={{ backgroundColor: bgColor }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {coin.image && <img src={coin.image} alt="" className="w-3.5 h-3.5 rounded-full" loading="lazy" />}
              <span className="text-[10px] text-[#e4e4e7]/80 font-mono font-bold uppercase">
                {coin.symbol}
              </span>
            </div>
            <div className="text-xs font-bold text-[#e4e4e7] font-mono">
              ${formatPrice(coin.current_price)}
            </div>
            <div className={`text-[10px] font-bold font-mono ${isUp ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Pulse: BTC Dominance ────────────────────────────────────────────

function BtcDominanceCard() {
  const { data, loading, error, refetch } = useAutoFetch<GlobalData>('/api/market/global/', 60000);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">BTC Dominance</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-8" /><Pulse w="w-3/4" h="h-3" /></div>
      ) : error || !data ? (
        <ErrorState />
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-[#F7931A] font-mono">
            {data.btcDominance?.toFixed(1) ?? '---'}%
          </div>
          <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F7931A] rounded-full transition-all duration-700"
              style={{ width: `${data.btcDominance ?? 0}%` }}
            />
          </div>
          <div className="text-[10px] text-[#e4e4e7]/40 font-mono">
            Total Market Cap: {data.totalMarketCap ? formatUsd(data.totalMarketCap) : '---'}
          </div>
          <div className={`text-[10px] font-mono ${(data.marketCapChange24h ?? 0) >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
            24h: {(data.marketCapChange24h ?? 0) >= 0 ? '+' : ''}{(data.marketCapChange24h ?? 0).toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Pulse: Global Volume Card ───────────────────────────────────────

function GlobalVolumeCard() {
  const { data, loading } = useAutoFetch<GlobalData>('/api/market/global/', 60000);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Global Volume & Activity</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /></div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono uppercase">24h Global Volume</div>
            <div className="text-2xl font-bold text-[#e4e4e7] font-mono">
              {data?.totalVolume24h ? formatUsd(data.totalVolume24h) : '---'}
            </div>
          </div>
          <div className="border-t border-[#1a1a2e] pt-2">
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono uppercase">Total Market Cap</div>
            <div className="text-lg font-bold text-[#e4e4e7] font-mono">
              {data?.totalMarketCap ? formatUsd(data.totalMarketCap) : '---'}
            </div>
          </div>
          <div className="border-t border-[#1a1a2e] pt-2">
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono uppercase">Market Cap Change 24h</div>
            <div className={`text-sm font-bold font-mono ${(data?.marketCapChange24h ?? 0) >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {(data?.marketCapChange24h ?? 0) >= 0 ? '+' : ''}{(data?.marketCapChange24h ?? 0).toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Pulse: Sector Performance (improved with real data approximation) ─

function SectorPerformanceCard() {
  const { data, loading } = useAutoFetch<any>('/api/market/data/', 120000);
  const coins: MarketCoin[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    const inner = data?.data;
    if (Array.isArray(inner)) return inner;
    if (inner && Array.isArray(inner.tickers)) {
      return inner.tickers.map((t: any) => ({
        id: t.id || t.symbol?.toLowerCase() || '',
        symbol: t.symbol || '',
        name: t.name || '',
        current_price: t.price ?? 0,
        price_change_percentage_24h: t.change24h ?? t.change24hPercent ?? 0,
        market_cap: t.marketCap ?? 0,
        total_volume: t.volume24h ?? 0,
      }));
    }
    return [];
  }, [data]);

  // Approximate sector performance from top coins
  const sectors = useMemo(() => {
    if (coins.length === 0) return [];

    const sectorMap: Record<string, { coins: string[]; color: string }> = {
      'Layer 1': { coins: ['bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche-2'], color: '#F7931A' },
      'DeFi': { coins: ['uniswap', 'aave', 'maker', 'lido-dao', 'chainlink'], color: '#00D4AA' },
      'Layer 2': { coins: ['matic-network', 'arbitrum', 'optimism', 'mantle'], color: '#8b5cf6' },
      'Meme': { coins: ['dogecoin', 'shiba-inu', 'pepe', 'bonk'], color: '#FF4757' },
      'Exchange': { coins: ['binancecoin', 'okb', 'crypto-com-chain', 'kucoin-shares'], color: '#06b6d4' },
    };

    return Object.entries(sectorMap).map(([name, { coins: sectorCoins, color }]) => {
      const matching = coins.filter(c => sectorCoins.includes(c.id));
      const avgChange = matching.length > 0
        ? matching.reduce((s, c) => s + (c.price_change_percentage_24h ?? 0), 0) / matching.length
        : 0;
      return { name, change: avgChange, color };
    }).sort((a, b) => b.change - a.change);
  }, [coins]);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Sector Performance</h4>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Pulse key={i} w="w-full" h="h-4" />)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sectors.map(sector => {
            const isUp = sector.change >= 0;
            return (
              <div key={sector.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
                  <span className="text-[11px] text-[#e4e4e7]/60 font-mono">{sector.name}</span>
                </div>
                <span className={`text-[11px] font-bold font-mono ${isUp ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                  {isUp ? '+' : ''}{sector.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEWS & SENTIMENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function NewsFeedPanel() {
  const { data, loading, error, refetch } = useAutoFetch<{ articles: NewsArticle[]; sentiment: Record<string, number> }>(
    '/api/news?limit=30',
    60000
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Pulse w="w-full" h="h-3.5" />
            <Pulse w="w-2/3" h="h-2.5" />
            <div className="h-px bg-[#1a1a2e]" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data?.articles?.length) {
    return <ErrorState message="News feed unavailable" />;
  }

  return (
    <div className="space-y-0 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
      {data.articles.map((article, i) => (
        <div
          key={i}
          className="py-2.5 border-b border-[#1a1a2e]/50 last:border-b-0 hover:bg-[#F7931A]/[0.02] px-2 -mx-2 rounded transition-colors"
        >
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="group">
            <p className="text-[11px] text-[#e4e4e7]/90 leading-snug group-hover:text-[#F7931A] transition-colors line-clamp-2 font-mono">
              {article.title}
              <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover:opacity-40" />
            </p>
          </a>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] text-[#e4e4e7]/25 font-mono">{article.source}</span>
            <span className="text-[8px] text-[#e4e4e7]/15">|</span>
            <span className="text-[8px] text-[#e4e4e7]/25 font-mono">{timeAgo(article.publishedAt)}</span>
            <SentimentBadge sentiment={article.sentiment} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SentimentScoreCard() {
  const { data, loading } = useAutoFetch<{ articles: NewsArticle[]; sentiment: Record<string, number> }>(
    '/api/news?limit=30',
    60000
  );

  const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
  if (data?.articles) {
    data.articles.forEach((a) => {
      if (a.sentiment === 'bullish' || a.sentiment === 'very_bullish') sentimentCounts.bullish++;
      else if (a.sentiment === 'bearish' || a.sentiment === 'very_bearish') sentimentCounts.bearish++;
      else sentimentCounts.neutral++;
    });
  }
  const total = sentimentCounts.bullish + sentimentCounts.bearish + sentimentCounts.neutral;
  const bullishPct = total > 0 ? (sentimentCounts.bullish / total) * 100 : 50;
  const bearishPct = total > 0 ? (sentimentCounts.bearish / total) * 100 : 50;

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">News Sentiment</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-10" /><Pulse w="w-full" h="h-4" /></div>
      ) : (
        <div className="space-y-3">
          <div className="text-center">
            <div className={`text-2xl font-bold font-mono ${bullishPct >= 50 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
              {bullishPct >= 50 ? 'BULLISH' : 'BEARISH'}
            </div>
            <div className="text-[9px] text-[#e4e4e7]/30 font-mono mt-1">
              Based on {total} articles
            </div>
          </div>
          <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#00D4AA] transition-all" style={{ width: `${bullishPct}%` }} />
            <div className="h-full bg-[#FF4757] transition-all" style={{ width: `${bearishPct}%` }} />
          </div>
          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-[#00D4AA]">Bull {bullishPct.toFixed(0)}%</span>
            <span className="text-[#e4e4e7]/30">Neutral {(100 - bullishPct - bearishPct).toFixed(0)}%</span>
            <span className="text-[#FF4757]">Bear {bearishPct.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK STATUS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MempoolStatsCard() {
  const { data, loading, error, refetch } = useAutoFetch<MempoolData>('/api/onchain/mempool/', 30000);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Mempool</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-4" /></div>
      ) : error || !data ? (
        <ErrorState />
      ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Unconfirmed TXs</div>
            <div className="text-xl font-bold text-[#e4e4e7] font-mono">{data.count?.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Virtual Size</div>
            <div className="text-sm font-bold text-[#e4e4e7]/70 font-mono">
              {data.vsize ? `${(data.vsize / 1e6).toFixed(1)} MvB` : '---'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Total Fees</div>
            <div className="text-sm font-bold text-[#f59e0b] font-mono">
              {data.total_fee ? `${(data.total_fee / 1e8).toFixed(4)} BTC` : '---'}
            </div>
          </div>
          <div className="pt-1 border-t border-[#1a1a2e]">
            <div className="text-[8px] text-[#e4e4e7]/25 mb-1 font-mono">CONGESTION</div>
            <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (data.count / 200000) * 100)}%`,
                  background: data.count > 150000 ? '#FF4757' : data.count > 80000 ? '#f59e0b' : '#00D4AA',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeeEstimatorCard() {
  const { data, loading, error, refetch } = useAutoFetch<FeeData>('/api/onchain/fees/', 30000);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Fee Estimates</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-5" /><Pulse w="w-full" h="h-5" /></div>
      ) : error || !data ? (
        <ErrorState />
      ) : (
        <div className="space-y-2 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/40">Fast (~10 min)</span>
            <span className="text-[#FF4757] font-bold">{data.fastestFee} sat/vB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/40">Medium (~30 min)</span>
            <span className="text-[#f59e0b] font-bold">{data.halfHourFee} sat/vB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/40">Slow (~1 hr)</span>
            <span className="text-[#00D4AA] font-bold">{data.hourFee} sat/vB</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-[#1a1a2e]">
            <span className="text-[#e4e4e7]/40">Economy</span>
            <span className="text-[#e4e4e7]/60">{data.economyFee} sat/vB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/40">Minimum</span>
            <span className="text-[#e4e4e7]/35">{data.minimumFee} sat/vB</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HashrateCard() {
  const { data, loading, error } = useAutoFetch<MiningData>('/api/onchain/mining/', 60000);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Mining / Hashrate</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /></div>
      ) : error || !data ? (
        <ErrorState />
      ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Network Hashrate</div>
            <div className="text-lg font-bold text-[#00D4AA] font-mono">{formatHashrate(data.hashrate)}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Difficulty</div>
            <div className="text-sm font-bold text-[#e4e4e7]/70 font-mono">
              {formatDifficulty(data.difficulty)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Avg Block Time</div>
            <div className="text-sm font-bold text-[#e4e4e7]/70 font-mono">
              {data.avgBlockTime ? `${data.avgBlockTime.toFixed(1)} min` : '~10 min'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockHeightCard() {
  const { data, loading, error } = useAutoFetch<{ blocks: BlockData[] }>('/api/onchain/blocks/', 30000);
  const latest = data?.blocks?.[0];

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Latest Block</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /></div>
      ) : error || !latest ? (
        <ErrorState />
      ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Block Height</div>
            <div className="text-xl font-bold text-[#F7931A] font-mono">#{latest.height.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Transactions</div>
            <div className="text-sm font-bold text-[#e4e4e7]/70 font-mono">{latest.tx_count.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Size</div>
            <div className="text-sm font-bold text-[#e4e4e7]/70 font-mono">{(latest.size / 1e6).toFixed(2)} MB</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/35 font-mono">Mined</div>
            <div className="text-sm text-[#e4e4e7]/50 font-mono">{timeAgo(latest.timestamp)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentBlocksTable() {
  const { data, loading, error, refetch } = useAutoFetch<{ blocks: BlockData[] }>('/api/onchain/blocks/', 30000);

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg p-4">
      <h3 className="text-[11px] font-mono text-[#F7931A] font-bold mb-3 uppercase tracking-wider">Recent Blocks</h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Pulse key={i} w="w-full" h="h-7" />)}
        </div>
      ) : error || !data?.blocks?.length ? (
        <ErrorState message="Block data unavailable" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-[9px] text-[#e4e4e7]/25 uppercase border-b border-[#1a1a2e]">
                <th className="text-left py-1.5 px-2">Height</th>
                <th className="text-right py-1.5 px-2">TXs</th>
                <th className="text-right py-1.5 px-2">Size</th>
                <th className="text-right py-1.5 px-2">Fee</th>
                <th className="text-right py-1.5 px-2">Mined</th>
                <th className="text-left py-1.5 px-2 hidden md:table-cell">Hash</th>
              </tr>
            </thead>
            <tbody>
              {data.blocks.slice(0, 10).map((block) => (
                <tr
                  key={block.height}
                  className="border-b border-[#1a1a2e]/30 hover:bg-[#F7931A]/[0.02] transition-colors"
                >
                  <td className="py-1.5 px-2 text-[#F7931A] font-bold">#{block.height.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-[#e4e4e7]/80">{block.tx_count.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-[#e4e4e7]/50">{(block.size / 1e6).toFixed(2)} MB</td>
                  <td className="py-1.5 px-2 text-right text-[#f59e0b]">
                    {block.median_fee ? `${block.median_fee} sat/vB` : '---'}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#e4e4e7]/40">{timeAgo(block.timestamp)}</td>
                  <td className="py-1.5 px-2 text-[#e4e4e7]/20 truncate max-w-[120px] hidden md:table-cell">
                    {block.hash?.slice(0, 12)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT NEWS SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════

function CompactNewsSidebar() {
  const { data, loading } = useAutoFetch<{ articles: NewsArticle[] }>(
    '/api/news?limit=8',
    60000
  );

  return (
    <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1a1a2e] flex items-center gap-2">
        <Newspaper className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[10px] font-bold text-[#e4e4e7]/80 font-mono tracking-wider uppercase">
          Headlines
        </span>
      </div>
      <div className="p-2">
        {loading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, i) => <Pulse key={i} w="w-full" h="h-4" />)}
          </div>
        ) : !data?.articles?.length ? (
          <ErrorState message="No news" />
        ) : (
          <div className="space-y-0">
            {data.articles.slice(0, 6).map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-1.5 border-b border-[#1a1a2e]/40 last:border-0 hover:bg-[#F7931A]/[0.03] rounded transition-colors group"
              >
                <p className="text-[10px] text-[#e4e4e7]/70 leading-snug group-hover:text-[#F7931A] transition-colors line-clamp-2 font-mono">
                  {article.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[8px] text-[#e4e4e7]/20 font-mono">{article.source}</span>
                  <span className="text-[8px] text-[#e4e4e7]/15">·</span>
                  <span className="text-[8px] text-[#e4e4e7]/20 font-mono">{timeAgo(article.publishedAt)}</span>
                  <SentimentBadge sentiment={article.sentiment} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function BloombergDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const price = useAutoFetch<PriceData>('/api/market/price/', 30000);
  const global = useAutoFetch<GlobalData>('/api/market/global/', 120000);
  const fees = useAutoFetch<FeeData>('/api/onchain/fees/', 60000);
  const mempool = useAutoFetch<MempoolData>('/api/onchain/mempool/', 60000);
  const blocks = useAutoFetch<{ blocks: BlockData[] }>('/api/onchain/blocks/', 60000);

  const btcPrice = price.data?.price ?? 0;
  const btcChange = price.data?.change24h ?? 0;
  const isPositive = btcChange >= 0;
  const latestBlock = blocks.data?.blocks?.[0];

  // Initial loading screen - only wait for price (fastest API)
  if (price.loading && !price.data) {
    return (
      <div className="bg-[#08080e] min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#F7931A] font-mono text-xs tracking-widest animate-pulse">INITIALIZING TERMINAL</p>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-1.5 h-1.5 bg-[#00D4AA] rounded-full animate-ping" />
            <span className="text-[#e4e4e7]/30 font-mono text-[10px]">Connecting to data feeds</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-20 font-mono text-[#e4e4e7]">

      {/* ─── Live Price Ticker ──────────────────────────────────────────── */}
      <LivePriceTicker />

      {/* ─── Header Bar ────────────────────────────────────────────────── */}
      <div className="border-b border-[#1a1a2e] bg-[#0a0a12]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F7931A]" />
              <span className="text-[#F7931A] font-bold text-sm tracking-[0.2em]">CYPHER</span>
              <span className="text-[#e4e4e7]/20 text-[9px]">TERMINAL v3.2</span>
            </div>
            <div className="h-4 w-px bg-[#1a1a2e]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#e4e4e7]/30">BTC/USD</span>
              {price.loading ? <Pulse w="w-24" h="h-5" /> : (
                <>
                  <span className={`text-lg font-bold tracking-tight ${isPositive ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                    ${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-[11px] flex items-center gap-0.5 ${isPositive ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{btcChange.toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#e4e4e7]/30">
            <span className="hidden sm:inline" suppressHydrationWarning>
              {new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} <span className="text-[#e4e4e7]/15">EST</span>
            </span>
            <span className="hidden md:inline" suppressHydrationWarning>
              {new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false })} <span className="text-[#e4e4e7]/15">GMT</span>
            </span>
            <span className="hidden lg:inline" suppressHydrationWarning>
              {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false })} <span className="text-[#e4e4e7]/15">JST</span>
            </span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
              <Wifi className="w-3 h-3 text-[#00D4AA]" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Key Metrics Strip ─────────────────────────────────────────── */}
      <div className="border-b border-[#1a1a2e] bg-[#0a0a12]/60">
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-[#1a1a2e]">
          <div className="px-4 py-2">
            <div className="text-[8px] text-[#e4e4e7]/25 uppercase tracking-wider">Total Mkt Cap</div>
            {global.loading ? <Pulse w="w-16" h="h-4" /> : (
              <>
                <div className="text-sm font-bold text-[#e4e4e7]">
                  {global.data?.totalMarketCap ? formatUsd(global.data.totalMarketCap) : '---'}
                </div>
                <div className={`text-[9px] ${(global.data?.marketCapChange24h ?? 0) >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                  {(global.data?.marketCapChange24h ?? 0) >= 0 ? '+' : ''}{(global.data?.marketCapChange24h ?? 0).toFixed(2)}%
                </div>
              </>
            )}
          </div>
          <div className="px-4 py-2">
            <div className="text-[8px] text-[#e4e4e7]/25 uppercase tracking-wider">24h Volume</div>
            {global.loading ? <Pulse w="w-16" h="h-4" /> : (
              <div className="text-sm font-bold text-[#e4e4e7]">
                {global.data?.totalVolume24h ? formatUsd(global.data.totalVolume24h) : '---'}
              </div>
            )}
          </div>
          <div className="px-4 py-2">
            <div className="text-[8px] text-[#e4e4e7]/25 uppercase tracking-wider">BTC Dom</div>
            {global.loading ? <Pulse w="w-12" h="h-4" /> : (
              <div className="text-sm font-bold text-[#F7931A]">
                {global.data?.btcDominance ? `${global.data.btcDominance.toFixed(1)}%` : '---'}
              </div>
            )}
          </div>
          <div className="px-4 py-2 hidden sm:block">
            <div className="text-[8px] text-[#e4e4e7]/25 uppercase tracking-wider">Block</div>
            {blocks.loading ? <Pulse w="w-16" h="h-4" /> : (
              <div className="text-sm font-bold text-[#e4e4e7]">
                {latestBlock?.height?.toLocaleString() ?? '---'}
              </div>
            )}
          </div>
          <div className="px-4 py-2 hidden sm:block">
            <div className="text-[8px] text-[#e4e4e7]/25 uppercase tracking-wider">Med Fee</div>
            {fees.loading ? <Pulse w="w-12" h="h-4" /> : (
              <div className="text-sm font-bold text-[#e4e4e7]">
                {fees.data?.halfHourFee ?? '---'} <span className="text-[9px] text-[#e4e4e7]/30">sat/vB</span>
              </div>
            )}
          </div>
          <div className="px-4 py-2 hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse" />
            <span className="text-xs text-[#00D4AA] font-bold tracking-wider">LIVE</span>
          </div>
        </div>
      </div>

      {/* ─── Main Content with Tabs ───────────────────────────────────── */}
      <div className="p-3 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#0a0a12] border border-[#1a1a2e] p-0.5 mb-4">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-[#e4e4e7]/40 font-mono text-[11px] px-4 py-1.5 tracking-wider"
            >
              OVERVIEW
            </TabsTrigger>
            <TabsTrigger
              value="market-pulse"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-[#e4e4e7]/40 font-mono text-[11px] px-4 py-1.5 tracking-wider"
            >
              MARKET PULSE
            </TabsTrigger>
            <TabsTrigger
              value="news"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-[#e4e4e7]/40 font-mono text-[11px] px-4 py-1.5 tracking-wider"
            >
              NEWS & SENTIMENT
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-[#e4e4e7]/40 font-mono text-[11px] px-4 py-1.5 tracking-wider"
            >
              NETWORK
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: OVERVIEW ═══ */}
          <TabsContent value="overview">
            <div className="space-y-4">
              {/* Main Grid: Chart + Market Table (left) | Network + News (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* ─── Left Column (8 cols) ───────────────────────────────── */}
                <div className="lg:col-span-8 space-y-4">

                  {/* Professional Chart */}
                  <Section
                    title="Price Chart"
                    icon={<BarChart3 className="w-3.5 h-3.5 text-[#F7931A]" />}
                  >
                    <ProfessionalPriceChart />
                  </Section>

                  {/* Market Leaders Table */}
                  <Section
                    title="Market Leaders"
                    icon={<TrendingUp className="w-3.5 h-3.5 text-[#00D4AA]" />}
                  >
                    <MarketLeadersTable />
                  </Section>

                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Section
                      title="Fee Estimates"
                      icon={<Zap className="w-3.5 h-3.5 text-[#f59e0b]" />}
                      updatedAt={fees.updatedAt}
                      error={fees.error}
                      onRetry={fees.refetch}
                    >
                      {fees.loading ? (
                        <div className="space-y-2"><Pulse w="w-full" h="h-3" /><Pulse w="w-full" h="h-3" /></div>
                      ) : fees.data ? (
                        <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[#e4e4e7]/40">Fast</span>
                            <span className="text-[#FF4757] font-bold">{fees.data.fastestFee} sat/vB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#e4e4e7]/40">Medium</span>
                            <span className="text-[#f59e0b] font-bold">{fees.data.halfHourFee} sat/vB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#e4e4e7]/40">Slow</span>
                            <span className="text-[#00D4AA] font-bold">{fees.data.hourFee} sat/vB</span>
                          </div>
                        </div>
                      ) : <ErrorState />}
                    </Section>

                    <Section
                      title="Mempool"
                      icon={<Database className="w-3.5 h-3.5 text-[#00D4AA]" />}
                      updatedAt={mempool.updatedAt}
                      error={mempool.error}
                      onRetry={mempool.refetch}
                    >
                      {mempool.loading ? (
                        <div className="space-y-2"><Pulse w="w-full" h="h-3" /><Pulse w="w-full" h="h-3" /></div>
                      ) : mempool.data ? (
                        <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[#e4e4e7]/40">Pending TXs</span>
                            <span className="text-[#e4e4e7] font-bold">{mempool.data.count?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#e4e4e7]/40">Size</span>
                            <span className="text-[#e4e4e7]/70">{mempool.data.vsize ? `${(mempool.data.vsize / 1e6).toFixed(1)} MvB` : '---'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#e4e4e7]/40">Fees</span>
                            <span className="text-[#f59e0b]">{mempool.data.total_fee ? `${(mempool.data.total_fee / 1e8).toFixed(4)} BTC` : '---'}</span>
                          </div>
                        </div>
                      ) : <ErrorState />}
                    </Section>

                    <FearGreedGauge />
                  </div>
                </div>

                {/* ─── Right Sidebar (4 cols) ─────────────────────────────── */}
                <div className="lg:col-span-4 space-y-4">
                  <NetworkHealthPanel mempool={mempool} fees={fees} blocks={blocks} />
                  <CompactNewsSidebar />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB 2: MARKET PULSE ═══ (lazy mount) */}
          <TabsContent value="market-pulse">
            {activeTab === 'market-pulse' && (
              <div className="space-y-4">
                <Section
                  title="Market Heatmap — 24h Performance"
                  icon={<Layers className="w-3.5 h-3.5 text-[#F7931A]" />}
                >
                  <MarketPulseHeatmap />
                </Section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BtcDominanceCard />
                  <SectorPerformanceCard />
                  <GlobalVolumeCard />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB 3: NEWS & SENTIMENT ═══ (lazy mount) */}
          <TabsContent value="news">
            {activeTab === 'news' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Section
                    title="Crypto News Feed"
                    icon={<Newspaper className="w-3.5 h-3.5 text-[#F7931A]" />}
                  >
                    <NewsFeedPanel />
                  </Section>
                </div>
                <div className="space-y-4">
                  <SentimentScoreCard />
                  <FearGreedGauge />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB 4: NETWORK STATUS ═══ (lazy mount) */}
          <TabsContent value="network">
            {activeTab === 'network' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MempoolStatsCard />
                  <FeeEstimatorCard />
                  <HashrateCard />
                  <BlockHeightCard />
                </div>
                <RecentBlocksTable />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Status Footer ─────────────────────────────────────────────── */}
      <div className="border-t border-[#1a1a2e] bg-[#0a0a12]/80 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 text-[9px] font-mono gap-1">
          <div className="flex items-center gap-3 flex-wrap text-[#e4e4e7]/25">
            <span>NETWORK:</span>
            <span>Block <span className="text-[#F7931A]">{latestBlock?.height?.toLocaleString() ?? '---'}</span></span>
            <span className="text-[#1a1a2e]">|</span>
            <span>Mempool <span className="text-[#e4e4e7]/50">{mempool.data?.count?.toLocaleString() ?? '---'}</span> txs</span>
            <span className="text-[#1a1a2e]">|</span>
            <span>Fee <span className="text-[#f59e0b]">{fees.data?.halfHourFee ?? '---'}</span> sat/vB</span>
            <span className="text-[#1a1a2e]">|</span>
            <span>Status <span className="text-[#00D4AA]">OPERATIONAL</span></span>
          </div>
          <div className="flex items-center gap-2 text-[#e4e4e7]/15">
            <span>CYPHER TERMINAL</span>
            <span>v3.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
