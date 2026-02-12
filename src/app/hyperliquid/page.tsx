'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
  Zap,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

// Import HyperLiquid components
import PerpetualsPortfolio from '@/components/portfolio/PerpetualsPortfolio';
import HyperLiquidTradingInterface from '@/components/trading/HyperLiquidTradingInterface';
import RiskManagement from '@/components/trading/RiskManagement';
import HyperLiquidWidget from '@/components/dashboard/HyperLiquidWidget';

// Import hooks
import { useWallet } from '@/hooks/useWallet';
import { useHyperLiquid } from '@/hooks/useHyperLiquid';

const HyperLiquidPage: React.FC = () => {
  const { address, isConnected, connectWallet: connect } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { 
    portfolio, 
    positions, 
    totalPnL, 
    dailyPnL, 
    riskMetrics, 
    alerts, 
    isLoading, 
    error 
  } = useHyperLiquid(address);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Get P&L color class
  const getPnLColorClass = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Activity className="h-8 w-8 mr-3 text-blue-600" />
            HyperLiquid Perpetuals
          </h1>
          <p className="text-gray-600 mt-1">
            Professional perpetual futures trading platform with advanced risk management
          </p>
        </div>
        
        {!isConnected && (
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        )}
      </div>

      {/* Connection Alert */}
      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connect your wallet to access HyperLiquid perpetuals trading and portfolio management.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats (when connected) */}
      {isConnected && portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total P&L</p>
                  <p className={`text-2xl font-bold ${getPnLColorClass(totalPnL)}`}>
                    {formatCurrency(totalPnL)}
                  </p>
                </div>
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <Activity className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Portfolio Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(portfolio.totalPortfolioValue)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Positions</p>
                  <p className="text-2xl font-bold">{portfolio.summary.openPositions}</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Risk Level</p>
                  <p className={`text-2xl font-bold ${
                    riskMetrics?.leverageRisk === 'High' ? 'text-red-600' :
                    riskMetrics?.leverageRisk === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {riskMetrics?.leverageRisk || 'Low'}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Alerts */}
      {alerts && alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} active risk alert{alerts.length > 1 ? 's' : ''} detected. 
            Check the Risk Management tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trading" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Risk Management
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* HyperLiquid Widget */}
            <div className="lg:col-span-2">
              <HyperLiquidWidget showFullData={true} />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 CLIQUE TRADING HYPERLIQUID');
                    setActiveTab('trading');
                  }}
                  disabled={!isConnected}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Open New Position
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 CLIQUE PORTFOLIO HYPERLIQUID');
                    setActiveTab('portfolio');
                  }}
                  disabled={!isConnected}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Manage Positions
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔥 CLIQUE RISK HYPERLIQUID');
                    setActiveTab('risk');
                  }}
                  disabled={!isConnected}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Risk Settings
                </Button>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open('https://app.hyperliquid.xyz', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    HyperLiquid App
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Educational Content */}
          <Card>
            <CardHeader>
              <CardTitle>About HyperLiquid Perpetuals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600" />
                    Perpetual Futures
                  </h3>
                  <p className="text-sm text-gray-600">
                    Trade crypto perpetual futures with up to 50x leverage. No expiration dates, 
                    continuous trading 24/7.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-green-600" />
                    Risk Management
                  </h3>
                  <p className="text-sm text-gray-600">
                    Advanced risk controls including stop-loss, take-profit, position limits, 
                    and real-time monitoring.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-600" />
                    Real-time Data
                  </h3>
                  <p className="text-sm text-gray-600">
                    Live P&L tracking, position monitoring, and instant market data 
                    for informed trading decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Tab */}
        <TabsContent value="trading">
          <HyperLiquidTradingInterface />
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          <PerpetualsPortfolio />
        </TabsContent>

        {/* Risk Management Tab */}
        <TabsContent value="risk">
          <RiskManagement />
        </TabsContent>
      </Tabs>

      {/* Footer Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              <p>
                <strong>Disclaimer:</strong> Trading perpetual futures involves significant risk. 
                Only trade with funds you can afford to lose.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => window.open('https://hyperliquid.xyz/docs', '_blank')}>
                Documentation
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.open('https://discord.gg/hyperliquid', '_blank')}>
                Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HyperLiquidPage;