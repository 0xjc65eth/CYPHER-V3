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
  Legend,
} from 'recharts'

interface FeeData {
  time: string
  fastest: number
  halfHour: number
  hour: number
  economy: number
}

export function FeeRateChart() {
  const [feeHistory, setFeeHistory] = useState<FeeData[]>([])
  const [currentFees, setCurrentFees] = useState<{
    fastestFee: number
    halfHourFee: number
    hourFee: number
    economyFee: number
    minimumFee: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchFees = useCallback(async () => {
    try {
      const res = await fetch('/api/onchain/fees')
      if (!res.ok) throw new Error('Failed to fetch fee data')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCurrentFees(data)

      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setFeeHistory((prev) => {
        const next = [
          ...prev,
          {
            time: timeStr,
            fastest: data.fastestFee,
            halfHour: data.halfHourFee,
            hour: data.hourFee,
            economy: data.economyFee,
          },
        ]
        return next.slice(-30)
      })

      setLastUpdated(now)
      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee data')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFees()
    const interval = setInterval(fetchFees, 30000)
    return () => clearInterval(interval)
  }, [fetchFees])

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
        <button onClick={fetchFees} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Fee Rate Tracker</h3>
          <p className="text-xs text-gray-400">sat/vB - auto-refresh 30s</p>
        </div>
        <div className="flex items-center gap-4">
          {currentFees && (
            <div className="flex gap-3 text-xs">
              <div className="text-center">
                <div className="text-orange-400 font-bold">{currentFees.fastestFee}</div>
                <div className="text-gray-500">Fast</div>
              </div>
              <div className="text-center">
                <div className="text-amber-400 font-bold">{currentFees.halfHourFee}</div>
                <div className="text-gray-500">30min</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-bold">{currentFees.hourFee}</div>
                <div className="text-gray-500">1hr</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">{currentFees.economyFee}</div>
                <div className="text-gray-500">Eco</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={feeHistory}>
          <defs>
            <linearGradient id="feeGradFast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="feeGradHalf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="feeGradHour" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="feeGradEco" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Area type="monotone" dataKey="fastest" stroke="#f97316" fill="url(#feeGradFast)" strokeWidth={2} name="Fastest" />
          <Area type="monotone" dataKey="halfHour" stroke="#f59e0b" fill="url(#feeGradHalf)" strokeWidth={2} name="30 min" />
          <Area type="monotone" dataKey="hour" stroke="#eab308" fill="url(#feeGradHour)" strokeWidth={2} name="1 hour" />
          <Area type="monotone" dataKey="economy" stroke="#22c55e" fill="url(#feeGradEco)" strokeWidth={2} name="Economy" />
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
