/**
 * useOrdinalsVolumeChart Hook - CYPHER V3
 * Provides REAL volume history data for collection charts
 * NO MORE Math.random() fake data!
 */

import { useState, useEffect } from 'react'
import { priceVolumeService, type VolumeHistoryPoint } from '@/services/ordinals/PriceVolumeService'

export interface VolumeChartData {
  labels: string[]
  volumes: number[]
  trades: number[]
  avgPrices: number[]
  loading: boolean
  error: string | null
}

/**
 * Fetch REAL volume history for a collection
 * @param collectionSymbol - The collection symbol
 * @param period - Time period (24h, 7d, or 30d)
 * @returns Real volume chart data
 */
export function useOrdinalsVolumeChart(
  collectionSymbol: string,
  period: '24h' | '7d' | '30d' = '24h'
): VolumeChartData {
  const [data, setData] = useState<VolumeChartData>({
    labels: [],
    volumes: [],
    trades: [],
    avgPrices: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    async function fetchVolumeHistory() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }))

        // Fetch REAL volume history from the service
        const history = await priceVolumeService.getVolumeHistory(collectionSymbol, period)

        if (!mounted) return

        if (history.length === 0) {
          setData({
            labels: [],
            volumes: [],
            trades: [],
            avgPrices: [],
            loading: false,
            error: null,
          })
          return
        }

        // Format data for charts
        const labels = history.map(point => formatLabel(point.timestamp, period))
        const volumes = history.map(point => point.volume)
        const trades = history.map(point => point.trades)
        const avgPrices = history.map(point => point.avgPrice)

        setData({
          labels,
          volumes,
          trades,
          avgPrices,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error(`[useOrdinalsVolumeChart] Error fetching volume history for ${collectionSymbol}:`, error)

        if (!mounted) return

        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch volume history',
        }))
      }
    }

    if (collectionSymbol) {
      fetchVolumeHistory()
    }

    return () => {
      mounted = false
    }
  }, [collectionSymbol, period])

  return data
}

/**
 * Format timestamp as label based on period
 */
function formatLabel(timestamp: number, period: '24h' | '7d' | '30d'): string {
  const date = new Date(timestamp)

  if (period === '24h') {
    // Hourly labels (e.g., "10:00", "11:00")
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } else {
    // Daily labels (e.g., "Feb 12", "Feb 13")
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}

/**
 * Hook to get sparkline data (simplified volume history for inline charts)
 * @param collectionSymbol - The collection symbol
 * @returns Array of volume values for sparkline
 */
export function useOrdinalsVolumeSparkline(collectionSymbol: string): number[] {
  const [volumes, setVolumes] = useState<number[]>([])

  useEffect(() => {
    let mounted = true

    async function fetchSparkline() {
      try {
        // Fetch 24h history for sparkline
        const history = await priceVolumeService.getVolumeHistory(collectionSymbol, '24h')

        if (!mounted) return

        // Return just the volumes for sparkline
        setVolumes(history.map(point => point.volume))
      } catch (error) {
        console.error(`[useOrdinalsVolumeSparkline] Error fetching sparkline for ${collectionSymbol}:`, error)
        if (mounted) setVolumes([])
      }
    }

    if (collectionSymbol) {
      fetchSparkline()
    }

    return () => {
      mounted = false
    }
  }, [collectionSymbol])

  return volumes
}
