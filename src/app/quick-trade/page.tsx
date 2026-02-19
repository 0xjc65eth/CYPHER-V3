'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Dynamic imports with SSR disabled to prevent initializeHealthChecks errors
const QuickTradeInterface = dynamic(
  () => import('@/components/quick-trade/QuickTradeInterface'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded mb-4"></div>
        <div className="h-32 bg-gray-700 rounded"></div>
      </div>
    )
  }
);

const QuickTradePanel = dynamic(
  () => import('@/components/trading/QuickTradePanel').then(mod => ({ default: mod.QuickTradePanel })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded mb-4"></div>
        <div className="h-32 bg-gray-700 rounded"></div>
      </div>
    )
  }
);

const RevenueDashboard = dynamic(
  () => import('@/components/admin/RevenueDashboard').then(mod => ({ default: mod.RevenueDashboard })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded mb-4"></div>
        <div className="h-32 bg-gray-700 rounded"></div>
      </div>
    )
  }
);

export default function QuickTradePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            ⚡ Cypher DEX Aggregator
          </h1>
          <p className="text-xl text-gray-400">
            Advanced Multi-DEX Trading with Intelligent Route Optimization
          </p>
          <div className="mt-4 flex justify-center gap-4 flex-wrap">
            <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-sm">
              🌐 Multi-Network Support
            </span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              💰 0.20% Fee
            </span>
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
              🔥 10+ DEXs Integrated
            </span>
            <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm">
              ⚡ Real-Time Optimization
            </span>
          </div>
        </div>

        {/* Tabs System */}
        <Tabs defaultValue="advanced" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border border-gray-700">
            <TabsTrigger value="advanced" className="text-white data-[state=active]:bg-cyan-600">
              ⚡ Advanced Trade
            </TabsTrigger>
            <TabsTrigger value="simple" className="text-white data-[state=active]:bg-blue-600">
              🚀 Simple Trade
            </TabsTrigger>
            <TabsTrigger value="revenue" className="text-white data-[state=active]:bg-green-600">
              💰 Revenue Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex justify-center">
                <QuickTradeInterface
                  onSwapComplete={(result) => {
                    // Handle swap completion
                  }}
                />
              </div>
              
              <div className="space-y-6">
                {/* DEX Support */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">🔗 Supported DEXs</h3>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="text-gray-300">Uniswap V2/V3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-300">SushiSwap</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-300">Jupiter (Solana)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      <span className="text-gray-300">Orca (Solana)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-300">RunesDEX (Bitcoin)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-300">LHMA Swap (Arbitrum)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-300">1inch Aggregator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300">ParaSwap</span>
                    </div>
                  </div>
                </div>

                {/* Advanced Features */}
                <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">⚡ Advanced Features</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                      <span className="text-gray-300">Smart Route Optimization</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                      <span className="text-gray-300">Multi-DEX Price Comparison</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                      <span className="text-gray-300">Gas Cost Optimization</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                      <span className="text-gray-300">Arbitrage Detection</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs font-bold text-white">5</span>
                      <span className="text-gray-300">Real-time Health Monitoring</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="simple" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <QuickTradePanel />
              </div>
              
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">📊 Redes Suportadas</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-300">Ethereum</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-300">Arbitrum</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-300">Optimism</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <span className="text-gray-300">Polygon</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-300">Base</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <span className="text-gray-300">Avalanche</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-300">BSC</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-300">Solana</span>
                    </div>
                  </div>
                </div>

                {/* Revenue Projection */}
                <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">💰 Revenue Projection</h3>
                  <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volume $100K/day:</span>
                        <span className="text-green-400 font-bold">$6K/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volume $1M/day:</span>
                        <span className="text-green-400 font-bold">$60K/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volume $10M/day:</span>
                        <span className="text-green-400 font-bold">$600K/month</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-600">
                      <p className="text-xs text-gray-400">
                        0.20% fee on each processed transaction
                      </p>
                    </div>
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">⚡ How It Works</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                      <span className="text-gray-300">User requests best execution analysis</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                      <span className="text-gray-300">System analyzes 10+ DEXs across networks</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                      <span className="text-gray-300">User executes trade on best option</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                      <span className="text-gray-300">0.20% fee goes to your wallets</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <RevenueDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}