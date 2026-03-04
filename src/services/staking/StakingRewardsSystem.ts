/**
 * Multi-Asset Staking Rewards System for CYPHER ORDi Future V3
 * Advanced staking with flexible rewards, auto-compounding, and multi-protocol support
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Staking Types
export interface StakingPool {
  id: string;
  name: string;
  symbol: string;
  tokenAddress: string;
  protocol: string;
  network: string;
  apy: number;
  tvl: number;
  totalStaked: number;
  rewardTokens: RewardToken[];
  lockupPeriod: number; // days
  cooldownPeriod: number; // days
  minStake: number;
  maxStake: number;
  isActive: boolean;
  poolType: 'single' | 'lp' | 'validator' | 'defi' | 'nft';
  riskLevel: 'low' | 'medium' | 'high';
  features: {
    autoCompound: boolean;
    flexibleWithdrawal: boolean;
    slashing: boolean;
    governance: boolean;
    nftBoost: boolean;
  };
  fees: {
    deposit: number;
    withdrawal: number;
    performance: number;
    earlyWithdrawal: number;
  };
  metrics: {
    totalStakers: number;
    averageStake: number;
    poolAge: number;
    uptimePercentage: number;
  };
}

export interface RewardToken {
  symbol: string;
  address: string;
  name: string;
  decimals: number;
  apr: number;
  distributionType: 'continuous' | 'epoch' | 'manual' | 'governance';
  emissionRate: number; // tokens per second
  totalRewards: number;
  remainingRewards: number;
  price: number;
  multiplier: number; // for boosted rewards
}

export interface StakingPosition {
  id: string;
  userId: string;
  poolId: string;
  amount: number;
  stakedAt: number;
  lastClaimAt: number;
  lockupEnds?: number;
  cooldownStarted?: number;
  status: 'active' | 'cooling_down' | 'unlocked' | 'withdrawn';
  rewards: {
    pending: PendingReward[];
    claimed: ClaimedReward[];
    totalClaimed: number;
    totalValue: number;
    lastUpdate: number;
  };
  boosts: StakingBoost[];
  autoCompound: boolean;
  vestingSchedule?: VestingSchedule[];
}

export interface PendingReward {
  token: string;
  amount: number;
  value: number; // in USD
  accruedSince: number;
  claimableAt: number;
  vestingPeriod?: number;
}

export interface ClaimedReward {
  token: string;
  amount: number;
  value: number;
  claimedAt: number;
  txHash?: string;
  fee: number;
}

export interface StakingBoost {
  id: string;
  type: 'nft' | 'loyalty' | 'volume' | 'referral' | 'governance';
  multiplier: number;
  description: string;
  startDate: number;
  endDate?: number;
  isActive: boolean;
  requirements?: {
    minStakeAmount?: number;
    minStakeDuration?: number;
    nftTokenId?: string;
    votingPower?: number;
  };
}

export interface VestingSchedule {
  amount: number;
  vestedAt: number;
  claimableAt: number;
  claimed: boolean;
}

export interface StakingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'conservative' | 'balanced' | 'aggressive' | 'auto_compound' | 'diversified';
  allocations: {
    poolId: string;
    percentage: number;
    minAmount: number;
    maxAmount: number;
  }[];
  rebalanceFrequency: number; // hours
  targetApy: number;
  maxRisk: number;
  autoExecute: boolean;
  conditions: {
    minTvl?: number;
    maxDrawdown?: number;
    minApy?: number;
    maxSlashing?: number;
  };
}

export interface StakingAnalytics {
  userId?: string;
  totalStaked: number;
  totalRewards: number;
  totalValue: number;
  averageApy: number;
  portfolioRisk: number;
  diversificationScore: number;
  performanceMetrics: {
    dailyRewards: number;
    weeklyRewards: number;
    monthlyRewards: number;
    yearlyProjected: number;
    bestPerformer: string;
    worstPerformer: string;
    roi: number;
  };
  assetAllocation: Record<string, number>;
  riskAllocation: Record<string, number>;
}

export interface ValidatorInfo {
  address: string;
  moniker: string;
  commission: number;
  votingPower: number;
  uptime: number;
  jailed: boolean;
  bondedTokens: number;
  delegatorCount: number;
  apr: number;
  ranking: number;
  network: string;
}

export class StakingRewardsSystem extends EventEmitter {
  private logger: EnhancedLogger;
  private pools: Map<string, StakingPool> = new Map();
  private positions: Map<string, StakingPosition> = new Map();
  private userPositions: Map<string, Set<string>> = new Map();
  private strategies: Map<string, StakingStrategy> = new Map();
  private validators: Map<string, ValidatorInfo> = new Map();
  private boosts: Map<string, StakingBoost[]> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  // Supported networks and protocols
  private readonly SUPPORTED_NETWORKS = [
    'ethereum', 'polygon', 'avalanche', 'solana', 'cosmos', 'near', 'cardano'
  ];

  private readonly PROTOCOL_CONFIGS = {
    ethereum: {
      native: { symbol: 'ETH', minStake: 32, lockupPeriod: 0, slashing: true },
      lido: { symbol: 'stETH', minStake: 0.001, lockupPeriod: 0, slashing: false },
      rocketpool: { symbol: 'rETH', minStake: 0.01, lockupPeriod: 0, slashing: false }
    },
    polygon: {
      native: { symbol: 'MATIC', minStake: 1, lockupPeriod: 9, slashing: true }
    },
    solana: {
      native: { symbol: 'SOL', minStake: 0.001, lockupPeriod: 0, slashing: true }
    },
    cosmos: {
      native: { symbol: 'ATOM', minStake: 0.1, lockupPeriod: 21, slashing: true }
    }
  };

  constructor() {
    super();
    this.logger = new EnhancedLogger();

    this.logger.info('Staking Rewards System initialized', {
      component: 'StakingRewardsSystem',
      supportedNetworks: this.SUPPORTED_NETWORKS.length
    });
  }

  /**
   * Initialize staking system
   */
  async initialize(): Promise<void> {
    try {
      // Load staking pools
      await this.loadStakingPools();

      // Load validators
      await this.loadValidators();

      // Start reward calculations
      this.startRewardCalculator();

      // Start auto-compound processor
      this.startAutoCompoundProcessor();

      // Start pool updates
      this.startPoolUpdater();

      this.logger.info('Staking Rewards System initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Staking Rewards System:');
      throw error;
    }
  }

  /**
   * Stake tokens in a pool
   */
  async stake(
    userId: string,
    poolId: string,
    amount: number,
    autoCompound: boolean = true,
    lockupPeriod?: number
  ): Promise<StakingPosition> {
    try {
      const pool = this.pools.get(poolId);
      if (!pool) {
        throw new Error(`Staking pool ${poolId} not found`);
      }

      if (!pool.isActive) {
        throw new Error(`Staking pool ${poolId} is not active`);
      }

      if (amount < pool.minStake) {
        throw new Error(`Minimum stake amount is ${pool.minStake} ${pool.symbol}`);
      }

      if (amount > pool.maxStake) {
        throw new Error(`Maximum stake amount is ${pool.maxStake} ${pool.symbol}`);
      }

      // Calculate fees
      const depositFee = amount * pool.fees.deposit;
      const netAmount = amount - depositFee;

      // Create staking position
      const position: StakingPosition = {
        id: this.generatePositionId(),
        userId,
        poolId,
        amount: netAmount,
        stakedAt: Date.now(),
        lastClaimAt: Date.now(),
        lockupEnds: lockupPeriod ? Date.now() + (lockupPeriod * 24 * 60 * 60 * 1000) : 
                   pool.lockupPeriod > 0 ? Date.now() + (pool.lockupPeriod * 24 * 60 * 60 * 1000) : undefined,
        status: 'active',
        rewards: {
          pending: [],
          claimed: [],
          totalClaimed: 0,
          totalValue: 0,
          lastUpdate: Date.now()
        },
        boosts: this.getApplicableBoosts(userId, poolId, amount),
        autoCompound,
        vestingSchedule: []
      };

      // Store position
      this.positions.set(position.id, position);

      // Add to user positions
      if (!this.userPositions.has(userId)) {
        this.userPositions.set(userId, new Set());
      }
      this.userPositions.get(userId)!.add(position.id);

      // Update pool metrics
      pool.totalStaked += netAmount;
      pool.metrics.totalStakers++;
      pool.metrics.averageStake = pool.totalStaked / pool.metrics.totalStakers;
      this.pools.set(poolId, pool);

      // Execute staking transaction (mock)
      await this.executeStaking(position, pool);

      this.logger.info('Staking position created', {
        positionId: position.id,
        userId,
        poolId,
        amount: netAmount,
        autoCompound,
        lockupEnds: position.lockupEnds
      });

      this.emit('staked', position);
      return position;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to stake tokens:');
      throw error;
    }
  }

  /**
   * Unstake tokens from a position
   */
  async unstake(
    positionId: string,
    userId: string,
    amount?: number
  ): Promise<{
    position: StakingPosition;
    withdrawnAmount: number;
    fees: number;
    pendingRewards: PendingReward[];
  }> {
    try {
      const position = this.positions.get(positionId);
      if (!position || position.userId !== userId) {
        throw new Error(`Position ${positionId} not found or unauthorized`);
      }

      const pool = this.pools.get(position.poolId);
      if (!pool) {
        throw new Error(`Pool ${position.poolId} not found`);
      }

      // Check lockup period
      if (position.lockupEnds && Date.now() < position.lockupEnds) {
        throw new Error('Position is still in lockup period');
      }

      // Check cooldown period
      if (pool.cooldownPeriod > 0 && !position.cooldownStarted) {
        position.cooldownStarted = Date.now();
        position.status = 'cooling_down';
        this.positions.set(positionId, position);

        this.logger.info('Cooldown period started', {
          positionId,
          cooldownEnds: Date.now() + (pool.cooldownPeriod * 24 * 60 * 60 * 1000)
        });

        throw new Error(`Cooldown period started. You can withdraw after ${pool.cooldownPeriod} days`);
      }

      if (position.cooldownStarted) {
        const cooldownEnds = position.cooldownStarted + (pool.cooldownPeriod * 24 * 60 * 60 * 1000);
        if (Date.now() < cooldownEnds) {
          throw new Error(`Cooldown period not complete. Try again after ${new Date(cooldownEnds).toLocaleString()}`);
        }
      }

      const withdrawAmount = amount || position.amount;
      if (withdrawAmount > position.amount) {
        throw new Error('Insufficient staked amount');
      }

      // Calculate fees
      let withdrawalFee = withdrawAmount * pool.fees.withdrawal;
      
      // Early withdrawal penalty
      if (position.lockupEnds && Date.now() < position.lockupEnds) {
        withdrawalFee += withdrawAmount * pool.fees.earlyWithdrawal;
      }

      const netWithdrawal = withdrawAmount - withdrawalFee;

      // Claim pending rewards
      const pendingRewards = await this.calculatePendingRewards(position);
      await this.claimRewards(positionId, userId);

      // Update position
      position.amount -= withdrawAmount;
      position.status = position.amount > 0 ? 'active' : 'withdrawn';

      if (position.amount === 0) {
        this.userPositions.get(userId)?.delete(positionId);
      }

      this.positions.set(positionId, position);

      // Update pool metrics
      pool.totalStaked -= withdrawAmount;
      if (position.amount === 0) {
        pool.metrics.totalStakers--;
      }
      pool.metrics.averageStake = pool.metrics.totalStakers > 0 ? 
        pool.totalStaked / pool.metrics.totalStakers : 0;
      this.pools.set(position.poolId, pool);

      this.logger.info('Unstaking completed', {
        positionId,
        userId,
        withdrawnAmount: netWithdrawal,
        fees: withdrawalFee
      });

      const result = {
        position,
        withdrawnAmount: netWithdrawal,
        fees: withdrawalFee,
        pendingRewards
      };

      this.emit('unstaked', result);
      return result;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to unstake tokens:');
      throw error;
    }
  }

  /**
   * Claim rewards from a position
   */
  async claimRewards(positionId: string, userId: string): Promise<ClaimedReward[]> {
    try {
      const position = this.positions.get(positionId);
      if (!position || position.userId !== userId) {
        throw new Error(`Position ${positionId} not found or unauthorized`);
      }

      const pool = this.pools.get(position.poolId);
      if (!pool) {
        throw new Error(`Pool ${position.poolId} not found`);
      }

      const pendingRewards = await this.calculatePendingRewards(position);
      const claimedRewards: ClaimedReward[] = [];

      for (const reward of pendingRewards) {
        if (Date.now() >= reward.claimableAt) {
          const fee = reward.value * pool.fees.performance;
          const netAmount = reward.amount * (1 - pool.fees.performance);

          const claimedReward: ClaimedReward = {
            token: reward.token,
            amount: netAmount,
            value: reward.value - fee,
            claimedAt: Date.now(),
            fee
          };

          claimedRewards.push(claimedReward);
          position.rewards.claimed.push(claimedReward);
          position.rewards.totalClaimed += claimedReward.value;
        }
      }

      // Clear pending rewards that were claimed
      position.rewards.pending = position.rewards.pending.filter(reward => 
        Date.now() < reward.claimableAt
      );

      position.lastClaimAt = Date.now();
      position.rewards.lastUpdate = Date.now();
      this.positions.set(positionId, position);

      this.logger.info('Rewards claimed', {
        positionId,
        userId,
        claimedCount: claimedRewards.length,
        totalValue: claimedRewards.reduce((sum, r) => sum + r.value, 0)
      });

      this.emit('rewardsClaimed', { position, claimedRewards });
      return claimedRewards;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to claim rewards:');
      throw error;
    }
  }

  /**
   * Get available staking pools
   */
  getStakingPools(filters?: {
    network?: string;
    protocol?: string;
    poolType?: string;
    minApy?: number;
    maxRisk?: string;
    minTvl?: number;
  }): StakingPool[] {
    let pools = Array.from(this.pools.values()).filter(pool => pool.isActive);

    if (filters) {
      if (filters.network) {
        pools = pools.filter(pool => pool.network === filters.network);
      }
      if (filters.protocol) {
        pools = pools.filter(pool => pool.protocol === filters.protocol);
      }
      if (filters.poolType) {
        pools = pools.filter(pool => pool.poolType === filters.poolType);
      }
      if (filters.minApy) {
        pools = pools.filter(pool => pool.apy >= filters.minApy!);
      }
      if (filters.maxRisk) {
        const riskLevels = { low: 1, medium: 2, high: 3 };
        const maxLevel = riskLevels[filters.maxRisk as keyof typeof riskLevels];
        pools = pools.filter(pool => riskLevels[pool.riskLevel] <= maxLevel);
      }
      if (filters.minTvl) {
        pools = pools.filter(pool => pool.tvl >= filters.minTvl!);
      }
    }

    return pools.sort((a, b) => b.apy - a.apy);
  }

  /**
   * Get user staking positions
   */
  getUserPositions(userId: string): StakingPosition[] {
    const positionIds = this.userPositions.get(userId) || new Set();
    return Array.from(positionIds)
      .map(id => this.positions.get(id))
      .filter((position): position is StakingPosition => position !== undefined);
  }

  /**
   * Get staking analytics
   */
  getStakingAnalytics(userId?: string): StakingAnalytics {
    const positions = userId ? this.getUserPositions(userId) : Array.from(this.positions.values());
    
    const totalStaked = positions.reduce((sum, pos) => sum + pos.amount, 0);
    const totalRewards = positions.reduce((sum, pos) => sum + pos.rewards.totalClaimed, 0);
    
    // Calculate weighted average APY
    let weightedApy = 0;
    let totalValue = 0;
    
    const assetAllocation: Record<string, number> = {};
    const riskAllocation: Record<string, number> = {};

    for (const position of positions) {
      const pool = this.pools.get(position.poolId);
      if (!pool) continue;

      const positionValue = position.amount;
      totalValue += positionValue;
      weightedApy += pool.apy * positionValue;

      // Asset allocation
      assetAllocation[pool.symbol] = (assetAllocation[pool.symbol] || 0) + positionValue;

      // Risk allocation
      riskAllocation[pool.riskLevel] = (riskAllocation[pool.riskLevel] || 0) + positionValue;
    }

    const averageApy = totalValue > 0 ? weightedApy / totalValue : 0;

    // Calculate diversification score (0-100)
    const uniqueAssets = Object.keys(assetAllocation).length;
    const maxAllocation = Math.max(...Object.values(assetAllocation));
    const diversificationScore = totalValue > 0 ? 
      Math.min(100, (uniqueAssets * 20) + (50 * (1 - maxAllocation / totalValue))) : 0;

    // Calculate portfolio risk (0-100)
    const riskWeights = { low: 1, medium: 2, high: 3 };
    let weightedRisk = 0;
    for (const [risk, amount] of Object.entries(riskAllocation)) {
      weightedRisk += riskWeights[risk as keyof typeof riskWeights] * amount;
    }
    const portfolioRisk = totalValue > 0 ? (weightedRisk / totalValue / 3) * 100 : 0;

    return {
      userId,
      totalStaked,
      totalRewards,
      totalValue,
      averageApy,
      portfolioRisk,
      diversificationScore,
      performanceMetrics: {
        dailyRewards: totalValue * averageApy / 365 / 100,
        weeklyRewards: totalValue * averageApy / 52 / 100,
        monthlyRewards: totalValue * averageApy / 12 / 100,
        yearlyProjected: totalValue * averageApy / 100,
        bestPerformer: this.getBestPerformer(positions),
        worstPerformer: this.getWorstPerformer(positions),
        roi: totalStaked > 0 ? (totalRewards / totalStaked) * 100 : 0
      },
      assetAllocation,
      riskAllocation
    };
  }

  /**
   * Private methods
   */

  private async loadStakingPools(): Promise<void> {
    const mockPools: Omit<StakingPool, 'id'>[] = [
      {
        name: 'Ethereum 2.0 Staking',
        symbol: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        protocol: 'ethereum',
        network: 'ethereum',
        apy: 5.2,
        tvl: 15000000,
        totalStaked: 125000,
        rewardTokens: [{
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          name: 'Ethereum',
          decimals: 18,
          apr: 5.2,
          distributionType: 'epoch',
          emissionRate: 0.00001,
          totalRewards: 1000000,
          remainingRewards: 800000,
          price: 1850, // Fallback ETH price - atualizado 2026-02-24
          multiplier: 1
        }],
        lockupPeriod: 0,
        cooldownPeriod: 7,
        minStake: 0.01,
        maxStake: 1000,
        isActive: true,
        poolType: 'validator',
        riskLevel: 'low',
        features: {
          autoCompound: true,
          flexibleWithdrawal: false,
          slashing: true,
          governance: false,
          nftBoost: false
        },
        fees: {
          deposit: 0,
          withdrawal: 0.001,
          performance: 0.1,
          earlyWithdrawal: 0.05
        },
        metrics: {
          totalStakers: 2500,
          averageStake: 50,
          poolAge: 365,
          uptimePercentage: 99.8
        }
      },
      {
        name: 'Polygon Staking',
        symbol: 'MATIC',
        tokenAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
        protocol: 'polygon',
        network: 'polygon',
        apy: 8.5,
        tvl: 5000000,
        totalStaked: 8000000,
        rewardTokens: [{
          symbol: 'MATIC',
          address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
          name: 'Polygon',
          decimals: 18,
          apr: 8.5,
          distributionType: 'continuous',
          emissionRate: 0.001,
          totalRewards: 5000000,
          remainingRewards: 3000000,
          price: 0.8,
          multiplier: 1
        }],
        lockupPeriod: 9,
        cooldownPeriod: 9,
        minStake: 1,
        maxStake: 100000,
        isActive: true,
        poolType: 'validator',
        riskLevel: 'medium',
        features: {
          autoCompound: true,
          flexibleWithdrawal: false,
          slashing: true,
          governance: true,
          nftBoost: false
        },
        fees: {
          deposit: 0,
          withdrawal: 0.005,
          performance: 0.15,
          earlyWithdrawal: 0.1
        },
        metrics: {
          totalStakers: 1200,
          averageStake: 6667,
          poolAge: 180,
          uptimePercentage: 99.5
        }
      }
    ];

    for (const poolData of mockPools) {
      const pool: StakingPool = {
        ...poolData,
        id: this.generatePoolId(poolData.symbol)
      };
      
      this.pools.set(pool.id, pool);
    }

    this.logger.info('Staking pools loaded', { count: mockPools.length });
  }

  private async loadValidators(): Promise<void> {
    const mockValidators: ValidatorInfo[] = [
      {
        address: 'cosmosvaloper1...',
        moniker: 'Cosmos Validator 1',
        commission: 0.05,
        votingPower: 1000000,
        uptime: 99.9,
        jailed: false,
        bondedTokens: 5000000,
        delegatorCount: 250,
        apr: 12.5,
        ranking: 1,
        network: 'cosmos'
      }
    ];

    for (const validator of mockValidators) {
      this.validators.set(validator.address, validator);
    }
  }

  private async calculatePendingRewards(position: StakingPosition): Promise<PendingReward[]> {
    const pool = this.pools.get(position.poolId);
    if (!pool) return [];

    const timeElapsed = Date.now() - position.lastClaimAt;
    const daysElapsed = timeElapsed / (24 * 60 * 60 * 1000);

    const pendingRewards: PendingReward[] = [];

    for (const rewardToken of pool.rewardTokens) {
      // Calculate base rewards
      let rewardAmount = (position.amount * rewardToken.apr / 100 / 365) * daysElapsed;

      // Apply boosts
      for (const boost of position.boosts) {
        if (boost.isActive) {
          rewardAmount *= boost.multiplier;
        }
      }

      const tokenPrice = await this.getTokenPrice(rewardToken.symbol);
      const rewardValue = rewardAmount * tokenPrice;

      pendingRewards.push({
        token: rewardToken.symbol,
        amount: rewardAmount,
        value: rewardValue,
        accruedSince: position.lastClaimAt,
        claimableAt: Date.now(),
        vestingPeriod: rewardToken.distributionType === 'epoch' ? 7 * 24 * 60 * 60 * 1000 : undefined
      });
    }

    return pendingRewards;
  }

  private getApplicableBoosts(userId: string, poolId: string, amount: number): StakingBoost[] {
    const userBoosts = this.boosts.get(userId) || [];
    return userBoosts.filter(boost => {
      if (!boost.isActive) return false;
      if (boost.endDate && Date.now() > boost.endDate) return false;
      
      if (boost.requirements) {
        if (boost.requirements.minStakeAmount && amount < boost.requirements.minStakeAmount) {
          return false;
        }
      }
      
      return true;
    });
  }

  private async executeStaking(position: StakingPosition, pool: StakingPool): Promise<void> {
    // Mock blockchain interaction
    this.logger.info('Executing staking transaction', {
      positionId: position.id,
      poolId: position.poolId,
      amount: position.amount,
      network: pool.network
    });

    // Simulate transaction time
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async getTokenPrice(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.price;
    }

    // Stale fallback prices - should be replaced with real price API
    console.warn('[STAKING] Using stale fallback price for', symbol);
    const fallbackPrices: Record<string, number> = {
      'ETH': 3000,
      'MATIC': 0.8,
      'SOL': 100,
      'ATOM': 12,
      'NEAR': 3.5,
      'ADA': 0.45
    };

    const price = fallbackPrices[symbol] || 1;
    this.priceCache.set(symbol, { price, timestamp: Date.now() });
    
    return price;
  }

  private getBestPerformer(positions: StakingPosition[]): string {
    let bestPool = '';
    let bestApy = 0;

    for (const position of positions) {
      const pool = this.pools.get(position.poolId);
      if (pool && pool.apy > bestApy) {
        bestApy = pool.apy;
        bestPool = pool.symbol;
      }
    }

    return bestPool;
  }

  private getWorstPerformer(positions: StakingPosition[]): string {
    let worstPool = '';
    let worstApy = Infinity;

    for (const position of positions) {
      const pool = this.pools.get(position.poolId);
      if (pool && pool.apy < worstApy) {
        worstApy = pool.apy;
        worstPool = pool.symbol;
      }
    }

    return worstPool;
  }

  private startRewardCalculator(): void {
    setInterval(async () => {
      try {
        await this.updateAllRewards();
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Reward calculation failed:');
      }
    }, 60 * 1000); // Update every minute
  }

  private startAutoCompoundProcessor(): void {
    setInterval(async () => {
      try {
        await this.processAutoCompounding();
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Auto-compound processing failed:');
      }
    }, 60 * 60 * 1000); // Process every hour
  }

  private startPoolUpdater(): void {
    setInterval(async () => {
      try {
        await this.updatePoolMetrics();
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Pool update failed:');
      }
    }, 5 * 60 * 1000); // Update every 5 minutes
  }

  private async updateAllRewards(): Promise<void> {
    for (const position of this.positions.values()) {
      if (position.status === 'active') {
        const pendingRewards = await this.calculatePendingRewards(position);
        position.rewards.pending = pendingRewards;
        position.rewards.lastUpdate = Date.now();
        this.positions.set(position.id, position);
      }
    }
  }

  private async processAutoCompounding(): Promise<void> {
    for (const position of this.positions.values()) {
      if (position.autoCompound && position.status === 'active') {
        const pendingRewards = await this.calculatePendingRewards(position);
        const compoundableRewards = pendingRewards.filter(r => 
          r.token === this.pools.get(position.poolId)?.symbol
        );

        if (compoundableRewards.length > 0) {
          // Auto-compound logic would go here
          this.logger.info('Auto-compounding rewards', {
            positionId: position.id,
            rewards: compoundableRewards.length
          });
        }
      }
    }
  }

  private async updatePoolMetrics(): Promise<void> {
    for (const pool of this.pools.values()) {
      // APY and TVL remain unchanged without live market data
      // pool.apy and pool.tvl stay at their loaded values

      this.pools.set(pool.id, pool);
    }
  }

  private generatePoolId(symbol: string): string {
    return `pool_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePositionId(): string {
    return `position_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const stakingRewardsSystem = new StakingRewardsSystem();

// Export utility functions
export const StakingUtils = {
  /**
   * Calculate compound annual percentage yield
   */
  calculateCompoundAPY(apr: number, compoundFrequency: number): number {
    return (Math.pow(1 + apr / compoundFrequency, compoundFrequency) - 1) * 100;
  },

  /**
   * Calculate staking rewards over time
   */
  calculateStakingRewards(
    principal: number,
    apr: number,
    days: number,
    compoundFrequency: number = 365
  ): {
    simple: number;
    compound: number;
    difference: number;
  } {
    const years = days / 365;
    const simple = principal * (apr / 100) * years;
    const compound = principal * (Math.pow(1 + (apr / 100) / compoundFrequency, compoundFrequency * years) - 1);
    
    return {
      simple,
      compound,
      difference: compound - simple
    };
  },

  /**
   * Calculate optimal staking allocation
   */
  calculateOptimalAllocation(
    totalAmount: number,
    pools: StakingPool[],
    riskTolerance: number,
    diversificationTarget: number = 5
  ): { poolId: string; allocation: number; percentage: number }[] {
    // Simple allocation strategy
    const eligiblePools = pools
      .filter(pool => pool.isActive)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, diversificationTarget);

    const riskWeights = { low: 1, medium: 0.7, high: 0.4 };
    const allocations: { poolId: string; allocation: number; percentage: number }[] = [];
    
    let totalWeight = 0;
    const poolWeights = eligiblePools.map(pool => {
      const riskWeight = riskWeights[pool.riskLevel];
      const apyWeight = pool.apy / 100;
      const weight = (riskWeight * riskTolerance) + (apyWeight * (1 - riskTolerance));
      totalWeight += weight;
      return { pool, weight };
    });

    for (const { pool, weight } of poolWeights) {
      const percentage = weight / totalWeight;
      const allocation = totalAmount * percentage;
      
      allocations.push({
        poolId: pool.id,
        allocation,
        percentage: percentage * 100
      });
    }

    return allocations;
  },

  /**
   * Calculate impermanent loss for LP staking
   */
  calculateImpermanentLoss(
    initialPrice1: number,
    initialPrice2: number,
    currentPrice1: number,
    currentPrice2: number
  ): number {
    const priceRatio = (currentPrice1 / initialPrice1) / (currentPrice2 / initialPrice2);
    const impermanentLoss = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
    return Math.abs(impermanentLoss) * 100;
  }
};