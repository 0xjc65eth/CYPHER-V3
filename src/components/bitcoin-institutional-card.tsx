'use client'

import { useState, useEffect } from 'react'
import { DashboardCard } from '@/components/dashboard-card'
import { useMarketData } from '@/hooks/useMarketData'
import { RiBitCoinLine, RiArrowUpSLine, RiArrowDownSLine, RiTimeLine } from 'react-icons/ri'

export function BitcoinInstitutionalCard() {
  const [mounted, setMounted] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const marketData = useMarketData()

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
    setLastUpdated(new Date())
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 60000) // Update time every minute
    return () => clearInterval(interval)
  }, [])

  // Generate mock institutional data
  const institutionalData = {
    accumulationRange: {
      low: Math.floor((marketData?.btcPrice || 64000) * 0.97),
      high: Math.ceil((marketData?.btcPrice || 66000) * 1.03)
    },
    timeframe: '48 hours',
    impact: 'High',
    walletCount: 0,
    btcAmount: 0
  }

  return (
    <div className="dashboard-card bg-[#0F1525] border border-[#3b82f6]/20 rounded-lg overflow-hidden">
      <div className="dashboard-card-header bg-[#111936] border-b border-[#3b82f6]/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center mr-2">
              <RiBitCoinLine className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <h3 className="text-white text-sm font-medium">Bitcoin Institutional Accumulation</h3>
          </div>
          <div className="flex items-center">
            <div className="badge badge-blue">
              <span>BTC</span>
            </div>
            <div className="badge badge-green ml-2">
              <span>High Impact</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-white/90">
          On-chain analysis shows large wallets accumulating BTC in the ${mounted ? 
            `${institutionalData.accumulationRange.low.toLocaleString()}-$${institutionalData.accumulationRange.high.toLocaleString()}` : 
            "$64,000-$66,000"} range over the past {institutionalData.timeframe}, suggesting strong institutional interest.
        </p>
        
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-[#1a2234] rounded p-2">
            <div className="text-xs text-[#94a3b8]">Wallets Accumulating</div>
            <div className="text-white font-medium mt-1">{mounted ? institutionalData.walletCount.toLocaleString() : "120+"}</div>
          </div>
          <div className="bg-[#1a2234] rounded p-2">
            <div className="text-xs text-[#94a3b8]">BTC Accumulated</div>
            <div className="text-white font-medium mt-1">{mounted ? institutionalData.btcAmount.toLocaleString() : "7,500+"} BTC</div>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-xs text-[#64748b]">
          <div className="flex items-center">
            <RiTimeLine className="w-3 h-3 mr-1" />
            <span>Updated: {mounted && lastUpdated ? lastUpdated.toLocaleString() : '--:--:--'}</span>
          </div>
          <div>Source: On-chain Analysis</div>
        </div>
      </div>
    </div>
  )
}
