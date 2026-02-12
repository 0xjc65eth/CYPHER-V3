'use client'

import { useState, useEffect, useCallback } from 'react'
import { magicEdenService, MEActivity } from '@/lib/api/magiceden'

interface UseMagicEdenActivityResult {
  activities: MEActivity[]
  loading: boolean
  error: string | null
}

export function useMagicEdenActivity(
  collectionSymbol?: string,
  limit: number = 50
): UseMagicEdenActivityResult {
  const [activities, setActivities] = useState<MEActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await magicEdenService.getRecentActivities(collectionSymbol, limit)
      if (signal?.aborted) return
      setActivities(data)
      setError(null)
    } catch (err: any) {
      if (signal?.aborted) return
      const message = err?.message || 'Failed to fetch Magic Eden activity'
      setError(message)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [collectionSymbol, limit])

  useEffect(() => {
    const controller = new AbortController()
    fetchActivities(controller.signal)

    const interval = setInterval(() => {
      fetchActivities(controller.signal)
    }, 30_000)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [fetchActivities])

  return { activities, loading, error }
}
