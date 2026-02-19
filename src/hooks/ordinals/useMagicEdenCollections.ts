'use client'

import { useState, useEffect, useCallback } from 'react'
import { magicEdenService, MECollection } from '@/lib/api/magiceden'

interface UseMagicEdenCollectionsResult {
  collections: MECollection[]
  loading: boolean
  error: string | null
}

export function useMagicEdenCollections(limit: number = 20): UseMagicEdenCollectionsResult {
  const [collections, setCollections] = useState<MECollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await magicEdenService.getPopularCollections(limit)
      if (signal?.aborted) return
      setCollections(data)
      setError(null)
    } catch (err: any) {
      if (signal?.aborted) return
      const message = err?.message || 'Failed to fetch Magic Eden collections'
      setError(message)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [limit])

  useEffect(() => {
    const controller = new AbortController()

    // Fetch immediately
    fetchCollections(controller.signal)

    // Setup interval for periodic updates
    const interval = setInterval(() => {
      fetchCollections(controller.signal)
    }, 60_000)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [limit]) // ✅ FIXED: Only depend on limit, not fetchCollections

  return { collections, loading, error }
}
