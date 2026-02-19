'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setMempoolData } from '@/store/mempoolSlice'
import type { MempoolState } from '@/types/store'

export const useMempoolData = () => {
  const dispatch = useAppDispatch()
  const mempoolData = useAppSelector((state: any) => state.mempool)

  useEffect(() => {
    const fetchMempoolData = async () => {
      try {
        // Fetch real mempool data from mempool.space API
        const [mempoolRes, feesRes, blocksRes] = await Promise.allSettled([
          fetch('/api/mempool/?endpoint=/mempool').then(r => r.ok ? r.json() : null),
          fetch('/api/mempool/?endpoint=/v1/fees/recommended').then(r => r.ok ? r.json() : null),
          fetch('/api/mempool/?endpoint=/v1/blocks').then(r => r.ok ? r.json() : null),
        ])

        const mempool = mempoolRes.status === 'fulfilled' ? mempoolRes.value : null
        const fees = feesRes.status === 'fulfilled' ? feesRes.value : null
        const blocks = blocksRes.status === 'fulfilled' ? blocksRes.value : null

        const latestBlock = blocks?.[0]

        const data: MempoolState = {
          pendingTransactions: mempool?.count || 0,
          averageFeeRate: fees?.halfHourFee || 0,
          mempoolSize: mempool?.vsize || 0,
          lastUpdated: new Date().toISOString(),
          transactions: [],
          feeRates: {
            low: fees?.hourFee || 0,
            medium: fees?.halfHourFee || 0,
            high: fees?.fastestFee || 0
          },
          blocks: [{
            height: latestBlock?.height || 0,
            hash: latestBlock?.id || '',
            timestamp: (latestBlock?.timestamp || 0) * 1000,
            size: latestBlock?.size || 0,
            weight: latestBlock?.weight || 0
          }]
        }

        dispatch(setMempoolData(data))
      } catch (error) {
        console.error('Error fetching mempool data:', error)
      }
    }

    // Initial fetch
    fetchMempoolData()

    // Set up interval for periodic updates
    const interval = setInterval(fetchMempoolData, 15000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [dispatch])

  return mempoolData
} 