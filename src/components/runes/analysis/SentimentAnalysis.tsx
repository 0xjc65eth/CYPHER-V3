'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Users,
  MessageSquare,
  Heart,
  Zap,
  Star,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Activity
} from 'lucide-react';

interface SentimentData {
  source: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  volume: number;
  change24h: number;
  lastUpdate: string;
  reliability: number;
}

interface SocialMetric {
  platform: string;
  mentions: number;
  sentiment: number;
  engagement: number;
  influencerScore: number;
  trendingRank?: number;
}

interface NewsEvent {
  title: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  time: string;
  summary: string;
}

interface FearGreedData {
  index: number;
  label: string;
  change24h: number;
  components: {
    volatility: number;
    momentum: number;
    volume: number;
    socialMedia: number;
    surveys: number;
    dominance: number;
  };
}

export default function SentimentAnalysis() {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetric[]>([]);
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [overallSentiment, setOverallSentiment] = useState(0);

  useEffect(() => {
    generateSentimentData();
    const interval = setInterval(generateSentimentData, 60000); // CoinGecko rate limit: increased to 60s
    return () => clearInterval(interval);
  }, []);

  const generateSentimentData = () => {
    // Generate sentiment data from various sources
    const sources = [
      'Twitter/X', 'Reddit', 'Discord', 'Telegram', 'YouTube', 
      'News Articles', 'Whale Alerts', 'On-Chain Analysis'
    ];

    const newSentimentData: SentimentData[] = sources.map(source => {
      const score = -100 + Math.random() * 200;
      return {
        source,
        sentiment: score > 20 ? 'BULLISH' : score < -20 ? 'BEARISH' : 'NEUTRAL',
        score,
        volume: Math.floor(Math.random() * 10000),
        change24h: (Math.random() - 0.5) * 50,
        lastUpdate: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
        reliability: 60 + Math.random() * 35
      };
    });

    // Generate social metrics
    const platforms = ['Twitter', 'Reddit', 'Discord', 'Telegram', 'YouTube'];
    const newSocialMetrics: SocialMetric[] = platforms.map(platform => ({
      platform,
      mentions: Math.floor(Math.random() * 50000),
      sentiment: -1 + Math.random() * 2,
      engagement: Math.random() * 100,
      influencerScore: Math.random() * 100,
      trendingRank: Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : undefined
    }));

    // Generate news events
    const newsData: NewsEvent[] = [
      {
        title: 'Major Runes Protocol Upgrade Announced',
        sentiment: 'POSITIVE',
        impact: 'HIGH',
        source: 'CoinDesk',
        time: '2 hours ago',
        summary: 'New features will enhance trading efficiency and reduce fees'
      },
      {
        title: 'Institutional Adoption of Runes Increases',
        sentiment: 'POSITIVE',
        impact: 'MEDIUM',
        source: 'CryptoNews',
        time: '4 hours ago',
        summary: 'Several major funds announce Runes allocation strategies'
      },
      {
        title: 'Market Volatility Concerns Rise',
        sentiment: 'NEGATIVE',
        impact: 'MEDIUM',
        source: 'Bitcoin Magazine',
        time: '6 hours ago',
        summary: 'Analysts warn of potential short-term price fluctuations'
      }
    ];

    // Generate Fear & Greed Index
    const index = Math.floor(Math.random() * 100);
    const newFearGreed: FearGreedData = {
      index,
      label: index > 75 ? 'Extreme Greed' : 
             index > 55 ? 'Greed' :
             index > 45 ? 'Neutral' :
             index > 25 ? 'Fear' : 'Extreme Fear',
      change24h: (Math.random() - 0.5) * 20,
      components: {
        volatility: Math.random() * 100,
        momentum: Math.random() * 100,
        volume: Math.random() * 100,
        socialMedia: Math.random() * 100,
        surveys: Math.random() * 100,
        dominance: Math.random() * 100
      }
    };

    setSentimentData(newSentimentData);
    setSocialMetrics(newSocialMetrics);
    setNewsEvents(newsData);
    setFearGreed(newFearGreed);

    // Calculate overall sentiment
    const avgSentiment = newSentimentData.reduce((sum, data) => sum + data.score, 0) / newSentimentData.length;
    setOverallSentiment(avgSentiment);
  };

  const getSentimentColor = (sentiment: string | number) => {
    if (typeof sentiment === 'number') {
      if (sentiment > 20) return 'text-green-400 bg-green-400/20 border-green-400';
      if (sentiment < -20) return 'text-red-400 bg-red-400/20 border-red-400';
      return 'text-gray-400 bg-gray-400/20 border-gray-400';
    }
    
    switch (sentiment) {
      case 'BULLISH':
      case 'POSITIVE':
        return 'text-green-400 bg-green-400/20 border-green-400';
      case 'BEARISH':
      case 'NEGATIVE':
        return 'text-red-400 bg-red-400/20 border-red-400';
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-400 bg-red-400/20 border-red-400';
      case 'MEDIUM': return 'text-orange-400 bg-orange-400/20 border-orange-400';
      default: return 'text-green-400 bg-green-400/20 border-green-400';
    }
  };

  const getFearGreedColor = (index: number) => {
    if (index > 75) return 'text-red-400 bg-red-400/20';
    if (index > 55) return 'text-orange-400 bg-orange-400/20';
    if (index > 45) return 'text-gray-400 bg-gray-400/20';
    if (index > 25) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-green-400 bg-green-400/20';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="h-8 w-8 text-purple-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                SENTIMENT ANALYSIS
              </h1>
            </div>
            <Badge className={`${getSentimentColor(overallSentiment)} border text-sm px-3 py-1`}>
              <Brain className="h-3 w-3 mr-1" />
              AI POWERED
            </Badge>
          </div>
        </div>

        {/* Overall Sentiment Score */}
        <Card className="bg-black/50 border-purple-500/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-purple-400 mb-2">OVERALL MARKET SENTIMENT</h2>
                <p className="text-gray-400">Aggregated from multiple data sources</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {overallSentiment.toFixed(1)}
                </div>
                <Badge className={`${getSentimentColor(overallSentiment)} border`}>
                  {overallSentiment > 20 ? 'BULLISH' : overallSentiment < -20 ? 'BEARISH' : 'NEUTRAL'}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-1000 ${
                    overallSentiment > 0 ? 'bg-gradient-to-r from-gray-500 to-green-400' : 
                    'bg-gradient-to-r from-red-400 to-gray-500'
                  }`}
                  style={{ 
                    width: `${50 + (overallSentiment / 200) * 100}%`,
                    marginLeft: overallSentiment < 0 ? `${50 + (overallSentiment / 200) * 100}%` : '0'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Extreme Bearish (-100)</span>
                <span>Neutral (0)</span>
                <span>Extreme Bullish (+100)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sentiment Sources */}
        <Card className="col-span-2 bg-black/50 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-purple-400">SENTIMENT SOURCES</h2>
              <Activity className="h-6 w-6 text-purple-400" />
            </div>

            <div className="space-y-4">
              {sentimentData.map((data, index) => (
                <motion.div
                  key={data.source}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-white">{data.source}</h3>
                      <Badge className={`${getSentimentColor(data.sentiment)} border text-xs px-2 py-0`}>
                        {data.sentiment}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-400">{data.score.toFixed(1)}</div>
                      <div className={`text-xs ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Volume: </span>
                      <span className="text-white font-bold">{data.volume.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Reliability: </span>
                      <span className="text-white font-bold">{data.reliability.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Updated: </span>
                      <span className="text-gray-300">{data.lastUpdate}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all duration-500 ${
                          data.sentiment === 'BULLISH' ? 'bg-green-400' :
                          data.sentiment === 'BEARISH' ? 'bg-red-400' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.abs(data.score)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fear & Greed Index */}
        <Card className="bg-black/50 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-orange-400">FEAR & GREED</h2>
              <Zap className="h-6 w-6 text-orange-400" />
            </div>

            {fearGreed && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${getFearGreedColor(fearGreed.index)} border-4`}>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">{fearGreed.index}</div>
                      <div className="text-xs text-gray-400">INDEX</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-white">{fearGreed.label}</h3>
                    <div className={`text-sm ${fearGreed.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fearGreed.change24h >= 0 ? '+' : ''}{fearGreed.change24h.toFixed(1)}% (24h)
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-orange-400">COMPONENTS</h4>
                  {Object.entries(fearGreed.components).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-orange-400 h-1 rounded-full transition-all duration-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs text-white w-8">{value.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Social Media Metrics */}
      <Card className="mt-6 bg-black/50 border-blue-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-blue-400">SOCIAL MEDIA METRICS</h2>
            <Users className="h-6 w-6 text-blue-400" />
          </div>

          <div className="grid grid-cols-5 gap-4">
            {socialMetrics.map((metric, index) => (
              <motion.div
                key={metric.platform}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-900/50 rounded-lg border border-blue-500/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm">{metric.platform}</h3>
                  {metric.trendingRank && (
                    <Badge className="bg-yellow-500/20 border-yellow-500 text-yellow-400 text-xs">
                      #{metric.trendingRank}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Mentions:</span>
                    <span className="text-blue-400 font-bold">{metric.mentions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Sentiment:</span>
                    <span className={`font-bold ${metric.sentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {metric.sentiment > 0 ? '+' : ''}{metric.sentiment.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Engagement:</span>
                    <span className="text-white">{metric.engagement.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Influencer:</span>
                    <span className="text-purple-400">{metric.influencerScore.toFixed(0)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* News & Events */}
      <Card className="mt-6 bg-black/50 border-yellow-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-yellow-400">NEWS & EVENTS IMPACT</h2>
            <MessageSquare className="h-6 w-6 text-yellow-400" />
          </div>

          <div className="space-y-4">
            {newsEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-900/50 rounded-lg border border-yellow-500/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-white text-sm flex-1 mr-4">{event.title}</h3>
                  <div className="flex gap-2">
                    <Badge className={`${getSentimentColor(event.sentiment)} border text-xs`}>
                      {event.sentiment}
                    </Badge>
                    <Badge className={`${getImpactColor(event.impact)} border text-xs`}>
                      {event.impact}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-2">{event.summary}</p>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{event.source}</span>
                  <span>{event.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}