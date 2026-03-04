/**
 * Portfolio Overview Component
 * 
 * This component displays a comprehensive overview of the user's portfolio,
 * including total value, asset allocation, performance metrics, and recent transactions.
 */

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  DonutChart 
} from '@/components/charts';
import { 
  Asset, 
  AssetType, 
  PortfolioMetrics, 
  PortfolioSummary, 
  portfolioService 
} from '@/services/portfolio-service';
import { Transaction } from '@/services/wallet-connector';
import { formatCurrency, formatPercentage, formatDate } from '@/utils/formatters';
import { AssetList } from './AssetList';
import { TransactionList } from './TransactionList';
import { PerformanceMetrics } from './PerformanceMetrics';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function PortfolioOverview() {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Load initial portfolio data
    loadPortfolioData();

    // Subscribe to portfolio updates
    const handlePortfolioUpdate = (summary: PortfolioSummary) => {
      setPortfolioSummary(summary);
      setIsLoading(false);
    };

    const handleSyncStarted = () => {
      setIsSyncing(true);
    };

    const handleSyncCompleted = () => {
      setIsSyncing(false);
    };

    const handleError = (error: any) => {
      setError(error.message || 'An error occurred while loading portfolio data');
      setIsLoading(false);
    };

    portfolioService.on('portfolio_updated', handlePortfolioUpdate);
    portfolioService.on('sync_started', handleSyncStarted);
    portfolioService.on('sync_completed', handleSyncCompleted);
    portfolioService.on('portfolio_error', handleError);

    // Clean up event listeners on unmount
    return () => {
      portfolioService.off('portfolio_updated', handlePortfolioUpdate);
      portfolioService.off('sync_started', handleSyncStarted);
      portfolioService.off('sync_completed', handleSyncCompleted);
      portfolioService.off('portfolio_error', handleError);
    };
  }, []);

  const loadPortfolioData = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const summary = portfolioService.getPortfolioSummary();
      setPortfolioSummary(summary);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio data');
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    portfolioService.syncPortfolio();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" onClick={loadPortfolioData} className="mt-2">
          Try Again
        </Button>
      </Alert>
    );
  }

  if (!portfolioSummary || portfolioSummary.assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-2xl font-bold">No Portfolio Data</h2>
        <p className="text-muted-foreground">
          Connect a wallet to view your portfolio
        </p>
      </div>
    );
  }

  const { assets, metrics, transactions } = portfolioSummary;
  const historicalData: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isSyncing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Value</CardTitle>
            <CardDescription>Your portfolio's total value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <div className="flex items-center mt-2">
              <span className={`text-sm ${metrics.dailyChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(metrics.dailyChangePct)} (24h)
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {formatCurrency(metrics.totalValue, 'BTC')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution of your assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Asset allocation chart
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Performance</CardTitle>
            <CardDescription>Portfolio performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily</span>
                <span className={metrics.dailyChangePct >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatPercentage(metrics.dailyChangePct)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weekly</span>
                <span className={metrics.weeklyChangePct >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatPercentage(metrics.weeklyChangePct)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly</span>
                <span className={metrics.monthlyChangePct >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatPercentage(metrics.monthlyChangePct)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">All Time</span>
                <span className={metrics.allTimeReturnPct >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatPercentage(metrics.allTimeReturnPct)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio History</CardTitle>
          <CardDescription>Historical portfolio value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <LineChart
              data={historicalData.slice(-30).map((dataPoint: any) => ({
                date: new Date(dataPoint.timestamp),
                value: dataPoint.valueUsd
              }))}
              xKey="date"
              yKey="value"
              color="#3B82F6"
              {...({} as any)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assets" className="mt-6">
          <AssetList assets={assets} />
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <TransactionList transactions={transactions as any} />
        </TabsContent>
        
        <TabsContent value="metrics" className="mt-6">
          <PerformanceMetrics metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
