/**
 * useAdvancedOrdinalsMetrics Hook - CYPHER V3
 * Advanced market metrics and analytics for Ordinals collections
 * Provides professional Bloomberg Terminal-style market intelligence
 */

import { useState, useEffect, useMemo } from 'react'
import { priceVolumeService, type PriceMetrics, type VolumeMetrics, type LiquidityMetrics } from '@/services/ordinals/PriceVolumeService'

export interface AdvancedCollectionMetrics {
  symbol: string
  name: string

  // Price Metrics
  floorPrice: number
  floorPriceUSD: number
  priceChange24h: number
  priceChange7d: number
  priceChange30d: number
  bestBid: number
  bidAskSpread: number
  bidAskSpreadPercent: number
  vwap24h: number

  // Volume Metrics
  volume24h: number
  volume7d: number
  volume30d: number
  volumeUSD24h: number
  volumeUSD7d: number
  volumeUSD30d: number
  trades24h: number
  trades7d: number
  buyVolume24h: number
  sellVolume24h: number

  // Liquidity Metrics
  totalValueListed: number
  percentListed: number
  avgListingPrice: number
  avgListingVsFloor: number
  activeTraders24h: number

  // Calculated Metrics
  marketCap: number
  marketCapUSD: number
  volumeToMarketCapRatio: number // Volume/MCap indicator
  liquidityScore: number // 0-100 score
  priceEfficiency: number // How close avg listing is to floor
  tradingIntensity: number // Trades per BTC volume

  loading: boolean
  error: string | null
}

export interface MarketHealthIndicators {
  overall: 'healthy' | 'warning' | 'critical'
  liquidity: 'high' | 'medium' | 'low'
  volatility: 'high' | 'medium' | 'low'
  momentum: 'bullish' | 'neutral' | 'bearish'
  insights: string[]
  warnings: string[]
}

/**
 * Get comprehensive advanced metrics for a collection
 */
export function useAdvancedOrdinalsMetrics(
  collectionSymbol: string,
  floorPrice: number,
  supply: number
): AdvancedCollectionMetrics {
  const [metrics, setMetrics] = useState<AdvancedCollectionMetrics>({
    symbol: collectionSymbol,
    name: collectionSymbol,
    floorPrice: 0,
    floorPriceUSD: 0,
    priceChange24h: 0,
    priceChange7d: 0,
    priceChange30d: 0,
    bestBid: 0,
    bidAskSpread: 0,
    bidAskSpreadPercent: 0,
    vwap24h: 0,
    volume24h: 0,
    volume7d: 0,
    volume30d: 0,
    volumeUSD24h: 0,
    volumeUSD7d: 0,
    volumeUSD30d: 0,
    trades24h: 0,
    trades7d: 0,
    buyVolume24h: 0,
    sellVolume24h: 0,
    totalValueListed: 0,
    percentListed: 0,
    avgListingPrice: 0,
    avgListingVsFloor: 1,
    activeTraders24h: 0,
    marketCap: 0,
    marketCapUSD: 0,
    volumeToMarketCapRatio: 0,
    liquidityScore: 0,
    priceEfficiency: 100,
    tradingIntensity: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    async function fetchMetrics() {
      try {
        setMetrics(prev => ({ ...prev, loading: true, error: null }))

        // Fetch all metrics in parallel
        const [priceMetrics, volumeMetrics, liquidityMetrics] = await Promise.all([
          priceVolumeService.getPriceMetrics(collectionSymbol, floorPrice),
          priceVolumeService.getVolumeMetrics(collectionSymbol),
          priceVolumeService.getLiquidityMetrics(collectionSymbol, supply),
        ])

        if (!mounted) return

        // Calculate market cap
        const marketCap = floorPrice * supply
        const marketCapUSD = await priceVolumeService.btcToUSD(marketCap)

        // Calculate advanced metrics
        const volumeToMarketCapRatio = marketCap > 0
          ? (volumeMetrics.volume24h / marketCap) * 100
          : 0

        // Liquidity score (0-100)
        const liquidityScore = calculateLiquidityScore(
          liquidityMetrics.percentListed,
          liquidityMetrics.activeTraders24h,
          volumeToMarketCapRatio
        )

        // Price efficiency (how close avg listing is to floor, 100 = perfect)
        const priceEfficiency = liquidityMetrics.avgListingVsFloor > 0
          ? Math.max(0, 100 - (liquidityMetrics.avgListingVsFloor - 1) * 100)
          : 100

        // Trading intensity (trades per BTC volume)
        const tradingIntensity = volumeMetrics.volume24h > 0
          ? volumeMetrics.trades24h / volumeMetrics.volume24h
          : 0

        setMetrics({
          symbol: collectionSymbol,
          name: collectionSymbol,

          // Price Metrics
          floorPrice,
          floorPriceUSD: priceMetrics.floorPriceUSD,
          priceChange24h: priceMetrics.change24h,
          priceChange7d: priceMetrics.change7d,
          priceChange30d: priceMetrics.change30d,
          bestBid: priceMetrics.bestBid,
          bidAskSpread: priceMetrics.bidAskSpread,
          bidAskSpreadPercent: priceMetrics.bidAskSpreadPercent,
          vwap24h: priceMetrics.vwap24h,

          // Volume Metrics
          volume24h: volumeMetrics.volume24h,
          volume7d: volumeMetrics.volume7d,
          volume30d: volumeMetrics.volume30d,
          volumeUSD24h: volumeMetrics.volumeUSD24h,
          volumeUSD7d: volumeMetrics.volumeUSD7d,
          volumeUSD30d: volumeMetrics.volumeUSD30d,
          trades24h: volumeMetrics.trades24h,
          trades7d: volumeMetrics.trades7d,
          buyVolume24h: volumeMetrics.buyVolume24h,
          sellVolume24h: volumeMetrics.sellVolume24h,

          // Liquidity Metrics
          totalValueListed: liquidityMetrics.totalValueListed,
          percentListed: liquidityMetrics.percentListed,
          avgListingPrice: liquidityMetrics.avgListingPrice,
          avgListingVsFloor: liquidityMetrics.avgListingVsFloor,
          activeTraders24h: liquidityMetrics.activeTraders24h,

          // Calculated Metrics
          marketCap,
          marketCapUSD,
          volumeToMarketCapRatio,
          liquidityScore,
          priceEfficiency,
          tradingIntensity,

          loading: false,
          error: null,
        })
      } catch (error) {
        console.error(`[useAdvancedOrdinalsMetrics] Error fetching metrics for ${collectionSymbol}:`, error)

        if (!mounted) return

        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch advanced metrics',
        }))
      }
    }

    if (collectionSymbol && floorPrice >= 0 && supply > 0) {
      fetchMetrics()
    }

    return () => {
      mounted = false
    }
  }, [collectionSymbol, floorPrice, supply])

  return metrics
}

/**
 * Get market health indicators for a collection
 */
export function useMarketHealthIndicators(metrics: AdvancedCollectionMetrics): MarketHealthIndicators {
  return useMemo(() => {
    const insights: string[] = []
    const warnings: string[] = []

    // Liquidity Assessment
    let liquidity: 'high' | 'medium' | 'low' = 'low'
    if (metrics.liquidityScore > 70) {
      liquidity = 'high'
      insights.push(`High liquidity (score: ${metrics.liquidityScore.toFixed(0)})`)
    } else if (metrics.liquidityScore > 40) {
      liquidity = 'medium'
      insights.push(`Moderate liquidity (score: ${metrics.liquidityScore.toFixed(0)})`)
    } else {
      liquidity = 'low'
      warnings.push(`Low liquidity (score: ${metrics.liquidityScore.toFixed(0)}) - larger spreads expected`)
    }

    // Volatility Assessment (based on price changes)
    let volatility: 'high' | 'medium' | 'low' = 'low'
    const volatilityMeasure = Math.abs(metrics.priceChange24h) + Math.abs(metrics.priceChange7d) / 7
    if (volatilityMeasure > 15) {
      volatility = 'high'
      warnings.push(`High volatility detected (${volatilityMeasure.toFixed(1)}% daily movement)`)
    } else if (volatilityMeasure > 5) {
      volatility = 'medium'
      insights.push(`Moderate volatility (${volatilityMeasure.toFixed(1)}% daily movement)`)
    } else {
      volatility = 'low'
      insights.push(`Low volatility - stable price action`)
    }

    // Momentum Assessment
    let momentum: 'bullish' | 'neutral' | 'bearish' = 'neutral'
    if (metrics.priceChange24h > 5 && metrics.priceChange7d > 0) {
      momentum = 'bullish'
      insights.push(`Strong upward momentum (+${metrics.priceChange24h.toFixed(1)}% 24h)`)
    } else if (metrics.priceChange24h < -5 && metrics.priceChange7d < 0) {
      momentum = 'bearish'
      warnings.push(`Downward momentum (${metrics.priceChange24h.toFixed(1)}% 24h)`)
    } else {
      momentum = 'neutral'
    }

    // Volume Analysis
    if (metrics.volumeToMarketCapRatio > 10) {
      insights.push(`High trading activity (${metrics.volumeToMarketCapRatio.toFixed(1)}% of market cap)`)
    } else if (metrics.volumeToMarketCapRatio < 1) {
      warnings.push(`Low trading activity (${metrics.volumeToMarketCapRatio.toFixed(1)}% of market cap)`)
    }

    // Spread Analysis
    if (metrics.bidAskSpreadPercent > 5) {
      warnings.push(`Wide bid-ask spread (${metrics.bidAskSpreadPercent.toFixed(1)}%) - lower liquidity`)
    } else if (metrics.bidAskSpreadPercent < 1) {
      insights.push(`Tight spread (${metrics.bidAskSpreadPercent.toFixed(1)}%) - good liquidity`)
    }

    // Listing Analysis
    if (metrics.percentListed > 30) {
      warnings.push(`High supply listed (${metrics.percentListed.toFixed(0)}%) - potential downward pressure`)
    } else if (metrics.percentListed < 5) {
      insights.push(`Low supply listed (${metrics.percentListed.toFixed(0)}%) - potential scarcity`)
    }

    // Active Traders
    if (metrics.activeTraders24h > 100) {
      insights.push(`High trading participation (${metrics.activeTraders24h} active traders)`)
    } else if (metrics.activeTraders24h < 10) {
      warnings.push(`Low trading participation (${metrics.activeTraders24h} active traders)`)
    }

    // Overall Health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (warnings.length >= 3 || liquidity === 'low') {
      overall = 'critical'
    } else if (warnings.length >= 1) {
      overall = 'warning'
    }

    return {
      overall,
      liquidity,
      volatility,
      momentum,
      insights,
      warnings,
    }
  }, [metrics])
}

/**
 * Calculate liquidity score (0-100)
 */
function calculateLiquidityScore(
  percentListed: number,
  activeTraders: number,
  volumeToMCapRatio: number
): number {
  // Weighted scoring:
  // - 40% from listing percentage (sweet spot: 10-20%)
  // - 30% from active traders (normalized)
  // - 30% from volume/mcap ratio (sweet spot: 5-15%)

  // Listing score (optimal: 10-20%, penalize extremes)
  let listingScore = 0
  if (percentListed >= 10 && percentListed <= 20) {
    listingScore = 100
  } else if (percentListed < 10) {
    listingScore = (percentListed / 10) * 100
  } else {
    listingScore = Math.max(0, 100 - ((percentListed - 20) * 3))
  }

  // Active traders score (normalized, 100+ traders = 100 score)
  const tradersScore = Math.min(100, (activeTraders / 100) * 100)

  // Volume/MCap score (optimal: 5-15%)
  let volumeScore = 0
  if (volumeToMCapRatio >= 5 && volumeToMCapRatio <= 15) {
    volumeScore = 100
  } else if (volumeToMCapRatio < 5) {
    volumeScore = (volumeToMCapRatio / 5) * 100
  } else {
    volumeScore = Math.max(0, 100 - ((volumeToMCapRatio - 15) * 5))
  }

  // Weighted average
  const score = (listingScore * 0.4) + (tradersScore * 0.3) + (volumeScore * 0.3)

  return Math.round(Math.max(0, Math.min(100, score)))
}
