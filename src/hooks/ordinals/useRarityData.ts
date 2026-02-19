import { useQuery } from '@tanstack/react-query'

interface TraitRarity {
  trait: string
  value: string
  count: number
  percentage: number
  score: number
}

interface RarityData {
  inscriptionId?: string
  collection: string
  totalScore: number
  rank: number
  percentile: number
  traits: TraitRarity[]
  stats: {
    totalScore: number
    percentile: number
    rank: number
    totalSupply: number
    uniqueTraits: number
    averageRarity: number
  }
  distribution: {
    range: string
    count: number
    percentage: number
  }[]
}

/**
 * useRarityData - Fetches rarity data for an inscription or collection.
 * Currently returns null as no rarity calculation API is integrated.
 * When a real rarity API (e.g., ordinals rarity indexer) is available,
 * this hook should be updated to fetch from it.
 */
export function useRarityData(inscriptionIdOrCollection: string) {
  return useQuery<RarityData | null>({
    queryKey: ['ordinals', 'rarity', inscriptionIdOrCollection],
    queryFn: async () => {
      // No rarity API integrated yet - return null
      // TODO: Integrate with a real ordinals rarity service
      return null
    },
    enabled: !!inscriptionIdOrCollection,
    staleTime: 300000
  })
}
