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
      const [fundingRes, oiRes, lsRes] = await Promise.allSettled([
        fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
        fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
        fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`),
      ])

      let fundingRate: number | null = null
      let openInterest: number | null = null
      let longShortRatio: number | null = null

      if (fundingRes.status === 'fulfilled' && fundingRes.value.ok) {
        const d = await fundingRes.value.json()
        fundingRate = parseFloat(d.lastFundingRate)
      }

      if (oiRes.status === 'fulfilled' && oiRes.value.ok) {
        const d = await oiRes.value.json()
        openInterest = parseFloat(d.openInterest)
      }

      if (lsRes.status === 'fulfilled' && lsRes.value.ok) {
        const d = await lsRes.value.json()
        if (Array.isArray(d) && d.length > 0) {
          longShortRatio = parseFloat(d[0].longShortRatio)
        }
      }

      setData({ fundingRate, openInterest, longShortRatio, loading: false })
    } catch {
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [symbol])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return data
}
