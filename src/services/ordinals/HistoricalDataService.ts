/**
 * Historical Data Service - CYPHER V3
 * Extends PriceVolumeService with persistent storage and historical tracking
 *
 * Features:
 * - Daily snapshot collection and storage
 * - Historical price/volume time series
 * - Milestone event detection (ATH, volume spikes, etc.)
 * - Trend analysis over time
 * - Investment analytics (ROI, risk metrics)
 *
 * Storage: JSON files in /database/ordinals/snapshots/
 */

import { priceVolumeService } from './PriceVolumeService'
import fs from 'fs/promises'
import path from 'path'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DailySnapshot {
  date: string // YYYY-MM-DD
  timestamp: number
  collections: CollectionSnapshot[]
  marketMetrics: {
    totalVolume24h: number
    totalVolumeUSD24h: number
    avgFloorPrice: number
    totalCollections: number
    totalTrades24h: number
  }
  btcPrice: number
}

export interface CollectionSnapshot {
  symbol: string
  name: string
  floorPrice: number // in BTC
  floorPriceUSD: number
  volume24h: number // in BTC
  volume7d: number
  volume30d: number
  volumeUSD24h: number
  sales24h: number
  trades24h: number
  holders: number
  listed: number
  avgSalePrice: number
  highSale: number
  lowSale: number
  marketCap: number
  supply: number
  change24h: number
  change7d: number
  change30d: number
  vwap24h: number
}

export interface MilestoneEvent {
  id: string
  collectionSymbol: string
  type: 'ATH' | 'ATL' | 'VOLUME_SPIKE' | 'HOLDER_SURGE' | 'WHALE_BUY' | 'BREAKOUT' | 'BREAKDOWN'
  timestamp: number
  date: string
  data: {
    value: number
    previousValue?: number
    changePercent?: number
    context?: string
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface HistoricalData {
  symbol: string
  period: string
  timeSeries: Array<{
    date: string
    timestamp: number
    floorPrice: number
    floorPriceUSD: number
    volume: number
    volumeUSD: number
    trades: number
    holders: number
    listed: number
  }>
  analytics: {
    priceChange: number
    volumeChange: number
    averageVolume: number
    volatility: number
    trend: 'uptrend' | 'downtrend' | 'sideways'
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const PATHS = {
  SNAPSHOTS: path.join(process.cwd(), 'database', 'ordinals', 'snapshots'),
  MILESTONES: path.join(process.cwd(), 'database', 'ordinals', 'milestones'),
  COHORTS: path.join(process.cwd(), 'database', 'ordinals', 'cohorts'),
  META: path.join(process.cwd(), 'database', 'ordinals', 'meta.json'),
}

// ─── Storage Utilities ──────────────────────────────────────────────────────

/**
 * Ensure all required directories exist
 */
async function ensureDirectories(): Promise<void> {
  await fs.mkdir(PATHS.SNAPSHOTS, { recursive: true })
  await fs.mkdir(PATHS.MILESTONES, { recursive: true })
  await fs.mkdir(PATHS.COHORTS, { recursive: true })
}

/**
 * Read a snapshot from disk
 */
async function readSnapshot(date: string): Promise<DailySnapshot | null> {
  try {
    const filePath = path.join(PATHS.SNAPSHOTS, `${date}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    // File doesn't exist or is invalid
    return null
  }
}

/**
 * Write a snapshot to disk
 */
async function writeSnapshot(snapshot: DailySnapshot): Promise<void> {
  await ensureDirectories()
  const filePath = path.join(PATHS.SNAPSHOTS, `${snapshot.date}.json`)
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8')
}

/**
 * List all available snapshot dates
 */
async function listSnapshots(): Promise<string[]> {
  try {
    const files = await fs.readdir(PATHS.SNAPSHOTS)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
  } catch (error) {
    return []
  }
}

/**
 * Read milestones for a collection
 */
async function readMilestones(symbol: string): Promise<MilestoneEvent[]> {
  try {
    const filePath = path.join(PATHS.MILESTONES, `${symbol}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    return []
  }
}

/**
 * Write milestones for a collection
 */
async function writeMilestones(symbol: string, milestones: MilestoneEvent[]): Promise<void> {
  await ensureDirectories()
  const filePath = path.join(PATHS.MILESTONES, `${symbol}.json`)
  await fs.writeFile(filePath, JSON.stringify(milestones, null, 2), 'utf-8')
}

/**
 * Update meta.json with last snapshot info
 */
async function updateMeta(snapshot: DailySnapshot): Promise<void> {
  try {
    const content = await fs.readFile(PATHS.META, 'utf-8')
    const meta = JSON.parse(content)

    meta.lastSnapshot = snapshot.date
    meta.collections = snapshot.collections.map(c => c.symbol)

    await fs.writeFile(PATHS.META, JSON.stringify(meta, null, 2), 'utf-8')
  } catch (error) {
    console.error('[HistoricalDataService] Error updating meta:', error)
  }
}

// ─── Snapshot Collection ────────────────────────────────────────────────────

/**
 * Collect a daily snapshot from current market data
 */
export async function collectDailySnapshot(): Promise<DailySnapshot> {
  try {
    // Fetch current collections data from API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://cypherordifuture.xyz';
    const response = await fetch(`${baseUrl}/api/ordinals/collections?limit=50`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success || !result.data) {
      throw new Error('Invalid API response')
    }

    const collections = result.data

    // Get current BTC price
    const btcPrice = await priceVolumeService.getBTCUSDRate()

    // Build collection snapshots
    const collectionSnapshots: CollectionSnapshot[] = collections.map((c: any) => ({
      symbol: c.slug || c.symbol,
      name: c.name,
      floorPrice: c.floorPrice || 0,
      floorPriceUSD: c.floorPriceUSD || 0,
      volume24h: c.volume24h || 0,
      volume7d: c.volume7d || 0,
      volume30d: c.volume30d || 0,
      volumeUSD24h: c.volumeUSD24h || 0,
      sales24h: c.sales24h || 0,
      trades24h: c.trades24h || 0,
      holders: c.owners || 0,
      listed: c.listed || 0,
      avgSalePrice: c.floorPrice || 0, // Estimate
      highSale: (c.floorPrice || 0) * 1.5, // Estimate
      lowSale: (c.floorPrice || 0) * 0.9, // Estimate
      marketCap: (c.floorPrice || 0) * (c.supply || 1),
      supply: c.supply || 0,
      change24h: c.priceChange24h || 0,
      change7d: c.priceChange7d || 0,
      change30d: c.priceChange30d || 0,
      vwap24h: c.vwap24h || 0,
    }))

    // Build snapshot
    const snapshot: DailySnapshot = {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      collections: collectionSnapshots,
      marketMetrics: {
        totalVolume24h: collectionSnapshots.reduce((sum, c) => sum + c.volume24h, 0),
        totalVolumeUSD24h: collectionSnapshots.reduce((sum, c) => sum + c.volumeUSD24h, 0),
        avgFloorPrice: collectionSnapshots.reduce((sum, c) => sum + c.floorPrice, 0) / collectionSnapshots.length,
        totalCollections: collectionSnapshots.length,
        totalTrades24h: collectionSnapshots.reduce((sum, c) => sum + c.trades24h, 0),
      },
      btcPrice,
    }

    // Save snapshot to disk
    await writeSnapshot(snapshot)

    // Update meta
    await updateMeta(snapshot)

    return snapshot
  } catch (error) {
    console.error('[HistoricalDataService] Error collecting snapshot:', error)
    throw error
  }
}

// ─── Historical Data Retrieval ──────────────────────────────────────────────

/**
 * Load snapshot for a specific date
 */
export async function loadSnapshot(date: string): Promise<DailySnapshot | null> {
  return readSnapshot(date)
}

/**
 * Get latest snapshot
 */
export async function getLatestSnapshot(): Promise<DailySnapshot | null> {
  const dates = await listSnapshots()
  if (dates.length === 0) return null

  const latestDate = dates[dates.length - 1]
  return readSnapshot(latestDate)
}

/**
 * Get previous snapshots (last N days)
 */
export async function getPreviousSnapshots(days: number = 90): Promise<DailySnapshot[]> {
  const dates = await listSnapshots()
  const snapshots: DailySnapshot[] = []

  // Get last N dates
  const recentDates = dates.slice(-days)

  for (const date of recentDates) {
    const snapshot = await readSnapshot(date)
    if (snapshot) {
      snapshots.push(snapshot)
    }
  }

  return snapshots.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Get historical data for a specific collection
 */
export async function getHistoricalData(
  symbol: string,
  period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
): Promise<HistoricalData> {
  const periodDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    'all': 999999,
  }

  const days = periodDays[period]
  const snapshots = await getPreviousSnapshots(days)

  // Extract time series for this collection
  const timeSeries = snapshots
    .map(snapshot => {
      const collection = snapshot.collections.find(c => c.symbol === symbol)
      if (!collection) return null

      return {
        date: snapshot.date,
        timestamp: snapshot.timestamp,
        floorPrice: collection.floorPrice,
        floorPriceUSD: collection.floorPriceUSD,
        volume: collection.volume24h,
        volumeUSD: collection.volumeUSD24h,
        trades: collection.trades24h,
        holders: collection.holders,
        listed: collection.listed,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (timeSeries.length === 0) {
    // No historical data, return empty
    return {
      symbol,
      period,
      timeSeries: [],
      analytics: {
        priceChange: 0,
        volumeChange: 0,
        averageVolume: 0,
        volatility: 0,
        trend: 'sideways',
      },
    }
  }

  // Calculate analytics
  const prices = timeSeries.map(t => t.floorPrice)
  const volumes = timeSeries.map(t => t.volume)

  const priceChange = prices.length > 1
    ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    : 0

  const volumeChange = volumes.length > 1
    ? ((volumes[volumes.length - 1] - volumes[0]) / volumes[0]) * 100
    : 0

  const averageVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length

  // Calculate volatility (standard deviation of daily returns)
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
  }
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const volatility = Math.sqrt(variance) * 100

  // Detect trend (simple: compare first half vs second half average)
  const mid = Math.floor(prices.length / 2)
  const firstHalfAvg = prices.slice(0, mid).reduce((sum, p) => sum + p, 0) / mid
  const secondHalfAvg = prices.slice(mid).reduce((sum, p) => sum + p, 0) / (prices.length - mid)

  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
  const trendDiff = (secondHalfAvg - firstHalfAvg) / firstHalfAvg
  if (trendDiff > 0.05) trend = 'uptrend'
  else if (trendDiff < -0.05) trend = 'downtrend'

  return {
    symbol,
    period,
    timeSeries,
    analytics: {
      priceChange,
      volumeChange,
      averageVolume,
      volatility,
      trend,
    },
  }
}

// ─── Milestone Detection ────────────────────────────────────────────────────

/**
 * Detect milestones from snapshot comparison
 */
export async function detectMilestones(
  current: CollectionSnapshot,
  previousSnapshots: DailySnapshot[]
): Promise<MilestoneEvent[]> {
  const milestones: MilestoneEvent[] = []

  if (previousSnapshots.length === 0) return milestones

  // Get historical data for this collection
  const historicalPrices = previousSnapshots
    .map(s => s.collections.find(c => c.symbol === current.symbol))
    .filter(c => c !== undefined)
    .map(c => c!.floorPrice)

  const historicalVolumes = previousSnapshots
    .map(s => s.collections.find(c => c.symbol === current.symbol))
    .filter(c => c !== undefined)
    .map(c => c!.volume24h)

  // Detect ATH (All-Time High)
  if (historicalPrices.length > 0) {
    const previousATH = Math.max(...historicalPrices)
    if (current.floorPrice > previousATH && current.floorPrice > 0) {
      milestones.push({
        id: `${current.symbol}-ath-${Date.now()}`,
        collectionSymbol: current.symbol,
        type: 'ATH',
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        data: {
          value: current.floorPrice,
          previousValue: previousATH,
          changePercent: ((current.floorPrice - previousATH) / previousATH) * 100,
        },
        severity: 'high',
      })
    }
  }

  // Detect ATL (All-Time Low)
  if (historicalPrices.length > 0) {
    const nonZeroPrices = historicalPrices.filter(p => p > 0)
    if (nonZeroPrices.length > 0) {
      const previousATL = Math.min(...nonZeroPrices)
      if (current.floorPrice < previousATL && current.floorPrice > 0) {
        milestones.push({
          id: `${current.symbol}-atl-${Date.now()}`,
          collectionSymbol: current.symbol,
          type: 'ATL',
          timestamp: Date.now(),
          date: new Date().toISOString().split('T')[0],
          data: {
            value: current.floorPrice,
            previousValue: previousATL,
            changePercent: ((current.floorPrice - previousATL) / previousATL) * 100,
          },
          severity: 'medium',
        })
      }
    }
  }

  // Detect Volume Spike (>2x 7-day average)
  if (historicalVolumes.length >= 7) {
    const last7d = historicalVolumes.slice(-7)
    const avg7d = last7d.reduce((sum, v) => sum + v, 0) / 7

    if (current.volume24h > avg7d * 2 && avg7d > 0) {
      milestones.push({
        id: `${current.symbol}-spike-${Date.now()}`,
        collectionSymbol: current.symbol,
        type: 'VOLUME_SPIKE',
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        data: {
          value: current.volume24h,
          previousValue: avg7d,
          changePercent: ((current.volume24h - avg7d) / avg7d) * 100,
        },
        severity: current.volume24h > avg7d * 3 ? 'critical' : 'high',
      })
    }
  }

  // Detect Holder Surge (>10% increase from yesterday)
  const yesterday = previousSnapshots[previousSnapshots.length - 1]?.collections.find(
    c => c.symbol === current.symbol
  )

  if (yesterday && yesterday.holders > 0) {
    const holderChange = ((current.holders - yesterday.holders) / yesterday.holders) * 100
    if (holderChange > 10) {
      milestones.push({
        id: `${current.symbol}-holders-${Date.now()}`,
        collectionSymbol: current.symbol,
        type: 'HOLDER_SURGE',
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        data: {
          value: current.holders,
          previousValue: yesterday.holders,
          changePercent: holderChange,
        },
        severity: 'medium',
      })
    }
  }

  return milestones
}

/**
 * Save milestones for a collection
 */
export async function saveMilestones(symbol: string, newMilestones: MilestoneEvent[]): Promise<void> {
  const existing = await readMilestones(symbol)
  const combined = [...existing, ...newMilestones]

  // Sort by timestamp descending
  combined.sort((a, b) => b.timestamp - a.timestamp)

  await writeMilestones(symbol, combined)
}

/**
 * Get milestones for a collection
 */
export async function getMilestones(symbol: string, limit: number = 50): Promise<MilestoneEvent[]> {
  const milestones = await readMilestones(symbol)
  return milestones.slice(0, limit)
}

// ─── Export ─────────────────────────────────────────────────────────────────

export const historicalDataService = {
  collectDailySnapshot,
  loadSnapshot,
  getLatestSnapshot,
  getPreviousSnapshots,
  getHistoricalData,
  detectMilestones,
  saveMilestones,
  getMilestones,
  ensureDirectories,
}
