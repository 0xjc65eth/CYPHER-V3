'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// WALLET TEMPORARILY DISABLED - import { useWalletContext } from '@/contexts/WalletContext';
// WALLET TEMPORARILY DISABLED - import { WalletConnectionSystem } from './WalletConnectionSystem';
import { TradingChartSystem } from '@/components/charts/TradingChartSystem';
import { CypherAISystem } from '@/components/ai/CypherAISystem';
import { PortfolioSystem } from '@/components/portfolio/PortfolioSystem';
import { OrdinalsSystemV2 } from '@/components/ordinals/OrdinalsSystemV2';
import { RunesTabSystem } from '@/components/runes/RunesTabSystem';
import { AnalyticsSystem } from '@/components/analytics/AnalyticsSystem';
import { MarketTradingFloor } from '@/components/market/MarketTradingFloor';
import {
  LayoutDashboard,
  Wallet,
  LineChart,
  Brain,
  PieChart,
  Gem,
  Coins,
  BarChart3,
  Globe,
  Settings,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type TabView = 'dashboard' | 'trading' | 'portfolio' | 'ordinals' | 'runes' | 'analytics' | 'market' | 'ai';

interface NavItem {
  id: TabView;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Quick Actions' },
  { id: 'trading', label: 'Trading', icon: LineChart, description: 'Professional Charts & Analysis' },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart, description: 'Track Your Assets' },
  { id: 'ordinals', label: 'Ordinals', icon: Gem, description: 'Bitcoin NFTs & Inscriptions' },
  { id: 'runes', label: 'Runes', icon: Coins, description: 'Fungible Tokens on Bitcoin' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Market Intelligence' },
  { id: 'market', label: 'Market', icon: Globe, description: 'Trading Floor & SMC', badge: 'NEW' },
  { id: 'ai', label: 'Cypher AI', icon: Brain, description: 'AI Assistant', badge: 'BETA' }
];

export function IntegratedDashboard() {
  // WALLET TEMPORARILY DISABLED - const { connectionState } = useWalletContext();
  const connectionState = { isConnected: false, account: null as string | null };
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const [marketPrice, setMarketPrice] = useState(98500);

  // Quick Stats
  const quickStats = {
    portfolioValue: connectionState.isConnected ? '$125,432.50' : '$0.00',
    dayChange: connectionState.isConnected ? '+$2,345.67' : '$0.00',
    dayChangePercent: connectionState.isConnected ? '+1.91%' : '0.00%',
    totalAssets: connectionState.isConnected ? 12 : 0
  };

  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'trading':
        return <TradingChartSystem height={600} onPriceUpdate={setMarketPrice} />;
      case 'portfolio':
        return <PortfolioSystem />;
      case 'ordinals':
        return <OrdinalsSystemV2 />;
      case 'runes':
        return <RunesTabSystem />;
      case 'analytics':
        return <AnalyticsSystem />;
      case 'market':
        return <MarketTradingFloor />;
      case 'ai':
        return <CypherAISystem />;
      default:
        return <DashboardOverview />;
    }
  };

  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to Cypher Ordi Future
        </h2>
        <p className="text-blue-100">
          {connectionState.isConnected 
            ? `Connected: ${connectionState.account?.address.slice(0, 8)}...${connectionState.account?.address.slice(-8)}`
            : 'Connect your wallet to get started'
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Portfolio Value</span>
            <Wallet className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">{quickStats.portfolioValue}</p>
          <p className={`text-sm mt-1 ${parseFloat(quickStats.dayChangePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {quickStats.dayChange} ({quickStats.dayChangePercent})
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Bitcoin Price</span>
            <LineChart className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-white">${marketPrice.toLocaleString()}</p>
          <p className="text-sm text-green-400 mt-1">+2.34% (24h)</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Total Assets</span>
            <Gem className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">{quickStats.totalAssets}</p>
          <p className="text-sm text-gray-500 mt-1">Across all categories</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Active Alerts</span>
            <Bell className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-white">{notifications}</p>
          <p className="text-sm text-yellow-400 mt-1">View all alerts</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setActiveTab('trading')}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Open Trading
            </button>
            <button 
              onClick={() => setActiveTab('portfolio')}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              View Portfolio
            </button>
            <button 
              onClick={() => setActiveTab('ordinals')}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Browse Ordinals
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Ask AI
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Market Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">24h Volume</span>
              <span className="text-white">$45.6B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Market Cap</span>
              <span className="text-white">$1.92T</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active Traders</span>
              <span className="text-white">125,432</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fear & Greed</span>
              <span className="text-green-400">75 - Greed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connection */}
      {!connectionState.isConnected && (
        <div className="mt-6">
          {/* WALLET TEMPORARILY DISABLED - <WalletConnectionSystem /> */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Wallet Connection</h3>
            <p className="text-gray-400">Wallet connection temporarily disabled</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold hidden sm:block">Cypher Ordi Future</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Settings */}
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            {/* Wallet Status */}
            {connectionState.isConnected && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  {connectionState.account?.address.slice(0, 6)}...{connectionState.account?.address.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-14 bottom-0 w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto z-40 lg:relative lg:top-0"
            >
              <nav className="p-4 space-y-1">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      activeTab === item.id
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs opacity-75">{item.description}</span>
                    </div>
                    {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-1 p-6 ${isSidebarOpen ? 'lg:ml-0' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}