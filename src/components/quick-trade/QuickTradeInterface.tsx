'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowUpDown, 
  Settings, 
  RefreshCw, 
  TrendingUp,
  AlertTriangle,
  Clock,
  Zap,
  DollarSign,
  BarChart3,
  Shield,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

import {
  Token,
  Quote,
  SwapParams,
  PriceComparison,
  QuickTradeState,
  AggregatorSettings,
  DEFAULT_SETTINGS,
  SUPPORTED_NETWORKS,
  DEXType,
  FeeStructure,
  Network
} from '@/types/quickTrade'

import DEXAggregator from '@/lib/dexAggregator'
import RouteOptimizer from '@/lib/routeOptimizer'
import PriceComparator, { 
  formatPriceImpact, 
  formatSlippage, 
  formatExecutionTime,
  getRiskColor,
  getConfidenceColor
} from '@/utils/priceComparison'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Import our enhanced components  
// Note: These components may not exist yet, using mock implementations
// import TokenSelector from '@/components/quick-trade/TokenSelector'
// import TradeHistory from '@/components/quick-trade/TradeHistory'
// import PriceChart from '@/components/quick-trade/PriceChart'
import { cypherFeeManager, calculateCypherFee, getFeePercentageText } from '@/lib/feeManager'
import MultiChainWalletConnector from '@/components/wallet/MultiChainWalletConnector'

// Mock token list - in production this would come from a token registry
const POPULAR_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoUri: '/icons/ethereum.png',
    chainId: 1,
    isNative: true
  },
  {
    address: '0xA0b86a33E6F8b16dcE3d16b0e4f3b8De1A9e1C6C',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: '/icons/usdc.png',
    chainId: 1
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUri: '/icons/usdt.png',
    chainId: 1
  },
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoUri: '/icons/solana.png',
    chainId: 101,
    isNative: true
  }
]

interface QuickTradeInterfaceProps {
  onSwapComplete?: (result: any) => void
  defaultTokenIn?: Token
  defaultTokenOut?: Token
  defaultAmount?: string
}

const QuickTradeInterface: React.FC<QuickTradeInterfaceProps> = ({
  onSwapComplete,
  defaultTokenIn,
  defaultTokenOut,
  defaultAmount = ''
}) => {
  // Core state
  const [state, setState] = useState<QuickTradeState>({
    tokenIn: defaultTokenIn || null,
    tokenOut: defaultTokenOut || null,
    amountIn: defaultAmount,
    quotes: [],
    selectedQuote: null,
    isLoading: false,
    error: null,
    priceComparison: null,
    settings: DEFAULT_SETTINGS
  })

  // UI state
  const [activeTab, setActiveTab] = useState<'swap' | 'settings' | 'advanced' | 'chart' | 'history'>('swap')
  const [showSettings, setShowSettings] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [slippageTolerance, setSlippageTolerance] = useState(1.0)
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(SUPPORTED_NETWORKS[0])
  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null)
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null)
  const [showWalletConnector, setShowWalletConnector] = useState(false)

  // Initialize services
  const dexAggregator = useMemo(() => new DEXAggregator(state.settings), [state.settings])
  const routeOptimizer = useMemo(() => new RouteOptimizer({
    maxHops: 3,
    maxRoutes: 5,
    timeout: 10000,
    useMultiPath: true,
    optimizeFor: 'balanced',
    includeStablecoinRoutes: true,
    minLiquidityUSD: 10000
  }), [])
  const priceComparator = useMemo(() => new PriceComparator(), [])

  // Get quotes from aggregator
  const fetchQuotes = useCallback(async () => {
    if (!state.tokenIn || !state.tokenOut || !state.amountIn || parseFloat(state.amountIn) <= 0) {
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const swapParams: SwapParams = {
        tokenIn: state.tokenIn!,
        tokenOut: state.tokenOut!,
        amountIn: (parseFloat(state.amountIn) * Math.pow(10, state.tokenIn!.decimals)).toString(),
        slippageTolerance,
        recipient: '0x742d35Cc6bF8b8C6F2a1F7F0D5C4A5E2A8F9B8E1' // Would be user's wallet
      }

      const quotes = await dexAggregator.getQuotes(swapParams)
      
      if (quotes.length === 0) {
        throw new Error('No quotes found for this token pair')
      }

      // Compare prices
      const comparison = await (priceComparator as any).compareQuotes(
        quotes,
        state.tokenIn!,
        state.tokenOut!,
        state.settings.includeGasCosts
      )

      setState(prev => ({
        ...prev,
        quotes,
        selectedQuote: comparison.bestQuote,
        priceComparison: comparison,
        isLoading: false
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch quotes',
        isLoading: false
      }))
    }
  }, [state.tokenIn, state.tokenOut, state.amountIn, slippageTolerance, dexAggregator, priceComparator, state.settings.includeGasCosts])

  // Auto-refresh quotes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.quotes.length > 0 && !state.isLoading) {
        fetchQuotes()
      }
    }, 15000) // Refresh every 15 seconds

    return () => clearInterval(interval)
  }, [fetchQuotes, state.quotes.length, state.isLoading])

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchQuotes()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [fetchQuotes])

  // Swap tokens
  const handleSwapTokens = useCallback(() => {
    setState(prev => ({
      ...prev,
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
      quotes: [],
      selectedQuote: null,
      priceComparison: null
    }))
  }, [])

  // Execute swap - now opens wallet connector
  const handleExecuteSwap = useCallback(() => {
    if (!state.selectedQuote || !state.tokenIn || !state.tokenOut) return
    setShowWalletConnector(true)
  }, [state.selectedQuote, state.tokenIn, state.tokenOut])

  // Handle wallet selection
  const handleWalletSelect = useCallback((wallet: any, network: string) => {
    setShowWalletConnector(false)
    // Here we would normally connect to the wallet
    // For now, we'll just complete the swap simulation
    onSwapComplete?.({ status: 'success', hash: '0x123...', wallet: wallet.name, network })
  }, [onSwapComplete])

  // Format output amount
  const formatOutputAmount = useCallback((quote: Quote) => {
    if (!state.tokenOut) return '0'
    const amount = parseFloat(quote.outputAmount) / Math.pow(10, state.tokenOut.decimals)
    return amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }, [state.tokenOut])

  // Check if minimum amount is met
  const isMinimumAmountMet = useMemo(() => {
    const amountUSD = parseFloat(state.amountIn) // Simplified - would need actual USD conversion
    return amountUSD >= state.settings.minAmountUSD
  }, [state.amountIn, state.settings.minAmountUSD])

  // Calculate fees including Cypher fee
  const calculateFees = useCallback((quote: Quote) => {
    if (!state.tokenIn || !state.tokenOut) return null;
    
    const amountUSD = parseFloat(state.amountIn) * 100; // Mock USD price
    const cypherFee = calculateCypherFee(amountUSD);
    const dexFee = parseFloat(quote.fee) / 10000 * amountUSD;
    const gasFee = 2.50; // Mock gas fee
    
    return {
      cypherFee,
      dexFee,
      gasFee,
      totalFee: cypherFee + dexFee + gasFee,
      cypherFeePercentage: getFeePercentageText()
    };
  }, [state.amountIn, state.tokenIn, state.tokenOut]);

  // Handle token selection
  const handleTokenSelect = useCallback((token: Token, direction: 'from' | 'to') => {
    if (direction === 'from') {
      setState(prev => ({ ...prev, tokenIn: token }));
    } else {
      setState(prev => ({ ...prev, tokenOut: token }));
    }
    setShowTokenSelector(null);
  }, []);

  // Update fee breakdown when quote changes
  useEffect(() => {
    if (state.selectedQuote) {
      const fees = calculateFees(state.selectedQuote);
      setFeeBreakdown(fees);
    }
  }, [state.selectedQuote, calculateFees]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Header */}
      <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Trade
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                v2.0
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={state.isLoading || isRefreshing}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Network Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-400">Network:</Label>
            <Badge variant="outline" className="border-orange-500/30 text-orange-400">
              {selectedNetwork.name}
            </Badge>
          </div>

          {/* Token Input */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-slate-400">From</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={state.amountIn}
                    onChange={(e) => setState(prev => ({ ...prev, amountIn: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-right text-lg"
                  />
                </div>
                <Button
                  variant="outline"
                  className="min-w-[100px] border-slate-700 bg-slate-800 hover:bg-slate-700"
                  onClick={() => setShowTokenSelector('from')}
                >
                  {state.tokenIn ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-cyan-500" />
                      {state.tokenIn.symbol}
                    </div>
                  ) : (
                    'Select'
                  )}
                </Button>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="rounded-full w-10 h-10 border border-slate-700 hover:border-cyan-500/50"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-400">To</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={state.selectedQuote ? formatOutputAmount(state.selectedQuote) : '0.0'}
                    readOnly
                    className="bg-slate-800 border-slate-700 text-right text-lg"
                  />
                </div>
                <Button
                  variant="outline"
                  className="min-w-[100px] border-slate-700 bg-slate-800 hover:bg-slate-700"
                  onClick={() => setShowTokenSelector('to')}
                >
                  {state.tokenOut ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-500" />
                      {state.tokenOut.symbol}
                    </div>
                  ) : (
                    'Select'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Minimum Amount Warning */}
          {state.amountIn && !isMinimumAmountMet && (
            <Alert className="border-orange-500/20 bg-orange-500/5">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <AlertDescription className="text-orange-400">
                Minimum trade amount is ${state.settings.minAmountUSD}
              </AlertDescription>
            </Alert>
          )}

          {/* Quote Results */}
          {state.isLoading && (
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                  <span className="text-slate-400">Finding best routes...</span>
                </div>
                <Progress value={75} className="mt-3" />
              </CardContent>
            </Card>
          )}

          {state.selectedQuote && state.priceComparison && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Best Quote Card */}
              <Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-cyan-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-400">Best Route</span>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                        {state.selectedQuote.dex}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        {formatOutputAmount(state.selectedQuote)} {state.tokenOut?.symbol}
                      </div>
                      <div className="text-sm text-slate-400">
                        {formatPriceImpact(state.selectedQuote.priceImpact)} impact
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-slate-400">Confidence</div>
                      <div 
                        className="font-semibold"
                        style={{ color: getConfidenceColor(state.selectedQuote.confidence) }}
                      >
                        {state.selectedQuote.confidence}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">Time</div>
                      <div className="text-cyan-400 font-semibold">
                        {formatExecutionTime(state.selectedQuote.executionTime)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">Slippage</div>
                      <div className="text-orange-400 font-semibold">
                        {formatSlippage(state.selectedQuote.slippage)}
                      </div>
                    </div>
                  </div>

                  {/* Savings Display */}
                  {state.priceComparison.savings.percentage > 0 && (
                    <div className="mt-3 p-2 bg-green-500/10 rounded border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">
                          You save {state.priceComparison.savings.amount} {state.tokenOut?.symbol} 
                          ({state.priceComparison.savings.percentage.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Route Details */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-5 bg-slate-800">
                  <TabsTrigger value="swap">Swap</TabsTrigger>
                  <TabsTrigger value="chart">Chart</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="swap" className="space-y-3">
                  {/* Enhanced Fee Breakdown */}
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Fee Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {feeBreakdown && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">DEX Fee</span>
                            <span className="text-slate-300">${feeBreakdown.dexFee.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Cypher Fee</span>
                            <span className="text-cyan-400">
                              ${feeBreakdown.cypherFee.toFixed(4)} ({feeBreakdown.cypherFeePercentage})
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Network Fee</span>
                            <span className="text-slate-300">${feeBreakdown.gasFee.toFixed(2)}</span>
                          </div>
                          <Separator className="bg-slate-700" />
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-slate-300">Total Fees</span>
                            <span className="text-orange-400">${feeBreakdown.totalFee.toFixed(4)}</span>
                          </div>
                          <div className="mt-2 p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                            <div className="text-xs text-cyan-400">
                              💰 {feeBreakdown.cypherFeePercentage} goes to Cypher development fund
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Execute Button */}
                  <Button
                    onClick={handleExecuteSwap}
                    disabled={!state.selectedQuote || state.isLoading || !isMinimumAmountMet}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3"
                  >
                    {state.isLoading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Executing Swap...
                      </div>
                    ) : (
                      `Swap ${state.tokenIn?.symbol} for ${state.tokenOut?.symbol}`
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="chart" className="space-y-4">
                  {/* Price Chart - Temporarily disabled */}
                  {state.tokenIn && state.tokenOut && (
                    <Card className="border-slate-700 bg-slate-800/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          {state.tokenIn.symbol}/{state.tokenOut.symbol} Chart
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center h-[300px] text-gray-400">
                          <div className="text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Chart coming soon</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {/* Trade History - Temporarily disabled */}
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent Trades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center h-[200px] text-gray-400">
                        <div className="text-center">
                          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Trade history coming soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-slate-400">Slippage Tolerance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Slider
                        value={[slippageTolerance]}
                        onValueChange={(value: number[]) => setSlippageTolerance(value[0])}
                        max={5}
                        min={0.1}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>0.1%</span>
                        <span className="text-cyan-400 font-semibold">{slippageTolerance.toFixed(1)}%</span>
                        <span>5.0%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-slate-400">Advanced Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Include Gas Costs</Label>
                        <Switch 
                          checked={state.settings.includeGasCosts}
                          onCheckedChange={(checked) => 
                            setState(prev => ({
                              ...prev,
                              settings: { ...prev.settings, includeGasCosts: checked }
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Gas Optimization</Label>
                        <Switch 
                          checked={state.settings.gasOptimization}
                          onCheckedChange={(checked) => 
                            setState(prev => ({
                              ...prev,
                              settings: { ...prev.settings, gasOptimization: checked }
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Prioritize Speed</Label>
                        <Switch 
                          checked={state.settings.prioritizeSpeed}
                          onCheckedChange={(checked) => 
                            setState(prev => ({
                              ...prev,
                              settings: { ...prev.settings, prioritizeSpeed: checked }
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  {/* All Quotes Comparison */}
                  {state.quotes.length > 1 && (
                    <Card className="border-slate-700 bg-slate-800/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-slate-400">All Routes ({state.quotes.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {state.quotes.slice(0, 5).map((quote, index) => (
                          <motion.div
                            key={`${quote.dex}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-3 rounded border cursor-pointer transition-colors ${
                              quote === state.selectedQuote
                                ? 'border-cyan-500/50 bg-cyan-500/10'
                                : 'border-slate-700 hover:border-slate-600'
                            }`}
                            onClick={() => setState(prev => ({ ...prev, selectedQuote: quote }))}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {quote.dex}
                                </Badge>
                                {index === 0 && (
                                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                                    Best
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">
                                  {formatOutputAmount(quote)} {state.tokenOut?.symbol}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {quote.confidence}% • {formatExecutionTime(quote.executionTime)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendation */}
                  {state.priceComparison?.recommendation && (
                    <Card className="border-slate-700 bg-slate-800/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Recommendation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <Shield
                            className="w-5 h-5 flex-shrink-0 mt-0.5"
                            style={{ color: getRiskColor(state.priceComparison.recommendation.riskLevel as any) }}
                          />
                          <div>
                            <div className="text-sm text-slate-300 mb-1">
                              {state.priceComparison.recommendation.reason}
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: getRiskColor(state.priceComparison.recommendation.riskLevel as any),
                                color: getRiskColor(state.priceComparison.recommendation.riskLevel as any)
                              }}
                            >
                              {state.priceComparison.recommendation.riskLevel.toUpperCase()} RISK
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* Error Display */}
          {state.error && (
            <Alert className="border-red-500/20 bg-red-500/5">
              <XCircle className="w-4 h-4 text-red-500" />
              <AlertDescription className="text-red-400">
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Fetch Quotes Button */}
          {!state.isLoading && state.quotes.length === 0 && state.tokenIn && state.tokenOut && state.amountIn && (
            <Button
              onClick={fetchQuotes}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              Get Quotes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500">
        <div>Powered by Cypher DEX Aggregator v2.0</div>
        <div className="mt-1">
          Supporting {SUPPORTED_NETWORKS.length} networks • 
          {Object.values(DEXType).length} DEX protocols • 
          {getFeePercentageText()} fee
        </div>
      </div>

      {/* Token Selector Modal - Temporarily disabled */}
      <AnimatePresence>
        {showTokenSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTokenSelector(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-gray-900 rounded-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Token Selector</h3>
                <p className="text-gray-400 mb-4">Advanced token selector coming soon</p>
                <Button onClick={() => setShowTokenSelector(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Chain Wallet Connector */}
      <AnimatePresence>
        {showWalletConnector && (
          <MultiChainWalletConnector
            onClose={() => setShowWalletConnector(false)}
            onWalletSelect={handleWalletSelect}
            selectedFromToken={state.tokenIn}
            selectedToToken={state.tokenOut}
            amount={state.amountIn}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default QuickTradeInterface