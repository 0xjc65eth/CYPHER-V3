/**
 * Data Transform Tests
 * Tests BigInt serialization, number formatting, and currency formatting
 */

describe('BigInt Serialization', () => {
  describe('BigInt.prototype.toJSON', () => {
    // The jest.setup.js adds BigInt.prototype.toJSON
    it('should serialize BigInt to string in JSON', () => {
      const obj = { value: BigInt(123456789) };
      const json = JSON.stringify(obj);
      expect(json).toBe('{"value":"123456789"}');
    });

    it('should serialize zero BigInt', () => {
      const json = JSON.stringify({ value: BigInt(0) });
      expect(json).toBe('{"value":"0"}');
    });

    it('should serialize negative BigInt', () => {
      const json = JSON.stringify({ value: BigInt(-42) });
      expect(json).toBe('{"value":"-42"}');
    });

    it('should serialize very large BigInt', () => {
      const big = BigInt('9999999999999999999999999999');
      const json = JSON.stringify({ value: big });
      expect(json).toContain('9999999999999999999999999999');
    });
  });

  describe('BigInt to Number conversion', () => {
    it('should convert small BigInt to number safely', () => {
      expect(Number(BigInt(42))).toBe(42);
    });

    it('should lose precision for very large BigInts', () => {
      const big = BigInt('9007199254740993'); // Number.MAX_SAFE_INTEGER + 2
      const num = Number(big);
      // Precision is lost - JS rounds to nearest representable double (9007199254740992)
      expect(num).toBe(9007199254740992);
      // The original value and converted value differ
      expect(BigInt(num)).not.toBe(big);
    });

    it('should handle BigInt(0)', () => {
      expect(Number(BigInt(0))).toBe(0);
    });
  });
});

describe('Number Formatting', () => {
  describe('toFixed precision', () => {
    it('should format with 2 decimal places', () => {
      expect((1.23456).toFixed(2)).toBe('1.23');
    });

    it('should round correctly', () => {
      expect((1.005).toFixed(2)).toBe('1.00'); // known JS floating point issue
    });

    it('should pad with zeros', () => {
      expect((1).toFixed(2)).toBe('1.00');
    });
  });

  describe('parseFloat edge cases', () => {
    it('should parse valid number strings', () => {
      expect(parseFloat('123.45')).toBe(123.45);
    });

    it('should return NaN for empty string', () => {
      expect(parseFloat('')).toBeNaN();
    });

    it('should return NaN for non-numeric string', () => {
      expect(parseFloat('abc')).toBeNaN();
    });

    it('should parse leading number in mixed string', () => {
      expect(parseFloat('123abc')).toBe(123);
    });

    it('should handle scientific notation', () => {
      expect(parseFloat('1e5')).toBe(100000);
    });
  });

  describe('Safe division (avoiding division by zero)', () => {
    function safeDivide(a: number, b: number): number {
      if (b === 0 || !isFinite(b)) return 0;
      return a / b;
    }

    it('should divide normally', () => {
      expect(safeDivide(10, 2)).toBe(5);
    });

    it('should return 0 for division by zero', () => {
      expect(safeDivide(10, 0)).toBe(0);
    });

    it('should return 0 for division by Infinity', () => {
      expect(safeDivide(10, Infinity)).toBe(0);
    });

    it('should handle 0/0', () => {
      expect(safeDivide(0, 0)).toBe(0);
    });
  });
});

describe('Currency Formatting', () => {
  describe('USD formatting', () => {
    function formatUSD(amount: number): string {
      return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }

    it('should format whole numbers', () => {
      const result = formatUSD(1000);
      expect(result).toContain('$');
      expect(result).toContain('1');
    });

    it('should format decimal amounts', () => {
      const result = formatUSD(99.99);
      expect(result).toContain('$');
      expect(result).toContain('99');
    });

    it('should handle zero', () => {
      expect(formatUSD(0)).toContain('$');
    });

    it('should handle NaN gracefully', () => {
      const result = formatUSD(NaN);
      expect(result).toContain('NaN');
    });
  });

  describe('Percentage formatting', () => {
    function formatPercentage(value: number): string {
      return `${value.toFixed(2)}%`;
    }

    it('should format positive percentage', () => {
      expect(formatPercentage(5.123)).toBe('5.12%');
    });

    it('should format negative percentage', () => {
      expect(formatPercentage(-2.5)).toBe('-2.50%');
    });

    it('should format zero', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });
  });
});

describe('Array safety (undefined.map prevention)', () => {
  it('should handle undefined arrays with optional chaining', () => {
    const data: any = undefined;
    const result = data?.map((x: number) => x * 2) ?? [];
    expect(result).toEqual([]);
  });

  it('should handle null arrays', () => {
    const data: any = null;
    const result = data?.map((x: number) => x * 2) ?? [];
    expect(result).toEqual([]);
  });

  it('should handle empty arrays', () => {
    const data: number[] = [];
    const result = data.map((x: number) => x * 2);
    expect(result).toEqual([]);
  });

  it('should handle Array.isArray check', () => {
    expect(Array.isArray(undefined)).toBe(false);
    expect(Array.isArray(null)).toBe(false);
    expect(Array.isArray([])).toBe(true);
    expect(Array.isArray({})).toBe(false);
  });
});
