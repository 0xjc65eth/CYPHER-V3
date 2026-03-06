'use client'

import { useState, useEffect, useCallback } from 'react'

interface OrdinalsActivity {
  kind: string
  tokenId?: string
  collectionSymbol?: string
  price?: number
  txId?: string
  createdAt?: string
}

interface UseOrdinalsActivityResult {
  activities: OrdinalsActivity[]
  loading: boolean
  error: string | null
}

export function useOrdinalsActivity(
  collectionSymbol?: string,
  limit: number = 50
): UseOrdinalsActivityResult {
  const [activities, setActivities] = useState<OrdinalsActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ limit: String(limit) })
      if (collectionSymbol) params.set('collectionSymbol', collectionSymbol)
      const res = await fetch(`/api/marketplace/blocks/activities/?${params}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (signal?.aborted) return
      setActivities(data.activities || [])
      setError(null)
    } catch (err: any) {
      if (signal?.aborted) return
      setError(err?.message || 'Failed to fetch activity')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [collectionSymbol, limit])

  useEffect(() => {
    const controller = new AbortController()
    fetchActivities(controller.signal)
    const interval = setInterval(() => fetchActivities(controller.signal), 30_000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [collectionSymbol, limit])

  return { activities, loading, error }
}
