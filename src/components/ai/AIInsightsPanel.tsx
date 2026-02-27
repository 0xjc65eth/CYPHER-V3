'use client';

import { useCypherAI } from '@/hooks/ai';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Zap, BarChart3, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

interface OrdinalsDay {
  date: string;
  dailyInscriptions: number;
  totalInscriptions: number;
  fees: number;
}

interface DEXRanking {
  rank: number;
  project: string;
  volume7d: number;
  volume24h: number;
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="#f97316"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function AIInsightsPanel() {
  const { insights, loading, initialized } = useCypherAI();
  const [ordinalsTrends, setOrdinalsTrends] = useState<OrdinalsDay[]>([]);
  const [dexRankings, setDexRankings] = useState<DEXRanking[]>([]);
  const [duneLoading, setDuneLoading] = useState(true);

  const fetchDuneData = useCallback(async () => {
    setDuneLoading(true);
    try {
      const [ordinalsRes, dexRes] = await Promise.allSettled([
        fetch('/api/dune/?query=ordinals-trends'),
        fetch('/api/dune/?query=dex-volume'),
      ]);

      if (ordinalsRes.status === 'fulfilled' && ordinalsRes.value.ok) {
        const json = await ordinalsRes.value.json();
        if (json.data) setOrdinalsTrends(json.data.slice(0, 14));
      }

      if (dexRes.status === 'fulfilled' && dexRes.value.ok) {
        const json = await dexRes.value.json();
        if (json.data) setDexRankings(json.data.slice(0, 10));
      }
    } catch {
      // Dune data is supplementary; silent fail
    } finally {
      setDuneLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuneData();
    const interval = setInterval(fetchDuneData, 300_000); // 5 min
    return () => clearInterval(interval);
  }, [fetchDuneData]);

  const getInsightIcon = (type: string, insight?: typeof insights[number]) => {
    switch (type) {
      case 'price':
        return insight?.prediction?.direction === 'up' ?
          <TrendingUp className="w-5 h-5 text-green-500" /> :
          <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'pattern':
        return <Brain className="w-5 h-5 text-purple-500" />;
      case 'risk':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Zap className="w-5 h-5 text-orange-500" />;
    }
  };

  if (!initialized) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-orange-500 animate-pulse" />
          <h2 className="text-xl font-semibold text-orange-500">CYPHER AI Insights</h2>
        </div>
        <div className="text-center py-8 text-gray-400">
          Inicializando sistema neural...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="w-6 h-6 text-orange-500" />
        <h2 className="text-xl font-semibold text-orange-500">CYPHER AI Insights</h2>
        {loading && <div className="ml-auto text-xs text-gray-400">Analisando...</div>}
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Aguardando dados do mercado para análise...
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-black/40 rounded-lg border border-gray-800"
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type, insight)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-300 capitalize">
                      {insight.type} Analysis
                    </span>
                    <span className="text-xs text-gray-500">
                      {(insight.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{insight.reasoning}</p>
                  {insight.prediction && (
                    <div className="mt-2 text-xs text-orange-500">
                      Prediction: {insight.prediction.direction === 'up' ? 'Bullish' : 'Bearish'}
                      {insight.prediction.price != null && ` — Target: $${Number(insight.prediction.price).toLocaleString()}`}
                      {insight.prediction.confidence != null && ` (${(insight.prediction.confidence * 100).toFixed(0)}%)`}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* On-Chain Analytics Section (Dune) */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">On-Chain Analytics</h3>
        </div>

        {duneLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-black/40 rounded-lg p-4 border border-gray-800 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-3" />
                <div className="h-20 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Ordinals Inscriptions Trend */}
            {ordinalsTrends.length > 0 && (
              <div className="bg-black/40 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-gray-300">Ordinals Daily Inscriptions</span>
                </div>
                <div className="mb-2">
                  <MiniSparkline data={ordinalsTrends.map(d => d.dailyInscriptions).reverse()} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Today</span>
                    <p className="text-orange-400 font-mono">
                      {formatNumber(ordinalsTrends[0]?.dailyInscriptions || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total</span>
                    <p className="text-gray-300 font-mono">
                      {formatNumber(ordinalsTrends[0]?.totalInscriptions || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* DEX Volume Rankings */}
            {dexRankings.length > 0 && (
              <div className="bg-black/40 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-gray-300">DEX Volume Rankings</span>
                </div>
                <div className="space-y-1">
                  {dexRankings.slice(0, 5).map((dex) => (
                    <div key={dex.rank} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        <span className="text-gray-600 mr-1">#{dex.rank}</span>
                        {dex.project}
                      </span>
                      <span className="text-orange-400 font-mono">{formatCompact(dex.volume24h)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Powered by TensorFlow.js + Dune Analytics</span>
          <span>Neural Network v3.0.0</span>
        </div>
      </div>
    </div>
  );
}
