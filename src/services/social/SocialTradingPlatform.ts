/**
 * Social Trading Platform for CYPHER ORDi Future V3
 * Advanced copy trading, signal sharing, and trader ranking system
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Social Trading Types
export interface Trader {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  joinDate: number;
  country?: string;
  bio?: string;
  tradingStyle: string[];
  specialties: string[];
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  preferences: {
    allowCopying: boolean;
    maxCopiers: number;
    minCopyAmount: number;
    copyFee: number; // percentage
    allowMessages: boolean;
    publicProfile: boolean;
  };
}

export interface TraderPerformance {
  traderId: string;
  period: '1d' | '7d' | '30d' | '90d' | '1y' | 'all';
  totalReturn: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinRatio: number;
  volatility: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageHoldTime: number; // hours
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  roi: number;
  pnl: number;
  volume: number;
  fees: number;
}

export interface TraderRanking {
  rank: number;
  traderId: string;
  score: number;
  change: number; // position change from previous period
  category: 'overall' | 'monthly' | 'weekly' | 'rising_star' | 'consistent' | 'high_volume';
  metrics: {
    performance: number;
    consistency: number;
    riskManagement: number;
    popularity: number;
    experience: number;
  };
}

export interface CopyTrade {
  id: string;
  copyerId: string;
  traderId: string;
  status: 'active' | 'paused' | 'stopped' | 'expired';
  copySettings: {
    amount: number;
    percentage: number;
    maxPositions: number;
    maxRisk: number;
    stopLoss?: number;
    takeProfit?: number;
    copyOnlyProfitable: boolean;
    excludeAssets: string[];
    includeAssets: string[];
    maxDrawdown: number;
  };
  startDate: number;
  endDate?: number;
  performance: {
    totalCopied: number;
    totalReturn: number;
    totalFees: number;
    positions: number;
    winRate: number;
  };
}

export interface TradingSignal {
  id: string;
  traderId: string;
  type: 'entry' | 'exit' | 'update' | 'alert';
  action: 'buy' | 'sell' | 'hold';
  asset: string;
  price: number;
  quantity?: number;
  confidence: number; // 1-100
  timeframe: string;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  tags: string[];
  timestamp: number;
  expiryTime?: number;
  status: 'active' | 'executed' | 'cancelled' | 'expired';
  performance?: {
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    roi: number;
  };
}

export interface SocialPost {
  id: string;
  authorId: string;
  type: 'text' | 'image' | 'video' | 'signal' | 'analysis' | 'poll';
  content: string;
  attachments?: string[];
  tags: string[];
  mentions: string[];
  visibility: 'public' | 'followers' | 'premium' | 'private';
  timestamp: number;
  editedAt?: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  performance?: {
    views: number;
    clicks: number;
    conversions: number;
  };
}

export interface SocialStats {
  userId: string;
  followers: number;
  following: number;
  copiers: number;
  posts: number;
  signals: number;
  totalViews: number;
  engagement: {
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    rate: number;
  };
  influence: {
    score: number;
    rank: number;
    category: string;
  };
}

export interface CopyTradeRequest {
  copyerId: string;
  traderId: string;
  amount: number;
  settings: CopyTrade['copySettings'];
  duration?: number; // days
}

export class SocialTradingPlatform extends EventEmitter {
  private logger: EnhancedLogger;
  private traders: Map<string, Trader> = new Map();
  private performances: Map<string, Map<string, TraderPerformance>> = new Map();
  private rankings: Map<string, TraderRanking[]> = new Map();
  private copyTrades: Map<string, CopyTrade> = new Map();
  private userCopyTrades: Map<string, Set<string>> = new Map();
  private signals: Map<string, TradingSignal[]> = new Map();
  private posts: Map<string, SocialPost[]> = new Map();
  private followers: Map<string, Set<string>> = new Map();
  private socialStats: Map<string, SocialStats> = new Map();

  // Platform configuration
  private readonly RANKING_CATEGORIES = [
    'overall', 'monthly', 'weekly', 'rising_star', 'consistent', 'high_volume'
  ];
  
  private readonly TIER_REQUIREMENTS = {
    bronze: { minTrades: 0, minReturn: 0, minFollowers: 0 },
    silver: { minTrades: 50, minReturn: 10, minFollowers: 25 },
    gold: { minTrades: 200, minReturn: 25, minFollowers: 100 },
    platinum: { minTrades: 500, minReturn: 50, minFollowers: 500 },
    diamond: { minTrades: 1000, minReturn: 100, minFollowers: 1000 }
  };

  constructor() {
    super();
    this.logger = new EnhancedLogger();

    this.logger.info('Social Trading Platform initialized', {
      component: 'SocialTradingPlatform',
      categories: this.RANKING_CATEGORIES.length
    });
  }

  /**
   * Initialize social trading platform
   */
  async initialize(): Promise<void> {
    try {
      // Load mock data
      await this.loadMockData();

      // Start ranking updates
      this.startRankingUpdater();

      // Start performance tracking
      this.startPerformanceTracker();

      // Start signal processing
      this.startSignalProcessor();

      this.logger.info('Social Trading Platform initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Social Trading Platform:');
      throw error;
    }
  }

  /**
   * Register a new trader
   */
  async registerTrader(traderData: Omit<Trader, 'id' | 'joinDate' | 'tier'>): Promise<Trader> {
    try {
      const trader: Trader = {
        ...traderData,
        id: this.generateTraderId(),
        joinDate: Date.now(),
        tier: 'bronze'
      };

      this.traders.set(trader.id, trader);
      
      // Initialize trader data
      this.performances.set(trader.id, new Map());
      this.signals.set(trader.id, []);
      this.posts.set(trader.id, []);
      this.followers.set(trader.id, new Set());
      this.socialStats.set(trader.id, this.initializeSocialStats(trader.id));

      this.logger.info('Trader registered', {
        traderId: trader.id,
        username: trader.username
      });

      this.emit('traderRegistered', trader);
      return trader;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to register trader:');
      throw error;
    }
  }

  /**
   * Get trader rankings
   */
  getTraderRankings(
    category: string = 'overall',
    limit: number = 100,
    filters?: {
      tier?: string;
      country?: string;
      minFollowers?: number;
      minReturn?: number;
    }
  ): TraderRanking[] {
    let rankings = this.rankings.get(category) || [];

    // Apply filters
    if (filters) {
      rankings = rankings.filter(ranking => {
        const trader = this.traders.get(ranking.traderId);
        if (!trader) return false;

        if (filters.tier && trader.tier !== filters.tier) return false;
        if (filters.country && trader.country !== filters.country) return false;
        
        const stats = this.socialStats.get(ranking.traderId);
        if (filters.minFollowers && (!stats || stats.followers < filters.minFollowers)) return false;

        const performance = this.getTraderPerformance(ranking.traderId, '30d');
        if (filters.minReturn && (!performance || performance.totalReturn < filters.minReturn)) return false;

        return true;
      });
    }

    return rankings.slice(0, limit);
  }

  /**
   * Start copying a trader
   */
  async startCopyTrading(request: CopyTradeRequest): Promise<CopyTrade> {
    try {
      const trader = this.traders.get(request.traderId);
      if (!trader) {
        throw new Error(`Trader ${request.traderId} not found`);
      }

      if (!trader.preferences.allowCopying) {
        throw new Error(`Trader ${request.traderId} does not allow copying`);
      }

      // Check max copiers limit
      const currentCopiers = this.getCurrentCopiers(request.traderId);
      if (currentCopiers >= trader.preferences.maxCopiers) {
        throw new Error(`Trader ${request.traderId} has reached maximum copiers limit`);
      }

      // Check minimum copy amount
      if (request.amount < trader.preferences.minCopyAmount) {
        throw new Error(`Minimum copy amount is ${trader.preferences.minCopyAmount}`);
      }

      const copyTrade: CopyTrade = {
        id: this.generateCopyTradeId(),
        copyerId: request.copyerId,
        traderId: request.traderId,
        status: 'active',
        copySettings: request.settings,
        startDate: Date.now(),
        endDate: request.duration ? Date.now() + (request.duration * 24 * 60 * 60 * 1000) : undefined,
        performance: {
          totalCopied: 0,
          totalReturn: 0,
          totalFees: 0,
          positions: 0,
          winRate: 0
        }
      };

      this.copyTrades.set(copyTrade.id, copyTrade);

      // Add to user copy trades
      if (!this.userCopyTrades.has(request.copyerId)) {
        this.userCopyTrades.set(request.copyerId, new Set());
      }
      this.userCopyTrades.get(request.copyerId)!.add(copyTrade.id);

      this.logger.info('Copy trading started', {
        copyTradeId: copyTrade.id,
        copyerId: request.copyerId,
        traderId: request.traderId,
        amount: request.amount
      });

      this.emit('copyTradeStarted', copyTrade);
      return copyTrade;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to start copy trading:');
      throw error;
    }
  }

  /**
   * Stop copy trading
   */
  async stopCopyTrading(copyTradeId: string, userId: string): Promise<CopyTrade> {
    const copyTrade = this.copyTrades.get(copyTradeId);
    
    if (!copyTrade) {
      throw new Error(`Copy trade ${copyTradeId} not found`);
    }

    if (copyTrade.copyerId !== userId) {
      throw new Error(`Copy trade ${copyTradeId} does not belong to user ${userId}`);
    }

    copyTrade.status = 'stopped';
    copyTrade.endDate = Date.now();

    this.copyTrades.set(copyTradeId, copyTrade);

    this.logger.info('Copy trading stopped', {
      copyTradeId,
      userId,
      duration: copyTrade.endDate - copyTrade.startDate
    });

    this.emit('copyTradeStopped', copyTrade);
    return copyTrade;
  }

  /**
   * Publish trading signal
   */
  async publishSignal(traderId: string, signalData: Omit<TradingSignal, 'id' | 'traderId' | 'timestamp' | 'status'>): Promise<TradingSignal> {
    try {
      const trader = this.traders.get(traderId);
      if (!trader) {
        throw new Error(`Trader ${traderId} not found`);
      }

      const signal: TradingSignal = {
        ...signalData,
        id: this.generateSignalId(),
        traderId,
        timestamp: Date.now(),
        status: 'active'
      };

      const traderSignals = this.signals.get(traderId) || [];
      traderSignals.push(signal);
      this.signals.set(traderId, traderSignals);

      // Notify followers
      const followers = this.followers.get(traderId) || new Set();
      for (const followerId of followers) {
        this.emit('newSignal', { signal, followerId });
      }

      // Update social stats
      const stats = this.socialStats.get(traderId);
      if (stats) {
        stats.signals++;
        this.socialStats.set(traderId, stats);
      }

      this.logger.info('Trading signal published', {
        signalId: signal.id,
        traderId,
        asset: signal.asset,
        action: signal.action,
        followers: followers.size
      });

      this.emit('signalPublished', signal);
      return signal;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to publish signal:');
      throw error;
    }
  }

  /**
   * Follow a trader
   */
  async followTrader(followerId: string, traderId: string): Promise<void> {
    if (followerId === traderId) {
      throw new Error('Cannot follow yourself');
    }

    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error(`Trader ${traderId} not found`);
    }

    if (!this.followers.has(traderId)) {
      this.followers.set(traderId, new Set());
    }

    const traderFollowers = this.followers.get(traderId)!;
    if (traderFollowers.has(followerId)) {
      throw new Error('Already following this trader');
    }

    traderFollowers.add(followerId);

    // Update social stats
    const stats = this.socialStats.get(traderId);
    if (stats) {
      stats.followers++;
      this.socialStats.set(traderId, stats);
    }

    this.logger.info('Trader followed', { followerId, traderId });
    this.emit('traderFollowed', { followerId, traderId });
  }

  /**
   * Get trader performance
   */
  getTraderPerformance(traderId: string, period: string = '30d'): TraderPerformance | null {
    const traderPerformances = this.performances.get(traderId);
    return traderPerformances?.get(period) || null;
  }

  /**
   * Get user copy trades
   */
  getUserCopyTrades(userId: string): CopyTrade[] {
    const copyTradeIds = this.userCopyTrades.get(userId) || new Set();
    return Array.from(copyTradeIds)
      .map(id => this.copyTrades.get(id))
      .filter((trade): trade is CopyTrade => trade !== undefined);
  }

  /**
   * Get trader signals
   */
  getTraderSignals(traderId: string, limit: number = 50): TradingSignal[] {
    const signals = this.signals.get(traderId) || [];
    return signals.slice(-limit).reverse();
  }

  /**
   * Get social feed
   */
  getSocialFeed(userId: string, limit: number = 20): SocialPost[] {
    // Get posts from followed traders
    const feed: SocialPost[] = [];
    
    for (const [traderId, posts] of this.posts) {
      const isFollowing = this.followers.get(traderId)?.has(userId);
      if (isFollowing) {
        feed.push(...posts.filter(post => post.visibility === 'public' || post.visibility === 'followers'));
      }
    }

    // Sort by timestamp and limit
    return feed
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get platform analytics
   */
  getPlatformAnalytics(): {
    totalTraders: number;
    activeCopyTrades: number;
    totalSignals: number;
    totalVolume: number;
    topPerformers: TraderRanking[];
    engagement: {
      dailyActiveUsers: number;
      avgSessionDuration: number;
      signalAccuracy: number;
    };
  } {
    const activeCopyTrades = Array.from(this.copyTrades.values())
      .filter(trade => trade.status === 'active').length;

    const totalSignals = Array.from(this.signals.values())
      .reduce((sum, signals) => sum + signals.length, 0);

    const totalVolume = Array.from(this.copyTrades.values())
      .reduce((sum, trade) => sum + trade.performance.totalCopied, 0);

    const topPerformers = this.getTraderRankings('overall', 10);

    return {
      totalTraders: this.traders.size,
      activeCopyTrades,
      totalSignals,
      totalVolume,
      topPerformers,
      engagement: {
        dailyActiveUsers: 0,
        avgSessionDuration: 0,
        signalAccuracy: 0
      }
    };
  }

  /**
   * Private methods
   */

  private async loadMockData(): Promise<void> {
    // Create mock traders
    const mockTraders = [
      {
        username: 'BitcoinBull',
        displayName: 'Bitcoin Bull',
        verified: true,
        tradingStyle: ['trend_following', 'swing_trading'],
        specialties: ['BTC', 'ETH'],
        preferences: {
          allowCopying: true,
          maxCopiers: 100,
          minCopyAmount: 1000,
          copyFee: 2.5,
          allowMessages: true,
          publicProfile: true
        }
      },
      {
        username: 'CryptoNinja',
        displayName: 'Crypto Ninja',
        verified: true,
        tradingStyle: ['scalping', 'day_trading'],
        specialties: ['altcoins', 'defi'],
        preferences: {
          allowCopying: true,
          maxCopiers: 50,
          minCopyAmount: 500,
          copyFee: 3.0,
          allowMessages: false,
          publicProfile: true
        }
      }
    ];

    for (const traderData of mockTraders) {
      const trader = await this.registerTrader(traderData);
      
      // Add mock performance data
      this.addMockPerformance(trader.id);
    }
  }

  private addMockPerformance(traderId: string): void {
    const periods = ['1d', '7d', '30d', '90d', '1y', 'all'] as const;
    const performances = new Map<string, TraderPerformance>();

    for (const period of periods) {
      const performance: TraderPerformance = {
        traderId,
        period,
        totalReturn: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        sortinRatio: 0,
        volatility: 0,
        averageWin: 0,
        averageLoss: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        averageHoldTime: 0,
        bestTrade: 0,
        worstTrade: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        roi: 0,
        pnl: 0,
        volume: 0,
        fees: 0
      };

      performances.set(period, performance);
    }

    this.performances.set(traderId, performances);
  }

  private getCurrentCopiers(traderId: string): number {
    return Array.from(this.copyTrades.values())
      .filter(trade => trade.traderId === traderId && trade.status === 'active')
      .length;
  }

  private initializeSocialStats(userId: string): SocialStats {
    return {
      userId,
      followers: 0,
      following: 0,
      copiers: 0,
      posts: 0,
      signals: 0,
      totalViews: 0,
      engagement: {
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        rate: 0
      },
      influence: {
        score: 0,
        rank: 0,
        category: 'newcomer'
      }
    };
  }

  private startRankingUpdater(): void {
    setInterval(() => {
      this.updateRankings();
    }, 60 * 60 * 1000); // Update every hour
  }

  private startPerformanceTracker(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 5 * 60 * 1000); // Update every 5 minutes
  }

  private startSignalProcessor(): void {
    setInterval(() => {
      this.processExpiredSignals();
    }, 60 * 1000); // Check every minute
  }

  private updateRankings(): void {
    for (const category of this.RANKING_CATEGORIES) {
      const rankings = this.calculateRankings(category);
      this.rankings.set(category, rankings);
    }

    this.emit('rankingsUpdated');
  }

  private calculateRankings(category: string): TraderRanking[] {
    const traders = Array.from(this.traders.values());
    const rankings: TraderRanking[] = [];

    for (const trader of traders) {
      const performance = this.getTraderPerformance(trader.id, '30d');
      const stats = this.socialStats.get(trader.id);
      
      if (!performance || !stats) continue;

      const score = this.calculateTraderScore(trader, performance, stats, category);
      
      rankings.push({
        rank: 0, // Will be set after sorting
        traderId: trader.id,
        score,
        change: 0, // Would calculate from previous rankings
        category: category as any,
        metrics: {
          performance: Math.min(100, performance.totalReturn * 2),
          consistency: Math.max(0, 100 - performance.maxDrawdown * 5),
          riskManagement: Math.min(100, performance.sharpeRatio * 50),
          popularity: Math.min(100, stats.followers / 10),
          experience: Math.min(100, (Date.now() - trader.joinDate) / (365 * 24 * 60 * 60 * 1000) * 25)
        }
      });
    }

    // Sort by score and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  private calculateTraderScore(
    trader: Trader,
    performance: TraderPerformance,
    stats: SocialStats,
    category: string
  ): number {
    let score = 0;

    // Base performance score (40%)
    score += Math.min(40, performance.totalReturn * 0.8);

    // Risk management (25%)
    score += Math.max(0, 25 - performance.maxDrawdown * 1.5);
    score += Math.min(15, performance.sharpeRatio * 7.5);

    // Consistency (20%)
    score += Math.min(20, performance.winRate * 0.25);

    // Social factors (15%)
    score += Math.min(10, stats.followers * 0.01);
    score += Math.min(5, stats.influence.score * 0.05);

    // Category-specific adjustments
    switch (category) {
      case 'rising_star':
        const accountAge = Date.now() - trader.joinDate;
        if (accountAge < 90 * 24 * 60 * 60 * 1000) { // Less than 90 days
          score *= 1.5;
        }
        break;
      case 'high_volume':
        score += Math.min(20, performance.volume / 50000);
        break;
      case 'consistent':
        score += Math.min(15, 100 - performance.volatility);
        break;
    }

    return Math.min(100, score);
  }

  private updatePerformanceMetrics(): void {
    // Update real-time performance for active copy trades
    for (const copyTrade of this.copyTrades.values()) {
      if (copyTrade.status === 'active') {
        // No performance updates without real data
      }
    }
  }

  private processExpiredSignals(): void {
    const now = Date.now();
    
    for (const [traderId, signals] of this.signals) {
      const updatedSignals = signals.map(signal => {
        if (signal.expiryTime && now > signal.expiryTime && signal.status === 'active') {
          signal.status = 'expired';
        }
        return signal;
      });
      
      this.signals.set(traderId, updatedSignals);
    }
  }

  private generateTraderId(): string {
    return `trader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCopyTradeId(): string {
    return `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const socialTradingPlatform = new SocialTradingPlatform();

// Export utility functions
export const SocialTradingUtils = {
  /**
   * Calculate copy trade allocation
   */
  calculateAllocation(
    totalAmount: number,
    traderWeight: number,
    riskLevel: number,
    maxPositions: number
  ): number {
    const baseAllocation = totalAmount * (traderWeight / 100);
    const riskAdjustment = (100 - riskLevel) / 100;
    const positionAdjustment = Math.min(1, maxPositions / 10);
    
    return baseAllocation * riskAdjustment * positionAdjustment;
  },

  /**
   * Calculate signal strength
   */
  calculateSignalStrength(signal: TradingSignal): number {
    let strength = signal.confidence;
    
    // Adjust based on timeframe
    const timeframeMultipliers: Record<string, number> = {
      '1m': 0.8,
      '5m': 0.9,
      '15m': 1.0,
      '1h': 1.1,
      '4h': 1.2,
      '1d': 1.3
    };
    
    strength *= timeframeMultipliers[signal.timeframe] || 1.0;
    
    // Adjust based on risk/reward ratio
    if (signal.stopLoss && signal.takeProfit) {
      const riskReward = Math.abs(signal.takeProfit - signal.price) / Math.abs(signal.price - signal.stopLoss);
      strength *= Math.min(1.5, riskReward / 2 + 0.5);
    }
    
    return Math.min(100, strength);
  },

  /**
   * Calculate trader compatibility
   */
  calculateCompatibility(
    userProfile: { riskTolerance: number; tradingStyle: string[]; experience: string },
    trader: Trader,
    performance: TraderPerformance
  ): number {
    let compatibility = 50; // Base score
    
    // Risk compatibility
    const userRisk = userProfile.riskTolerance;
    const traderRisk = performance.maxDrawdown;
    const riskDiff = Math.abs(userRisk - traderRisk);
    compatibility += Math.max(-25, 25 - riskDiff);
    
    // Style compatibility
    const styleMatch = trader.tradingStyle.filter(style => 
      userProfile.tradingStyle.includes(style)
    ).length;
    compatibility += styleMatch * 10;
    
    // Performance bonus
    if (performance.totalReturn > 20) compatibility += 10;
    if (performance.winRate > 70) compatibility += 10;
    if (performance.sharpeRatio > 1.5) compatibility += 5;
    
    return Math.min(100, Math.max(0, compatibility));
  },

  /**
   * Format performance metrics
   */
  formatPerformanceMetrics(performance: TraderPerformance): Record<string, string> {
    return {
      totalReturn: `${performance.totalReturn.toFixed(2)}%`,
      winRate: `${performance.winRate.toFixed(1)}%`,
      sharpeRatio: performance.sharpeRatio.toFixed(2),
      maxDrawdown: `${performance.maxDrawdown.toFixed(2)}%`,
      profitFactor: performance.profitFactor.toFixed(2),
      avgHoldTime: `${performance.averageHoldTime.toFixed(1)}h`,
      totalTrades: performance.totalTrades.toString(),
      roi: `${performance.roi.toFixed(2)}%`
    };
  }
};