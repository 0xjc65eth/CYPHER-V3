/**
 * API Validation Tests
 * Tests input validation, address validation, sanitization, and rate limiting
 * from src/lib/fees/validation.ts
 */
import {
  validateAddress,
  validateFeeCalculationRequest,
  sanitizeInput,
  RateLimiter,
  performSecurityValidation,
} from '@/lib/fees/validation';

describe('validateAddress', () => {
  describe('Ethereum addresses', () => {
    it('should accept valid checksummed address', () => {
      const result = validateAddress('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3', 'ethereum');
      expect(result.isValid).toBe(true);
    });

    it('should reject address without 0x prefix', () => {
      const result = validateAddress('AE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3', 'ethereum');
      expect(result.isValid).toBe(false);
    });

    it('should reject zero address', () => {
      const result = validateAddress('0x0000000000000000000000000000000000000000', 'ethereum');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Zero address not allowed');
    });

    it('should reject too-short address', () => {
      const result = validateAddress('0x123', 'ethereum');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Bitcoin addresses', () => {
    it('should accept bc1 address', () => {
      const result = validateAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'bitcoin');
      expect(result.isValid).toBe(true);
    });

    it('should accept legacy address starting with 1', () => {
      const result = validateAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'bitcoin');
      expect(result.isValid).toBe(true);
    });

    it('should reject random string', () => {
      const result = validateAddress('notabitcoinaddress', 'bitcoin');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Solana addresses', () => {
    it('should accept valid Solana address', () => {
      const result = validateAddress('4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH', 'solana');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Unsupported networks', () => {
    it('should reject unsupported network', () => {
      const result = validateAddress('someaddr', 'dogecoin');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsupported network'))).toBe(true);
    });
  });
});

describe('validateFeeCalculationRequest', () => {
  const validRequest = {
    tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    tokenOut: '0xA0b86a33E6417b3e49EeFD20D0c31B2b7f07D2F1',
    amountIn: '1.0',
    network: 'ethereum',
  };

  it('should accept a valid request', () => {
    const result = validateFeeCalculationRequest(validRequest);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing tokenIn', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, tokenIn: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('tokenIn'))).toBe(true);
  });

  it('should reject missing tokenOut', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, tokenOut: '' });
    expect(result.isValid).toBe(false);
  });

  it('should reject missing amountIn', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, amountIn: '' });
    expect(result.isValid).toBe(false);
  });

  it('should reject missing network', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, network: '' });
    expect(result.isValid).toBe(false);
  });

  it('should reject unsupported network', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, network: 'fantom' });
    expect(result.isValid).toBe(false);
  });

  it('should reject NaN amount', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, amountIn: 'not-a-number' });
    expect(result.isValid).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, amountIn: '-100' });
    expect(result.isValid).toBe(false);
  });

  it('should reject amount exceeding max (1e18)', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, amountIn: '1e19' });
    expect(result.isValid).toBe(false);
  });

  it('should reject same token swap', () => {
    const result = validateFeeCalculationRequest({
      ...validRequest,
      tokenOut: validRequest.tokenIn,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Cannot swap token to itself'))).toBe(true);
  });

  it('should reject slippage > 50%', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, slippage: 51 });
    expect(result.isValid).toBe(false);
  });

  it('should warn on high slippage (> 10%)', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, slippage: 15 });
    expect(result.warnings.some(w => w.includes('High slippage'))).toBe(true);
  });

  it('should reject negative slippage', () => {
    const result = validateFeeCalculationRequest({ ...validRequest, slippage: -1 });
    expect(result.isValid).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('should strip script tags from strings', () => {
    const result = sanitizeInput('<script>alert("xss")</script>hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('hello');
  });

  it('should strip angle brackets', () => {
    const result = sanitizeInput('<div>test</div>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('should clamp numbers to valid range', () => {
    expect(sanitizeInput(Infinity)).toBe(0);
    expect(sanitizeInput(-Infinity)).toBe(0);
  });

  it('should recursively sanitize objects', () => {
    const input = {
      name: '<script>alert(1)</script>test',
      amount: Infinity,
      nested: { value: '  trimmed  ' },
    };
    const result = sanitizeInput(input);
    expect(result.name).not.toContain('<script>');
    expect(result.amount).toBe(0);
    expect(result.nested.value).toBe('trimmed');
  });

  it('should pass through null', () => {
    expect(sanitizeInput(null)).toBeNull();
  });

  it('should pass through undefined', () => {
    expect(sanitizeInput(undefined)).toBeUndefined();
  });

  it('should pass through booleans', () => {
    expect(sanitizeInput(true)).toBe(true);
    expect(sanitizeInput(false)).toBe(false);
  });
});

describe('RateLimiter', () => {
  it('should allow requests under the limit', () => {
    const limiter = new RateLimiter(5, 60000);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('should block after exceeding limit', () => {
    const limiter = new RateLimiter(3, 60000);
    limiter.isAllowed('user2');
    limiter.isAllowed('user2');
    limiter.isAllowed('user2');
    expect(limiter.isAllowed('user2')).toBe(false);
  });

  it('should track different users independently', () => {
    const limiter = new RateLimiter(2, 60000);
    limiter.isAllowed('userA');
    limiter.isAllowed('userA');
    expect(limiter.isAllowed('userA')).toBe(false);
    expect(limiter.isAllowed('userB')).toBe(true); // different user
  });

  it('should reset a user', () => {
    const limiter = new RateLimiter(2, 60000);
    limiter.isAllowed('user3');
    limiter.isAllowed('user3');
    expect(limiter.isAllowed('user3')).toBe(false);
    limiter.reset('user3');
    expect(limiter.isAllowed('user3')).toBe(true);
  });
});
