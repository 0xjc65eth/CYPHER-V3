'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  X,
  BarChart3,
  Target,
  Shield
} from 'lucide-react';
import hyperLiquidService from '@/services/HyperLiquidService';
import { useWallet } from '@/hooks/useWallet';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Position {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    leverage: string;
  };
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  marketPrice: number;
  entryPrice: number;
  size: number;
  leverage: number;
}

interface PortfolioSummary {
  totalPositions: number;
  totalUnrealizedPnl: number;
  totalPortfolioValue: number;
  dailyPnl: number;
  positions: Position[];
  recentTrades: any[];
  summary: {
    openPositions: number;
    profitablePositions: number;
    averageLeverage: number;
  };
}

const PerpetualsPortfolio: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [portfolioData, setPortfolioData] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch portfolio data
  const fetchPortfolioData = useCallback(async () => {
    if (!address || !isConnected) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await hyperLiquidService.getPortfolioSummary(address);
      
      if (result.success) {
        setPortfolioData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Failed to fetch portfolio data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && address && isConnected) {
      fetchPortfolioData();
      const interval = setInterval(fetchPortfolioData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, address, isConnected, fetchPortfolioData]);

  // Initial load
  useEffect(() => {
    if (address && isConnected) {
      fetchPortfolioData();
    }
  }, [address, isConnected, fetchPortfolioData]);

  // Close position handler
  const handleClosePosition = async (position: Position) => {
    if (!address) return;

    try {
      setLoading(true);
      const result = await hyperLiquidService.closePosition(
        position.position.coin
      );

      if (result.success) {
        // Refresh portfolio data after closing position
        await fetchPortfolioData();
      } else {
        setError(result.error || 'Failed to close position');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close position');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number, decimals = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  };

  // Get P&L color class
  const getPnLColorClass = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Calculate risk metrics
  const riskMetrics = portfolioData 
    ? hyperLiquidService.calculateRiskMetrics(portfolioData.positions, portfolioData.totalPortfolioValue)
    : null;

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
            <p className="text-gray-600">Please connect your wallet to view your HyperLiquid perpetuals portfolio.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">HyperLiquid Perpetuals</h2>
          <p className="text-gray-600">Real-time portfolio tracking and position management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPortfolioData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !portfolioData && (
        <Card>
          <CardContent className="p-6">
            <LoadingSpinner />
            <p className="text-center mt-4">Loading portfolio data...</p>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary */}
      {portfolioData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total P&L</p>
                    <p className={`text-2xl font-bold ${getPnLColorClass(portfolioData.totalUnrealizedPnl)}`}>
                      {formatCurrency(portfolioData.totalUnrealizedPnl)}
                    </p>
                  </div>
                  {portfolioData.totalUnrealizedPnl >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Portfolio Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(portfolioData.totalPortfolioValue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open Positions</p>
                    <p className="text-2xl font-bold">{portfolioData.summary.openPositions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Daily P&L</p>
                    <p className={`text-2xl font-bold ${getPnLColorClass(portfolioData.dailyPnl)}`}>
                      {formatCurrency(portfolioData.dailyPnl)}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Metrics */}
          {riskMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Risk Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Leverage Risk</p>
                    <Badge variant={riskMetrics.leverageRisk === 'High' ? 'destructive' : 
                                   riskMetrics.leverageRisk === 'Medium' ? 'default' : 'secondary'}>
                      {riskMetrics.leverageRisk}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Avg: {riskMetrics.avgLeverage.toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Max Drawdown</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(riskMetrics.maxDrawdown)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Position Risk</p>
                    <p className="text-lg font-semibold">
                      {riskMetrics.positionRisk.toFixed(2)}%
                    </p>
                    <Progress value={Math.min(riskMetrics.positionRisk, 100)} className="mt-1" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Risk Exposure</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(riskMetrics.totalRisk)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Positions and Trades Tabs */}
          <Tabs defaultValue="positions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="positions">Positions ({portfolioData.summary.openPositions})</TabsTrigger>
              <TabsTrigger value="trades">Recent Trades ({portfolioData.recentTrades.length})</TabsTrigger>
            </TabsList>

            {/* Positions Tab */}
            <TabsContent value="positions">
              <Card>
                <CardHeader>
                  <CardTitle>Open Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  {portfolioData.positions.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No open positions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {portfolioData.positions
                        .filter(pos => pos.size && Math.abs(pos.size) > 0)
                        .map((position, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold">{position.position.coin}</h3>
                              <Badge variant={position.size > 0 ? 'default' : 'secondary'}>
                                {position.size > 0 ? 'LONG' : 'SHORT'}
                              </Badge>
                              <Badge variant="outline">
                                {position.leverage.toFixed(1)}x
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClosePosition(position)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Size</p>
                              <p className="font-semibold">{Math.abs(position.size).toFixed(4)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Entry Price</p>
                              <p className="font-semibold">{formatCurrency(position.entryPrice)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Market Price</p>
                              <p className="font-semibold">{formatCurrency(position.marketPrice)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">P&L</p>
                              <p className={`font-semibold ${getPnLColorClass(position.unrealizedPnl)}`}>
                                {formatCurrency(position.unrealizedPnl)}
                              </p>
                              <p className={`text-sm ${getPnLColorClass(position.unrealizedPnlPercent)}`}>
                                {formatPercentage(position.unrealizedPnlPercent)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trades Tab */}
            <TabsContent value="trades">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  {portfolioData.recentTrades.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No recent trades</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {portfolioData.recentTrades.map((trade, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <Badge variant={trade.side === 'A' ? 'default' : 'secondary'}>
                              {trade.side === 'A' ? 'BUY' : 'SELL'}
                            </Badge>
                            <span className="font-medium">{trade.coin}</span>
                            <span className="text-sm text-gray-600">
                              {parseFloat(trade.sz).toFixed(4)} @ {formatCurrency(parseFloat(trade.px))}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${getPnLColorClass(parseFloat(trade.pnl || 0))}`}>
                              {formatCurrency(parseFloat(trade.pnl || 0))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(trade.time).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-center text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PerpetualsPortfolio;