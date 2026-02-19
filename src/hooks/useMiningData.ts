'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setMiningData } from '@/store/miningSlice'
import type { MiningState } from '@/types/store'

export const useMiningData = () => {
  const dispatch = useAppDispatch()
  const miningData = useAppSelector((state: any) => state.mining)

  useEffect(() => {
    const fetchMiningData = async () => {
      try {
        // Fetch real mining data from mempool.space API
        const [difficultyRes, hashrateRes] = await Promise.allSettled([
          fetch('https://mempool.space/api/v1/mining/difficulty-adjustments?limit=1'),
          fetch('https://mempool.space/api/v1/mining/hashrate/1m'),
        ])

        let hashRate = 0
        let difficulty = 0
        let blockTime = 0

        // Parse difficulty adjustment data
        if (difficultyRes.status === 'fulfilled' && difficultyRes.value.ok) {
          const diffData = await difficultyRes.value.json()
          if (Array.isArray(diffData) && diffData.length > 0) {
            difficulty = diffData[0].difficulty || 0
            blockTime = diffData[0].timeAvg || 600 // avg block time in seconds
          }
        }

        // Parse hashrate data
        if (hashrateRes.status === 'fulfilled' && hashrateRes.value.ok) {
          const hashData = await hashrateRes.value.json()
          if (hashData?.currentHashrate) {
            hashRate = hashData.currentHashrate / 1e18 // Convert to EH/s
          } else if (hashData?.hashrates && hashData.hashrates.length > 0) {
            hashRate = hashData.hashrates[hashData.hashrates.length - 1].avgHashrate / 1e18
          }
        }

        const realData: MiningState = {
          hashRate,
          difficulty,
          blockTime,
          lastUpdated: new Date().toISOString()
        }

        dispatch(setMiningData(realData))
      } catch (error) {
        console.error('Error fetching mining data:', error)
      }
    }

    // Initial fetch
    fetchMiningData()

    // Set up interval for periodic updates
    const interval = setInterval(fetchMiningData, 60000) // Update every minute

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [dispatch])

  return miningData
}
