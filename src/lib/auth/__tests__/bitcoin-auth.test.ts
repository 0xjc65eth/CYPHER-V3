/**
 * Bitcoin Auth Tests
 * Tests address validation, session creation, formatting, wallet display names
 */

// Set JWT_SECRET BEFORE any module loads (jest.mock factories run before imports)
jest.mock('jsonwebtoken', () => {
  // Also set the env here since mock factories are hoisted
  process.env.JWT_SECRET = 'a-test-secret-key-that-is-definitely-at-least-32-characters-long'
  return {
    __esModule: true,
    default: {
      sign: jest.fn((payload: any, _secret: string) => {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
        const sig = Buffer.from('mock-signature').toString('base64url')
        return `${header}.${body}.${sig}`
      }),
      verify: jest.fn((token: string) => {
        const parts = token.split('.')
        return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      }),
    },
  }
})

import {
  isValidBitcoinAddress,
  createBitcoinAuthSession,
  getWalletDisplayName,
  formatBitcoinAddress,
} from '@/lib/auth/bitcoin-auth'

describe('Bitcoin Auth', () => {
  // ==========================================================================
  // isValidBitcoinAddress
  // ==========================================================================
  describe('isValidBitcoinAddress', () => {
    // P2PKH addresses (start with 1)
    it('should validate P2PKH address (starts with 1)', () => {
      expect(isValidBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true)
    })

    // P2SH addresses (start with 3)
    it('should validate P2SH address (starts with 3)', () => {
      expect(isValidBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true)
    })

    // Bech32 addresses (start with bc1q)
    it('should validate Bech32 P2WPKH address (starts with bc1q)', () => {
      expect(isValidBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true)
    })

    // Taproot addresses (start with bc1p)
    it('should validate Taproot P2TR address (starts with bc1p)', () => {
      expect(isValidBitcoinAddress('bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9')).toBe(true)
    })

    // Testnet addresses
    it('should validate testnet Bech32 address (starts with tb1q)', () => {
      expect(isValidBitcoinAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')).toBe(true)
    })

    it('should validate testnet Taproot address (starts with tb1p)', () => {
      expect(isValidBitcoinAddress('tb1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5ssm45wvz')).toBe(true)
    })

    // Invalid addresses
    it('should reject empty string', () => {
      expect(isValidBitcoinAddress('')).toBe(false)
    })

    it('should reject null/undefined', () => {
      expect(isValidBitcoinAddress(null as any)).toBe(false)
      expect(isValidBitcoinAddress(undefined as any)).toBe(false)
    })

    it('should reject non-string input', () => {
      expect(isValidBitcoinAddress(12345 as any)).toBe(false)
    })

    it('should reject random string', () => {
      expect(isValidBitcoinAddress('not-a-bitcoin-address')).toBe(false)
    })

    it('should reject Ethereum address', () => {
      expect(isValidBitcoinAddress('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3')).toBe(false)
    })

    it('should reject address that is too short', () => {
      expect(isValidBitcoinAddress('1A1zP1')).toBe(false)
    })

    it('should reject address with invalid characters (O, I, l)', () => {
      expect(isValidBitcoinAddress('1O1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false)
    })
  })

  // ==========================================================================
  // createBitcoinAuthSession
  // ==========================================================================
  describe('createBitcoinAuthSession', () => {
    it('should create session with correct user info', () => {
      const session = createBitcoinAuthSession(
        'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        'xverse'
      )

      expect(session.user.address).toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')
      expect(session.user.walletType).toBe('xverse')
      expect(session.token).toBeDefined()
      expect(typeof session.token).toBe('string')
      expect(session.token.length).toBeGreaterThan(0)
    })

    it('should produce a JWT with 3 parts (header.payload.signature)', () => {
      const session = createBitcoinAuthSession('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'unisat')
      const parts = session.token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('should encode address and walletType in the token payload', () => {
      const session = createBitcoinAuthSession('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'oyl')
      const payload = JSON.parse(Buffer.from(session.token.split('.')[1], 'base64url').toString())
      expect(payload.address).toBe('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')
      expect(payload.walletType).toBe('oyl')
    })

    it('should set expiry to 7 days from now', () => {
      const session = createBitcoinAuthSession('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'xverse')
      const payload = JSON.parse(Buffer.from(session.token.split('.')[1], 'base64url').toString())
      const sevenDaysInSeconds = 7 * 24 * 60 * 60
      const diff = payload.exp - payload.iat
      expect(diff).toBe(sevenDaysInSeconds)
    })

    it('should create different tokens for different addresses', () => {
      const session1 = createBitcoinAuthSession('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'xverse')
      const session2 = createBitcoinAuthSession('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'unisat')
      expect(session1.token).not.toBe(session2.token)
    })
  })

  // ==========================================================================
  // getWalletDisplayName
  // ==========================================================================
  describe('getWalletDisplayName', () => {
    it('should return "Xverse" for xverse', () => {
      expect(getWalletDisplayName('xverse')).toBe('Xverse')
    })

    it('should return "UniSat" for unisat', () => {
      expect(getWalletDisplayName('unisat')).toBe('UniSat')
    })

    it('should return "OYL" for oyl', () => {
      expect(getWalletDisplayName('oyl')).toBe('OYL')
    })

    it('should return "Gamma.io" for gamma', () => {
      expect(getWalletDisplayName('gamma')).toBe('Gamma.io')
    })

    it('should return the input string for unknown wallet types', () => {
      expect(getWalletDisplayName('metamask')).toBe('metamask')
      expect(getWalletDisplayName('phantom')).toBe('phantom')
    })
  })

  // ==========================================================================
  // formatBitcoinAddress
  // ==========================================================================
  describe('formatBitcoinAddress', () => {
    it('should truncate address with default length (8)', () => {
      const formatted = formatBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')
      expect(formatted).toBe('bc1qw508...7kv8f3t4')
    })

    it('should truncate address with custom length', () => {
      const formatted = formatBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 4)
      expect(formatted).toBe('bc1q...f3t4')
    })

    it('should return address unchanged if too short to truncate', () => {
      const short = 'bc1q'
      expect(formatBitcoinAddress(short, 8)).toBe('bc1q')
    })

    it('should handle empty string', () => {
      expect(formatBitcoinAddress('')).toBe('')
    })
  })
})
