'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, Title, Text, Badge, ProgressBar } from '@tremor/react'
import { RiBrainLine, RiPulseLine, RiRadarLine, RiRefreshLine, RiArrowUpSLine, RiArrowDownSLine, RiNewspaperLine } from 'react-icons/ri'
import { useTradingData } from '@/hooks/useTradingData'
import { useCryptoNews } from '@/hooks/useCryptoNews'
import { useMarketData } from '@/hooks/useMarketData'
import { NewsItem } from '@/app/api/crypto-news/route'

export function NeuralInsightsAdvanced() {
  const { data: tradingData, refresh: refreshTradingData } = useTradingData(60000) // Refresh every minute
  const { news } = useCryptoNews(300000) // Refresh every 5 minutes
  const marketData = useMarketData() as any
  const [mounted, setMounted] = useState(false)

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate neural insights based on real data
  const neuralInsights = useMemo(() => {
    // Default insights if no data is available
    const defaultInsights = [
      {
        name: 'BTC Price Trend',
        value: 78,
        signal: 'Bullish',
        confidence: 'High',
        color: 'emerald',
        interpretation: 'Strong bullish momentum with positive price action across multiple timeframes.'
      },
      {
        name: 'Market Sentiment',
        value: 65,
        signal: 'Positive',
        confidence: 'Medium',
        color: 'emerald',
        interpretation: 'Overall positive sentiment with increasing institutional interest.'
      },
      {
        name: 'Volatility Forecast',
        value: 42,
        signal: 'Moderate',
        confidence: 'Medium',
        color: 'amber',
        interpretation: 'Moderate volatility expected with potential for range-bound trading.'
      },
      {
        name: 'Ordinals Momentum',
        value: 82,
        signal: 'Strong',
        confidence: 'High',
        color: 'emerald',
        interpretation: 'Strong momentum in Ordinals market with increasing inscription rate and trading volume.'
      },
      {
        name: 'Runes Momentum',
        value: 71,
        signal: 'Bullish',
        confidence: 'Medium',
        color: 'emerald',
        interpretation: 'Bullish trend in Runes market with growing adoption and liquidity.'
      }
    ];

    // If we have real data, generate insights based on it
    if (marketData && news.length > 0) {
      const insights = [];

      // BTC Price Trend insight based on real price data
      if (marketData.bitcoin) {
        const priceChange24h = marketData.bitcoin.price_change_percentage_24h;
        let priceTrendValue = 50; // Neutral starting point

        // Adjust based on price change
        priceTrendValue += priceChange24h * 2; // Each percent adds 2 points

        // Ensure value is within 0-100 range
        priceTrendValue = Math.max(0, Math.min(100, priceTrendValue));

        // Determine signal and color
        let signal, color;
        if (priceTrendValue >= 70) {
          signal = 'Strongly Bullish';
          color = 'emerald';
        } else if (priceTrendValue >= 60) {
          signal = 'Bullish';
          color = 'emerald';
        } else if (priceTrendValue >= 45) {
          signal = 'Neutral';
          color = 'blue';
        } else if (priceTrendValue >= 30) {
          signal = 'Bearish';
          color = 'rose';
        } else {
          signal = 'Strongly Bearish';
          color = 'rose';
        }

        insights.push({
          name: 'BTC Price Trend',
          value: Math.round(priceTrendValue),
          signal,
          confidence: priceTrendValue > 80 || priceTrendValue < 20 ? 'High' : 'Medium',
          color,
          interpretation: `Bitcoin ${priceChange24h >= 0 ? 'up' : 'down'} ${Math.abs(priceChange24h).toFixed(2)}% in the last 24h with ${marketData.bitcoin.volume_24h.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} in volume.`
        });
      }

      // Market Sentiment insight based on news sentiment
      if (news.length > 0) {
        const sentimentCounts = {
          positive: news.filter(item => item.sentiment === 'positive').length,
          negative: news.filter(item => item.sentiment === 'negative').length,
          neutral: news.filter(item => item.sentiment === 'neutral').length
        };

        const totalNews = news.length;
        const sentimentScore = ((sentimentCounts.positive * 100) + (sentimentCounts.neutral * 50)) / totalNews;

        let signal, color;
        if (sentimentScore >= 70) {
          signal = 'Very Positive';
          color = 'emerald';
        } else if (sentimentScore >= 55) {
          signal = 'Positive';
          color = 'emerald';
        } else if (sentimentScore >= 45) {
          signal = 'Neutral';
          color = 'blue';
        } else if (sentimentScore >= 30) {
          signal = 'Negative';
          color = 'rose';
        } else {
          signal = 'Very Negative';
          color = 'rose';
        }

        insights.push({
          name: 'Market Sentiment',
          value: Math.round(sentimentScore),
          signal,
          confidence: Math.abs(sentimentScore - 50) > 20 ? 'High' : 'Medium',
          color,
          interpretation: `Analysis of ${totalNews} news articles shows ${sentimentCounts.positive} positive, ${sentimentCounts.negative} negative, and ${sentimentCounts.neutral} neutral stories.`
        });
      }

      // ETF Flow insight based on ETF data
      if (marketData.etf) {
        const dailyInflow = marketData.etf.daily_inflow;
        const totalAum = marketData.etf.total_aum;

        // Calculate as percentage of AUM
        const inflowPercentage = (dailyInflow / totalAum) * 100;

        // Convert to a 0-100 scale
        let etfFlowValue = 50 + (inflowPercentage * 1000); // Each 0.1% adds 10 points

        // Ensure value is within 0-100 range
        etfFlowValue = Math.max(0, Math.min(100, etfFlowValue));

        let signal, color;
        if (etfFlowValue >= 70) {
          signal = 'Strong Inflow';
          color = 'emerald';
        } else if (etfFlowValue >= 55) {
          signal = 'Moderate Inflow';
          color = 'emerald';
        } else if (etfFlowValue >= 45) {
          signal = 'Neutral Flow';
          color = 'blue';
        } else if (etfFlowValue >= 30) {
          signal = 'Moderate Outflow';
          color = 'rose';
        } else {
          signal = 'Strong Outflow';
          color = 'rose';
        }

        insights.push({
          name: 'ETF Flow Analysis',
          value: Math.round(etfFlowValue),
          signal,
          confidence: Math.abs(inflowPercentage) > 0.2 ? 'High' : 'Medium',
          color,
          interpretation: `Bitcoin ETFs saw ${dailyInflow >= 0 ? 'inflows' : 'outflows'} of ${Math.abs(dailyInflow).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} in the last 24h.`
        });
      }

      // Add neural metrics from trading data if available
      if (tradingData && tradingData.neuralMetrics && tradingData.neuralMetrics.length > 0) {
        tradingData.neuralMetrics.forEach(metric => {
          let color;
          if (metric.trend === 'Up') {
            color = 'emerald';
          } else if (metric.trend === 'Down') {
            color = 'rose';
          } else {
            color = 'blue';
          }

          insights.push({
            name: metric.name,
            value: metric.value,
            signal: metric.trend === 'Up' ? 'Bullish' : metric.trend === 'Down' ? 'Bearish' : 'Neutral',
            confidence: metric.confidence > 80 ? 'High' : metric.confidence > 60 ? 'Medium' : 'Low',
            color,
            interpretation: metric.interpretation
          });
        });
      }

      // If we have enough insights, return them, otherwise use defaults
      return insights.length >= 3 ? insights : defaultInsights;
    }

    return defaultInsights;
  }, [marketData, news, tradingData]);

  // Calculate overall sentiment
  const overallSentiment = useMemo(() => {
    if (neuralInsights.length === 0) return { text: 'Neutral', color: 'blue' };

    const averageValue = neuralInsights.reduce((sum, insight) => sum + insight.value, 0) / neuralInsights.length;

    if (averageValue >= 70) return { text: 'Strongly Bullish', color: 'emerald' };
    if (averageValue >= 60) return { text: 'Bullish', color: 'emerald' };
    if (averageValue >= 50) return { text: 'Slightly Bullish', color: 'emerald' };
    if (averageValue >= 40) return { text: 'Neutral', color: 'blue' };
    if (averageValue >= 30) return { text: 'Slightly Bearish', color: 'amber' };
    if (averageValue >= 20) return { text: 'Bearish', color: 'rose' };
    return { text: 'Strongly Bearish', color: 'rose' };
  }, [neuralInsights]);

  // Get relevant news based on insights
  const relevantNews = useMemo(() => {
    if (news.length === 0) return [];

    // Get keywords from insights
    const keywords = neuralInsights.flatMap(insight => {
      const words = insight.name.split(' ').concat(insight.interpretation.split(' '));
      return words.filter(word => word.length > 3).map(word => word.toLowerCase());
    });

    // Filter and score news based on relevance to insights
    return news
      .map(item => {
        const text = (item.title + ' ' + item.description).toLowerCase();
        const score = keywords.reduce((sum, keyword) => {
          return sum + (text.includes(keyword) ? 1 : 0);
        }, 0);
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [news, neuralInsights]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hr ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Return null during SSR to avoid hydration issues
  if (!mounted) return null;

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 border border-blue-500/30">
            <RiBrainLine className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <Title className="text-white text-xl">Neural Network Insights</Title>
            <Text className="text-xs text-gray-400">
              {tradingData?.lastUpdated ? `Last updated: ${new Date(tradingData.lastUpdated).toLocaleTimeString()}` : 'Real-time analysis'}
            </Text>
          </div>
        </div>
        <div className="flex items-center">
          <Badge color="blue" className="mr-2 animate-pulse">Real-time Analysis</Badge>
          <button
            onClick={() => refreshTradingData()}
            className="p-2 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
          >
            <RiRefreshLine className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <Text className="text-white font-medium">Overall Market Sentiment</Text>
          <Badge color={overallSentiment.color as any}>
            {overallSentiment.text}
          </Badge>
        </div>
        <ProgressBar
          value={neuralInsights.reduce((sum, insight) => sum + insight.value, 0) / neuralInsights.length}
          color={overallSentiment.color as any}
          className="mt-1"
        />
        <div className="flex justify-between items-center mt-1">
          <Text className="text-xs text-gray-500">Bearish</Text>
          <Text className="text-xs text-gray-500">Neutral</Text>
          <Text className="text-xs text-gray-500">Bullish</Text>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {neuralInsights.map((insight, index) => (
          <div key={index} className="bg-blue-500/10 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                {index % 2 === 0 ? (
                  <RiPulseLine className="w-4 h-4 text-blue-400 mr-2" />
                ) : (
                  <RiRadarLine className="w-4 h-4 text-blue-400 mr-2" />
                )}
                <span className="text-sm font-medium text-white">{insight.name}</span>
              </div>
              <span className={`text-xs font-medium text-${insight.color}-400`}>{insight.signal}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`bg-${insight.color}-500 h-2 rounded-full`}
                style={{ width: `${insight.value}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">Confidence: {insight.confidence}</span>
              <span className="text-xs text-white">{insight.value}%</span>
            </div>
            <Text className="text-xs text-gray-400 mt-2">{insight.interpretation}</Text>
          </div>
        ))}
      </div>

      {relevantNews.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center mb-2">
            <RiNewspaperLine className="w-4 h-4 text-blue-400 mr-2" />
            <Text className="text-white font-medium">Related News</Text>
          </div>
          <div className="space-y-2">
            {relevantNews.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-blue-500/10 rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <Text className="text-sm text-white font-medium line-clamp-1">{item.title}</Text>
                  <Badge
                    color={
                      item.sentiment === 'positive' ? 'emerald' :
                      item.sentiment === 'negative' ? 'rose' :
                      'blue'
                    }
                    size="xs"
                    className="ml-2 whitespace-nowrap"
                  >
                    {item.sentiment === 'positive' ? (
                      <div className="flex items-center">
                        <RiArrowUpSLine className="mr-1" />
                        Bullish
                      </div>
                    ) : item.sentiment === 'negative' ? (
                      <div className="flex items-center">
                        <RiArrowDownSLine className="mr-1" />
                        Bearish
                      </div>
                    ) : (
                      'Neutral'
                    )}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <span className="mr-2">{item.source}</span>
                  <span>{formatDate(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <Text className="text-sm text-white/80 mt-4">
        Our neural engine currently detects a <span className={`font-bold text-${overallSentiment.color}-400`}>{overallSentiment.text.toLowerCase()}</span> bias.
        Signals are updated in real time based on on-chain data, market metrics, and news sentiment analysis.
      </Text>

      <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <Text className="text-xs text-rose-300 font-bold">RISK DISCLAIMER:</Text>
        <Text className="text-xs text-gray-400 mt-1">
          The neural insights provided are based on algorithmic analysis and should not be considered as financial advice.
          These indicators are experimental and may not accurately predict market movements. Always conduct your own
          research before making investment decisions.
        </Text>
      </div>
    </Card>
  )
}
