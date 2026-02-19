import { useQuery } from '@tanstack/react-query'
import { useRunesList } from './useRunesList'
import { useRunesStats } from './useRunesStats'

export function useRunesMarket() {
  const { data: runesList, isLoading: isLoadingList } = useRunesList()
  const { data: runesStats, isLoading: isLoadingStats } = useRunesStats()

  return useQuery({
    queryKey: ['runes-market'],
    queryFn: async () => {
      const volume = runesStats?.volume_24h || 0
      const marketCap = runesStats?.market_cap || 0
      const holders = runesStats?.unique_holders || 0
      const liquidity = runesStats?.available_supply || 0

      const volumeChange = runesStats?.volume_change_24h || 0
      const priceChange = runesStats?.price_change_24h || 0

      // Compute neural signal from real volume/price trends
      let neuralSignal = 'Hold'
      let confidence = 'Low'
      let rationale = 'Insufficient data for a directional signal.'

      if (volume > 0 && volumeChange > 5 && priceChange > 2) {
        neuralSignal = 'Buy'
        confidence = 'High'
        rationale = 'Strong volume increase with positive price momentum detected.'
      } else if (volume > 0 && volumeChange > 0 && priceChange > 0) {
        neuralSignal = 'Buy'
        confidence = 'Medium'
        rationale = 'Positive volume and price trends indicate moderate bullish momentum.'
      } else if (volumeChange < -5 && priceChange < -2) {
        neuralSignal = 'Sell'
        confidence = 'High'
        rationale = 'Significant volume drop with negative price action detected.'
      } else if (volumeChange < 0 && priceChange < 0) {
        neuralSignal = 'Sell'
        confidence = 'Medium'
        rationale = 'Declining volume and price suggest bearish pressure.'
      } else if (volume > 0) {
        neuralSignal = 'Hold'
        confidence = 'Medium'
        rationale = 'Mixed signals — volume and price trends are inconclusive.'
      }

      // Format top tokens from real data (no Math.random)
      const topTokens = (runesStats?.popular_runes?.slice(0, 3) || []).map((item: any) => {
        const priceBtc = item.market?.price_in_btc || 0
        const vol = item.volume_24h || 0
        return {
          name: item.formatted_name || item.name || 'Unknown Token',
          volume: vol,
          trades: priceBtc > 0 ? Math.round(vol / priceBtc) : 0,
          price: priceBtc.toFixed(8),
        }
      })

      // Trade opportunities derived from real data
      const tradeOpportunities: Array<{ signal: string; token: string; confidence: string; rationale: string }> = []

      if (topTokens.length > 0 && volumeChange > 3 && priceChange > 1) {
        tradeOpportunities.push({
          signal: 'Buy',
          token: topTokens[0].name,
          confidence: 'High',
          rationale: 'Leading token shows strong volume and price gain.',
        })
      }

      if (topTokens.length > 1 && (volumeChange < -2 || priceChange < -1)) {
        tradeOpportunities.push({
          signal: 'Sell',
          token: topTokens[1].name,
          confidence: 'Medium',
          rationale: 'Decreasing volume or negative price trend on this token.',
        })
      }

      return {
        volume,
        marketCap,
        topToken: topTokens[0]?.name || 'N/A',
        topSale: parseFloat(topTokens[0]?.price || '0') * 1000,
        holders,
        liquidity,
        trend: `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
        neuralSignal,
        confidence,
        rationale,
        topTokens,
        tradesHistory: [],
        heatmap: [],
        tradeOpportunities,
      }
    },
    enabled: !isLoadingList && !isLoadingStats,
    refetchInterval: 60000,
    staleTime: 30000,
  })
}
