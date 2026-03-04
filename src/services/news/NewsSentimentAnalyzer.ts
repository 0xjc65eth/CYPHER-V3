/**
 * News Sentiment Analysis Engine for CYPHER ORDi Future V3
 * Real-time news aggregation, sentiment analysis, and market impact assessment
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// News and Sentiment Types
export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  source: NewsSource;
  author?: string;
  publishedAt: number;
  fetchedAt: number;
  language: string;
  categories: string[];
  mentions: AssetMention[];
  sentiment: SentimentScore;
  credibility: CredibilityScore;
  impact: MarketImpact;
  social: SocialMetrics;
  metadata: {
    wordCount: number;
    readingTime: number;
    images: string[];
    tags: string[];
  };
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: 'news' | 'blog' | 'social' | 'official' | 'forum' | 'podcast';
  credibilityRating: number; // 0-100
  bias: 'left' | 'center' | 'right' | 'neutral';
  focus: string[]; // ['crypto', 'finance', 'tech', etc.]
  language: string;
  followers: number;
  averageArticleQuality: number;
  isVerified: boolean;
  lastCrawled: number;
  crawlFrequency: number; // minutes
}

export interface AssetMention {
  symbol: string;
  name: string;
  context: 'positive' | 'negative' | 'neutral' | 'mixed';
  frequency: number;
  positions: { start: number; end: number; text: string }[];
  sentiment: number; // -1 to 1
  relevance: number; // 0-1
}

export interface SentimentScore {
  overall: number; // -1 to 1
  confidence: number; // 0-1
  aspects: {
    financial: number;
    technological: number;
    regulatory: number;
    adoption: number;
    security: number;
  };
  emotions: {
    fear: number;
    greed: number;
    uncertainty: number;
    optimism: number;
    excitement: number;
  };
  keywords: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
}

export interface CredibilityScore {
  overall: number; // 0-1
  factors: {
    sourceReliability: number;
    authorExpertise: number;
    factualAccuracy: number;
    citationQuality: number;
    recency: number;
  };
  warnings: string[];
  verified: boolean;
}

export interface MarketImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeframe: 'immediate' | 'short' | 'medium' | 'long';
  affectedAssets: string[];
  priceMovementPrediction: {
    asset: string;
    direction: 'up' | 'down' | 'neutral';
    magnitude: number; // percentage
    probability: number; // 0-1
  }[];
  tradingVolumePrediction: number; // percentage increase
  volatilityImpact: number; // 0-1
}

export interface SocialMetrics {
  shares: number;
  likes: number;
  comments: number;
  mentions: number;
  reach: number;
  engagement: number;
  virality: number; // 0-1
  platforms: Record<string, {
    shares: number;
    engagement: number;
    sentiment: number;
  }>;
}

export interface SentimentTrend {
  asset: string;
  timeframe: '1h' | '4h' | '24h' | '7d' | '30d';
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-1
  momentum: number; // -1 to 1
  dataPoints: {
    timestamp: number;
    sentiment: number;
    volume: number;
    sources: number;
  }[];
  signals: TradingSignal[];
}

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold' | 'watch';
  strength: number; // 0-1
  timeframe: string;
  reasoning: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  stopLoss?: number;
  takeProfit?: number;
}

export interface NewsAlert {
  id: string;
  type: 'breaking' | 'sentiment_shift' | 'volume_spike' | 'mention_surge';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  affectedAssets: string[];
  timestamp: number;
  expiresAt?: number;
  actionable: boolean;
  relatedArticles: string[];
}

export interface SentimentMetrics {
  overall: {
    bullish: number;
    bearish: number;
    neutral: number;
    fearGreedIndex: number;
  };
  byAsset: Record<string, {
    sentiment: number;
    mentions: number;
    trend: string;
    confidence: number;
  }>;
  bySource: Record<string, {
    sentiment: number;
    articles: number;
    credibility: number;
  }>;
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export class NewsSentimentAnalyzer extends EventEmitter {
  private logger: EnhancedLogger;
  private articles: Map<string, NewsArticle> = new Map();
  private sources: Map<string, NewsSource> = new Map();
  private sentimentTrends: Map<string, SentimentTrend[]> = new Map();
  private alerts: Map<string, NewsAlert> = new Map();
  private keywordBank: Map<string, { sentiment: number; weight: number }> = new Map();

  // Analysis parameters
  private readonly SENTIMENT_THRESHOLD = 0.1;
  private readonly IMPACT_THRESHOLD = 0.3;
  private readonly CREDIBILITY_THRESHOLD = 0.7;
  private readonly MAX_ARTICLES_CACHE = 10000;

  // Supported languages for sentiment analysis
  private readonly SUPPORTED_LANGUAGES = ['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'zh'];

  // News sources configuration
  private readonly NEWS_SOURCES = [
    'coindesk', 'cointelegraph', 'decrypt', 'theblock', 'cryptoslate',
    'bitcoinmagazine', 'cryptopotato', 'news.bitcoin.com', 'ambcrypto',
    'cryptonews', 'u.today', 'cryptobriefing'
  ];

  // Social platforms for sentiment tracking
  private readonly SOCIAL_PLATFORMS = [
    'twitter', 'reddit', 'telegram', 'discord', 'youtube', 'medium'
  ];

  constructor() {
    super();
    this.logger = new EnhancedLogger();

    this.logger.info('News Sentiment Analyzer initialized', {
      component: 'NewsSentimentAnalyzer',
      supportedLanguages: this.SUPPORTED_LANGUAGES.length,
      newsSources: this.NEWS_SOURCES.length
    });
  }

  /**
   * Initialize news sentiment analyzer
   */
  async initialize(): Promise<void> {
    try {
      // Initialize news sources
      await this.initializeNewsSources();

      // Load sentiment keywords
      await this.loadSentimentKeywords();

      // Start news crawlers
      this.startNewsCrawlers();

      // Start sentiment analysis processor
      this.startSentimentProcessor();

      // Start trend analyzer
      this.startTrendAnalyzer();

      // Start alert system
      this.startAlertSystem();

      this.logger.info('News Sentiment Analyzer initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize News Sentiment Analyzer:');
      throw error;
    }
  }

  /**
   * Analyze sentiment of text content
   */
  async analyzeSentiment(
    text: string,
    language: string = 'en',
    context?: string
  ): Promise<SentimentScore> {
    try {
      // Clean and preprocess text
      const cleanText = this.preprocessText(text);
      
      // Extract keywords and phrases
      const keywords = this.extractKeywords(cleanText);
      
      // Calculate sentiment scores
      const sentimentScores = await this.calculateSentimentScores(keywords, language);
      
      // Analyze aspects and emotions
      const aspects = this.analyzeAspects(cleanText, keywords);
      const emotions = this.analyzeEmotions(cleanText, keywords);
      
      // Calculate confidence based on keyword matches and text length
      const confidence = this.calculateSentimentConfidence(keywords, cleanText.length);

      const sentiment: SentimentScore = {
        overall: sentimentScores.overall,
        confidence,
        aspects,
        emotions,
        keywords: {
          positive: keywords.filter(k => this.getKeywordSentiment(k) > 0.1),
          negative: keywords.filter(k => this.getKeywordSentiment(k) < -0.1),
          neutral: keywords.filter(k => Math.abs(this.getKeywordSentiment(k)) <= 0.1)
        }
      };

      return sentiment;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze sentiment:');
      throw error;
    }
  }

  /**
   * Process and store news article
   */
  async processArticle(
    title: string,
    content: string,
    url: string,
    sourceId: string,
    publishedAt?: number
  ): Promise<NewsArticle> {
    try {
      const source = this.sources.get(sourceId);
      if (!source) {
        throw new Error(`News source ${sourceId} not found`);
      }

      // Generate article summary
      const summary = this.generateSummary(content);

      // Detect language
      const language = this.detectLanguage(content);

      // Extract asset mentions
      const mentions = this.extractAssetMentions(title + ' ' + content);

      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(title + ' ' + content, language);

      // Calculate credibility
      const credibility = this.calculateCredibility(source, content, publishedAt);

      // Assess market impact
      const impact = this.assessMarketImpact(mentions, sentiment);

      // Extract categories
      const categories = this.extractCategories(content);

      const article: NewsArticle = {
        id: this.generateArticleId(),
        title,
        content,
        summary,
        url,
        source,
        publishedAt: publishedAt || Date.now(),
        fetchedAt: Date.now(),
        language,
        categories,
        mentions,
        sentiment,
        credibility,
        impact,
        social: {
          shares: 0,
          likes: 0,
          comments: 0,
          mentions: 0,
          reach: 0,
          engagement: 0,
          virality: 0,
          platforms: {}
        },
        metadata: {
          wordCount: content.split(' ').length,
          readingTime: Math.ceil(content.split(' ').length / 200), // 200 WPM
          images: this.extractImageUrls(content),
          tags: this.extractTags(content)
        }
      };

      // Store article
      this.articles.set(article.id, article);

      // Update sentiment trends
      this.updateSentimentTrends(article);

      // Check for alerts
      this.checkForAlerts(article);

      this.logger.info('Article processed', {
        articleId: article.id,
        sourceId,
        sentiment: sentiment.overall,
        mentions: mentions.length,
        impact: impact.severity
      });

      this.emit('articleProcessed', article);
      return article;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to process article:');
      throw error;
    }
  }

  /**
   * Get sentiment trends for an asset
   */
  getSentimentTrends(
    asset: string,
    timeframe: '1h' | '4h' | '24h' | '7d' | '30d' = '24h'
  ): SentimentTrend | null {
    const trends = this.sentimentTrends.get(asset);
    return trends?.find(trend => trend.timeframe === timeframe) || null;
  }

  /**
   * Get latest news articles
   */
  getLatestNews(
    limit: number = 50,
    filters?: {
      asset?: string;
      category?: string;
      source?: string;
      minCredibility?: number;
      minImpact?: string;
      language?: string;
    }
  ): NewsArticle[] {
    let articles = Array.from(this.articles.values());

    // Apply filters
    if (filters) {
      if (filters.asset) {
        articles = articles.filter(article => 
          article.mentions.some(mention => mention.symbol === filters.asset)
        );
      }
      if (filters.category) {
        articles = articles.filter(article => 
          article.categories.includes(filters.category!)
        );
      }
      if (filters.source) {
        articles = articles.filter(article => article.source.id === filters.source);
      }
      if (filters.minCredibility) {
        articles = articles.filter(article => 
          article.credibility.overall >= filters.minCredibility!
        );
      }
      if (filters.minImpact) {
        const impactLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const minLevel = impactLevels[filters.minImpact as keyof typeof impactLevels];
        articles = articles.filter(article => 
          impactLevels[article.impact.severity] >= minLevel
        );
      }
      if (filters.language) {
        articles = articles.filter(article => article.language === filters.language);
      }
    }

    // Sort by published date and limit
    return articles
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): NewsAlert[] {
    const now = Date.now();
    return Array.from(this.alerts.values())
      .filter(alert => !alert.expiresAt || alert.expiresAt > now)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get sentiment metrics
   */
  getSentimentMetrics(): SentimentMetrics {
    const articles = Array.from(this.articles.values());
    const recentArticles = articles.filter(a => Date.now() - a.publishedAt < 24 * 60 * 60 * 1000);

    // Calculate overall sentiment
    const sentiments = recentArticles.map(a => a.sentiment.overall);
    const bullish = sentiments.filter(s => s > 0.1).length / sentiments.length;
    const bearish = sentiments.filter(s => s < -0.1).length / sentiments.length;
    const neutral = 1 - bullish - bearish;

    // Calculate Fear & Greed Index (0-100)
    const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    const fearGreedIndex = Math.max(0, Math.min(100, (avgSentiment + 1) * 50));

    // Calculate by asset
    const byAsset: Record<string, any> = {};
    const assetMentions = new Map<string, { sentiment: number; count: number }>();

    for (const article of recentArticles) {
      for (const mention of article.mentions) {
        const existing = assetMentions.get(mention.symbol) || { sentiment: 0, count: 0 };
        existing.sentiment += mention.sentiment;
        existing.count += 1;
        assetMentions.set(mention.symbol, existing);
      }
    }

    for (const [asset, data] of assetMentions) {
      byAsset[asset] = {
        sentiment: data.sentiment / data.count,
        mentions: data.count,
        trend: this.calculateTrend(asset),
        confidence: Math.min(1, data.count / 10) // More mentions = higher confidence
      };
    }

    // Calculate by source
    const bySource: Record<string, any> = {};
    const sourceData = new Map<string, { sentiment: number; count: number; credibility: number }>();

    for (const article of recentArticles) {
      const sourceId = article.source.id;
      const existing = sourceData.get(sourceId) || { sentiment: 0, count: 0, credibility: 0 };
      existing.sentiment += article.sentiment.overall;
      existing.count += 1;
      existing.credibility = article.source.credibilityRating;
      sourceData.set(sourceId, existing);
    }

    for (const [sourceId, data] of sourceData) {
      bySource[sourceId] = {
        sentiment: data.sentiment / data.count,
        articles: data.count,
        credibility: data.credibility / 100
      };
    }

    return {
      overall: {
        bullish,
        bearish,
        neutral,
        fearGreedIndex
      },
      byAsset,
      bySource,
      trends: {
        hourly: this.calculateHourlyTrends(),
        daily: this.calculateDailyTrends(),
        weekly: this.calculateWeeklyTrends()
      }
    };
  }

  /**
   * Private methods
   */

  private async initializeNewsSources(): Promise<void> {
    const mockSources: NewsSource[] = [
      {
        id: 'coindesk',
        name: 'CoinDesk',
        url: 'https://www.coindesk.com',
        type: 'news',
        credibilityRating: 90,
        bias: 'center',
        focus: ['crypto', 'blockchain', 'finance'],
        language: 'en',
        followers: 2500000,
        averageArticleQuality: 85,
        isVerified: true,
        lastCrawled: Date.now(),
        crawlFrequency: 15
      },
      {
        id: 'cointelegraph',
        name: 'Cointelegraph',
        url: 'https://cointelegraph.com',
        type: 'news',
        credibilityRating: 85,
        bias: 'center',
        focus: ['crypto', 'blockchain', 'tech'],
        language: 'en',
        followers: 2000000,
        averageArticleQuality: 80,
        isVerified: true,
        lastCrawled: Date.now(),
        crawlFrequency: 10
      }
    ];

    for (const source of mockSources) {
      this.sources.set(source.id, source);
    }

    this.logger.info('News sources initialized', { count: mockSources.length });
  }

  private async loadSentimentKeywords(): Promise<void> {
    // Load predefined sentiment keywords with weights
    const sentimentKeywords = [
      // Positive keywords
      { keyword: 'bullish', sentiment: 0.8, weight: 1.0 },
      { keyword: 'rally', sentiment: 0.7, weight: 0.9 },
      { keyword: 'surge', sentiment: 0.7, weight: 0.9 },
      { keyword: 'breakout', sentiment: 0.6, weight: 0.8 },
      { keyword: 'adoption', sentiment: 0.5, weight: 0.7 },
      { keyword: 'partnership', sentiment: 0.5, weight: 0.6 },
      { keyword: 'innovation', sentiment: 0.4, weight: 0.6 },
      
      // Negative keywords
      { keyword: 'bearish', sentiment: -0.8, weight: 1.0 },
      { keyword: 'crash', sentiment: -0.9, weight: 1.0 },
      { keyword: 'dump', sentiment: -0.7, weight: 0.9 },
      { keyword: 'hack', sentiment: -0.8, weight: 0.9 },
      { keyword: 'regulation', sentiment: -0.4, weight: 0.7 },
      { keyword: 'ban', sentiment: -0.9, weight: 1.0 },
      { keyword: 'scam', sentiment: -0.9, weight: 0.8 },
      
      // Neutral/context-dependent
      { keyword: 'volatility', sentiment: 0.0, weight: 0.5 },
      { keyword: 'trading', sentiment: 0.0, weight: 0.3 },
      { keyword: 'price', sentiment: 0.0, weight: 0.2 }
    ];

    for (const item of sentimentKeywords) {
      this.keywordBank.set(item.keyword.toLowerCase(), {
        sentiment: item.sentiment,
        weight: item.weight
      });
    }

    this.logger.info('Sentiment keywords loaded', { count: sentimentKeywords.length });
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractKeywords(text: string): string[] {
    const words = text.split(' ');
    const keywords: string[] = [];
    
    // Extract single words
    for (const word of words) {
      if (word.length > 3 && this.keywordBank.has(word)) {
        keywords.push(word);
      }
    }

    // Extract bigrams and trigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + ' ' + words[i + 1];
      if (this.keywordBank.has(bigram)) {
        keywords.push(bigram);
      }
      
      if (i < words.length - 2) {
        const trigram = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
        if (this.keywordBank.has(trigram)) {
          keywords.push(trigram);
        }
      }
    }

    return keywords;
  }

  private async calculateSentimentScores(
    keywords: string[],
    language: string
  ): Promise<{ overall: number }> {
    let totalSentiment = 0;
    let totalWeight = 0;

    for (const keyword of keywords) {
      const keywordData = this.keywordBank.get(keyword);
      if (keywordData) {
        totalSentiment += keywordData.sentiment * keywordData.weight;
        totalWeight += keywordData.weight;
      }
    }

    const overall = totalWeight > 0 ? totalSentiment / totalWeight : 0;
    
    // Normalize to -1 to 1 range
    return {
      overall: Math.max(-1, Math.min(1, overall))
    };
  }

  private analyzeAspects(text: string, keywords: string[]): SentimentScore['aspects'] {
    // Default neutral aspects - no real data available
    return {
      financial: 0,
      technological: 0,
      regulatory: 0,
      adoption: 0,
      security: 0
    };
  }

  private analyzeEmotions(text: string, keywords: string[]): SentimentScore['emotions'] {
    // Default neutral emotions - no real data available
    return {
      fear: 0,
      greed: 0,
      uncertainty: 0,
      optimism: 0,
      excitement: 0
    };
  }

  private calculateSentimentConfidence(keywords: string[], textLength: number): number {
    const keywordRatio = keywords.length / Math.max(1, textLength / 10);
    const lengthFactor = Math.min(1, textLength / 500); // Longer text = higher confidence
    return Math.min(1, keywordRatio * 0.7 + lengthFactor * 0.3);
  }

  private getKeywordSentiment(keyword: string): number {
    return this.keywordBank.get(keyword.toLowerCase())?.sentiment || 0;
  }

  private extractAssetMentions(text: string): AssetMention[] {
    const mentions: AssetMention[] = [];
    const cryptoAssets = ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'cardano', 'ada'];
    
    for (const asset of cryptoAssets) {
      const regex = new RegExp(`\\b${asset}\\b`, 'gi');
      const matches = Array.from(text.matchAll(regex));
      
      if (matches.length > 0) {
        mentions.push({
          symbol: asset.toUpperCase(),
          name: asset,
          context: 'neutral',
          frequency: matches.length,
          positions: matches.map(match => ({
            start: match.index!,
            end: match.index! + match[0].length,
            text: match[0]
          })),
          sentiment: 0,
          relevance: Math.min(1, matches.length / 5)
        });
      }
    }

    return mentions;
  }

  private generateSummary(content: string, maxLength: number = 200): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return content.substring(0, maxLength);
    
    // Simple extractive summarization - take first few sentences
    let summary = '';
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) break;
      summary += sentence.trim() + '. ';
    }
    
    return summary.trim() || content.substring(0, maxLength);
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const languagePatterns = {
      en: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
      es: /\b(el|la|y|o|pero|en|de|con|por|para)\b/gi,
      pt: /\b(o|a|e|ou|mas|em|de|com|por|para)\b/gi
    };

    let maxMatches = 0;
    let detectedLang = 'en';

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const matches = (text.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
      }
    }

    return detectedLang;
  }

  private calculateCredibility(
    source: NewsSource,
    content: string,
    publishedAt?: number
  ): CredibilityScore {
    const factors = {
      sourceReliability: source.credibilityRating / 100,
      authorExpertise: 0.8, // Mock - would analyze author background
      factualAccuracy: 0.9, // Mock - would fact-check against sources
      citationQuality: content.includes('http') ? 0.8 : 0.5,
      recency: publishedAt ? Math.max(0, 1 - (Date.now() - publishedAt) / (7 * 24 * 60 * 60 * 1000)) : 0.5
    };

    const overall = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;

    return {
      overall,
      factors,
      warnings: overall < this.CREDIBILITY_THRESHOLD ? ['Low credibility score'] : [],
      verified: source.isVerified && overall > this.CREDIBILITY_THRESHOLD
    };
  }

  private assessMarketImpact(mentions: AssetMention[], sentiment: SentimentScore): MarketImpact {
    const severity = sentiment.confidence > 0.8 && Math.abs(sentiment.overall) > 0.5 ? 'high' : 
                    sentiment.confidence > 0.5 && Math.abs(sentiment.overall) > 0.3 ? 'medium' : 'low';

    const affectedAssets = mentions
      .filter(m => m.relevance > 0.3)
      .map(m => m.symbol);

    const priceMovementPrediction = mentions.map(mention => ({
      asset: mention.symbol,
      direction: mention.sentiment > 0.1 ? 'up' as const : 
                mention.sentiment < -0.1 ? 'down' as const : 'neutral' as const,
      magnitude: Math.abs(mention.sentiment) * 5, // Max 5% predicted movement
      probability: mention.relevance * sentiment.confidence
    }));

    return {
      severity: severity as MarketImpact['severity'],
      timeframe: severity === 'high' ? 'immediate' : 'short',
      affectedAssets,
      priceMovementPrediction,
      tradingVolumePrediction: Math.abs(sentiment.overall) * 20, // Max 20% volume increase
      volatilityImpact: Math.abs(sentiment.overall) * sentiment.confidence
    };
  }

  private extractCategories(content: string): string[] {
    const categories: string[] = [];
    const categoryKeywords = {
      'regulation': ['regulation', 'regulatory', 'sec', 'cftc', 'government'],
      'defi': ['defi', 'decentralized', 'liquidity', 'yield', 'farming'],
      'nft': ['nft', 'non-fungible', 'opensea', 'collectible'],
      'trading': ['trading', 'exchange', 'volume', 'price'],
      'technology': ['blockchain', 'protocol', 'upgrade', 'fork']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
        categories.push(category);
      }
    }

    return categories;
  }

  private extractImageUrls(content: string): string[] {
    const imageRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
    return Array.from(content.matchAll(imageRegex)).map(match => match[0]);
  }

  private extractTags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    return Array.from(content.matchAll(hashtagRegex)).map(match => match[1]);
  }

  private updateSentimentTrends(article: NewsArticle): void {
    for (const mention of article.mentions) {
      const asset = mention.symbol;
      let trends = this.sentimentTrends.get(asset) || [];
      
      // Update or create trend for each timeframe
      const timeframes: Array<'1h' | '4h' | '24h' | '7d' | '30d'> = ['1h', '4h', '24h', '7d', '30d'];
      
      for (const timeframe of timeframes) {
        let trend = trends.find(t => t.timeframe === timeframe);
        if (!trend) {
          trend = {
            asset,
            timeframe,
            trend: 'neutral',
            strength: 0,
            momentum: 0,
            dataPoints: [],
            signals: []
          };
          trends.push(trend);
        }

        // Add new data point
        trend.dataPoints.push({
          timestamp: article.publishedAt,
          sentiment: mention.sentiment,
          volume: 1,
          sources: 1
        });

        // Keep only relevant data points for timeframe
        const cutoffTime = Date.now() - this.getTimeframeMs(timeframe);
        trend.dataPoints = trend.dataPoints.filter(dp => dp.timestamp > cutoffTime);

        // Recalculate trend metrics
        this.recalculateTrendMetrics(trend);
      }

      this.sentimentTrends.set(asset, trends);
    }
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframeMap = {
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return timeframeMap[timeframe as keyof typeof timeframeMap] || 24 * 60 * 60 * 1000;
  }

  private recalculateTrendMetrics(trend: SentimentTrend): void {
    if (trend.dataPoints.length < 2) return;

    const sentiments = trend.dataPoints.map(dp => dp.sentiment);
    const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    
    // Calculate momentum (recent vs older sentiment)
    const half = Math.floor(sentiments.length / 2);
    const recentAvg = sentiments.slice(half).reduce((sum, s) => sum + s, 0) / (sentiments.length - half);
    const olderAvg = sentiments.slice(0, half).reduce((sum, s) => sum + s, 0) / half;
    
    trend.momentum = recentAvg - olderAvg;
    trend.strength = Math.abs(avgSentiment);
    trend.trend = avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral';
  }

  private checkForAlerts(article: NewsArticle): void {
    // Check for breaking news alerts
    if (article.impact.severity === 'high' || article.impact.severity === 'critical') {
      const alert: NewsAlert = {
        id: this.generateAlertId(),
        type: 'breaking',
        severity: article.impact.severity === 'critical' ? 'critical' : 'warning',
        title: 'High Impact News Detected',
        message: `${article.title} - Impact: ${article.impact.severity}`,
        affectedAssets: article.impact.affectedAssets,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        actionable: true,
        relatedArticles: [article.id]
      };

      this.alerts.set(alert.id, alert);
      this.emit('alert', alert);
    }
  }

  private calculateTrend(asset: string): string {
    const trend = this.getSentimentTrends(asset, '24h');
    return trend?.trend || 'neutral';
  }

  private calculateHourlyTrends(): number[] {
    // No real data available - return zeros
    return Array.from({ length: 24 }, () => 0);
  }

  private calculateDailyTrends(): number[] {
    // No real data available - return zeros
    return Array.from({ length: 30 }, () => 0);
  }

  private calculateWeeklyTrends(): number[] {
    // No real data available - return zeros
    return Array.from({ length: 12 }, () => 0);
  }

  private startNewsCrawlers(): void {
    setInterval(() => {
      this.crawlNewsSources();
    }, 5 * 60 * 1000); // Crawl every 5 minutes
  }

  private startSentimentProcessor(): void {
    setInterval(() => {
      this.processNewArticles();
    }, 60 * 1000); // Process every minute
  }

  private startTrendAnalyzer(): void {
    setInterval(() => {
      this.analyzeTrends();
    }, 10 * 60 * 1000); // Analyze every 10 minutes
  }

  private startAlertSystem(): void {
    setInterval(() => {
      this.cleanupExpiredAlerts();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  private async crawlNewsSources(): Promise<void> {
    for (const source of this.sources.values()) {
      if (Date.now() - source.lastCrawled > source.crawlFrequency * 60 * 1000) {
        // Mock crawling - in production would fetch from actual sources
        await this.mockCrawlSource(source);
        source.lastCrawled = Date.now();
      }
    }
  }

  private async mockCrawlSource(source: NewsSource): Promise<void> {
    // Mock article generation
    const mockTitles = [
      'Bitcoin Reaches New All-Time High',
      'Ethereum Upgrade Shows Promise',
      'Regulatory Clarity Brings Optimism',
      'DeFi Protocol Launches New Features',
      'Major Exchange Lists New Token'
    ];

    const randomTitle = mockTitles[0]; // Use first element instead of random
    const mockContent = `${randomTitle}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.`;

    await this.processArticle(
      randomTitle,
      mockContent,
      `${source.url}/article/${Date.now()}`,
      source.id
    );
  }

  private processNewArticles(): void {
    // Process any pending articles in queue
    this.emit('processingComplete');
  }

  private analyzeTrends(): void {
    // Analyze overall market sentiment trends
    this.emit('trendsUpdated');
  }

  private cleanupExpiredAlerts(): void {
    const now = Date.now();
    for (const [id, alert] of this.alerts) {
      if (alert.expiresAt && alert.expiresAt < now) {
        this.alerts.delete(id);
      }
    }
  }

  private generateArticleId(): string {
    return `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const newsSentimentAnalyzer = new NewsSentimentAnalyzer();

// Export utility functions
export const SentimentUtils = {
  /**
   * Calculate composite sentiment score
   */
  calculateCompositeScore(scores: number[], weights?: number[]): number {
    if (scores.length === 0) return 0;
    
    const w = weights || Array(scores.length).fill(1);
    const weightedSum = scores.reduce((sum, score, i) => sum + score * w[i], 0);
    const totalWeight = w.reduce((sum, weight) => sum + weight, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  },

  /**
   * Normalize sentiment score to 0-100 scale
   */
  normalizeSentiment(score: number): number {
    return Math.max(0, Math.min(100, (score + 1) * 50));
  },

  /**
   * Calculate sentiment volatility
   */
  calculateSentimentVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  },

  /**
   * Detect sentiment anomalies
   */
  detectAnomalies(
    scores: number[],
    threshold: number = 2
  ): { index: number; score: number; deviation: number }[] {
    if (scores.length < 3) return [];
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    );
    
    const anomalies: { index: number; score: number; deviation: number }[] = [];
    
    scores.forEach((score, index) => {
      const deviation = Math.abs(score - mean) / stdDev;
      if (deviation > threshold) {
        anomalies.push({ index, score, deviation });
      }
    });
    
    return anomalies;
  }
};