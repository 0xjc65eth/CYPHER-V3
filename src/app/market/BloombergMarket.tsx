'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


// ─── Utility helpers ───────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(3)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${fmt(n)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function chgColor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'text-[#e4e4e7]';
  return n >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]';
}

function timeAgo(ts: number | string | null | undefined): string {
  if (!ts) return '—';
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function heatColor(v: number | null): string {
  if (v == null) return 'bg-[#1a1a2e]';
  const abs = Math.min(Math.abs(v), 20);
  const intensity = Math.floor(40 + (abs / 20) * 180);
  if (v >= 0) return `bg-[rgb(0,${intensity},0)]`;
  return `bg-[rgb(${intensity},0,0)]`;
}

// ─── Skeleton & Error components ───────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3e] rounded ${className}`} />;
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 text-sm font-mono text-[#ff3366]/80">
      <span className="text-lg">&#9888;&#65039;</span>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto text-xs text-[#00ff88] underline hover:no-underline">
          Retry
        </button>
      )}
    </div>
  );
}

function SectionHeader({ title, updated }: { title: string; updated?: number | null }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">{title}</h2>
      {updated && (
        <span className="text-[10px] text-[#e4e4e7]/30 font-mono">Updated {timeAgo(updated)}</span>
      )}
    </div>
  );
}

// ─── Custom fetch with error handling ──────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.error) return { data: null, error: data.error };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ─── Type definitions ──────────────────────────────────────────────────────────

interface PriceData {
  price: number; change24h: number; marketCap: number; volume24h: number; timestamp: number;
}
interface GlobalData {
  totalMarketCap: number | null; totalVolume24h: number | null; btcDominance: number | null;
  marketCapChange24h: number | null; activeCryptocurrencies: number | null; timestamp: number;
}
interface PerformanceData {
  currentPrice: number; performance: Record<string, number | null>; timestamp: number;
}
interface ExchangeEntry {
  exchange: string; price: number | null; volume24h: number | null;
  bid: number | null; ask: number | null; spread: number | null;
}
interface DerivativesData {
  fundingRate: number | null; predictedFunding: number | null; openInterest: number | null;
  oiChange24h: number | null; longShortRatio: number | null; topTraderRatio: number | null;
  liquidations24h: number | null; timestamp: number;
}
interface SupplyData {
  circulatingSupply: number | null; maxSupply: number; minedPercentage: number | null;
  blockHeight: number | null; blockReward: number; blocksUntilHalving: number | null;
  estimatedHalvingDate: string | null; annualIssuance: number; inflationRate: number | null;
  currentPrice: number | null; timestamp: number;
}
interface OrderBookData {
  bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[];
  spread: number | null; spreadPercent: number | null; totalBidVolume: number;
  totalAskVolume: number; bidAskRatio: number | null; timestamp: number;
}
interface FearGreedData {
  current: { value: number; classification: string } | null;
  history: { value: number; classification: string; date: string }[];
  timestamp: number;
}
interface WhaleData {
  transactions: {
    hash: string; time: string; inputTotal: number | null; outputTotal: number | null;
    fee: number | null; blockId: number | null;
  }[];
  timestamp: number;
}
interface CorrelationData {
  correlations: Record<string, { value: number | null; note?: string }>;
  fearGreed: { current: { value: number; classification: string } | null; history: { value: number; classification: string; date: string }[] };
  timestamp: number;
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function BloombergMarketPage() {
  // State for each section
  const [price, setPrice] = useState<{ data: PriceData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [global, setGlobal] = useState<{ data: GlobalData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [perf, setPerf] = useState<{ data: PerformanceData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [exchanges, setExchanges] = useState<{ data: ExchangeEntry[] | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [derivatives, setDerivatives] = useState<{ data: DerivativesData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [supply, setSupply] = useState<{ data: SupplyData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [orderbook, setOrderbook] = useState<{ data: OrderBookData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [fearGreed, setFearGreed] = useState<{ data: FearGreedData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [whales, setWhales] = useState<{ data: WhaleData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [correlations, setCorrelations] = useState<{ data: CorrelationData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });

  const [exchangeSort, setExchangeSort] = useState<{ col: string; asc: boolean }>({ col: 'volume24h', asc: false });

  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  // Fetch helpers
  const fetchPrice = useCallback(async () => {
    const r = await apiFetch<PriceData>('/api/market/price');
    setPrice({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchGlobal = useCallback(async () => {
    const r = await apiFetch<GlobalData>('/api/market/global');
    setGlobal({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchPerf = useCallback(async () => {
    const r = await apiFetch<PerformanceData>('/api/market/performance');
    setPerf({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchExchanges = useCallback(async () => {
    const r = await apiFetch<{ exchanges: ExchangeEntry[] }>('/api/market/exchanges');
    setExchanges({ data: r.data?.exchanges ?? null, error: r.error, loading: false });
  }, []);

  const fetchDerivatives = useCallback(async () => {
    const r = await apiFetch<DerivativesData>('/api/market/derivatives');
    setDerivatives({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchSupply = useCallback(async () => {
    const r = await apiFetch<SupplyData>('/api/market/supply');
    setSupply({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchOrderbook = useCallback(async () => {
    const r = await apiFetch<OrderBookData>('/api/market/orderbook?limit=20');
    setOrderbook({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchFearGreed = useCallback(async () => {
    const r = await apiFetch<FearGreedData>('/api/market/fear-greed');
    setFearGreed({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchWhales = useCallback(async () => {
    const r = await apiFetch<WhaleData>('/api/market/whales');
    setWhales({ data: r.data, error: r.error, loading: false });
  }, []);

  const fetchCorrelations = useCallback(async () => {
    const r = await apiFetch<CorrelationData>('/api/market/correlations');
    setCorrelations({ data: r.data, error: r.error, loading: false });
  }, []);

  useEffect(() => {
    // Initial fetch all
    fetchPrice(); fetchGlobal(); fetchPerf(); fetchExchanges();
    fetchDerivatives(); fetchSupply(); fetchOrderbook();
    fetchFearGreed(); fetchWhales(); fetchCorrelations();

    // Set up intervals per spec - CoinGecko rate limit: all increased to 60s minimum
    const ids = [
      setInterval(fetchPrice, 60000),
      setInterval(fetchOrderbook, 60000),
      setInterval(fetchExchanges, 60000),
      setInterval(fetchDerivatives, 60000),
      setInterval(fetchGlobal, 60000),
      setInterval(fetchPerf, 60000),
      setInterval(fetchSupply, 60000),
      setInterval(fetchWhales, 60000),
      setInterval(fetchFearGreed, 300000),
      setInterval(fetchCorrelations, 300000),
    ];
    intervalsRef.current = ids;
    return () => ids.forEach(clearInterval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived
  const p = price.data;
  const g = global.data;
  const s = supply.data;

  // Exchange sorting
  const sortedExchanges = exchanges.data
    ? [...exchanges.data].sort((a, b) => {
        const av = (a as Record<string, unknown>)[exchangeSort.col] as number | null;
        const bv = (b as Record<string, unknown>)[exchangeSort.col] as number | null;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return exchangeSort.asc ? av - bv : bv - av;
      })
    : null;

  const bestBid = exchanges.data ? Math.max(...exchanges.data.filter(e => e.bid != null).map(e => e.bid!)) : null;
  const bestAsk = exchanges.data ? Math.min(...exchanges.data.filter(e => e.ask != null).map(e => e.ask!)) : null;

  const toggleSort = (col: string) => {
    setExchangeSort(prev => ({ col, asc: prev.col === col ? !prev.asc : false }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e4e4e7] font-mono">
      {/* Status bar */}
      <div className="border-b border-[#1a1a2e] px-4 py-1.5 flex items-center justify-between text-[10px] text-[#e4e4e7]/40">
        <div className="flex items-center gap-4">
          <span className="text-[#00ff88] font-bold">CYPHER MARKET TERMINAL</span>
          <span>BTC/USD</span>
          <span>BINANCE SPOT</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1 ${price.loading ? 'text-yellow-500' : price.error ? 'text-[#ff3366]' : 'text-[#00ff88]'}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
            {price.loading ? 'CONNECTING' : price.error ? 'ERROR' : 'LIVE'}
          </span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="border-b border-[#1a1a2e] px-4">
          <TabsList className="bg-transparent border-0 p-0 h-auto">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
              Overview
            </TabsTrigger>
            <TabsTrigger value="exchanges" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
              Exchanges
            </TabsTrigger>
            <TabsTrigger value="orderbook" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
              Order Book
            </TabsTrigger>
            <TabsTrigger value="derivatives" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
              Derivatives
            </TabsTrigger>
            <TabsTrigger value="supply" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
              Supply &amp; Halving
            </TabsTrigger>
            <TabsTrigger value="whales" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
              Whale Tracker
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ TAB: OVERVIEW ═══ */}
        <TabsContent value="overview" className="px-4">
          <div className="space-y-4 max-w-[1800px] mx-auto py-4">

            {/* Price Hero */}
            <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-6">
              {price.loading ? (
                <SectionSkeleton rows={2} />
              ) : price.error ? (
                <ErrorState message={price.error} onRetry={fetchPrice} />
              ) : p ? (
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-[10px] text-[#e4e4e7]/40 mb-1">BITCOIN / USD</div>
                    <div className="text-5xl font-bold tracking-tight" style={{ textShadow: '0 0 30px rgba(0,255,136,0.15)' }}>
                      ${fmt(p.price)}
                    </div>
                    <div className={`text-xl mt-1 font-bold ${chgColor(p.change24h)}`}>
                      {fmtPct(p.change24h)} <span className="text-sm font-normal text-[#e4e4e7]/40">24h</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <div className="text-[10px] text-[#e4e4e7]/40">MARKET CAP</div>
                      <div className="font-bold">{fmtCompact(p.marketCap)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#e4e4e7]/40">VOLUME 24H</div>
                      <div className="font-bold">{fmtCompact(p.volume24h)}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Market Overview Grid */}
            <div>
              <SectionHeader title="Market Overview" updated={g?.timestamp} />
              {global.loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : global.error ? (
                <ErrorState message={global.error} onRetry={fetchGlobal} />
              ) : g ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MetricCard label="Market Cap" value={fmtCompact(g.totalMarketCap)} sub={fmtPct(g.marketCapChange24h)} subColor={chgColor(g.marketCapChange24h)} />
                  <MetricCard label="Volume 24h" value={fmtCompact(g.totalVolume24h)} sub={g.totalMarketCap && g.totalVolume24h ? `${((g.totalVolume24h / g.totalMarketCap) * 100).toFixed(2)}% of MCap` : ''} />
                  <MetricCard label="BTC Dominance" value={g.btcDominance != null ? `${g.btcDominance.toFixed(1)}%` : '—'} sub="of total MCap" />
                  <MetricCard
                    label="Circulating Supply"
                    value={s?.circulatingSupply ? `${(s.circulatingSupply / 1e6).toFixed(2)}M` : '—'}
                    sub={s?.minedPercentage ? `${s.minedPercentage.toFixed(1)}% of 21M` : ''}
                    progress={s?.minedPercentage ? s.minedPercentage / 100 : undefined}
                  />
                  <MetricCard label="Active Cryptos" value={g.activeCryptocurrencies?.toLocaleString() ?? '—'} sub="tracked" />
                  <MetricCard
                    label="Vol / MCap Ratio"
                    value={g.totalMarketCap && g.totalVolume24h ? ((g.totalVolume24h / g.totalMarketCap) * 100).toFixed(3) + '%' : '—'}
                    sub="liquidity indicator"
                  />
                </div>
              ) : null}
            </div>

            {/* Performance Heatmap */}
            <div>
              <SectionHeader title="Performance Heatmap" updated={perf.data?.timestamp} />
              {perf.loading ? (
                <Skeleton className="h-16 w-full" />
              ) : perf.error ? (
                <ErrorState message={perf.error} onRetry={fetchPerf} />
              ) : perf.data ? (
                <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
                  <div className="grid grid-cols-8 gap-2">
                    {['1h', '24h', '7d', '14d', '30d', '90d', '1y', 'ytd'].map(period => {
                      const v = perf.data!.performance[period];
                      return (
                        <div key={period} className={`${heatColor(v ?? null)} rounded p-3 text-center transition-colors`}>
                          <div className="text-[10px] text-[#e4e4e7]/60 uppercase">{period === 'ytd' ? 'YTD' : period}</div>
                          <div className={`text-sm font-bold ${v != null && v >= 0 ? 'text-[#e4e4e7]' : 'text-[#e4e4e7]'}`}>
                            {v != null ? fmtPct(v) : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Fear & Greed Index */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <SectionHeader title="Fear & Greed Index" updated={fearGreed.data?.timestamp} />
                {fearGreed.loading ? (
                  <SectionSkeleton rows={3} />
                ) : fearGreed.error ? (
                  <ErrorState message={fearGreed.error} onRetry={fetchFearGreed} />
                ) : fearGreed.data?.current ? (
                  <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5">
                    {(() => {
                      const fg = fearGreed.data!;
                      const v = fg.current!.value;
                      const gaugeColor = v <= 25 ? '#ff3366' : v <= 45 ? '#ff8833' : v <= 55 ? '#ffcc00' : v <= 75 ? '#88cc00' : '#00ff88';
                      return (
                        <>
                          <div className="flex flex-col items-center mb-4">
                            <div className="relative w-32 h-16 overflow-hidden">
                              <div className="absolute w-32 h-32 rounded-full border-8 border-[#2a2a3e]" style={{ borderTopColor: '#ff3366', borderRightColor: '#ffcc00', borderBottomColor: 'transparent', borderLeftColor: '#00ff88' }} />
                              <div className="absolute bottom-0 left-1/2 w-0.5 h-14 origin-bottom transition-transform" style={{ backgroundColor: gaugeColor, transform: `translateX(-50%) rotate(${(v / 100) * 180 - 90}deg)` }} />
                            </div>
                            <div className="text-3xl font-bold mt-2" style={{ color: gaugeColor, textShadow: `0 0 20px ${gaugeColor}40` }}>{v}</div>
                            <div className="text-sm text-[#e4e4e7]/60">{fg.current!.classification}</div>
                          </div>
                          <div className="text-[10px] text-[#e4e4e7]/40 mb-1">10-DAY HISTORY</div>
                          <div className="flex items-end gap-1 h-12">
                            {[...fg.history].reverse().map((h, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center">
                                <div
                                  className="w-full rounded-sm transition-all"
                                  style={{
                                    height: `${(h.value / 100) * 48}px`,
                                    backgroundColor: h.value <= 25 ? '#ff3366' : h.value <= 45 ? '#ff8833' : h.value <= 55 ? '#ffcc00' : h.value <= 75 ? '#88cc00' : '#00ff88',
                                    opacity: 0.6 + (i / fg.history.length) * 0.4,
                                  }}
                                />
                                <span className="text-[8px] text-[#e4e4e7]/20 mt-0.5">{h.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              {/* Correlations & Sentiment */}
              <div>
                <SectionHeader title="Correlations & Sentiment" updated={correlations.data?.timestamp} />
                {correlations.loading ? (
                  <SectionSkeleton rows={4} />
                ) : correlations.error ? (
                  <ErrorState message={correlations.error} onRetry={fetchCorrelations} />
                ) : correlations.data ? (
                  <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 space-y-4">
                    {(() => {
                      const c = correlations.data!;
                      const fgCurrent = c.fearGreed?.current;
                      return (
                        <>
                          {fgCurrent && (
                            <div className="text-center pb-3 border-b border-[#2a2a3e]">
                              <div className="text-[10px] text-[#e4e4e7]/40">FEAR & GREED (PRIMARY)</div>
                              <div className="text-3xl font-bold" style={{
                                color: fgCurrent.value <= 25 ? '#ff3366' : fgCurrent.value <= 50 ? '#ffcc00' : '#00ff88',
                              }}>
                                {fgCurrent.value}
                              </div>
                              <div className="text-xs text-[#e4e4e7]/60">{fgCurrent.classification}</div>
                            </div>
                          )}
                          <div className="text-[10px] text-[#e4e4e7]/40 mb-2">BTC vs TRADITIONAL ASSETS</div>
                          {Object.entries(c.correlations).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center text-sm">
                              <span className="text-[#e4e4e7]/60 uppercase">{key}</span>
                              {val.value != null ? (
                                <span className={val.value >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}>
                                  {val.value.toFixed(3)}
                                </span>
                              ) : (
                                <span className="text-[#e4e4e7]/20 text-[10px]">{val.note || 'N/A'}</span>
                              )}
                            </div>
                          ))}
                          {c.fearGreed?.history && c.fearGreed.history.length > 0 && (
                            <div className="pt-3 border-t border-[#2a2a3e]">
                              <div className="text-[10px] text-[#e4e4e7]/40 mb-1">30-DAY F&G</div>
                              <div className="flex items-end gap-0.5 h-10">
                                {[...c.fearGreed.history].reverse().map((h, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 rounded-sm"
                                    style={{
                                      height: `${(h.value / 100) * 40}px`,
                                      backgroundColor: h.value <= 25 ? '#ff3366' : h.value <= 50 ? '#ffcc00' : '#00ff88',
                                      opacity: 0.4 + (i / c.fearGreed.history.length) * 0.6,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB: EXCHANGES ═══ */}
        <TabsContent value="exchanges" className="px-4">
          <div className="space-y-4 max-w-[1800px] mx-auto py-4">
            <SectionHeader title="Exchange Comparison" updated={exchanges.data ? Date.now() : null} />
            {exchanges.loading ? (
              <SectionSkeleton rows={8} />
            ) : exchanges.error ? (
              <ErrorState message={exchanges.error} onRetry={fetchExchanges} />
            ) : sortedExchanges ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-[#e4e4e7]/40 border-b border-[#2a2a3e]">
                        {[
                          { key: 'exchange', label: 'EXCHANGE', align: 'left' },
                          { key: 'price', label: 'PRICE', align: 'right' },
                          { key: 'bid', label: 'BID', align: 'right' },
                          { key: 'ask', label: 'ASK', align: 'right' },
                          { key: 'spread', label: 'SPREAD', align: 'right' },
                          { key: 'volume24h', label: 'VOLUME 24H', align: 'right' },
                        ].map(col => (
                          <th
                            key={col.key}
                            onClick={() => col.key !== 'exchange' && toggleSort(col.key)}
                            className={`px-4 py-3 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.key !== 'exchange' ? 'cursor-pointer hover:text-[#00ff88]' : ''} ${exchangeSort.col === col.key ? 'text-[#00ff88]' : ''}`}
                          >
                            {col.label} {exchangeSort.col === col.key ? (exchangeSort.asc ? '\u25B2' : '\u25BC') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExchanges.map(ex => (
                        <tr key={ex.exchange} className="border-b border-[#2a2a3e]/50 hover:bg-[#2a2a3e]/30">
                          <td className="px-4 py-3 font-bold text-[#e4e4e7]">{ex.exchange}</td>
                          <td className="px-4 py-3 text-right">{ex.price != null ? `$${fmt(ex.price)}` : '—'}</td>
                          <td className={`px-4 py-3 text-right ${ex.bid != null && ex.bid === bestBid ? 'text-[#00ff88] font-bold' : ''}`}>
                            {ex.bid != null ? `$${fmt(ex.bid)}` : '—'}
                          </td>
                          <td className={`px-4 py-3 text-right ${ex.ask != null && ex.ask === bestAsk ? 'text-[#ff3366] font-bold' : ''}`}>
                            {ex.ask != null ? `$${fmt(ex.ask)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-[#e4e4e7]/60">
                            {ex.spread != null ? `$${fmt(ex.spread)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">{ex.volume24h != null ? fmtCompact(ex.volume24h) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bestBid != null && bestAsk != null && (
                  <div className="px-4 py-2 border-t border-[#2a2a3e] text-[10px] text-[#e4e4e7]/40 flex justify-between">
                    <span>Best Bid: <span className="text-[#00ff88]">${fmt(bestBid)}</span></span>
                    <span>Best Ask: <span className="text-[#ff3366]">${fmt(bestAsk)}</span></span>
                    <span>Cross-Exchange Spread: <span className="text-[#e4e4e7]">${fmt(bestAsk - bestBid)}</span></span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ═══ TAB: ORDER BOOK ═══ */}
        <TabsContent value="orderbook" className="px-4">
          <div className="space-y-4 max-w-[1800px] mx-auto py-4">
            <SectionHeader title="Market Depth" updated={orderbook.data?.timestamp} />
            {orderbook.loading ? (
              <Skeleton className="h-48 w-full" />
            ) : orderbook.error ? (
              <ErrorState message={orderbook.error} onRetry={fetchOrderbook} />
            ) : orderbook.data ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5">
                {(() => {
                  const ob = orderbook.data!;
                  const bids = ob.bids.slice(0, 20);
                  const asks = ob.asks.slice(0, 20);
                  const maxQty = Math.max(
                    ...bids.map(b => b.quantity),
                    ...asks.map(a => a.quantity),
                    0.001
                  );

                  let cumBid = 0;
                  const bidCum = bids.map(b => { cumBid += b.quantity; return cumBid; });
                  let cumAsk = 0;
                  const askCum = asks.map(a => { cumAsk += a.quantity; return cumAsk; });
                  const maxCum = Math.max(cumBid, cumAsk, 0.001);

                  return (
                    <>
                      <div className="flex items-center justify-center gap-6 mb-4 text-xs">
                        <span className="text-[#e4e4e7]/40">Spread: <span className="text-[#e4e4e7] font-bold">${fmt(ob.spread ?? 0)}</span></span>
                        <span className="text-[#e4e4e7]/40">Spread %: <span className="text-[#e4e4e7] font-bold">{ob.spreadPercent != null ? `${ob.spreadPercent.toFixed(4)}%` : '—'}</span></span>
                        <span className="text-[#e4e4e7]/40">Bid Vol: <span className="text-[#00ff88]">{fmt(ob.totalBidVolume, 3)} BTC</span></span>
                        <span className="text-[#e4e4e7]/40">Ask Vol: <span className="text-[#ff3366]">{fmt(ob.totalAskVolume, 3)} BTC</span></span>
                        <span className="text-[#e4e4e7]/40">Ratio: <span className="text-[#e4e4e7]">{ob.bidAskRatio != null ? ob.bidAskRatio.toFixed(3) : '—'}</span></span>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <div className="space-y-0.5">
                          <div className="grid grid-cols-3 text-[9px] text-[#e4e4e7]/30 px-1 mb-1">
                            <span>CUM. QTY</span>
                            <span className="text-right">QTY (BTC)</span>
                            <span className="text-right">BID PRICE</span>
                          </div>
                          {[...bids].reverse().map((b, i) => {
                            const ri = bids.length - 1 - i;
                            const pct = (bidCum[ri] / maxCum) * 100;
                            return (
                              <div key={i} className="relative h-5 flex items-center">
                                <div className="absolute right-0 top-0 h-full bg-[#00ff88]/10 rounded-l" style={{ width: `${pct}%` }} />
                                <div className="relative z-10 w-full grid grid-cols-3 text-[10px] px-1">
                                  <span className="text-[#e4e4e7]/30">{bidCum[ri].toFixed(3)}</span>
                                  <span className="text-right text-[#00ff88]/80">{b.quantity.toFixed(4)}</span>
                                  <span className="text-right text-[#00ff88] font-bold">{fmt(b.price)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-0.5">
                          <div className="grid grid-cols-3 text-[9px] text-[#e4e4e7]/30 px-1 mb-1">
                            <span>ASK PRICE</span>
                            <span>QTY (BTC)</span>
                            <span className="text-right">CUM. QTY</span>
                          </div>
                          {asks.map((a, i) => {
                            const pct = (askCum[i] / maxCum) * 100;
                            return (
                              <div key={i} className="relative h-5 flex items-center">
                                <div className="absolute left-0 top-0 h-full bg-[#ff3366]/10 rounded-r" style={{ width: `${pct}%` }} />
                                <div className="relative z-10 w-full grid grid-cols-3 text-[10px] px-1">
                                  <span className="text-[#ff3366] font-bold">{fmt(a.price)}</span>
                                  <span className="text-[#ff3366]/80">{a.quantity.toFixed(4)}</span>
                                  <span className="text-right text-[#e4e4e7]/30">{askCum[i].toFixed(3)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ═══ TAB: DERIVATIVES ═══ */}
        <TabsContent value="derivatives" className="px-4">
          <div className="space-y-4 max-w-[1800px] mx-auto py-4">
            <SectionHeader title="Derivatives Dashboard" updated={derivatives.data?.timestamp} />
            {derivatives.loading ? (
              <SectionSkeleton rows={4} />
            ) : derivatives.error ? (
              <ErrorState message={derivatives.error} onRetry={fetchDerivatives} />
            ) : derivatives.data ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 space-y-5">
                {(() => {
                  const d = derivatives.data!;
                  const annualized = d.fundingRate != null ? d.fundingRate * 3 * 365 * 100 : null;
                  const lsLong = d.longShortRatio != null ? (d.longShortRatio / (1 + d.longShortRatio)) * 100 : null;
                  const lsShort = lsLong != null ? 100 - lsLong : null;
                  const topLong = d.topTraderRatio != null ? (d.topTraderRatio / (1 + d.topTraderRatio)) * 100 : null;
                  const topShort = topLong != null ? 100 - topLong : null;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">FUNDING RATE</div>
                          <div className={`text-2xl font-bold ${d.fundingRate != null ? (d.fundingRate >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]') : ''}`}>
                            {d.fundingRate != null ? `${(d.fundingRate * 100).toFixed(4)}%` : '—'}
                          </div>
                          <div className="text-[10px] text-[#e4e4e7]/40">
                            Annualized: {annualized != null ? `${annualized.toFixed(2)}%` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">OPEN INTEREST</div>
                          <div className="text-2xl font-bold">
                            {d.openInterest != null ? `${fmt(d.openInterest, 0)} BTC` : '—'}
                          </div>
                          <div className={`text-[10px] ${chgColor(d.oiChange24h)}`}>
                            {d.oiChange24h != null ? `24h: ${fmtPct(d.oiChange24h)}` : ''}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-[#e4e4e7]/40 mb-2">LONG / SHORT RATIO {d.longShortRatio != null ? `(${d.longShortRatio.toFixed(2)})` : ''}</div>
                        {lsLong != null && lsShort != null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#00ff88] w-12 text-right">{lsLong.toFixed(1)}%</span>
                            <div className="flex-1 h-4 rounded overflow-hidden flex">
                              <div className="bg-[#00ff88]/60 h-full" style={{ width: `${lsLong}%` }} />
                              <div className="bg-[#ff3366]/60 h-full" style={{ width: `${lsShort}%` }} />
                            </div>
                            <span className="text-[10px] text-[#ff3366] w-12">{lsShort.toFixed(1)}%</span>
                          </div>
                        ) : <div className="text-sm text-[#e4e4e7]/30">—</div>}
                      </div>

                      <div>
                        <div className="text-[10px] text-[#e4e4e7]/40 mb-2">TOP TRADER L/S {d.topTraderRatio != null ? `(${d.topTraderRatio.toFixed(2)})` : ''}</div>
                        {topLong != null && topShort != null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#00ff88] w-12 text-right">{topLong.toFixed(1)}%</span>
                            <div className="flex-1 h-4 rounded overflow-hidden flex">
                              <div className="bg-[#00ff88]/40 h-full" style={{ width: `${topLong}%` }} />
                              <div className="bg-[#ff3366]/40 h-full" style={{ width: `${topShort}%` }} />
                            </div>
                            <span className="text-[10px] text-[#ff3366] w-12">{topShort.toFixed(1)}%</span>
                          </div>
                        ) : <div className="text-sm text-[#e4e4e7]/30">—</div>}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ═══ TAB: SUPPLY & HALVING ═══ */}
        <TabsContent value="supply" className="px-4">
          <div className="space-y-4 max-w-[1800px] mx-auto py-4">
            <SectionHeader title="Supply & Halving Tracker" updated={supply.data?.timestamp} />
            {supply.loading ? (
              <SectionSkeleton rows={5} />
            ) : supply.error ? (
              <ErrorState message={supply.error} onRetry={fetchSupply} />
            ) : supply.data ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-5 space-y-4">
                {(() => {
                  const sv = supply.data!;
                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-[10px] text-[#e4e4e7]/40 mb-1">
                          <span>CIRCULATING SUPPLY</span>
                          <span>{sv.circulatingSupply ? `${(sv.circulatingSupply / 1e6).toFixed(2)}M / 21M` : '—'}</span>
                        </div>
                        <div className="w-full h-5 bg-[#2a2a3e] rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00ff88]/80 to-[#00ff88] rounded transition-all"
                            style={{ width: `${sv.minedPercentage ?? 0}%` }}
                          />
                        </div>
                        <div className="text-right text-[10px] text-[#00ff88] mt-1">{sv.minedPercentage != null ? `${sv.minedPercentage.toFixed(2)}% mined` : ''}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">BLOCK REWARD</div>
                          <div className="font-bold text-lg">{sv.blockReward} BTC</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">BLOCK HEIGHT</div>
                          <div className="font-bold text-lg">{sv.blockHeight?.toLocaleString() ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">BLOCKS UNTIL HALVING</div>
                          <div className="font-bold text-lg text-[#00ff88]">{sv.blocksUntilHalving?.toLocaleString() ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">EST. HALVING DATE</div>
                          <div className="font-bold text-lg">{sv.estimatedHalvingDate ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">INFLATION RATE</div>
                          <div className="font-bold text-lg">{sv.inflationRate != null ? `${sv.inflationRate.toFixed(2)}%` : '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#e4e4e7]/40">ANNUAL ISSUANCE</div>
                          <div className="font-bold text-lg">{fmt(sv.annualIssuance, 0)} BTC</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ═══ TAB: WHALE TRACKER ═══ */}
        <TabsContent value="whales" className="px-4">
          <div className="space-y-4 max-w-[1800px] mx-auto py-4">
            <SectionHeader title="Whale Alerts" updated={whales.data?.timestamp} />
            {whales.loading ? (
              <SectionSkeleton rows={5} />
            ) : whales.error ? (
              <ErrorState message={whales.error} onRetry={fetchWhales} />
            ) : whales.data ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {whales.data.transactions.length === 0 ? (
                  <div className="text-sm text-[#e4e4e7]/30 text-center py-4">No recent whale transactions</div>
                ) : (
                  whales.data.transactions.map((tx, i) => {
                    const amt = tx.outputTotal ?? tx.inputTotal;
                    const usdVal = amt && price.data?.price ? amt * price.data.price : null;
                    return (
                      <div key={tx.hash || i} className="border-b border-[#2a2a3e]/50 pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{'\uD83D\uDC0B'}</span>
                          <span className="text-sm font-bold text-[#e4e4e7]">
                            {amt != null ? `${fmt(amt, 2)} BTC` : '—'}
                          </span>
                          {usdVal != null && (
                            <span className="text-[10px] text-[#e4e4e7]/40">({fmtCompact(usdVal)})</span>
                          )}
                          <span className="ml-auto text-[10px] text-[#e4e4e7]/30">{timeAgo(tx.time)}</span>
                        </div>
                        <div className="text-[10px] text-[#e4e4e7]/30 truncate">
                          {tx.hash ? `${tx.hash.slice(0, 16)}...${tx.hash.slice(-8)}` : '—'}
                          {tx.blockId ? ` \u00B7 Block #${tx.blockId.toLocaleString()}` : ''}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-[10px] text-[#e4e4e7]/20 py-4 border-t border-[#1a1a2e] px-4">
        CYPHER MARKET TERMINAL &mdash; Data from CoinGecko, Binance, Blockchair, Alternative.me &mdash; Not financial advice
      </div>
    </div>
  );
}

// ─── Reusable metric card ──────────────────────────────────────────────────────

function MetricCard({ label, value, sub, subColor, progress }: {
  label: string; value: string; sub?: string; subColor?: string; progress?: number;
}) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      <div className="text-[10px] text-[#e4e4e7]/40 mb-1">{label.toUpperCase()}</div>
      <div className="text-lg font-bold" style={{ textShadow: '0 0 10px rgba(0,255,136,0.1)' }}>{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${subColor || 'text-[#e4e4e7]/40'}`}>{sub}</div>}
      {progress != null && (
        <div className="w-full h-1 bg-[#2a2a3e] rounded mt-2">
          <div className="h-full bg-[#00ff88]/60 rounded transition-all" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
