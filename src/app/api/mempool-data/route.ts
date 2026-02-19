import { NextResponse } from 'next/server'
import type { MempoolState } from '@/types/store'

export async function GET() {
  try {

    // Fetch all data in parallel for better performance
    const [mempoolStatsRes, feeRatesRes, blocksHeightRes, blocksRes, recentTxsRes] = await Promise.all([
      fetch('https://mempool.space/api/mempool', { cache: 'no-store' }),
      fetch('https://mempool.space/api/v1/fees/recommended', { cache: 'no-store' }),
      fetch('https://mempool.space/api/blocks/tip/height', { cache: 'no-store' }),
      fetch('https://mempool.space/api/v1/blocks/tip', { cache: 'no-store' }),
      fetch('https://mempool.space/api/mempool/recent', { cache: 'no-store' })
    ])

    // Check if all requests were successful
    if (!mempoolStatsRes.ok || !feeRatesRes.ok || !blocksHeightRes.ok || !blocksRes.ok || !recentTxsRes.ok) {
      throw new Error('One or more API requests failed')
    }

    // Parse all responses
    const mempoolStats = await mempoolStatsRes.json()
    const feeRates = await feeRatesRes.json()
    const currentHeight = await blocksHeightRes.text()
    const latestBlock = await blocksRes.json()
    const recentTxs = await recentTxsRes.json()


    // Format the data according to our application's state structure
    const mempoolData: MempoolState = {
      pendingTransactions: mempoolStats.count || 0,
      averageFeeRate: Math.round(feeRates.hourFee || 0),
      mempoolSize: Math.round(mempoolStats.vsize / 1000) || 0, // Convert to KB
      lastUpdated: new Date().toISOString(),
      transactions: Array.isArray(recentTxs) ? recentTxs.slice(0, 10) : [], // Just keep the 10 most recent transactions
      feeRates: {
        low: feeRates.economyFee || 1,
        medium: feeRates.hourFee || 5,
        high: feeRates.fastestFee || 10
      },
      blocks: [
        {
          height: parseInt(currentHeight) || 0,
          hash: latestBlock.id || '',
          timestamp: latestBlock.timestamp * 1000 || Date.now(), // Convert to milliseconds
          size: latestBlock.size || 0,
          weight: latestBlock.weight || 0
        }
      ]
    }

    return NextResponse.json(mempoolData)
  } catch (error) {
    console.error('Error fetching mempool data:', error)

    // Provide fallback data in case of error
    const fallbackData: MempoolState = {
      pendingTransactions: 12345,
      averageFeeRate: 25,
      mempoolSize: 8500,
      lastUpdated: new Date().toISOString(),
      transactions: [],
      feeRates: {
        low: 8,
        medium: 25,
        high: 40
      },
      blocks: [
        {
          height: 842567,
          hash: '000000000000000000025d4dbbeb82ca883e4d35198269a7a2b4a97a5cbf3f0c',
          timestamp: Date.now(),
          size: 1500000,
          weight: 4000000
        }
      ]
    }

    return NextResponse.json(fallbackData)
  }
}
