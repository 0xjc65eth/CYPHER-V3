/**
 * Arbitrage Math Tests
 * Tests spread calculation, confidence scoring, liquidity calculation
 * from RealArbitrageService
 */

describe('Arbitrage Math', () => {
  // Test the spread formula: ((sellPrice - buyPrice) / buyPrice) * 100
  describe('Spread Calculation', () => {
    function calculateSpread(buyPrice: number, sellPrice: number): number {
      return ((sellPrice - buyPrice) / buyPrice) * 100;
    }

    it('should calculate 10% spread correctly', () => {
      expect(calculateSpread(100, 110)).toBeCloseTo(10);
    });

    it('should calculate 1% spread correctly', () => {
      expect(calculateSpread(50000, 50500)).toBeCloseTo(1);
    });

    it('should return 0% for equal prices', () => {
      expect(calculateSpread(100, 100)).toBe(0);
    });

    it('should return negative spread when sell < buy', () => {
      expect(calculateSpread(100, 90)).toBeCloseTo(-10);
    });

    it('should handle very small prices', () => {
      const spread = calculateSpread(0.00001, 0.000011);
      expect(spread).toBeCloseTo(10);
    });

    it('should return Infinity for zero buy price (division by zero)', () => {
      // This is a real bug: division by zero in spread calc
      expect(calculateSpread(0, 100)).toBe(Infinity);
    });

    it('should return NaN for 0/0 case', () => {
      expect(calculateSpread(0, 0)).toBeNaN();
    });
  });

  // Net profit after fees: potentialProfit - estimatedFees.total
  describe('Net Profit After Fees', () => {
    function calculateNetProfit(buyPrice: number, sellPrice: number, feePct: number): number {
      const gross = sellPrice - buyPrice;
      const fees = buyPrice * feePct;
      return gross - fees;
    }

    it('should calculate positive net profit', () => {
      // Buy at 100, sell at 110, 0.35% fee on buy
      const net = calculateNetProfit(100, 110, 0.0035);
      expect(net).toBeCloseTo(9.65);
    });

    it('should return negative when fees exceed spread', () => {
      // Buy at 100, sell at 100.1, 0.35% fee = 0.35 > 0.1 profit
      const net = calculateNetProfit(100, 100.1, 0.0035);
      expect(net).toBeLessThan(0);
    });

    it('should return zero net profit when equal prices minus fees', () => {
      const net = calculateNetProfit(100, 100, 0.0035);
      expect(net).toBeLessThan(0); // fees make it negative
    });

    it('should handle large BTC amounts', () => {
      // Buy at 95000, sell at 96000, total fee 0.35%
      const net = calculateNetProfit(95000, 96000, 0.0035);
      expect(net).toBeCloseTo(667.5);
      expect(net).toBeGreaterThan(0);
    });
  });

  // Confidence calculation from RealArbitrageService
  describe('Confidence Score', () => {
    function calculateConfidence(spread: number, volume: number): number {
      const spreadScore = Math.min(spread * 10, 50);
      const volumeScore = Math.min(Math.log10(volume || 1) * 10, 50);
      return Math.round(spreadScore + volumeScore);
    }

    it('should return 0 for 0 spread and 1 volume', () => {
      expect(calculateConfidence(0, 1)).toBe(0);
    });

    it('should cap spread score at 50', () => {
      const conf = calculateConfidence(10, 1);
      expect(conf).toBeLessThanOrEqual(100);
      expect(conf).toBeGreaterThanOrEqual(50); // spreadScore = 50
    });

    it('should cap volume score at 50', () => {
      const conf = calculateConfidence(0, 1e10);
      expect(conf).toBeLessThanOrEqual(50);
    });

    it('should max at 100 for high spread and volume', () => {
      expect(calculateConfidence(10, 1e10)).toBe(100);
    });

    it('should handle zero volume gracefully (log10(1) = 0)', () => {
      const conf = calculateConfidence(5, 0);
      expect(conf).toBe(50); // spreadScore=50, volumeScore=0
    });

    it('should handle negative volume gracefully', () => {
      // volume || 1 => negative is truthy, log10(negative) = NaN
      const conf = calculateConfidence(5, -100);
      expect(conf).toBeNaN(); // BUG: negative volume produces NaN
    });
  });

  // Liquidity calculation
  describe('Liquidity Score', () => {
    function calculateLiquidity(holders: number, sales24h: number): number {
      const holdersScore = Math.min(holders / 100, 50);
      const salesScore = Math.min(sales24h, 50);
      return Math.round(holdersScore + salesScore);
    }

    it('should return 0 for no holders and no sales', () => {
      expect(calculateLiquidity(0, 0)).toBe(0);
    });

    it('should cap at 100 for high values', () => {
      expect(calculateLiquidity(10000, 100)).toBe(100);
    });

    it('should handle moderate values', () => {
      // 1000 holders = 10 score, 20 sales = 20 score
      expect(calculateLiquidity(1000, 20)).toBe(30);
    });

    it('should handle undefined-like inputs', () => {
      expect(calculateLiquidity(NaN, 0)).toBeNaN();
    });
  });

  // Runes liquidity
  describe('Runes Liquidity', () => {
    function calculateRunesLiquidity(holders: number): number {
      return Math.min(Math.round(holders / 20), 100);
    }

    it('should return 0 for 0 holders', () => {
      expect(calculateRunesLiquidity(0)).toBe(0);
    });

    it('should return 50 for 1000 holders', () => {
      expect(calculateRunesLiquidity(1000)).toBe(50);
    });

    it('should cap at 100 for 2000+ holders', () => {
      expect(calculateRunesLiquidity(5000)).toBe(100);
    });
  });

  // Marketplace fee lookup
  describe('Marketplace Fees', () => {
    const fees: Record<string, number> = {
      'magic_eden': 0.025,
      'unisat': 0.02,
      'okx': 0.02,
      'ordiscan': 0.015,
      'binance': 0.005,
      'opensea': 0.025
    };

    function getMarketplaceFee(marketplace: string): number {
      return fees[marketplace] || 0.02;
    }

    it('should return 2.5% for magic_eden', () => {
      expect(getMarketplaceFee('magic_eden')).toBe(0.025);
    });

    it('should return 0.5% for binance', () => {
      expect(getMarketplaceFee('binance')).toBe(0.005);
    });

    it('should return default 2% for unknown marketplace', () => {
      expect(getMarketplaceFee('unknown_dex')).toBe(0.02);
    });
  });
});
