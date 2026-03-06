/**
 * Fee Collector Tests
 * Tests calculateFee, recordFee, getFeeStats, getAllFeeRecords, getFeeWallet
 */

// Mock dependencies before imports
jest.mock('@/lib/database', () => {
  const records: any[] = []
  return {
    dbService: {
      insertFeeRecord: jest.fn(async (record: any) => {
        records.push(record)
      }),
      getAllFeeRecords: jest.fn(async (limit: number) => {
        return records.slice(0, limit)
      }),
      getFeeStats: jest.fn(async () => ({
        totalFees: records.reduce((sum: number, r: any) => sum + r.fee_usd, 0),
        totalTrades: records.length,
        averageFee: records.length > 0
          ? records.reduce((sum: number, r: any) => sum + r.fee_usd, 0) / records.length
          : 0,
      })),
      _reset: () => { records.length = 0 },
    },
    DBFeeRecord: {},
  }
})

jest.mock('@/config/feeWallets', () => ({
  CYPHER_FEE_WALLETS: {
    evm: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH',
    bitcoin: '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb',
  },
  CYPHER_FEE_CONFIG: {
    swapFeeBps: 30,
    thorchainAffiliateBps: 50,
    jupiterPlatformBps: 35,
    bitcoinFeeBps: 35,
    minFeeUSD: 0.01,
    maxFeeUSD: 500,
    premiumFeePercent: 0,
  },
  getFeeWalletForChain: jest.fn((chain: string) => {
    const c = chain.toLowerCase()
    if (c === 'solana' || c === 'sol') return '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH'
    if (c === 'bitcoin' || c === 'btc') return '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb'
    return '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3'
  }),
  getFeeBps: jest.fn((protocol: string, isPremium: boolean) => {
    if (isPremium) return 0
    switch (protocol) {
      case 'thorchain': return 50
      case 'jupiter': return 35
      case 'bitcoin': return 35
      case 'evm':
      default: return 30
    }
  }),
}))

import {
  calculateFee,
  recordFee,
  getAllFeeRecords,
  getFeeStats,
  getFeeWallet,
  FeeParams,
  FeeRecord,
} from '@/lib/feeCollector'
import { dbService } from '@/lib/database'

describe('Fee Collector Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(dbService as any)._reset?.()
  })

  // ==========================================================================
  // getFeeWallet
  // ==========================================================================
  describe('getFeeWallet', () => {
    it('should return EVM wallet for ethereum chain', () => {
      expect(getFeeWallet('ethereum')).toBe('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3')
    })

    it('should return Solana wallet for solana chain', () => {
      expect(getFeeWallet('solana')).toBe('4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH')
    })

    it('should return Bitcoin wallet for bitcoin chain', () => {
      expect(getFeeWallet('bitcoin')).toBe('358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb')
    })

    it('should default to EVM wallet for unknown chain', () => {
      expect(getFeeWallet('unknown_chain')).toBe('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3')
    })
  })

  // ==========================================================================
  // calculateFee
  // ==========================================================================
  describe('calculateFee', () => {
    const baseParams: FeeParams = {
      protocol: 'evm_dex',
      chain: 'ethereum',
      fromToken: 'WETH',
      toToken: 'USDC',
      tradeAmountUSD: 10000,
      userAddress: '0x1234567890abcdef1234567890abcdef12345678',
    }

    it('should calculate correct fee for EVM DEX trade', () => {
      const result = calculateFee(baseParams)
      // 30 bps = 0.3% of $10,000 = $30
      expect(result.feeUSD).toBeCloseTo(30, 1)
      expect(result.feeBps).toBe(30)
      expect(result.isPremium).toBe(false)
      expect(result.feeWallet).toBe('0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3')
    })

    it('should return zero fees for premium users', () => {
      const result = calculateFee({ ...baseParams, isPremium: true })
      expect(result.feeAmount).toBe(0)
      expect(result.feeUSD).toBe(0)
      expect(result.feeBps).toBe(0)
      expect(result.isPremium).toBe(true)
      expect(result.record.status).toBe('confirmed')
      expect(result.record.metadata?.premium).toBe(true)
    })

    it('should apply minimum fee cap', () => {
      const result = calculateFee({ ...baseParams, tradeAmountUSD: 0.01 })
      // 0.3% of $0.01 = $0.00003, but min is $0.01
      expect(result.feeUSD).toBeGreaterThanOrEqual(0.01)
    })

    it('should apply maximum fee cap', () => {
      const result = calculateFee({ ...baseParams, tradeAmountUSD: 5000000 })
      // 0.3% of $5M = $15,000, but max is $500
      expect(result.feeUSD).toBe(500)
      expect(result.isCapped).toBe(true)
    })

    it('should not flag as capped when fee is under max', () => {
      const result = calculateFee({ ...baseParams, tradeAmountUSD: 1000 })
      expect(result.isCapped).toBe(false)
    })

    it('should use correct BPS for THORChain protocol', () => {
      const result = calculateFee({ ...baseParams, protocol: 'thorchain' })
      expect(result.feeBps).toBe(50)
      // 50 bps = 0.5% of $10,000 = $50
      expect(result.feeUSD).toBeCloseTo(50, 1)
    })

    it('should use correct BPS for Jupiter protocol', () => {
      const result = calculateFee({ ...baseParams, protocol: 'jupiter', chain: 'solana' })
      expect(result.feeBps).toBe(35)
      expect(result.feeWallet).toBe('4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH')
    })

    it('should use correct BPS for Bitcoin NFT protocol', () => {
      const result = calculateFee({ ...baseParams, protocol: 'bitcoin_nft', chain: 'bitcoin' })
      expect(result.feeBps).toBe(35)
      expect(result.feeWallet).toBe('358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb')
    })

    it('should generate unique fee record IDs', () => {
      const result1 = calculateFee(baseParams)
      const result2 = calculateFee(baseParams)
      expect(result1.record.id).not.toBe(result2.record.id)
      expect(result1.record.id).toMatch(/^fee_evm_dex_/)
    })

    it('should set record status to pending for non-premium', () => {
      const result = calculateFee(baseParams)
      expect(result.record.status).toBe('pending')
    })

    it('should include correct trade metadata in the record', () => {
      const result = calculateFee(baseParams)
      expect(result.record.chain).toBe('ethereum')
      expect(result.record.fromToken).toBe('WETH')
      expect(result.record.toToken).toBe('USDC')
      expect(result.record.tradeAmountUSD).toBe(10000)
      expect(result.record.userAddress).toBe(baseParams.userAddress)
      expect(result.record.timestamp).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // recordFee
  // ==========================================================================
  describe('recordFee', () => {
    it('should persist fee record via dbService', async () => {
      const record: FeeRecord = {
        id: 'fee_evm_dex_test',
        protocol: 'evm_dex',
        timestamp: Date.now(),
        chain: 'ethereum',
        fromToken: 'WETH',
        toToken: 'USDC',
        tradeAmountUSD: 1000,
        feeAmount: 3,
        feeToken: 'USDC',
        feeUSD: 3,
        feeBps: 30,
        feeWallet: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
        userAddress: '0x1234',
        status: 'pending',
      }

      await recordFee(record)

      expect(dbService.insertFeeRecord).toHaveBeenCalledTimes(1)
      const callArg = (dbService.insertFeeRecord as jest.Mock).mock.calls[0][0]
      expect(callArg.id).toBe('fee_evm_dex_test')
      expect(callArg.from_token).toBe('WETH')
      expect(callArg.to_token).toBe('USDC')
      expect(callArg.fee_usd).toBe(3)
    })

    it('should convert FeeRecord fields to DB snake_case format', async () => {
      const record: FeeRecord = {
        id: 'fee_test_convert',
        protocol: 'jupiter',
        timestamp: Date.now(),
        chain: 'solana',
        fromToken: 'SOL',
        toToken: 'USDC',
        tradeAmountUSD: 500,
        feeAmount: 1.75,
        feeToken: 'USDC',
        feeUSD: 1.75,
        feeBps: 35,
        feeWallet: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH',
        userAddress: 'solana_addr',
        txHash: 'tx_abc123',
        status: 'confirmed',
        metadata: { source: 'jupiter' },
      }

      await recordFee(record)

      const callArg = (dbService.insertFeeRecord as jest.Mock).mock.calls[0][0]
      expect(callArg.from_token).toBe('SOL')
      expect(callArg.to_token).toBe('USDC')
      expect(callArg.trade_amount_usd).toBe(500)
      expect(callArg.fee_amount).toBe(1.75)
      expect(callArg.fee_wallet).toBe('4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH')
      expect(callArg.user_address).toBe('solana_addr')
      expect(callArg.tx_hash).toBe('tx_abc123')
      expect(callArg.metadata).toEqual({ source: 'jupiter' })
    })
  })

  // ==========================================================================
  // getAllFeeRecords
  // ==========================================================================
  describe('getAllFeeRecords', () => {
    it('should delegate to dbService with default limit', async () => {
      await getAllFeeRecords()
      expect(dbService.getAllFeeRecords).toHaveBeenCalledWith(20)
    })

    it('should pass custom limit to dbService', async () => {
      await getAllFeeRecords(50)
      expect(dbService.getAllFeeRecords).toHaveBeenCalledWith(50)
    })
  })

  // ==========================================================================
  // getFeeStats
  // ==========================================================================
  describe('getFeeStats', () => {
    it('should delegate to dbService', async () => {
      const stats = await getFeeStats()
      expect(dbService.getFeeStats).toHaveBeenCalled()
      expect(stats).toBeDefined()
    })
  })
})
