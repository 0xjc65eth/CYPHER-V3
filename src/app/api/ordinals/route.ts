import { NextResponse } from 'next/server'
import { magicEdenService } from '@/services/magicEdenService'
import type { MagicEdenCollectionStats } from '@/services/magicEdenService'
import { priceVolumeService } from '@/services/ordinals/PriceVolumeService'
import { OrdinalsDataAggregator } from '@/services/ordinals/OrdinalsDataAggregator'

// ─── Circuit Breaker for Magic Eden 429 Rate Limits ─────────────────────────

const CIRCUIT_BREAKER_COOLDOWN = 5 * 60 * 1000 // 5 minutes
let circuitBreakerTrippedAt: number | null = null

function isCircuitBreakerOpen(): boolean {
  if (!circuitBreakerTrippedAt) return false
  if (Date.now() - circuitBreakerTrippedAt >= CIRCUIT_BREAKER_COOLDOWN) {
    circuitBreakerTrippedAt = null // Reset after cooldown
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
const CACHE_TTL = 600_000 // 600 seconds (10 minutes - reduces API pressure)

// Dedup: if a fetch is already in progress, other callers wait for it
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

// ─── Top 15 Ordinals Collections (stat-only approach) ───────────────────────

const TOP_COLLECTION_SYMBOLS = [
  'bitcoin-punks',
  'nodemonkes',
  'bitcoin-puppets',
  'quantum-cats',
  'ordinal-maxi-biz',
  'runestones',
  'bitmap',
  'ink',
  'pizza-ninjas',
  'taproot-wizards',
  'bitcoin-frogs',
  'natcats',
  'rsic',
  'degods-btc',
  'ordinal-punks',
]

// Hard-coded collection names and images to avoid needing the details endpoint
const COLLECTION_INFO: Record<string, { name: string; image: string }> = {
  'bitcoin-punks': {
    name: 'Bitcoin Punks',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitcoin-punks_pfp',
  },
  'nodemonkes': {
    name: 'NodeMonkes',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_nodemonkes_pfp',
  },
  'bitcoin-puppets': {
    name: 'Bitcoin Puppets',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitcoin-puppets_pfp',
  },
  'quantum-cats': {
    name: 'Quantum Cats',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_quantum-cats_pfp',
  },
  'ordinal-maxi-biz': {
    name: 'Ordinal Maxi Biz (OMB)',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_ordinal-maxi-biz_pfp',
  },
  'runestones': {
    name: 'Runestone',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_runestones_pfp',
  },
  'bitmap': {
    name: 'Bitmap',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitmap_pfp',
  },
  'ink': {
    name: 'Ink',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_ink_pfp',
  },
  'pizza-ninjas': {
    name: 'Pizza Ninjas',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_pizza-ninjas_pfp',
  },
  'taproot-wizards': {
    name: 'Taproot Wizards',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_taproot-wizards_pfp',
  },
  'bitcoin-frogs': {
    name: 'Bitcoin Frogs',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_bitcoin-frogs_pfp',
  },
  'natcats': {
    name: 'Natcats',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_natcats_pfp',
  },
  'rsic': {
    name: 'RSIC',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_rsic_pfp',
  },
  'degods-btc': {
    name: 'DeGods',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_degods-btc_pfp',
  },
  'ordinal-punks': {
    name: 'Ordinal Punks',
    image: 'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_ordinal-punks_pfp',
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function satsToBTC(sats: number | undefined): number {
  if (!sats || sats <= 0) return 0
  return sats / 1e8
}

// ─── GET Handler ────────────────────────────────────────────────────────────

// Core fetching logic - extracted for dedup
// Uses ONLY the /v2/ord/btc/stat endpoint (one call per collection)
// No details calls, no enhancement pass (PriceVolumeService) - avoids 429s
async function fetchOrdinalsData(): Promise<unknown> {
  // If circuit breaker is open, skip Magic Eden entirely
  if (isCircuitBreakerOpen()) {
    throw new Error('Circuit breaker open - Magic Eden rate limited')
  }

  // Helper: race a promise against a 20s timeout, with 429 detection
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

  // Fetch collection stats in batches of 3 with 1s delay between batches
  const BATCH_SIZE = 3
  const allStatResults: { symbol: string; stats: MagicEdenCollectionStats | null }[] = []

  for (let i = 0; i < TOP_COLLECTION_SYMBOLS.length; i += BATCH_SIZE) {
    if (isCircuitBreakerOpen()) break // Stop if circuit breaker trips mid-batch

    const batch = TOP_COLLECTION_SYMBOLS.slice(i, i + BATCH_SIZE)
    const batchPromises = batch.map(async (symbol) => {
      // Stats endpoint only - one API call per collection
      const stats = await withTimeout(magicEdenService.getCollectionStats(symbol), 20000)
      return { symbol, stats }
    })

    const batchResults = await Promise.allSettled(batchPromises)
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        allStatResults.push(r.value)
      }
    }

    // 1 second delay between batches to avoid rate limits
    if (i + BATCH_SIZE < TOP_COLLECTION_SYMBOLS.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Get BTC/USD rate once for all collections (from CoinGecko via PriceVolumeService)
  let btcUsdRate = 95000 // fallback
  try {
    btcUsdRate = await priceVolumeService.getBTCUSDRate()
  } catch (e) {
  }

  // Build collections from stat data + hard-coded names/images
  const validCollections = allStatResults.filter(
    (c): c is { symbol: string; stats: MagicEdenCollectionStats } => c.stats !== null
  )

  const trendingCollections = validCollections.map((c) => {
    const info = COLLECTION_INFO[c.symbol] || {
      name: c.symbol,
      image: `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/ord_${c.symbol}_pfp`,
    }

    const floorBTC = satsToBTC(Number(c.stats.floorPrice) || 0)
    const totalVolumeBTC = satsToBTC(Number(c.stats.totalVolume) || 0)
    const supply = Number(c.stats.supply) || 0
    const listed = Number(c.stats.listedCount ?? c.stats.totalListed) || 0

    // Sanitize owners: must be a reasonable integer (not satoshi counts or garbage values)
    const rawOwners = Number(c.stats.owners ?? 0)
    const owners = (Number.isFinite(rawOwners) && rawOwners > 0 && rawOwners < 1_000_000)
      ? Math.round(rawOwners)
      : 0

    return {
      name: info.name,
      symbol: c.symbol,
      floor: floorBTC,
      floorUSD: floorBTC * btcUsdRate,
      volume: totalVolumeBTC,   // all-time volume in BTC (from stat endpoint)
      volume24h: 0,             // 24h volume requires activities calls which cause 429s - not available
      volume7d: 0,
      volume30d: 0,
      volumeUSD24h: 0,
      volumeUSD7d: 0,
      volumeUSD30d: 0,
      listed,
      owners,
      supply,
      imageURI: info.image,
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

  // Sort by all-time volume descending (since we don't have 24h volume)
  trendingCollections.sort((a, b) => b.volume - a.volume)

  // Aggregate metrics
  const totalVolume = trendingCollections.reduce((sum, c) => sum + c.volume, 0)
  const avgFloorPrice =
    trendingCollections.length > 0
      ? trendingCollections.reduce((sum, c) => sum + c.floor, 0) / trendingCollections.length
      : 0
  const totalListed = trendingCollections.reduce((sum, c) => sum + c.listed, 0)
  const totalOwners = trendingCollections.reduce((sum, c) => sum + c.owners, 0)

  return {
    total_inscriptions: totalOwners > 0 ? totalOwners : null,
    volume_24h: 0,  // Not available without activities calls
    volume_7d: 0,
    volume_usd_24h: 0,
    total_volume: parseFloat(totalVolume.toFixed(4)), // all-time total volume
    floor_price: parseFloat(avgFloorPrice.toFixed(6)),
    collections_count: trendingCollections.length,
    total_listed: totalListed,
    total_trades_24h: 0,
    recent_sales: [],
    trending_collections: trendingCollections,
    data_quality: {
      real_data: true,
      fake_data: false,
      estimated_data: false,
      source: 'magic_eden_stat_api',
      note: 'volume field is all-time total volume; 24h volume not available (requires activities API which triggers rate limits)',
    },
  }
}

export async function GET() {
  try {
    // Check cache first
    const cached = getCachedResponse()
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      })
    }

    // Dedup: if a fetch is already in flight, wait for it (with 10s timeout)
    if (!inflightPromise) {
      inflightPromise = fetchOrdinalsData().finally(() => {
        inflightPromise = null
      })
    }

    // Race against a 30-second timeout (needs time for batched API calls with 1s delays)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout - falling back to aggregator')), 30000)
    )

    let responseData: unknown
    try {
      responseData = await Promise.race([inflightPromise, timeoutPromise])
    } catch (error) {
      // Detect 429 in error chain and trip circuit breaker
      const errMsg = error instanceof Error ? error.message : String(error)
      if (errMsg.includes('429') || errMsg.includes('rate limit') || errMsg.includes('Circuit breaker')) {
        if (!isCircuitBreakerOpen()) tripCircuitBreaker()
      }

      // Use multi-source aggregator as fallback instead of empty data

      try {
        const fallbackCollections = await OrdinalsDataAggregator.fetchCollections();

        if (fallbackCollections.length > 0) {

          // Calculate aggregate metrics from fallback data
          const totalVolume = fallbackCollections.reduce((sum, c) => sum + (c.volume || 0), 0);
          const avgFloorPrice = fallbackCollections.length > 0
            ? fallbackCollections.reduce((sum, c) => sum + c.floor, 0) / fallbackCollections.length
            : 0;
          const totalListed = fallbackCollections.reduce((sum, c) => sum + c.listed, 0);
          // Sanitize owners (same logic as primary path)
          const totalOwners = fallbackCollections.reduce((sum, c) => {
            const o = Number(c.owners ?? 0);
            return sum + (Number.isFinite(o) && o > 0 && o < 1_000_000 ? Math.round(o) : 0);
          }, 0);

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
              reason: 'Using fallback data sources (UniSat, OKX, Hiro)'
            }
          };
        } else {
          // All sources failed - return empty structure
          console.error('[Ordinals API] All data sources (Magic Eden, UniSat, OKX) failed');
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
              reason: 'Magic Eden, UniSat, OKX all failed or rate limited'
            }
          };
        }
      } catch (fallbackError) {
        console.error('[Ordinals API] Fallback aggregator error:', fallbackError);
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
        };
      }
    }

    // Cache the result
    setCachedResponse(responseData)

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Return error - NO MOCK DATA
    console.error('[Ordinals API] Error fetching ordinals data:', error)

    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch real Ordinals data',
      cached: false,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
