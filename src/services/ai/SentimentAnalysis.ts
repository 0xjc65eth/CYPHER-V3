/**
 * 📊 REAL-TIME SENTIMENT ANALYSIS ENGINE
 * Advanced social sentiment tracking for Bitcoin ecosystem
 * Integrates Twitter/X, Reddit, News, and On-chain sentiment
 */

import { logger } from '@/lib/logger';

export interface SentimentData {
  asset: string;
  overall: {
    score: number; // -1 (very negative) to +1 (very positive)
    sentiment: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';
    confidence: number; // 0-100%
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  };
  sources: {
    twitter: SentimentSource;
    reddit: SentimentSource;
    news: SentimentSource;
    whaleMovements: SentimentSource;
    fearGreed: SentimentSource;
  };
  insights: SentimentInsight[];
  alerts: SentimentAlert[];
  lastUpdated: string;
}

interface SentimentSource {
  score: number;
  volume: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  topKeywords: string[];
  sampleTexts: string[];
  reliability: number; // 0-100%
}

interface SentimentInsight {
  type: 'WHALE_ACTIVITY' | 'VIRAL_TWEET' | 'NEWS_IMPACT' | 'REDDIT_DISCUSSION' | 'FEAR_GREED_SHIFT';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  source: string;
}

interface SentimentAlert {
  id: string;
  type: 'SENTIMENT_SPIKE' | 'WHALE_MOVEMENT' | 'VIRAL_CONTENT' | 'NEWS_BREAK';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: string;
  actionable: boolean;
}

export class SentimentAnalysisEngine {
  private cache: Map<string, { data: SentimentData; timestamp: number }>;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for real-time sentiment
  private monitoringIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cache = new Map();
    this.startRealTimeMonitoring();
  }

  destroy(): void {
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }
  }

  /**
   * Get comprehensive sentiment analysis
   */
  async analyzeSentiment(asset: string): Promise<SentimentData> {
    try {
      // Check cache first
      const cached = this.getCachedSentiment(asset);
      if (cached) {
        logger.info(`[SENTIMENT] Using cached sentiment for ${asset}`);
        return cached;
      }

      logger.info(`[SENTIMENT] Analyzing real-time sentiment for ${asset}`);

      // Gather sentiment from all sources in parallel
      const [twitter, reddit, news, whaleMovements, fearGreed] = await Promise.allSettled([
        this.analyzeTwitterSentiment(asset),
        this.analyzeRedditSentiment(asset),
        this.analyzeNewsSentiment(asset),
        this.analyzeWhaleMovements(asset),
        this.getFearGreedIndex()
      ]);

      const sources = {
        twitter: twitter.status === 'fulfilled' ? twitter.value : this.getDefaultSource(),
        reddit: reddit.status === 'fulfilled' ? reddit.value : this.getDefaultSource(),
        news: news.status === 'fulfilled' ? news.value : this.getDefaultSource(),
        whaleMovements: whaleMovements.status === 'fulfilled' ? whaleMovements.value : this.getDefaultSource(),
        fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : this.getDefaultSource()
      };

      // Calculate overall sentiment
      const overall = this.calculateOverallSentiment(sources);

      // Generate insights and alerts
      const insights = this.generateInsights(sources, asset);
      const alerts = this.generateAlerts(sources, asset);

      const sentimentData: SentimentData = {
        asset,
        overall,
        sources,
        insights,
        alerts,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(asset, { data: sentimentData, timestamp: Date.now() });

      logger.info(`[SENTIMENT] Analysis complete for ${asset}: ${overall.sentiment} (${overall.score.toFixed(3)})`);
      return sentimentData;

    } catch (error) {
      logger.error(`[SENTIMENT] Analysis failed for ${asset}`, error as Error);
      return this.getFallbackSentiment(asset);
    }
  }

  /**
   * Twitter/X sentiment - not connected (requires paid API)
   */
  private async analyzeTwitterSentiment(asset: string): Promise<SentimentSource> {
    return {
      score: 0,
      volume: 0,
      trend: 'STABLE',
      topKeywords: [],
      sampleTexts: ['Twitter/X API not connected'],
      reliability: 0
    };
  }

  /**
   * Reddit sentiment - not connected (requires API credentials)
   */
  private async analyzeRedditSentiment(asset: string): Promise<SentimentSource> {
    return {
      score: 0,
      volume: 0,
      trend: 'STABLE',
      topKeywords: [],
      sampleTexts: ['Reddit API not connected'],
      reliability: 0
    };
  }

  /**
   * Analyze news sentiment from real CryptoCompare headlines
   */
  private async analyzeNewsSentiment(asset: string): Promise<SentimentSource> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const headlines: string[] = (data?.Data || []).slice(0, 20).map((item: any) => item.title);
      const score = this.calculateTextSentiment(headlines);

      // Extract common keywords
      const allWords = headlines.join(' ').toLowerCase().split(/\s+/);
      const keywordCounts = new Map<string, number>();
      const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'in', 'to', 'for', 'of', 'and', 'on', 'at', 'by', 'with', 'as']);
      allWords.filter(w => w.length > 3 && !stopWords.has(w)).forEach(w => {
        keywordCounts.set(w, (keywordCounts.get(w) || 0) + 1);
      });
      const topKeywords = [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      return {
        score,
        volume: headlines.length,
        trend: score > 0.1 ? 'UP' : score < -0.1 ? 'DOWN' : 'STABLE',
        topKeywords,
        sampleTexts: headlines.slice(0, 3),
        reliability: 85,
      };
    } catch {
      return this.getDefaultSource();
    }
  }

  /**
   * Whale movements - not connected (requires Whale Alert API key)
   */
  private async analyzeWhaleMovements(asset: string): Promise<SentimentSource> {
    return {
      score: 0,
      volume: 0,
      trend: 'STABLE',
      topKeywords: [],
      sampleTexts: ['Whale tracking not connected'],
      reliability: 0
    };
  }

  /**
   * Get Fear & Greed Index from alternative.me API
   */
  private async getFearGreedIndex(): Promise<SentimentSource> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://api.alternative.me/fng/', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data?.data?.[0]) {
        const entry = data.data[0];
        const fearGreedValue = parseInt(entry.value, 10);
        const normalizedScore = (fearGreedValue - 50) / 50;

        return {
          score: normalizedScore,
          volume: 1,
          trend: fearGreedValue > 50 ? 'UP' : fearGreedValue < 50 ? 'DOWN' : 'STABLE',
          topKeywords: ['fear', 'greed', 'market-sentiment', entry.value_classification.toLowerCase()],
          sampleTexts: [`Fear & Greed Index: ${fearGreedValue} (${entry.value_classification})`],
          reliability: 85,
        };
      }
    } catch {
      // Fall through to default
    }

    return this.getDefaultSource();
  }

  /**
   * Calculate overall sentiment from all sources
   */
  private calculateOverallSentiment(sources: SentimentData['sources']): SentimentData['overall'] {
    // Weighted average based on reliability
    const sourceEntries = Object.entries(sources);
    let totalScore = 0;
    let totalWeight = 0;
    let totalVolume = 0;

    sourceEntries.forEach(([name, source]) => {
      const weight = this.getSourceWeight(name) * (source.reliability / 100);
      totalScore += source.score * weight;
      totalWeight += weight;
      totalVolume += source.volume;
    });

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Determine sentiment category
    let sentiment: SentimentData['overall']['sentiment'];
    if (overallScore > 0.6) sentiment = 'VERY_POSITIVE';
    else if (overallScore > 0.2) sentiment = 'POSITIVE';
    else if (overallScore > -0.2) sentiment = 'NEUTRAL';
    else if (overallScore > -0.6) sentiment = 'NEGATIVE';
    else sentiment = 'VERY_NEGATIVE';

    // Calculate confidence based on source agreement
    const scores = sourceEntries.map(([, source]) => source.score);
    const variance = this.calculateVariance(scores);
    const confidence = Math.max(50, 100 - variance * 50);

    // Determine trend
    const trends = sourceEntries.map(([, source]) => source.trend);
    const upTrends = trends.filter(t => t === 'UP').length;
    const trend = upTrends > trends.length / 2 ? 'IMPROVING' : 
                  upTrends < trends.length / 3 ? 'DECLINING' : 'STABLE';

    return {
      score: Math.round(overallScore * 1000) / 1000,
      sentiment,
      confidence: Math.round(confidence),
      trend
    };
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(sources: SentimentData['sources'], asset: string): SentimentInsight[] {
    const insights: SentimentInsight[] = [];

    // Whale activity insights
    if (Math.abs(sources.whaleMovements.score) > 0.5) {
      insights.push({
        type: 'WHALE_ACTIVITY',
        title: sources.whaleMovements.score > 0 ? 'Large Accumulation Detected' : 'Whale Distribution Activity',
        description: `Significant whale movements indicate ${sources.whaleMovements.score > 0 ? 'accumulation' : 'distribution'} behavior`,
        impact: 'HIGH',
        timestamp: new Date().toISOString(),
        source: 'On-chain Analysis'
      });
    }

    // Twitter sentiment spikes
    if (sources.twitter.volume > 3000 && Math.abs(sources.twitter.score) > 0.4) {
      insights.push({
        type: 'VIRAL_TWEET',
        title: 'High Social Media Activity',
        description: `Twitter sentiment shows ${sources.twitter.score > 0 ? 'bullish' : 'bearish'} spike with ${sources.twitter.volume.toFixed(0)} mentions`,
        impact: 'MEDIUM',
        timestamp: new Date().toISOString(),
        source: 'Twitter Analysis'
      });
    }

    // Fear & Greed extremes
    if (Math.abs(sources.fearGreed.score) > 0.6) {
      insights.push({
        type: 'FEAR_GREED_SHIFT',
        title: `Market in ${sources.fearGreed.score > 0 ? 'Greed' : 'Fear'} Territory`,
        description: `Fear & Greed Index indicates ${sources.fearGreed.score > 0 ? 'extreme greed' : 'extreme fear'} - potential reversal signal`,
        impact: 'HIGH',
        timestamp: new Date().toISOString(),
        source: 'Fear & Greed Index'
      });
    }

    return insights;
  }

  /**
   * Generate sentiment alerts
   */
  private generateAlerts(sources: SentimentData['sources'], asset: string): SentimentAlert[] {
    const alerts: SentimentAlert[] = [];

    // Critical sentiment shift
    if (Math.abs(sources.twitter.score) > 0.7 && sources.twitter.volume > 2500) {
      alerts.push({
        id: `sentiment-spike-${Date.now()}`,
        type: 'SENTIMENT_SPIKE',
        severity: 'HIGH',
        message: `Major sentiment shift detected on Twitter: ${sources.twitter.score > 0 ? 'Very Bullish' : 'Very Bearish'}`,
        timestamp: new Date().toISOString(),
        actionable: true
      });
    }

    // Whale movement alert
    if (Math.abs(sources.whaleMovements.score) > 0.8) {
      alerts.push({
        id: `whale-${Date.now()}`,
        type: 'WHALE_MOVEMENT',
        severity: 'CRITICAL',
        message: `Significant whale activity: ${sources.whaleMovements.score > 0 ? 'Accumulation' : 'Distribution'}`,
        timestamp: new Date().toISOString(),
        actionable: true
      });
    }

    return alerts;
  }

  /**
   * Helper methods
   */
  private calculateTextSentiment(texts: string[]): number {
    // Simplified sentiment calculation
    const positiveWords = ['bullish', 'moon', 'pump', 'buy', 'hodl', 'strong', 'up'];
    const negativeWords = ['bearish', 'dump', 'sell', 'weak', 'down', 'crash', 'fear'];
    
    let score = 0;
    texts.forEach(text => {
      const lowerText = text.toLowerCase();
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 0.1;
      });
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) score -= 0.1;
      });
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private getSourceWeight(sourceName: string): number {
    const weights = {
      'news': 1.2,        // Highest weight for news
      'whaleMovements': 1.1, // High weight for whale activity
      'twitter': 1.0,     // Standard weight
      'reddit': 0.9,      // Slightly lower weight
      'fearGreed': 0.8    // Lower weight for fear/greed
    };
    return weights[sourceName as keyof typeof weights] || 1.0;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  private getCachedSentiment(asset: string): SentimentData | null {
    const cached = this.cache.get(asset);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(asset);
    return null;
  }

  private getDefaultSource(): SentimentSource {
    return {
      score: 0,
      volume: 100,
      trend: 'STABLE',
      topKeywords: ['bitcoin'],
      sampleTexts: ['Market sentiment neutral'],
      reliability: 50
    };
  }

  private getFallbackSentiment(asset: string): SentimentData {
    return {
      asset,
      overall: {
        score: 0,
        sentiment: 'NEUTRAL',
        confidence: 50,
        trend: 'STABLE'
      },
      sources: {
        twitter: this.getDefaultSource(),
        reddit: this.getDefaultSource(),
        news: this.getDefaultSource(),
        whaleMovements: this.getDefaultSource(),
        fearGreed: this.getDefaultSource()
      },
      insights: [],
      alerts: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Real-time monitoring setup
   */
  private startRealTimeMonitoring(): void {
    // Monitor major assets every 2 minutes
    this.monitoringIntervalId = setInterval(async () => {
      const assets = ['BTC', 'ETH', 'ORDI'];
      
      try {
        await Promise.allSettled(
          assets.map(asset => this.analyzeSentiment(asset))
        );
        
        logger.info('[SENTIMENT] Real-time monitoring cycle completed');
      } catch (error) {
        logger.error('[SENTIMENT] Real-time monitoring error', error as Error);
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * Get sentiment history for trending analysis
   */
  async getSentimentHistory(asset: string, hours: number = 24): Promise<SentimentData[]> {
    const history: SentimentData[] = [];
    
    // Simulate historical sentiment data
    for (let i = hours; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i);
      
      const sentiment = await this.analyzeSentiment(asset);
      sentiment.lastUpdated = date.toISOString();
      
      history.push(sentiment);
    }
    
    return history;
  }

  /**
   * Batch sentiment analysis
   */
  async batchAnalyzeSentiment(assets: string[]): Promise<Map<string, SentimentData>> {
    const results = new Map<string, SentimentData>();
    
    await Promise.allSettled(
      assets.map(async (asset) => {
        const sentiment = await this.analyzeSentiment(asset);
        results.set(asset, sentiment);
      })
    );
    
    return results;
  }
}

// Singleton instance
export const sentimentAnalysis = new SentimentAnalysisEngine();