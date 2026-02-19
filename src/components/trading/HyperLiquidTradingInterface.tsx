'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Shield,
  Calculator,
  Zap,
  DollarSign,
  Activity,
  Settings
} from 'lucide-react';
import { useHyperLiquid } from '@/hooks/useHyperLiquid';
import { useWallet } from '@/hooks/useWallet';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface OrderData {
  asset: string;
  side: 'long' | 'short';
  size: number;
  leverage: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reduceOnly: boolean;
}

const HyperLiquidTradingInterface: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { portfolio, markets, prices, isLoading, error, refreshAll } = useHyperLiquid(address, {
    enablePortfolio: true,
    enablePrices: true,
    priceAssets: ['BTC', 'ETH', 'SOL', 'DOGE'] // Default assets for pricing
  });

  // Form state
  const [orderData, setOrderData] = useState<OrderData>({
    asset: 'BTC',
    side: 'long',
    size: 0,
    leverage: 1,
    orderType: 'market',
    reduceOnly: false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedLiquidation, setEstimatedLiquidation] = useState(0);
  const [riskWarnings, setRiskWarnings] = useState<string[]>([]);

  // Available assets from markets
  const availableAssets = useMemo(() => {
    if (!markets) return ['BTC', 'ETH', 'SOL'];
    return markets.map((market: any) => market.name).slice(0, 20); // Limit to first 20
  }, [markets]);

  // Current price for selected asset
  const currentPrice = useMemo(() => {
    if (!prices || !orderData.asset) return 0;
    return prices[orderData.asset]?.price || 0;
  }, [prices, orderData.asset]);

  // Calculate estimated costs and risks
  useEffect(() => {
    if (!currentPrice || !orderData.size || !orderData.leverage) return;

    const notionalValue = orderData.size * currentPrice;
    const margin = notionalValue / orderData.leverage;
    setEstimatedCost(margin);

    // Calculate estimated liquidation price
    const buffer = 0.95; // 5% buffer
    let liquidationPrice = 0;
    
    if (orderData.side === 'long') {
      liquidationPrice = currentPrice * (1 - (1 / orderData.leverage) * buffer);
    } else {
      liquidationPrice = currentPrice * (1 + (1 / orderData.leverage) * buffer);
    }
    
    setEstimatedLiquidation(liquidationPrice);

    // Generate risk warnings
    const warnings: string[] = [];
    
    if (orderData.leverage > 10) {
      warnings.push('High leverage detected - increased liquidation risk');
    }
    
    if (notionalValue > 10000) {
      warnings.push('Large position size - consider position sizing');
    }
    
    if (portfolio) {
      const totalValue = portfolio.totalPortfolioValue;
      if (margin > totalValue * 0.3) {
        warnings.push('Position uses >30% of portfolio - high concentration risk');
      }
    }

    setRiskWarnings(warnings);
  }, [currentPrice, orderData, portfolio]);

  // Handle form updates
  const updateOrderData = (field: keyof OrderData, value: any) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // TODO: Implement actual order submission via HyperLiquid API
      
      // Simulate order submission
      alert(`Order submitted: ${orderData.side.toUpperCase()} ${orderData.size} ${orderData.asset} at ${orderData.leverage}x leverage`);
      
      // Reset form
      setOrderData(prev => ({
        ...prev,
        size: 0,
        stopLoss: undefined,
        takeProfit: undefined
      }));
      
      // Refresh data
      refreshAll();
    } catch (error) {
      console.error('Order submission error:', error);
      alert('Failed to submit order');
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

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
            <p className="text-gray-600">Please connect your wallet to access trading.</p>
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
          <h2 className="text-2xl font-bold">HyperLiquid Trading</h2>
          <p className="text-gray-600">Open and manage perpetual positions</p>
        </div>
        <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
          <Activity className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Place Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="asset">Asset</Label>
                  <Select 
                    value={orderData.asset} 
                    onValueChange={(value) => updateOrderData('asset', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssets.map(asset => (
                        <SelectItem key={asset} value={asset}>
                          {asset}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Price</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {formatCurrency(currentPrice)}
                  </div>
                </div>
              </div>

              {/* Side Selection */}
              <div>
                <Label>Position Side</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant={orderData.side === 'long' ? 'default' : 'outline'}
                    onClick={() => updateOrderData('side', 'long')}
                    className={orderData.side === 'long' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Long
                  </Button>
                  <Button
                    variant={orderData.side === 'short' ? 'default' : 'outline'}
                    onClick={() => updateOrderData('side', 'short')}
                    className={orderData.side === 'short' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Short
                  </Button>
                </div>
              </div>

              {/* Size and Leverage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    type="number"
                    step="0.01"
                    value={orderData.size}
                    onChange={(e) => updateOrderData('size', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="leverage">Leverage: {orderData.leverage}x</Label>
                  <div className="mt-2">
                    <Slider
                      value={[orderData.leverage]}
                      onValueChange={(value) => updateOrderData('leverage', value[0])}
                      max={50}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1x</span>
                      <span>25x</span>
                      <span>50x</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Type */}
              <div>
                <Label>Order Type</Label>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant={orderData.orderType === 'market' ? 'default' : 'outline'}
                    onClick={() => updateOrderData('orderType', 'market')}
                  >
                    Market
                  </Button>
                  <Button
                    variant={orderData.orderType === 'limit' ? 'default' : 'outline'}
                    onClick={() => updateOrderData('orderType', 'limit')}
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {/* Limit Price (if limit order) */}
              {orderData.orderType === 'limit' && (
                <div>
                  <Label htmlFor="limitPrice">Limit Price</Label>
                  <Input
                    id="limitPrice"
                    type="number"
                    step="0.01"
                    value={orderData.limitPrice || ''}
                    onChange={(e) => updateOrderData('limitPrice', parseFloat(e.target.value) || undefined)}
                    placeholder={formatCurrency(currentPrice)}
                  />
                </div>
              )}

              {/* Advanced Options Toggle */}
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                />
                <Label>Advanced Options</Label>
                <Settings className="h-4 w-4" />
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stopLoss">Stop Loss</Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        step="0.01"
                        value={orderData.stopLoss || ''}
                        onChange={(e) => updateOrderData('stopLoss', parseFloat(e.target.value) || undefined)}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="takeProfit">Take Profit</Label>
                      <Input
                        id="takeProfit"
                        type="number"
                        step="0.01"
                        value={orderData.takeProfit || ''}
                        onChange={(e) => updateOrderData('takeProfit', parseFloat(e.target.value) || undefined)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={orderData.reduceOnly}
                      onCheckedChange={(checked) => updateOrderData('reduceOnly', checked)}
                    />
                    <Label>Reduce Only</Label>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitOrder}
                className="w-full"
                size="lg"
                disabled={!orderData.asset || !orderData.size || isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Place {orderData.side.toUpperCase()} Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary and Risk Assessment */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Notional Value:</span>
                  <span className="font-medium">
                    {formatCurrency(orderData.size * currentPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Required Margin:</span>
                  <span className="font-medium">
                    {formatCurrency(estimatedCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Liquidation:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(estimatedLiquidation)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-600">Position Side:</span>
                  <Badge variant={orderData.side === 'long' ? 'default' : 'secondary'}>
                    {orderData.side.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Leverage:</span>
                  <span className="font-medium">{orderData.leverage}x</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskWarnings.length > 0 ? (
                <div className="space-y-2">
                  {riskWarnings.map((warning, index) => (
                    <Alert key={index} variant="default" className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {warning}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Risk Level: Low</p>
                  <p className="text-sm text-gray-600">No significant risks detected</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Summary */}
          {portfolio && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total P&L:</span>
                  <span className={`font-medium ${portfolio.totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(portfolio.totalUnrealizedPnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Portfolio Value:</span>
                  <span className="font-medium">
                    {formatCurrency(portfolio.totalPortfolioValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Positions:</span>
                  <span className="font-medium">
                    {portfolio.summary.openPositions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Leverage:</span>
                  <span className="font-medium">
                    {portfolio.summary.averageLeverage.toFixed(1)}x
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HyperLiquidTradingInterface;