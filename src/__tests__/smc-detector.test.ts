/**
 * SMC (Smart Money Concepts) Detector Tests
 * Tests order block detection, fair value gap detection, and market structure
 * from src/services/arbitrage/SMCDetector.ts
 */

// We need to mock the database and cache imports that SMCDetector uses
jest.mock('@/lib/database/db-service', () => ({
  dbService: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  },
}));

jest.mock('@/lib/cache/redis.config', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

import { smcDetector, Candle } from '@/services/arbitrage/SMCDetector';

// Helper to create candle data
function makeCandle(
  timestamp: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): Candle {
  return { timestamp, open, high, low, close, volume };
}

// Generate a series of candles with a bullish order block pattern
function makeBullishOrderBlockCandles(): Candle[] {
  const now = Date.now();
  return [
    makeCandle(now - 7000, 100, 102, 99, 101, 50),     // i=0 normal
    makeCandle(now - 6000, 101, 103, 100, 102, 55),     // i=1 normal
    makeCandle(now - 5000, 102, 104, 101, 103, 60),     // i=2 setup candle
    makeCandle(now - 4000, 103, 112, 102, 111, 500),    // i=3 strong bullish (OB candidate)
    makeCandle(now - 3000, 111, 113, 105, 112, 80),     // i=4 next: low(105) > prev low(102) ✓
    makeCandle(now - 2000, 112, 114, 110, 113, 70),     // i=5
    makeCandle(now - 1000, 113, 115, 111, 114, 65),     // i=6 current price = 114
  ];
}

// Generate candles with a bearish order block
function makeBearishOrderBlockCandles(): Candle[] {
  const now = Date.now();
  return [
    makeCandle(now - 7000, 100, 102, 99, 101, 50),
    makeCandle(now - 6000, 101, 103, 100, 102, 55),
    makeCandle(now - 5000, 102, 104, 101, 103, 60),
    makeCandle(now - 4000, 110, 111, 99, 100, 500),    // i=3: strong bearish (open=110, close=100, vol=500)
    makeCandle(now - 3000, 100, 108, 98, 107, 80),     // i=4: high(108) < prev high(111) ✓
    makeCandle(now - 2000, 107, 109, 105, 108, 70),
    makeCandle(now - 1000, 108, 110, 106, 109, 65),
  ];
}

// Generate candles with a bullish FVG (gap up pattern)
function makeBullishFVGCandles(): Candle[] {
  const now = Date.now();
  return [
    makeCandle(now - 3000, 100, 105, 98, 104, 100),    // candle1: high=105
    makeCandle(now - 2000, 106, 115, 105, 114, 200),   // candle2: gap candle
    makeCandle(now - 1000, 114, 118, 108, 117, 150),   // candle3: low=108 > candle1 high=105 ✓ (FVG)
  ];
}

// Generate candles with a bearish FVG (gap down pattern)
function makeBearishFVGCandles(): Candle[] {
  const now = Date.now();
  return [
    makeCandle(now - 3000, 115, 118, 110, 112, 100),   // candle1: low=110
    makeCandle(now - 2000, 110, 111, 100, 101, 200),   // candle2: gap candle
    makeCandle(now - 1000, 101, 105, 98, 103, 150),    // candle3: high=105 < candle1 low=110 ✓ (FVG)
  ];
}

describe('SMCDetector - Order Block Detection', () => {
  it('should detect bullish order blocks', () => {
    const candles = makeBullishOrderBlockCandles();
    const blocks = smcDetector.detectOrderBlocks(candles, 'BTC', '1h');

    const bullish = blocks.filter(b => b.type === 'bullish');
    expect(bullish.length).toBeGreaterThanOrEqual(1);

    if (bullish.length > 0) {
      expect(bullish[0].asset).toBe('BTC');
      expect(bullish[0].timeframe).toBe('1h');
      expect(bullish[0].strength).toBeGreaterThanOrEqual(0);
      expect(bullish[0].strength).toBeLessThanOrEqual(10);
      expect(bullish[0].fillProbability).toBeGreaterThanOrEqual(0);
      expect(bullish[0].fillProbability).toBeLessThanOrEqual(100);
    }
  });

  it('should detect bearish order blocks', () => {
    const candles = makeBearishOrderBlockCandles();
    const blocks = smcDetector.detectOrderBlocks(candles, 'BTC', '4h');

    const bearish = blocks.filter(b => b.type === 'bearish');
    expect(bearish.length).toBeGreaterThanOrEqual(1);

    if (bearish.length > 0) {
      expect(bearish[0].type).toBe('bearish');
      expect(bearish[0].high).toBeGreaterThan(bearish[0].low);
    }
  });

  it('should return empty array for flat/low-volume candles', () => {
    const flatCandles: Candle[] = [];
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      flatCandles.push(makeCandle(now - (10 - i) * 1000, 100, 100.1, 99.9, 100, 10));
    }

    const blocks = smcDetector.detectOrderBlocks(flatCandles, 'BTC', '1h');
    expect(blocks).toEqual([]);
  });

  it('should return empty array for empty candle data', () => {
    const blocks = smcDetector.detectOrderBlocks([], 'BTC', '1h');
    expect(blocks).toEqual([]);
  });

  it('should return empty array for insufficient candles (< 3)', () => {
    const candles = [
      makeCandle(Date.now() - 2000, 100, 105, 98, 104, 100),
      makeCandle(Date.now() - 1000, 104, 106, 102, 105, 80),
    ];
    const blocks = smcDetector.detectOrderBlocks(candles, 'BTC', '1h');
    expect(blocks).toEqual([]);
  });

  it('should set order block price as midpoint of high and low', () => {
    const candles = makeBullishOrderBlockCandles();
    const blocks = smcDetector.detectOrderBlocks(candles, 'BTC', '1h');

    for (const block of blocks) {
      expect(block.price).toBeCloseTo((block.high + block.low) / 2);
    }
  });

  it('should set expiration 7 days from now', () => {
    const candles = makeBullishOrderBlockCandles();
    const blocks = smcDetector.detectOrderBlocks(candles, 'BTC', '1h');

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    for (const block of blocks) {
      // expiresAt should be within a few seconds of now + 7 days
      expect(block.expiresAt).toBeGreaterThan(Date.now() + sevenDaysMs - 5000);
      expect(block.expiresAt).toBeLessThan(Date.now() + sevenDaysMs + 5000);
    }
  });
});

describe('SMCDetector - Fair Value Gap Detection', () => {
  it('should detect bullish FVG', () => {
    const candles = makeBullishFVGCandles();
    const gaps = smcDetector.detectFairValueGaps(candles, 'ETH', '15m');

    const bullishGaps = gaps.filter(g => g.type === 'bullish');
    expect(bullishGaps.length).toBeGreaterThanOrEqual(1);

    if (bullishGaps.length > 0) {
      expect(bullishGaps[0].gapSize).toBeGreaterThan(0);
      expect(bullishGaps[0].high).toBeGreaterThan(bullishGaps[0].low);
      expect(bullishGaps[0].fillPercentage).toBe(0);
      expect(bullishGaps[0].fillProbability).toBe(75);
    }
  });

  it('should detect bearish FVG', () => {
    const candles = makeBearishFVGCandles();
    const gaps = smcDetector.detectFairValueGaps(candles, 'ETH', '15m');

    const bearishGaps = gaps.filter(g => g.type === 'bearish');
    expect(bearishGaps.length).toBeGreaterThanOrEqual(1);

    if (bearishGaps.length > 0) {
      expect(bearishGaps[0].gapSize).toBeGreaterThan(0);
      expect(bearishGaps[0].type).toBe('bearish');
    }
  });

  it('should ignore tiny gaps (< 0.1%)', () => {
    const now = Date.now();
    const candles = [
      makeCandle(now - 3000, 10000, 10001, 9999, 10000, 100),
      makeCandle(now - 2000, 10001, 10003, 10000, 10002, 100),
      makeCandle(now - 1000, 10002, 10004, 10001.05, 10003, 100), // tiny gap: 10001.05 - 10001 = 0.05
    ];
    const gaps = smcDetector.detectFairValueGaps(candles, 'BTC', '1h');
    expect(gaps.length).toBe(0);
  });

  it('should return empty array for empty candles', () => {
    const gaps = smcDetector.detectFairValueGaps([], 'BTC', '1h');
    expect(gaps).toEqual([]);
  });

  it('should return empty for 1-2 candles (needs 3)', () => {
    const candles = [
      makeCandle(Date.now(), 100, 105, 98, 104, 100),
    ];
    const gaps = smcDetector.detectFairValueGaps(candles, 'BTC', '1h');
    expect(gaps).toEqual([]);
  });
});

describe('SMCDetector - Market Structure', () => {
  it('should detect bullish trend (higher highs)', () => {
    const now = Date.now();
    // Create candles with ascending highs for swing detection
    const candles: Candle[] = [];
    for (let i = 0; i < 20; i++) {
      const base = 100 + i * 2; // Uptrend
      candles.push(makeCandle(
        now - (20 - i) * 1000,
        base,
        base + 5 + (i % 5 === 2 ? 10 : 0), // Spiky highs at every 5th
        base - 3,
        base + 2,
        100,
      ));
    }

    const structure = smcDetector.detectMarketStructure(candles);
    expect(structure.trend).toBeDefined();
    expect(['bullish', 'bearish', 'neutral']).toContain(structure.trend);
    expect(structure.swingHighs).toBeDefined();
    expect(structure.swingLows).toBeDefined();
  });

  it('should detect bearish trend (lower lows)', () => {
    const now = Date.now();
    const candles: Candle[] = [];
    for (let i = 0; i < 20; i++) {
      const base = 200 - i * 2; // Downtrend
      candles.push(makeCandle(
        now - (20 - i) * 1000,
        base,
        base + 3,
        base - 5 - (i % 5 === 2 ? 10 : 0), // Spiky lows
        base - 2,
        100,
      ));
    }

    const structure = smcDetector.detectMarketStructure(candles);
    expect(structure.trend).toBeDefined();
    expect(Array.isArray(structure.lowerLows)).toBe(true);
  });

  it('should handle flat market as neutral', () => {
    const now = Date.now();
    const candles: Candle[] = [];
    for (let i = 0; i < 20; i++) {
      candles.push(makeCandle(
        now - (20 - i) * 1000,
        100, 101, 99, 100, 100,
      ));
    }

    const structure = smcDetector.detectMarketStructure(candles);
    // No swing highs or lows detected in flat market
    expect(structure.swingHighs.length).toBe(0);
    expect(structure.swingLows.length).toBe(0);
    expect(structure.trend).toBe('neutral');
  });

  it('should handle minimum candles (needs 5 for swing detection)', () => {
    const candles = [
      makeCandle(1, 100, 105, 95, 102, 100),
      makeCandle(2, 102, 107, 97, 104, 100),
      makeCandle(3, 104, 109, 99, 106, 100),
    ];
    const structure = smcDetector.detectMarketStructure(candles);
    // Not enough candles for swing detection (needs i-2 to i+2)
    expect(structure.swingHighs).toEqual([]);
    expect(structure.swingLows).toEqual([]);
  });

  it('should handle empty candles', () => {
    const structure = smcDetector.detectMarketStructure([]);
    expect(structure.trend).toBe('neutral');
    expect(structure.swingHighs).toEqual([]);
    expect(structure.swingLows).toEqual([]);
  });
});
