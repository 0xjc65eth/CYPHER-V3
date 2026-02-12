'use client'

import React from 'react'
import type { SMCSignal } from '@/lib/smc/types'
import { getCurrentSession, getKillZoneColor } from '@/lib/smc/kill-zones'

interface Props {
  signals: SMCSignal[]
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

export function SignalPanel({ signals }: Props) {
  const session = getCurrentSession()

  return (
    <div className="bg-[#111118] border border-gray-800 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider">SMC Signals</div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: session.session ? getKillZoneColor(session.session) : '#374151' }}
          />
          <span className="text-[10px] font-bold" style={{ color: session.session ? getKillZoneColor(session.session) : '#6b7280' }}>
            {session.label}
          </span>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="text-xs text-gray-600 text-center py-4">No active signals</div>
      ) : (
        <div className="space-y-3">
          {signals.slice(0, 5).map((sig, i) => {
            const dirColor = sig.direction === 'long' ? 'bg-green-600' : 'bg-red-600'
            const confColor =
              sig.confidence === 'HIGH'
                ? 'text-green-400 border-green-600 bg-green-900/20'
                : sig.confidence === 'MEDIUM'
                ? 'text-yellow-400 border-yellow-600 bg-yellow-900/20'
                : 'text-gray-400 border-gray-600 bg-gray-900/20'

            return (
              <div key={i} className="border border-gray-800 rounded p-3 space-y-2">
                {/* Direction + Confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`${dirColor} text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase`}>
                      {sig.direction}
                    </span>
                    <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${confColor}`}>
                      {sig.confidence}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-orange-400">
                    {sig.confluence.total}/100
                  </span>
                </div>

                {/* Entry / SL / TP levels */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entry</span>
                    <span className="text-white font-bold">${formatPrice(sig.entry)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stop Loss</span>
                    <span className="text-red-400 font-bold">${formatPrice(sig.stopLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">TP 1</span>
                    <span className="text-green-400 font-bold">${formatPrice(sig.takeProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">TP 2</span>
                    <span className="text-green-400 font-bold">${formatPrice(sig.takeProfit2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">TP 3</span>
                    <span className="text-green-400 font-bold">${formatPrice(sig.takeProfit3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">R:R</span>
                    <span className="text-blue-400 font-bold">{sig.riskReward.toFixed(1)}</span>
                  </div>
                </div>

                {/* Confluence list */}
                <div className="border-t border-gray-800 pt-1.5">
                  <span className="text-[9px] text-gray-500 block mb-1">CONFLUENCES</span>
                  <div className="flex flex-wrap gap-1">
                    {sig.confluenceList.map((c, j) => (
                      <span key={j} className="text-[9px] text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
