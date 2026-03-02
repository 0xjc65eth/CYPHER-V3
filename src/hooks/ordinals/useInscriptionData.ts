import { useQuery } from '@tanstack/react-query'
import { hiroOrdinalsService } from '@/services/HiroOrdinalsService'

interface InscriptionFilters {
  contentType?: string
  inscriptionRange?: [number, number]
  satRarity?: string
  feeRate?: [number, number]
  status?: 'confirmed' | 'pending'
}

interface Inscription {
  id: number
  txid: string
  address: string
  contentType: string
  contentSize: number
  contentUrl?: string
  fee: number
  feeRate: number
  satNumber: number
  satRarity?: string
  block?: number
  timestamp: number
  genesisAddress: string
  genesisBlock: number
  genesisFee: number
  collection?: {
    name: string
    slug: string
  }
  metadata?: Record<string, any>
  provenance?: Array<{
    address: string
    block: number
    timestamp: number
    txid: string
  }>
}

interface MempoolInscription extends Inscription {
  estimatedBlocks: number
  position: number
  priority: 'high' | 'medium' | 'low'
}

/**
 * Fetch confirmed inscriptions from Hiro API
 */
async function fetchInscriptions(filters: InscriptionFilters): Promise<Inscription[]> {
  try {
    // Get inscriptions from Hiro service
    const hiroInscriptions = await hiroOrdinalsService.getInscriptions(50, 0)

    // Transform Hiro data to our interface (using REAL data only)
    const inscriptions: Inscription[] = hiroInscriptions
      .filter(item => item && item.number) // Only valid items
      .map(item => ({
        id: item.number,
        txid: item.tx_id || '',
        address: item.address || '',
        contentType: item.content_type || 'unknown',
        contentSize: item.content_length || 0,
        contentUrl: `https://ordinals.com/content/${item.id}`,
        fee: item.genesis_fee || 0,
        feeRate: item.genesis_fee ? Math.floor(item.genesis_fee / 250) : 0,
        satNumber: parseInt(item.sat_ordinal || '0') || 0,
        satRarity: item.sat_rarity,
        block: item.genesis_height,
        timestamp: item.timestamp || Date.now(),
        genesisAddress: item.address || '',
        genesisBlock: item.genesis_height || 0,
        genesisFee: item.genesis_fee || 0,
        collection: item.collection_name ? {
          name: item.collection_name,
          slug: item.collection_id || item.collection_name.toLowerCase().replace(/\s+/g, '-')
        } : undefined
      }))

    // Apply client-side filters
    let filtered = inscriptions

    if (filters.contentType && filters.contentType !== 'all') {
      filtered = filtered.filter(i => i.contentType === filters.contentType)
    }

    if (filters.inscriptionRange) {
      filtered = filtered.filter(i =>
        i.id >= filters.inscriptionRange![0] &&
        i.id <= filters.inscriptionRange![1]
      )
    }

    if (filters.satRarity && filters.satRarity !== 'all') {
      filtered = filtered.filter(i => i.satRarity === filters.satRarity)
    }

    if (filters.feeRate) {
      filtered = filtered.filter(i =>
        i.feeRate >= filters.feeRate![0] &&
        i.feeRate <= filters.feeRate![1]
      )
    }

    return filtered
  } catch (error) {
    console.error('[useInscriptionData] Error fetching inscriptions:', error)
    throw error
  }
}

/**
 * Fetch mempool inscriptions from Hiro API
 * Note: Hiro API may not provide mempool data - this returns empty array for now
 */
async function fetchMempoolInscriptions(): Promise<MempoolInscription[]> {
  try {
    // TODO: Implement real mempool API when available
    // For now, return empty array instead of mock data
    return []
  } catch (error) {
    console.error('[useInscriptionData] Error fetching mempool:', error)
    return []
  }
}

/**
 * Fetch detailed inscription data by ID from Hiro API
 */
async function fetchInscriptionDetails(inscriptionId: string): Promise<Inscription | null> {
  try {
    const inscription = await hiroOrdinalsService.getInscriptions(inscriptionId)

    if (!inscription) return null

    return {
      id: inscription.number,
      txid: inscription.tx_id || '',
      address: inscription.address || '',
      contentType: inscription.content_type || 'unknown',
      contentSize: inscription.content_length || 0,
      contentUrl: `https://ordinals.com/content/${inscription.id}`,
      fee: inscription.genesis_fee || 0,
      feeRate: inscription.genesis_fee ? Math.floor(inscription.genesis_fee / 250) : 0,
      satNumber: parseInt(inscription.sat_ordinal || '0') || 0,
      satRarity: inscription.sat_rarity,
      block: inscription.genesis_height,
      timestamp: inscription.timestamp || Date.now(),
      genesisAddress: inscription.address || '',
      genesisBlock: inscription.genesis_height || 0,
      genesisFee: inscription.genesis_fee || 0,
      collection: inscription.collection_name ? {
        name: inscription.collection_name,
        slug: inscription.collection_id || inscription.collection_name.toLowerCase().replace(/\s+/g, '-')
      } : undefined,
      metadata: inscription.metadata
    }
  } catch (error) {
    console.error('[useInscriptionData] Error fetching inscription details:', error)
    return null
  }
}

/**
 * Hook to fetch inscriptions with filters
 */
export function useInscriptionData(filters: InscriptionFilters) {
  return useQuery({
    queryKey: ['ordinals', 'inscriptions', filters],
    queryFn: () => fetchInscriptions(filters),
    refetchInterval: filters.status === 'pending' ? 5000 : 30000,
    staleTime: filters.status === 'pending' ? 3000 : 20000
  })
}

/**
 * Hook to fetch mempool inscriptions
 * Currently returns empty array until real mempool API is available
 */
export function useMempoolInscriptions() {
  return useQuery({
    queryKey: ['ordinals', 'mempool-inscriptions'],
    queryFn: fetchMempoolInscriptions,
    refetchInterval: 30000, // Check every 30s
    staleTime: 20000
  })
}

/**
 * Hook to fetch inscription details by ID
 */
export function useInscriptionDetails(inscriptionId: string) {
  return useQuery({
    queryKey: ['ordinals', 'inscription', inscriptionId],
    queryFn: () => fetchInscriptionDetails(inscriptionId),
    enabled: !!inscriptionId,
    staleTime: 60000 // Cache for 1 minute
  })
}

/**
 * Hook to fetch inscriptions for a specific collection
 */
export function useCollectionInscriptions(collectionId: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['ordinals', 'collection-inscriptions', collectionId, limit, offset],
    queryFn: async () => {
      const inscriptions = await hiroOrdinalsService.getInscriptionsByCollection(collectionId, limit, offset)

      // Transform to our interface (using REAL data only)
      return inscriptions
        .filter(item => item && item.number)
        .map(item => ({
          id: item.number,
          txid: item.tx_id || '',
          address: item.address || '',
          contentType: item.content_type || 'unknown',
          contentSize: item.content_length || 0,
          contentUrl: `https://ordinals.com/content/${item.id}`,
          fee: item.genesis_fee || 0,
          feeRate: item.genesis_fee ? Math.floor(item.genesis_fee / 250) : 0,
          satNumber: parseInt(item.sat_ordinal || '0') || 0,
          satRarity: item.sat_rarity,
          block: item.genesis_height,
          timestamp: item.timestamp || Date.now(),
          genesisAddress: item.address || '',
          genesisBlock: item.genesis_height || 0,
          genesisFee: item.genesis_fee || 0,
          collection: item.collection_name ? {
            name: item.collection_name,
            slug: item.collection_id || item.collection_name.toLowerCase().replace(/\s+/g, '-')
          } : undefined
        }))
    },
    enabled: !!collectionId,
    staleTime: 30000
  })
}
