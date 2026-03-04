// Hiro Runes API Implementation

import { HiroAPIBase } from './base'
import { hiroCacheManager } from './cache'
import {
  RuneEtching,
  RuneHolder,
  RuneActivity,
  RuneBalance,
  RuneStats,
  RunesListResponse,
  RuneHoldersResponse,
  RuneActivityResponse,
  PaginationParams,
  RuneFilters
} from './types'
import { logger } from '@/lib/logger'

export class HiroRunesAPI extends HiroAPIBase {
  private cache = hiroCacheManager.getCache('runes')!

  constructor() {
    super('/runes/v1')
  }

  // Get list of all rune etchings
  async getEtchings(
    params: PaginationParams & RuneFilters = {}
  ): Promise<RunesListResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `etchings:${JSON.stringify({ ...params, limit, offset })}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RunesListResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const queryParams = {
        limit,
        offset,
        name: params.name,
        symbol: params.symbol,
        min_supply: params.min_supply,
        max_supply: params.max_supply,
        turbo: params.turbo,
        sort_by: params.sort_by,
        order: params.order
      }

      const { data } = await this.axiosInstance.get<RunesListResponse>(
        `/etchings${this.buildQueryString(queryParams)}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get specific rune etching details
  async getEtching(runeId: string): Promise<RuneEtching> {
    const cacheKey = `etching:${runeId}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneEtching | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RuneEtching>(
        `/etchings/${runeId}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 600) // 10 minutes
    return response
  }

  // Get rune holders
  async getHolders(
    runeId: string,
    params: PaginationParams = {}
  ): Promise<RuneHoldersResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `holders:${runeId}:${limit}:${offset}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneHoldersResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RuneHoldersResponse>(
        `/etchings/${runeId}/holders${this.buildQueryString({ limit, offset })}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get rune activity
  async getActivity(
    runeId: string,
    params: PaginationParams & {
      operation?: 'mint' | 'transfer' | 'burn'
      address?: string
      from_timestamp?: number
      to_timestamp?: number
    } = {}
  ): Promise<RuneActivityResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `activity:${runeId}:${JSON.stringify({ ...params, limit, offset })}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneActivityResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const queryParams = {
        limit,
        offset,
        operation: params.operation,
        address: params.address,
        from_timestamp: params.from_timestamp,
        to_timestamp: params.to_timestamp
      }

      const { data } = await this.axiosInstance.get<RuneActivityResponse>(
        `/etchings/${runeId}/activity${this.buildQueryString(queryParams)}`
      )
      return data
    })

    // Cache response with shorter TTL for activity data
    this.cache.set(cacheKey, response, 30) // 30 seconds
    return response
  }

  // Get rune balances for an address
  async getBalances(address: string): Promise<RuneBalance[]> {
    const cacheKey = `balances:${address}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneBalance[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<{ results: RuneBalance[] }>(
        `/addresses/${address}/balances`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get specific rune balance for an address
  async getBalance(address: string, runeId: string): Promise<RuneBalance | null> {
    const balances = await this.getBalances(address)
    return balances.find(b => b.rune_id === runeId) || null
  }

  // Get global runes statistics
  async getStats(): Promise<RuneStats> {
    const cacheKey = 'stats:global'

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneStats | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RuneStats>('/stats')
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Search runes by name
  async searchRunes(query: string, limit: number = 20): Promise<RuneEtching[]> {
    const cacheKey = `search:${query}:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneEtching[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RunesListResponse>(
        `/etchings${this.buildQueryString({ name: query, limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get trending runes
  async getTrendingRunes(
    period: '1h' | '24h' | '7d' = '24h',
    limit: number = 10
  ): Promise<RuneEtching[]> {
    const cacheKey = `trending:${period}:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneEtching[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RunesListResponse>(
        `/trending${this.buildQueryString({ period, limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 300) // 5 minutes
    return response
  }

  // Get new rune etchings
  async getNewEtchings(limit: number = 20): Promise<RuneEtching[]> {
    const cacheKey = `new:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneEtching[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RunesListResponse>(
        `/etchings${this.buildQueryString({ sort_by: 'created', order: 'desc', limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get top runes by market cap
  async getTopByMarketCap(limit: number = 20): Promise<RuneEtching[]> {
    const cacheKey = `top:marketcap:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as RuneEtching[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<RunesListResponse>(
        `/etchings${this.buildQueryString({ sort_by: 'minted', order: 'desc', limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get rune mint progress
  async getMintProgress(runeId: string): Promise<{
    minted: string
    total_supply: string
    percentage: number
    remaining: string
  }> {
    const etching = await this.getEtching(runeId)
    const minted = BigInt(etching.minted)
    const totalSupply = BigInt(etching.total_supply)
    const remaining = totalSupply - minted
    const percentage = totalSupply > 0n ? Number((minted * 100n) / totalSupply) : 0

    return {
      minted: minted.toString(),
      total_supply: totalSupply.toString(),
      percentage,
      remaining: remaining.toString()
    }
  }

  // Batch get multiple runes
  async getMultipleEtchings(runeIds: string[]): Promise<Map<string, RuneEtching>> {
    const results = new Map<string, RuneEtching>()
    
    // Check cache for each rune
    const uncachedIds: string[] = []
    
    for (const runeId of runeIds) {
      const cached = this.cache.get(`etching:${runeId}`) as RuneEtching | null
      if (cached) {
        results.set(runeId, cached)
      } else {
        uncachedIds.push(runeId)
      }
    }

    // Fetch uncached runes
    await Promise.all(
      uncachedIds.map(async (runeId) => {
        try {
          const etching = await this.getEtching(runeId)
          results.set(runeId, etching)
        } catch (error) {
          logger.error(`Failed to fetch rune ${runeId}:`, error)
        }
      })
    )

    return results
  }

  // Clear runes cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats()
  }
}