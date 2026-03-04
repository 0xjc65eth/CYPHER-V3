/**
 * Gamification & NFT Rewards System for CYPHER ORDi Future V3
 * Advanced engagement, achievements, leaderboards, and NFT-based rewards
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Gamification Types
export interface User {
  id: string;
  username: string;
  avatar?: string;
  level: number;
  xp: number;
  totalXp: number;
  rank: number;
  tier: UserTier;
  joinDate: number;
  lastActive: number;
  stats: UserStats;
  achievements: Achievement[];
  badges: Badge[];
  nfts: UserNFT[];
  streaks: Streak[];
  preferences: UserPreferences;
}

export type UserTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';

export interface UserStats {
  totalTrades: number;
  totalVolume: number;
  totalPnL: number;
  winRate: number;
  averageHoldTime: number;
  longestStreak: number;
  referrals: number;
  daysActive: number;
  articlesRead: number;
  signalsShared: number;
  socialInteractions: number;
  stakingRewards: number;
  yieldFarmed: number;
  liquidityProvided: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  type: AchievementType;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  requirements: AchievementRequirement[];
  rewards: Reward[];
  progress: number; // 0-100
  completed: boolean;
  completedAt?: number;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export type AchievementCategory = 
  | 'trading' | 'portfolio' | 'social' | 'education' | 'staking' 
  | 'defi' | 'referral' | 'daily' | 'special';

export type AchievementType = 
  | 'milestone' | 'streak' | 'performance' | 'participation' | 'discovery' | 'mastery';

export interface AchievementRequirement {
  type: 'trade_count' | 'volume' | 'profit' | 'streak' | 'referral' | 'time' | 'social';
  target: number;
  current: number;
  timeframe?: number; // days
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
  category: string;
}

export interface UserNFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  metadata: NFTMetadata;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: NFTCategory;
  benefits: NFTBenefit[];
  acquiredAt: number;
  isActive: boolean;
  marketValue?: number;
}

export type NFTCategory = 
  | 'avatar' | 'badge' | 'background' | 'trading_card' | 'utility' | 'commemorative';

export interface NFTMetadata {
  attributes: NFTAttribute[];
  creator: string;
  collection: string;
  mintDate: number;
  edition: number;
  maxSupply: number;
  royalties: number;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  rarity_percentage?: number;
}

export interface NFTBenefit {
  type: 'fee_reduction' | 'xp_boost' | 'exclusive_access' | 'priority_support' | 'rewards_multiplier';
  value: number;
  description: string;
  duration?: number; // days, 0 = permanent
}

export interface Streak {
  type: 'daily_login' | 'trading' | 'staking' | 'social' | 'learning';
  current: number;
  longest: number;
  lastUpdate: number;
  isActive: boolean;
  rewards: StreakReward[];
}

export interface StreakReward {
  day: number;
  reward: Reward;
  claimed: boolean;
}

export interface Reward {
  type: 'xp' | 'tokens' | 'nft' | 'badge' | 'fee_reduction' | 'multiplier' | 'access';
  amount?: number;
  duration?: number; // days
  description: string;
  rarity?: string;
  metadata?: any;
}

export interface UserPreferences {
  notifications: {
    achievements: boolean;
    levelUp: boolean;
    streaks: boolean;
    leaderboard: boolean;
    nftDrops: boolean;
  };
  privacy: {
    showProfile: boolean;
    showStats: boolean;
    showNFTs: boolean;
    showAchievements: boolean;
  };
  display: {
    preferredAvatar: string;
    preferredBadge: string;
    theme: 'default' | 'nft';
  };
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'xp' | 'trading_volume' | 'profit' | 'win_rate' | 'streak' | 'social' | 'nft_value';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  rewards: LeaderboardReward[];
  startDate: number;
  endDate?: number;
  isActive: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  value: number;
  change: number; // position change from previous period
  tier: UserTier;
  badges: Badge[];
}

export interface LeaderboardReward {
  startRank: number;
  endRank: number;
  rewards: Reward[];
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly' | 'special' | 'seasonal';
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  objectives: QuestObjective[];
  rewards: Reward[];
  requirements?: QuestRequirement[];
  startDate: number;
  endDate: number;
  isActive: boolean;
  participants: number;
  completions: number;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'trade' | 'volume' | 'profit' | 'social' | 'stake' | 'learn' | 'refer';
  target: number;
  progress: number;
  completed: boolean;
}

export interface QuestRequirement {
  type: 'level' | 'tier' | 'achievement' | 'nft' | 'trading_volume';
  value: any;
}

export interface UserProgress {
  userId: string;
  questId: string;
  objectives: QuestObjective[];
  startedAt: number;
  completedAt?: number;
  claimed: boolean;
}

export interface Season {
  id: string;
  name: string;
  theme: string;
  description: string;
  startDate: number;
  endDate: number;
  rewards: SeasonReward[];
  leaderboards: Leaderboard[];
  quests: Quest[];
  nftDrops: NFTDrop[];
  isActive: boolean;
}

export interface SeasonReward {
  rank: number;
  reward: Reward;
  requirements: string[];
}

export interface NFTDrop {
  id: string;
  name: string;
  description: string;
  collection: string;
  totalSupply: number;
  remainingSupply: number;
  price: number;
  currency: 'tokens' | 'xp' | 'free';
  startDate: number;
  endDate: number;
  requirements?: NFTDropRequirement[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: NFTCategory;
  isActive: boolean;
}

export interface NFTDropRequirement {
  type: 'level' | 'tier' | 'achievement' | 'volume' | 'random';
  value: any;
  probability?: number; // for random drops
}

export interface GamificationAnalytics {
  userEngagement: {
    dailyActiveUsers: number;
    averageSessionTime: number;
    retentionRate: number;
    completionRates: Record<string, number>;
  };
  achievements: {
    totalUnlocked: number;
    rareAchievements: number;
    averageProgress: number;
    popularCategories: Record<string, number>;
  };
  nfts: {
    totalMinted: number;
    totalValue: number;
    activeCollectors: number;
    averageCollectionSize: number;
  };
  leaderboards: {
    participation: number;
    competitiveness: number;
    rewardsClaimed: number;
  };
  economy: {
    xpCirculation: number;
    rewardsDistributed: number;
    nftTradingVolume: number;
    tokenBurned: number;
  };
}

export class GamificationSystem extends EventEmitter {
  private logger: EnhancedLogger;
  private users: Map<string, User> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();
  private quests: Map<string, Quest> = new Map();
  private userProgress: Map<string, Map<string, UserProgress>> = new Map();
  private seasons: Map<string, Season> = new Map();
  private nftDrops: Map<string, NFTDrop> = new Map();
  private nftMarketplace: Map<string, UserNFT[]> = new Map();

  // XP and Level Configuration
  private readonly XP_REWARDS = {
    trade: 10,
    profitable_trade: 25,
    daily_login: 5,
    referral: 100,
    achievement: 50,
    social_interaction: 2,
    article_read: 1,
    stake: 5,
    yield_farm: 3,
    quest_completion: 100
  };

  private readonly LEVEL_THRESHOLDS = [
    0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000 // Levels 0-10
  ];

  private readonly TIER_THRESHOLDS = {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 25000,
    diamond: 100000,
    legendary: 500000
  };

  constructor() {
    super();
    this.logger = new EnhancedLogger();

    this.logger.info('Gamification System initialized', {
      component: 'GamificationSystem',
      xpRewards: Object.keys(this.XP_REWARDS).length,
      levels: this.LEVEL_THRESHOLDS.length
    });
  }

  /**
   * Initialize gamification system
   */
  async initialize(): Promise<void> {
    try {
      // Load achievements
      await this.loadAchievements();

      // Load quests
      await this.loadQuests();

      // Load NFT collections
      await this.loadNFTCollections();

      // Load leaderboards
      await this.loadLeaderboards();

      // Start periodic tasks
      this.startDailyReset();
      this.startLeaderboardUpdater();
      this.startQuestChecker();
      this.startSeasonManager();

      this.logger.info('Gamification System initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Gamification System:');
      throw error;
    }
  }

  /**
   * Award XP to user
   */
  async awardXP(userId: string, action: keyof typeof this.XP_REWARDS, multiplier: number = 1): Promise<void> {
    try {
      const user = await this.getUser(userId);
      const baseXP = this.XP_REWARDS[action];
      let xpToAward = baseXP * multiplier;

      // Apply NFT bonuses
      xpToAward *= this.calculateXPMultiplier(user);

      // Update user XP
      user.xp += xpToAward;
      user.totalXp += xpToAward;

      // Check for level up
      const newLevel = this.calculateLevel(user.totalXp);
      if (newLevel > user.level) {
        await this.levelUp(user, newLevel);
      }

      // Update tier
      user.tier = this.calculateTier(user.totalXp);

      // Save user
      this.users.set(userId, user);

      // Check achievements
      await this.checkAchievements(userId, action);

      this.logger.info('XP awarded', {
        userId,
        action,
        xpAwarded: xpToAward,
        totalXp: user.totalXp,
        level: user.level,
        tier: user.tier
      });

      this.emit('xpAwarded', { userId, action, xp: xpToAward, user });

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to award XP:');
      throw error;
    }
  }

  /**
   * Unlock achievement for user
   */
  async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      const achievement = this.achievements.get(achievementId);

      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      // Check if already unlocked
      if (user.achievements.some(a => a.id === achievementId && a.completed)) {
        return;
      }

      // Mark as completed
      const userAchievement = { ...achievement, completed: true, completedAt: Date.now() };
      user.achievements = user.achievements.filter(a => a.id !== achievementId);
      user.achievements.push(userAchievement);

      // Award rewards
      for (const reward of achievement.rewards) {
        await this.awardReward(userId, reward);
      }

      this.users.set(userId, user);

      this.logger.info('Achievement unlocked', {
        userId,
        achievementId,
        name: achievement.name,
        rarity: achievement.rarity
      });

      this.emit('achievementUnlocked', { userId, achievement: userAchievement });

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to unlock achievement:');
      throw error;
    }
  }

  /**
   * Mint NFT for user
   */
  async mintNFT(
    userId: string,
    nftData: Omit<UserNFT, 'id' | 'acquiredAt' | 'isActive'>
  ): Promise<UserNFT> {
    try {
      const user = await this.getUser(userId);
      
      const nft: UserNFT = {
        ...nftData,
        id: this.generateNFTId(),
        acquiredAt: Date.now(),
        isActive: false
      };

      user.nfts.push(nft);
      this.users.set(userId, user);

      this.logger.info('NFT minted', {
        userId,
        nftId: nft.id,
        name: nft.name,
        rarity: nft.rarity,
        category: nft.category
      });

      this.emit('nftMinted', { userId, nft });
      return nft;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to mint NFT:');
      throw error;
    }
  }

  /**
   * Start quest for user
   */
  async startQuest(userId: string, questId: string): Promise<UserProgress> {
    try {
      const quest = this.quests.get(questId);
      if (!quest || !quest.isActive) {
        throw new Error(`Quest ${questId} not found or inactive`);
      }

      const user = await this.getUser(userId);

      // Check requirements
      if (quest.requirements) {
        for (const requirement of quest.requirements) {
          if (!this.checkRequirement(user, requirement)) {
            throw new Error(`User does not meet quest requirements`);
          }
        }
      }

      // Initialize progress
      const progress: UserProgress = {
        userId,
        questId,
        objectives: quest.objectives.map(obj => ({ ...obj, progress: 0, completed: false })),
        startedAt: Date.now(),
        claimed: false
      };

      // Store progress
      if (!this.userProgress.has(userId)) {
        this.userProgress.set(userId, new Map());
      }
      this.userProgress.get(userId)!.set(questId, progress);

      this.logger.info('Quest started', { userId, questId, questName: quest.name });
      this.emit('questStarted', { userId, questId, progress });

      return progress;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to start quest:');
      throw error;
    }
  }

  /**
   * Update quest progress
   */
  async updateQuestProgress(
    userId: string,
    questId: string,
    objectiveId: string,
    increment: number = 1
  ): Promise<void> {
    try {
      const userProgressMap = this.userProgress.get(userId);
      if (!userProgressMap) return;

      const progress = userProgressMap.get(questId);
      if (!progress) return;

      const objective = progress.objectives.find(obj => obj.id === objectiveId);
      if (!objective || objective.completed) return;

      // Update progress
      objective.progress = Math.min(objective.target, objective.progress + increment);
      
      // Check completion
      if (objective.progress >= objective.target) {
        objective.completed = true;
        await this.awardXP(userId, 'quest_completion', 0.1); // Partial XP for objective
      }

      // Check quest completion
      const allCompleted = progress.objectives.every(obj => obj.completed);
      if (allCompleted && !progress.completedAt) {
        progress.completedAt = Date.now();
        
        // Award quest rewards
        const quest = this.quests.get(questId);
        if (quest) {
          for (const reward of quest.rewards) {
            await this.awardReward(userId, reward);
          }
        }

        this.emit('questCompleted', { userId, questId, progress });
      }

      userProgressMap.set(questId, progress);

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to update quest progress:');
    }
  }

  /**
   * Get user leaderboard position
   */
  getLeaderboardPosition(userId: string, leaderboardId: string): LeaderboardEntry | null {
    const leaderboard = this.leaderboards.get(leaderboardId);
    if (!leaderboard) return null;

    return leaderboard.entries.find(entry => entry.userId === userId) || null;
  }

  /**
   * Get user gamification data
   */
  async getUserData(userId: string): Promise<User> {
    return this.getUser(userId);
  }

  /**
   * Get available achievements
   */
  getAvailableAchievements(userId?: string): Achievement[] {
    const achievements = Array.from(this.achievements.values());
    
    if (userId) {
      const user = this.users.get(userId);
      if (user) {
        const completedIds = new Set(user.achievements.filter(a => a.completed).map(a => a.id));
        return achievements.filter(a => !completedIds.has(a.id));
      }
    }

    return achievements;
  }

  /**
   * Get active quests
   */
  getActiveQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(quest => quest.isActive);
  }

  /**
   * Get leaderboards
   */
  getLeaderboards(): Leaderboard[] {
    return Array.from(this.leaderboards.values()).filter(lb => lb.isActive);
  }

  /**
   * Get gamification analytics
   */
  getAnalytics(): GamificationAnalytics {
    const users = Array.from(this.users.values());
    const achievements = Array.from(this.achievements.values());
    const nfts = users.flatMap(user => user.nfts);

    return {
      userEngagement: {
        dailyActiveUsers: users.filter(u => Date.now() - u.lastActive < 24 * 60 * 60 * 1000).length,
        averageSessionTime: 45, // Mock - in minutes
        retentionRate: 85, // Mock - percentage
        completionRates: this.calculateCompletionRates()
      },
      achievements: {
        totalUnlocked: users.reduce((sum, u) => sum + u.achievements.filter(a => a.completed).length, 0),
        rareAchievements: users.reduce((sum, u) => 
          sum + u.achievements.filter(a => a.completed && a.rarity === 'legendary').length, 0
        ),
        averageProgress: this.calculateAverageAchievementProgress(users),
        popularCategories: this.calculatePopularAchievementCategories(users)
      },
      nfts: {
        totalMinted: nfts.length,
        totalValue: nfts.reduce((sum, nft) => sum + (nft.marketValue || 0), 0),
        activeCollectors: users.filter(u => u.nfts.length > 0).length,
        averageCollectionSize: users.length > 0 ? nfts.length / users.length : 0
      },
      leaderboards: {
        participation: this.calculateLeaderboardParticipation(),
        competitiveness: 75, // Mock
        rewardsClaimed: 1234 // Mock
      },
      economy: {
        xpCirculation: users.reduce((sum, u) => sum + u.totalXp, 0),
        rewardsDistributed: 50000, // Mock
        nftTradingVolume: 125000, // Mock
        tokenBurned: 5000 // Mock
      }
    };
  }

  /**
   * Private methods
   */

  private async getUser(userId: string): Promise<User> {
    let user = this.users.get(userId);
    
    if (!user) {
      user = {
        id: userId,
        username: `User${userId.slice(-6)}`,
        level: 1,
        xp: 0,
        totalXp: 0,
        rank: 0,
        tier: 'bronze',
        joinDate: Date.now(),
        lastActive: Date.now(),
        stats: {
          totalTrades: 0,
          totalVolume: 0,
          totalPnL: 0,
          winRate: 0,
          averageHoldTime: 0,
          longestStreak: 0,
          referrals: 0,
          daysActive: 1,
          articlesRead: 0,
          signalsShared: 0,
          socialInteractions: 0,
          stakingRewards: 0,
          yieldFarmed: 0,
          liquidityProvided: 0
        },
        achievements: [],
        badges: [],
        nfts: [],
        streaks: [],
        preferences: {
          notifications: {
            achievements: true,
            levelUp: true,
            streaks: true,
            leaderboard: true,
            nftDrops: true
          },
          privacy: {
            showProfile: true,
            showStats: true,
            showNFTs: true,
            showAchievements: true
          },
          display: {
            preferredAvatar: 'default',
            preferredBadge: 'none',
            theme: 'default'
          }
        }
      };
      
      this.users.set(userId, user);
    }
    
    return user;
  }

  private calculateLevel(totalXp: number): number {
    for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXp >= this.LEVEL_THRESHOLDS[i]) {
        return i;
      }
    }
    return 0;
  }

  private calculateTier(totalXp: number): UserTier {
    if (totalXp >= this.TIER_THRESHOLDS.legendary) return 'legendary';
    if (totalXp >= this.TIER_THRESHOLDS.diamond) return 'diamond';
    if (totalXp >= this.TIER_THRESHOLDS.platinum) return 'platinum';
    if (totalXp >= this.TIER_THRESHOLDS.gold) return 'gold';
    if (totalXp >= this.TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  }

  private calculateXPMultiplier(user: User): number {
    let multiplier = 1;
    
    // Apply active NFT bonuses
    for (const nft of user.nfts.filter(nft => nft.isActive)) {
      for (const benefit of nft.benefits) {
        if (benefit.type === 'xp_boost') {
          multiplier *= (1 + benefit.value / 100);
        }
      }
    }
    
    return multiplier;
  }

  private async levelUp(user: User, newLevel: number): Promise<void> {
    const oldLevel = user.level;
    user.level = newLevel;

    // Award level up rewards
    const levelReward: Reward = {
      type: 'xp',
      amount: newLevel * 50,
      description: `Level ${newLevel} bonus XP`
    };

    await this.awardReward(user.id, levelReward);

    this.logger.info('User leveled up', {
      userId: user.id,
      oldLevel,
      newLevel,
      totalXp: user.totalXp
    });

    this.emit('levelUp', { userId: user.id, oldLevel, newLevel, user });
  }

  private async awardReward(userId: string, reward: Reward): Promise<void> {
    const user = await this.getUser(userId);

    switch (reward.type) {
      case 'xp':
        if (reward.amount) {
          user.xp += reward.amount;
          user.totalXp += reward.amount;
        }
        break;
      case 'badge':
        const badge: Badge = {
          id: this.generateBadgeId(),
          name: reward.description,
          description: reward.description,
          icon: 'badge',
          color: '#FFD700',
          rarity: (reward.rarity as Badge['rarity']) || 'common',
          earnedAt: Date.now(),
          category: 'reward'
        };
        user.badges.push(badge);
        break;
      case 'nft':
        // NFT rewards would be handled separately
        break;
    }

    this.users.set(userId, user);
    this.emit('rewardAwarded', { userId, reward });
  }

  private async checkAchievements(userId: string, action: string): Promise<void> {
    const user = await this.getUser(userId);
    const achievements = Array.from(this.achievements.values());

    for (const achievement of achievements) {
      // Skip completed achievements
      if (user.achievements.some(a => a.id === achievement.id && a.completed)) {
        continue;
      }

      // Check if achievement requirements are met
      let progress = 0;
      let canUnlock = true;

      for (const requirement of achievement.requirements) {
        const currentValue = this.getUserStatValue(user, requirement.type);
        requirement.current = currentValue;
        
        if (currentValue >= requirement.target) {
          progress += 100 / achievement.requirements.length;
        } else {
          canUnlock = false;
          progress += (currentValue / requirement.target) * (100 / achievement.requirements.length);
        }
      }

      // Update or add achievement progress
      const existingIndex = user.achievements.findIndex(a => a.id === achievement.id);
      const updatedAchievement = { ...achievement, progress: Math.min(100, progress) };

      if (existingIndex >= 0) {
        user.achievements[existingIndex] = updatedAchievement;
      } else {
        user.achievements.push(updatedAchievement);
      }

      // Unlock if requirements met
      if (canUnlock && !updatedAchievement.completed) {
        await this.unlockAchievement(userId, achievement.id);
      }
    }

    this.users.set(userId, user);
  }

  private getUserStatValue(user: User, statType: string): number {
    switch (statType) {
      case 'trade_count': return user.stats.totalTrades;
      case 'volume': return user.stats.totalVolume;
      case 'profit': return user.stats.totalPnL;
      case 'referral': return user.stats.referrals;
      case 'social': return user.stats.socialInteractions;
      default: return 0;
    }
  }

  private checkRequirement(user: User, requirement: QuestRequirement): boolean {
    switch (requirement.type) {
      case 'level': return user.level >= requirement.value;
      case 'tier': return (this.TIER_THRESHOLDS as any)[user.tier] >= (this.TIER_THRESHOLDS as any)[requirement.value];
      case 'trading_volume': return user.stats.totalVolume >= requirement.value;
      default: return true;
    }
  }

  private async loadAchievements(): Promise<void> {
    const mockAchievements: Achievement[] = [
      {
        id: 'first_trade',
        name: 'First Steps',
        description: 'Complete your first trade',
        category: 'trading',
        type: 'milestone',
        difficulty: 'easy',
        requirements: [{ type: 'trade_count', target: 1, current: 0 }],
        rewards: [{ type: 'xp', amount: 100, description: '100 XP' }],
        progress: 0,
        completed: false,
        icon: 'trade',
        rarity: 'common'
      },
      {
        id: 'profit_master',
        name: 'Profit Master',
        description: 'Achieve $10,000 in total profit',
        category: 'trading',
        type: 'performance',
        difficulty: 'hard',
        requirements: [{ type: 'profit', target: 10000, current: 0 }],
        rewards: [
          { type: 'xp', amount: 1000, description: '1000 XP' },
          { type: 'badge', description: 'Profit Master Badge', rarity: 'epic' }
        ],
        progress: 0,
        completed: false,
        icon: 'profit',
        rarity: 'epic'
      }
    ];

    for (const achievement of mockAchievements) {
      this.achievements.set(achievement.id, achievement);
    }
  }

  private async loadQuests(): Promise<void> {
    const mockQuests: Quest[] = [
      {
        id: 'daily_trader',
        name: 'Daily Trader',
        description: 'Complete 5 trades today',
        category: 'daily',
        difficulty: 'easy',
        objectives: [
          {
            id: 'trade_5_times',
            description: 'Complete 5 trades',
            type: 'trade',
            target: 5,
            progress: 0,
            completed: false
          }
        ],
        rewards: [{ type: 'xp', amount: 200, description: '200 XP' }],
        startDate: Date.now(),
        endDate: Date.now() + 24 * 60 * 60 * 1000,
        isActive: true,
        participants: 0,
        completions: 0
      }
    ];

    for (const quest of mockQuests) {
      this.quests.set(quest.id, quest);
    }
  }

  private async loadNFTCollections(): Promise<void> {
    // Mock NFT collection loading
    this.logger.info('NFT collections loaded');
  }

  private async loadLeaderboards(): Promise<void> {
    const mockLeaderboards: Leaderboard[] = [
      {
        id: 'xp_weekly',
        name: 'Weekly XP Leaders',
        description: 'Top XP earners this week',
        type: 'xp',
        timeframe: 'weekly',
        entries: [],
        rewards: [
          {
            startRank: 1,
            endRank: 1,
            rewards: [{ type: 'nft', description: 'Legendary NFT', rarity: 'legendary' }]
          },
          {
            startRank: 2,
            endRank: 5,
            rewards: [{ type: 'xp', amount: 1000, description: '1000 XP' }]
          }
        ],
        startDate: Date.now(),
        isActive: true
      }
    ];

    for (const leaderboard of mockLeaderboards) {
      this.leaderboards.set(leaderboard.id, leaderboard);
    }
  }

  private calculateCompletionRates(): Record<string, number> {
    return {
      achievements: 65,
      quests: 80,
      streaks: 45
    };
  }

  private calculateAverageAchievementProgress(users: User[]): number {
    if (users.length === 0) return 0;
    
    const totalProgress = users.reduce((sum, user) => 
      sum + user.achievements.reduce((achSum, ach) => achSum + ach.progress, 0), 0
    );
    
    const totalAchievements = users.reduce((sum, user) => sum + user.achievements.length, 0);
    
    return totalAchievements > 0 ? totalProgress / totalAchievements : 0;
  }

  private calculatePopularAchievementCategories(users: User[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const user of users) {
      for (const achievement of user.achievements.filter(a => a.completed)) {
        categories[achievement.category] = (categories[achievement.category] || 0) + 1;
      }
    }
    
    return categories;
  }

  private calculateLeaderboardParticipation(): number {
    const totalUsers = this.users.size;
    const participatingUsers = Array.from(this.leaderboards.values())
      .reduce((sum, lb) => sum + lb.entries.length, 0);
    
    return totalUsers > 0 ? (participatingUsers / totalUsers) * 100 : 0;
  }

  private startDailyReset(): void {
    setInterval(() => {
      this.performDailyReset();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  private startLeaderboardUpdater(): void {
    setInterval(() => {
      this.updateLeaderboards();
    }, 60 * 60 * 1000); // Every hour
  }

  private startQuestChecker(): void {
    setInterval(() => {
      this.checkQuestExpiry();
    }, 60 * 60 * 1000); // Every hour
  }

  private startSeasonManager(): void {
    setInterval(() => {
      this.manageSeasons();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  private performDailyReset(): void {
    // Reset daily quests, streaks, etc.
    this.emit('dailyReset');
  }

  private updateLeaderboards(): void {
    // Update leaderboard rankings
    for (const [id, leaderboard] of this.leaderboards) {
      if (!leaderboard.isActive) continue;
      
      // Mock leaderboard update
      this.emit('leaderboardUpdated', { leaderboardId: id });
    }
  }

  private checkQuestExpiry(): void {
    const now = Date.now();
    
    for (const [id, quest] of this.quests) {
      if (quest.isActive && now > quest.endDate) {
        quest.isActive = false;
        this.quests.set(id, quest);
        this.emit('questExpired', { questId: id });
      }
    }
  }

  private manageSeasons(): void {
    // Manage season lifecycle
    this.emit('seasonUpdate');
  }

  private generateNFTId(): string {
    return `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBadgeId(): string {
    return `badge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const gamificationSystem = new GamificationSystem();

// Export utility functions
export const GamificationUtils = {
  /**
   * Calculate rarity score
   */
  calculateRarityScore(attributes: NFTAttribute[]): number {
    return attributes.reduce((score, attr) => {
      return score + (attr.rarity_percentage ? (100 - attr.rarity_percentage) : 0);
    }, 0) / attributes.length;
  },

  /**
   * Format user tier display
   */
  formatUserTier(tier: UserTier): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  },

  /**
   * Calculate achievement completion percentage
   */
  calculateAchievementCompletion(user: User): number {
    if (user.achievements.length === 0) return 0;
    
    const completed = user.achievements.filter(a => a.completed).length;
    return (completed / user.achievements.length) * 100;
  },

  /**
   * Generate leaderboard entry
   */
  generateLeaderboardEntry(user: User, value: number, rank: number): LeaderboardEntry {
    return {
      rank,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      value,
      change: 0, // Would calculate from previous period
      tier: user.tier,
      badges: user.badges.slice(0, 3) // Show top 3 badges
    };
  },

  /**
   * Calculate NFT collection value
   */
  calculateCollectionValue(nfts: UserNFT[]): number {
    return nfts.reduce((total, nft) => total + (nft.marketValue || 0), 0);
  }
};