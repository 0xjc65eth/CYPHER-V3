'use client'

import { useEffect, useState } from 'react'

interface MiningDistribution {
  name: string
  share: number
}

interface HashrateData {
  currentHashrate: number
  hashrateChange: number
  difficulty: number
  estimatedRetargetDate: string
  remainingBlocks: number
  progressPercent: number
  previousRetarget: number
  timeAvg: number
  currentHeight: number
  miningDistribution: MiningDistribution[]
  lastUpdated: string
}

export const useHashrateData = () => {
  const [data, setData] = useState<HashrateData>({
    currentHashrate: 0,
    hashrateChange: 0,
    difficulty: 0,
    estimatedRetargetDate: '',
    remainingBlocks: 0,
    progressPercent: 0,
    previousRetarget: 0,
    timeAvg: 0,
    currentHeight: 0,
    miningDistribution: [],
    lastUpdated: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHashrateData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Buscar dados reais da API
        const response = await fetch('/api/hashrate-data/')

        if (!response.ok) {
          throw new Error('Failed to fetch hashrate data')
        }

        const data = await response.json()
        setData(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching hashrate data:', error)
        setError('Failed to fetch hashrate data')
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchHashrateData()

    // Set up interval for periodic updates
    const interval = setInterval(fetchHashrateData, 60000) // Atualizar a cada minuto

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  return { ...data, isLoading, error }
}
