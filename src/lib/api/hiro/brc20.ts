// Hiro BRC-20 API Implementation

import { HiroAPIBase } from './base'
import { hiroCacheManager } from './cache'
import {
  BRC20Token,
  BRC20Balance,
  BRC20Activity,
  BRC20Holder,
  BRC20Stats,
  BRC20ListResponse,
  BRC20ActivityResponse,
  BRC20HoldersResponse,
  PaginationParams,
  BRC20Filters
} from './types'
import { logger } from '@/lib/logger'

export class HiroBRC20API extends HiroAPIBase {
  private cache = hiroCacheManager.getCache('brc20')!

  constructor() {
    super('/ordinals/v1/brc-20')
  }

  // Get list of BRC-20 tokens
  async getTokens(
    params: PaginationParams & BRC20Filters = {}
  ): Promise<BRC20ListResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `tokens:${JSON.stringify({ ...params, limit, offset })}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20ListResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const queryParams = {
        limit,
        offset,
        ticker: params.ticker,
        deployer: params.deployer,
        min_holders: params.min_holders,
        max_supply: params.max_supply,
        self_mint: params.self_mint,
        sort_by: params.sort_by,
        order: params.order
      }

      const { data } = await this.axiosInstance.get<BRC20ListResponse>(
        `/tokens${this.buildQueryString(queryParams)}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get specific BRC-20 token details
  async getToken(ticker: string): Promise<BRC20Token> {
    const cacheKey = `token:${ticker}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Token | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20Token>(
        `/tokens/${ticker}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 300) // 5 minutes
    return response
  }

  // Get BRC-20 token holders
  async getHolders(
    ticker: string,
    params: PaginationParams = {}
  ): Promise<BRC20HoldersResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `holders:${ticker}:${limit}:${offset}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20HoldersResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20HoldersResponse>(
        `/tokens/${ticker}/holders${this.buildQueryString({ limit, offset })}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get BRC-20 token activity
  async getActivity(
    ticker: string,
    params: PaginationParams & {
      operation?: 'deploy' | 'mint' | 'transfer'
      address?: string
      from_timestamp?: number
      to_timestamp?: number
    } = {}
  ): Promise<BRC20ActivityResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `activity:${ticker}:${JSON.stringify({ ...params, limit, offset })}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20ActivityResponse | null
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

      const { data } = await this.axiosInstance.get<BRC20ActivityResponse>(
        `/tokens/${ticker}/activity${this.buildQueryString(queryParams)}`
      )
      return data
    })

    // Cache response with shorter TTL for activity data
    this.cache.set(cacheKey, response, 30) // 30 seconds
    return response
  }

  // Get BRC-20 balances for an address
  async getBalances(address: string): Promise<BRC20Balance[]> {
    const cacheKey = `balances:${address}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Balance[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<{ results: BRC20Balance[] }>(
        `/addresses/${address}/balances`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get specific BRC-20 balance for an address
  async getBalance(address: string, ticker: string): Promise<BRC20Balance | null> {
    const balances = await this.getBalances(address)
    return balances.find(b => b.ticker === ticker) || null
  }

  // Get global BRC-20 statistics
  async getStats(): Promise<BRC20Stats> {
    const cacheKey = 'stats:global'

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Stats | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20Stats>('/stats')
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Search BRC-20 tokens
  async searchTokens(query: string, limit: number = 20): Promise<BRC20Token[]> {
    const cacheKey = `search:${query}:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Token[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20ListResponse>(
        `/tokens${this.buildQueryString({ ticker: query, limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get trending BRC-20 tokens
  async getTrendingTokens(
    period: '1h' | '24h' | '7d' = '24h',
    limit: number = 10
  ): Promise<BRC20Token[]> {
    const cacheKey = `trending:${period}:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Token[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20ListResponse>(
        `/trending${this.buildQueryString({ period, limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 300) // 5 minutes
    return response
  }

  // Get new BRC-20 deployments
  async getNewDeployments(limit: number = 20): Promise<BRC20Token[]> {
    const cacheKey = `new:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Token[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20ListResponse>(
        `/tokens${this.buildQueryString({ sort_by: 'deploy', order: 'desc', limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get top BRC-20 tokens by holders
  async getTopByHolders(limit: number = 20): Promise<BRC20Token[]> {
    const cacheKey = `top:holders:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Token[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20ListResponse>(
        `/tokens${this.buildQueryString({ sort_by: 'holders', order: 'desc', limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get top BRC-20 tokens by activity
  async getTopByActivity(limit: number = 20): Promise<BRC20Token[]> {
    const cacheKey = `top:activity:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as BRC20Token[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<BRC20ListResponse>(
        `/tokens${this.buildQueryString({ sort_by: 'activity', order: 'desc', limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get token mint progress
  async getMintProgress(ticker: string): Promise<{
    minted: string
    max_supply: string
    percentage: number
    remaining: string
  }> {
    const token = await this.getToken(ticker)
    const minted = BigInt(token.minted_supply)
    const maxSupply = BigInt(token.max_supply)
    const remaining = maxSupply - minted
    const percentage = maxSupply > 0n ? Number((minted * 100n) / maxSupply) : 0

    return {
      minted: minted.toString(),
      max_supply: maxSupply.toString(),
      percentage,
      remaining: remaining.toString()
    }
  }

  // Get holder distribution
  async getHolderDistribution(ticker: string): Promise<{
    top10: number
    top100: number
    total: number
    distribution: Array<{ range: string; count: number; percentage: number }>
  }> {
    const holders = await this.getHolders(ticker, { limit: 100 })
    const totalHolders = holders.total

    // Calculate top holder percentages
    let top10Percentage = 0
    let top100Percentage = 0

    holders.results.forEach((holder, index) => {
      if (index < 10) {
        top10Percentage += holder.percentage
      }
      if (index < 100) {
        top100Percentage += holder.percentage
      }
    })

    return {
      top10: top10Percentage,
      top100: top100Percentage,
      total: totalHolders,
      distribution: [
        { range: 'Top 10', count: Math.min(10, totalHolders), percentage: top10Percentage },
        { range: 'Top 100', count: Math.min(100, totalHolders), percentage: top100Percentage },
        { range: 'Others', count: Math.max(0, totalHolders - 100), percentage: 100 - top100Percentage }
      ]
    }
  }

  // Batch get multiple tokens
  async getMultipleTokens(tickers: string[]): Promise<Map<string, BRC20Token>> {
    const results = new Map<string, BRC20Token>()
    
    // Check cache for each token
    const uncachedTickers: string[] = []
    
    for (const ticker of tickers) {
      const cached = this.cache.get(`token:${ticker}`) as BRC20Token | null
      if (cached) {
        results.set(ticker, cached)
      } else {
        uncachedTickers.push(ticker)
      }
    }

    // Fetch uncached tokens
    await Promise.all(
      uncachedTickers.map(async (ticker) => {
        try {
          const token = await this.getToken(ticker)
          results.set(ticker, token)
        } catch (error) {
          logger.error(`Failed to fetch BRC-20 token ${ticker}:`, error)
        }
      })
    )

    return results
  }

  // Clear BRC-20 cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats()
  }
}