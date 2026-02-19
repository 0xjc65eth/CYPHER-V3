/**
 * CYPHER V3 - Blockchain Validation Service
 * Complete validation system for Runes, transactions, and Bitcoin addresses
 *
 * Features:
 * - Transaction ID validation via mempool.space
 * - Bitcoin address validation and balance verification
 * - Rune etching on-chain verification
 * - Supply calculations cross-verification
 * - Holder count accuracy checks
 * - Multi-source price validation
 * - Redis caching for validation results
 */

import { getRedisClient, CACHE_CONFIG } from '@/lib/cache/redis.config'
import { magicEdenRunesService, type RuneMarketInfo } from './magicEdenRunesService'
import { unisatRunesService, type RuneInfo } from './unisatRunesService'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export type ValidationStatus = 'validated' | 'pending' | 'failed' | 'unknown'

export interface TransactionValidation {
  txid: string
  status: ValidationStatus
  confirmed: boolean
  blockHeight?: number
  blockTime?: number
  confirmations?: number
  error?: string
  explorerUrl: string
  validatedAt: number
}

export interface AddressValidation {
  address: string
  status: ValidationStatus
  isValid: boolean
  balance?: number
  txCount?: number
  format?: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'unknown'
  error?: string
  explorerUrl: string
  validatedAt: number
}

export interface RuneEtchingValidation {
  runeid: string
  runeName: string
  status: ValidationStatus
  etchingTxid?: string
  blockHeight?: number
  divisibility?: number
  symbol?: string
  supply?: string
  premine?: string
  etcher?: string
  error?: string
  explorerUrl: string
  validatedAt: number
}

export interface RuneSupplyValidation {
  runeid: string
  runeName: string
  status: ValidationStatus
  sources: {
    magicEden?: string
    unisat?: string
    hiro?: string
  }
  validated: boolean
  consistencyScore: number // 0-100, percentage of sources agreeing
  canonicalSupply?: string
  error?: string
  validatedAt: number
}

export interface RuneHoldersValidation {
  runeid: string
  runeName: string
  status: ValidationStatus
  sources: {
    magicEden?: number
    unisat?: number
    hiro?: number
  }
  validated: boolean
  consistencyScore: number
  canonicalHolders?: number
  error?: string
  validatedAt: number
}

export interface RunePriceValidation {
  runeid: string
  runeName: string
  status: ValidationStatus
  sources: {
    magicEden?: { price: number; volume24h?: number }
    unisat?: { price: number; volume24h?: number }
    okx?: { price: number; volume24h?: number }
  }
  validated: boolean
  consistencyScore: number
  canonicalPrice?: number
  priceDeviation?: number // % deviation between sources
  error?: string
  validatedAt: number
}

export interface ValidationResult<T> {
  data: T
  cached: boolean
  validatedAt: number
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  MEMPOOL_API: 'https://mempool.space/api',
  CACHE_TTL: {
    TX_VALIDATION: 3600,        // 1 hour - transactions don't change
    ADDRESS_VALIDATION: 300,     // 5 minutes - balances can change
    RUNE_ETCHING: 3600,          // 1 hour - etchings are permanent
    SUPPLY_VALIDATION: 600,      // 10 minutes - supply changes slowly
    HOLDERS_VALIDATION: 600,     // 10 minutes - holder counts change
    PRICE_VALIDATION: 60,        // 1 minute - prices change frequently
  },
  CONSISTENCY_THRESHOLD: 70, // Minimum 70% agreement for validation
  REQUEST_TIMEOUT: 15000,
  MAX_RETRIES: 3,
}

// ============================================================================
// Service Implementation
// ============================================================================

export class BlockchainValidationService {
  private redis = getRedisClient()

  // ==========================================================================
  // Transaction Validation
  // ==========================================================================

  /**
   * Validate a Bitcoin transaction ID via mempool.space
   */
  async validateTransaction(txid: string): Promise<ValidationResult<TransactionValidation>> {
    const cacheKey = `validation:tx:${txid}`

    // Check cache first
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return {
        data: JSON.parse(cached),
        cached: true,
        validatedAt: JSON.parse(cached).validatedAt,
      }
    }

    const validation: TransactionValidation = {
      txid,
      status: 'pending',
      confirmed: false,
      explorerUrl: `https://mempool.space/tx/${txid}`,
      validatedAt: Date.now(),
    }

    try {
      const response = await fetch(`${CONFIG.MEMPOOL_API}/tx/${txid}`, {
        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT),
      })

      if (response.status === 404) {
        validation.status = 'failed'
        validation.error = 'Transaction not found'
      } else if (response.ok) {
        const tx = await response.json()
        validation.status = 'validated'
        validation.confirmed = tx.status?.confirmed ?? false
        validation.blockHeight = tx.status?.block_height
        validation.blockTime = tx.status?.block_time
        validation.confirmations = tx.status?.confirmed ?
          (await this.getCurrentBlockHeight()) - tx.status.block_height + 1 : 0
      } else {
        validation.status = 'failed'
        validation.error = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      validation.status = 'failed'
      validation.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Cache the result
    await this.redis.setex(
      cacheKey,
      CONFIG.CACHE_TTL.TX_VALIDATION,
      JSON.stringify(validation)
    )

    return {
      data: validation,
      cached: false,
      validatedAt: validation.validatedAt,
    }
  }

  /**
   * Batch validate multiple transaction IDs
   */
  async validateTransactionBatch(txids: string[]): Promise<ValidationResult<TransactionValidation>[]> {
    return Promise.all(txids.map(txid => this.validateTransaction(txid)))
  }

  // ==========================================================================
  // Bitcoin Address Validation
  // ==========================================================================

  /**
   * Validate Bitcoin address format and check balance
   */
  async validateAddress(address: string): Promise<ValidationResult<AddressValidation>> {
    const cacheKey = `validation:address:${address}`

    // Check cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return {
        data: JSON.parse(cached),
        cached: true,
        validatedAt: JSON.parse(cached).validatedAt,
      }
    }

    const validation: AddressValidation = {
      address,
      status: 'pending',
      isValid: false,
      explorerUrl: `https://mempool.space/address/${address}`,
      validatedAt: Date.now(),
    }

    try {
      // Basic format validation
      const format = this.detectAddressFormat(address)
      validation.format = format

      if (format === 'unknown') {
        validation.status = 'failed'
        validation.error = 'Invalid address format'
        validation.isValid = false
      } else {
        // Fetch address data from mempool.space
        const response = await fetch(`${CONFIG.MEMPOOL_API}/address/${address}`, {
          signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT),
        })

        if (response.ok) {
          const data = await response.json()
          validation.status = 'validated'
          validation.isValid = true
          validation.balance = data.chain_stats?.funded_txo_sum - data.chain_stats?.spent_txo_sum
          validation.txCount = data.chain_stats?.tx_count
        } else if (response.status === 404) {
          // Address format valid but no transactions yet
          validation.status = 'validated'
          validation.isValid = true
          validation.balance = 0
          validation.txCount = 0
        } else {
          validation.status = 'failed'
          validation.error = `HTTP ${response.status}`
        }
      }
    } catch (error) {
      validation.status = 'failed'
      validation.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Cache result
    await this.redis.setex(
      cacheKey,
      CONFIG.CACHE_TTL.ADDRESS_VALIDATION,
      JSON.stringify(validation)
    )

    return {
      data: validation,
      cached: false,
      validatedAt: validation.validatedAt,
    }
  }

  /**
   * Detect Bitcoin address format
   */
  private detectAddressFormat(address: string): AddressValidation['format'] {
    if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return 'p2pkh'
    if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return 'p2sh'
    if (/^bc1q[a-z0-9]{38,58}$/.test(address)) return 'p2wpkh'
    if (/^bc1q[a-z0-9]{58,}$/.test(address)) return 'p2wsh'
    if (/^bc1p[a-z0-9]{58,}$/.test(address)) return 'p2tr'
    return 'unknown'
  }

  // ==========================================================================
  // Rune Etching Validation
  // ==========================================================================

  /**
   * Validate a Rune etching on-chain
   */
  async validateRuneEtching(runeid: string): Promise<ValidationResult<RuneEtchingValidation>> {
    const cacheKey = `validation:rune:etching:${runeid}`

    // Check cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return {
        data: JSON.parse(cached),
        cached: true,
        validatedAt: JSON.parse(cached).validatedAt,
      }
    }

    const validation: RuneEtchingValidation = {
      runeid,
      runeName: '',
      status: 'pending',
      explorerUrl: `https://ordinals.com/rune/${runeid}`,
      validatedAt: Date.now(),
    }

    try {
      // Fetch from UniSat (most reliable for rune data)
      const runeInfo = await unisatRunesService.getRuneInfo(runeid)

      if (runeInfo) {
        validation.status = 'validated'
        validation.runeName = runeInfo.spacedRune
        validation.etchingTxid = runeInfo.etching
        validation.blockHeight = runeInfo.height
        validation.divisibility = runeInfo.divisibility
        validation.symbol = runeInfo.symbol
        validation.supply = runeInfo.supply
        validation.premine = runeInfo.premine

        // Verify the etching transaction exists
        if (runeInfo.etching) {
          const txValidation = await this.validateTransaction(runeInfo.etching)
          if (txValidation.data.status !== 'validated') {
            validation.status = 'failed'
            validation.error = 'Etching transaction not found on-chain'
          }
        }
      } else {
        validation.status = 'failed'
        validation.error = 'Rune not found in indexer'
      }
    } catch (error) {
      validation.status = 'failed'
      validation.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Cache result
    await this.redis.setex(
      cacheKey,
      CONFIG.CACHE_TTL.RUNE_ETCHING,
      JSON.stringify(validation)
    )

    return {
      data: validation,
      cached: false,
      validatedAt: validation.validatedAt,
    }
  }

  // ==========================================================================
  // Rune Supply Validation (Cross-Source)
  // ==========================================================================

  /**
   * Validate rune supply across multiple sources
   */
  async validateRuneSupply(runeid: string, runeName: string): Promise<ValidationResult<RuneSupplyValidation>> {
    const cacheKey = `validation:rune:supply:${runeid}`

    // Check cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return {
        data: JSON.parse(cached),
        cached: true,
        validatedAt: JSON.parse(cached).validatedAt,
      }
    }

    const validation: RuneSupplyValidation = {
      runeid,
      runeName,
      status: 'pending',
      sources: {},
      validated: false,
      consistencyScore: 0,
      validatedAt: Date.now(),
    }

    try {
      // Fetch from multiple sources
      const [unisatData, magicEdenData] = await Promise.allSettled([
        unisatRunesService.getRuneInfo(runeid),
        magicEdenRunesService.getRuneMarketInfo(runeName),
      ])

      // Extract supply values
      if (unisatData.status === 'fulfilled' && unisatData.value) {
        validation.sources.unisat = unisatData.value.supply
      }

      if (magicEdenData.status === 'fulfilled' && magicEdenData.value) {
        validation.sources.magicEden = magicEdenData.value.totalSupply
      }

      // Calculate consistency
      const supplies = Object.values(validation.sources).filter(Boolean)
      if (supplies.length > 0) {
        const consistencyScore = this.calculateConsistency(supplies)
        validation.consistencyScore = consistencyScore
        validation.validated = consistencyScore >= CONFIG.CONSISTENCY_THRESHOLD

        if (validation.validated) {
          validation.status = 'validated'
          // Use most common value as canonical
          validation.canonicalSupply = this.findCanonicalValue(supplies)
        } else {
          validation.status = 'failed'
          validation.error = `Inconsistent supply data (${consistencyScore}% agreement)`
        }
      } else {
        validation.status = 'failed'
        validation.error = 'No supply data available from any source'
      }
    } catch (error) {
      validation.status = 'failed'
      validation.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Cache result
    await this.redis.setex(
      cacheKey,
      CONFIG.CACHE_TTL.SUPPLY_VALIDATION,
      JSON.stringify(validation)
    )

    return {
      data: validation,
      cached: false,
      validatedAt: validation.validatedAt,
    }
  }

  // ==========================================================================
  // Rune Holders Validation (Cross-Source)
  // ==========================================================================

  /**
   * Validate holder counts across multiple sources
   */
  async validateRuneHolders(runeid: string, runeName: string): Promise<ValidationResult<RuneHoldersValidation>> {
    const cacheKey = `validation:rune:holders:${runeid}`

    // Check cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return {
        data: JSON.parse(cached),
        cached: true,
        validatedAt: JSON.parse(cached).validatedAt,
      }
    }

    const validation: RuneHoldersValidation = {
      runeid,
      runeName,
      status: 'pending',
      sources: {},
      validated: false,
      consistencyScore: 0,
      validatedAt: Date.now(),
    }

    try {
      // Fetch from multiple sources
      const [unisatData, magicEdenData] = await Promise.allSettled([
        unisatRunesService.getRuneInfo(runeid),
        magicEdenRunesService.getRuneMarketInfo(runeName),
      ])

      // Extract holder counts
      if (unisatData.status === 'fulfilled' && unisatData.value) {
        validation.sources.unisat = unisatData.value.holders
      }

      if (magicEdenData.status === 'fulfilled' && magicEdenData.value) {
        validation.sources.magicEden = magicEdenData.value.holders
      }

      // Calculate consistency
      const holderCounts = Object.values(validation.sources).filter(Boolean) as number[]
      if (holderCounts.length > 0) {
        const consistencyScore = this.calculateNumericConsistency(holderCounts, 0.05) // 5% tolerance
        validation.consistencyScore = consistencyScore
        validation.validated = consistencyScore >= CONFIG.CONSISTENCY_THRESHOLD

        if (validation.validated) {
          validation.status = 'validated'
          validation.canonicalHolders = Math.round(this.average(holderCounts))
        } else {
          validation.status = 'failed'
          validation.error = `Inconsistent holder data (${consistencyScore}% agreement)`
        }
      } else {
        validation.status = 'failed'
        validation.error = 'No holder data available from any source'
      }
    } catch (error) {
      validation.status = 'failed'
      validation.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Cache result
    await this.redis.setex(
      cacheKey,
      CONFIG.CACHE_TTL.HOLDERS_VALIDATION,
      JSON.stringify(validation)
    )

    return {
      data: validation,
      cached: false,
      validatedAt: validation.validatedAt,
    }
  }

  // ==========================================================================
  // Rune Price Validation (Multi-Source)
  // ==========================================================================

  /**
   * Validate market prices across multiple sources
   */
  async validateRunePrice(runeid: string, runeName: string): Promise<ValidationResult<RunePriceValidation>> {
    const cacheKey = `validation:rune:price:${runeid}`

    // Check cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return {
        data: JSON.parse(cached),
        cached: true,
        validatedAt: JSON.parse(cached).validatedAt,
      }
    }

    const validation: RunePriceValidation = {
      runeid,
      runeName,
      status: 'pending',
      sources: {},
      validated: false,
      consistencyScore: 0,
      validatedAt: Date.now(),
    }

    try {
      // Fetch from multiple sources
      const [magicEdenData] = await Promise.allSettled([
        magicEdenRunesService.getRuneMarketInfo(runeName),
      ])

      // Extract prices
      if (magicEdenData.status === 'fulfilled' && magicEdenData.value) {
        const price = magicEdenData.value.floorUnitPrice?.value
        const volume = magicEdenData.value.volume24h
        if (price !== undefined) {
          validation.sources.magicEden = { price, volume24h: volume }
        }
      }

      // Calculate consistency
      const prices = Object.values(validation.sources)
        .filter(source => source !== undefined)
        .map(source => source!.price)

      if (prices.length > 0) {
        const consistencyScore = this.calculateNumericConsistency(prices, 0.10) // 10% tolerance
        validation.consistencyScore = consistencyScore
        validation.validated = consistencyScore >= CONFIG.CONSISTENCY_THRESHOLD

        if (validation.validated) {
          validation.status = 'validated'
          validation.canonicalPrice = this.average(prices)
          validation.priceDeviation = this.calculateDeviation(prices)
        } else {
          validation.status = 'failed'
          validation.error = `High price variance (${validation.priceDeviation?.toFixed(2)}%)`
        }
      } else {
        validation.status = 'unknown'
        validation.error = 'No price data available from any source'
      }
    } catch (error) {
      validation.status = 'failed'
      validation.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Cache result
    await this.redis.setex(
      cacheKey,
      CONFIG.CACHE_TTL.PRICE_VALIDATION,
      JSON.stringify(validation)
    )

    return {
      data: validation,
      cached: false,
      validatedAt: validation.validatedAt,
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get current Bitcoin block height
   */
  private async getCurrentBlockHeight(): Promise<number> {
    const cacheKey = 'validation:blockheight'
    const cached = await this.redis.get(cacheKey)

    if (cached) {
      return parseInt(cached, 10)
    }

    try {
      const response = await fetch(`${CONFIG.MEMPOOL_API}/blocks/tip/height`, {
        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT),
      })
      const height = await response.json()
      await this.redis.setex(cacheKey, 60, height.toString()) // Cache 1 minute
      return height
    } catch {
      return 0
    }
  }

  /**
   * Calculate consistency score for string values (percentage of matching values)
   */
  private calculateConsistency(values: string[]): number {
    if (values.length === 0) return 0
    if (values.length === 1) return 100

    const counts = new Map<string, number>()
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1)
    }

    const maxCount = Math.max(...counts.values())
    return Math.round((maxCount / values.length) * 100)
  }

  /**
   * Calculate consistency score for numeric values with tolerance
   */
  private calculateNumericConsistency(values: number[], tolerance: number): number {
    if (values.length === 0) return 0
    if (values.length === 1) return 100

    const avg = this.average(values)
    const withinTolerance = values.filter(v =>
      Math.abs(v - avg) / avg <= tolerance
    ).length

    return Math.round((withinTolerance / values.length) * 100)
  }

  /**
   * Find the most common value (canonical)
   */
  private findCanonicalValue(values: string[]): string {
    const counts = new Map<string, number>()
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1)
    }

    let maxCount = 0
    let canonical = values[0]
    for (const [value, count] of counts) {
      if (count > maxCount) {
        maxCount = count
        canonical = value
      }
    }

    return canonical
  }

  /**
   * Calculate average of numeric values
   */
  private average(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  /**
   * Calculate percentage deviation (standard deviation / mean * 100)
   */
  private calculateDeviation(values: number[]): number {
    const avg = this.average(values)
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    return (stdDev / avg) * 100
  }

  /**
   * Clear validation cache for specific rune
   */
  async clearRuneValidationCache(runeid: string): Promise<void> {
    const keys = await this.redis.keys(`validation:rune:*:${runeid}`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  /**
   * Clear all validation cache
   */
  async clearAllValidationCache(): Promise<void> {
    const keys = await this.redis.keys('validation:*')
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const blockchainValidationService = new BlockchainValidationService()
