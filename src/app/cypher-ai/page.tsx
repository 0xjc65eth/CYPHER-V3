'use client';

import { useState } from 'react';
import { CypherAIInterface } from '@/components/ai/CypherAIInterface';
import { AIInsightsPanel } from '@/components/ai/AIInsightsPanel';
import { TradingSignalsPanel } from '@/components/ai/TradingSignalsPanel';
import { SentimentAnalysisPanel } from '@/components/ai/SentimentAnalysisPanel';
import { NeuralPricePredictor } from '@/components/ai/NeuralPricePredictor';
import BacktestingPanel from '@/components/ai/BacktestingPanel';
import { PerformanceMetrics } from '@/components/ai/PerformanceMetrics';
import { AIStatusCard } from '@/components/ai/AIStatusCard';
import { Zap, Radio, Brain, BarChart3 } from 'lucide-react';
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

// Performance data should come from real trading history
const PERFORMANCE_MOCK_DATA: Array<{date: string, profit: number, trades: number, winRate: number}> = [];

export default function CypherAIPage() {
  const [mode, setMode] = useState<AnalysisMode>('realtime');
  const [bottomTab, setBottomTab] = useState<BottomTab>('backtesting');

  return (
    <PremiumContent fallback={
      <div className="bg-[#0a0a0f] min-h-screen font-mono text-white flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-[#1a1a2e] border border-orange-500/30 rounded-full flex items-center justify-center mb-6">
          <Brain className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-orange-500 mb-3">CYPHER AI TERMINAL — YHP ACCESS</h2>
        <p className="text-[#e4e4e7]/50 text-sm text-center max-w-lg mb-2">
          AI Trading Intelligence with 8 specialized agents, sentiment analysis, neural predictions, and backtesting.
        </p>
        <p className="text-[#e4e4e7]/40 text-xs text-center max-w-md mb-6">
          Connect your ETH wallet and verify Yield Hacker Pass ownership to unlock full access.
        </p>
        <div className="text-[10px] text-orange-500/40 font-mono">REQUIRED: YIELD HACKER PASS NFT</div>
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
              isActive={true}
              accuracy={87.4}
              totalTrades={14892}
              profitability={23.7}
              riskLevel="medium"
            />
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
                data={PERFORMANCE_MOCK_DATA}
                totalProfit={14.3}
                avgWinRate={69.4}
                bestDay={4.2}
              />
            )}
          </div>
        </div>
      </main>
    </div>
    </PremiumContent>
  );
}
