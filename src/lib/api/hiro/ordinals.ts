// Hiro Ordinals API Implementation

import { HiroAPIBase } from './base'
import { hiroCacheManager } from './cache'
import {
  Inscription,
  InscriptionTransfer,
  InscriptionStats,
  InscriptionContent,
  InscriptionsListResponse,
  InscriptionTransfersResponse,
  PaginationParams,
  InscriptionFilters
} from './types'
import { logger } from '@/lib/logger'

export class HiroOrdinalsAPI extends HiroAPIBase {
  private cache = hiroCacheManager.getCache('ordinals')!

  constructor() {
    super('/ordinals/v1')
  }

  // Get list of inscriptions
  async getInscriptions(
    params: PaginationParams & InscriptionFilters = {}
  ): Promise<InscriptionsListResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `inscriptions:${JSON.stringify({ ...params, limit, offset })}`

    // Check cache
    const cached = this.cache.get(cacheKey) as InscriptionsListResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const queryParams = {
        limit,
        offset,
        address: params.address,
        mime_type: params.mime_type,
        content_type: params.content_type,
        recursive: params.recursive,
        cursed: params.cursed,
        from_number: params.from_number,
        to_number: params.to_number,
        from_timestamp: params.from_timestamp,
        to_timestamp: params.to_timestamp,
        sat_rarity: params.sat_rarity,
        sort_by: params.sort_by,
        order: params.order
      }

      const { data } = await this.axiosInstance.get<InscriptionsListResponse>(
        `/inscriptions${this.buildQueryString(queryParams)}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get specific inscription details
  async getInscription(inscriptionId: string): Promise<Inscription> {
    const cacheKey = `inscription:${inscriptionId}`

    // Check cache
    const cached = this.cache.get(cacheKey) as Inscription | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<Inscription>(
        `/inscriptions/${inscriptionId}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 300) // 5 minutes
    return response
  }

  // Get inscription content
  async getInscriptionContent(inscriptionId: string): Promise<InscriptionContent> {
    const cacheKey = `content:${inscriptionId}`

    // Check cache
    const cached = this.cache.get(cacheKey) as InscriptionContent | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionContent>(
        `/inscriptions/${inscriptionId}/content`
      )
      return data
    })

    // Cache response with longer TTL for content
    this.cache.set(cacheKey, response, 3600) // 1 hour
    return response
  }

  // Get inscription transfers
  async getInscriptionTransfers(
    inscriptionId: string,
    params: PaginationParams = {}
  ): Promise<InscriptionTransfersResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `transfers:${inscriptionId}:${limit}:${offset}`

    // Check cache
    const cached = this.cache.get(cacheKey) as InscriptionTransfersResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionTransfersResponse>(
        `/inscriptions/${inscriptionId}/transfers${this.buildQueryString({ limit, offset })}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get inscriptions by address
  async getInscriptionsByAddress(
    address: string,
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    return this.getInscriptions({ ...params, address })
  }

  // Get inscription statistics
  async getStats(): Promise<InscriptionStats> {
    const cacheKey = 'stats:global'

    // Check cache
    const cached = this.cache.get(cacheKey) as InscriptionStats | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionStats>('/stats')
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response, 60) // 1 minute
    return response
  }

  // Get inscriptions by sat rarity
  async getInscriptionsBySatRarity(
    rarity: string,
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    return this.getInscriptions({ ...params, sat_rarity: rarity })
  }

  // Get recursive inscriptions
  async getRecursiveInscriptions(
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    return this.getInscriptions({ ...params, recursive: true })
  }

  // Get cursed inscriptions
  async getCursedInscriptions(
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    return this.getInscriptions({ ...params, cursed: true })
  }

  // Get inscriptions by content type
  async getInscriptionsByContentType(
    contentType: string,
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    return this.getInscriptions({ ...params, content_type: contentType })
  }

  // Get latest inscriptions
  async getLatestInscriptions(limit: number = 20): Promise<Inscription[]> {
    const cacheKey = `latest:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as Inscription[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionsListResponse>(
        `/inscriptions${this.buildQueryString({ 
          sort_by: 'timestamp', 
          order: 'desc', 
          limit 
        })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 30) // 30 seconds
    return response
  }

  // Get popular inscriptions
  async getPopularInscriptions(
    period: '1h' | '24h' | '7d' = '24h',
    limit: number = 20
  ): Promise<Inscription[]> {
    const cacheKey = `popular:${period}:${limit}`

    // Check cache
    const cached = this.cache.get(cacheKey) as Inscription[] | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionsListResponse>(
        `/popular${this.buildQueryString({ period, limit })}`
      )
      return data.results
    })

    // Cache response
    this.cache.set(cacheKey, response, 300) // 5 minutes
    return response
  }

  // Search inscriptions
  async searchInscriptions(
    query: string,
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    const cacheKey = `search:${query}:${JSON.stringify(params)}`

    // Check cache
    const cached = this.cache.get(cacheKey) as InscriptionsListResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionsListResponse>(
        `/search${this.buildQueryString({ q: query, ...params })}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get inscription collection
  async getCollection(
    collectionId: string,
    params: PaginationParams = {}
  ): Promise<InscriptionsListResponse> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `collection:${collectionId}:${limit}:${offset}`

    // Check cache
    const cached = this.cache.get(cacheKey) as InscriptionsListResponse | null
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const { data } = await this.axiosInstance.get<InscriptionsListResponse>(
        `/collections/${collectionId}/inscriptions${this.buildQueryString({ limit, offset })}`
      )
      return data
    })

    // Cache response
    this.cache.set(cacheKey, response)
    return response
  }

  // Get inscription activity feed
  async getActivityFeed(
    params: PaginationParams & {
      event_types?: string[]
      from_timestamp?: number
      to_timestamp?: number
    } = {}
  ): Promise<any> {
    const { limit, offset } = this.validatePagination(params.limit, params.offset)
    const cacheKey = `activity:${JSON.stringify({ ...params, limit, offset })}`

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    // Make request
    const response = await this.request(async () => {
      const queryParams = {
        limit,
        offset,
        event_types: params.event_types?.join(','),
        from_timestamp: params.from_timestamp,
        to_timestamp: params.to_timestamp
      }

      const { data } = await this.axiosInstance.get(
        `/activity${this.buildQueryString(queryParams)}`
      )
      return data
    })

    // Cache response with short TTL
    this.cache.set(cacheKey, response, 30) // 30 seconds
    return response
  }

  // Batch get multiple inscriptions
  async getMultipleInscriptions(inscriptionIds: string[]): Promise<Map<string, Inscription>> {
    const results = new Map<string, Inscription>()
    
    // Check cache for each inscription
    const uncachedIds: string[] = []
    
    for (const id of inscriptionIds) {
      const cached = this.cache.get(`inscription:${id}`) as Inscription | null
      if (cached) {
        results.set(id, cached)
      } else {
        uncachedIds.push(id)
      }
    }

    // Fetch uncached inscriptions
    await Promise.all(
      uncachedIds.map(async (id) => {
        try {
          const inscription = await this.getInscription(id)
          results.set(id, inscription)
        } catch (error) {
          logger.error(`Failed to fetch inscription ${id}:`, error)
        }
      })
    )

    return results
  }

  // Get inscription metadata
  async getInscriptionMetadata(inscriptionId: string): Promise<Record<string, any>> {
    const inscription = await this.getInscription(inscriptionId)
    return inscription.metadata || {}
  }

  // Clear ordinals cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats()
  }
}