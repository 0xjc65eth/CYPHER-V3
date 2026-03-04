'use client'

import { useState, useEffect, useRef } from 'react'

type Status = 'live' | 'degraded' | 'offline'

export function ConnectionDot() {
  const [status, setStatus] = useState<Status>('live')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const res = await fetch('/api/health/', { signal: controller.signal })
        clearTimeout(timeout)

        if (!res.ok) {
          setStatus(res.status >= 500 ? 'offline' : 'degraded')
          return
        }
        const json = await res.json()
        const s = json.status
        if (s === 'ok') setStatus('live')
        else if (s === 'degraded') setStatus('degraded')
        else setStatus('offline')
      } catch {
        setStatus('offline')
      }
    }

    checkHealth()
    intervalRef.current = setInterval(checkHealth, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const colors: Record<Status, string> = {
    live: 'bg-[#00FF41]',
    degraded: 'bg-[#FFB800]',
    offline: 'bg-[#FF0040]',
  }

  const labels: Record<Status, string> = {
    live: 'All systems operational',
    degraded: 'Some services degraded',
    offline: 'Connection issues',
  }

  return (
    <span title={labels[status]} className="flex items-center gap-1">
      <span
        className={`w-1.5 h-1.5 rounded-full ${colors[status]} ${status === 'live' ? 'animate-pulse' : ''}`}
      />
    </span>
  )
}
