'use client'

import { useState, useEffect, useCallback } from 'react'

interface DerivativesData {
  fundingRate: number | null
  openInterest: number | null
  longShortRatio: number | null
  loading: boolean
}

export function useDerivativesData(symbol: string = 'BTCUSDT') {
  const [data, setData] = useState<DerivativesData>({
    fundingRate: null,
    openInterest: null,
    longShortRatio: null,
    loading: true,
  })

  const fetchData = useCallback(async () => {
    try {
      // Use server-side API route (handles Binance geo-block with OKX/Bybit fallback)
      const res = await fetch('/api/market/derivatives/')
      if (res.ok) {
        const d = await res.json()
        setData({
          fundingRate: d.fundingRate,
          openInterest: d.openInterest,
          longShortRatio: d.longShortRatio,
          loading: false,
        })
      } else {
        setData((prev) => ({ ...prev, loading: false }))
      }
    } catch {
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return data
}
