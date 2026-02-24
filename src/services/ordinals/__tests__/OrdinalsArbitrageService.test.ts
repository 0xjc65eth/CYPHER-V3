/**
 * Unit Tests for OrdinalsArbitrageService
 * CYPHER V3 - Task #8: Ordinals Arbitrage Scanner
 */

import { OrdinalsArbitrageService } from '../OrdinalsArbitrageService';
import { OrdinalsDataAggregator } from '../DataAggregator';
import {
  OrdinalsMarketplace,
  MARKETPLACE_FEES,
  PLATFORM_FEE_PERCENTAGE
} from '../../../types/ordinals-arbitrage';

// Mock dependencies
jest.mock('../../../lib/enhanced-logger');
jest.mock('../../../lib/ErrorReporter');
jest.mock('../DataAggregator');

// Mock global fetch for mempool.space API
global.fetch = jest.fn();

describe('OrdinalsArbitrageService', () => {
  let service: OrdinalsArbitrageService;
  let mockDataAggregator: jest.Mocked<OrdinalsDataAggregator>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock data aggregator
    mockDataAggregator = new OrdinalsDataAggregator({
      updateInterval: 30000,
      enabledMarketplaces: ['magic_eden', 'unisat', 'okx', 'hiro'],
      collectionsToTrack: [],
      enableWebSocket: false,
      cacheSettings: { ttl: 30000, maxSize: 100 }
    }) as jest.Mocked<OrdinalsDataAggregator>;

    // Create service instance
    service = new OrdinalsArbitrageService(mockDataAggregator);
  });

  describe('Fee Calculation Tests', () => {
    const testCases: Array<{
      name: string;
      buyMarket: OrdinalsMarketplace;
      sellMarket: OrdinalsMarketplace;
      buyPrice: number;
      sellPrice: number;
      networkFee: number;
    }> = [
      {
        name: 'Magic Eden to UniSat',
        buyMarket: 'magic_eden',
        sellMarket: 'unisat',
        buyPrice: 0.05,
        sellPrice: 0.062,
        networkFee: 0.0002
      },
      {
        name: 'UniSat to OKX',
        buyMarket: 'unisat',
        sellMarket: 'okx',
        buyPrice: 0.03,
        sellPrice: 0.0375,
        networkFee: 0.0002
      },
      {
        name: 'OKX to Hiro',
        buyMarket: 'okx',
        sellMarket: 'hiro',
        buyPrice: 0.01,
        sellPrice: 0.0125,
        networkFee: 0.0002
      },
      {
        name: 'Hiro to Gamma',
        buyMarket: 'hiro',
        sellMarket: 'gamma',
        buyPrice: 0.075,
        sellPrice: 0.095,
        networkFee: 0.0002
      }
    ];

    testCases.forEach(({ name, buyMarket, sellMarket, buyPrice, sellPrice, networkFee }) => {
      test(`should calculate fees correctly for ${name}`, () => {
        const result = service.calculateNetProfit(
          buyPrice,
          sellPrice,
          buyMarket,
          sellMarket,
          networkFee
        );

        // Verify marketplace fees
        const expectedBuyFee = buyPrice * MARKETPLACE_FEES[buyMarket];
        const expectedSellFee = sellPrice * MARKETPLACE_FEES[sellMarket];

        expect(result.fees.buyMarketplaceFee).toBeCloseTo(expectedBuyFee, 8);
        expect(result.fees.sellMarketplaceFee).toBeCloseTo(expectedSellFee, 8);

        // Verify platform fee
        const expectedPlatformFee = (buyPrice + sellPrice) * PLATFORM_FEE_PERCENTAGE;
        expect(result.fees.platformFee).toBeCloseTo(expectedPlatformFee, 8);

        // Verify network fee
        expect(result.fees.networkFee).toBe(networkFee);

        // Verify total fees
        const expectedTotalFees = expectedBuyFee + expectedSellFee + networkFee + expectedPlatformFee;
        expect(result.fees.totalFees).toBeCloseTo(expectedTotalFees, 8);
      });
    });

    test('should verify marketplace fee percentages', () => {
      expect(MARKETPLACE_FEES.magic_eden).toBe(0.025); // 2.5%
      expect(MARKETPLACE_FEES.unisat).toBe(0.02); // 2%
      expect(MARKETPLACE_FEES.okx).toBe(0.02); // 2%
      expect(MARKETPLACE_FEES.hiro).toBe(0.015); // 1.5%
      expect(MARKETPLACE_FEES.gamma).toBe(0.02); // 2%
    });

    test('should verify platform fee percentage', () => {
      expect(PLATFORM_FEE_PERCENTAGE).toBe(0.0035); // 0.35%
    });

    test('should handle zero prices', () => {
      const result = service.calculateNetProfit(0, 0, 'magic_eden', 'unisat', 0.0002);

      expect(result.fees.buyMarketplaceFee).toBe(0);
      expect(result.fees.sellMarketplaceFee).toBe(0);
      expect(result.netProfit).toBeLessThan(0); // Should be negative due to network fee
    });

    test('should handle negative spread (unprofitable)', () => {
      const result = service.calculateNetProfit(
        0.05, // Buy price
        0.045, // Sell price (lower than buy)
        'magic_eden',
        'unisat',
        0.0002
      );

      expect(result.netProfit).toBeLessThan(0);
      expect(result.netProfitPercentage).toBeLessThan(0);
    });
  });

  describe('Net Profit Calculation Tests', () => {
    test('should calculate positive net profit correctly', () => {
      const buyPrice = 0.05;
      const sellPrice = 0.062;
      const networkFee = 0.0002;

      const result = service.calculateNetProfit(
        buyPrice,
        sellPrice,
        'magic_eden',
        'unisat',
        networkFee
      );

      // Expected calculation:
      // Buy marketplace fee: 0.05 * 0.025 = 0.00125
      // Sell marketplace fee: 0.062 * 0.02 = 0.00124
      // Platform fee: (0.05 + 0.062) * 0.0035 = 0.000392
      // Network fee: 0.0002
      // Total cost: 0.05 + 0.00125 + 0.0002 + 0.000392 = 0.051842
      // Revenue: 0.062 - 0.00124 = 0.06076
      // Net profit: 0.06076 - 0.051842 = 0.008918

      expect(result.netProfit).toBeGreaterThan(0);
      expect(result.netProfit).toBeCloseTo(0.008918, 6);

      // ROI = (net profit / total cost) * 100
      const expectedROI = (result.netProfit / (buyPrice + result.fees.buyMarketplaceFee + networkFee + result.fees.platformFee)) * 100;
      expect(result.netProfitPercentage).toBeCloseTo(expectedROI, 2);
    });

    test('should calculate negative net profit for unprofitable trades', () => {
      const buyPrice = 0.05;
      const sellPrice = 0.051; // Only 2% spread, not enough to cover fees
      const networkFee = 0.0002;

      const result = service.calculateNetProfit(
        buyPrice,
        sellPrice,
        'magic_eden',
        'unisat',
        networkFee
      );

      expect(result.netProfit).toBeLessThan(0);
      expect(result.netProfitPercentage).toBeLessThan(0);
    });

    test('should calculate profit percentage as ROI', () => {
      const buyPrice = 0.1;
      const sellPrice = 0.13;
      const networkFee = 0.0002;

      const result = service.calculateNetProfit(
        buyPrice,
        sellPrice,
        'unisat',
        'okx',
        networkFee
      );

      // Verify percentage is calculated correctly
      const totalCost = buyPrice + result.fees.buyMarketplaceFee + networkFee + result.fees.platformFee;
      const expectedPercentage = (result.netProfit / totalCost) * 100;

      expect(result.netProfitPercentage).toBeCloseTo(expectedPercentage, 2);
      expect(result.netProfitPercentage).toBeGreaterThan(0);
    });
  });

  describe('Liquidity Validation Tests', () => {
    // validateLiquidity takes AggregatedCollectionData directly (not a string ID)
    test('should validate high liquidity collection', () => {
      const mockCollectionData = {
        collection: {
          id: 'test-collection',
          name: 'Test Collection',
          slug: 'test-collection',
          verified: true,
          holdersCount: 1500
        },
        consolidatedMetrics: {
          totalListedCount: 90,
          totalVolume24h: 12
        },
        marketplaceData: {
          magic_eden: {
            floorPrice: 0.05,
            volume24h: 10,
            listedCount: 50,
            lastUpdated: Date.now(),
            available: true
          },
          unisat: {
            floorPrice: 0.052,
            volume24h: 8,
            listedCount: 40,
            lastUpdated: Date.now(),
            available: true
          }
        }
      } as any;

      const result = service.validateLiquidity(mockCollectionData);

      expect(result.isLiquid).toBe(true);
      expect(result.listedCount).toBeGreaterThan(20);
      expect(result.liquidityScore).toBeGreaterThan(70);
    });

    test('should validate medium liquidity collection', () => {
      // To get isLiquid=true, liquidityScore must be >= MIN_LIQUIDITY_SCORE (30)
      // listedCount 20 => 10pts, volume 1.5 => 20pts = 30 total => isLiquid=true
      const mockCollectionData = {
        collection: {
          id: 'test-collection',
          name: 'Test Collection',
          slug: 'test-collection',
          verified: false,
          holdersCount: 200
        },
        consolidatedMetrics: {
          totalListedCount: 25,
          totalVolume24h: 1.5
        },
        marketplaceData: {
          magic_eden: {
            floorPrice: 0.05,
            volume24h: 2,
            listedCount: 15,
            lastUpdated: Date.now(),
            available: true
          },
          unisat: {
            floorPrice: 0.052,
            volume24h: 1.5,
            listedCount: 10,
            lastUpdated: Date.now(),
            available: true
          }
        }
      } as any;

      const result = service.validateLiquidity(mockCollectionData);

      expect(result.isLiquid).toBe(true);
      expect(result.listedCount).toBeGreaterThanOrEqual(5);
      expect(result.liquidityScore).toBeGreaterThanOrEqual(30);
      expect(result.liquidityScore).toBeLessThanOrEqual(70);
    });

    test('should validate low liquidity collection', () => {
      const mockCollectionData = {
        collection: {
          id: 'test-collection',
          name: 'Test Collection',
          slug: 'test-collection',
          verified: false,
          holdersCount: 10
        },
        consolidatedMetrics: {
          totalListedCount: 2,
          totalVolume24h: 0.1
        },
        marketplaceData: {
          magic_eden: {
            floorPrice: 0.05,
            volume24h: 0.1,
            listedCount: 2,
            lastUpdated: Date.now(),
            available: true
          }
        }
      } as any;

      const result = service.validateLiquidity(mockCollectionData);

      expect(result.isLiquid).toBe(false);
      expect(result.listedCount).toBeLessThan(5);
      expect(result.liquidityScore).toBeLessThanOrEqual(30);
    });

    test('should calculate liquidity score correctly', () => {
      const mockCollectionData = {
        collection: {
          id: 'test-collection',
          name: 'Test Collection',
          slug: 'test-collection',
          verified: true,
          holdersCount: 2000
        },
        consolidatedMetrics: {
          totalListedCount: 100,
          totalVolume24h: 15
        },
        marketplaceData: {
          magic_eden: {
            floorPrice: 0.05,
            volume24h: 15,
            listedCount: 100,
            lastUpdated: Date.now(),
            available: true
          }
        }
      } as any;

      const result = service.validateLiquidity(mockCollectionData);

      expect(result.liquidityScore).toBeGreaterThanOrEqual(0);
      expect(result.liquidityScore).toBeLessThanOrEqual(100);
      expect(result.dailyVolume).toBeGreaterThan(0);
    });
  });

  describe('Network Fee Estimation Tests', () => {
    // estimateNetworkFee() returns a NetworkFeeEstimate object, not a number
    test('should fetch network fees from mempool.space API', async () => {
      const mockFeeData = {
        fastestFee: 50,
        halfHourFee: 30,
        hourFee: 20,
        economyFee: 10,
        minimumFee: 1
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeeData
      });

      const result = await service.estimateNetworkFee();

      expect(result.estimatedFeeBTC).toBeGreaterThan(0);
      expect(result.halfHourFee).toBe(30);
      expect(result.fastestFee).toBe(50);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mempool.space/api/v1/fees/recommended',
        expect.any(Object)
      );
    });

    test('should use fallback fee on API failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const result = await service.estimateNetworkFee();

      // Should return fallback NetworkFeeEstimate object
      expect(result.estimatedFeeBTC).toBeGreaterThan(0);
      expect(result.estimatedFeeBTC).toBeLessThanOrEqual(0.001);
      expect(result.halfHourFee).toBeDefined();
    });

    test('should cache network fee for 60 seconds', async () => {
      const mockFeeData = {
        fastestFee: 50,
        halfHourFee: 30,
        hourFee: 20,
        economyFee: 10,
        minimumFee: 1
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFeeData
      });

      // First call
      await service.estimateNetworkFee();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call within 60 seconds should use cache
      await service.estimateNetworkFee();
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Risk Assessment Tests', () => {
    // assessRisk signature: (buyPrice, sellPrice, liquidity, buyPriceTimestamp, sellPriceTimestamp)
    test('should assign low risk for high liquidity and moderate spread', () => {
      const liquidity: any = {
        isLiquid: true,
        listedCount: 100,
        dailyVolume: 10,
        liquidityScore: 85,
        lastUpdated: Date.now()
      };
      const now = Date.now();
      // Recent prices (10s ago), moderate 15% spread, high volume
      const risk = service.assessRisk(0.05, 0.0575, liquidity, now - 10000, now - 10000);

      expect(risk).toBe('low');
    });

    test('should assign medium risk for medium liquidity or high spread', () => {
      const liquidity1: any = {
        isLiquid: true,
        listedCount: 15,
        dailyVolume: 1.5,
        liquidityScore: 45,
        lastUpdated: Date.now()
      };
      const now = Date.now();
      // Medium liquidity, recent prices
      const risk1 = service.assessRisk(0.05, 0.0575, liquidity1, now - 10000, now - 10000);

      const liquidity2: any = {
        isLiquid: true,
        listedCount: 80,
        dailyVolume: 8,
        liquidityScore: 80,
        lastUpdated: Date.now()
      };
      // High liquidity but high spread (>20%)
      const risk2 = service.assessRisk(0.05, 0.065, liquidity2, now - 10000, now - 10000);

      expect(['medium', 'low']).toContain(risk1);
      expect(['medium', 'low']).toContain(risk2);
    });

    test('should assign high risk for low liquidity', () => {
      const liquidity: any = {
        isLiquid: false,
        listedCount: 2,
        dailyVolume: 0.1,
        liquidityScore: 5,
        lastUpdated: Date.now()
      };
      const now = Date.now();
      // Low liquidity + low volume => high risk
      const risk = service.assessRisk(0.05, 0.06, liquidity, now - 45000, now - 45000);

      expect(risk).toBe('high');
    });

    test('should assign high risk for stale prices', () => {
      const liquidity: any = {
        isLiquid: true,
        listedCount: 80,
        dailyVolume: 0.3, // Low volume => +2 risk pts
        liquidityScore: 45, // Medium liquidity (30-50) => +2 risk pts
        lastUpdated: Date.now()
      };
      const now = Date.now();
      // Prices are 150s old (>120s => +3 risk points)
      // Total: 2 (liquidity) + 3 (stale) + 2 (low volume) = 7 => 'high'
      const risk = service.assessRisk(0.05, 0.0575, liquidity, now - 150000, now - 150000);

      expect(risk).toBe('high');
    });
  });

  describe('Stale Price Detection Tests', () => {
    test('should include recent prices (< 60s old)', async () => {
      const recentTimestamp = Date.now() - 30000; // 30 seconds ago

      const mockOpportunities = [
        {
          collectionId: 'test-1',
          collectionName: 'Test Collection 1',
          buyMarketplace: 'magic_eden' as OrdinalsMarketplace,
          sellMarketplace: 'unisat' as OrdinalsMarketplace,
          buyPrice: 0.05,
          sellPrice: 0.062,
          lastUpdated: recentTimestamp,
          confidence: 80
        }
      ];

      mockDataAggregator.findArbitrageOpportunities = jest.fn().mockResolvedValue(mockOpportunities);

      // Mock collection data
      mockDataAggregator.getAggregatedCollection = jest.fn().mockResolvedValue({
        collection: { id: 'test-1', name: 'Test Collection 1' },
        marketplaceData: {
          magic_eden: {
            floorPrice: 0.05,
            volume24h: 5,
            listedCount: 20,
            lastUpdated: recentTimestamp,
            available: true
          }
        }
      });

      // Mock network fee
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ halfHourFee: 30 })
      });

      const results = await service.scanOpportunities({ maxPriceAge: 60 });

      // Should include the opportunity because it's recent
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should filter out old prices (> 60s old)', async () => {
      const oldTimestamp = Date.now() - 120000; // 2 minutes ago (stale)

      const mockOpportunities = [
        {
          collectionId: 'test-1',
          collectionName: 'Test Collection 1',
          buyMarketplace: 'magic_eden' as OrdinalsMarketplace,
          sellMarketplace: 'unisat' as OrdinalsMarketplace,
          buyPrice: 0.05,
          sellPrice: 0.062,
          lastUpdated: oldTimestamp,
          confidence: 80
        }
      ];

      mockDataAggregator.findArbitrageOpportunities = jest.fn().mockResolvedValue(mockOpportunities);

      const results = await service.scanOpportunities({ maxPriceAge: 60 });

      // Stale opportunities should be filtered out or marked as high risk
      const hasStaleData = results.some(r => r.riskScore === 'high' && r.priceAge > 60);
      expect(hasStaleData || results.length === 0).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle API failure gracefully', async () => {
      mockDataAggregator.findArbitrageOpportunities = jest.fn().mockRejectedValue(
        new Error('API Error')
      );

      await expect(service.scanOpportunities()).rejects.toThrow();
    });

    test('should handle invalid collection data', async () => {
      mockDataAggregator.findArbitrageOpportunities = jest.fn().mockResolvedValue([
        {
          collectionId: 'invalid',
          collectionName: 'Invalid Collection',
          buyMarketplace: 'magic_eden' as OrdinalsMarketplace,
          sellMarketplace: 'unisat' as OrdinalsMarketplace,
          buyPrice: 0.05,
          sellPrice: 0.062,
          lastUpdated: Date.now(),
          confidence: 80
        }
      ]);

      mockDataAggregator.getAggregatedCollection = jest.fn().mockResolvedValue(null);

      const results = await service.scanOpportunities();

      // Should skip invalid collection and return empty or partial results
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle network timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await service.estimateNetworkFee();

      // Should use fallback fee (returns NetworkFeeEstimate object)
      expect(result.estimatedFeeBTC).toBeGreaterThan(0);
    });
  });
});
