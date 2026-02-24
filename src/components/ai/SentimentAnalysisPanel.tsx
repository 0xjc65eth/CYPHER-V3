'use client';

import { useState, useEffect } from 'react';
import { useSentimentAnalysis } from '@/hooks/ai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MessageCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Dados simulados de social media
const mockSocialData = [
  "Bitcoin is going to the moon! 🚀 Bullish AF!",
  "BTC showing strong support at 58k, accumulation phase",
  "Bearish divergence on the daily chart, be careful",
  "Just bought more Bitcoin, this dip is a gift",
  "Market crash incoming, sell everything!",
  "Technical analysis shows breakout imminent",
  "Bitcoin will hit 100k this year, mark my words",
  "Weak hands selling, strong hands accumulating"
];

export function SentimentAnalysisPanel() {
  const { aggregatedSentiment, loading, analyzeMultiple } = useSentimentAnalysis();
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Analisar sentimento inicial
    const analyze = async () => {
      setAnalyzing(true);
      await analyzeMultiple(mockSocialData);
      setAnalyzing(false);
    };
    
    analyze();
    
    // Re-analisar a cada 30 segundos
    const interval = setInterval(analyze, 30000);
    return () => clearInterval(interval);
  }, [analyzeMultiple]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#10b981';
      case 'negative':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const dist = aggregatedSentiment?.distribution;
  const pieData = dist ? [
    { name: 'Positive', value: dist.positive ?? 0, color: '#10b981' },
    { name: 'Negative', value: dist.negative ?? 0, color: '#ef4444' },
    { name: 'Neutral', value: dist.neutral ?? 0, color: '#f59e0b' }
  ] : [];

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle className="w-6 h-6 text-orange-500" />
        <h2 className="text-xl font-semibold text-orange-500">Market Sentiment Analysis</h2>
        {(loading || analyzing) && <div className="ml-auto text-xs text-gray-400">Analisando...</div>}
      </div>

      {aggregatedSentiment?.overall && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="bg-black/40 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Sentimento Geral</span>
                {getSentimentIcon(aggregatedSentiment.overall.sentiment ?? 'neutral')}
              </div>
              <div className="text-2xl font-bold capitalize" style={{
                color: getSentimentColor(aggregatedSentiment.overall.sentiment ?? 'neutral')
              }}>
                {aggregatedSentiment.overall.sentiment ?? 'neutral'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((aggregatedSentiment.overall.confidence ?? 0) * 100).toFixed(1)}% confiança
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Tendência</div>
              <div className="flex items-center gap-2">
                <div className={`text-lg font-semibold capitalize ${
                  aggregatedSentiment.trend === 'improving' ? 'text-green-500' :
                  aggregatedSentiment.trend === 'declining' ? 'text-red-500' :
                  'text-yellow-500'
                }`}>
                  {aggregatedSentiment.trend ?? 'stable'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(aggregatedSentiment?.overall?.keywords?.length ?? 0) > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-400 mb-2">Palavras-chave Detectadas</div>
          <div className="flex flex-wrap gap-2">
            {aggregatedSentiment.overall.keywords.map((keyword: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-orange-500/20 text-orange-500 rounded text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        * Análise baseada em {mockSocialData.length} posts de redes sociais
      </div>
    </div>
  );
}