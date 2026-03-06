import { useQuery } from '@tanstack/react-query'

export function useRunesList() {
  return useQuery({
    queryKey: ['runes-list'],
    queryFn: async () => {
      // Strategy 1: Try /api/runes/list (Hiro API with holder enrichment)
      try {
        const response = await fetch('/api/runes/list/?limit=30&offset=0')
        if (response.ok) {
          const data = await response.json()
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            return data.data
          }
        }
      } catch (error) {
      }

      // Strategy 2: Try Gamma.io collection stats
      try {
        const response = await fetch('/api/marketplace/runes/collection-stats/?limit=30')
        if (response.ok) {
          const data = await response.json()
          const runes = data.runes || (Array.isArray(data) ? data : [])
          if (runes.length > 0) {
            return runes.map((r: any) => ({
              name: r.rune || r.runeName || '',
              formatted_name: r.spacedRune || r.rune || '',
              volume_24h: r.volume || 0,
              market: {
                price_in_btc: r.floorUnitPrice?.value ? r.floorUnitPrice.value / 1e8 : 0
              },
              unique_holders: r.holders || r.ownerCount || 0
            }))
          }
        }
      } catch (error) {
      }

      // Strategy 3: Return empty array (no fake data)
      return []
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}
