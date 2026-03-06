'use client'

import { useState, useEffect, useCallback } from 'react'

interface OrdinalsCollection {
  symbol: string
  name: string
  floorPrice?: number
  volume24h?: number
  supply?: number
  owners?: number
  image?: string
}

interface UseOrdinalsCollectionsResult {
  collections: OrdinalsCollection[]
  loading: boolean
  error: string | null
}

export function useOrdinalsCollections(limit: number = 20): UseOrdinalsCollectionsResult {
  const [collections, setCollections] = useState<OrdinalsCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollections = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/ordinals/collections?limit=${limit}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (signal?.aborted) return
      setCollections(data.data || data.collections || [])
      setError(null)
    } catch (err: any) {
      if (signal?.aborted) return
      setError(err?.message || 'Failed to fetch collections')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    const controller = new AbortController()
    fetchCollections(controller.signal)
    const interval = setInterval(() => fetchCollections(controller.signal), 60_000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [limit])

  return { collections, loading, error }
}
