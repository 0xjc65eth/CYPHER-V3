/**
 * Blockchain Validation Service Tests
 * Tests address format detection, transaction validation, consistency calculations
 */

// Mock Redis before importing
jest.mock('@/lib/cache/redis.config', () => ({
  getRedisClient: () => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
  }),
  CACHE_CONFIG: {},
}))

// Mock external services
jest.mock('@/services/runesMarketService', () => ({
  runesMarketService: {
    getRuneMarketInfo: jest.fn().mockResolvedValue(null),
  },
}))

jest.mock('@/services/unisatRunesService', () => ({
  unisatRunesService: {
    getRuneInfo: jest.fn().mockResolvedValue(null),
  },
}))

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

import { BlockchainValidationService } from '@/services/blockchain-validation'

describe('BlockchainValidationService', () => {
  let service: BlockchainValidationService

  beforeEach(() => {
    service = new BlockchainValidationService()
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  // ==========================================================================
  // Address Format Detection (via validateAddress)
  // ==========================================================================
  describe('address format detection', () => {
    // For each test, mock fetch to return a valid response so we can inspect the format field
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          chain_stats: { funded_txo_sum: 100000, spent_txo_sum: 50000, tx_count: 5 },
        }),
      })
    })

    it('should detect P2PKH format (starts with 1)', async () => {
      const result = await service.validateAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      expect(result.data.format).toBe('p2pkh')
      expect(result.data.isValid).toBe(true)
    })

    it('should detect P2SH format (starts with 3)', async () => {
      const result = await service.validateAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')
      expect(result.data.format).toBe('p2sh')
      expect(result.data.isValid).toBe(true)
    })

    it('should detect P2WPKH/Bech32 format (starts with bc1q)', async () => {
      const result = await service.validateAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')
      expect(result.data.format).toBe('p2wpkh')
      expect(result.data.isValid).toBe(true)
    })

    it('should detect P2TR/Taproot format (starts with bc1p)', async () => {
      const result = await service.validateAddress('bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9')
      expect(result.data.format).toBe('p2tr')
      expect(result.data.isValid).toBe(true)
    })

    it('should return unknown for invalid address format', async () => {
      const result = await service.validateAddress('invalid_address_xyz')
      expect(result.data.format).toBe('unknown')
      expect(result.data.isValid).toBe(false)
      expect(result.data.status).toBe('failed')
    })

    it('should return unknown for Ethereum address', async () => {
      const result = await service.validateAddress('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3')
      expect(result.data.format).toBe('unknown')
      expect(result.data.isValid).toBe(false)
    })

    it('should return unknown for empty string', async () => {
      const result = await service.validateAddress('')
      expect(result.data.format).toBe('unknown')
      expect(result.data.isValid).toBe(false)
    })
  })

  // ==========================================================================
  // validateAddress - API interaction
  // ==========================================================================
  describe('validateAddress', () => {
    it('should return balance and tx count from mempool API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          chain_stats: { funded_txo_sum: 500000, spent_txo_sum: 100000, tx_count: 12 },
        }),
      })

      const result = await service.validateAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      expect(result.data.balance).toBe(400000)
      expect(result.data.txCount).toBe(12)
      expect(result.data.status).toBe('validated')
      expect(result.cached).toBe(false)
    })

    it('should handle 404 as valid address with zero balance', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await service.validateAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      expect(result.data.isValid).toBe(true)
      expect(result.data.balance).toBe(0)
      expect(result.data.txCount).toBe(0)
    })

    it('should handle API error (non-404) as failed', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await service.validateAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toContain('500')
    })

    it('should handle fetch timeout/network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const result = await service.validateAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toBe('Network timeout')
    })

    it('should include explorer URL in result', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 } }) })

      const addr = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      const result = await service.validateAddress(addr)
      expect(result.data.explorerUrl).toBe(`https://mempool.space/address/${addr}`)
    })
  })

  // ==========================================================================
  // validateTransaction
  // ==========================================================================
  describe('validateTransaction', () => {
    const validTxid = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

    it('should validate a confirmed transaction', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: {
            confirmed: true,
            block_height: 800000,
            block_time: 1700000000,
          },
        }),
      })

      const result = await service.validateTransaction(validTxid)
      expect(result.data.status).toBe('validated')
      expect(result.data.confirmed).toBe(true)
      expect(result.data.blockHeight).toBe(800000)
      expect(result.data.blockTime).toBe(1700000000)
    })

    it('should handle unconfirmed transaction', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: {
            confirmed: false,
          },
        }),
      })

      const result = await service.validateTransaction(validTxid)
      expect(result.data.status).toBe('validated')
      expect(result.data.confirmed).toBe(false)
      expect(result.data.confirmations).toBe(0)
    })

    it('should return failed for 404 (tx not found)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await service.validateTransaction(validTxid)
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toBe('Transaction not found')
    })

    it('should handle fetch error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'))

      const result = await service.validateTransaction(validTxid)
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toBe('Connection refused')
    })

    it('should include explorer URL', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })

      const result = await service.validateTransaction(validTxid)
      expect(result.data.explorerUrl).toBe(`https://mempool.space/tx/${validTxid}`)
    })

    it('should set validatedAt timestamp', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
      const before = Date.now()
      const result = await service.validateTransaction(validTxid)
      expect(result.data.validatedAt).toBeGreaterThanOrEqual(before)
      expect(result.validatedAt).toBeGreaterThanOrEqual(before)
    })
  })

  // ==========================================================================
  // Utility methods (tested indirectly via public API)
  // ==========================================================================
  describe('consistency calculations', () => {
    // We test these through validateRuneSupply since calculateConsistency is private

    it('should handle single source as 100% consistency', async () => {
      const { unisatRunesService } = require('@/services/unisatRunesService')
      unisatRunesService.getRuneInfo.mockResolvedValue({ supply: '1000000' })

      const result = await service.validateRuneSupply('840000:1', 'DOG•GO•TO•THE•MOON')
      expect(result.data.consistencyScore).toBe(100)
      expect(result.data.validated).toBe(true)
    })

    it('should fail validation when no sources return data', async () => {
      const { unisatRunesService } = require('@/services/unisatRunesService')
      const { runesMarketService } = require('@/services/runesMarketService')
      unisatRunesService.getRuneInfo.mockResolvedValue(null)
      runesMarketService.getRuneMarketInfo.mockResolvedValue(null)

      const result = await service.validateRuneSupply('840000:1', 'DOG•GO•TO•THE•MOON')
      expect(result.data.status).toBe('failed')
      expect(result.data.error).toContain('No supply data')
    })

    it('should validate when multiple sources agree', async () => {
      const { unisatRunesService } = require('@/services/unisatRunesService')
      const { runesMarketService } = require('@/services/runesMarketService')
      unisatRunesService.getRuneInfo.mockResolvedValue({ supply: '100000000' })
      runesMarketService.getRuneMarketInfo.mockResolvedValue({ totalSupply: '100000000' })

      const result = await service.validateRuneSupply('840000:1', 'SOME•RUNE')
      expect(result.data.consistencyScore).toBe(100)
      expect(result.data.validated).toBe(true)
      expect(result.data.canonicalSupply).toBe('100000000')
    })
  })

  // ==========================================================================
  // Cache clearing
  // ==========================================================================
  describe('cache management', () => {
    it('should clear rune validation cache', async () => {
      const redis = (service as any).redis
      redis.keys.mockResolvedValue(['validation:rune:etching:840000:1', 'validation:rune:supply:840000:1'])

      await service.clearRuneValidationCache('840000:1')
      expect(redis.keys).toHaveBeenCalledWith('validation:rune:*:840000:1')
      expect(redis.del).toHaveBeenCalled()
    })

    it('should handle empty cache gracefully when clearing', async () => {
      const redis = (service as any).redis
      redis.keys.mockResolvedValue([])

      await service.clearRuneValidationCache('nonexistent')
      expect(redis.del).not.toHaveBeenCalled()
    })

    it('should clear all validation cache', async () => {
      const redis = (service as any).redis
      redis.keys.mockResolvedValue(['validation:tx:abc', 'validation:address:xyz'])

      await service.clearAllValidationCache()
      expect(redis.keys).toHaveBeenCalledWith('validation:*')
      expect(redis.del).toHaveBeenCalled()
    })
  })
})
