'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { walletIntegrationService, WalletIntegration, UniversalWalletAccount } from '@/services/WalletIntegrationService';
import { walletConnector, WalletInfo, PortfolioAsset } from '@/services/wallet-connector';
import type { WalletPerformance } from '@/types/wallet';
import { pnlCalculator, PortfolioPnL, CostBasisMethod } from '@/services/pnl-calculator';
import { portfolioAnalytics, RiskMetrics, PortfolioHealthScore, StressTestResult } from '@/services/portfolio-analytics';
import { WalletType } from '@/types/wallet';
import { usePortfolioWallet } from './usePortfolioWallet';
import { PortfolioPerformanceChart } from '@/components/portfolio/PortfolioPerformanceChart';
import { TaxReportGenerator } from '@/components/tax/TaxReportGenerator';
import { ExportButton } from '@/components/common/ExportButton';
import { ErrorBoundary } from '@/components/error-boundaries/ErrorBoundary';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Bitcoin,
  Coins,
  Activity,
  RefreshCw,
  Eye,
  Shield,
  BarChart3,
  DollarSign,
  Target,
  Gem,
  Hash,
  PieChart,
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingDown as Loss,
  Award,
  FileText,
  Settings,
  Download,
  Lock
} from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';

interface AdvancedPortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  riskMetrics: RiskMetrics;
  healthScore: PortfolioHealthScore;
  stressTests: StressTestResult[];
  costBasisMethod: CostBasisMethod;
}

interface PortfolioAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  action?: string;
}

interface MarketCondition {
  regime: 'bull' | 'bear' | 'sideways' | 'volatile';
  confidence: number;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

function PortfolioPageContent() {
  const [connectedWallets, setConnectedWallets] = useState<Map<string, WalletInfo>>(new Map());
  const [portfolioMetrics, setPortfolioMetrics] = useState<AdvancedPortfolioMetrics | null>(null);
  const [portfolioPnL, setPortfolioPnL] = useState<PortfolioPnL | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletIntegration[]>([]);
  const [alerts, setAlerts] = useState<PortfolioAlert[]>([]);
  const [marketCondition, setMarketCondition] = useState<MarketCondition | null>(null);
  const [selectedCostBasis, setSelectedCostBasis] = useState<CostBasisMethod>('FIFO');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use LaserEyes hook for wallet connection
  const { 
    connectWallet: laserEyesConnect, 
    disconnectWallet: laserEyesDisconnect,
    connected: laserEyesConnected,
    address: laserEyesAddress,
    balance: laserEyesBalance,
    connecting: laserEyesConnecting,
    error: laserEyesError
  } = usePortfolioWallet();

  // Load wallets and setup real-time updates
  useEffect(() => {
    loadAvailableWallets();
    initializePortfolio();
    
    // Setup wallet event listeners
    const handleWalletUpdate = (wallets: Map<string, WalletInfo>) => {
      setConnectedWallets(new Map(wallets));
      updatePortfolioMetrics(wallets);
    };

    const handlePriceUpdate = (prices: Map<string, number>) => {
      if (connectedWallets.size > 0) {
        updatePortfolioMetrics(connectedWallets);
      }
    };

    // Add listeners
    walletConnector.addListener(handleWalletUpdate);
    walletConnector.addPriceListener(handlePriceUpdate);
    walletIntegrationService.addEventListener(handleLegacyWalletEvent);

    // Auto-refresh interval
    let refreshInterval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        if (!refreshing) {
          refreshPortfolio();
        }
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      walletConnector.removeListener(handleWalletUpdate);
      walletConnector.removePriceListener(handlePriceUpdate);
      walletIntegrationService.removeEventListener(handleLegacyWalletEvent);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh, refreshing, connectedWallets]);

  // Initialize portfolio systems
  const initializePortfolio = useCallback(async () => {
    try {
      setLoading(true);
      
      // Initialize market condition analysis
      const regime = portfolioAnalytics.analyzeMarketRegime();
      setMarketCondition({
        regime: regime.currentRegime,
        confidence: regime.confidence,
        recommendation: regime.portfolioSuitability.suggestions[0] || 'Monitor market conditions',
        riskLevel: regime.currentRegime === 'volatile' ? 'high' : 
                  regime.currentRegime === 'bear' ? 'high' : 'medium'
      });
      
      // Load existing wallet connections
      const existingWallets = walletConnector.getConnectedWallets();
      if (existingWallets.size > 0) {
        setConnectedWallets(existingWallets);
        await updatePortfolioMetrics(existingWallets);
      }
      
    } catch (error) {
      console.error('Failed to initialize portfolio:', error);
      addAlert('error', 'Initialization Failed', 'Failed to initialize portfolio systems');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAvailableWallets = useCallback(() => {
    const wallets = walletIntegrationService.getAvailableWallets();
    setAvailableWallets(wallets);
  }, []);

  // Legacy wallet event handler for backward compatibility
  const handleLegacyWalletEvent = useCallback((event: string, data: any) => {
    if (event === 'connected' || event === 'disconnected') {
      // Trigger refresh of modern wallet connector
      setTimeout(() => {
        const wallets = walletConnector.getConnectedWallets();
        setConnectedWallets(wallets);
        updatePortfolioMetrics(wallets);
      }, 1000);
    }
  }, []);

  // Add alert helper
  const addAlert = useCallback((type: PortfolioAlert['type'], title: string, message: string, action?: string) => {
    const alert: PortfolioAlert = {
      id: `alert-${Date.now()}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      action
    };
    
    setAlerts(prev => [alert, ...prev.slice(0, 4)]);
  }, []);

  // Update portfolio metrics with advanced analytics
  const updatePortfolioMetrics = useCallback(async (wallets: Map<string, WalletInfo>) => {
    try {
      if (wallets.size === 0) {
        setPortfolioMetrics(null);
        setPortfolioPnL(null);
        return;
      }

      // Fetch portfolio data from API
      const response = await fetch('/api/portfolio/data/');
      const result = await response.json();
      
      if (result.success) {
        const { positions, metrics, summary } = result.data;

        // Build real PnL map from positions
        const assetPnLMap = new Map(positions.map((pos: any) => [
          pos.symbol,
          {
            asset: pos.symbol,
            method: selectedCostBasis,
            totalQuantity: pos.quantity || 0,
            avgCostBasis: pos.avgCostBasis || pos.currentPrice || 0,
            currentPrice: pos.currentPrice || 0,
            marketValue: pos.value || 0,
            realizedPnL: pos.realizedPnL || 0,
            realizedGains: Math.max(0, pos.realizedPnL || 0),
            realizedLosses: Math.min(0, pos.realizedPnL || 0),
            unrealizedPnL: pos.unrealizedPnL || 0,
            unrealizedPnLPercent: pos.unrealizedPnLPercent || 0,
            shortTermGains: 0,
            longTermGains: 0,
            totalReturn: pos.unrealizedPnL || 0,
            totalReturnPercent: pos.unrealizedPnLPercent || 0,
            holdingPeriod: 0,
            volatility: pos.volatility || 0.5,
            maxDrawdown: pos.maxDrawdown || 0,
            sharpeRatio: 0,
            lots: [],
            transactions: [],
            lastUpdated: Date.now(),
          }
        ]));

        // Build PortfolioPnL for analytics service
        const portfolioPnLData = {
          totalValue: metrics.totalValue,
          totalCost: metrics.totalCost || metrics.totalValue - metrics.totalPnL,
          totalRealizedPnL: 0,
          totalUnrealizedPnL: metrics.totalPnL,
          totalPnL: metrics.totalPnL,
          totalPnLPercent: metrics.totalValue > 0 ? (metrics.totalPnL / (metrics.totalValue - metrics.totalPnL)) * 100 : 0,
          totalShortTermGains: 0,
          totalLongTermGains: 0,
          taxLiability: 0,
          bestPerformer: '',
          worstPerformer: '',
          winRate: 0,
          portfolioVolatility: 0,
          portfolioSharpe: 0,
          maxDrawdown: 0,
          assetPnL: assetPnLMap,
          lastUpdated: Date.now(),
        };

        // Calculate real metrics using analytics service
        const realRiskMetrics = portfolioAnalytics.calculateRiskMetrics(portfolioPnLData as any);
        const assetNames = positions.map((p: any) => p.symbol);
        const correlationMatrix = portfolioAnalytics.calculateCorrelationMatrix(assetNames);
        const realHealthScore = portfolioAnalytics.calculatePortfolioHealthScore(portfolioPnLData as any, realRiskMetrics, correlationMatrix);
        const realStressTests = portfolioAnalytics.performStressTests(portfolioPnLData as any);

        // Update portfolio metrics with REAL computed data
        setPortfolioMetrics({
          totalValue: metrics.totalValue,
          totalPnL: metrics.totalPnL,
          unrealizedPnL: metrics.totalPnL,
          realizedPnL: 0,
          riskMetrics: {
            volatility: realRiskMetrics.volatility,
            beta: realRiskMetrics.beta,
            sharpeRatio: realRiskMetrics.sharpeRatio,
            maxDrawdown: realRiskMetrics.maxDrawdown,
            valueAtRisk: realRiskMetrics.valueAtRisk,
            expectedShortfall: realRiskMetrics.expectedShortfall,
            informationRatio: realRiskMetrics.informationRatio,
            trackingError: realRiskMetrics.trackingError,
            sortinoRatio: realRiskMetrics.sortinoRatio,
            alpha: realRiskMetrics.alpha,
          },
          healthScore: {
            overall: realHealthScore.overall,
            diversification: realHealthScore.diversification,
            riskManagement: realHealthScore.riskManagement,
            performance: realHealthScore.performance,
            efficiency: realHealthScore.efficiency,
            strengths: realHealthScore.strengths || [],
            weaknesses: realHealthScore.weaknesses || [],
            recommendations: realHealthScore.recommendations.map((r: any) => ({
              type: r.type,
              priority: r.priority as 'high' | 'medium' | 'low',
              description: r.description,
              impact: {
                riskReduction: r.impact?.riskReduction || 0,
                returnIncrease: r.impact?.returnIncrease || 0,
                diversificationImprovement: r.impact?.diversificationImprovement || 0,
              },
              actions: {
                sell: [],
                buy: [],
              },
            }))
          },
          stressTests: realStressTests.map(st => ({
            scenario: st.scenario,
            description: st.description,
            impact: {
              portfolioValue: st.impact.portfolioValue,
              percentChange: st.impact.percentChange,
              worstAsset: st.impact.worstAsset,
              bestAsset: st.impact.bestAsset,
            },
            riskMeasures: st.riskMeasures,
            timeToRecover: st.timeToRecover,
            probability: st.probability,
          })),
          costBasisMethod: selectedCostBasis
        });

        // Compute real daily PnL from position data
        const dailyPnL = metrics.dailyChange || 0;

        // Update portfolio P&L with real structure
        setPortfolioPnL({
          totalUnrealizedPnL: metrics.totalPnL,
          totalRealizedPnL: 0,
          totalPnL: metrics.totalPnL,
          totalPnLPercent: metrics.totalValue > 0 ? (metrics.totalPnL / metrics.totalValue) * 100 : 0,
          totalValue: metrics.totalValue,
          totalCost: 0,
          totalShortTermGains: 0,
          totalLongTermGains: 0,
          taxLiability: 0,
          bestPerformer: '',
          worstPerformer: '',
          winRate: 0,
          portfolioVolatility: 0,
          portfolioSharpe: 0,
          maxDrawdown: 0,
          assetPnL: new Map(positions.map((pos: any) => [
            pos.symbol,
            {
              unrealizedPnL: pos.unrealizedPnL,
              realizedPnL: 0,
              totalPnL: pos.unrealizedPnL,
              percentChange: pos.unrealizedPnLPercent
            }
          ])),
          lastUpdated: Date.now()
        } as any);
        
      } else {
        throw new Error(result.message || 'Failed to fetch portfolio data');
      }
      
    } catch (error) {
      console.error('Failed to update portfolio metrics:', error);
      addAlert('error', 'Metrics Update Failed', 'Could not calculate portfolio metrics');
    }
  }, [selectedCostBasis, addAlert]);

  // Generate portfolio alerts based on analysis
  const generatePortfolioAlerts = useCallback((healthScore: PortfolioHealthScore, riskMetrics: RiskMetrics, stressTests: StressTestResult[]) => {
    const newAlerts: PortfolioAlert[] = [];
    
    // Health score alerts
    if (healthScore.overall < 40) {
      newAlerts.push({
        id: `health-${Date.now()}`,
        type: 'error',
        title: 'Poor Portfolio Health',
        message: `Portfolio health score is ${healthScore.overall}/100. Immediate attention required.`,
        timestamp: Date.now()
      });
    } else if (healthScore.overall < 70) {
      newAlerts.push({
        id: `health-${Date.now()}`,
        type: 'warning',
        title: 'Portfolio Needs Attention',
        message: `Portfolio health score is ${healthScore.overall}/100. Consider optimization.`,
        timestamp: Date.now()
      });
    }
    
    // Risk alerts
    if (riskMetrics.volatility > 0.8) {
      newAlerts.push({
        id: `risk-${Date.now()}`,
        type: 'warning',
        title: 'High Volatility',
        message: `Portfolio volatility is ${(riskMetrics.volatility * 100).toFixed(1)}%. Consider risk reduction.`,
        timestamp: Date.now()
      });
    }
    
    // Stress test alerts
    const worstStressTest = stressTests.reduce((worst, test) => 
      test.impact.percentChange < worst.impact.percentChange ? test : worst
    );
    
    if (worstStressTest.impact.percentChange < -30) {
      newAlerts.push({
        id: `stress-${Date.now()}`,
        type: 'warning',
        title: 'High Stress Test Impact',
        message: `${worstStressTest.scenario} could result in ${worstStressTest.impact.percentChange.toFixed(1)}% loss.`,
        timestamp: Date.now()
      });
    }
    
    // Recommendation alerts
    healthScore.recommendations.forEach((rec, index) => {
      if (rec.priority === 'high') {
        newAlerts.push({
          id: `rec-${Date.now()}-${index}`,
          type: 'info',
          title: rec.type.charAt(0).toUpperCase() + rec.type.slice(1),
          message: rec.description,
          timestamp: Date.now(),
          action: 'View Details'
        });
      }
    });
    
    setAlerts(newAlerts.slice(0, 5)); // Keep only 5 most recent alerts
  }, []);

  // Portfolio refresh function
  const refreshPortfolio = useCallback(async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      // Refresh all connected wallets
      await walletConnector.refreshAllWallets();
      
      // The wallet listener will automatically update the portfolio metrics
      addAlert('success', 'Portfolio Updated', 'All wallet data has been refreshed');
      
    } catch (error) {
      console.error('Failed to refresh portfolio:', error);
      addAlert('error', 'Refresh Failed', 'Could not refresh portfolio data');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, addAlert]);

  const getWalletName = useCallback((walletType: WalletType): string => {
    switch (walletType) {
      case 'xverse': return 'Xverse';
      case 'unisat': return 'Unisat';
      case 'oyl': return 'OYL Wallet';
      case 'magiceden': return 'Gamma.io';
      default: return walletType;
    }
  }, []);

  // Connect wallet with enhanced error handling
  const connectWallet = useCallback(async (walletType: WalletType) => {
    if (loading || laserEyesConnecting) return;
    
    setLoading(true);
    try {
      addAlert('info', 'Connecting Wallet', `Connecting to ${getWalletName(walletType)}...`);
      
      // Try LaserEyes connection first
      const success = await laserEyesConnect(walletType as any);
      
      if (success) {
        addAlert('success', 'Wallet Connected', `${getWalletName(walletType)} connected successfully`);
        
        // Update portfolio with the connected wallet
        setTimeout(() => {
          if (laserEyesAddress) {
            // Add the wallet to connected wallets
            const newWallet: WalletInfo = {
              address: laserEyesAddress,
              walletType: walletType as any,
              network: 'mainnet',
              connected: true,
              name: walletType || 'Bitcoin Wallet',
              balance: typeof laserEyesBalance === 'number' ? laserEyesBalance : (laserEyesBalance?.total || laserEyesBalance?.confirmed || 0),
              assets: [],
              transactions: [],
              lastSync: Date.now(),
              performance: {
                totalValue: 0,
                totalCost: 0,
                unrealizedPnL: 0,
                realizedPnL: 0,
                totalReturn: 0,
                totalReturnPercent: 0,
                bestPerformer: '',
                worstPerformer: '',
                diversificationScore: 0
              } as any
            };
            
            const updatedWallets = new Map(connectedWallets);
            updatedWallets.set(laserEyesAddress, newWallet);
            setConnectedWallets(updatedWallets);
            updatePortfolioMetrics(updatedWallets);
          }
        }, 1000);
      } else {
        // Fallback to legacy service
        try {
          const account = await walletIntegrationService.connectWallet(walletType);
          await walletIntegrationService.createAuthSession(account.address, walletType);
          
          addAlert('success', 'Wallet Connected', `${getWalletName(walletType)} connected successfully`);
          
          // Wait for the wallet to be processed
          setTimeout(() => {
            const wallets = walletConnector.getConnectedWallets();
            setConnectedWallets(wallets);
            updatePortfolioMetrics(wallets);
          }, 2000);
        } catch (legacyError) {
          throw laserEyesError || legacyError;
        }
      }
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      addAlert('error', 'Connection Failed', `Failed to connect ${getWalletName(walletType)}: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [loading, laserEyesConnecting, getWalletName, addAlert, updatePortfolioMetrics, laserEyesConnect, laserEyesAddress, laserEyesBalance, laserEyesError, connectedWallets]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async (address: string) => {
    try {
      // Try LaserEyes disconnect first if it's the connected wallet
      if (laserEyesAddress === address) {
        await laserEyesDisconnect();
      } else {
        walletConnector.disconnect(address);
      }
      
      // Remove from connected wallets
      const updatedWallets = new Map(connectedWallets);
      updatedWallets.delete(address);
      setConnectedWallets(updatedWallets);
      updatePortfolioMetrics(updatedWallets);
      
      addAlert('info', 'Wallet Disconnected', 'Wallet has been disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      addAlert('error', 'Disconnect Failed', 'Could not disconnect wallet');
    }
  }, [addAlert, laserEyesAddress, laserEyesDisconnect, connectedWallets, updatePortfolioMetrics]);

  // Asset icon helper
  const getAssetIcon = useCallback((type: string) => {
    switch (type?.toLowerCase()) {
      case 'bitcoin': return <Bitcoin className="w-5 h-5 text-orange-400" />;
      case 'ordinals': return <Gem className="w-5 h-5 text-purple-400" />;
      case 'runes': return <Hash className="w-5 h-5 text-blue-400" />;
      case 'brc20': return <Coins className="w-5 h-5 text-green-400" />;
      case 'rare-sats': return <Target className="w-5 h-5 text-yellow-400" />;
      default: return <Coins className="w-5 h-5 text-gray-400" />;
    }
  }, []);

  // Alert icon helper
  const getAlertIcon = useCallback((type: PortfolioAlert['type']) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'info': return <Eye className="w-4 h-4 text-blue-400" />;
      default: return <Eye className="w-4 h-4 text-gray-400" />;
    }
  }, []);

  // Risk level color helper
  const getRiskLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  }, []);

  // Format currency helper
  const formatCurrency = useCallback((amount: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  }, []);

  // Format percentage helper
  const formatPercentage = useCallback((value: number, decimals: number = 2) => {
    const formatted = value.toFixed(decimals);
    return `${value >= 0 ? '+' : ''}${formatted}%`;
  }, []);

  return (
    <TopNavLayout>
      <div className="bg-black min-h-screen">
        {/* Bloomberg Terminal Header */}
        {/* Enhanced Bloomberg Terminal Header */}
        <div className="border-b-2 border-orange-500">
          <div className="grid grid-cols-12 gap-0 text-orange-500 font-mono text-xs">
            <div className="col-span-2 p-3 border-r border-orange-500/30">
              <div className="text-[10px] opacity-60">CYPHER ORDi PORTFOLIO</div>
              <div className="text-lg font-bold">ADVANCED ANALYTICS</div>
              {marketCondition && (
                <div className="text-[9px] mt-1">
                  <span className={getRiskLevelColor(marketCondition.riskLevel)}>
                    {marketCondition.regime.toUpperCase()}
                  </span>
                  <span className="opacity-60 ml-1">
                    {(marketCondition.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
            <div className="col-span-10 flex items-center">
              <div className="flex-1 grid grid-cols-6 gap-0">
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">TOTAL VALUE</div>
                  <div className="text-sm font-bold text-green-400">
                    {portfolioMetrics ? formatCurrency(portfolioMetrics.totalValue) : '$0.00'}
                  </div>
                  {portfolioMetrics && (
                    <div className="text-[9px] opacity-60">
                      {connectedWallets.size} Wallets
                    </div>
                  )}
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">UNREALIZED P&L</div>
                  <div className={`text-sm font-bold ${
                    (portfolioMetrics?.unrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {portfolioMetrics ? formatCurrency(portfolioMetrics.unrealizedPnL) : '$0.00'}
                  </div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">HEALTH SCORE</div>
                  <div className={`text-sm font-bold ${
                    !portfolioMetrics ? 'text-gray-400' :
                    portfolioMetrics.healthScore.overall >= 80 ? 'text-green-400' :
                    portfolioMetrics.healthScore.overall >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {portfolioMetrics ? `${portfolioMetrics.healthScore.overall}/100` : '--'}
                  </div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">SHARPE RATIO</div>
                  <div className="text-sm font-bold text-orange-400">
                    {portfolioMetrics ? portfolioMetrics.riskMetrics.sharpeRatio.toFixed(2) : '--'}
                  </div>
                </div>
                <div className="p-3 border-r border-orange-500/30">
                  <div className="text-[10px] opacity-60">VOLATILITY</div>
                  <div className="text-sm font-bold text-blue-400">
                    {portfolioMetrics ? formatPercentage(portfolioMetrics.riskMetrics.volatility * 100, 1) : '--'}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] opacity-60">{new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })}</div>
                  <div className="text-sm font-bold animate-pulse flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    LIVE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="p-4">
          {/* Portfolio Alerts Bar */}
          {alerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className={`flex items-center gap-3 p-3 rounded border ${
                  alert.type === 'error' ? 'bg-red-900/20 border-red-500/30' :
                  alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                  alert.type === 'success' ? 'bg-green-900/20 border-green-500/30' :
                  'bg-blue-900/20 border-blue-500/30'
                }`}>
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="text-sm font-bold text-orange-500">{alert.title}</div>
                    <div className="text-xs text-gray-400">{alert.message}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-orange-500 font-mono">ADVANCED PORTFOLIO TERMINAL</h1>
              
              {/* Cost Basis Method Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-500/60 font-mono">METHOD:</span>
                <select 
                  value={selectedCostBasis}
                  onChange={(e) => setSelectedCostBasis(e.target.value as CostBasisMethod)}
                  className="bg-black border border-orange-500/30 text-orange-500 text-xs font-mono px-2 py-1 rounded"
                >
                  <option value="FIFO">FIFO</option>
                  <option value="LIFO">LIFO</option>
                  <option value="AVCO">AVCO</option>
                  <option value="SPEC">SPEC</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`font-mono text-xs ${
                  autoRefresh ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-400 hover:bg-gray-500/10'
                }`}
              >
                <Zap className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                AUTO-REFRESH
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshPortfolio}
                disabled={refreshing}
                className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'REFRESHING' : 'REFRESH'}
              </Button>
              
              <Badge className={`font-mono ${
                connectedWallets.size > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}>
                <Activity className="w-3 h-3 mr-1" />
                {connectedWallets.size > 0 ? 'LIVE DATA' : 'NO DATA'}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-gray-900 border border-orange-500/30">
              <TabsTrigger value="overview" className="font-mono">OVERVIEW</TabsTrigger>
              <TabsTrigger value="analytics" className="font-mono">ANALYTICS</TabsTrigger>
              <TabsTrigger value="risk" className="font-mono">RISK MGMT</TabsTrigger>
              <TabsTrigger value="performance" className="font-mono">PERFORMANCE</TabsTrigger>
              <TabsTrigger value="wallets" className="font-mono">WALLETS</TabsTrigger>
              <TabsTrigger value="tax" className="font-mono">TAX REPORT</TabsTrigger>
            </TabsList>

            {/* Enhanced Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Advanced Portfolio Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-orange-500" />
                      <h3 className="text-sm font-bold text-orange-500 font-mono">TOTAL VALUE</h3>
                    </div>
                    <div className="text-xs text-orange-500/60 font-mono">
                      {portfolioMetrics?.costBasisMethod || 'FIFO'}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {portfolioMetrics ? formatCurrency(portfolioMetrics.totalValue) : '$0.00'}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {connectedWallets.size} Wallets • {portfolioPnL?.assetPnL.size || 0} Assets
                  </div>
                  {portfolioMetrics && (
                    <div className="text-xs text-green-400 font-mono mt-1">
                      Cost Basis: {formatCurrency(portfolioMetrics.totalValue - portfolioMetrics.unrealizedPnL)}
                    </div>
                  )}
                </div>

                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-bold text-orange-500 font-mono">UNREALIZED P&L</h3>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    (portfolioMetrics?.unrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {portfolioMetrics ? formatCurrency(portfolioMetrics.unrealizedPnL) : '$0.00'}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {portfolioPnL ? formatPercentage(portfolioPnL.totalPnLPercent) : '0.00%'} Return
                  </div>
                  {portfolioMetrics && portfolioMetrics.realizedPnL !== 0 && (
                    <div className="text-xs text-blue-400 font-mono mt-1">
                      Realized: {formatCurrency(portfolioMetrics.realizedPnL)}
                    </div>
                  )}
                </div>

                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm font-bold text-orange-500 font-mono">BEST PERFORMER</h3>
                  </div>
                  <div className="text-xl font-bold text-green-400 font-mono">
                    {portfolioPnL?.bestPerformer || 'N/A'}
                  </div>
                  <div className="text-xs text-green-400 font-mono">
                    +{portfolioMetrics?.riskMetrics.alpha?.toFixed(1) || 'N/A'}% Alpha
                  </div>
                </div>

                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-orange-500 font-mono">RISK SCORE</h3>
                  </div>
                  <div className={`text-xl font-bold font-mono ${
                    !portfolioMetrics ? 'text-gray-400' :
                    portfolioMetrics.healthScore.riskManagement >= 80 ? 'text-green-400' :
                    portfolioMetrics.healthScore.riskManagement >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {portfolioMetrics ? `${portfolioMetrics.healthScore.riskManagement}/100` : '--'}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Vol: {portfolioMetrics ? formatPercentage(portfolioMetrics.riskMetrics.volatility * 100, 1) : '--'}
                  </div>
                </div>
              </div>

              {/* Enhanced Portfolio Holdings Table */}
              <div className="bg-black border border-orange-500/30">
                <div className="border-b border-orange-500/30 p-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-orange-500 font-mono">PORTFOLIO HOLDINGS</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      {portfolioPnL?.assetPnL.size || 0} POSITIONS
                    </Badge>
                    <ExportButton
                      type="portfolio"
                      data={portfolioPnL ? Array.from(portfolioPnL.assetPnL.entries()).map(([asset, calc]) => ({
                        asset: calc.asset,
                        quantity: calc.totalQuantity,
                        avgCost: calc.avgCostBasis,
                        currentPrice: calc.currentPrice,
                        marketValue: calc.marketValue,
                        unrealizedPnL: calc.unrealizedPnL,
                        returnPercent: calc.totalReturnPercent,
                        holdingPeriod: calc.holdingPeriod,
                        lots: calc.lots.length
                      })) : []}
                      size="sm"
                      variant={"ghost" as any}
                      className="text-orange-500/60 hover:text-orange-500"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-10 gap-0 text-[10px] font-mono text-orange-500/60 border-b border-orange-500/30 p-2 min-w-[900px]">
                    <div className="col-span-2">ASSET</div>
                    <div className="text-right">QUANTITY</div>
                    <div className="text-right">AVG COST</div>
                    <div className="text-right">CURRENT</div>
                    <div className="text-right">VALUE</div>
                    <div className="text-right">UNREALIZED</div>
                    <div className="text-right">RETURN %</div>
                    <div className="text-right">ALLOCATION</div>
                    <div className="text-center">ACTIONS</div>
                  </div>
                  
                  {portfolioPnL ? Array.from(portfolioPnL.assetPnL.entries()).map(([asset, calc], index) => (
                    <div key={index} className="grid grid-cols-10 gap-0 text-xs font-mono border-b border-orange-500/10 p-2 hover:bg-orange-500/5 min-w-[900px]">
                      <div className="col-span-2 flex items-center gap-2">
                        {getAssetIcon(calc.asset)}
                        <div>
                          <div className="text-orange-500 font-bold">{calc.asset}</div>
                          <div className="text-[10px] text-orange-500/60">
                            {calc.holdingPeriod}d • {calc.lots.length} lots
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-orange-500">
                        {calc.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </div>
                      <div className="text-right text-orange-500/80">
                        {formatCurrency(calc.avgCostBasis)}
                      </div>
                      <div className="text-right text-orange-500/80">
                        {formatCurrency(calc.currentPrice)}
                      </div>
                      <div className="text-right text-orange-500">
                        {formatCurrency(calc.marketValue)}
                      </div>
                      <div className={`text-right ${calc.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(calc.unrealizedPnL)}
                      </div>
                      <div className={`text-right ${calc.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercentage(calc.totalReturnPercent)}
                      </div>
                      <div className="text-right text-orange-500/60">
                        {((calc.marketValue / portfolioMetrics!.totalValue) * 100).toFixed(1)}%
                      </div>
                      <div className="text-center">
                        <Button size="sm" variant="ghost" className="text-orange-500/60 hover:text-orange-500 text-[10px] px-1">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-orange-500/60">
                      No assets found. Connect a wallet to view portfolio.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Advanced Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Performance Attribution */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">PERFORMANCE ATTRIBUTION</h3>
                  </div>
                  <div className="p-4">
                    {portfolioPnL && portfolioMetrics ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Asset Selection:</span>
                          <span className={portfolioMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {portfolioMetrics.totalPnL >= 0 ? '+' : ''}{formatPercentage(portfolioMetrics.riskMetrics.alpha || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Risk-Adjusted Return:</span>
                          <span className={portfolioMetrics.riskMetrics.sharpeRatio >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {portfolioMetrics.riskMetrics.sharpeRatio >= 0 ? '+' : ''}{formatPercentage(portfolioMetrics.riskMetrics.sharpeRatio)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Volatility:</span>
                          <span className="text-yellow-400">{formatPercentage(portfolioMetrics.riskMetrics.volatility * 100)}</span>
                        </div>
                        <div className="border-t border-orange-500/30 pt-2 mt-2">
                          <div className="flex justify-between text-sm font-mono font-bold">
                            <span className="text-orange-500">Total Alpha:</span>
                            <span className={`${(portfolioMetrics.riskMetrics.alpha || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(portfolioMetrics.riskMetrics.alpha || 0) >= 0 ? '+' : ''}{formatPercentage(portfolioMetrics.riskMetrics.alpha || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-orange-500/60 text-sm">No data available</div>
                    )}
                  </div>
                </div>

                {/* Market Regime Analysis */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">MARKET REGIME</h3>
                  </div>
                  <div className="p-4">
                    {marketCondition ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-orange-500/60 text-xs font-mono">Current Regime:</span>
                          <Badge className={`font-mono ${
                            marketCondition.regime === 'bull' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            marketCondition.regime === 'bear' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            marketCondition.regime === 'volatile' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {marketCondition.regime.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Confidence:</span>
                          <span className="text-orange-500">{(marketCondition.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Risk Level:</span>
                          <span className={getRiskLevelColor(marketCondition.riskLevel)}>
                            {marketCondition.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <div className="border-t border-orange-500/30 pt-2 mt-2">
                          <div className="text-xs text-orange-500/80">
                            {marketCondition.recommendation}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-orange-500/60 text-sm">Analyzing market conditions...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Correlation Matrix */}
              {portfolioPnL && portfolioPnL.assetPnL.size > 1 && (
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">ASSET CORRELATION MATRIX</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-2 text-xs font-mono">
                      {Array.from(portfolioPnL.assetPnL.keys()).map((asset1, i) => (
                        <div key={i} className="grid grid-cols-6 gap-2">
                          <div className="text-orange-500 truncate">{asset1}</div>
                          {Array.from(portfolioPnL.assetPnL.keys()).slice(0, 5).map((asset2, j) => (
                            <div key={j} className={`text-center p-1 rounded ${
                              i === j ? 'bg-orange-500/20 text-orange-500' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {i === j ? '1.00' : '0.50'}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Risk Management Tab */}
            <TabsContent value="risk" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Risk Metrics */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">RISK METRICS</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {portfolioMetrics ? (
                      <>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Portfolio Volatility:</span>
                          <span className="text-orange-500">{formatPercentage(portfolioMetrics.riskMetrics.volatility * 100, 1)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Max Drawdown:</span>
                          <span className="text-red-400">-{formatPercentage(portfolioMetrics.riskMetrics.maxDrawdown, 1)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">VaR (95%):</span>
                          <span className="text-red-400">{formatPercentage(portfolioMetrics.riskMetrics.valueAtRisk * 100, 1)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Beta (vs BTC):</span>
                          <span className="text-orange-500">{portfolioMetrics.riskMetrics.beta?.toFixed(2) ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Sharpe Ratio:</span>
                          <span className={portfolioMetrics.riskMetrics.sharpeRatio > 1 ? 'text-green-400' : 'text-yellow-400'}>
                            {portfolioMetrics.riskMetrics.sharpeRatio.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-orange-500/60 text-sm">No risk data available</div>
                    )}
                  </div>
                </div>

                {/* Portfolio Health */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">PORTFOLIO HEALTH</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {portfolioMetrics ? (
                      <>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Overall Score:</span>
                          <span className={`font-bold ${
                            portfolioMetrics.healthScore.overall >= 80 ? 'text-green-400' :
                            portfolioMetrics.healthScore.overall >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {portfolioMetrics.healthScore.overall}/100
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Diversification:</span>
                          <span className="text-blue-400">{portfolioMetrics.healthScore.diversification}/100</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Risk Management:</span>
                          <span className="text-purple-400">{portfolioMetrics.healthScore.riskManagement}/100</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-orange-500/60">Performance:</span>
                          <span className="text-green-400">{portfolioMetrics.healthScore.performance}/100</span>
                        </div>
                        <div className="border-t border-orange-500/30 pt-2">
                          <div className="text-[10px] text-orange-500/80">
                            {portfolioMetrics.healthScore.strengths[0] || 'Building strength...'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-orange-500/60 text-sm">No health data available</div>
                    )}
                  </div>
                </div>

                {/* Optimization Suggestions */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">RECOMMENDATIONS</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {portfolioMetrics?.healthScore.recommendations.slice(0, 4).map((rec, index) => (
                      <div key={index} className={`p-2 rounded border text-xs ${
                        rec.priority === 'high' ? 'bg-red-900/20 border-red-500/30' :
                        rec.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-500/30' :
                        'bg-blue-900/20 border-blue-500/30'
                      }`}>
                        <div className="font-bold text-orange-500 mb-1">
                          {rec.type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-orange-500/80 text-[10px]">
                          {rec.description.slice(0, 80)}...
                        </div>
                      </div>
                    )) || (
                      <div className="text-orange-500/60 text-sm">No recommendations available</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stress Testing */}
              {portfolioMetrics?.stressTests && (
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">STRESS TEST SCENARIOS</h3>
                  </div>
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-6 gap-0 text-[10px] font-mono text-orange-500/60 border-b border-orange-500/30 p-2">
                      <div>SCENARIO</div>
                      <div className="text-right">IMPACT</div>
                      <div className="text-right">NEW VALUE</div>
                      <div className="text-right">RECOVERY</div>
                      <div className="text-right">PROBABILITY</div>
                      <div className="text-center">SEVERITY</div>
                    </div>
                    {portfolioMetrics.stressTests.map((test, index) => (
                      <div key={index} className="grid grid-cols-6 gap-0 text-xs font-mono border-b border-orange-500/10 p-2 hover:bg-orange-500/5">
                        <div className="text-orange-500">{test.scenario}</div>
                        <div className={`text-right ${test.impact.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(test.impact.percentChange)}
                        </div>
                        <div className="text-right text-orange-500">
                          {formatCurrency(test.impact.portfolioValue)}
                        </div>
                        <div className="text-right text-blue-400">
                          {test.timeToRecover}d
                        </div>
                        <div className="text-right text-orange-500/80">
                          {formatPercentage(test.probability * 100, 0)}
                        </div>
                        <div className={`text-center ${
                          Math.abs(test.impact.percentChange) > 50 ? 'text-red-400' :
                          Math.abs(test.impact.percentChange) > 25 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {Math.abs(test.impact.percentChange) > 50 ? 'HIGH' :
                           Math.abs(test.impact.percentChange) > 25 ? 'MED' : 'LOW'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Portfolio Performance Chart */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">PORTFOLIO PERFORMANCE</h3>
                  </div>
                  <div className="p-4">
                    {laserEyesAddress ? (
                      <PortfolioPerformanceChart address={laserEyesAddress} />
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-orange-500/60 text-sm font-mono text-center">
                          📈 Connect a wallet to view performance
                          <br />
                          <span className="text-xs">Real-time P&L tracking with historical data</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-black border border-orange-500/30">
                  <div className="border-b border-orange-500/30 p-3">
                    <h3 className="text-sm font-bold text-orange-500 font-mono">TOP PERFORMERS</h3>
                  </div>
                  <div className="p-4">
                    {portfolioPnL ? (
                      <div className="space-y-3">
                        {Array.from(portfolioPnL.assetPnL.entries())
                          .sort(([,a], [,b]) => b.totalReturnPercent - a.totalReturnPercent)
                          .slice(0, 5)
                          .map(([asset, calc], index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-orange-500/10">
                              <div className="flex items-center gap-2">
                                {getAssetIcon(calc.asset)}
                                <span className="text-orange-500 text-xs font-mono">{calc.asset}</span>
                              </div>
                              <div className={`text-xs font-mono font-bold ${
                                calc.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {formatPercentage(calc.totalReturnPercent)}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-orange-500/60 text-sm">No performance data available</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="text-orange-500/60 text-xs font-mono mb-1">WIN RATE</div>
                  <div className="text-2xl font-bold text-green-400 font-mono">
                    {portfolioPnL ? `${portfolioPnL.winRate.toFixed(0)}%` : '--'}
                  </div>
                </div>
                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="text-orange-500/60 text-xs font-mono mb-1">BEST TRADE</div>
                  <div className="text-2xl font-bold text-green-400 font-mono">
                    {portfolioPnL ? formatPercentage(Math.max(...Array.from(portfolioPnL.assetPnL.values()).map(a => a.totalReturnPercent)), 0) : '--'}
                  </div>
                </div>
                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="text-orange-500/60 text-xs font-mono mb-1">WORST TRADE</div>
                  <div className="text-2xl font-bold text-red-400 font-mono">
                    {portfolioPnL ? formatPercentage(Math.min(...Array.from(portfolioPnL.assetPnL.values()).map(a => a.totalReturnPercent)), 0) : '--'}
                  </div>
                </div>
                <div className="bg-black border border-orange-500/30 p-4">
                  <div className="text-orange-500/60 text-xs font-mono mb-1">PROFIT FACTOR</div>
                  <div className="text-2xl font-bold text-blue-400 font-mono">
                    {portfolioPnL && portfolioPnL.totalRealizedPnL !== 0 ? 
                      (Math.abs(portfolioPnL.totalUnrealizedPnL) / Math.abs(portfolioPnL.totalRealizedPnL)).toFixed(2) : '--'
                    }
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Wallets Tab */}
            <TabsContent value="wallets" className="space-y-4">
              {/* Connected Wallets */}
              <div className="bg-black border border-orange-500/30">
                <div className="border-b border-orange-500/30 p-3">
                  <h3 className="text-sm font-bold text-orange-500 font-mono">CONNECTED WALLETS</h3>
                </div>
                <div className="p-4 space-y-3">
                  {Array.from(connectedWallets.values()).map((wallet, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-orange-500 font-mono">{wallet.name}</div>
                          <div className="text-xs text-orange-500/60 font-mono">
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white font-mono">
                          {wallet.balance.toFixed(5)} BTC
                        </div>
                        <div className="text-xs text-green-400 font-mono">
                          ${((wallet as any).usdValue || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Wallets */}
              <div className="bg-black border border-orange-500/30">
                <div className="border-b border-orange-500/30 p-3">
                  <h3 className="text-sm font-bold text-orange-500 font-mono">CONNECT NEW WALLET</h3>
                </div>
                <div className="p-4 space-y-3">
                  {availableWallets.map((wallet, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-900/50 rounded border border-gray-700/50 hover:border-orange-500/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">
                          {wallet.type === 'xverse' && '🟠'}
                          {wallet.type === 'unisat' && '🦄'}
                          {wallet.type === 'oyl' && '⚡'}
                          {wallet.type === 'magiceden' && '🎨'}
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold text-orange-500 font-mono">{wallet.name}</div>
                          <div className="text-xs text-orange-500/60 mb-2">
                            {wallet.type === 'xverse' && 'Bitcoin + Ordinals + Stacks + Lightning'}
                            {wallet.type === 'unisat' && 'Bitcoin + Ordinals + Runes + BRC20 + RBF'}
                            {wallet.type === 'oyl' && 'Advanced Bitcoin Features + DeFi + Swaps'}
                            {wallet.type === 'magiceden' && 'NFT Trading + Bitcoin + Ordinals'}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div className={`flex items-center gap-1 ${
                              wallet.isInstalled ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {wallet.isInstalled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {wallet.isInstalled ? 'Installed' : 'Not Installed'}
                            </div>
                            <div className="text-orange-500/60">
                              {Object.entries(wallet.capabilities).filter(([, supported]) => supported).length} features
                            </div>
                          </div>
                          {/* Capability badges */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {wallet.capabilities.bitcoin && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">BTC</Badge>}
                            {wallet.capabilities.ordinals && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">ORD</Badge>}
                            {wallet.capabilities.runes && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">RUNES</Badge>}
                            {wallet.capabilities.brc20 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">BRC20</Badge>}
                            {wallet.capabilities.stacks && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">STX</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => connectWallet(wallet.type)}
                          disabled={loading || !wallet.isInstalled}
                          className={`font-mono transition-all ${
                            wallet.isInstalled 
                              ? 'bg-orange-500 hover:bg-orange-600 text-black' 
                              : 'bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              CONNECTING...
                            </div>
                          ) : wallet.isInstalled ? (
                            'CONNECT'
                          ) : (
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              INSTALL
                            </div>
                          )}
                        </Button>
                        {!wallet.isInstalled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-500/60 hover:text-orange-500 text-xs"
                            onClick={() => window.open(wallet.website, '_blank')}
                          >
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tax Report Tab */}
            <TabsContent value="tax" className="space-y-4">
              {laserEyesAddress ? (
                <TaxReportGenerator />
              ) : (
                <div className="bg-black border border-orange-500/30 rounded p-8">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-orange-500/40 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-orange-500 font-mono mb-2">TAX REPORTING</h3>
                    <p className="text-orange-500/60 text-sm font-mono">
                      Connect a wallet to generate tax reports
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TopNavLayout>
  );
}

function PortfolioAccessGate() {
  const { isPremium, isVerifying, accessTier } = usePremium();

  if (isVerifying) {
    return (
      <TopNavLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[#666] text-sm font-mono">VERIFYING ACCESS...</p>
          </div>
        </div>
      </TopNavLayout>
    );
  }

  if (!isPremium) {
    return (
      <TopNavLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-[#FF6B00]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono mb-2">PREMIUM ACCESS REQUIRED</h2>
              <p className="text-[#666] text-sm font-mono leading-relaxed">
                Portfolio analytics is available to YHP holders, VIP wallets, and premium subscribers.
              </p>
            </div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm font-mono">
                <Gem className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span className="text-[#999]">Hold a Yield Hacker Pass (YHP) NFT</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-mono">
                <Wallet className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span className="text-[#999]">Connect a VIP wallet</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-mono">
                <Zap className="w-4 h-4 text-[#00FF41] shrink-0" />
                <span className="text-[#999]">Purchase a Pro or Elite plan</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <a
                href="/pricing"
                className="w-full py-3 bg-[#FF6B00] hover:bg-[#FF8C00] text-black font-bold font-mono text-sm rounded transition-colors text-center"
              >
                VIEW PLANS
              </a>
              <a
                href="/dashboard"
                className="w-full py-3 border border-[#333] hover:border-[#FF6B00]/40 text-[#999] hover:text-white font-mono text-sm rounded transition-colors text-center"
              >
                BACK TO DASHBOARD
              </a>
            </div>
          </div>
        </div>
      </TopNavLayout>
    );
  }

  return <PortfolioPageContent />;
}

export default function PortfolioPage() {
  return (
    <ErrorBoundary level="page" name="Portfolio">
      <PortfolioAccessGate />
    </ErrorBoundary>
  );
}