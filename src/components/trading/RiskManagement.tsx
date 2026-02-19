'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  AlertTriangle,
  Target,
  TrendingDown,
  Activity,
  Settings,
  Bell,
  Zap,
  DollarSign,
  BarChart3,
  Lock
} from 'lucide-react';
import { useHyperLiquid } from '@/hooks/useHyperLiquid';
import { useWallet } from '@/hooks/useWallet';

interface RiskSettings {
  maxLeverage: number;
  maxPositionSize: number; // Percentage of portfolio
  stopLossEnabled: boolean;
  defaultStopLoss: number; // Percentage
  takeProfitEnabled: boolean;
  defaultTakeProfit: number; // Percentage
  maxDailyLoss: number; // USD amount
  portfolioRiskLimit: number; // Percentage
  autoCloseOnLiquidation: boolean;
  emergencyStopEnabled: boolean;
}

interface RiskAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  position?: string;
}

const RiskManagement: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { portfolio, positions, riskMetrics, alerts, isLoading } = useHyperLiquid(address);

  // Risk settings state
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxLeverage: 10,
    maxPositionSize: 25, // 25% of portfolio
    stopLossEnabled: true,
    defaultStopLoss: 5, // 5%
    takeProfitEnabled: false,
    defaultTakeProfit: 10, // 10%
    maxDailyLoss: 1000, // $1000
    portfolioRiskLimit: 50, // 50%
    autoCloseOnLiquidation: true,
    emergencyStopEnabled: true
  });

  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [emergencyStopActive, setEmergencyStopActive] = useState(false);

  // Calculate real-time risk metrics
  const currentRiskMetrics = useMemo(() => {
    if (!portfolio || !riskMetrics) return null;

    const totalExposure = riskMetrics.totalRisk;
    const portfolioValue = portfolio.totalPortfolioValue;
    const riskExposurePercent = portfolioValue > 0 ? (totalExposure / portfolioValue) * 100 : 0;
    
    const liquidationRisk = positions?.filter(pos => {
      const liquidationDistance = Math.abs(pos.marketPrice - pos.entryPrice) / pos.entryPrice * 100;
      return liquidationDistance > 80; // Position is close to liquidation
    }).length || 0;

    return {
      ...riskMetrics,
      riskExposurePercent,
      liquidationRisk,
      dailyPnL: portfolio.dailyPnl,
      isOverLeveraged: riskMetrics.avgLeverage > riskSettings.maxLeverage,
      isOverExposed: riskExposurePercent > riskSettings.portfolioRiskLimit,
      hasExcessiveDailyLoss: Math.abs(portfolio.dailyPnl) > riskSettings.maxDailyLoss
    };
  }, [portfolio, riskMetrics, positions, riskSettings]);

  // Generate risk alerts
  useEffect(() => {
    if (!currentRiskMetrics || !portfolio) return;

    const newAlerts: RiskAlert[] = [];

    // Check daily loss limit
    if (currentRiskMetrics.hasExcessiveDailyLoss) {
      newAlerts.push({
        id: 'daily-loss',
        type: 'error',
        message: `Daily loss limit exceeded: ${Math.abs(portfolio.dailyPnl).toFixed(2)} > ${riskSettings.maxDailyLoss}`,
        timestamp: Date.now()
      });
    }

    // Check leverage limits
    if (currentRiskMetrics.isOverLeveraged) {
      newAlerts.push({
        id: 'leverage-risk',
        type: 'warning',
        message: `Average leverage (${currentRiskMetrics.avgLeverage.toFixed(1)}x) exceeds limit (${riskSettings.maxLeverage}x)`,
        timestamp: Date.now()
      });
    }

    // Check portfolio exposure
    if (currentRiskMetrics.isOverExposed) {
      newAlerts.push({
        id: 'exposure-risk',
        type: 'warning',
        message: `Portfolio exposure (${currentRiskMetrics.riskExposurePercent.toFixed(1)}%) exceeds limit (${riskSettings.portfolioRiskLimit}%)`,
        timestamp: Date.now()
      });
    }

    // Check liquidation risk
    if (currentRiskMetrics.liquidationRisk > 0) {
      newAlerts.push({
        id: 'liquidation-risk',
        type: 'error',
        message: `${currentRiskMetrics.liquidationRisk} position(s) at high liquidation risk`,
        timestamp: Date.now()
      });
    }

    setRiskAlerts(newAlerts);
  }, [currentRiskMetrics, portfolio, riskSettings]);

  // Emergency stop handler
  const handleEmergencyStop = async () => {
    if (!positions || !address) return;

    try {
      setEmergencyStopActive(true);
      
      // Close all positions (simulation)
      for (const position of positions) {
        if (position.size && Math.abs(position.size) > 0) {
          // await hyperLiquidService.closePosition(address, position.position.coin, position.size, '');
        }
      }
      
      alert('Emergency stop activated - all positions closed');
    } catch (error) {
      console.error('Emergency stop failed:', error);
      alert('Emergency stop failed');
    } finally {
      setEmergencyStopActive(false);
    }
  };

  // Update risk settings
  const updateRiskSettings = (field: keyof RiskSettings, value: any) => {
    setRiskSettings(prev => ({ ...prev, [field]: value }));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Risk Management</h3>
            <p className="text-gray-600">Connect your wallet to access risk management tools.</p>
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
          <h2 className="text-2xl font-bold flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Risk Management
          </h2>
          <p className="text-gray-600">Monitor and control your trading risks</p>
        </div>
        {riskSettings.emergencyStopEnabled && (
          <Button
            variant="destructive"
            onClick={handleEmergencyStop}
            disabled={emergencyStopActive || !positions?.length}
            className="flex items-center"
          >
            <Zap className="h-4 w-4 mr-2" />
            Emergency Stop
          </Button>
        )}
      </div>

      {/* Risk Alerts */}
      {riskAlerts.length > 0 && (
        <div className="space-y-2">
          {riskAlerts.map(alert => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Risk Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Risk Settings</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Monitoring</TabsTrigger>
        </TabsList>

        {/* Risk Dashboard */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overall Risk Level */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Overall Risk Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRiskMetrics ? (
                  <div className="space-y-4">
                    <div className={`p-3 rounded-lg border ${getRiskLevelColor(currentRiskMetrics.leverageRisk)}`}>
                      <div className="font-semibold">{currentRiskMetrics.leverageRisk} Risk</div>
                      <div className="text-sm">Based on leverage and exposure</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Portfolio Exposure</span>
                        <span>{currentRiskMetrics.riskExposurePercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(currentRiskMetrics.riskExposurePercent, 100)} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No risk data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leverage Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Leverage Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRiskMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Leverage:</span>
                      <span className="font-semibold">{currentRiskMetrics.avgLeverage.toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Allowed:</span>
                      <span className="font-semibold">{riskSettings.maxLeverage}x</span>
                    </div>
                    <Progress 
                      value={(currentRiskMetrics.avgLeverage / riskSettings.maxLeverage) * 100} 
                      className={currentRiskMetrics.isOverLeveraged ? 'bg-red-100' : ''}
                    />
                    {currentRiskMetrics.isOverLeveraged && (
                      <Badge variant="destructive">Over Leveraged</Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No leverage data</p>
                )}
              </CardContent>
            </Card>

            {/* Daily P&L Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Daily P&L Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Today's P&L:</span>
                      <span className={`font-semibold ${portfolio.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(portfolio.dailyPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Limit:</span>
                      <span className="font-semibold">{formatCurrency(riskSettings.maxDailyLoss)}</span>
                    </div>
                    <Progress 
                      value={(Math.abs(portfolio.dailyPnl) / riskSettings.maxDailyLoss) * 100}
                      className={currentRiskMetrics?.hasExcessiveDailyLoss ? 'bg-red-100' : ''}
                    />
                    {currentRiskMetrics?.hasExcessiveDailyLoss && (
                      <Badge variant="destructive">Daily Limit Exceeded</Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No P&L data</p>
                )}
              </CardContent>
            </Card>

            {/* Liquidation Risk */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2" />
                  Liquidation Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRiskMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Positions at Risk:</span>
                      <span className="font-semibold">{currentRiskMetrics.liquidationRisk}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Drawdown:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(currentRiskMetrics.maxDrawdown)}
                      </span>
                    </div>
                    {currentRiskMetrics.liquidationRisk > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {currentRiskMetrics.liquidationRisk} position(s) near liquidation
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No liquidation data</p>
                )}
              </CardContent>
            </Card>

            {/* Position Concentration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Position Concentration
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRiskMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Position Risk:</span>
                      <span className="font-semibold">{currentRiskMetrics.positionRisk.toFixed(1)}%</span>
                    </div>
                    <Progress value={currentRiskMetrics.positionRisk} />
                    <div className="text-sm text-gray-600">
                      Risk concentrated in {portfolio?.summary.openPositions || 0} positions
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">No concentration data</p>
                )}
              </CardContent>
            </Card>

            {/* Risk Control Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Risk Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Stop Loss</span>
                    <Badge variant={riskSettings.stopLossEnabled ? 'default' : 'secondary'}>
                      {riskSettings.stopLossEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Auto Close</span>
                    <Badge variant={riskSettings.autoCloseOnLiquidation ? 'default' : 'secondary'}>
                      {riskSettings.autoCloseOnLiquidation ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Emergency Stop</span>
                    <Badge variant={riskSettings.emergencyStopEnabled ? 'default' : 'secondary'}>
                      {riskSettings.emergencyStopEnabled ? 'Ready' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Risk Management Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Leverage Settings */}
              <div>
                <Label htmlFor="maxLeverage">Maximum Leverage</Label>
                <Input
                  id="maxLeverage"
                  type="number"
                  value={riskSettings.maxLeverage}
                  onChange={(e) => updateRiskSettings('maxLeverage', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-600 mt-1">Maximum allowed leverage across all positions</p>
              </div>

              {/* Position Size Settings */}
              <div>
                <Label htmlFor="maxPositionSize">Max Position Size (% of Portfolio)</Label>
                <Input
                  id="maxPositionSize"
                  type="number"
                  value={riskSettings.maxPositionSize}
                  onChange={(e) => updateRiskSettings('maxPositionSize', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>

              {/* Stop Loss Settings */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={riskSettings.stopLossEnabled}
                    onCheckedChange={(checked) => updateRiskSettings('stopLossEnabled', checked)}
                  />
                  <Label>Enable Stop Loss</Label>
                </div>
                {riskSettings.stopLossEnabled && (
                  <div>
                    <Label htmlFor="defaultStopLoss">Default Stop Loss (%)</Label>
                    <Input
                      id="defaultStopLoss"
                      type="number"
                      value={riskSettings.defaultStopLoss}
                      onChange={(e) => updateRiskSettings('defaultStopLoss', parseFloat(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Take Profit Settings */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={riskSettings.takeProfitEnabled}
                    onCheckedChange={(checked) => updateRiskSettings('takeProfitEnabled', checked)}
                  />
                  <Label>Enable Take Profit</Label>
                </div>
                {riskSettings.takeProfitEnabled && (
                  <div>
                    <Label htmlFor="defaultTakeProfit">Default Take Profit (%)</Label>
                    <Input
                      id="defaultTakeProfit"
                      type="number"
                      value={riskSettings.defaultTakeProfit}
                      onChange={(e) => updateRiskSettings('defaultTakeProfit', parseFloat(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Daily Loss Limit */}
              <div>
                <Label htmlFor="maxDailyLoss">Maximum Daily Loss (USD)</Label>
                <Input
                  id="maxDailyLoss"
                  type="number"
                  value={riskSettings.maxDailyLoss}
                  onChange={(e) => updateRiskSettings('maxDailyLoss', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              {/* Portfolio Risk Limit */}
              <div>
                <Label htmlFor="portfolioRiskLimit">Portfolio Risk Limit (%)</Label>
                <Input
                  id="portfolioRiskLimit"
                  type="number"
                  value={riskSettings.portfolioRiskLimit}
                  onChange={(e) => updateRiskSettings('portfolioRiskLimit', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              {/* Emergency Controls */}
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium">Emergency Controls</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={riskSettings.autoCloseOnLiquidation}
                    onCheckedChange={(checked) => updateRiskSettings('autoCloseOnLiquidation', checked)}
                  />
                  <Label>Auto-close positions near liquidation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={riskSettings.emergencyStopEnabled}
                    onCheckedChange={(checked) => updateRiskSettings('emergencyStopEnabled', checked)}
                  />
                  <Label>Enable emergency stop button</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts & Monitoring */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Risk Alerts & Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskAlerts.length > 0 ? (
                <div className="space-y-4">
                  {riskAlerts.map(alert => (
                    <div key={alert.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                          {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                          {alert.type === 'info' && <Activity className="h-5 w-5 text-blue-600" />}
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={alert.type === 'error' ? 'destructive' : 'default'}>
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-600 mb-2">All Clear</h3>
                  <p className="text-gray-600">No active risk alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskManagement;