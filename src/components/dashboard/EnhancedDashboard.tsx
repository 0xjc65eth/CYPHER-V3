import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuaranteedChart } from '@/components/charts/GuaranteedChart';
import { SafeTradingTerminal } from '@/components/trading/SafeTradingTerminal';
import { SafeWalletConnector } from '@/components/wallet/SafeWalletConnector';
import { ClientOnly } from '@/components/common/ClientOnly';
import { PortfolioPnL } from './PortfolioPnL';
import QuickTrade from './QuickTrade';
import { AlertsAndSignals } from './AlertsAndSignals';
import { MarketOverview } from './MarketOverview';
import { MultiAgentStatusDashboard } from './MultiAgentStatusDashboard';
import { useWallet } from '@/contexts/WalletContext';
import { 
  LayoutDashboard, 
  LineChart, 
  Wallet, 
  Zap, 
  Bell, 
  Brain,
  TrendingUp,
  Activity
} from 'lucide-react';

export const EnhancedDashboard: React.FC = () => {
  const { connected, wallet } = useWallet();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [marketStats, setMarketStats] = useState({
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    activeTraders: 0,
  });

  useEffect(() => {
    // Fetch market statistics
    fetchMarketStats();
    
    // Set up real-time updates
    const interval = setInterval(fetchMarketStats, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchMarketStats = async () => {
    try {
      const response = await fetch('/api/market/stats/');
      const data = await response.json();
      setMarketStats(data);
    } catch (error) {
      console.error('Error fetching market stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Stats Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-gray-400">Market Cap</p>
                <p className="font-semibold">${(marketStats.totalMarketCap / 1e12).toFixed(2)}T</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-400">24h Volume</p>
                <p className="font-semibold">${(marketStats.totalVolume24h / 1e9).toFixed(2)}B</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs text-gray-400">BTC Dominance</p>
                <p className="font-semibold">{marketStats.btcDominance.toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs text-gray-400">AI Agents Active</p>
                <p className="font-semibold">120</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-gray-800 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              <span className="hidden md:inline">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden md:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden md:inline">Trade</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden md:inline">AI</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MarketOverview />
              </div>
              <div>
                <ClientOnly fallback={<div className="p-6 bg-gray-800 rounded-lg">Loading...</div>}>
                  <QuickTrade />
                </ClientOnly>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GuaranteedChart 
                symbol="BTCUSDT" 
                interval="15m" 
              />
              <AlertsAndSignals />
            </div>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <GuaranteedChart 
                symbol="BTCUSDT" 
                interval="1h" 
              />
              <GuaranteedChart 
                symbol="ETHUSDT" 
                interval="1h" 
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <GuaranteedChart 
                symbol="ORDIUSDT" 
                interval="15m" 
                type="line"
              />
              <GuaranteedChart 
                symbol="SOLUSDT" 
                interval="15m" 
                type="line"
              />
            </div>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            {connected ? (
              <PortfolioPnL />
            ) : (
              <Card className="p-12 text-center">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">
                  Connect your wallet to view portfolio analytics and P&L tracking
                </p>
                <button 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  onClick={() => document.getElementById('wallet-connect-button')?.click()}
                >
                  Connect Wallet
                </button>
              </Card>
            )}
          </TabsContent>

          {/* Trade Tab */}
          <TabsContent value="trade" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <GuaranteedChart 
                  symbol="BTCUSDT" 
                  interval="5m" 
                />
              </div>
              <div>
                <ClientOnly>
                  <SafeTradingTerminal symbol="BTCUSDT" />
                </ClientOnly>
              </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <AlertsAndSignals />
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-6">
            <MultiAgentStatusDashboard />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">AI Predictions</h3>
                <div className="space-y-4">
                  {/* AI predictions content */}
                  <div className="p-4 bg-gray-800 rounded">
                    <p className="font-semibold">BTC 24h Prediction</p>
                    <p className="text-2xl text-green-500">$68,450 (+1.8%)</p>
                    <p className="text-sm text-gray-400">85% confidence</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Market Sentiment</h3>
                <div className="space-y-4">
                  {/* Sentiment analysis content */}
                  <div className="p-4 bg-gray-800 rounded">
                    <p className="font-semibold">Overall Sentiment</p>
                    <p className="text-2xl text-green-500">Bullish (72%)</p>
                    <p className="text-sm text-gray-400">Based on 10k+ data points</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};