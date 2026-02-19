'use client'

import { Card, Title, Text } from '@tremor/react'

export function MarketInsightsFallback() {
  return (
    <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3 border border-purple-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <Title className="text-white text-xl">
              Bitcoin Ecosystem Insights
              <span className="ml-2 text-green-400 text-sm">
                BTC: $64,500.00
              </span>
            </Title>
            <Text className="text-xs text-gray-400">
              Fallback data - Unable to load real-time insights
            </Text>
          </div>
        </div>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-gray-400">{new Date().toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button className="px-2 py-1 rounded text-xs font-medium bg-purple-500/30 text-purple-300 border border-purple-500/50">
          All
        </button>
        <button className="px-2 py-1 rounded text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800">
          Bitcoin
        </button>
        <button className="px-2 py-1 rounded text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800">
          Ordinals
        </button>
        <button className="px-2 py-1 rounded text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800">
          Runes
        </button>
      </div>

      <div className="space-y-3">
        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-700/30 rounded-lg p-4 border transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-start">
              <div className="mt-1 mr-2 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div>
                <Text className="font-bold text-white">Bitcoin Institutional Accumulation</Text>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    BTC
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    High Impact
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Text className="text-sm text-gray-300 mb-2">
            On-chain analysis shows large wallets accumulating BTC in the $64K-$66K range over the past 48 hours, suggesting strong institutional interest.
          </Text>

          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Source: On-chain Analysis</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30 rounded-lg p-4 border transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-start">
              <div className="mt-1 mr-2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <Text className="font-bold text-white">Ordinals Inscription Rate Surging</Text>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Ordinals
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Medium Impact
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Text className="text-sm text-gray-300 mb-2">
            Daily Ordinals inscription rate has increased by 35% in the past week, with premium collections seeing higher floor prices and trading volume.
          </Text>

          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Source: Ordiscan API</span>
            <span>{new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
        <Text className="text-xs text-gray-400">
          Data sources: Ordiscan API, CoinMarketCap API
        </Text>
      </div>
    </Card>
  )
}
