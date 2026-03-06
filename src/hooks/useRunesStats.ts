import { useQuery } from '@tanstack/react-query'

/**
 * Fetches runes stats. Primary source: /api/runes-stats.
 * Fallback: /api/marketplace/runes/collection-stats?limit=50 aggregated.
 * Never returns hardcoded fake numbers – zeros for missing data.
 */
export function useRunesStats() {
  return useQuery({
    queryKey: ['runes-stats'],
    queryFn: async () => {
      // ---- Primary source ----
      try {
        const response = await fetch('/api/runes-stats/')
        if (response.ok) {
          const data = await response.json()
          if (data?.popular_runes?.length > 0) {
            return normalizeStatsData(data)
          }
        }
      } catch (err) {
      }

      // ---- Fallback: Gamma.io collection-stats ----
      try {
        const response = await fetch('/api/marketplace/runes/collection-stats/?limit=50&sortBy=volume&sortDirection=desc')
        if (!response.ok) {
          throw new Error(`collection-stats failed: ${response.status}`)
        }
        const data = await response.json()
        const runes: any[] = data?.runes || []
        return aggregateCollectionStats(runes)
      } catch (err) {
        console.error('Fallback collection-stats also failed:', err)
      }

      // ---- Last resort: return zeros ----
      return emptyStats()
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

function normalizeStatsData(data: any) {
  return {
    volume_24h: data.volume_24h || 0,
    volume_change_24h: data.volume_change_24h || 0,
    price_change_24h: data.price_change_24h || 0,
    market_cap: data.market_cap || 0,
    unique_holders: data.unique_holders || 0,
    available_supply: data.available_supply || 0,
    total_runes: data.total_runes || 0,
    popular_runes: Array.isArray(data.popular_runes)
      ? data.popular_runes.map(normalizeRune).filter(Boolean)
      : [],
  }
}

function normalizeRune(rune: any) {
  if (!rune) return null
  const name = rune.name || 'Unknown'
  return {
    ...rune,
    name,
    formatted_name: rune.formatted_name || name,
    volume_24h: rune.volume_24h || 0,
    change_24h: rune.change_24h || 0,
    market: {
      ...(rune.market || {}),
      price_in_btc: rune.market?.price_in_btc || 0,
      price_in_usd: rune.market?.price_in_usd || 0,
    },
    unique_holders: rune.unique_holders || 0,
    supply: rune.supply || 0,
    verified: rune.verified ?? false,
    marketplaces: rune.marketplaces || buildMarketplaces(name),
    links: rune.links || buildLinks(name),
  }
}

function aggregateCollectionStats(runes: any[]) {
  let totalVolume = 0
  let totalMarketCap = 0
  let totalHolders = 0
  let totalSupply = 0

  const popularRunes = runes.slice(0, 10).map((r) => {
    const name = r.spacedRune || r.runeName || r.rune || 'Unknown'
    const volume = r.volume || 0
    const marketCap = r.marketCap || 0
    const holders = r.holders || r.ownerCount || 0
    const supply = parseInt(r.totalSupply || '0', 10) || 0
    const floorPrice = r.floorUnitPrice?.value || 0

    totalVolume += volume
    totalMarketCap += marketCap
    totalHolders += holders
    totalSupply += supply

    return {
      name,
      formatted_name: name,
      volume_24h: volume,
      change_24h: r.volumeChange || 0,
      market: {
        price_in_btc: floorPrice,
        price_in_usd: 0,
      },
      unique_holders: holders,
      supply,
      verified: false,
      marketplaces: buildMarketplaces(name),
      links: buildLinks(name),
    }
  })

  return {
    volume_24h: totalVolume,
    volume_change_24h: 0,
    price_change_24h: 0,
    market_cap: totalMarketCap,
    unique_holders: totalHolders,
    available_supply: totalSupply,
    total_runes: runes.length,
    popular_runes: popularRunes,
  }
}

function buildMarketplaces(name: string) {
  const slug = encodeURIComponent(name)
  return [
    { name: 'gamma.io', url: `https://gamma.io/ordinals/collections/${slug}` },
    { name: 'unisat.io', url: `https://unisat.io/runes/market?rune=${slug}` },
  ]
}

function buildLinks(name: string) {
  const slug = encodeURIComponent(name)
  return {
    buy: `https://gamma.io/ordinals/collections/${slug}`,
    info: `https://unisat.io/runes/market?rune=${slug}`,
  }
}

function emptyStats() {
  return {
    volume_24h: 0,
    volume_change_24h: 0,
    price_change_24h: 0,
    market_cap: 0,
    unique_holders: 0,
    available_supply: 0,
    total_runes: 0,
    popular_runes: [],
  }
}
