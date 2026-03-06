/**
 * Portfolio Service Tests
 * Tests for PortfolioService class: initialization, metrics calculation,
 * event system, getters, and edge cases.
 */

// Mock dependencies before imports
jest.mock('../wallet-connector', () => ({
  walletConnector: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getBalance: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimitedFetch', () => ({
  rateLimitedFetch: jest.fn(),
}));

jest.mock('../enhanced-neural-service', () => ({
  enhancedNeuralService: {
    predict: jest.fn(),
  },
}));

jest.mock('@/lib/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
  cacheConfigs: {
    medium: { ttl: 300000, staleWhileRevalidate: true },
  },
}));

import {
  AssetType,
  type Asset,
  type Transaction,
  type PortfolioData,
  type PortfolioMetrics,
  type PerformanceData,
  type AssetAllocation,
  type PortfolioSummary,
} from '../portfolio-service';

// We need to get a fresh instance for each test
function createService() {
  // Clear module cache to get fresh instance
  jest.resetModules();

  // Re-apply mocks
  jest.doMock('../wallet-connector', () => ({
    walletConnector: { connect: jest.fn(), disconnect: jest.fn(), getBalance: jest.fn() },
  }));
  jest.doMock('@/lib/rateLimitedFetch', () => ({
    rateLimitedFetch: jest.fn(),
  }));
  jest.doMock('../enhanced-neural-service', () => ({
    enhancedNeuralService: { predict: jest.fn() },
  }));
  jest.doMock('@/lib/cache', () => ({
    cacheService: {
      get: jest.fn().mockImplementation((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
      set: jest.fn(),
    },
    cacheConfigs: { medium: { ttl: 300000, staleWhileRevalidate: true } },
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../portfolio-service');
  return mod.portfolioService;
}

// Helper to build Asset objects
function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    asset: 'BTC',
    value: 50000,
    quantity: 1,
    price: 50000,
    change24h: 2.5,
    weight: 0.5,
    ...overrides,
  };
}

// Helper to build Transaction objects
function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'buy',
    asset: 'BTC',
    amount: 0.5,
    price: 50000,
    timestamp: new Date().toISOString(),
    fee: 0.001,
    status: 'completed',
    ...overrides,
  };
}

describe('Portfolio Service', () => {
  // =========================================
  // AssetType Enum
  // =========================================
  describe('AssetType enum', () => {
    it('should have BITCOIN value', () => {
      expect(AssetType.BITCOIN).toBe('bitcoin');
    });

    it('should have ORDINAL value', () => {
      expect(AssetType.ORDINAL).toBe('ordinal');
    });

    it('should have RUNE value', () => {
      expect(AssetType.RUNE).toBe('rune');
    });

    it('should have OTHER value', () => {
      expect(AssetType.OTHER).toBe('other');
    });
  });

  // =========================================
  // Initial State (before initialization)
  // =========================================
  describe('initial state', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should return empty assets array before initialization', () => {
      expect(service.getAssets()).toEqual([]);
    });

    it('should return empty transactions array before initialization', () => {
      expect(service.getTransactions()).toEqual([]);
    });

    it('should return null for performance data before initialization', () => {
      expect(service.getPerformanceData()).toBeNull();
    });

    it('should return 0 for total value before initialization', () => {
      expect(service.getTotalValue()).toBe(0);
    });

    it('should return null for metrics before initialization', () => {
      expect(service.getMetrics()).toBeNull();
    });

    it('should return false for isLoadingData before initialization', () => {
      expect(service.isLoadingData()).toBe(false);
    });

    it('should return null for last sync time before initialization', () => {
      expect(service.getLastSyncTime()).toBeNull();
    });

    it('should return null for portfolio summary before initialization', () => {
      expect(service.getPortfolioSummary()).toBeNull();
    });
  });

  // =========================================
  // Event System
  // =========================================
  describe('event system', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should register and call event listeners', () => {
      const callback = jest.fn();
      service.on('test_event', callback);
      service.emit('test_event', 'arg1', 'arg2');
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should support multiple listeners for same event', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      service.on('test_event', cb1);
      service.on('test_event', cb2);
      service.emit('test_event');
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('should unregister event listeners with off()', () => {
      const callback = jest.fn();
      service.on('test_event', callback);
      service.off('test_event', callback);
      service.emit('test_event');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not throw when emitting event with no listeners', () => {
      expect(() => service.emit('nonexistent_event')).not.toThrow();
    });

    it('should not throw when removing listener from event with no listeners', () => {
      const callback = jest.fn();
      expect(() => service.off('nonexistent_event', callback)).not.toThrow();
    });

    it('should catch errors in event listeners without breaking other listeners', () => {
      const errorCb = jest.fn(() => {
        throw new Error('listener error');
      });
      const goodCb = jest.fn();

      service.on('test_event', errorCb);
      service.on('test_event', goodCb);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      service.emit('test_event');
      consoleSpy.mockRestore();

      expect(errorCb).toHaveBeenCalled();
      expect(goodCb).toHaveBeenCalled();
    });

    it('should only remove the specific listener, not all listeners', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      service.on('test_event', cb1);
      service.on('test_event', cb2);
      service.off('test_event', cb1);
      service.emit('test_event');
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================
  // syncPortfolio (without initialization)
  // =========================================
  describe('syncPortfolio', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should throw when wallet address is not set', async () => {
      await expect(service.syncPortfolio()).rejects.toThrow(
        'Wallet address not set. Call initialize() first.'
      );
    });
  });

  // =========================================
  // calculatePortfolioMetrics (via reflection)
  // =========================================
  describe('calculatePortfolioMetrics', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should calculate total value from assets', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 50000 }),
        makeAsset({ asset: 'ordinal', value: 10000 }),
        makeAsset({ asset: 'rune', value: 5000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.totalValue).toBe(65000);
    });

    it('should calculate BTC dominance correctly', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 80000 }),
        makeAsset({ asset: 'ordinal', value: 20000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 80000);
      expect(metrics.btcDominance).toBe(80);
    });

    it('should calculate ordinals dominance correctly', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 60000 }),
        makeAsset({ asset: 'ordinal', value: 40000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 60000);
      expect(metrics.ordinalsDominance).toBe(40);
    });

    it('should calculate runes dominance correctly', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 50000 }),
        makeAsset({ asset: 'rune', value: 50000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.runesDominance).toBe(50);
    });

    it('should handle bitcoin asset name variants', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'bitcoin', value: 100000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 100000);
      expect(metrics.btcDominance).toBe(100);
    });

    it('should handle ORDI asset name for ordinals', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'ORDI', value: 10000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.ordinalsDominance).toBe(100);
    });

    it('should handle RUNE asset name for runes', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'RUNE', value: 5000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.runesDominance).toBe(100);
    });

    it('should return 0 dominance for empty assets', () => {
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics([], [], 50000);
      expect(metrics.btcDominance).toBe(0);
      expect(metrics.ordinalsDominance).toBe(0);
      expect(metrics.runesDominance).toBe(0);
    });

    it('should return 0 total value for empty assets', () => {
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics([], [], 50000);
      expect(metrics.totalValue).toBe(0);
    });

    it('should set assetAllocation to match dominance values', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 70000 }),
        makeAsset({ asset: 'ordinal', value: 20000 }),
        makeAsset({ asset: 'rune', value: 10000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 70000);
      expect(metrics.assetAllocation.bitcoin).toBe(metrics.btcDominance);
      expect(metrics.assetAllocation.ordinals).toBe(metrics.ordinalsDominance);
      expect(metrics.assetAllocation.runes).toBe(metrics.runesDominance);
    });

    it('should return zero for cost basis and P&L fields', () => {
      const assets: Asset[] = [makeAsset({ asset: 'BTC', value: 50000 })];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.totalCostBasis).toBe(0);
      expect(metrics.unrealizedProfitLoss).toBe(0);
      expect(metrics.realizedProfitLoss).toBe(0);
      expect(metrics.roi).toBe(0);
    });

    it('should return zero for change fields without history', () => {
      const assets: Asset[] = [makeAsset({ asset: 'BTC', value: 50000 })];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.totalChange24h).toBe(0);
      expect(metrics.totalChange7d).toBe(0);
      expect(metrics.totalChange30d).toBe(0);
    });

    it('should include a lastUpdated timestamp', () => {
      const before = new Date().toISOString();
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics([], [], 50000);
      const after = new Date().toISOString();
      expect(metrics.lastUpdated >= before).toBe(true);
      expect(metrics.lastUpdated <= after).toBe(true);
    });

    it('should handle assets with zero value', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 0 }),
        makeAsset({ asset: 'ordinal', value: 0 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.totalValue).toBe(0);
      expect(metrics.btcDominance).toBe(0);
    });
  });

  // =========================================
  // getPerformanceData
  // =========================================
  describe('getPerformanceData', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should return null when no portfolio data exists', () => {
      expect(service.getPerformanceData()).toBeNull();
    });

    it('should return PerformanceData when portfolio data exists', () => {
      // Manually set portfolioData to test getter
      const mockMetrics: PortfolioMetrics = {
        totalValue: 100000,
        totalChange24h: 5.2,
        totalChange7d: -2.1,
        totalChange30d: 15.3,
        btcDominance: 80,
        ordinalsDominance: 15,
        runesDominance: 5,
        roi: 12.5,
        volatility: 0.3,
        sharpeRatio: 1.2,
        maxDrawdown: -8,
        bestDay: { date: '2026-01-15', change: 7.5 },
        worstDay: { date: '2026-01-20', change: -4.2 },
        allTimeReturnPct: 0,
        allTimeReturnUsd: 0,
        dailyChangePct: 0,
        dailyChangeUsd: 0,
        weeklyChangePct: 0,
        weeklyChangeUsd: 0,
        monthlyChangePct: 0,
        monthlyChangeUsd: 0,
        totalCostBasis: 0,
        unrealizedProfitLoss: 0,
        realizedProfitLoss: 0,
        assetAllocation: { bitcoin: 80, ordinals: 15, runes: 5 },
        riskScore: 0,
        lastUpdated: new Date().toISOString(),
      };

      service.portfolioData = {
        assets: [],
        transactions: [],
        totalValue: 100000,
        btcPrice: 95000,
        lastUpdated: new Date().toISOString(),
        metrics: mockMetrics,
      };

      const perf = service.getPerformanceData();
      expect(perf).not.toBeNull();
      expect(perf.totalValue).toBe(100000);
      expect(perf.totalChange).toBe(5.2);
      expect(perf.roi).toBe(12.5);
      expect(perf.volatility).toBe(0.3);
      expect(perf.sharpeRatio).toBe(1.2);
      expect(perf.maxDrawdown).toBe(-8);
      expect(perf.bestDay).toEqual({ date: '2026-01-15', change: 7.5 });
      expect(perf.worstDay).toEqual({ date: '2026-01-20', change: -4.2 });
    });

    it('should include AI insights in performance data', () => {
      service.portfolioData = {
        assets: [],
        transactions: [],
        totalValue: 50000,
        btcPrice: 95000,
        lastUpdated: new Date().toISOString(),
        metrics: {
          totalValue: 50000,
          totalChange24h: 0,
          totalChange7d: 0,
          totalChange30d: 0,
          btcDominance: 100,
          ordinalsDominance: 0,
          runesDominance: 0,
          roi: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          bestDay: { date: '', change: 0 },
          worstDay: { date: '', change: 0 },
          allTimeReturnPct: 0, allTimeReturnUsd: 0,
          dailyChangePct: 0, dailyChangeUsd: 0,
          weeklyChangePct: 0, weeklyChangeUsd: 0,
          monthlyChangePct: 0, monthlyChangeUsd: 0,
          totalCostBasis: 0, unrealizedProfitLoss: 0, realizedProfitLoss: 0,
          assetAllocation: { bitcoin: 100, ordinals: 0, runes: 0 },
          riskScore: 0, lastUpdated: new Date().toISOString(),
        },
      };

      const perf = service.getPerformanceData();
      expect(perf.aiInsights).toBeDefined();
      expect(perf.aiInsights.trendAnalysis).toBeTruthy();
      expect(perf.aiInsights.riskAssessment).toBeTruthy();
      expect(Array.isArray(perf.aiInsights.recommendations)).toBe(true);
      expect(perf.aiInsights.recommendations.length).toBeGreaterThan(0);
    });

    it('should set predictedTrend to neutral by default', () => {
      service.portfolioData = {
        assets: [],
        transactions: [],
        totalValue: 10000,
        btcPrice: 95000,
        lastUpdated: new Date().toISOString(),
        metrics: {
          totalValue: 10000, totalChange24h: 0, totalChange7d: 0, totalChange30d: 0,
          btcDominance: 0, ordinalsDominance: 0, runesDominance: 0,
          roi: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0,
          bestDay: { date: '', change: 0 }, worstDay: { date: '', change: 0 },
          allTimeReturnPct: 0, allTimeReturnUsd: 0,
          dailyChangePct: 0, dailyChangeUsd: 0,
          weeklyChangePct: 0, weeklyChangeUsd: 0,
          monthlyChangePct: 0, monthlyChangeUsd: 0,
          totalCostBasis: 0, unrealizedProfitLoss: 0, realizedProfitLoss: 0,
          assetAllocation: { bitcoin: 0, ordinals: 0, runes: 0 },
          riskScore: 0, lastUpdated: new Date().toISOString(),
        },
      };

      const perf = service.getPerformanceData();
      expect(perf.predictedTrend).toBe('neutral');
      expect(perf.confidenceScore).toBe(0.5);
    });
  });

  // =========================================
  // getPortfolioSummary
  // =========================================
  describe('getPortfolioSummary', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should return null when no portfolio data', () => {
      expect(service.getPortfolioSummary()).toBeNull();
    });

    it('should return summary with correct asset allocation', () => {
      service.portfolioData = {
        assets: [
          makeAsset({ asset: 'BTC', value: 80000 }),
          makeAsset({ asset: 'ordinal', value: 15000 }),
          makeAsset({ asset: 'rune', value: 5000 }),
        ],
        transactions: [],
        totalValue: 100000,
        btcPrice: 80000,
        lastUpdated: '2026-03-06T00:00:00.000Z',
        metrics: {
          totalValue: 100000, totalChange24h: 1.5, totalChange7d: 3.2, totalChange30d: 10.1,
          btcDominance: 80, ordinalsDominance: 15, runesDominance: 5,
          roi: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0,
          bestDay: { date: '', change: 0 }, worstDay: { date: '', change: 0 },
          allTimeReturnPct: 0, allTimeReturnUsd: 0,
          dailyChangePct: 0, dailyChangeUsd: 0,
          weeklyChangePct: 0, weeklyChangeUsd: 0,
          monthlyChangePct: 0, monthlyChangeUsd: 0,
          totalCostBasis: 0, unrealizedProfitLoss: 0, realizedProfitLoss: 0,
          assetAllocation: { bitcoin: 80, ordinals: 15, runes: 5 },
          riskScore: 0, lastUpdated: '2026-03-06T00:00:00.000Z',
        },
      };

      const summary = service.getPortfolioSummary();
      expect(summary).not.toBeNull();
      expect(summary.totalValue).toBe(100000);
      expect(summary.totalChange24h).toBe(1.5);
      expect(summary.totalChange7d).toBe(3.2);
      expect(summary.totalChange30d).toBe(10.1);
    });

    it('should compute assetAllocation array with 3 entries', () => {
      service.portfolioData = {
        assets: [],
        transactions: [],
        totalValue: 200000,
        btcPrice: 95000,
        lastUpdated: new Date().toISOString(),
        metrics: {
          totalValue: 200000, totalChange24h: 0, totalChange7d: 0, totalChange30d: 0,
          btcDominance: 60, ordinalsDominance: 25, runesDominance: 15,
          roi: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0,
          bestDay: { date: '', change: 0 }, worstDay: { date: '', change: 0 },
          allTimeReturnPct: 0, allTimeReturnUsd: 0,
          dailyChangePct: 0, dailyChangeUsd: 0,
          weeklyChangePct: 0, weeklyChangeUsd: 0,
          monthlyChangePct: 0, monthlyChangeUsd: 0,
          totalCostBasis: 0, unrealizedProfitLoss: 0, realizedProfitLoss: 0,
          assetAllocation: { bitcoin: 60, ordinals: 25, runes: 15 },
          riskScore: 0, lastUpdated: new Date().toISOString(),
        },
      };

      const summary = service.getPortfolioSummary();
      expect(summary.assetAllocation).toHaveLength(3);

      const btcAlloc = summary.assetAllocation.find((a: AssetAllocation) => a.type === 'Bitcoin');
      expect(btcAlloc).toBeDefined();
      expect(btcAlloc.percentage).toBe(60);
      expect(btcAlloc.value).toBe(120000); // 200000 * 60/100

      const ordiAlloc = summary.assetAllocation.find((a: AssetAllocation) => a.type === 'Ordinals');
      expect(ordiAlloc).toBeDefined();
      expect(ordiAlloc.percentage).toBe(25);
      expect(ordiAlloc.value).toBe(50000); // 200000 * 25/100

      const runeAlloc = summary.assetAllocation.find((a: AssetAllocation) => a.type === 'Runes');
      expect(runeAlloc).toBeDefined();
      expect(runeAlloc.percentage).toBe(15);
      expect(runeAlloc.value).toBe(30000); // 200000 * 15/100
    });

    it('should assign correct colors to asset allocation', () => {
      service.portfolioData = {
        assets: [], transactions: [], totalValue: 100000, btcPrice: 95000,
        lastUpdated: new Date().toISOString(),
        metrics: {
          totalValue: 100000, totalChange24h: 0, totalChange7d: 0, totalChange30d: 0,
          btcDominance: 50, ordinalsDominance: 30, runesDominance: 20,
          roi: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0,
          bestDay: { date: '', change: 0 }, worstDay: { date: '', change: 0 },
          allTimeReturnPct: 0, allTimeReturnUsd: 0,
          dailyChangePct: 0, dailyChangeUsd: 0,
          weeklyChangePct: 0, weeklyChangeUsd: 0,
          monthlyChangePct: 0, monthlyChangeUsd: 0,
          totalCostBasis: 0, unrealizedProfitLoss: 0, realizedProfitLoss: 0,
          assetAllocation: { bitcoin: 50, ordinals: 30, runes: 20 },
          riskScore: 0, lastUpdated: new Date().toISOString(),
        },
      };

      const summary = service.getPortfolioSummary();
      const btcAlloc = summary.assetAllocation.find((a: AssetAllocation) => a.type === 'Bitcoin');
      const ordiAlloc = summary.assetAllocation.find((a: AssetAllocation) => a.type === 'Ordinals');
      const runeAlloc = summary.assetAllocation.find((a: AssetAllocation) => a.type === 'Runes');

      expect(btcAlloc.color).toBe('#F7931A');
      expect(ordiAlloc.color).toBe('#FF6B35');
      expect(runeAlloc.color).toBe('#4ECDC4');
    });
  });

  // =========================================
  // Getter consistency
  // =========================================
  describe('getter consistency', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('getTotalValue should return portfolioData.totalValue', () => {
      service.portfolioData = {
        assets: [], transactions: [], totalValue: 42000, btcPrice: 95000,
        lastUpdated: '', metrics: {} as PortfolioMetrics,
      };
      expect(service.getTotalValue()).toBe(42000);
    });

    it('getAssets should return portfolioData.assets', () => {
      const assets = [makeAsset({ asset: 'BTC', value: 1000 })];
      service.portfolioData = {
        assets, transactions: [], totalValue: 1000, btcPrice: 95000,
        lastUpdated: '', metrics: {} as PortfolioMetrics,
      };
      expect(service.getAssets()).toBe(assets);
    });

    it('getTransactions should return portfolioData.transactions', () => {
      const txns = [makeTransaction()];
      service.portfolioData = {
        assets: [], transactions: txns, totalValue: 0, btcPrice: 95000,
        lastUpdated: '', metrics: {} as PortfolioMetrics,
      };
      expect(service.getTransactions()).toBe(txns);
    });

    it('getMetrics should return portfolioData.metrics', () => {
      const metrics = { totalValue: 500 } as PortfolioMetrics;
      service.portfolioData = {
        assets: [], transactions: [], totalValue: 500, btcPrice: 95000,
        lastUpdated: '', metrics,
      };
      expect(service.getMetrics()).toBe(metrics);
    });
  });

  // =========================================
  // Edge cases: dominance with mixed asset names
  // =========================================
  describe('dominance edge cases', () => {
    let service: any;

    beforeEach(() => {
      service = createService();
    });

    it('should sum both BTC and bitcoin asset names for btcDominance', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 30000 }),
        makeAsset({ asset: 'bitcoin', value: 20000 }),
        makeAsset({ asset: 'ordinal', value: 50000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.btcDominance).toBe(50); // (30k + 20k) / 100k = 50%
    });

    it('should sum both ordinal and ORDI for ordinalsDominance', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'ordinal', value: 15000 }),
        makeAsset({ asset: 'ORDI', value: 5000 }),
        makeAsset({ asset: 'BTC', value: 80000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 80000);
      expect(metrics.ordinalsDominance).toBe(20); // (15k + 5k) / 100k
    });

    it('should sum both rune and RUNE for runesDominance', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'rune', value: 10000 }),
        makeAsset({ asset: 'RUNE', value: 10000 }),
        makeAsset({ asset: 'BTC', value: 80000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 80000);
      expect(metrics.runesDominance).toBe(20); // (10k + 10k) / 100k
    });

    it('should handle unknown asset types (not counted in any dominance)', () => {
      const assets: Asset[] = [
        makeAsset({ asset: 'BTC', value: 50000 }),
        makeAsset({ asset: 'SOL', value: 50000 }),
      ];
      const metrics: PortfolioMetrics = service.calculatePortfolioMetrics(assets, [], 50000);
      expect(metrics.btcDominance).toBe(50);
      expect(metrics.ordinalsDominance).toBe(0);
      expect(metrics.runesDominance).toBe(0);
      // totalValue should include all assets
      expect(metrics.totalValue).toBe(100000);
    });
  });

  // =========================================
  // Type structure validation
  // =========================================
  describe('type structure validation', () => {
    it('Asset type should have required fields', () => {
      const asset: Asset = makeAsset();
      expect(asset).toHaveProperty('asset');
      expect(asset).toHaveProperty('value');
      expect(asset).toHaveProperty('quantity');
      expect(asset).toHaveProperty('price');
      expect(asset).toHaveProperty('change24h');
      expect(asset).toHaveProperty('weight');
    });

    it('Transaction type should have required fields', () => {
      const tx: Transaction = makeTransaction();
      expect(tx).toHaveProperty('id');
      expect(tx).toHaveProperty('type');
      expect(tx).toHaveProperty('asset');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('price');
      expect(tx).toHaveProperty('timestamp');
      expect(tx).toHaveProperty('fee');
      expect(tx).toHaveProperty('status');
    });

    it('Transaction type should only allow valid types', () => {
      const buyTx = makeTransaction({ type: 'buy' });
      const sellTx = makeTransaction({ type: 'sell' });
      const transferTx = makeTransaction({ type: 'transfer' });
      expect(buyTx.type).toBe('buy');
      expect(sellTx.type).toBe('sell');
      expect(transferTx.type).toBe('transfer');
    });

    it('Transaction status should only allow valid values', () => {
      const completed = makeTransaction({ status: 'completed' });
      const pending = makeTransaction({ status: 'pending' });
      const failed = makeTransaction({ status: 'failed' });
      expect(completed.status).toBe('completed');
      expect(pending.status).toBe('pending');
      expect(failed.status).toBe('failed');
    });
  });
});
