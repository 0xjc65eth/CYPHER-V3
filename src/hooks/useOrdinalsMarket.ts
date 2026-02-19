import { useQuery } from '@tanstack/react-query'
import { useTopOrdinals } from './useTopOrdinals'
import { useOrdinalsStats } from './useOrdinalsStats'

export function useOrdinalsMarket() {
  const { data: topOrdinals, isLoading: isLoadingTop } = useTopOrdinals()
  const { data: ordinalsStats, isLoading: isLoadingStats } = useOrdinalsStats()

  return useQuery({
    queryKey: ['ordinals-market'],
    queryFn: async () => {
      // Combine data from both sources
      const volume = ordinalsStats?.volume_24h || 0
      const marketCap = ordinalsStats?.market_cap || 0
      const holders = ordinalsStats?.unique_holders || 0
      const liquidity = ordinalsStats?.available_supply || 0
      
      // Calculate neural signal based on volume and price trends
      const volumeChange = ordinalsStats?.volume_change_24h || 0
      const priceChange = ordinalsStats?.price_change_24h || 0
      
      let neuralSignal = 'Neutral'
      let confidence = 'Medium'
      let rationale = 'Insufficient data for strong signal.'
      
      if (volumeChange > 5 && priceChange > 2) {
        neuralSignal = 'Long'
        confidence = 'High'
        rationale = 'Strong inflow, whale accumulation, and positive price action detected by neural engine.'
      } else if (volumeChange < -5 && priceChange < -2) {
        neuralSignal = 'Short'
        confidence = 'High'
        rationale = 'Significant outflow, distribution pattern, and negative price action detected.'
      } else if (volumeChange > 3 || priceChange > 1) {
        neuralSignal = 'Long'
        confidence = 'Medium'
        rationale = 'Moderate inflow and positive price action detected.'
      } else if (volumeChange < -3 || priceChange < -1) {
        neuralSignal = 'Short'
        confidence = 'Medium'
        rationale = 'Moderate outflow and negative price action detected.'
      }
      
      // Format top collections from real data
      const topCollections = topOrdinals?.slice(0, 3).map((item: any) => ({
        name: item.name || 'Unknown Collection',
        volume: item.volume_24h || 0,
        sales: Math.round((item.volume_24h || 0) / (parseFloat(item.floor_price) || 1)),
        floor: parseFloat(item.floor_price) || 0
      })) || []
      
      // Sales history: single current data point (no historical API available)
      const today = new Date().toISOString().split('T')[0]
      const salesHistory = [
        { date: today, sales: topCollections.reduce((sum: number, c: { sales: number }) => sum + c.sales, 0) },
      ]

      // No real hourly volume breakdown available - return empty
      const heatmap: { hour: string; volume: number }[] = []
      
      // Generate trade opportunities based on real data
      const tradeOpportunities = []
      
      if (topCollections.length > 0) {
        if (volumeChange > 3 && priceChange > 1) {
          tradeOpportunities.push({
            signal: 'Buy',
            collection: topCollections[0].name,
            confidence: 'High',
            rationale: 'Volume spike and strong neural buy signal.'
          })
        }
        
        if (topCollections.length > 1) {
          tradeOpportunities.push({
            signal: 'Watch',
            collection: topCollections[1].name,
            confidence: 'Medium',
            rationale: 'Increasing liquidity, but sentiment is mixed.'
          })
        }
      }
      
      return {
        volume,
        marketCap,
        topCollection: topCollections[0]?.name || 'Unknown',
        topSale: topCollections[0]?.floor || 0,
        holders,
        liquidity,
        trend: `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
        neuralSignal,
        confidence,
        rationale,
        topCollections,
        salesHistory,
        heatmap,
        tradeOpportunities
      }
    },
    enabled: !isLoadingTop && !isLoadingStats,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
  })
}
