'use client'

import { DashboardCard } from '@/components/dashboard-card'
import { RiArrowUpCircleLine, RiArrowDownCircleLine, RiInformationLine } from 'react-icons/ri'
import { useMemo, useState, useEffect } from 'react'

export function InflowOutflowCard() {
  const [mounted, setMounted] = useState(false)

  // Evitar hidratação usando useEffect para renderizar apenas no cliente
  useEffect(() => {
    setMounted(true)
  }, [])
  // Generate mock inflow/outflow data
  const inflowOutflowData = useMemo(() => {
    const dates = ['2024-04-01', '2024-04-02', '2024-04-03', '2024-04-04']

    return dates.map(date => {
      const inflow = 0
      const outflow = 0
      return { date, inflow, outflow }
    })
  }, [])

  // Calculate net flow
  const netFlow = useMemo(() => {
    return inflowOutflowData.reduce((acc, curr) => acc + (curr.inflow - curr.outflow), 0)
  }, [inflowOutflowData])

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(
      ...inflowOutflowData.map(d => Math.max(d.inflow, d.outflow))
    )
  }, [inflowOutflowData])

  return (
    <DashboardCard title="Exchange Inflow / Outflow" className="bg-gradient-to-br from-[#1F2937] to-[#2D3748] border-none shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <p className="text-sm text-gray-300">Net Flow</p>
            <div className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-xs font-bold text-blue-300 border border-blue-500/30">
              24h Analysis
            </div>
          </div>
          <div className="flex items-center mt-1">
            {netFlow >= 0 ? (
              <>
                <RiArrowUpCircleLine className="w-5 h-5 text-emerald-400 mr-1" />
                <p className="text-xl font-bold text-emerald-400">
                  +{mounted
                    ? netFlow.toLocaleString()
                    : "300" /* Valor fixo para SSR */
                  } BTC
                </p>
              </>
            ) : (
              <>
                <RiArrowDownCircleLine className="w-5 h-5 text-rose-400 mr-1" />
                <p className="text-xl font-bold text-rose-400">
                  {mounted
                    ? netFlow.toLocaleString()
                    : "-100" /* Valor fixo para SSR */
                  } BTC
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          <RiInformationLine className="w-4 h-4 mr-1" />
          <span>Updated hourly</span>
        </div>
      </div>

      {/* Custom bar chart implementation */}
      <div className="mt-6 h-48">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Inflow</span>
          <span>Outflow</span>
        </div>

        <div className="flex h-full">
          {inflowOutflowData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col space-y-1">
              <div className="flex-1 flex items-end justify-center">
                <div
                  className="w-8 bg-emerald-500 rounded-t"
                  style={{ height: mounted ? `${(data.inflow / maxValue) * 100}%` : `${60 + index * 5}%` }}
                ></div>
              </div>
              <div className="flex-1 flex items-start justify-center">
                <div
                  className="w-8 bg-rose-500 rounded-b"
                  style={{ height: mounted ? `${(data.outflow / maxValue) * 100}%` : `${50 + index * 5}%` }}
                ></div>
              </div>
              <div className="text-center text-xs text-gray-400 mt-1">
                {new Date(data.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
          <div className="flex items-center">
            <RiArrowUpCircleLine className="w-4 h-4 text-emerald-400 mr-2" />
            <p className="text-xs text-emerald-300">Total Inflow</p>
          </div>
          <p className="text-lg font-medium text-white mt-1">
            {mounted
              ? inflowOutflowData.reduce((acc, curr) => acc + curr.inflow, 0).toLocaleString()
              : "3,500" /* Valor fixo para SSR */
            } BTC
          </p>
        </div>
        <div className="bg-rose-500/10 p-3 rounded border border-rose-500/20">
          <div className="flex items-center">
            <RiArrowDownCircleLine className="w-4 h-4 text-rose-400 mr-2" />
            <p className="text-xs text-rose-300">Total Outflow</p>
          </div>
          <p className="text-lg font-medium text-white mt-1">
            {mounted
              ? inflowOutflowData.reduce((acc, curr) => acc + curr.outflow, 0).toLocaleString()
              : "3,200" /* Valor fixo para SSR */
            } BTC
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/80">
        Track exchange inflows and outflows to anticipate market moves. Net positive inflow often indicates accumulation and potential price increases.
      </p>
    </DashboardCard>
  )
}
