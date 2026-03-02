'use client'

import { useState, useEffect } from 'react'

export function useOrdiscanData(endpoint: string) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // FALLBACK: Replace with real Ordiscan API call
    // Currently attempts to fetch from internal proxy, falls back to empty state
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/ordiscan/${endpoint}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        } else {
          setData(null)
        }
      } catch (err) {
        console.warn('[useOrdiscanData] API unavailable:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch Ordiscan data'))
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [endpoint])

  return { data, isLoading, error }
}
