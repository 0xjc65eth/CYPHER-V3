'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DifficultyPoint {
  date: string
  difficulty: number
  difficultyFormatted: string
  change: number
}

function formatDifficulty(d: number): string {
  if (d >= 1e12) return (d / 1e12).toFixed(2) + 'T'
  if (d >= 1e9) return (d / 1e9).toFixed(2) + 'G'
  if (d >= 1e6) return (d / 1e6).toFixed(2) + 'M'
  return d.toFixed(0)
}

export function DifficultyChart() {
  const [data, setData] = useState<DifficultyPoint[]>([])
  const [latestDifficulty, setLatestDifficulty] = useState<string>('')
  const [latestChange, setLatestChange] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchDifficulty = useCallback(async () => {
    try {
      const res = await fetch('/api/onchain/mining/')
      if (!res.ok) throw new Error('Failed to fetch mining data')
      const rawData = await res.json()
      if (rawData.error) throw new Error(rawData.error)

      const adjustments = rawData.difficulty?.adjustments || []
      const points: DifficultyPoint[] = [...adjustments]
        .reverse()
        .map((item: { time: number; difficulty: number; difficultyChange: number }) => {
          const d = new Date(item.time * 1000)
          return {
            date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            difficulty: item.difficulty,
            difficultyFormatted: formatDifficulty(item.difficulty),
            change: +(item.difficultyChange * 100).toFixed(2),
          }
        })

      setData(points)
      if (rawData.difficulty?.current) {
        setLatestDifficulty(formatDifficulty(rawData.difficulty.current))
      }
      if (points.length > 0) {
        if (!rawData.difficulty?.current) {
          setLatestDifficulty(points[points.length - 1].difficultyFormatted)
        }
        setLatestChange(points[points.length - 1].change)
      }
      setLastUpdated(new Date())
      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load difficulty data')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDifficulty()
    const interval = setInterval(fetchDifficulty, 300000)
    return () => clearInterval(interval)
  }, [fetchDifficulty])

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
        <button onClick={fetchDifficulty} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] p-6 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Mining Difficulty</h3>
          <p className="text-xs text-gray-400">Last 25 adjustments</p>
        </div>
        <div className="text-right">
          <div className="text-orange-400 font-bold text-lg">{latestDifficulty}</div>
          <div
            className={`text-xs font-medium ${
              latestChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {latestChange >= 0 ? '+' : ''}
            {latestChange}% last adjustment
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => formatDifficulty(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatDifficulty(value), 'Difficulty']}
          />
          <Line
            type="monotone"
            dataKey="difficulty"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 3 }}
            activeDot={{ r: 5, fill: '#f97316' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {lastUpdated && (
        <div className="text-[10px] text-gray-500 text-right mt-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
