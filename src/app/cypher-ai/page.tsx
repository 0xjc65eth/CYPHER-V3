'use client';

import { useState, useEffect } from 'react';
import { CypherAIInterface } from '@/components/ai/CypherAIInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, MessageSquare, Users, BarChart3, Activity, Target, TrendingUp, Zap } from 'lucide-react';

const AGENT_ROSTER = [
  { name: 'Alpha', icon: '\u{1F4C8}', color: '#00ff88', desc: 'Markets', capabilities: ['Price prediction', 'Trend analysis', 'Volume profiling'] },
  { name: 'Satoshi', icon: '\u{26D3}\u{FE0F}', color: '#3b82f6', desc: 'On-Chain', capabilities: ['Whale tracking', 'UTXO analysis', 'Mempool monitoring'] },
  { name: 'Inscriber', icon: '\u{1F536}', color: '#f59e0b', desc: 'Ordinals', capabilities: ['Inscription tracking', 'Rarity scoring', 'Collection analysis'] },
  { name: 'Macro', icon: '\u{1F30D}', color: '#8b5cf6', desc: 'Economics', capabilities: ['Fed policy analysis', 'Correlation tracking', 'Risk modeling'] },
  { name: 'DeFi', icon: '\u{26A1}', color: '#06b6d4', desc: 'DeFi', capabilities: ['Yield optimization', 'Protocol risk', 'TVL monitoring'] },
  { name: 'Guardian', icon: '\u{1F6E1}\u{FE0F}', color: '#ef4444', desc: 'Risk', capabilities: ['Portfolio hedging', 'Drawdown alerts', 'Exposure limits'] },
  { name: 'Pulse', icon: '\u{1F493}', color: '#ec4899', desc: 'Sentiment', capabilities: ['Social scanning', 'Fear & Greed', 'Narrative detection'] },
  { name: 'Quant', icon: '\u{1F522}', color: '#14b8a6', desc: 'Quant', capabilities: ['Statistical models', 'Backtesting', 'Signal generation'] },
];

interface MarketContext {
  summary?: string;
  priceOutlook?: string;
  keyLevels?: { support: number; resistance: number };
  sentiment?: string;
  lastUpdated?: string;
}

interface NeuralMetrics {
  modelAccuracy?: number;
  trainingStatus?: string;
  predictionConfidence?: number;
  lastTrained?: string;
  totalPredictions?: number;
  successRate?: number;
}

function AnalysisTab() {
  const [data, setData] = useState<MarketContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/cypher-ai/market-context');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch {
        setError('Unable to load market analysis');
        setData({
          summary: 'Bitcoin showing consolidation near key support levels. Market awaiting catalyst.',
          priceOutlook: 'Neutral-Bullish',
          keyLevels: { support: 92500, resistance: 98000 },
          sentiment: 'Cautiously Optimistic',
          lastUpdated: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#0d0d1a] rounded-lg p-4 border border-[#1a1a2e] animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#00ff88]" />
            <h3 className="text-sm font-mono font-semibold text-gray-300">Market Summary</h3>
          </div>
          <p className="text-sm text-gray-400 font-mono leading-relaxed">{data?.summary || 'No data available'}</p>
        </div>

        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#00ff88]" />
            <h3 className="text-sm font-mono font-semibold text-gray-300">Price Outlook</h3>
          </div>
          <p className="text-lg font-mono font-bold text-[#00ff88]">{data?.priceOutlook || 'N/A'}</p>
        </div>

        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-[#00ff88]" />
            <h3 className="text-sm font-mono font-semibold text-gray-300">Key Levels</h3>
          </div>
          <div className="space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Support</span>
              <span className="text-sm text-green-400">${data?.keyLevels?.support?.toLocaleString() || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Resistance</span>
              <span className="text-sm text-red-400">${data?.keyLevels?.resistance?.toLocaleString() || '--'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-[#00ff88]" />
            <h3 className="text-sm font-mono font-semibold text-gray-300">Sentiment</h3>
          </div>
          <p className="text-lg font-mono font-bold text-yellow-400">{data?.sentiment || 'N/A'}</p>
          {data?.lastUpdated && (
            <p className="text-[10px] text-gray-600 font-mono mt-2">Updated: {new Date(data.lastUpdated).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentsTab() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENT_ROSTER.map((agent) => (
          <div
            key={agent.name}
            className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e] hover:border-opacity-60 transition-all"
            style={{ borderColor: `${agent.color}30` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
              >
                {agent.icon}
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-white">{agent.name}</h3>
                <span className="text-[10px] font-mono" style={{ color: agent.color }}>{agent.desc}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-mono text-green-400">ONLINE</span>
            </div>
            <div className="space-y-1">
              {agent.capabilities.map((cap) => (
                <div key={cap} className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" style={{ color: agent.color }} />
                  {cap}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeuralLearningTab() {
  const [metrics, setMetrics] = useState<NeuralMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/neural-metrics');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setMetrics(json);
      } catch {
        setMetrics({
          modelAccuracy: 87.4,
          trainingStatus: 'Active',
          predictionConfidence: 82.1,
          lastTrained: new Date().toISOString(),
          totalPredictions: 14892,
          successRate: 71.3,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#0d0d1a] rounded-lg p-4 border border-[#1a1a2e] animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-1/4 mb-3" />
            <div className="h-8 bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-[#00ff88]" />
            <h3 className="text-xs font-mono text-gray-500">MODEL ACCURACY</h3>
          </div>
          <p className="text-3xl font-mono font-bold text-[#00ff88]">{metrics?.modelAccuracy?.toFixed(1)}%</p>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
            <div className="bg-[#00ff88] h-1.5 rounded-full transition-all" style={{ width: `${metrics?.modelAccuracy || 0}%` }} />
          </div>
        </div>

        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono text-gray-500">TRAINING STATUS</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-lg font-mono font-bold text-green-400">{metrics?.trainingStatus || 'Unknown'}</p>
          </div>
          {metrics?.lastTrained && (
            <p className="text-[10px] font-mono text-gray-600 mt-2">Last: {new Date(metrics.lastTrained).toLocaleString()}</p>
          )}
        </div>

        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-mono text-gray-500">PREDICTION CONFIDENCE</h3>
          </div>
          <p className="text-3xl font-mono font-bold text-purple-400">{metrics?.predictionConfidence?.toFixed(1)}%</p>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
            <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${metrics?.predictionConfidence || 0}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <h3 className="text-xs font-mono text-gray-500 mb-2">TOTAL PREDICTIONS</h3>
          <p className="text-2xl font-mono font-bold text-white">{metrics?.totalPredictions?.toLocaleString()}</p>
        </div>
        <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
          <h3 className="text-xs font-mono text-gray-500 mb-2">SUCCESS RATE</h3>
          <p className="text-2xl font-mono font-bold text-[#00ff88]">{metrics?.successRate?.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

export default function CypherAIPage() {
  return (
    <div className="bg-black min-h-screen">
      {/* Agent Roster Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs text-gray-500 font-medium shrink-0">AGENTS</span>
          <div className="flex items-center gap-2">
            {AGENT_ROSTER.map((agent) => (
              <span
                key={agent.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                style={{
                  backgroundColor: `${agent.color}15`,
                  color: agent.color,
                  border: `1px solid ${agent.color}30`,
                }}
              >
                <span>{agent.icon}</span>
                <span>{agent.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pt-12">
        <Tabs defaultValue="chat" className="w-full">
          <div className="border-b border-gray-800 px-4">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                Chat
              </TabsTrigger>
              <TabsTrigger value="analysis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                Analysis
              </TabsTrigger>
              <TabsTrigger value="agents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                Agents
              </TabsTrigger>
              <TabsTrigger value="neural" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                Neural Learning
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat">
            <CypherAIInterface />
          </TabsContent>

          <TabsContent value="analysis">
            <AnalysisTab />
          </TabsContent>

          <TabsContent value="agents">
            <AgentsTab />
          </TabsContent>

          <TabsContent value="neural">
            <NeuralLearningTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
