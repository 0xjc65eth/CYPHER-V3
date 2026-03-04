'use client'

import { useState, useEffect } from 'react'

interface DataFreshnessProps {
  timestamp: number | Date | null | undefined
  className?: string
}

/**
 * Renders a time-ago label with color-coded freshness:
 * - Gray (<2min): data is fresh
 * - Yellow (2-10min): data is aging
 * - Red (>10min): data is stale
 */
export function DataFreshness({ timestamp, className = '' }: DataFreshnessProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(interval)
  }, [])

  const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp
  if (!ts || ts <= 0) {
    return <span className={`text-[10px] font-mono text-[#666] ${className}`}>--</span>
  }

  const ageMs = now - ts
  const ageSec = Math.floor(ageMs / 1000)

  let label: string
  if (ageSec < 60) {
    label = `${ageSec}s ago`
  } else if (ageSec < 3600) {
    label = `${Math.floor(ageSec / 60)}m ago`
  } else {
    label = `${Math.floor(ageSec / 3600)}h ago`
  }

  let color: string
  if (ageSec < 120) {
    color = 'text-[#666]' // fresh — gray
  } else if (ageSec < 600) {
    color = 'text-[#FFB800]' // aging — yellow
  } else {
    color = 'text-[#FF0040]' // stale — red
  }

  return <span className={`text-[10px] font-mono ${color} ${className}`}>{label}</span>
}
