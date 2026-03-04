"use client"

import { useState, useEffect } from 'react'

interface InvestorProfileData {
  profile: 'Unknown' | 'Safe' | 'Moderate' | 'Degen' | 'Degen LFG'
  riskTolerance: number // 0-100
  timeHorizon: number // 0-100
  diversity: number // 0-100
  recommendations: string[]
}

interface UseInvestorProfileResult {
  data: InvestorProfileData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useInvestorProfile(address: string): UseInvestorProfileResult {
  const [data, setData] = useState<InvestorProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvestorProfile = async () => {
    if (!address) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Default profile - requires wallet connection for personalized data
      const defaultData: InvestorProfileData = {
        profile: 'Unknown',
        riskTolerance: 0,
        timeHorizon: 0,
        diversity: 0,
        recommendations: [
          'Connect your wallet to get personalized recommendations'
        ]
      }

      setData(defaultData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch investor profile'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvestorProfile()
  }, [address])

  return {
    data,
    isLoading,
    error,
    refetch: fetchInvestorProfile
  }
}
