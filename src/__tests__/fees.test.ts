/**
 * Fee Calculation Tests
 * Tests the core fee engine: CYPHER_FEE_RATE, calculateCypherFee, calculateFees
 */
import { calculateFees, calculateCypherFee, CYPHER_FEE_RATE, getFeePercentageText } from '@/lib/fees/feeCalculation';

describe('Fee Calculation Engine', () => {
  describe('CYPHER_FEE_RATE constant', () => {
    it('should be 0.35%', () => {
      expect(CYPHER_FEE_RATE).toBe(0.0035);
    });
  });

  describe('getFeePercentageText', () => {
    it('should return "0.35%"', () => {
      expect(getFeePercentageText()).toBe('0.35%');
    });
  });

  describe('calculateCypherFee', () => {
    it('should return 0 for amount 0', () => {
      expect(calculateCypherFee(0)).toBe(0);
    });

    it('should calculate 0.35% of 1 USD', () => {
      expect(calculateCypherFee(1)).toBeCloseTo(0.0035);
    });

    it('should calculate 0.35% of 100 USD', () => {
      expect(calculateCypherFee(100)).toBeCloseTo(0.35);
    });

    it('should calculate 0.35% of 10000 USD', () => {
      expect(calculateCypherFee(10000)).toBeCloseTo(35);
    });

    it('should calculate 0.35% of 1000000 USD', () => {
      expect(calculateCypherFee(1000000)).toBeCloseTo(3500);
    });

    it('should handle very small amounts (0.001)', () => {
      const fee = calculateCypherFee(0.001);
      expect(fee).toBeCloseTo(0.0000035);
      expect(fee).toBeGreaterThan(0);
    });

    it('should return NaN for NaN input', () => {
      expect(calculateCypherFee(NaN)).toBeNaN();
    });

    it('should handle negative amounts (returns negative fee)', () => {
      // This is a potential bug - negative amounts produce negative fees
      const fee = calculateCypherFee(-100);
      expect(fee).toBeCloseTo(-0.35);
    });

    it('should handle Infinity', () => {
      expect(calculateCypherFee(Infinity)).toBe(Infinity);
    });
  });

  describe('calculateFees (full calculation)', () => {
    it('should calculate fees for a basic ETH swap', async () => {
      const result = await calculateFees({
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6417b3e49EeFD20D0c31B2b7f07D2F1',
        amountIn: '1',
        network: 'ethereum',
      });

      expect(result).toBeDefined();
      expect(result.cypherFee).toBeDefined();
      expect(result.cypherFee.percentage).toBeCloseTo(0.35);
      expect(result.cypherFee.recipient).toBe('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3');
      expect(parseFloat(result.cypherFee.amount)).toBeGreaterThan(0);
      expect(result.cypherFee.amountUSD).toBeGreaterThan(0);
    });

    it('should use the correct fee recipient for solana', async () => {
      const result = await calculateFees({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '10',
        network: 'solana',
      });
      expect(result.cypherFee.recipient).toBe('4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH');
    });

    it('should use the correct fee recipient for bitcoin', async () => {
      const result = await calculateFees({
        tokenIn: 'BTC',
        tokenOut: 'USDT',
        amountIn: '0.5',
        network: 'bitcoin',
      });
      expect(result.cypherFee.recipient).toBe('358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb');
    });

    it('should fall back to ethereum recipient for unknown network', async () => {
      const result = await calculateFees({
        tokenIn: 'TOKEN',
        tokenOut: 'USDC',
        amountIn: '1',
        network: 'unknown_chain',
      });
      expect(result.cypherFee.recipient).toBe('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3');
    });

    it('should include dex fees in total', async () => {
      const result = await calculateFees({
        tokenIn: 'WETH',
        tokenOut: 'USDC',
        amountIn: '10',
        network: 'ethereum',
      });
      expect(result.totalFeeUSD).toBeGreaterThan(result.cypherFee.amountUSD);
      expect(result.dexFees.length).toBeGreaterThan(0);
    });

    it('should include gas fees in total', async () => {
      const result = await calculateFees({
        tokenIn: 'WETH',
        tokenOut: 'USDC',
        amountIn: '1',
        network: 'ethereum',
      });
      expect(result.gasFees).toBeDefined();
      expect(result.gasFees.gasCostUSD).toBeGreaterThan(0);
    });

    it('should handle zero amount without throwing', async () => {
      const result = await calculateFees({
        tokenIn: 'WETH',
        tokenOut: 'USDC',
        amountIn: '0',
        network: 'ethereum',
      });
      expect(result.cypherFee.amountUSD).toBe(0);
    });
  });
});
