'use client'

import { useState, useEffect, useRef } from 'react'

interface PriceData {
  price: number
  change24h: number
}

export function HeaderPriceTicker() {
  const [data, setData] = useState<PriceData | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/market/price/')
        if (!res.ok) return
        const json = await res.json()
        const price = json.price ?? json.data?.price
        const change = json.change24h ?? json.data?.change24h ?? json.priceChange24h ?? 0
        if (typeof price === 'number' && price > 0) {
          setData({ price, change24h: change })
        }
      } catch {
        // silent — keep last known value
      }
    }

    fetchPrice()
    intervalRef.current = setInterval(fetchPrice, 15_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!data) {
    return (
      <span className="text-xs font-mono text-white/40 px-2">
        BTC —
      </span>
    )
  }

  const isPositive = data.change24h >= 0

  return (
    <span className="text-xs font-mono tabular-nums px-2 flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-white/60">BTC</span>
      <span className="text-white font-medium">
        ${data.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </span>
      <span className={isPositive ? 'text-[#00FF41]' : 'text-[#FF0040]'}>
        {isPositive ? '+' : ''}{data.change24h.toFixed(2)}%
      </span>
    </span>
  )
}
