'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface HashratePoint {
  date: string
  hashrate: number
  hashrateEH: number
}

function formatHashrate(h: number): string {
  if (h >= 1e18) return (h / 1e18).toFixed(1) + ' EH/s'
  if (h >= 1e15) return (h / 1e15).toFixed(1) + ' PH/s'
  if (h >= 1e12) return (h / 1e12).toFixed(1) + ' TH/s'
  return h.toFixed(0) + ' H/s'
}

export function HashrateChart() {
  const [data, setData] = useState<HashratePoint[]>([])
  const [currentHashrate, setCurrentHashrate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchHashrate = useCallback(async () => {
    try {
      const res = await fetch('/api/onchain/mining/')
      if (!res.ok) throw new Error('Failed to fetch mining data')
      const rawData = await res.json()
      if (rawData.error) throw new Error(rawData.error)

      const hashrateArr = rawData.hashrate?.history || []
      const step = Math.max(1, Math.floor(hashrateArr.length / 52))
      const points: HashratePoint[] = hashrateArr
        .filter((_: unknown, i: number) => i % step === 0 || i === hashrateArr.length - 1)
        .map((item: { timestamp: number; avgHashrate: number }) => {
          const d = new Date(item.timestamp * 1000)
          return {
            date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            hashrate: item.avgHashrate,
            hashrateEH: +(item.avgHashrate / 1e18).toFixed(1),
          }
        })

      setData(points)
      if (rawData.hashrate?.current) {
        setCurrentHashrate(formatHashrate(rawData.hashrate.current))
      } else if (points.length > 0) {
        setCurrentHashrate(formatHashrate(points[points.length - 1].hashrate))
      }
      setLastUpdated(new Date())
      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hashrate data')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHashrate()
    const interval = setInterval(fetchHashrate, 300000)
    return () => clearInterval(interval)
  }, [fetchHashrate])

  if (isLoading) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
        <div className="h-6 w-48 bg-gray-700/50 rounded mb-4 animate-pulse" />
        <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl border border-red-500/20 p-6 font-mono">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button onClick={fetchHashrate} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Network Hashrate</h3>
          <p className="text-xs text-gray-400">3-month trend via /api/onchain/mining</p>
        </div>
        <div className="text-right">
          <div className="text-orange-400 font-bold text-lg">{currentHashrate}</div>
          <div className="text-xs text-gray-500">Current</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="hashrateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => (v / 1e18).toFixed(0)}
            label={{
              value: 'EH/s',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatHashrate(value), 'Hashrate']}
          />
          <Area
            type="monotone"
            dataKey="hashrate"
            stroke="#f97316"
            fill="url(#hashrateGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      {lastUpdated && (
        <div className="text-[10px] text-gray-500 text-right mt-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
