// Hiro API Main Export File

import { HiroRunesAPI } from './runes'
import { HiroOrdinalsAPI } from './ordinals'
import { HiroBRC20API } from './brc20'
import { hiroWebSocket, HiroWebSocket } from './websocket'
import { hiroCacheManager, HiroCacheManager } from './cache'
import { logger } from '@/lib/logger'

// Export all types
export * from './types'

// Export individual API classes
export { HiroRunesAPI } from './runes'
export { HiroOrdinalsAPI } from './ordinals'
export { HiroBRC20API } from './brc20'
export { HiroWebSocket } from './websocket'
export { HiroCache, HiroCacheManager } from './cache'

// Main Hiro API class that combines all services
export class HiroAPI {
  public runes: HiroRunesAPI
  public ordinals: HiroOrdinalsAPI
  public brc20: HiroBRC20API
  public ws: HiroWebSocket
  public cache: HiroCacheManager

  constructor() {
    this.runes = new HiroRunesAPI()
    this.ordinals = new HiroOrdinalsAPI()
    this.brc20 = new HiroBRC20API()
    this.ws = hiroWebSocket
    this.cache = hiroCacheManager

    logger.info('Hiro API initialized')
  }

  // Connect WebSocket
  async connectWebSocket(): Promise<void> {
    await this.ws.connect()
  }

  // Disconnect WebSocket
  disconnectWebSocket(): void {
    this.ws.disconnect()
  }

  // Clear all caches
  clearAllCaches(): void {
    this.cache.clearAll()
  }

  // Get all cache statistics
  getCacheStats(): Record<string, any> {
    return this.cache.getStats()
  }

  // Health check
  async healthCheck(): Promise<{
    runes: boolean
    ordinals: boolean
    brc20: boolean
    websocket: boolean
    cache: boolean
  }> {
    const results = {
      runes: false,
      ordinals: false,
      brc20: false,
      websocket: false,
      cache: false
    }

    // Check Runes API
    try {
      await this.runes.getStats()
      results.runes = true
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Runes API health check failed:')
    }

    // Check Ordinals API
    try {
      await this.ordinals.getStats()
      results.ordinals = true
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Ordinals API health check failed:')
    }

    // Check BRC-20 API
    try {
      await this.brc20.getStats()
      results.brc20 = true
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'BRC-20 API health check failed:')
    }

    // Check WebSocket
    results.websocket = this.ws.isConnected()

    // Check Cache
    try {
      this.cache.getStats()
      results.cache = true
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Cache health check failed:')
    }

    return results
  }

  // Quick search across all types
  async search(query: string, limit: number = 10): Promise<{
    runes: any[]
    inscriptions: any[]
    brc20: any[]
  }> {
    const results: {
      runes: any[]
      inscriptions: any[]
      brc20: any[]
    } = {
      runes: [],
      inscriptions: [],
      brc20: []
    }

    // Search in parallel
    const [runesResults, inscriptionsResults, brc20Results] = await Promise.allSettled([
      this.runes.searchRunes(query, limit),
      this.ordinals.searchInscriptions(query, { limit }),
      this.brc20.searchTokens(query, limit)
    ])

    if (runesResults.status === 'fulfilled') {
      results.runes = runesResults.value
    }

    if (inscriptionsResults.status === 'fulfilled') {
      results.inscriptions = inscriptionsResults.value.results
    }

    if (brc20Results.status === 'fulfilled') {
      results.brc20 = brc20Results.value
    }

    return results
  }

  // Get trending items across all types
  async getTrending(period: '1h' | '24h' | '7d' = '24h', limit: number = 10): Promise<{
    runes: any[]
    inscriptions: any[]
    brc20: any[]
  }> {
    const results: {
      runes: any[]
      inscriptions: any[]
      brc20: any[]
    } = {
      runes: [],
      inscriptions: [],
      brc20: []
    }

    // Get trending in parallel
    const [runesResults, inscriptionsResults, brc20Results] = await Promise.allSettled([
      this.runes.getTrendingRunes(period, limit),
      this.ordinals.getPopularInscriptions(period, limit),
      this.brc20.getTrendingTokens(period, limit)
    ])

    if (runesResults.status === 'fulfilled') {
      results.runes = runesResults.value
    }

    if (inscriptionsResults.status === 'fulfilled') {
      results.inscriptions = inscriptionsResults.value
    }

    if (brc20Results.status === 'fulfilled') {
      results.brc20 = brc20Results.value
    }

    return results
  }

  // Get portfolio data for an address
  async getPortfolio(address: string): Promise<{
    inscriptions: any
    runes: any[]
    brc20: any[]
    stats: {
      totalInscriptions: number
      totalRunes: number
      totalBRC20: number
    }
  }> {
    // Fetch all data in parallel
    const [inscriptions, runes, brc20] = await Promise.all([
      this.ordinals.getInscriptionsByAddress(address, { limit: 100 }),
      this.runes.getBalances(address),
      this.brc20.getBalances(address)
    ])

    return {
      inscriptions,
      runes,
      brc20,
      stats: {
        totalInscriptions: inscriptions.total,
        totalRunes: runes.length,
        totalBRC20: brc20.length
      }
    }
  }

  // Subscribe to all updates for an address
  subscribeToAddress(address: string): void {
    // Subscribe to inscriptions
    this.ws.subscribeToInscriptions({ address })
    this.ws.subscribeToTransfers({ address })
    
    // Subscribe to runes
    this.ws.subscribeToRunes({ address })
    
    // Subscribe to BRC-20
    this.ws.subscribeToBRC20({ address })
  }

  // Unsubscribe from all updates for an address
  unsubscribeFromAddress(address: string): void {
    // This would need to be implemented based on actual WebSocket API
    logger.info(`Unsubscribing from address: ${address}`)
  }
}

// Singleton instance
export const hiroAPI = new HiroAPI()

// Default export
export default hiroAPI