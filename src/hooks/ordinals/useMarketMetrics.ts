import { useQuery } from '@tanstack/react-query'

interface MarketMetrics {
  orderBook: {
    bids: Array<{ price: number; amount: number; total: number; depth: number }>
    asks: Array<{ price: number; amount: number; total: number; depth: number }>
    spread: number
    spreadPercentage: number
    midPrice: number
  }
  depth: {
    buyDepth: number
    sellDepth: number
    imbalance: number
  }
  liquidity: {
    available: number
    locked: number
    totalValue: number
  }
}

/**
 * useMarketMetrics - Fetches market depth and order book data for a collection.
 * Currently returns null as no aggregated order book API is integrated.
 * When marketplace APIs (MagicEden, Gamma, etc.) provide order book data,
 * this hook should aggregate it.
 */
export function useMarketMetrics(collection: string) {
  return useQuery<MarketMetrics | null>({
    queryKey: ['ordinals', 'market-metrics', collection],
    queryFn: async () => {
      // No aggregated order book API integrated yet
      // TODO: Aggregate from MagicEden, Gamma, OKX marketplace APIs
      return null
    },
    enabled: !!collection,
    staleTime: 30000
  })
}
