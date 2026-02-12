'use client';

import { useState, useEffect } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, TrendingUp, Clock, BarChart3, AlertTriangle, Users, Hash, Twitter, Github } from 'lucide-react';

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

function getClassColor(classification: string) {
  switch (classification.toLowerCase()) {
    case 'extreme fear': return 'text-red-500';
    case 'fear': return 'text-orange-400';
    case 'neutral': return 'text-yellow-400';
    case 'greed': return 'text-green-400';
    case 'extreme greed': return 'text-green-500';
    default: return 'text-gray-400';
  }
}

function getBarColor(classification: string) {
  switch (classification.toLowerCase()) {
    case 'extreme fear': return 'from-red-600 to-red-500';
    case 'fear': return 'from-orange-600 to-orange-400';
    case 'neutral': return 'from-yellow-600 to-yellow-400';
    case 'greed': return 'from-green-600 to-green-400';
    case 'extreme greed': return 'from-green-500 to-emerald-400';
    default: return 'from-gray-600 to-gray-400';
  }
}

function SentimentTab() {
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [history, setHistory] = useState<FearGreedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFearGreed() {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=7');
        if (!res.ok) throw new Error('Failed to fetch Fear & Greed data');
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setFearGreed(json.data[0]);
          setHistory(json.data);
        }
      } catch {
        setError('Unable to load sentiment data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchFearGreed();
  }, []);

  return (
    <div className="space-y-6 p-4">
      {/* Fear & Greed Index */}
      <div className="bg-[#0d0d1a] rounded-lg p-6 border border-[#1a1a2e]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#ec4899]" />
          <h2 className="text-lg font-bold font-mono text-white">Crypto Fear & Greed Index</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#ec4899] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-400 font-mono">Loading sentiment data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="font-mono">{error}</span>
          </div>
        ) : fearGreed ? (
          <div className="space-y-6">
            {/* Current Value */}
            <div className="text-center">
              <div className={`text-6xl font-bold font-mono ${getClassColor(fearGreed.value_classification)}`}>
                {fearGreed.value}
              </div>
              <div className={`text-xl font-semibold font-mono mt-2 ${getClassColor(fearGreed.value_classification)}`}>
                {fearGreed.value_classification}
              </div>
            </div>

            {/* Gauge Bar */}
            <div className="w-full max-w-md mx-auto">
              <div className="w-full bg-gray-800 rounded-full h-4">
                <div
                  className={`bg-gradient-to-r ${getBarColor(fearGreed.value_classification)} h-4 rounded-full transition-all duration-1000`}
                  style={{ width: `${fearGreed.value}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-mono mt-1">
                <span>Extreme Fear</span>
                <span>Extreme Greed</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 7-Day History */}
      {history.length > 1 && (
        <div className="bg-[#0d0d1a] rounded-lg p-6 border border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#ec4899]" />
            <h2 className="text-lg font-bold font-mono text-white">7-Day History</h2>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {history.map((entry, index) => {
              const date = new Date(parseInt(entry.timestamp) * 1000);
              return (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-500 font-mono mb-1">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold font-mono ${getClassColor(entry.value_classification)}`}>
                    {entry.value}
                  </div>
                  <div className={`text-[10px] font-mono ${getClassColor(entry.value_classification)}`}>
                    {entry.value_classification}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CommunityTab() {
  const communityData = [
    { label: 'Discord Members', value: '24,891', change: '+342', icon: MessageCircle, color: '#7c3aed' },
    { label: 'Twitter Followers', value: '128.4K', change: '+1.2K', icon: Twitter, color: '#ec4899' },
    { label: 'GitHub Stars', value: '3,421', change: '+89', icon: Github, color: '#00ff88' },
    { label: 'Active Users (24h)', value: '8,204', change: '+512', icon: Users, color: '#06b6d4' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {communityData.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                  <h3 className="text-sm font-mono text-gray-400">{item.label}</h3>
                </div>
                <span className="text-xs font-mono text-green-400">{item.change}</span>
              </div>
              <p className="text-2xl font-mono font-bold text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
        <h3 className="text-sm font-mono font-semibold text-gray-300 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { user: 'whale_watcher', action: 'shared analysis on BTC support levels', time: '2m ago' },
            { user: 'ordinals_dev', action: 'posted new inscription collection alert', time: '8m ago' },
            { user: 'defi_alpha', action: 'flagged unusual TVL movement in Aave', time: '15m ago' },
            { user: 'btc_miner', action: 'reported hashrate increase from Texas facility', time: '22m ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a1a2e] last:border-0">
              <div>
                <span className="text-sm font-mono text-[#ec4899]">@{item.user}</span>
                <span className="text-sm font-mono text-gray-500 ml-2">{item.action}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600 shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendsTab() {
  const trendingTopics = [
    { tag: '#Bitcoin', mentions: '142.3K', sentiment: 'Bullish', sentimentColor: 'text-green-400', change: '+12%' },
    { tag: '#Ordinals', mentions: '48.7K', sentiment: 'Very Bullish', sentimentColor: 'text-green-500', change: '+34%' },
    { tag: '#Runes', mentions: '31.2K', sentiment: 'Bullish', sentimentColor: 'text-green-400', change: '+21%' },
    { tag: '#ETF', mentions: '28.9K', sentiment: 'Neutral', sentimentColor: 'text-yellow-400', change: '-3%' },
    { tag: '#DeFi', mentions: '22.1K', sentiment: 'Neutral', sentimentColor: 'text-yellow-400', change: '+5%' },
    { tag: '#Lightning', mentions: '18.4K', sentiment: 'Bullish', sentimentColor: 'text-green-400', change: '+8%' },
  ];

  const popularTokens = [
    { name: 'BTC', mentions: '89.2K', sentiment: 78 },
    { name: 'ETH', mentions: '45.1K', sentiment: 62 },
    { name: 'SOL', mentions: '34.8K', sentiment: 71 },
    { name: 'ORDI', mentions: '12.3K', sentiment: 85 },
    { name: 'DOG', mentions: '9.7K', sentiment: 54 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Trending Topics */}
      <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-5 h-5 text-[#ec4899]" />
          <h3 className="text-sm font-mono font-semibold text-gray-300">Trending Topics</h3>
        </div>
        <div className="space-y-3">
          {trendingTopics.map((topic, i) => (
            <div key={topic.tag} className="flex items-center justify-between py-2 border-b border-[#1a1a2e] last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 w-4">{i + 1}</span>
                <span className="text-sm font-mono font-bold text-white">{topic.tag}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-gray-500">{topic.mentions} mentions</span>
                <span className={`text-xs font-mono ${topic.sentimentColor}`}>{topic.sentiment}</span>
                <span className={`text-xs font-mono ${topic.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{topic.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Tokens by Mention */}
      <div className="bg-[#0d0d1a] rounded-lg p-5 border border-[#1a1a2e]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#ec4899]" />
          <h3 className="text-sm font-mono font-semibold text-gray-300">Token Sentiment Score</h3>
        </div>
        <div className="space-y-3">
          {popularTokens.map((token) => (
            <div key={token.name} className="flex items-center gap-4">
              <span className="text-sm font-mono font-bold text-white w-12">{token.name}</span>
              <div className="flex-1">
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#ec4899] to-pink-400 h-2 rounded-full transition-all"
                    style={{ width: `${token.sentiment}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-mono text-gray-400 w-16 text-right">{token.mentions}</span>
              <span className="text-xs font-mono text-[#ec4899] w-8 text-right">{token.sentiment}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SocialPage() {
  return (
    <TopNavLayout>
      <div className="space-y-0">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold font-mono text-white mb-1">Social Sentiment</h1>
          <p className="text-gray-400 font-mono text-sm">Real-time market sentiment analysis</p>
        </div>

        <Tabs defaultValue="sentiment" className="w-full">
          <div className="border-b border-gray-800 px-4">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="sentiment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ec4899] data-[state=active]:bg-transparent data-[state=active]:text-[#ec4899] text-gray-500 px-4 py-2 text-sm font-mono">
                Sentiment
              </TabsTrigger>
              <TabsTrigger value="community" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ec4899] data-[state=active]:bg-transparent data-[state=active]:text-[#ec4899] text-gray-500 px-4 py-2 text-sm font-mono">
                Community
              </TabsTrigger>
              <TabsTrigger value="trends" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ec4899] data-[state=active]:bg-transparent data-[state=active]:text-[#ec4899] text-gray-500 px-4 py-2 text-sm font-mono">
                Trends
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="sentiment">
            <SentimentTab />
          </TabsContent>

          <TabsContent value="community">
            <CommunityTab />
          </TabsContent>

          <TabsContent value="trends">
            <TrendsTab />
          </TabsContent>
        </Tabs>
      </div>
    </TopNavLayout>
  );
}
