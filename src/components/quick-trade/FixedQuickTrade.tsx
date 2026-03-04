/**
 * Fixed Quick Trade with Proper Asset Switching
 * Includes centralized state management, real-time updates, and loading states
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowDownUp, 
  Zap, 
  Info, 
  Calculator, 
  TrendingUp, 
  Wallet, 
  CheckCircle, 
  AlertTriangle, 
  Network,
  RefreshCw,
  Loader2,
  Clock,
  DollarSign
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import MultiWalletManager from './MultiWalletManager';
import EnhancedTokenSelector from '../trading/EnhancedTokenSelector';
import useMultiWallet from '@/hooks/useMultiWallet';
import { useAssetManagement } from '@/hooks/useAssetManagement';
import { Token, SUPPORTED_NETWORKS } from '@/types/quickTrade';

// Types
interface Asset {
  symbol: string;
  name: string;
  price: number;
  minOrderSize: number;
  precision: number;
  icon?: string;
  supportedNetworks: string[];
}

interface FractionalOrder {
  asset: string;
  amount: number;
  displayAmount: string;
  totalValueUSD: number;
  unitPrice: number;
  estimatedFees: number;
  network: string;
  walletInfo?: any;
  priceImpact?: number;
}

interface TradeExecution {
  orderId: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  error?: string;
  timestamp: number;
}

// Enhanced Fractional Trading Service
class EnhancedFractionalTrading {
  private static readonly FEE_PERCENTAGE = 0.0034; // 0.34%
  private static readonly MIN_USD_AMOUNT = 10; // $10 minimum
  
  static calculateFractionalAmount(
    targetValueUSD: number,
    asset: Asset,
    walletInfo?: any
  ): FractionalOrder | null {
    if (targetValueUSD <= 0 || !asset.price) {
      return null;
    }
    
    // Apply minimum amount check
    if (targetValueUSD < this.MIN_USD_AMOUNT) {
      return null;
    }
    
    const rawAmount = targetValueUSD / asset.price;
    const precision = Math.pow(10, asset.precision);
    const amount = Math.floor(rawAmount * precision) / precision;
    
    // Verify minimum order size
    const minOrderUSD = asset.minOrderSize * asset.price;
    if (targetValueUSD < minOrderUSD && targetValueUSD < this.MIN_USD_AMOUNT) {
      return null;
    }
    
    const finalAmount = Math.max(amount, asset.minOrderSize);
    const estimatedFees = targetValueUSD * this.FEE_PERCENTAGE;
    
    // Calculate price impact (simplified)
    const priceImpact = this.calculatePriceImpact(targetValueUSD, asset);
    
    // Determine network based on wallet
    let network = 'Ethereum';
    if (walletInfo) {
      switch (walletInfo.type) {
        case 'bitcoin':
          network = 'Bitcoin';
          break;
        case 'solana':
          network = 'Solana';
          break;
        case 'evm':
          const chainNames: Record<number, string> = {
            1: 'Ethereum',
            42161: 'Arbitrum',
            10: 'Optimism',
            137: 'Polygon',
            8453: 'Base'
          };
          network = chainNames[walletInfo.chainId] || 'Ethereum';
          break;
      }
    }
    
    return {
      asset: asset.symbol,
      amount: finalAmount,
      displayAmount: this.formatAmount(finalAmount, asset.precision),
      totalValueUSD: targetValueUSD,
      unitPrice: asset.price,
      estimatedFees: estimatedFees,
      network,
      walletInfo,
      priceImpact
    };
  }
  
  private static calculatePriceImpact(usdAmount: number, asset: Asset): number {
    // Simplified price impact calculation
    // In reality, this would consider liquidity pools and market depth
    if (usdAmount < 1000) return 0.01; // 0.01% for small trades
    if (usdAmount < 10000) return 0.05; // 0.05% for medium trades
    return 0.1; // 0.1% for large trades
  }
  
  static formatAmount(amount: number, precision: number): string {
    return amount.toFixed(precision).replace(/\.?0+$/, '');
  }
  
  static getMinimumUSD(): number {
    return this.MIN_USD_AMOUNT;
  }
}

// Main Component
const FixedQuickTrade: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('10');
  const [fractionalOrder, setFractionalOrder] = useState<FractionalOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [tradeExecution, setTradeExecution] = useState<TradeExecution | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  
  // Multi-wallet integration
  const multiWallet = useMultiWallet();
  const [activeWalletInfo, setActiveWalletInfo] = useState<any>(null);
  
  // Asset Management Hook
  const {
    selectedAssetSymbol,
    currentAssetPrice,
    assetPrices,
    isLoadingAssetData,
    isLoadingAssetSwitch,
    assetError,
    switchAsset,
    refreshAssetData,
    getAssetDisplayPrice,
    isDataStale,
    clearError
  } = useAssetManagement();
  
  // Assets configuration with live prices
  const assets: Asset[] = useMemo(() => [
    { 
      symbol: 'BTC', 
      name: 'Bitcoin', 
      price: assetPrices['BTC']?.price || 104390.25, 
      minOrderSize: 0.00001, 
      precision: 8,
      supportedNetworks: ['bitcoin']
    },
    { 
      symbol: 'ETH', 
      name: 'Ethereum', 
      price: assetPrices['ETH']?.price || 2285.50, 
      minOrderSize: 0.0001, 
      precision: 6,
      supportedNetworks: ['ethereum', 'arbitrum', 'optimism', 'base']
    },
    { 
      symbol: 'SOL', 
      name: 'Solana', 
      price: assetPrices['SOL']?.price || 98.75, 
      minOrderSize: 0.01, 
      precision: 4,
      supportedNetworks: ['solana']
    },
    { 
      symbol: 'USDC', 
      name: 'USD Coin', 
      price: assetPrices['USDC']?.price || 1.00, 
      minOrderSize: 1, 
      precision: 2,
      supportedNetworks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'solana']
    },
    { 
      symbol: 'MATIC', 
      name: 'Polygon', 
      price: assetPrices['MATIC']?.price || 0.85, 
      minOrderSize: 1, 
      precision: 4,
      supportedNetworks: ['polygon']
    }
  ], [assetPrices]);
  
  // Get current asset
  const currentAsset = useMemo(() => 
    assets.find(a => a.symbol === selectedAssetSymbol),
    [assets, selectedAssetSymbol]
  );
  
  // Get active wallet for current asset
  useEffect(() => {
    if (selectedAssetSymbol) {
      const walletInfo = multiWallet.getActiveWalletForAsset(selectedAssetSymbol);
      setActiveWalletInfo(walletInfo);
    }
  }, [selectedAssetSymbol, multiWallet]);
  
  // Calculate fractional order when inputs change
  const calculateFractional = useCallback(() => {
    const value = parseFloat(inputValue) || 0;
    
    if (!currentAsset) {
      setError('Asset not found');
      setFractionalOrder(null);
      return;
    }
    
    if (value <= 0) {
      setError('Enter an amount greater than zero');
      setFractionalOrder(null);
      return;
    }
    
    if (!activeWalletInfo) {
      setError(`Connect a wallet to trade ${selectedAssetSymbol}`);
      setFractionalOrder(null);
      return;
    }
    
    const minUSD = EnhancedFractionalTrading.getMinimumUSD();
    
    if (value < minUSD) {
      setError(`Minimum amount: $${minUSD.toFixed(2)}`);
      setFractionalOrder(null);
      return;
    }
    
    const order = EnhancedFractionalTrading.calculateFractionalAmount(
      value, 
      currentAsset, 
      activeWalletInfo
    );
    
    if (order) {
      setError('');
      setFractionalOrder(order);
    } else {
      setError('Error calculating trade amount');
      setFractionalOrder(null);
    }
  }, [inputValue, currentAsset, activeWalletInfo, selectedAssetSymbol]);
  
  // Recalculate when dependencies change
  useEffect(() => {
    calculateFractional();
  }, [calculateFractional]);
  
  // Handle asset switching
  const handleAssetSwitch = useCallback(async (newSymbol: string) => {
    try {
      clearError();
      await switchAsset(undefined, newSymbol);
      
      // Clear any existing fractional order
      setFractionalOrder(null);
      setTradeExecution(null);
      
      // Recalculate with new asset
      setTimeout(calculateFractional, 100);
    } catch (error: any) {
      setError(`Failed to switch asset: ${error.message}`);
    }
  }, [switchAsset, clearError, calculateFractional]);
  
  // Auto-connect wallet for asset
  const handleAutoConnect = async () => {
    try {
      await multiWallet.connectForAsset(selectedAssetSymbol);
    } catch (error: any) {
      setError(`Error connecting wallet: ${error.message}`);
    }
  };
  
  // Process trade
  const handleTrade = async () => {
    if (!fractionalOrder || isProcessing || !activeWalletInfo) return;
    
    setIsProcessing(true);
    const executionId = 'trade-' + Date.now();
    
    setTradeExecution({ 
      orderId: executionId, 
      status: 'pending',
      timestamp: Date.now()
    });
    
    try {
      // Simulate wallet validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const txHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      setTradeExecution({
        orderId: executionId,
        status: 'confirmed',
        txHash,
        timestamp: Date.now()
      });
      
      // Reset form after success
      setTimeout(() => {
        setInputValue('10');
        setTradeExecution(null);
        setFractionalOrder(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Trade error:', error);
      setTradeExecution({
        orderId: executionId,
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Quick amount examples
  const quickExamples = [
    { label: '$10', value: 10 },
    { label: '$25', value: 25 },
    { label: '$50', value: 50 },
    { label: '$100', value: 100 },
    { label: '$250', value: 250 },
    { label: '$500', value: 500 }
  ];
  
  // Handle token selection from modal
  const handleTokenSelect = (token: Token) => {
    handleAssetSwitch(token.symbol);
  };
  
  // Get price change indicator
  const getPriceChangeIndicator = () => {
    const priceData = assetPrices[selectedAssetSymbol];
    if (!priceData) return null;
    
    const change = priceData.priceChange24h;
    const isPositive = change >= 0;
    
    return (
      <div className={`flex items-center gap-1 text-sm ${
        isPositive ? 'text-green-500' : 'text-red-500'
      }`}>
        <TrendingUp className={`w-3 h-3 ${!isPositive ? 'rotate-180' : ''}`} />
        <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Quick Trade Card */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              <span>Fixed Quick Trade</span>
              {isLoadingAssetSwitch && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-500 border-green-500">
                0.34% Fee
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWalletManager(!showWalletManager)}
              >
                <Wallet className="h-4 w-4 mr-1" />
                Wallets
              </Button>
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Optimized cross-chain execution with automatic wallet detection and real-time pricing
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Asset Error Display */}
          {assetError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {assetError}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-2 h-auto p-1"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Wallet Status */}
          {activeWalletInfo ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Wallet connected:</strong> {activeWalletInfo.walletType} ({activeWalletInfo.type})
                  </span>
                  <Badge className="bg-green-600 text-white">
                    {fractionalOrder?.network || 'Ready'}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Wallet required for {selectedAssetSymbol}</strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAutoConnect}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Auto-connect
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Asset Selection and Price Display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTokenSelector(true)}
                  className="flex items-center gap-2"
                >
                  <span className="font-semibold">{selectedAssetSymbol}</span>
                  <ArrowDownUp className="w-4 h-4" />
                </Button>
                {currentAsset && (
                  <div className="text-sm text-gray-600">
                    {currentAsset.name}
                  </div>
                )}
              </div>
              
              <div className="text-right">
                {isLoadingAssetData ? (
                  <Skeleton className="h-6 w-24" />
                ) : currentAssetPrice ? (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {getAssetDisplayPrice(selectedAssetSymbol)}
                    </span>
                    {getPriceChangeIndicator()}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshAssetData}
                      className="p-1 h-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-gray-500">Price unavailable</span>
                )}
                
                {isDataStale(selectedAssetSymbol) && (
                  <div className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>Data may be stale</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* USD Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amount in USD</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-10 text-lg"
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isLoadingAssetSwitch}
              />
            </div>
            
            {/* Quick Examples */}
            <div className="flex flex-wrap gap-2 mt-2">
              {quickExamples.map(example => (
                <Button
                  key={example.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputValue(example.value.toString())}
                  className="h-8 px-3 text-sm bg-gray-100 hover:bg-gray-200"
                  disabled={isLoadingAssetSwitch}
                >
                  {example.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Trade Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Live Conversion Display */}
          {fractionalOrder && !error && activeWalletInfo && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
              <div className="flex items-center justify-center text-2xl font-bold">
                <span className="text-gray-600">${fractionalOrder.totalValueUSD}</span>
                <ArrowDownUp className="mx-3 h-5 w-5 text-gray-400" />
                <span className="text-blue-600">
                  {fractionalOrder.displayAmount} {fractionalOrder.asset}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit price:</span>
                    <span className="font-medium">${fractionalOrder.unitPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-medium">{fractionalOrder.network}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fee:</span>
                    <span className="font-medium">${fractionalOrder.estimatedFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price impact:</span>
                    <span className="font-medium text-green-600">
                      {fractionalOrder.priceImpact?.toFixed(3)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Trade Execution Status */}
          {tradeExecution && (
            <Alert className={
              tradeExecution.status === 'confirmed' ? 'border-green-500 bg-green-50' :
              tradeExecution.status === 'failed' ? 'border-red-500 bg-red-50' :
              'border-blue-500 bg-blue-50'
            }>
              <div className="flex items-center gap-2">
                {tradeExecution.status === 'pending' && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
                {tradeExecution.status === 'confirmed' && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                {tradeExecution.status === 'failed' && (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription>
                  {tradeExecution.status === 'pending' && 'Processing transaction...'}
                  {tradeExecution.status === 'confirmed' && (
                    <div>
                      <div>✅ Trade confirmed!</div>
                      <div className="text-xs mt-1">
                        TX: {tradeExecution.txHash?.slice(0, 10)}...
                      </div>
                    </div>
                  )}
                  {tradeExecution.status === 'failed' && (
                    <div>❌ Trade failed: {tradeExecution.error}</div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Smart system automatically detects the best wallet and network for each asset. 
              Prices update in real-time for accurate calculations.
            </AlertDescription>
          </Alert>
          
          {/* Trade Button */}
          <Button
            onClick={handleTrade}
            disabled={!fractionalOrder || isProcessing || !!error || !activeWalletInfo || isLoadingAssetSwitch}
            className="w-full h-12 text-lg font-medium"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : isLoadingAssetSwitch ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Switching asset...
              </span>
            ) : !activeWalletInfo ? (
              `Connect wallet for ${selectedAssetSymbol}`
            ) : (
              `Trade $${inputValue || '0'} for ${selectedAssetSymbol}`
            )}
          </Button>
          
          {/* Status Footer */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                isLoadingAssetData ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              }`} />
              <span>Live prices</span>
            </div>
            <div className="flex items-center gap-1">
              <Network className="w-3 h-3" />
              <span>{multiWallet.totalConnections} wallet(s)</span>
            </div>
            <div className="flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              <span>Real-time calculations</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Multi-Wallet Manager */}
      {showWalletManager && (
        <MultiWalletManager
          selectedAsset={selectedAssetSymbol}
          onWalletChange={setActiveWalletInfo}
          autoConnect={true}
          showRecommendations={true}
        />
      )}
      
      {/* Enhanced Token Selector */}
      <EnhancedTokenSelector
        isOpen={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onTokenSelect={handleTokenSelect}
        selectedNetwork={SUPPORTED_NETWORKS[0]} // Default to Ethereum
        selectedToken={fractionalOrder ? {
          symbol: selectedAssetSymbol,
          name: currentAsset?.name || selectedAssetSymbol,
          address: '0x0000000000000000000000000000000000000000',
          decimals: currentAsset?.precision || 18,
          chainId: 1
        } : null}
        title="Select Asset to Trade"
        autoRefresh={true}
      />
    </div>
  );
};

export default FixedQuickTrade;