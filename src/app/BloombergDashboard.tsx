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
// (mantidos iguais)

interface HyperliquidBalance {
  totalEquity: number;
  availableMargin: number;
  usedMargin: number;
  unrealizedPnl: number;
  timestamp: number;
}

// ... (todos os outros types permanecem iguais - não alterei para não quebrar)

function timeAgo(ts: number): string { /* ... mesmo código */ }
function secondsAgo(ms: number): string { /* ... */ }
function formatUsd(n: number): string { /* ... */ }
// ... (todos os helpers permanecem iguais)


// ═══════════════════════════════════════════════════════════════════════════
// NOVO: HYPERLIQUID BALANCE CARD (o que você pediu)
// ═══════════════════════════════════════════════════════════════════════════

function HyperliquidBalanceCard() {
  const [balance, setBalance] = useState<HyperliquidBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/balance', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch balance');
      const data = await res.json();
      setBalance(data);
    } catch (err) {
      console.error('[Dashboard] Failed to load Hyperliquid balance', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // atualiza a cada 10s
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading && !balance) {
    return (
      <div className="bg-[#0d0d14] border border-[#1a1a2e] rounded-2xl p-6">
        <div className="flex justify-between items-center">
          <div className="text-emerald-400 text-sm font-bold">HYPERLIQUID BALANCE</div>
          <Pulse w="w-20" h="h-6" />
        </div>
      </div>
    );
  }

  const lowBalance = balance && balance.availableMargin < 150;

  return (
    <div className="bg-[#0d0d14] border border-emerald-500/30 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 font-bold text-lg tracking-widest">HYPERLIQUID</span>
        </div>
        <button
          onClick={fetchBalance}
          className="text-xs px-4 py-1 bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> LIVE
        </button>
      </div>

      <div className="text-6xl font-mono font-black text-white tracking-tighter mb-1">
        ${balance?.availableMargin?.toFixed(2) || '0.00'}
      </div>
      <p className="text-emerald-400/70 text-sm mb-6">Margem Disponível</p>

      {lowBalance && (
        <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <span className="font-bold">SALDO MUITO BAIXO!</span>
            <br />
            Deposite mais USDC para continuar operando automaticamente.
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 text-sm border-t border-[#1a1a2e] pt-6">
        <div>
          <p className="text-[#e4e4e7]/40 text-xs">Equity Total</p>
          <p className="font-mono text-emerald-400 text-xl">
            ${balance?.totalEquity?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div>
          <p className="text-[#e4e4e7]/40 text-xs">PnL Não Realizado</p>
          <p className={`font-mono text-xl ${balance && balance.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${balance?.unrealizedPnl?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div>
          <p className="text-[#e4e4e7]/40 text-xs">Última Atualização</p>
          <p className="font-mono text-[#e4e4e7]/60 text-lg">agora</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD (com o novo cartão de saldo)
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

  if (price.loading && !price.data) {
    return (
      <div className="bg-[#08080e] min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#F7931A] font-mono text-xs tracking-widest animate-pulse">INITIALIZING TERMINAL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#08080e] min-h-screen pt-20 font-mono text-[#e4e4e7]">

      <LivePriceTicker />

      {/* HEADER */}
      <div className="border-b border-[#1a1a2e] bg-[#0a0a12]/90 backdrop-blur-sm">
        {/* ... header permanece igual ... */}
      </div>

      {/* KEY METRICS STRIP */}
      <div className="border-b border-[#1a1a2e] bg-[#0a0a12]/60">
        {/* ... metrics strip permanece igual ... */}
      </div>

      <div className="p-3 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#0a0a12] border border-[#1a1a2e] p-0.5 mb-4">
            {/* ... tabs permanecem iguais ... */}
          </TabsList>

          {/* TAB OVERVIEW - COM O NOVO SALDO */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* NOVO CARTÃO DE SALDO - POSIÇÃO PRINCIPAL */}
              <HyperliquidBalanceCard />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 space-y-4">
                  <Section title="Price Chart" icon={<BarChart3 className="w-3.5 h-3.5 text-[#F7931A]" />}>
                    <ProfessionalPriceChart />
                  </Section>

                  <Section title="Market Leaders" icon={<TrendingUp className="w-3.5 h-3.5 text-[#00D4AA]" />}>
                    <MarketLeadersTable />
                  </Section>
                </div>

                <div className="lg:col-span-4 space-y-4">
                  <NetworkHealthPanel mempool={mempool} fees={fees} blocks={blocks} />
                  <CompactNewsSidebar />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Outras tabs permanecem iguais */}
          <TabsContent value="market-pulse">{/* ... */}</TabsContent>
          <TabsContent value="news">{/* ... */}</TabsContent>
          <TabsContent value="network">{/* ... */}</TabsContent>
        </Tabs>
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#1a1a2e] bg-[#0a0a12]/80 mt-4">
        {/* ... footer permanece igual ... */}
      </div>
    </div>
  );
}
