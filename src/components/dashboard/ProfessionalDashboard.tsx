'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  Brain,
  Zap,
  Shield,
  Target,
  Users,
  Globe,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Wallet,
  Settings,
  Bell,
  Eye,
  PieChart
} from 'lucide-react';
import { PROFESSIONAL_APIS, API_KEYS, AGENT_SYSTEM } from '@/config/professionalApis';

// 📊 Professional Market Data Interface
interface MarketData {
  bitcoin: {
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    dominance: number;
  };
  ordinals: {
    totalInscriptions: number;
    dailyInscriptions: number;
    floorPrice: number;
    volumeUSD: number;
  };
  runes: {
    totalEtchings: number;
    activeRunes: number;
    totalHolders: number;
    volume24h: number;
  };
  brc20: {
    totalTokens: number;
    marketCap: number;
    activeTokens: number;
    transactions24h: number;
  };
  mempool: {
    pendingTx: number;
    fees: {
      slow: number;
      standard: number;
      fast: number;
    };
    congestion: 'low' | 'medium' | 'high';
  };
}

// 🤖 Agent Status Interface
interface AgentStatus {
  id: number;
  name: string;
  status: 'active' | 'idle' | 'error' | 'maintenance';
  lastUpdate: number;
  performance: number;
  alerts: number;
  task: string;
}

// 💼 Trading Opportunity Interface
interface TradingOpportunity {
  id: string;
  type: 'ordinal' | 'rune' | 'brc20' | 'arbitrage';
  asset: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  potentialReturn: number;
  risk: 'low' | 'medium' | 'high';
  timeframe: string;
  reasons: string[];
  data: any;
}

export function ProfessionalDashboard() {
  // 📊 State Management
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [opportunities, setOpportunities] = useState<TradingOpportunity[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  // 🔄 Real-time Data Fetching
  const fetchMarketData = useCallback(async () => {
    try {
      // Parallel API calls for professional data
      const [bitcoinData, ordinalsData, runesData, brc20Data, mempoolData] = await Promise.all([
        fetchBitcoinData(),
        fetchOrdinalsData(),
        fetchRunesData(),
        fetchBRC20Data(),
        fetchMempoolData()
      ]);

      setMarketData({
        bitcoin: bitcoinData || { price: 0, change24h: 0, volume24h: 0, marketCap: 0, dominance: 0 },
        ordinals: ordinalsData || { totalInscriptions: 0, dailyInscriptions: 0, floorPrice: 0, volumeUSD: 0 },
        runes: runesData || { totalEtchings: 0, activeRunes: 0, totalHolders: 0 },
        brc20: brc20Data || { activeTokens: 0, totalHolders: 0, marketCap: 0 },
        mempool: mempoolData || { pendingTxs: 0, avgFee: 0, nextBlock: 0 }
      });
    } catch (error) {
      console.error('❌ Market data fetch error:', error);
      addNotification('Market data update failed');
    }
  }, []);

  // Agent Management - show actual status (no mock randomization)
  const updateAgentStatuses = useCallback(() => {
    const updatedAgents = AGENT_SYSTEM.AGENTS.map(agent => ({
      ...agent,
      status: 'idle' as AgentStatus['status'],
      lastUpdate: Date.now(),
      performance: 0,
      alerts: 0
    }));
    setAgentStatuses(updatedAgents);
  }, []);

  // 🎯 Opportunity Scanner
  const scanOpportunities = useCallback(async () => {
    try {
      // Professional opportunity detection
      const newOpportunities = await detectTradingOpportunities();
      setOpportunities(newOpportunities);
      
      // High-confidence alerts
      const highConfidenceOps = newOpportunities.filter(op => op.confidence > 0.85);
      if (highConfidenceOps.length > 0) {
        addNotification(`🎯 ${highConfidenceOps.length} high-confidence opportunities detected`);
      }
    } catch (error) {
      console.error('❌ Opportunity scan error:', error);
    }
  }, []);

  // 🔔 Notification System
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);
  };

  // ⚡ Lifecycle Effects
  useEffect(() => {
    // Initial data load
    fetchMarketData();
    updateAgentStatuses();
    scanOpportunities();

    // Set up real-time intervals
    const marketInterval = setInterval(fetchMarketData, 30000); // 30s
    const agentInterval = setInterval(updateAgentStatuses, 10000); // 10s
    const opportunityInterval = setInterval(scanOpportunities, 60000); // 1m

    return () => {
      clearInterval(marketInterval);
      clearInterval(agentInterval);
      clearInterval(opportunityInterval);
    };
  }, [fetchMarketData, updateAgentStatuses, scanOpportunities]);

  // 🎨 Professional UI Components with null checks
  const MetricCard = ({ title, value, change, icon: Icon, color = 'text-white' }) => (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-6 hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wide">{title || 'N/A'}</p>
          <p className={`text-3xl font-bold ${color} mt-2`}>
            {value !== null && value !== undefined ? value : 'Loading...'}
          </p>
          {change !== undefined && change !== null && !isNaN(change) && (
            <div className={`flex items-center mt-2 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span className="text-sm font-medium">{Math.abs(change).toFixed(2)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </Card>
  );

  const AgentGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {agentStatuses?.slice(0, 15)?.map(agent => (
        <Card key={agent.id} className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white truncate">{agent?.name || 'Unknown Agent'}</span>
            <div className={`w-3 h-3 rounded-full ${
              agent.status === 'active' ? 'bg-green-500' :
              agent.status === 'idle' ? 'bg-yellow-500' :
              agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Performance</span>
              <span className="text-white">{(agent?.performance || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full" 
                style={{ width: `${agent?.performance || 0}%` }}
              />
            </div>
          </div>
          {(agent?.alerts || 0) > 0 && (
            <Badge className="mt-2 bg-red-500/20 text-red-400 text-xs">
              {agent?.alerts || 0} alerts
            </Badge>
          )}
        </Card>
      ))}
    </div>
  );

  const OpportunityList = () => (
    <div className="space-y-4">
      {opportunities?.slice(0, 8)?.map(opp => (
        <Card key={opp.id} className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`${
                  opp.type === 'ordinal' ? 'bg-orange-500/20 text-orange-400' :
                  opp.type === 'rune' ? 'bg-purple-500/20 text-purple-400' :
                  opp.type === 'brc20' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {opp.type.toUpperCase()}
                </Badge>
                <span className="text-lg font-bold text-white">{opp.asset}</span>
                <Badge className={`${
                  opp.action === 'buy' ? 'bg-green-500/20 text-green-400' :
                  opp.action === 'sell' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {opp.action.toUpperCase()}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <span className="text-xs text-gray-400">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${opp.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-white">{(opp.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-gray-400">Potential Return</span>
                  <span className="block text-lg font-bold text-green-400">
                    +{opp.potentialReturn.toFixed(1)}%
                  </span>
                </div>
                
                <div>
                  <span className="text-xs text-gray-400">Risk Level</span>
                  <Badge className={`${
                    opp.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                    opp.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {opp.risk}
                  </Badge>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                {opp.reasons.slice(0, 2).join(' • ')}
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Execute
              </Button>
              <Button size="sm" variant="outline" className="border-gray-600">
                Watch
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      {/* 🔝 Professional Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">CYPHER ORDI</h1>
                  <p className="text-sm text-gray-400">Professional Trading Terminal</p>
                </div>
              </div>
              
              {isLiveMode && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">LIVE</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* 🔔 Notifications */}
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                  )}
                </Button>
                {notifications.length > 0 && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-white mb-3">Recent Alerts</h3>
                      <div className="space-y-2">
                        {notifications.map((notif, index) => (
                          <div key={index} className="text-xs text-gray-300 p-2 bg-gray-800 rounded">
                            {notif}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 📈 Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Bitcoin Price"
            value={marketData?.bitcoin?.price ? `$${marketData.bitcoin.price.toLocaleString()}` : 'Loading...'}
            change={marketData?.bitcoin?.change24h}
            icon={Activity}
            color="text-orange-400"
          />
          <MetricCard
            title="Total Inscriptions"
            value={marketData?.ordinals?.totalInscriptions ? marketData.ordinals.totalInscriptions.toLocaleString() : 'Loading...'}
            change={marketData?.ordinals?.dailyInscriptions && marketData?.ordinals?.totalInscriptions 
              ? ((marketData.ordinals.dailyInscriptions / marketData.ordinals.totalInscriptions) * 100)
              : undefined}
            icon={Globe}
            color="text-purple-400"
          />
          <MetricCard
            title="Active Runes"
            value={marketData?.runes?.activeRunes ? marketData.runes.activeRunes.toLocaleString() : 'Loading...'}
            change={5.2}
            icon={Zap}
            color="text-blue-400"
          />
          <MetricCard
            title="Mempool Fees"
            value={marketData?.mempool?.fees?.fast ? `${marketData.mempool.fees.fast} sat/vB` : 'Loading...'}
            icon={Clock}
            color="text-green-400"
          />
        </div>

        {/* 🎛️ Professional Tabs Interface */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl bg-gray-900 border border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-purple-600">
              <Brain className="w-4 h-4 mr-2" />
              AI Agents
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-green-600">
              <Target className="w-4 h-4 mr-2" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-orange-600">
              <Wallet className="w-4 h-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-red-600">
              <PieChart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* 📊 Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-gray-900 border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Market Overview</h2>
                  {/* Professional Chart Component */}
                  <div className="h-80 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">Professional TradingView Chart</span>
                  </div>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card className="bg-gray-900 border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Network Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Bitcoin Network</span>
                      <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Ordinals Indexer</span>
                      <Badge className="bg-green-500/20 text-green-400">Synced</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Runes Protocol</span>
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    </div>
                  </div>
                </Card>
                
                <Card className="bg-gray-900 border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white">ORDI</span>
                      <span className="text-green-400">+15.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">SATS</span>
                      <span className="text-green-400">+8.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">RATS</span>
                      <span className="text-red-400">-3.1%</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 🤖 AI Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">AI Agent Fleet</h2>
              <div className="flex items-center gap-4">
                <Badge className="bg-green-500/20 text-green-400">
                  {agentStatuses.filter(a => a.status === 'active').length} Active
                </Badge>
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  {agentStatuses.filter(a => a.status === 'idle').length} Idle
                </Badge>
                <Badge className="bg-red-500/20 text-red-400">
                  {agentStatuses.filter(a => a.status === 'error').length} Error
                </Badge>
              </div>
            </div>
            <AgentGrid />
          </TabsContent>

          {/* 🎯 Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Trading Opportunities</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-2" />
                Scan Now
              </Button>
            </div>
            <OpportunityList />
          </TabsContent>

          {/* 💼 Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <Card className="bg-gray-900 border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Portfolio Management</h2>
              <div className="text-center text-gray-400">
                Professional portfolio interface coming soon...
              </div>
            </Card>
          </TabsContent>

          {/* 📈 Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-gray-900 border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Advanced Analytics</h2>
              <div className="text-center text-gray-400">
                Professional analytics dashboard coming soon...
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// 🔧 Professional API Functions
async function fetchBitcoinData() {
  // Mock data - replace with real API calls
  return {
    price: 105420.50,
    change24h: 2.34,
    volume24h: 15420000000,
    marketCap: 2080000000000,
    dominance: 54.2
  };
}

async function fetchOrdinalsData() {
  return {
    totalInscriptions: 75234891,
    dailyInscriptions: 12847,
    floorPrice: 0.0001,
    volumeUSD: 2450000
  };
}

async function fetchRunesData() {
  return {
    totalEtchings: 1247,
    activeRunes: 892,
    totalHolders: 145923,
    volume24h: 890000
  };
}

async function fetchBRC20Data() {
  return {
    totalTokens: 28491,
    marketCap: 1230000000,
    activeTokens: 1843,
    transactions24h: 9847
  };
}

async function fetchMempoolData() {
  return {
    pendingTx: 42891,
    fees: {
      slow: 8,
      standard: 15,
      fast: 28
    },
    congestion: 'medium' as const
  };
}

async function detectTradingOpportunities(): Promise<TradingOpportunity[]> {
  // Mock opportunities - replace with real AI analysis
  return [
    {
      id: '1',
      type: 'ordinal',
      asset: 'Uncommon Sat #1847291',
      action: 'buy',
      confidence: 0.89,
      potentialReturn: 24.5,
      risk: 'medium',
      timeframe: '7-14 days',
      reasons: ['Rare sat pattern detected', 'Below floor price', 'High collector interest'],
      data: {}
    },
    {
      id: '2',
      type: 'brc20',
      asset: 'ORDI',
      action: 'buy',
      confidence: 0.76,
      potentialReturn: 18.2,
      risk: 'low',
      timeframe: '3-5 days',
      reasons: ['Positive momentum', 'Volume increase', 'Technical breakout'],
      data: {}
    }
  ];
}

export default ProfessionalDashboard;