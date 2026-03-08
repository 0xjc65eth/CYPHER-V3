import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limiter'
import { xverseAPI } from '@/lib/api/xverse'
import { ordinalsMarketService } from '@/services/ordinalsMarketService'
import type { OrdinalsCollectionStats } from '@/services/ordinalsMarketService'
import { priceVolumeService } from '@/services/ordinals/PriceVolumeService'
import { OrdinalsDataAggregator } from '@/services/ordinals/OrdinalsDataAggregator'

// ─── Circuit Breaker for Gamma.io 429 Rate Limits ─────────────────────────

const CIRCUIT_BREAKER_COOLDOWN = 5 * 60 * 1000 // 5 minutes
let circuitBreakerTrippedAt: number | null = null

function isCircuitBreakerOpen(): boolean {
  if (!circuitBreakerTrippedAt) return false
  if (Date.now() - circuitBreakerTrippedAt >= CIRCUIT_BREAKER_COOLDOWN) {
    circuitBreakerTrippedAt = null
    return false
  }
  return true
}

function tripCircuitBreaker(): void {
  circuitBreakerTrippedAt = Date.now()
}

// ─── In-Memory Cache (600s TTL) + Request Dedup ─────────────────────────────

interface CachedResponse {
  data: unknown
  timestamp: number
}

let responseCache: CachedResponse | null = null
const CACHE_TTL = 600_000 // 600 seconds

let inflightPromise: Promise<unknown> | null = null

function getCachedResponse(): unknown | null {
  if (responseCache && Date.now() - responseCache.timestamp < CACHE_TTL) {
    return responseCache.data
  }
  responseCache = null
  return null
}

function setCachedResponse(data: unknown): void {
  responseCache = { data, timestamp: Date.now() }
}

// ─── Top 15 Ordinals Collections (for Gamma fallback only) ─────────────────

const TOP_COLLECTION_SYMBOLS = [
  'bitcoin-punks', 'nodemonkes', 'bitcoin-puppets', 'quantum-cats',
  'ordinal-maxi-biz', 'runestones', 'bitmap', 'ink', 'pizza-ninjas',
  'taproot-wizards', 'bitcoin-frogs', 'natcats', 'rsic', 'degods-btc',
  'ordinal-punks',
]

const COLLECTION_INFO: Record<string, { name: string; image: string }> = {
  'bitcoin-punks': { name: 'Bitcoin Punks', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitcoin-punks_pfp' },
  'nodemonkes': { name: 'NodeMonkes', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_nodemonkes_pfp' },
  'bitcoin-puppets': { name: 'Bitcoin Puppets', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitcoin-puppets_pfp' },
  'quantum-cats': { name: 'Quantum Cats', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_quantum-cats_pfp' },
  'ordinal-maxi-biz': { name: 'Ordinal Maxi Biz (OMB)', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_ordinal-maxi-biz_pfp' },
  'runestones': { name: 'Runestone', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_runestones_pfp' },
  'bitmap': { name: 'Bitmap', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitmap_pfp' },
  'ink': { name: 'Ink', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_ink_pfp' },
  'pizza-ninjas': { name: 'Pizza Ninjas', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_pizza-ninjas_pfp' },
  'taproot-wizards': { name: 'Taproot Wizards', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_taproot-wizards_pfp' },
  'bitcoin-frogs': { name: 'Bitcoin Frogs', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitcoin-frogs_pfp' },
  'natcats': { name: 'Natcats', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_natcats_pfp' },
  'rsic': { name: 'RSIC', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_rsic_pfp' },
  'degods-btc': { name: 'DeGods', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_degods-btc_pfp' },
  'ordinal-punks': { name: 'Ordinal Punks', image: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_ordinal-punks_pfp' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function satsToBTC(sats: number | undefined): number {
  if (!sats || sats <= 0) return 0
  return sats / 1e8
}

// ─── Collection shape used in the response ──────────────────────────────────

interface TrendingCollection {
  name: string; symbol: string; floor: number; floorUSD: number;
  volume: number; volume24h: number; volume7d: number; volume30d: number;
  volumeUSD24h: number; volumeUSD7d: number; volumeUSD30d: number;
  listed: number; owners: number; supply: number; imageURI: string;
  change: number; change7d: number; change30d: number;
  bestBid: number; bidAskSpread: number; vwap24h: number;
  trades24h: number; trades7d: number; trades30d: number;
}

// ─── Core fetch logic ───────────────────────────────────────────────────────
// Priority: Xverse (primary) → Gamma.io (fallback) → OrdinalsDataAggregator (last resort)

async function fetchOrdinalsData(): Promise<unknown> {
  let btcUsdRate = 95000
  try {
    btcUsdRate = await priceVolumeService.getBTCUSDRate()
  } catch {
    // use fallback rate
  }

  let trendingCollections: TrendingCollection[] = []
  let dataSource = 'xverse'

  // ─── 1. Try Xverse (primary source) ────────────────────────────────────────
  if (xverseAPI.isEnabled()) {
    try {
      const xverseCollections = await xverseAPI.getTopCollections({ limit: 20, timePeriod: '24h' })

      if (xverseCollections && xverseCollections.length > 0) {
        trendingCollections = xverseCollections.map((c) => {
          const floorBTC = c.floorPrice / 1e8
          const volumeBTC = c.volume / 1e8
          const imageURI = c.imageUrl
            ? `/api/ordinals/image/?url=${encodeURIComponent(c.imageUrl)}`
            : `/api/ordinals/image/?url=${encodeURIComponent(`https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_${c.collectionId}_pfp`)}`

          return {
            name: c.name || c.collectionId,
            symbol: c.collectionId,
            floor: floorBTC,
            floorUSD: c.floorPriceUsd || floorBTC * btcUsdRate,
            volume: volumeBTC,
            volume24h: volumeBTC,
            volume7d: 0,
            volume30d: 0,
            volumeUSD24h: volumeBTC * btcUsdRate,
            volumeUSD7d: 0,
            volumeUSD30d: 0,
            listed: c.listedCount || 0,
            owners: c.ownerCount || 0,
            supply: c.totalSupply || 0,
            imageURI,
            change: c.volumePercentChange || 0,
            change7d: 0,
            change30d: 0,
            bestBid: floorBTC,
            bidAskSpread: 0,
            vwap24h: 0,
            trades24h: 0,
            trades7d: 0,
            trades30d: 0,
          }
        })
      }
    } catch (xverseError) {
      console.error('[Ordinals API] Xverse primary fetch failed:', xverseError)
    }
  }

  // ─── 2. Fallback to Gamma.io if Xverse returned nothing ───────────────────
  if (trendingCollections.length === 0) {
    dataSource = 'gamma'

    if (isCircuitBreakerOpen()) {
      throw new Error('Circuit breaker open - Gamma.io rate limited and Xverse unavailable')
    }

    const withTimeout = <T>(p: Promise<T>, ms = 20000): Promise<T | null> =>
      Promise.race([
        p.catch((err: Error & { status?: number }) => {
          if (err.message?.includes('429') || err.status === 429) {
            tripCircuitBreaker()
          }
          throw err
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ])

    const BATCH_SIZE = 3
    const allStatResults: { symbol: string; stats: OrdinalsCollectionStats | null }[] = []

    for (let i = 0; i < TOP_COLLECTION_SYMBOLS.length; i += BATCH_SIZE) {
      if (isCircuitBreakerOpen()) break

      const batch = TOP_COLLECTION_SYMBOLS.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(async (symbol) => {
        const stats = await withTimeout(ordinalsMarketService.getCollectionStats(symbol), 20000)
        return { symbol, stats }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          allStatResults.push(r.value)
        }
      }

      if (i + BATCH_SIZE < TOP_COLLECTION_SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const validCollections = allStatResults.filter(
      (c): c is { symbol: string; stats: OrdinalsCollectionStats } => c.stats !== null
    )

    trendingCollections = validCollections.map((c) => {
      const info = COLLECTION_INFO[c.symbol] || {
        name: c.symbol,
        image: `https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_${c.symbol}_pfp`,
      }

      const floorBTC = satsToBTC(Number(c.stats.floorPrice) || 0)
      const totalVolumeBTC = satsToBTC(Number(c.stats.totalVolume) || 0)
      const supply = Number(c.stats.supply) || 0
      const listed = Number(c.stats.listedCount ?? c.stats.totalListed) || 0

      const rawOwners = Number(c.stats.owners ?? 0)
      const owners = (Number.isFinite(rawOwners) && rawOwners > 0 && rawOwners < 1_000_000)
        ? Math.round(rawOwners)
        : 0

      const imageURI = `/api/ordinals/image/?url=${encodeURIComponent(info.image)}`

      return {
        name: info.name,
        symbol: c.symbol,
        floor: floorBTC,
        floorUSD: floorBTC * btcUsdRate,
        volume: totalVolumeBTC,
        volume24h: 0,
        volume7d: 0,
        volume30d: 0,
        volumeUSD24h: 0,
        volumeUSD7d: 0,
        volumeUSD30d: 0,
        listed,
        owners,
        supply,
        imageURI,
        change: 0,
        change7d: 0,
        change30d: 0,
        bestBid: floorBTC,
        bidAskSpread: 0,
        vwap24h: 0,
        trades24h: 0,
        trades7d: 0,
        trades30d: 0,
      }
    })
  }

  // ─── 3. Enrich with volume/price change from collection-stats endpoint ────
  try {
    const enrichBatchSize = 5
    for (let i = 0; i < trendingCollections.length; i += enrichBatchSize) {
      const batch = trendingCollections.slice(i, i + enrichBatchSize)
      const enrichResults = await Promise.allSettled(
        batch.map(async (col) => {
          const statsUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4444'}/api/ordinals/collection-stats/?symbol=${col.symbol}`
          const res = await fetch(statsUrl, { signal: AbortSignal.timeout(8000) })
          if (!res.ok) return null
          const json = await res.json()
          return json.success ? { symbol: col.symbol, stats: json.data } : null
        })
      )

      for (const result of enrichResults) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const { symbol, stats } = result.value
        const col = trendingCollections.find(c => c.symbol === symbol)
        if (!col) continue

        col.volume24h = stats.volume24h || col.volume24h
        col.volume7d = stats.volume7d || col.volume7d
        col.volume30d = stats.volume30d || col.volume30d
        col.volumeUSD24h = (stats.volume24h || 0) * btcUsdRate
        col.volumeUSD7d = (stats.volume7d || 0) * btcUsdRate
        col.volumeUSD30d = (stats.volume30d || 0) * btcUsdRate
        col.change = stats.change24h || col.change
        col.change7d = stats.change7d || col.change7d
        col.change30d = stats.change30d || col.change30d
        col.trades24h = stats.sales24h || col.trades24h
        col.trades7d = stats.sales7d || col.trades7d
        col.trades30d = stats.sales30d || col.trades30d
        if (stats.floorPrice && stats.floorPrice > 0) {
          col.floor = stats.floorPrice
          col.floorUSD = stats.floorPrice * btcUsdRate
        }
      }

      if (i + enrichBatchSize < trendingCollections.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
  } catch {
    // Collection stats enrichment failed (non-fatal)
  }

  // Sort by 24h volume descending (fallback to all-time volume)
  trendingCollections.sort((a, b) => {
    const aVol = a.volume24h > 0 ? a.volume24h : a.volume
    const bVol = b.volume24h > 0 ? b.volume24h : b.volume
    return bVol - aVol
  })

  // Aggregate metrics
  const totalVolume = trendingCollections.reduce((sum, c) => sum + c.volume, 0)
  const totalVolume24h = trendingCollections.reduce((sum, c) => sum + c.volume24h, 0)
  const totalVolume7d = trendingCollections.reduce((sum, c) => sum + c.volume7d, 0)
  const totalVolumeUsd24h = trendingCollections.reduce((sum, c) => sum + c.volumeUSD24h, 0)
  const totalTrades24h = trendingCollections.reduce((sum, c) => sum + c.trades24h, 0)
  const avgFloorPrice =
    trendingCollections.length > 0
      ? trendingCollections.reduce((sum, c) => sum + c.floor, 0) / trendingCollections.length
      : 0
  const totalListed = trendingCollections.reduce((sum, c) => sum + c.listed, 0)
  const totalOwners = trendingCollections.reduce((sum, c) => sum + c.owners, 0)

  return {
    total_inscriptions: totalOwners > 0 ? totalOwners : null,
    volume_24h: parseFloat(totalVolume24h.toFixed(4)),
    volume_7d: parseFloat(totalVolume7d.toFixed(4)),
    volume_usd_24h: parseFloat(totalVolumeUsd24h.toFixed(2)),
    total_volume: parseFloat(totalVolume.toFixed(4)),
    floor_price: parseFloat(avgFloorPrice.toFixed(6)),
    collections_count: trendingCollections.length,
    total_listed: totalListed,
    total_trades_24h: totalTrades24h,
    recent_sales: [],
    trending_collections: trendingCollections,
    data_quality: {
      real_data: true,
      fake_data: false,
      estimated_data: false,
      source: dataSource === 'xverse' ? 'xverse_primary+collection_stats_enrichment' : 'gamma_fallback+collection_stats_enrichment',
      note: dataSource === 'xverse'
        ? 'Primary data from Xverse API, enriched with volume/price changes from collection-stats'
        : 'Fallback data from Gamma stat API (Xverse unavailable), enriched with collection-stats',
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitRes = await rateLimit(request, 30, 60);
    if (rateLimitRes) return rateLimitRes;
    const cached = getCachedResponse()
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      })
    }

    if (!inflightPromise) {
      inflightPromise = fetchOrdinalsData().finally(() => {
        inflightPromise = null
      })
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout - falling back to aggregator')), 30000)
    )

    let responseData: unknown
    try {
      responseData = await Promise.race([inflightPromise, timeoutPromise])
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      if (errMsg.includes('429') || errMsg.includes('rate limit') || errMsg.includes('Circuit breaker')) {
        if (!isCircuitBreakerOpen()) tripCircuitBreaker()
      }

      // Use multi-source aggregator as fallback
      try {
        const fallbackCollections = await OrdinalsDataAggregator.fetchCollections()

        if (fallbackCollections.length > 0) {
          const totalVolume = fallbackCollections.reduce((sum, c) => sum + (c.volume || 0), 0)
          const avgFloorPrice = fallbackCollections.length > 0
            ? fallbackCollections.reduce((sum, c) => sum + c.floor, 0) / fallbackCollections.length
            : 0
          const totalListed = fallbackCollections.reduce((sum, c) => sum + c.listed, 0)
          const totalOwners = fallbackCollections.reduce((sum, c) => {
            const o = Number(c.owners ?? 0)
            return sum + (Number.isFinite(o) && o > 0 && o < 1_000_000 ? Math.round(o) : 0)
          }, 0)

          responseData = {
            total_inscriptions: totalOwners,
            volume_24h: 0,
            volume_7d: 0,
            volume_usd_24h: 0,
            total_volume: parseFloat(totalVolume.toFixed(4)),
            floor_price: parseFloat(avgFloorPrice.toFixed(6)),
            collections_count: fallbackCollections.length,
            total_trades_24h: 0,
            recent_sales: [],
            trending_collections: fallbackCollections,
            data_quality: {
              real_data: true,
              fake_data: false,
              estimated_data: false,
              source: fallbackCollections[0]?.dataSource || 'fallback_aggregator',
              reason: 'Using fallback data sources (UniSat, Hiro)'
            }
          }
        } else {
          console.error('[Ordinals API] All data sources failed')
          responseData = {
            total_inscriptions: 0,
            volume_24h: 0,
            volume_7d: 0,
            volume_usd_24h: 0,
            total_volume: 0,
            floor_price: 0,
            collections_count: 0,
            total_trades_24h: 0,
            recent_sales: [],
            trending_collections: [],
            data_quality: {
              real_data: false,
              fake_data: false,
              estimated_data: false,
              source: 'all_sources_unavailable',
              reason: 'Xverse, Gamma, Hiro all failed or rate limited'
            }
          }
        }
      } catch (fallbackError) {
        console.error('[Ordinals API] Fallback aggregator error:', fallbackError)
        responseData = {
          total_inscriptions: 0,
          volume_24h: 0,
          volume_7d: 0,
          volume_usd_24h: 0,
          total_volume: 0,
          floor_price: 0,
          collections_count: 0,
          total_trades_24h: 0,
          recent_sales: [],
          trending_collections: [],
          data_quality: {
            real_data: false,
            fake_data: false,
            estimated_data: false,
            source: 'fallback_error',
            reason: fallbackError instanceof Error ? fallbackError.message : 'Fallback aggregator failed'
          }
        }
      }
    }

    // Only cache responses that have actual collections data
    const hasCollections = responseData &&
      typeof responseData === 'object' &&
      'trending_collections' in responseData &&
      Array.isArray((responseData as { trending_collections: unknown[] }).trending_collections) &&
      (responseData as { trending_collections: unknown[] }).trending_collections.length > 0
    if (hasCollections) {
      setCachedResponse(responseData)
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Ordinals API] Error fetching ordinals data:', error)

    return NextResponse.json({
      success: false,
      data: null,
      error: 'Internal server error',
      cached: false,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
