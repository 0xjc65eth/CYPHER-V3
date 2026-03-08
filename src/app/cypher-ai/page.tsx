'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { CypherAIInterface } from '@/components/ai/CypherAIInterface';
import { Zap, Radio, Brain, BarChart3 } from 'lucide-react';

const PanelSkeleton = () => (
  <div className="animate-pulse space-y-2 p-3">
    <div className="h-4 bg-[#1a1a2e] rounded w-3/4" />
    <div className="h-8 bg-[#1a1a2e] rounded" />
    <div className="h-4 bg-[#1a1a2e] rounded w-1/2" />
  </div>
);

const AIInsightsPanel = dynamic(() => import('@/components/ai/AIInsightsPanel').then(m => ({ default: m.AIInsightsPanel })), { ssr: false, loading: PanelSkeleton });
const TradingSignalsPanel = dynamic(() => import('@/components/ai/TradingSignalsPanel').then(m => ({ default: m.TradingSignalsPanel })), { ssr: false, loading: PanelSkeleton });
const SentimentAnalysisPanel = dynamic(() => import('@/components/ai/SentimentAnalysisPanel').then(m => ({ default: m.SentimentAnalysisPanel })), { ssr: false, loading: PanelSkeleton });
const NeuralPricePredictor = dynamic(() => import('@/components/ai/NeuralPricePredictor').then(m => ({ default: m.NeuralPricePredictor })), { ssr: false, loading: PanelSkeleton });
const BacktestingPanel = dynamic(() => import('@/components/ai/BacktestingPanel'), { ssr: false, loading: PanelSkeleton });
const PerformanceMetrics = dynamic(() => import('@/components/ai/PerformanceMetrics').then(m => ({ default: m.PerformanceMetrics })), { ssr: false, loading: PanelSkeleton });
const AIStatusCard = dynamic(() => import('@/components/ai/AIStatusCard').then(m => ({ default: m.AIStatusCard })), { ssr: false, loading: PanelSkeleton });
import { PremiumContent } from '@/components/premium-content';

const AGENT_ROSTER = [
  { name: 'Alpha', icon: '\u{1F4C8}', color: '#00ff88', desc: 'Markets' },
  { name: 'Satoshi', icon: '\u{26D3}\u{FE0F}', color: '#3b82f6', desc: 'On-Chain' },
  { name: 'Inscriber', icon: '\u{1F536}', color: '#f59e0b', desc: 'Ordinals' },
  { name: 'Macro', icon: '\u{1F30D}', color: '#8b5cf6', desc: 'Economics' },
  { name: 'DeFi', icon: '\u{26A1}', color: '#06b6d4', desc: 'DeFi' },
  { name: 'Guardian', icon: '\u{1F6E1}\u{FE0F}', color: '#ef4444', desc: 'Risk' },
  { name: 'Pulse', icon: '\u{1F493}', color: '#ec4899', desc: 'Sentiment' },
  { name: 'Quant', icon: '\u{1F522}', color: '#14b8a6', desc: 'Quant' },
];

type AnalysisMode = 'realtime' | 'deep' | 'predictive';
type BottomTab = 'backtesting' | 'performance';

interface AgentStatus {
  isActive: boolean;
  accuracy: number;
  totalTrades: number;
  profitability: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface PerformanceDay {
  date: string;
  profit: number;
  trades: number;
  winRate: number;
}

interface AgentPerformanceSummary {
  data: PerformanceDay[];
  totalProfit: number;
  avgWinRate: number;
  bestDay: number;
}

function useAgentStatus() {
  const [status, setStatus] = useState<AgentStatus>({
    isActive: false,
    accuracy: 0,
    totalTrades: 0,
    profitability: 0,
    riskLevel: 'medium',
  });
  const [performance, setPerformance] = useState<AgentPerformanceSummary>({
    data: [],
    totalProfit: 0,
    avgWinRate: 0,
    bestDay: 0,
  });
  const isActiveRef = useRef(false);

  const fetchAgentData = useCallback(async () => {
    try {
      const res = await fetch('/api/agent?include=trades');
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;

      const agentStatus = json.state?.status;
      const isActive = agentStatus === 'running' || agentStatus === 'paused';
      const perf = json.performance || {};

      // Derive risk level from drawdown
      const drawdown = Math.abs(perf.currentDrawdown || 0);
      const riskLevel: 'low' | 'medium' | 'high' =
        drawdown > 10 ? 'high' : drawdown > 5 ? 'medium' : 'low';

      isActiveRef.current = isActive;
      setStatus({
        isActive,
        accuracy: perf.winRate || 0,
        totalTrades: perf.totalTrades || 0,
        profitability: perf.totalPnlPercent || 0,
        riskLevel,
      });

      // Aggregate trade history into daily performance
      const trades = json.tradeHistory || [];
      if (trades.length > 0) {
        const dailyMap = new Map<string, { profit: number; trades: number; wins: number }>();
        for (const trade of trades) {
          const date = new Date(trade.timestamp || trade.closedAt || Date.now())
            .toISOString()
            .slice(0, 10);
          const entry = dailyMap.get(date) || { profit: 0, trades: 0, wins: 0 };
          entry.profit += trade.pnlPercent || 0;
          entry.trades += 1;
          if ((trade.pnlPercent || 0) > 0) entry.wins += 1;
          dailyMap.set(date, entry);
        }

        const data: PerformanceDay[] = Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            profit: parseFloat(d.profit.toFixed(2)),
            trades: d.trades,
            winRate: d.trades > 0 ? parseFloat(((d.wins / d.trades) * 100).toFixed(1)) : 0,
          }));

        const bestDay = data.reduce((max, d) => Math.max(max, d.profit), 0);

        setPerformance({
          data,
          totalProfit: perf.totalPnlPercent || 0,
          avgWinRate: perf.winRate || 0,
          bestDay,
        });
      } else {
        setPerformance({
          data: [],
          totalProfit: perf.totalPnlPercent || 0,
          avgWinRate: perf.winRate || 0,
          bestDay: 0,
        });
      }
    } catch {
      // Agent API unavailable — keep defaults
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let cancelled = false;

    const poll = async () => {
      await fetchAgentData();
      if (!cancelled) {
        const delay = isActiveRef.current ? 3000 : 15000;
        timeoutId = setTimeout(poll, delay);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchAgentData]);

  return { status, performance };
}

export default function CypherAIPage() {
  const [mode, setMode] = useState<AnalysisMode>('realtime');
  const [bottomTab, setBottomTab] = useState<BottomTab>('backtesting');
  const { status: agentStatus, performance: agentPerformance } = useAgentStatus();

  return (
    <PremiumContent requiredFeature="cypher_ai" fallback={
      <div className="bg-[#0a0a0f] min-h-screen font-mono text-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-[#1a1a2e] border border-orange-500/30 rounded-full flex items-center justify-center mb-6">
          <Brain className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-orange-500 mb-3">CYPHER AI TERMINAL</h2>
        <p className="text-[#e4e4e7]/50 text-sm text-center max-w-lg mb-2">
          AI Trading Intelligence with 8 specialized agents, sentiment analysis, neural predictions, and backtesting.
        </p>
        <p className="text-[#e4e4e7]/40 text-xs text-center max-w-md mb-6">
          Subscribe to the Trader plan ($79/mo) or connect your wallet and verify Yield Hacker Pass ownership to unlock full access.
        </p>
        <div className="text-[10px] text-orange-500/40 font-mono">REQUIRED: TRADER PLAN OR YIELD HACKER PASS NFT</div>
      </div>
    }>
    <div className="bg-[#0a0a0f] min-h-screen font-mono text-white">
      {/* ══════ HEADER ══════ */}
      <header className="border-b border-orange-500/30 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          {/* Top row: Title + Status + Agents count */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-wider">
                <span className="text-orange-500">CYPHER</span>{' '}
                <span className="text-gray-400">AI TERMINAL</span>
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400 font-bold">ONLINE</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-orange-500/60">
                {AGENT_ROSTER.length} AGENTS ACTIVE
              </span>
              {/* Mode Buttons */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'realtime' as AnalysisMode, label: 'Real-time', icon: Radio },
                  { key: 'deep' as AnalysisMode, label: 'Deep Analysis', icon: Brain },
                  { key: 'predictive' as AnalysisMode, label: 'Predictive', icon: BarChart3 },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    aria-label={`${label} mode`}
                    aria-pressed={mode === key}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-all ${
                      mode === key
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : 'text-gray-500 hover:text-gray-300 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Roster Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[9px] text-orange-500/40 shrink-0 uppercase tracking-widest">Agents</span>
            <div className="w-px h-3 bg-orange-500/20" />
            {AGENT_ROSTER.map((agent) => (
              <span
                key={agent.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all hover:scale-105 cursor-default"
                style={{
                  backgroundColor: `${agent.color}10`,
                  color: agent.color,
                  border: `1px solid ${agent.color}25`,
                }}
              >
                <span>{agent.icon}</span>
                <span>{agent.name}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="p-3 space-y-3">
        {/* ── Row 1: Chat + Insights/Signals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Chat - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden h-[520px] flex flex-col">
              <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center gap-2">
                <Zap className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">Chat Interface</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <CypherAIInterface />
              </div>
            </div>
          </div>

          {/* Right column - Insights + Signals stacked */}
          <div className="flex flex-col gap-3">
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden h-[252px]">
              <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center gap-2">
                <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">AI Insights</span>
              </div>
              <div className="overflow-y-auto h-[calc(100%-28px)]">
                <AIInsightsPanel />
              </div>
            </div>
            <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden h-[252px]">
              <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center gap-2">
                <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">Trading Signals</span>
              </div>
              <div className="overflow-y-auto h-[calc(100%-28px)]">
                <TradingSignalsPanel selectedAsset="BTC" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Sentiment + Neural Predictor ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center gap-2">
              <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">Sentiment Analysis</span>
            </div>
            <div className="p-3">
              <SentimentAnalysisPanel />
            </div>
          </div>
          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center gap-2">
              <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">Neural Price Predictor</span>
            </div>
            <div className="p-3">
              <NeuralPricePredictor />
            </div>
          </div>
        </div>

        {/* ── Row 3: AI Status Card ── */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center gap-2">
            <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">AI Engine Status</span>
          </div>
          <div className="p-3">
            <AIStatusCard
              isActive={agentStatus.isActive}
              accuracy={agentStatus.accuracy}
              totalTrades={agentStatus.totalTrades}
              profitability={agentStatus.profitability}
              riskLevel={agentStatus.riskLevel}
            />
            {!agentStatus.isActive && (
              <p className="text-xs text-gray-500 mt-2">Connect trading agent to track performance</p>
            )}
          </div>
        </div>

        {/* ── Row 4: Backtesting & Performance (tabbed) ── */}
        <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1a1a2e] flex items-center justify-between">
            <span className="text-[10px] text-orange-500/60 uppercase tracking-widest">Strategy & Performance</span>
            <div className="flex items-center gap-1">
              {[
                { key: 'backtesting' as BottomTab, label: 'Backtesting' },
                { key: 'performance' as BottomTab, label: 'Performance' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBottomTab(key)}
                  className={`px-3 py-1 text-[10px] rounded transition-all ${
                    bottomTab === key
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3">
            {bottomTab === 'backtesting' ? (
              <BacktestingPanel />
            ) : (
              <PerformanceMetrics
                data={agentPerformance.data}
                totalProfit={agentPerformance.totalProfit}
                avgWinRate={agentPerformance.avgWinRate}
                bestDay={agentPerformance.bestDay}
              />
            )}
          </div>
        </div>
      </main>
    </div>
    </PremiumContent>
  );
}
