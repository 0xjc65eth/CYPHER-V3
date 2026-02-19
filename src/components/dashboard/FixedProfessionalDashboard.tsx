'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  BarChart3,
  DollarSign,
  Sparkles,
  Network,
  Database,
  Settings
} from 'lucide-react';

// Import QuickTrade component
import { QuickTradeEnhanced } from '@/components/dashboard/QuickTradeEnhanced';

export function FixedProfessionalDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [bitcoinPrice, setBitcoinPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          '/api/coingecko?endpoint=/simple/price&params=' +
            encodeURIComponent('ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.bitcoin) {
            setBitcoinPrice(data.bitcoin.usd || 0);
            setPriceChange(data.bitcoin.usd_24h_change || 0);
          }
        }
      } catch (err) {
        console.error('FixedProfessionalDashboard price fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrice();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">Inicializando CYPHER Dashboard</h2>
          <p className="text-gray-400">Carregando dados profissionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      {/* Professional Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CYPHER Professional Dashboard</h1>
              <p className="text-sm text-gray-400">Institutional-Grade Bitcoin Ecosystem Analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Live Data</span>
            </div>
            <Button variant="outline" size="sm" className="border-gray-700">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-500" />
              </div>
              <Badge className={priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              ${bitcoinPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-gray-400 text-sm">Bitcoin Price</p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-400">
                +0.5%
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              45.2M
            </h3>
            <p className="text-gray-400 text-sm">Total Inscriptions</p>
            <p className="text-purple-400 text-xs mt-2">+8,500 today</p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Network className="w-6 h-6 text-cyan-500" />
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400">
                1,200 Active
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              2,850
            </h3>
            <p className="text-gray-400 text-sm">Total Runes</p>
            <p className="text-cyan-400 text-xs mt-2">$890k 24h volume</p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-green-500" />
              </div>
              <Badge className="bg-green-500/20 text-green-400">
                890 Active
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              14,500
            </h3>
            <p className="text-gray-400 text-sm">BRC-20 Tokens</p>
            <p className="text-green-400 text-xs mt-2">15,600 transactions</p>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="overview">Market Overview</TabsTrigger>
            <TabsTrigger value="trading">Quick Trade</TabsTrigger>
            <TabsTrigger value="agents">AI Agents</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Overview */}
              <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Portfolio Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Value</span>
                    <span className="text-xl font-bold text-white">$125,430</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">24h Change</span>
                    <span className="text-green-400 font-medium">+$2,840 (+2.31%)</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Bitcoin (45%)</span>
                      <span className="text-orange-400">$56,444</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ordinals (25%)</span>
                      <span className="text-purple-400">$31,358</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Runes (15%)</span>
                      <span className="text-cyan-400">$18,815</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">BRC-20 (10%)</span>
                      <span className="text-green-400">$12,543</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Cash (5%)</span>
                      <span className="text-gray-400">$6,272</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Top Collections */}
              <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Top Ordinals Collections</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">NodeMonkes</p>
                      <p className="text-sm text-gray-400">Floor: 0.12 BTC</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-400">45.2 BTC</p>
                      <p className="text-xs text-gray-500">24h volume</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Quantum Cats</p>
                      <p className="text-sm text-gray-400">Floor: 0.089 BTC</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-400">32.1 BTC</p>
                      <p className="text-xs text-gray-500">24h volume</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Bitcoin Puppets</p>
                      <p className="text-sm text-gray-400">Floor: 0.067 BTC</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-400">28.9 BTC</p>
                      <p className="text-xs text-gray-500">24h volume</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Network Status */}
              <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Network Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Pending Transactions</span>
                    <span className="text-white font-medium">4,250</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Slow (1h)</span>
                      <span className="text-white">12 sat/vB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Standard (30m)</span>
                      <span className="text-white">18 sat/vB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Fast (10m)</span>
                      <span className="text-white">25 sat/vB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-400">Low Congestion</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trading">
            <QuickTradeEnhanced />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }, (_, i) => (
                <Card key={i} className="bg-gray-900 border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <Badge className="text-xs px-2 py-1 bg-gray-800 text-gray-300">
                      Idle
                    </Badge>
                  </div>
                  <h4 className="font-medium text-white text-sm mb-2">
                    Agent {i + 1}: {['Bitcoin Scanner', 'Ordinals Monitor', 'Runes Tracker', 'BRC-20 Analyzer'][i % 4]}
                  </h4>
                  <p className="text-xs text-gray-400 mb-2">Monitoring markets</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Standby</span>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <div className="grid gap-6">
              {/* Trading Opportunities */}
              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-purple-500/20 text-purple-400">ORDINALS</Badge>
                      <Badge className="bg-green-500/20 text-green-400">BUY</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">NodeMonkes #4521</h3>
                    <p className="text-gray-400 text-sm mb-3">Floor price 15% below 7-day average, strong community momentum</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Confidence: </span>
                        <span className="text-white font-medium">87%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Potential: </span>
                        <span className="text-green-400 font-medium">+45%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timeframe: </span>
                        <span className="text-white">2-5 days</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    Execute
                  </Button>
                </div>
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-green-500/20 text-green-400">BRC-20</Badge>
                      <Badge className="bg-gray-500/20 text-gray-400">HOLD</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">ORDI Token</h3>
                    <p className="text-gray-400 text-sm mb-3">Consolidation near resistance, potential breakout setup forming</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Confidence: </span>
                        <span className="text-white font-medium">92%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Potential: </span>
                        <span className="text-green-400 font-medium">+23%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timeframe: </span>
                        <span className="text-white">1-2 weeks</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-gray-600 to-gray-700">
                    Monitor
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}