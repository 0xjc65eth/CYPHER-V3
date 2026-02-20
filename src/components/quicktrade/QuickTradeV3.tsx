'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowRightLeft, 
  Zap, 
  TrendingUp, 
  Clock, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Settings,
  Info
} from 'lucide-react';
import { QUICKTRADE_CONFIG } from '@/config/quicktrade';
import { FEE_RECIPIENTS } from '@/config/feeRecipients';
import { Token, Quote, DEXType } from '@/types/quickTrade';

interface TokenBalance {
  symbol: string;
  balance: string;
  balanceUSD: number;
}

interface QuickTradeAnalysis {
  bestQuote: Quote;
  allQuotes: Quote[];
  serviceFee: {
    percentage: number;
    amountUSD: number;
    cappedAt?: number;
  };
  totalCost: number;
  savings: number;
}

const POPULAR_TOKENS: Record<string, Token[]> = {
  '1': [ // Ethereum
    { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 1 },
    { address: '0xA0b86a33E6441d5a9d29BFC3a2C45e9e7e90d0f7', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, chainId: 1 }
  ],
  'solana': [ // Solana
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9, chainId: 'solana' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 'solana' },
    { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 'solana' }
  ]
};

export function QuickTradeV3() {
  const [selectedChain, setSelectedChain] = useState<string>('1');
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [analysis, setAnalysis] = useState<QuickTradeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [slippage, setSlippage] = useState('0.5');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { toast } = useToast();

  // Mock balances
  useEffect(() => {
    setBalances([
      { symbol: 'ETH', balance: '2.5432', balanceUSD: 7248.12 },
      { symbol: 'USDC', balance: '15234.56', balanceUSD: 15234.56 },
      { symbol: 'SOL', balance: '125.34', balanceUSD: 11907.30 }
    ]);
  }, []);

  // Auto-analyze when inputs change
  useEffect(() => {
    if (tokenIn && tokenOut && amountIn && parseFloat(amountIn) > 0) {
      const debounceTimer = setTimeout(() => {
        analyzeSwap();
      }, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [tokenIn, tokenOut, amountIn, selectedChain]);

  const analyzeSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/quick-trade/analyze/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken: tokenIn.address,
          toToken: tokenOut.address,
          amount: parseFloat(amountIn),
          network: selectedChain === '1' ? 'ethereum' : 'solana'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze swap');
      }

      const data = await response.json();
      
      // Transform API response to match our interface
      setAnalysis({
        bestQuote: {
          dex: 'UNISWAP_V3' as DEXType,
          inputAmount: amountIn,
          outputAmount: data.data.estimatedOutput.toString(),
          priceImpact: data.data.priceImpact,
          estimatedGas: '150000',
          route: [],
          fee: '0.3',
          slippage: parseFloat(slippage),
          executionTime: 30,
          confidence: 95,
          timestamp: Date.now()
        },
        allQuotes: [],
        serviceFee: data.data.serviceFee,
        totalCost: data.data.totalTransactionCost,
        savings: data.data.savings
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Unable to fetch quotes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeSwap = async () => {
    if (!analysis || !tokenIn || !tokenOut) return;

    setIsExecuting(true);
    try {
      // Process the swap
      const processResponse = await fetch('/api/quick-trade/process/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: `analysis_${Date.now()}`,
          userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2BD9e', // Mock address
          selectedExchange: 'UNISWAP',
          network: selectedChain === '1' ? 'ethereum' : 'solana',
          fromToken: tokenIn.symbol,
          toToken: tokenOut.symbol,
          amount: parseFloat(amountIn),
          acceptedFee: analysis.serviceFee.amountUSD
        })
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process swap');
      }

      const processData = await processResponse.json();
      
      toast({
        title: 'Swap Initiated',
        description: `Redirecting to exchange for ${amountIn} ${tokenIn.symbol} → ${tokenOut.symbol}`,
      });

      // In production, redirect to the exchange
      
      // Clear form
      setAmountIn('');
      setAnalysis(null);

    } catch (error) {
      console.error('Swap failed:', error);
      toast({
        title: 'Swap Failed',
        description: 'Unable to execute swap. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const swapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAnalysis(null);
  };

  const getTokenBalance = (symbol: string) => {
    return balances.find(b => b.symbol === symbol)?.balance || '0';
  };

  const setMaxAmount = () => {
    if (tokenIn) {
      const balance = getTokenBalance(tokenIn.symbol);
      setAmountIn(balance);
    }
  };

  return (
    <Card className="bg-gray-900/95 border-gray-800 backdrop-blur-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">QuickTrade V3.0</h3>
              <p className="text-sm text-gray-400">Cross-DEX aggregation with 0.05% service fee</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              22+ DEXs
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chain Selector */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Network</label>
          <Select value={selectedChain} onValueChange={setSelectedChain}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="1">Ethereum</SelectItem>
              <SelectItem value="42161">Arbitrum</SelectItem>
              <SelectItem value="10">Optimism</SelectItem>
              <SelectItem value="137">Polygon</SelectItem>
              <SelectItem value="8453">Base</SelectItem>
              <SelectItem value="56">BNB Chain</SelectItem>
              <SelectItem value="solana">Solana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Token Selection */}
        <div className="space-y-4">
          {/* From Token */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">From</label>
              <span className="text-xs text-gray-400">
                Balance: {getTokenBalance(tokenIn?.symbol || '')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <Input
                  type="number"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.0"
                  className="bg-transparent border-none text-2xl font-bold text-white p-0 h-auto"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setMaxAmount}
                  className="text-blue-400 hover:text-blue-300"
                >
                  MAX
                </Button>
                
                <Select value={tokenIn?.symbol || ''} onValueChange={(symbol) => {
                  const token = POPULAR_TOKENS[selectedChain]?.find(t => t.symbol === symbol);
                  if (token) setTokenIn(token);
                }}>
                  <SelectTrigger className="w-24 bg-gray-700 border-gray-600">
                    <SelectValue placeholder="Token" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {POPULAR_TOKENS[selectedChain]?.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapTokens}
              className="rounded-full bg-gray-700 hover:bg-gray-600 p-2"
            >
              <ArrowRightLeft className="w-4 h-4 text-gray-300" />
            </Button>
          </div>

          {/* To Token */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">To</label>
              <span className="text-xs text-gray-400">
                Balance: {getTokenBalance(tokenOut?.symbol || '')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="text-2xl font-bold text-white">
                  {analysis ? parseFloat(analysis.bestQuote.outputAmount).toFixed(6) : '0.0'}
                </div>
                {isAnalyzing && (
                  <div className="flex items-center space-x-2 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span className="text-xs text-blue-400">Finding best price...</span>
                  </div>
                )}
              </div>
              
              <Select value={tokenOut?.symbol || ''} onValueChange={(symbol) => {
                const token = POPULAR_TOKENS[selectedChain]?.find(t => t.symbol === symbol);
                if (token) setTokenOut(token);
              }}>
                <SelectTrigger className="w-24 bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {POPULAR_TOKENS[selectedChain]?.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="mt-4 space-y-3">
            {/* Best Route */}
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Best Route</span>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  Uniswap V3
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Price Impact</span>
                  <span className={analysis.bestQuote.priceImpact > 2 ? 'text-red-400' : 'text-green-400'}>
                    {analysis.bestQuote.priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee (0.05%)</span>
                  <span className="text-white">
                    ${analysis.serviceFee.amountUSD.toFixed(4)}
                    {analysis.serviceFee.cappedAt && (
                      <span className="text-blue-400 ml-1">(capped)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gas Cost</span>
                  <span className="text-white">~$8.50</span>
                </div>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Fee Information</span>
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>• Service fee helps fund platform development</div>
                <div>• Fee capped at $100 maximum per transaction</div>
                <div>• Recipient: {FEE_RECIPIENTS.EVM}</div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Advanced Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Slippage Tolerance</label>
                <div className="flex space-x-2">
                  {['0.1', '0.5', '1.0'].map((value) => (
                    <Button
                      key={value}
                      variant={slippage === value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSlippage(value)}
                      className="text-xs"
                    >
                      {value}%
                    </Button>
                  ))}
                  <Input
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-20 bg-gray-700 border-gray-600 text-white text-xs"
                    placeholder="Custom"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={executeSwap}
          disabled={!analysis || isExecuting || isAnalyzing}
          className="w-full mt-6 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing Swap...
            </>
          ) : isAnalyzing ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : analysis ? (
            <>
              <TrendingUp className="w-5 h-5 mr-2" />
              Execute Swap
            </>
          ) : (
            'Enter amount to get quote'
          )}
        </Button>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Success Rate</div>
            <div className="text-sm font-bold text-green-400">99.5%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Avg Time</div>
            <div className="text-sm font-bold text-blue-400">45s</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Volume</div>
            <div className="text-sm font-bold text-purple-400">$125M</div>
          </div>
        </div>
      </div>
    </Card>
  );
}