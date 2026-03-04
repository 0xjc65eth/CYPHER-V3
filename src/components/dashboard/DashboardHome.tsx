'use client';

import React, { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useTheme } from '@/contexts/ThemeContext';
import MarketOverviewCards from './MarketOverviewCards';
import QuickActions from './QuickActions';
import FinancialDashboard from './FinancialDashboard';
import BitcoinWalletConnector from '@/components/wallet/BitcoinWalletConnector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  StockPriceCard, 
  ExecutiveCard, 
  ExecutiveSummaryGrid, 
  MarketStatusIndicator,
  TradingButton 
} from '@/components/ui/WallStreetTheme';
import { TrendingUp, Wallet, Activity, AlertCircle, Eye, EyeOff, BarChart3, PieChart, DollarSign } from 'lucide-react';

export default function DashboardHome() {
  const { isConnected, address, balance, portfolioData, connect } = useWallet();
  const { theme, setTheme } = useTheme();
  const [showBalance, setShowBalance] = React.useState(true);
  const [showWalletConnector, setShowWalletConnector] = useState(false);

  const handleWalletConnect = () => {
    setShowWalletConnector(true);
  };

  const handleWalletConnected = (walletId: string) => {
    setShowWalletConnector(false);
    // Handle successful wallet connection
    connect(walletId as any);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (amount: number) => {
    return showBalance ? amount.toFixed(8) : '•••••••••';
  };

  const formatUSD = (amount: number) => {
    return showBalance ? `$${amount.toLocaleString()}` : '$•••••••••';
  };

  // Show Financial Dashboard if Wall Street mode is enabled
  if (theme === 'wallstreet') {
    return <FinancialDashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 w-8 h-8 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                <span className="hidden sm:inline">CYPHER ORDI FUTURE V3.0.0</span>
                <span className="sm:hidden">CYPHER V3</span>
              </h1>
            </div>
            
            {/* View Mode Toggle & Wallet Connection */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => setTheme('classic')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    theme === 'classic' 
                      ? 'bg-orange-500 text-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => setTheme('wallstreet')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    (theme as string) === 'wallstreet'
                      ? 'bg-orange-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Wall Street
                </button>
              </div>
              {isConnected ? (
                <div className="flex items-center space-x-1 sm:space-x-3">
                  <div className="flex items-center space-x-2 bg-gray-800/50 px-2 sm:px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                      {formatAddress(address!)}
                    </span>
                    <span className="text-xs font-medium sm:hidden">
                      Connected
                    </span>
                  </div>
                  {balance && (
                    <div className="bg-gray-800/50 px-2 sm:px-3 py-2 rounded-lg">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <span className="text-xs sm:text-sm text-orange-400 font-medium">
                          <span className="hidden sm:inline">{formatBalance(balance)} BTC</span>
                          <span className="sm:hidden">₿</span>
                        </span>
                        <button
                          onClick={() => setShowBalance(!showBalance)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {showBalance ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {formatUSD(balance * 42000)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleWalletConnect}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-medium text-sm sm:text-base px-3 sm:px-4"
                >
                  <Wallet className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome to Your Dashboard
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            Monitor Bitcoin, Ordinals, and Runes markets in real-time
          </p>
        </div>

        {/* Portfolio Summary */}
        {isConnected && portfolioData && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-400" />
              Portfolio Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Value</p>
                      <p className="text-2xl font-bold">
                        {showBalance ? `$${portfolioData.totalValue.toLocaleString()}` : '$•••••••••'}
                      </p>
                    </div>
                    <div className="bg-blue-500/20 p-3 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total P&L</p>
                      <p className={`text-2xl font-bold ${portfolioData.totalPNL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {showBalance ? 
                          `${portfolioData.totalPNL >= 0 ? '+' : ''}$${portfolioData.totalPNL.toLocaleString()}` : 
                          '$•••••••••'
                        }
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${portfolioData.totalPNL >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <TrendingUp className={`w-6 h-6 ${portfolioData.totalPNL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">P&L Percentage</p>
                      <p className={`text-2xl font-bold ${portfolioData.totalPNLPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {showBalance ? 
                          `${portfolioData.totalPNLPercentage >= 0 ? '+' : ''}${portfolioData.totalPNLPercentage.toFixed(2)}%` : 
                          '•••••%'
                        }
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${portfolioData.totalPNLPercentage >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <Activity className={`w-6 h-6 ${portfolioData.totalPNLPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Market Overview */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-orange-400" />
            Market Overview
          </h3>
          <MarketOverviewCards />
        </div>

        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-orange-400" />
            Quick Actions
          </h3>
          <QuickActions />
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 backdrop-blur-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <div>
                  <h4 className="font-semibold text-yellow-400">Connect Your Wallet</h4>
                  <p className="text-sm text-yellow-300/80">
                    Connect your Bitcoin wallet to access portfolio tracking and trading features
                  </p>
                </div>
                <Button
                  onClick={handleWalletConnect}
                  className="ml-auto bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                >
                  Connect Now
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bitcoin Wallet Connector */}
      {showWalletConnector && (
        <BitcoinWalletConnector
          onClose={() => setShowWalletConnector(false)}
          onConnect={handleWalletConnected}
        />
      )}
    </div>
  );
}