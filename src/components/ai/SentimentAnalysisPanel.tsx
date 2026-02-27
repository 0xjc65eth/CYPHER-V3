'use client';

import { useState, useEffect } from 'react';
import { useSentimentAnalysis } from '@/hooks/ai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MessageCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DashboardData {
  fearGreed: { value: number; classification: string } | null;
  news: Array<{ title: string; source: string; url: string; publishedOn: number }> | null;
}

export function SentimentAnalysisPanel() {
  const { aggregatedSentiment, loading, analyzeMultiple } = useSentimentAnalysis();
  const [analyzing, setAnalyzing] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchAndAnalyze = async () => {
      try {
        setFetching(true);
        const res = await fetch('/api/cypher-ai/dashboard-data');
        if (!res.ok) throw new Error('Failed to fetch');
        const data: DashboardData = await res.json();

        if (cancelled) return;

        // Build text corpus from real headlines + Fear & Greed classification
        const texts: string[] = [];

        if (data.fearGreed) {
          texts.push(`Market Fear & Greed Index is ${data.fearGreed.value} - ${data.fearGreed.classification}`);
        }

        if (data.news && data.news.length > 0) {
          data.news.slice(0, 15).forEach((n) => texts.push(n.title));
        }

        if (texts.length === 0) {
          setFetching(false);
          return;
        }

        setFetching(false);
        setAnalyzing(true);
        await analyzeMultiple(texts);
        if (!cancelled) {
          setDataLoaded(true);
          setAnalyzing(false);
        }
      } catch {
        if (!cancelled) {
          setFetching(false);
          setAnalyzing(false);
        }
      }
    };

    fetchAndAnalyze();

    const interval = setInterval(fetchAndAnalyze, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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

  if (fetching) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-orange-500">Market Sentiment Analysis</h2>
        </div>
        <div className="text-sm text-gray-400">Loading sentiment data...</div>
      </div>
    );
  }

  if (!dataLoaded && !analyzing && !aggregatedSentiment?.overall) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-orange-500">Market Sentiment Analysis</h2>
        </div>
        <div className="text-sm text-gray-400">Awaiting data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle className="w-6 h-6 text-orange-500" />
        <h2 className="text-xl font-semibold text-orange-500">Market Sentiment Analysis</h2>
        {(loading || analyzing) && <div className="ml-auto text-xs text-gray-400">Analyzing...</div>}
      </div>

      {aggregatedSentiment?.overall && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="bg-black/40 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Overall Sentiment</span>
                {getSentimentIcon(aggregatedSentiment.overall.sentiment ?? 'neutral')}
              </div>
              <div className="text-2xl font-bold capitalize" style={{
                color: getSentimentColor(aggregatedSentiment.overall.sentiment ?? 'neutral')
              }}>
                {aggregatedSentiment.overall.sentiment ?? 'neutral'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((aggregatedSentiment.overall.confidence ?? 0) * 100).toFixed(1)}% confidence
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Trend</div>
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
          <div className="text-sm text-gray-400 mb-2">Detected Keywords</div>
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
        * Analysis based on Fear & Greed Index + CryptoCompare News
      </div>
    </div>
  );
}
