'use client'

import { useState, useEffect, useMemo } from 'react'
import { BarChart } from '@tremor/react'
import { RiArrowUpCircleLine, RiArrowDownCircleLine } from 'react-icons/ri'

export function InflowOutflowChartCard() {
  const [mounted, setMounted] = useState(false)

  // Avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // On-chain flow data is not yet available from our APIs
  const inflowOutflowData: { date: string; inflow: number; outflow: number }[] = []
  const dataUnavailable = true

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  }

  // Calculate net inflow/outflow
  const netFlow = useMemo(() => {
    if (!inflowOutflowData || inflowOutflowData.length === 0) return 0;

    const lastDay = inflowOutflowData[inflowOutflowData.length - 1];
    return lastDay.inflow - lastDay.outflow;
  }, [inflowOutflowData]);

  // Calculate 7-day trend
  const weeklyTrend = useMemo(() => {
    if (!inflowOutflowData || inflowOutflowData.length < 2) return 0;

    const firstDay = inflowOutflowData[0];
    const lastDay = inflowOutflowData[inflowOutflowData.length - 1];

    const firstNetFlow = firstDay.inflow - firstDay.outflow;
    const lastNetFlow = lastDay.inflow - lastDay.outflow;

    return ((lastNetFlow - firstNetFlow) / Math.abs(firstNetFlow)) * 100;
  }, [inflowOutflowData]);

  return (
    <div className="bg-gradient-to-br from-[#1A1A3A] to-[#2A2A5A] border border-blue-500/20 rounded-lg overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/20">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <h3 className="text-white font-medium">Bitcoin Ecosystem Insights - Inflow/Outflow</h3>
        </div>
        <div className="px-2 py-1 rounded-lg bg-gray-500/20 text-xs font-bold text-gray-400 flex items-center">
          Coming Soon
        </div>
      </div>

      <div className="p-4">
        {dataUnavailable ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">On-chain Flow Data</p>
            <p className="text-gray-400 text-sm text-center max-w-xs">
              Exchange inflow/outflow tracking requires an on-chain analytics provider (e.g., Glassnode, CryptoQuant). This feature is coming soon.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <RiArrowUpCircleLine className="w-4 h-4 text-emerald-400 mr-1" />
                  <span className="text-xs text-emerald-300 font-medium">Exchange Inflow</span>
                </div>
                <div className="text-xl font-bold text-white">{inflowOutflowData[inflowOutflowData.length - 1]?.inflow.toLocaleString() || '0'} BTC</div>
                <div className="text-xs text-emerald-300 mt-1">Last 24 hours</div>
              </div>

              <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <RiArrowDownCircleLine className="w-4 h-4 text-rose-400 mr-1" />
                  <span className="text-xs text-rose-300 font-medium">Exchange Outflow</span>
                </div>
                <div className="text-xl font-bold text-white">{inflowOutflowData[inflowOutflowData.length - 1]?.outflow.toLocaleString() || '0'} BTC</div>
                <div className="text-xs text-rose-300 mt-1">Last 24 hours</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-xs text-blue-300 font-medium">Net Flow</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-bold ${netFlow >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {netFlow >= 0 ? 'Net Inflow' : 'Net Outflow'}
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-xl font-bold text-white">{Math.abs(netFlow).toLocaleString()} BTC</div>
                <div className={`ml-2 text-sm ${netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {weeklyTrend >= 0 ? '+' : ''}{weeklyTrend.toFixed(1)}% 7d
                </div>
              </div>
            </div>

            {mounted ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-indigo-500/10 rounded-lg"></div>
                <BarChart
                  className="h-64"
                  data={inflowOutflowData}
                  index="date"
                  categories={["inflow", "outflow"]}
                  colors={["emerald", "rose"]}
                  showAnimation
                  showLegend
                  valueFormatter={(value) => `${value.toLocaleString()} BTC`}
                  showGridLines={false}
                  yAxisWidth={48}
                />
              </div>
            ) : (
              <div className="h-64 bg-slate-800/50 animate-pulse rounded-lg"></div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
