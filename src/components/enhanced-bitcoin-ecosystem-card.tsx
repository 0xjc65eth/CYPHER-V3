'use client'

import { DashboardCard } from '@/components/dashboard-card'
import { useMarketData } from '@/hooks/useMarketData'
import { useMiningData } from '@/hooks/useMiningData'
import { useMempoolData } from '@/hooks/useMempoolData'
import { RiArrowUpSLine, RiArrowDownSLine, RiBitCoinLine, RiDatabase2Line, RiExchangeLine, RiRefreshLine } from 'react-icons/ri'
import { useState, useEffect } from 'react'
import { DonutChart } from '@tremor/react'

export function EnhancedBitcoinEcosystemCard() {
  const [mounted, setMounted] = useState(false)
  const marketData = useMarketData()
  const miningData = useMiningData()
  const mempoolData = useMempoolData()
  
  // Evitar hidratação usando useEffect para renderizar apenas no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = !mounted || !marketData || !miningData || !mempoolData

  // Dados para o gráfico de distribuição de mineração
  const miningDistribution = miningData?.miningDistribution || [
    { name: 'Foundry USA', share: 35.2 },
    { name: 'AntPool', share: 18.7 },
    { name: 'F2Pool', share: 14.3 },
    { name: 'Binance Pool', share: 10.5 },
    { name: 'ViaBTC', share: 8.2 }
  ]

  return (
    <DashboardCard 
      title="Bitcoin Ecosystem" 
      subtitle="Comprehensive Bitcoin network metrics"
      colorScheme="blue"
      className="shadow-xl"
    >
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mr-3">
              <RiBitCoinLine className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <>
                  <div className="flex items-center">
                    <div className="h-8 w-32 bg-slate-700/50 animate-pulse rounded"></div>
                    <RiRefreshLine className="w-5 h-5 text-blue-400 ml-2 animate-spin" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-white">${marketData?.btcPrice?.toLocaleString() || '0'}</span>
                    <span className={`flex items-center ml-2 text-sm ${
                      (marketData?.btcChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(marketData?.btcChange24h || 0) >= 0 ? (
                        <RiArrowUpSLine className="w-4 h-4" />
                      ) : (
                        <RiArrowDownSLine className="w-4 h-4" />
                      )}
                      {Math.abs(marketData?.btcChange24h || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-blue-300">
                    <span>Market Cap: ${(Number((marketData?.marketCap as any)?.total ?? 0) / 1000000000000).toFixed(2)}T</span>
                    <span className="mx-2">•</span>
                    <span>Vol: ${(Number((marketData?.volume24h as any)?.total ?? 0) / 1000000000).toFixed(1)}B</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-xs font-bold text-blue-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          Live Data
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <div className="flex items-center mb-1">
            <RiDatabase2Line className="w-4 h-4 text-blue-400 mr-2" />
            <h3 className="text-sm font-medium text-white">Network</h3>
          </div>
          {isLoading ? (
            <div className="h-16 bg-slate-700/50 animate-pulse rounded"></div>
          ) : (
            <>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-blue-300">Hash Rate</span>
                <span className="text-sm font-medium text-white">{miningData?.hashRate?.toLocaleString() || '0'} EH/s</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-blue-300">Difficulty</span>
                <span className="text-sm font-medium text-white">{(Number(miningData?.difficulty ?? 0) / 1000000000000).toFixed(2)}T</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-blue-300">Block Time</span>
                <span className="text-sm font-medium text-white">{(Number((miningData as any)?.timeAvg ?? 0) / 60).toFixed(1)} min</span>
              </div>
            </>
          )}
        </div>
        
        <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
          <div className="flex items-center mb-1">
            <RiExchangeLine className="w-4 h-4 text-indigo-400 mr-2" />
            <h3 className="text-sm font-medium text-white">Mempool</h3>
          </div>
          {isLoading ? (
            <div className="h-16 bg-slate-700/50 animate-pulse rounded"></div>
          ) : (
            <>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-indigo-300">Pending Tx</span>
                <span className="text-sm font-medium text-white">{mempoolData?.pendingTransactions?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-indigo-300">Size</span>
                <span className="text-sm font-medium text-white">{mempoolData?.mempoolSize?.toLocaleString() || '0'} vB</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-indigo-300">Fee Rate</span>
                <span className="text-sm font-medium text-white">{mempoolData?.averageFeeRate || '0'} sat/vB</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mining Distribution */}
      <div className="mt-5">
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-medium text-white">Mining Distribution</h3>
        </div>
        
        {isLoading ? (
          <div className="h-48 bg-slate-700/50 animate-pulse rounded"></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DonutChart
                data={miningDistribution}
                category="share"
                index="name"
                colors={["blue", "indigo", "violet", "purple", "fuchsia"]}
                showAnimation={true}
                showTooltip={true}
                valueFormatter={(value) => `${value.toFixed(1)}%`}
                className="h-40"
              />
            </div>
            <div className="space-y-1">
              {miningDistribution.slice(0, 5).map((pool: { name: string; share: number }, index: number) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full bg-${
                      index === 0 ? 'blue' : 
                      index === 1 ? 'indigo' : 
                      index === 2 ? 'violet' : 
                      index === 3 ? 'purple' : 
                      'fuchsia'
                    }-500 mr-2`}></div>
                    <span className="text-white">{pool.name}</span>
                  </div>
                  <span className="text-blue-300">{pool.share}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ecosystem Insights */}
      <div className="mt-5 p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
        <div className="flex items-center mb-2">
          <RiBitCoinLine className="w-4 h-4 text-blue-400 mr-2" />
          <h3 className="text-sm font-medium text-white">Ecosystem Insights</h3>
        </div>
        <p className="text-sm text-blue-200">
          {isLoading ? (
            <div className="h-16 bg-slate-700/50 animate-pulse rounded"></div>
          ) : (
            <>
              Bitcoin network shows {(miningData?.hashrateChange || 0) >= 0 ? 'increasing' : 'decreasing'} hash rate 
              with {miningData?.hashrateChange?.toFixed(2) || '0'}% change. 
              Mempool has {mempoolData?.pendingTransactions?.toLocaleString() || '0'} pending transactions.
              Current market sentiment is {(marketData?.btcChange24h || 0) >= 2 ? 'strongly bullish' : 
                (marketData?.btcChange24h || 0) >= 0 ? 'bullish' : 
                (marketData?.btcChange24h || 0) >= -2 ? 'bearish' : 'strongly bearish'}.
            </>
          )}
        </p>
      </div>
    </DashboardCard>
  )
}
