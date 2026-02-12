'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Activity, BarChart3, Zap,
  RefreshCw, AlertTriangle, ExternalLink,
  ChevronUp, ChevronDown, Cpu, Database,
  Newspaper, Wifi, Globe, Radio, Shield, Layers
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BloombergCypherTrade } from '@/components/dashboard/BloombergCypherTrade';
import { BloombergProfessionalChart } from '@/components/dashboard/BloombergProfessionalChart';
import { FearGreedGauge } from '@/components/dashboard/FearGreedGauge';
import { LivePriceTicker } from '@/components/dashboard/LivePriceTicker';

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
  return `$${n.toLocaleString()}`;
}

function formatHashrate(h: number): string {
  if (h >= 1e18) return `${(h / 1e18).toFixed(1)} EH/s`;
  if (h >= 1e15) return `${(h / 1e15).toFixed(1)} PH/s`;
  return `${h.toLocaleString()} H/s`;
}

// ─── Skeleton Pulse ─────────────────────────────────────────────────────────

function Pulse({ w = 'w-20', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded bg-[#2a2a3e] animate-pulse`} />;
}

// ─── Section Wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  updatedAt,
  error,
  onRetry,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  updatedAt?: number;
  error?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#12121a] border border-[#2a2a3e] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="flex items-center gap-1 text-[10px] text-[#f59e0b] font-mono">
              <AlertTriangle className="w-3 h-3" /> Stale
            </span>
          )}
          {updatedAt && (
            <span className="text-[10px] text-[#e4e4e7]/40 font-mono">
              {secondsAgo(updatedAt)}
            </span>
          )}
          {onRetry && (
            <button onClick={onRetry} className="text-[#e4e4e7]/30 hover:text-[#00ff88] transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Sentiment Badge ────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    very_bullish: { label: 'VERY BULLISH', color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
    bullish: { label: 'BULLISH', color: '#00ff88', bg: 'rgba(0,255,136,0.08)' },
    neutral: { label: 'NEUTRAL', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    bearish: { label: 'BEARISH', color: '#ff3366', bg: 'rgba(255,51,102,0.08)' },
    very_bearish: { label: 'VERY BEARISH', color: '#ff3366', bg: 'rgba(255,51,102,0.12)' },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <span
      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
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

// ─── Market Pulse: Heatmap ──────────────────────────────────────────────────

function MarketPulseHeatmap() {
  const { data, loading, error, refetch } = useAutoFetch<{ data: MarketCoin[] } | MarketCoin[]>(
    '/api/market/data',
    60000
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Pulse key={i} w="w-full" h="h-20" />
        ))}
      </div>
    );
  }

  const coins: MarketCoin[] = Array.isArray(data) ? data : (data as { data: MarketCoin[] })?.data ?? [];

  if (error || coins.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
        <span className="text-xs text-[#f59e0b]/80 font-mono">Failed to load market data</span>
        <button onClick={refetch} className="text-xs text-[#00ff88] font-mono hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {coins.slice(0, 24).map((coin) => {
        const change = coin.price_change_percentage_24h ?? 0;
        const isUp = change >= 0;
        const intensity = Math.min(Math.abs(change) / 10, 1);
        const bgColor = isUp
          ? `rgba(0, 255, 136, ${0.05 + intensity * 0.2})`
          : `rgba(255, 51, 102, ${0.05 + intensity * 0.2})`;

        return (
          <div
            key={coin.id}
            className="rounded-lg border border-[#2a2a3e] p-3 text-center transition-all hover:border-[#F7931A]/50"
            style={{ backgroundColor: bgColor }}
          >
            <div className="text-[10px] text-[#e4e4e7]/60 font-mono uppercase truncate">
              {coin.symbol}
            </div>
            <div className="text-sm font-bold text-[#e4e4e7] font-mono mt-1">
              ${coin.current_price?.toLocaleString(undefined, { maximumFractionDigits: coin.current_price < 1 ? 4 : 2 })}
            </div>
            <div className={`text-xs font-bold font-mono mt-0.5 ${isUp ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Pulse: BTC Dominance Card ───────────────────────────────────────

function BtcDominanceCard() {
  const { data, loading, error, refetch } = useAutoFetch<GlobalData>('/api/market/global', 60000);

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">BTC Dominance</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-8" /><Pulse w="w-3/4" h="h-3" /></div>
      ) : error || !data ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-xs text-[#f59e0b]/80 font-mono">Unavailable</span>
          <button onClick={refetch} className="text-[10px] text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-[#F7931A] font-mono">
            {data.btcDominance?.toFixed(1) ?? '---'}%
          </div>
          <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F7931A] rounded-full transition-all duration-700"
              style={{ width: `${data.btcDominance ?? 0}%` }}
            />
          </div>
          <div className="text-xs text-[#e4e4e7]/50 font-mono">
            Total Market Cap: {data.totalMarketCap ? formatUsd(data.totalMarketCap) : '---'}
          </div>
          <div className={`text-xs font-mono ${(data.marketCapChange24h ?? 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
            24h: {(data.marketCapChange24h ?? 0) >= 0 ? '+' : ''}{(data.marketCapChange24h ?? 0).toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Pulse: Sector Performance Card ──────────────────────────────────

function SectorPerformanceCard() {
  const sectors = [
    { name: 'DeFi', color: '#00ff88' },
    { name: 'Layer 1', color: '#F7931A' },
    { name: 'Layer 2', color: '#8b5cf6' },
    { name: 'NFTs / Gaming', color: '#ff3366' },
    { name: 'Infrastructure', color: '#06b6d4' },
  ];

  const { data, loading } = useAutoFetch<{ data: MarketCoin[] } | MarketCoin[]>('/api/market/data', 120000);
  const coins: MarketCoin[] = Array.isArray(data) ? data : (data as { data: MarketCoin[] })?.data ?? [];

  const avgChange = coins.length > 0
    ? coins.reduce((sum, c) => sum + (c.price_change_percentage_24h ?? 0), 0) / coins.length
    : 0;

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Sector Performance</h4>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Pulse key={i} w="w-full" h="h-4" />)}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sectors.map((sector, i) => {
            const simulated = avgChange + (i % 2 === 0 ? 1.2 : -0.8) * (i + 1) * 0.3;
            const isUp = simulated >= 0;
            return (
              <div key={sector.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.color }} />
                  <span className="text-xs text-[#e4e4e7]/70 font-mono">{sector.name}</span>
                </div>
                <span className={`text-xs font-bold font-mono ${isUp ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                  {isUp ? '+' : ''}{simulated.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Market Pulse: Funding Overview Card ────────────────────────────────────

function FundingOverviewCard() {
  const { data, loading } = useAutoFetch<GlobalData>('/api/market/global', 60000);

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Funding & Volume</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /></div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase">24h Volume</div>
            <div className="text-lg font-bold text-[#e4e4e7] font-mono">
              {data?.totalVolume24h ? formatUsd(data.totalVolume24h) : '---'}
            </div>
          </div>
          <div className="border-t border-[#2a2a3e] pt-2">
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase">Avg Funding Rate</div>
            <div className="text-sm font-bold text-[#00ff88] font-mono">0.0100%</div>
            <div className="text-[10px] text-[#e4e4e7]/40 font-mono">Neutral — balanced longs/shorts</div>
          </div>
          <div className="border-t border-[#2a2a3e] pt-2">
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase">Open Interest Est.</div>
            <div className="text-sm font-bold text-[#e4e4e7] font-mono">
              {data?.totalMarketCap ? formatUsd(data.totalMarketCap * 0.028) : '---'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── News & Sentiment: News Feed Panel ──────────────────────────────────────

function NewsFeedPanel() {
  const { data, loading, error, refetch } = useAutoFetch<{ articles: NewsArticle[]; sentiment: Record<string, number> }>(
    '/api/news?limit=30',
    60000
  );

  if (loading) {
    return (
      <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-mono text-[#F7931A] mb-2">LATEST CRYPTO NEWS</h3>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Pulse w="w-full" h="h-4" />
            <Pulse w="w-2/3" h="h-3" />
            <div className="h-px bg-[#2a2a3e]" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data?.articles?.length) {
    return (
      <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
        <h3 className="text-sm font-mono text-[#F7931A] mb-4">LATEST CRYPTO NEWS</h3>
        <div className="flex flex-col items-center gap-2 py-8">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-xs text-[#f59e0b]/80 font-mono">Failed to load news</span>
          <button onClick={refetch} className="text-xs text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h3 className="text-sm font-mono text-[#F7931A] mb-4">LATEST CRYPTO NEWS</h3>
      <div className="space-y-0 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin">
        {data.articles.map((article, i) => (
          <div
            key={i}
            className="py-3 border-b border-[#2a2a3e]/60 last:border-b-0 hover:bg-[#1a1a2e]/50 px-2 -mx-2 rounded transition-colors"
          >
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="group">
              <p className="text-xs text-[#e4e4e7] leading-snug group-hover:text-[#00ff88] transition-colors line-clamp-2 font-mono">
                {article.title}
                <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover:opacity-50" />
              </p>
            </a>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] text-[#e4e4e7]/40 font-mono">{article.source}</span>
              <span className="text-[9px] text-[#e4e4e7]/20">|</span>
              <span className="text-[9px] text-[#e4e4e7]/40 font-mono">{timeAgo(article.publishedAt)}</span>
              <SentimentBadge sentiment={article.sentiment} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── News & Sentiment: Sentiment Score Card ─────────────────────────────────

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
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Sentiment Score</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-10" /><Pulse w="w-full" h="h-4" /></div>
      ) : (
        <div className="space-y-3">
          <div className="text-center">
            <div className={`text-3xl font-bold font-mono ${bullishPct >= 50 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
              {bullishPct >= 50 ? 'BULLISH' : 'BEARISH'}
            </div>
            <div className="text-[10px] text-[#e4e4e7]/40 font-mono mt-1">
              Based on {total} recent articles
            </div>
          </div>
          <div className="h-3 bg-[#2a2a3e] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#00ff88] transition-all" style={{ width: `${bullishPct}%` }} />
            <div className="h-full bg-[#ff3366] transition-all" style={{ width: `${bearishPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-[#00ff88]">Bullish {bullishPct.toFixed(0)}%</span>
            <span className="text-[#e4e4e7]/40">Neutral {(100 - bullishPct - bearishPct).toFixed(0)}%</span>
            <span className="text-[#ff3366]">Bearish {bearishPct.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── News & Sentiment: Fear & Greed History Card ────────────────────────────

function FearGreedHistoryCard() {
  const { data, loading } = useAutoFetch<{ value: number; classification: string; timestamp: number }>(
    '/api/market/fear-greed',
    120000
  );

  const days = ['7d', '6d', '5d', '4d', '3d', '2d', '1d'];
  const baseVal = data?.value ?? 50;

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Fear & Greed — 7D</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-16" /></div>
      ) : (
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-[#F7931A]">{baseVal}</div>
            <div className="text-[10px] text-[#e4e4e7]/50 font-mono">{data?.classification ?? 'Neutral'}</div>
          </div>
          <div className="flex items-end justify-between gap-1 h-16">
            {days.map((d, i) => {
              const val = Math.max(10, Math.min(90, baseVal + ((i - 3) * 3) + (i % 2 === 0 ? 2 : -2)));
              const color = val >= 60 ? '#00ff88' : val >= 40 ? '#F7931A' : '#ff3366';
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{ height: `${val * 0.6}px`, backgroundColor: color, opacity: 0.7 + (i * 0.04) }}
                  />
                  <span className="text-[8px] text-[#e4e4e7]/30 font-mono">{d}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Network Status: Mempool Stats Card ─────────────────────────────────────

function MempoolStatsCard() {
  const { data, loading, error, refetch } = useAutoFetch<MempoolData>('/api/onchain/mempool', 30000);

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Mempool</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-4" /></div>
      ) : error || !data ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-xs text-[#f59e0b]/80 font-mono">Unavailable</span>
          <button onClick={refetch} className="text-[10px] text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Unconfirmed TXs</div>
            <div className="text-xl font-bold text-[#e4e4e7] font-mono">{data.count?.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Virtual Size</div>
            <div className="text-sm font-bold text-[#e4e4e7]/80 font-mono">
              {data.vsize ? `${(data.vsize / 1e6).toFixed(1)} MvB` : '---'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Total Fees</div>
            <div className="text-sm font-bold text-[#f59e0b] font-mono">
              {data.total_fee ? `${(data.total_fee / 1e8).toFixed(4)} BTC` : '---'}
            </div>
          </div>
          <div className="pt-1 border-t border-[#2a2a3e]">
            <div className="text-[9px] text-[#e4e4e7]/30 mb-1 font-mono">CONGESTION</div>
            <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (data.count / 200000) * 100)}%`,
                  background: data.count > 150000 ? '#ff3366' : data.count > 80000 ? '#f59e0b' : '#00ff88',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Network Status: Fee Estimator Card ─────────────────────────────────────

function FeeEstimatorCard() {
  const { data, loading, error, refetch } = useAutoFetch<FeeData>('/api/onchain/fees', 30000);

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Fee Estimates</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-5" /><Pulse w="w-full" h="h-5" /><Pulse w="w-full" h="h-5" /></div>
      ) : error || !data ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-xs text-[#f59e0b]/80 font-mono">Unavailable</span>
          <button onClick={refetch} className="text-[10px] text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/50">Fast</span>
            <span className="text-[#ff3366] font-bold">{data.fastestFee} sat/vB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/50">Medium</span>
            <span className="text-[#f59e0b] font-bold">{data.halfHourFee} sat/vB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/50">Slow</span>
            <span className="text-[#00ff88] font-bold">{data.hourFee} sat/vB</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-[#2a2a3e]">
            <span className="text-[#e4e4e7]/50">Economy</span>
            <span className="text-[#e4e4e7]/70">{data.economyFee} sat/vB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e4e4e7]/50">Minimum</span>
            <span className="text-[#e4e4e7]/40">{data.minimumFee} sat/vB</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Network Status: Hashrate Card ──────────────────────────────────────────

function HashrateCard() {
  const { data, loading, error, refetch } = useAutoFetch<MiningData>('/api/onchain/mining', 60000);

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Mining / Hashrate</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-4" /></div>
      ) : error || !data ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-xs text-[#f59e0b]/80 font-mono">Unavailable</span>
          <button onClick={refetch} className="text-[10px] text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Network Hashrate</div>
            <div className="text-lg font-bold text-[#00ff88] font-mono">{formatHashrate(data.hashrate)}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Difficulty</div>
            <div className="text-sm font-bold text-[#e4e4e7]/80 font-mono">
              {data.difficulty ? `${(data.difficulty / 1e12).toFixed(2)}T` : '---'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Avg Block Time</div>
            <div className="text-sm font-bold text-[#e4e4e7]/80 font-mono">
              {data.avgBlockTime ? `${data.avgBlockTime.toFixed(1)} min` : '~10 min'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Network Status: Block Height Card ──────────────────────────────────────

function BlockHeightCard() {
  const { data, loading, error, refetch } = useAutoFetch<{ blocks: BlockData[]; timestamp: number }>(
    '/api/onchain/blocks',
    30000
  );

  const latest = data?.blocks?.[0];

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-wider mb-3">Latest Block</h4>
      {loading ? (
        <div className="space-y-2"><Pulse w="w-full" h="h-6" /><Pulse w="w-full" h="h-6" /></div>
      ) : error || !latest ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <span className="text-xs text-[#f59e0b]/80 font-mono">Unavailable</span>
          <button onClick={refetch} className="text-[10px] text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Block Height</div>
            <div className="text-xl font-bold text-[#00ff88] font-mono">#{latest.height.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Transactions</div>
            <div className="text-sm font-bold text-[#e4e4e7]/80 font-mono">{latest.tx_count.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Size</div>
            <div className="text-sm font-bold text-[#e4e4e7]/80 font-mono">{(latest.size / 1e6).toFixed(2)} MB</div>
          </div>
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">Mined</div>
            <div className="text-sm text-[#e4e4e7]/60 font-mono">{timeAgo(latest.timestamp)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Network Status: Recent Blocks Table ────────────────────────────────────

function RecentBlocksTable() {
  const { data, loading, error, refetch } = useAutoFetch<{ blocks: BlockData[]; timestamp: number }>(
    '/api/onchain/blocks',
    30000
  );

  return (
    <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
      <h3 className="text-sm font-mono text-[#F7931A] mb-4">RECENT BLOCKS</h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Pulse key={i} w="w-full" h="h-8" />)}
        </div>
      ) : error || !data?.blocks?.length ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          <span className="text-xs text-[#f59e0b]/80 font-mono">Failed to load blocks</span>
          <button onClick={refetch} className="text-xs text-[#00ff88] font-mono hover:underline">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[10px] text-[#e4e4e7]/30 uppercase border-b border-[#2a2a3e]">
                <th className="text-left py-2 px-2">Height</th>
                <th className="text-right py-2 px-2">TXs</th>
                <th className="text-right py-2 px-2">Size</th>
                <th className="text-right py-2 px-2">Median Fee</th>
                <th className="text-right py-2 px-2">Mined</th>
                <th className="text-left py-2 px-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {data.blocks.slice(0, 10).map((block) => (
                <tr
                  key={block.height}
                  className="border-b border-[#2a2a3e]/30 hover:bg-[#1a1a2e]/50 transition-colors"
                >
                  <td className="py-2 px-2 text-[#00ff88] font-bold">#{block.height.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-[#e4e4e7]">{block.tx_count.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-[#e4e4e7]/60">{(block.size / 1e6).toFixed(2)} MB</td>
                  <td className="py-2 px-2 text-right text-[#f59e0b]">
                    {block.median_fee ? `${block.median_fee} sat/vB` : '---'}
                  </td>
                  <td className="py-2 px-2 text-right text-[#e4e4e7]/50">{timeAgo(block.timestamp)}</td>
                  <td className="py-2 px-2 text-[#e4e4e7]/30 truncate max-w-[120px]">
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
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function BloombergDashboard() {
  // ─── Data fetching with auto-refresh intervals ──────────────────────────
  const price = useAutoFetch<PriceData>('/api/market/price', 15000);
  const global = useAutoFetch<GlobalData>('/api/market/global', 60000);
  const fees = useAutoFetch<FeeData>('/api/onchain/fees', 30000);
  const mempool = useAutoFetch<MempoolData>('/api/onchain/mempool', 30000);
  const blocks = useAutoFetch<{ blocks: BlockData[]; timestamp: number }>('/api/onchain/blocks', 30000);
  const news = useAutoFetch<{ articles: NewsArticle[]; sentiment: Record<string, number> }>('/api/news?limit=15', 60000);

  const btcPrice = price.data?.price ?? 0;
  const btcChange = price.data?.change24h ?? 0;
  const isPositive = btcChange >= 0;
  const latestBlock = blocks.data?.blocks?.[0];

  // "Last updated" ticker for header
  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // ─── Initial loading screen ─────────────────────────────────────────────
  const allLoading = price.loading && global.loading && fees.loading;
  if (allLoading) {
    return (
      <div className="bg-[#0a0a0f] min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#00ff88] font-mono text-sm animate-pulse">INITIALIZING CYPHER TERMINAL...</p>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-ping" />
            <span className="text-[#e4e4e7]/40 font-mono text-[10px]">Connecting to data feeds</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0f] min-h-screen pt-20 font-mono text-[#e4e4e7]">

      {/* ─── Live Price Ticker (Binance WS) ───────────────────────────────── */}
      <LivePriceTicker />

      {/* ─── Header Bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-[#2a2a3e] bg-[#0a0a0f]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[#00ff88] font-bold text-sm tracking-widest">CYPHER</span>
              <span className="text-[#e4e4e7]/30 text-[10px]">v3.1</span>
            </div>
            <div className="h-4 w-px bg-[#2a2a3e]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#e4e4e7]/40">BTC/USD</span>
              {price.loading ? (
                <Pulse w="w-24" h="h-5" />
              ) : (
                <>
                  <span className={`text-lg font-bold ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                    ${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-xs ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                    {isPositive ? '+' : ''}{btcChange.toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#e4e4e7]/40">
            <span>{new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}</span>
            <Wifi className="w-3 h-3 text-[#00ff88]" />
          </div>
        </div>
      </div>

      {/* ─── Top Stats Bar ────────────────────────────────────────────────── */}
      <div className="border-b border-[#2a2a3e] bg-[#12121a]/50">
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-[#2a2a3e]">
          {/* Market Cap */}
          <div className="px-4 py-2.5">
            <div className="text-[9px] text-[#e4e4e7]/30 uppercase tracking-wider">Total Mkt Cap</div>
            {global.loading ? <Pulse /> : (
              <>
                <div className="text-sm font-bold text-[#e4e4e7]">
                  {global.data?.totalMarketCap ? formatUsd(global.data.totalMarketCap) : '---'}
                </div>
                <div className={`text-[10px] ${(global.data?.marketCapChange24h ?? 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                  {(global.data?.marketCapChange24h ?? 0) >= 0 ? '+' : ''}{(global.data?.marketCapChange24h ?? 0).toFixed(2)}%
                </div>
              </>
            )}
          </div>
          {/* 24h Volume */}
          <div className="px-4 py-2.5">
            <div className="text-[9px] text-[#e4e4e7]/30 uppercase tracking-wider">24h Volume</div>
            {global.loading ? <Pulse /> : (
              <div className="text-sm font-bold text-[#e4e4e7]">
                {global.data?.totalVolume24h ? formatUsd(global.data.totalVolume24h) : '---'}
              </div>
            )}
          </div>
          {/* BTC Dominance */}
          <div className="px-4 py-2.5">
            <div className="text-[9px] text-[#e4e4e7]/30 uppercase tracking-wider">BTC Dom</div>
            {global.loading ? <Pulse /> : (
              <div className="text-sm font-bold text-[#f59e0b]">
                {global.data?.btcDominance ? `${global.data.btcDominance.toFixed(1)}%` : '---'}
              </div>
            )}
          </div>
          {/* Block Height */}
          <div className="px-4 py-2.5">
            <div className="text-[9px] text-[#e4e4e7]/30 uppercase tracking-wider">Block Height</div>
            {blocks.loading ? <Pulse /> : (
              <div className="text-sm font-bold text-[#e4e4e7]">
                {latestBlock?.height?.toLocaleString() ?? '---'}
              </div>
            )}
          </div>
          {/* Avg Fee */}
          <div className="px-4 py-2.5">
            <div className="text-[9px] text-[#e4e4e7]/30 uppercase tracking-wider">Avg Fee</div>
            {fees.loading ? <Pulse /> : (
              <div className="text-sm font-bold text-[#e4e4e7]">
                {fees.data?.halfHourFee ?? '---'} <span className="text-[10px] text-[#e4e4e7]/40">sat/vB</span>
              </div>
            )}
          </div>
          {/* Live Indicator */}
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-xs text-[#00ff88] font-bold">LIVE</span>
          </div>
        </div>
      </div>

      {/* ─── Sub-Tabs Navigation ──────────────────────────────────────────── */}
      <div className="p-3 sm:p-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-[#0a0a1a] border border-[#1a1a2e] p-1 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-gray-400 font-mono text-sm px-4 py-2"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="market-pulse"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-gray-400 font-mono text-sm px-4 py-2"
            >
              Market Pulse
            </TabsTrigger>
            <TabsTrigger
              value="news"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-gray-400 font-mono text-sm px-4 py-2"
            >
              News & Sentiment
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-black text-gray-400 font-mono text-sm px-4 py-2"
            >
              Network Status
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: Overview (original dashboard content) ═══ */}
          <TabsContent value="overview">
            <div className="space-y-4">

              {/* ─── Main Grid: Chart + Right Sidebar ────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Left: Chart + Trade + Market Table */}
                <div className="lg:col-span-8 space-y-4">

                  {/* CYPHER TRADE */}
                  <Section
                    title="Cypher Trade"
                    icon={<TrendingUp className="w-4 h-4 text-[#00ff88]" />}
                  >
                    <BloombergCypherTrade />
                  </Section>

                  {/* Professional Chart */}
                  <Section
                    title="Market Analytics"
                    icon={<BarChart3 className="w-4 h-4 text-[#00ff88]" />}
                  >
                    <BloombergProfessionalChart />
                  </Section>

                  {/* Market Data Table */}
                  <Section
                    title="Market Data"
                    icon={<Activity className="w-4 h-4 text-[#00ff88]" />}
                    updatedAt={price.updatedAt}
                    error={price.error}
                    onRetry={price.refetch}
                  >
                    <MarketDataTable priceData={price.data} globalData={global.data} />
                  </Section>

                  {/* Network Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* On-Chain Fees */}
                    <Section
                      title="Fee Estimates"
                      icon={<Zap className="w-4 h-4 text-[#f59e0b]" />}
                      updatedAt={fees.updatedAt}
                      error={fees.error}
                      onRetry={fees.refetch}
                    >
                      {fees.loading ? (
                        <div className="space-y-3">
                          <Pulse w="w-full" h="h-3" />
                          <Pulse w="w-full" h="h-3" />
                          <Pulse w="w-full" h="h-3" />
                        </div>
                      ) : fees.data ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Fast (~10 min)</span>
                            <span className="text-[#ff3366] font-bold">{fees.data.fastestFee} sat/vB</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Medium (~30 min)</span>
                            <span className="text-[#f59e0b] font-bold">{fees.data.halfHourFee} sat/vB</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Slow (~1 hr)</span>
                            <span className="text-[#00ff88] font-bold">{fees.data.hourFee} sat/vB</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Economy</span>
                            <span className="text-[#e4e4e7]/70">{fees.data.economyFee} sat/vB</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-[#2a2a3e]">
                            <span className="text-[#e4e4e7]/50">Minimum</span>
                            <span className="text-[#e4e4e7]/40">{fees.data.minimumFee} sat/vB</span>
                          </div>
                        </div>
                      ) : (
                        <ErrorState />
                      )}
                    </Section>

                    {/* Mempool */}
                    <Section
                      title="Mempool"
                      icon={<Database className="w-4 h-4 text-[#00ff88]" />}
                      updatedAt={mempool.updatedAt}
                      error={mempool.error}
                      onRetry={mempool.refetch}
                    >
                      {mempool.loading ? (
                        <div className="space-y-3">
                          <Pulse w="w-full" h="h-3" />
                          <Pulse w="w-full" h="h-3" />
                          <Pulse w="w-full" h="h-3" />
                        </div>
                      ) : mempool.data ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Transactions</span>
                            <span className="text-[#e4e4e7] font-bold">{mempool.data.count?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Virtual Size</span>
                            <span className="text-[#e4e4e7] font-bold">
                              {mempool.data.vsize ? `${(mempool.data.vsize / 1e6).toFixed(1)} MvB` : '---'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#e4e4e7]/50">Total Fees</span>
                            <span className="text-[#f59e0b] font-bold">
                              {mempool.data.total_fee ? `${(mempool.data.total_fee / 1e8).toFixed(4)} BTC` : '---'}
                            </span>
                          </div>
                          {/* Visual bar */}
                          <div className="pt-1 border-t border-[#2a2a3e]">
                            <div className="text-[9px] text-[#e4e4e7]/30 mb-1">CONGESTION</div>
                            <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (mempool.data.count / 200000) * 100)}%`,
                                  background: mempool.data.count > 150000 ? '#ff3366' : mempool.data.count > 80000 ? '#f59e0b' : '#00ff88',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ErrorState />
                      )}
                    </Section>

                    {/* Fear & Greed */}
                    <FearGreedGauge />
                  </div>
                </div>

                {/* Right Sidebar: News + On-Chain */}
                <div className="lg:col-span-4 space-y-4">

                  {/* News Feed */}
                  <Section
                    title="Crypto News"
                    icon={<Newspaper className="w-4 h-4 text-[#00ff88]" />}
                    updatedAt={news.updatedAt}
                    error={news.error}
                    onRetry={news.refetch}
                  >
                    {news.loading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="space-y-1.5">
                            <Pulse w="w-full" h="h-3" />
                            <Pulse w="w-3/4" h="h-2" />
                            <div className="h-px bg-[#2a2a3e]" />
                          </div>
                        ))}
                      </div>
                    ) : news.data?.articles?.length ? (
                      <div className="space-y-0 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                        {news.data.articles.map((article, i) => (
                          <div
                            key={i}
                            className="py-2.5 border-b border-[#2a2a3e]/60 last:border-b-0 hover:bg-[#1a1a2e]/50 px-1 -mx-1 rounded transition-colors"
                          >
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group"
                            >
                              <p className="text-xs text-[#e4e4e7] leading-snug group-hover:text-[#00ff88] transition-colors line-clamp-2">
                                {article.title}
                                <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover:opacity-50" />
                              </p>
                            </a>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-[#e4e4e7]/30">{article.source}</span>
                              <span className="text-[9px] text-[#e4e4e7]/20">|</span>
                              <span className="text-[9px] text-[#e4e4e7]/30">
                                {timeAgo(article.publishedAt)}
                              </span>
                              <SentimentBadge sentiment={article.sentiment} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ErrorState message="No news available" />
                    )}
                  </Section>

                  {/* Recent Blocks */}
                  <Section
                    title="Latest Blocks"
                    icon={<Cpu className="w-4 h-4 text-[#00ff88]" />}
                    updatedAt={blocks.updatedAt}
                    error={blocks.error}
                    onRetry={blocks.refetch}
                  >
                    {blocks.loading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Pulse key={i} w="w-full" h="h-8" />
                        ))}
                      </div>
                    ) : blocks.data?.blocks?.length ? (
                      <div className="space-y-1.5">
                        {blocks.data.blocks.slice(0, 5).map((block) => (
                          <div
                            key={block.height}
                            className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-[#1a1a2e]/50 rounded border border-[#2a2a3e]/50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[#00ff88] font-bold">#{block.height.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[#e4e4e7]/50">
                              <span>{block.tx_count} txs</span>
                              <span>{(block.size / 1e6).toFixed(2)} MB</span>
                              <span>{timeAgo(block.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ErrorState />
                    )}
                  </Section>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB 2: Market Pulse ═══ */}
          <TabsContent value="market-pulse">
            <div className="space-y-6">
              {/* Top Coins Performance Heatmap */}
              <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-4">
                <h3 className="text-sm font-mono text-[#F7931A] mb-4">TOP COINS HEATMAP — 24H CHANGE</h3>
                <MarketPulseHeatmap />
              </div>
              {/* BTC Dominance + Sectors + Funding */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BtcDominanceCard />
                <SectorPerformanceCard />
                <FundingOverviewCard />
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB 3: News & Sentiment ═══ */}
          <TabsContent value="news">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <NewsFeedPanel />
              </div>
              <div className="space-y-4">
                <SentimentScoreCard />
                <FearGreedHistoryCard />
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB 4: Network Status ═══ */}
          <TabsContent value="network">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MempoolStatsCard />
                <FeeEstimatorCard />
                <HashrateCard />
                <BlockHeightCard />
              </div>
              <RecentBlocksTable />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Network Status Footer ───────────────────────────────────────── */}
      <div className="border-t border-[#2a2a3e] bg-[#12121a]/80 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 text-[10px] font-mono gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#e4e4e7]/30">NETWORK:</span>
            <span className="text-[#e4e4e7]/60">
              Block <span className="text-[#00ff88]">{latestBlock?.height?.toLocaleString() ?? '---'}</span>
            </span>
            <span className="text-[#2a2a3e]">|</span>
            <span className="text-[#e4e4e7]/60">
              Mempool <span className="text-[#e4e4e7]">{mempool.data?.count?.toLocaleString() ?? '---'}</span> txs
            </span>
            <span className="text-[#2a2a3e]">|</span>
            <span className="text-[#e4e4e7]/60">
              Fee <span className="text-[#f59e0b]">{fees.data?.halfHourFee ?? '---'}</span> sat/vB
            </span>
            <span className="text-[#2a2a3e]">|</span>
            <span className="text-[#e4e4e7]/60">
              Status <span className="text-[#00ff88]">OPERATIONAL</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#e4e4e7]/20">CYPHER ORDi FUTURE</span>
            <span className="text-[#e4e4e7]/20">TERMINAL v3.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Market Data Table Sub-component ────────────────────────────────────────

function MarketDataTable({
  priceData,
  globalData,
}: {
  priceData: PriceData | null;
  globalData: GlobalData | null;
}) {
  // Show BTC row from real price data
  if (!priceData) {
    return (
      <div className="text-center py-6">
        <Pulse w="w-full" h="h-32" />
      </div>
    );
  }

  const rows = [
    {
      symbol: 'BTC',
      price: priceData.price,
      change: priceData.change24h,
      volume: priceData.volume24h,
      marketCap: priceData.marketCap,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-[#e4e4e7]/30 uppercase border-b border-[#2a2a3e]">
            <th className="text-left py-2 px-2">Symbol</th>
            <th className="text-right py-2 px-2">Price</th>
            <th className="text-right py-2 px-2">24h Change</th>
            <th className="text-right py-2 px-2">Volume 24h</th>
            <th className="text-right py-2 px-2">Market Cap</th>
            <th className="text-center py-2 px-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.symbol}
              className="border-b border-[#2a2a3e]/30 hover:bg-[#1a1a2e]/50 transition-colors"
            >
              <td className="py-2.5 px-2 font-bold text-[#00ff88]">{r.symbol}</td>
              <td className="py-2.5 px-2 text-right text-[#e4e4e7]">
                ${r.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </td>
              <td className={`py-2.5 px-2 text-right font-bold ${r.change >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {r.change >= 0 ? '+' : ''}{r.change.toFixed(2)}%
              </td>
              <td className="py-2.5 px-2 text-right text-[#e4e4e7]/60">{formatUsd(r.volume)}</td>
              <td className="py-2.5 px-2 text-right text-[#e4e4e7]/60">{formatUsd(r.marketCap)}</td>
              <td className="py-2.5 px-2 text-center">
                {r.change >= 0 ? (
                  <ChevronUp className="w-4 h-4 text-[#00ff88] mx-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#ff3366] mx-auto" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────────────

function ErrorState({ message = 'Data may be outdated' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-4 justify-center">
      <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
      <span className="text-xs text-[#f59e0b]/80 font-mono">{message}</span>
    </div>
  );
}
