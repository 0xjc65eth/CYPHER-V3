/**
 * Timestamp Utility Tests
 * Tests timeAgo, timeAgoFromString, and related formatters
 * from src/lib/utils/runes-formatters.ts
 */
import {
  timeAgo,
  timeAgoFromString,
  formatNumber,
  formatSupply,
  formatSatsToBtc,
  formatBtcToUsd,
  truncateAddress,
  truncateTxId,
  isValidBtcAddress,
  isValidTxid,
  spreadColor,
  profitColor,
} from '@/lib/utils/runes-formatters';

describe('timeAgo', () => {
  it('should return "just now" for timestamps < 5 seconds ago', () => {
    expect(timeAgo(Date.now() - 2000)).toBe('just now');
  });

  it('should return seconds for < 60s', () => {
    expect(timeAgo(Date.now() - 30000)).toBe('30s ago');
  });

  it('should return minutes for < 3600s', () => {
    expect(timeAgo(Date.now() - 300000)).toBe('5m ago');
  });

  it('should return hours for < 86400s', () => {
    expect(timeAgo(Date.now() - 7200000)).toBe('2h ago');
  });

  it('should return days for < 30 days', () => {
    expect(timeAgo(Date.now() - 86400000 * 5)).toBe('5d ago');
  });

  it('should return months for >= 30 days', () => {
    expect(timeAgo(Date.now() - 86400000 * 60)).toBe('2mo ago');
  });

  it('should return "--" for future timestamps', () => {
    expect(timeAgo(Date.now() + 60000)).toBe('--');
  });

  it('should handle zero timestamp (epoch)', () => {
    // Date.now() - 0 is a huge diff
    const result = timeAgo(0);
    expect(result).toMatch(/mo ago/);
  });

  it('should handle timestamps in seconds (not ms) - common bug', () => {
    // If someone passes a Unix timestamp in seconds instead of ms
    const secondsTs = Math.floor(Date.now() / 1000);
    const result = timeAgo(secondsTs);
    // This would be ~50 years ago, showing as months
    expect(result).toMatch(/mo ago/);
  });
});

describe('timeAgoFromString', () => {
  it('should return "--" for null', () => {
    expect(timeAgoFromString(null)).toBe('--');
  });

  it('should return "--" for undefined', () => {
    expect(timeAgoFromString(undefined)).toBe('--');
  });

  it('should return "--" for empty string', () => {
    expect(timeAgoFromString('')).toBe('--');
  });

  it('should return "--" for invalid date string', () => {
    expect(timeAgoFromString('not-a-date')).toBe('--');
  });

  it('should parse ISO date strings', () => {
    const recent = new Date(Date.now() - 60000).toISOString();
    expect(timeAgoFromString(recent)).toBe('1m ago');
  });

  it('should return "--" for dates > 1 year old', () => {
    const old = new Date(Date.now() - 400 * 86400000).toISOString();
    expect(timeAgoFromString(old)).toBe('--');
  });
});

describe('formatNumber', () => {
  it('should format billions', () => {
    expect(formatNumber(1500000000)).toBe('1.5B');
  });

  it('should format millions', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  it('should format thousands', () => {
    expect(formatNumber(3500)).toBe('3.5K');
  });

  it('should return locale string for small numbers', () => {
    const result = formatNumber(500);
    expect(result).toBeDefined();
    // locale-dependent, just check it returns something
    expect(typeof result).toBe('string');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBeDefined();
  });

  it('should handle negative numbers', () => {
    // formatNumber does not handle negatives specially
    const result = formatNumber(-5000);
    expect(typeof result).toBe('string');
  });
});

describe('formatSupply', () => {
  it('should format billions with 2 decimal places', () => {
    expect(formatSupply('1500000000')).toBe('1.50B');
  });

  it('should format millions', () => {
    expect(formatSupply('2500000')).toBe('2.50M');
  });

  it('should return "0" for NaN input', () => {
    expect(formatSupply('not-a-number')).toBe('0');
  });

  it('should handle empty string', () => {
    expect(formatSupply('')).toBe('0');
  });
});

describe('formatSatsToBtc', () => {
  it('should convert 100000000 sats to 1 BTC', () => {
    expect(formatSatsToBtc(100000000)).toBe('1.00000000');
  });

  it('should convert 1 sat', () => {
    expect(formatSatsToBtc(1)).toBe('0.00000001');
  });

  it('should convert 0 sats', () => {
    expect(formatSatsToBtc(0)).toBe('0.00000000');
  });

  it('should respect decimals parameter', () => {
    expect(formatSatsToBtc(50000000, 2)).toBe('0.50');
  });
});

describe('formatBtcToUsd', () => {
  it('should format with default BTC price ($65000)', () => {
    const result = formatBtcToUsd(1);
    expect(result).toContain('$');
    expect(result).toContain('65');
  });

  it('should format with custom BTC price', () => {
    const result = formatBtcToUsd(1, 100000);
    expect(result).toContain('$');
    expect(result).toContain('100');
  });

  it('should handle zero BTC', () => {
    expect(formatBtcToUsd(0)).toBe('$0');
  });
});

describe('truncateAddress', () => {
  it('should truncate a long Bitcoin address', () => {
    const addr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
    const result = truncateAddress(addr);
    expect(result).toContain('...');
    expect(result.startsWith('bc1qw508')).toBe(true);
  });

  it('should not truncate short addresses', () => {
    const short = 'abc123def456';
    // length(12) <= prefixLen(8) + suffixLen(6) + 3 = 17, so it does NOT truncate
    expect(truncateAddress(short)).toBe('abc123def456');
  });

  it('should handle custom prefix/suffix lengths', () => {
    const addr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
    const result = truncateAddress(addr, 4, 4);
    expect(result).toBe('bc1q...f3t4');
  });
});

describe('truncateTxId', () => {
  it('should truncate a 64-char txid', () => {
    const txid = 'a'.repeat(64);
    const result = truncateTxId(txid);
    expect(result).toContain('...');
  });

  it('should return "---" for empty string', () => {
    expect(truncateTxId('')).toBe('---');
  });

  it('should return "---" for undefined', () => {
    expect(truncateTxId(undefined as any)).toBe('---');
  });
});

describe('isValidBtcAddress', () => {
  it('should validate bc1 addresses', () => {
    expect(isValidBtcAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true);
  });

  it('should validate legacy addresses starting with 1', () => {
    expect(isValidBtcAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidBtcAddress('')).toBe(false);
  });

  it('should reject "Unknown"', () => {
    expect(isValidBtcAddress('Unknown')).toBe(false);
  });

  it('should reject random strings', () => {
    expect(isValidBtcAddress('hello world')).toBe(false);
  });
});

describe('isValidTxid', () => {
  it('should validate 64-char hex string', () => {
    expect(isValidTxid('a'.repeat(64))).toBe(true);
  });

  it('should reject short hex strings', () => {
    expect(isValidTxid('abcdef')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidTxid('')).toBe(false);
  });

  it('should reject non-hex characters', () => {
    expect(isValidTxid('g'.repeat(64))).toBe(false);
  });
});

describe('Color helpers', () => {
  it('spreadColor: green for > 5%', () => {
    expect(spreadColor(6)).toBe('text-green-400');
  });

  it('spreadColor: yellow for 2-5%', () => {
    expect(spreadColor(3)).toBe('text-yellow-400');
  });

  it('spreadColor: gray for < 2%', () => {
    expect(spreadColor(1)).toBe('text-gray-400');
  });

  it('profitColor: green for positive', () => {
    expect(profitColor(100)).toBe('text-green-400');
  });

  it('profitColor: red for negative', () => {
    expect(profitColor(-50)).toBe('text-red-400');
  });

  it('profitColor: gray for zero', () => {
    expect(profitColor(0)).toBe('text-gray-400');
  });
});
