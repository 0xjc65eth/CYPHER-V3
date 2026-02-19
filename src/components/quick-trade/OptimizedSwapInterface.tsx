'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import swapService from '../../services/SwapService';
import { FEE_CONFIG, SUPPORTED_NETWORKS } from '../../config/quicktrade';

/**
 * CYPHER ORDI FUTURE - Interface de Swap Otimizada
 * Agent 3 - Componente principal para swaps multi-DEX
 * 
 * Features:
 * - Interface limpa e intuitiva
 * - Comparação de preços em tempo real
 * - Otimização automática de rotas
 * - Tracking de fees e revenue
 * - Suporte multi-chain
 */

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
}

interface QuoteResult {
  dex: string;
  protocol: string;
  chain: string;
  inputAmount: string;
  outputAmount: string;
  originalOutputAmount: string;
  serviceFee: {
    amount: number;
    percentage: number;
    recipient: string;
  };
  priceImpact: number;
  fees: {
    gas: number;
    protocol: number;
  };
  alternatives?: QuoteResult[];
  improvement?: number;
}

const OptimizedSwapInterface: React.FC = () => {
  // Estados principais
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  
  // Estados de cotação
  const [currentQuote, setCurrentQuote] = useState<QuoteResult | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  
  // Estados de transação
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapProgress, setSwapProgress] = useState(0);
  const [lastSwapResult, setLastSwapResult] = useState<any>(null);
  
  // Estados da interface
  const [showComparison, setShowComparison] = useState(false);
  const [supportedTokens, setSupportedTokens] = useState<TokenInfo[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>(null);

  // Tokens populares por chain
  const popularTokens = useMemo(() => ({
    ethereum: [
      { address: '0xA0b86a33E6417c99C2A95F36bfCF1c47B8f93ED6', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      { address: '0xA0b86a33E6417c99C2A95F36bfCF1c47B8f93ED6', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    ],
    solana: [
      { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9 },
      { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    ],
    bitcoin: [
      { address: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
      { address: 'runes:UNCOMMON•GOODS', symbol: 'UNCOMMON•GOODS', name: 'Uncommon Goods', decimals: 18 },
    ]
  }), []);

  // Inicialização
  useEffect(() => {
    initializeSwapService();
    loadRevenueStats();
  }, []);

  // Carregar tokens quando chain muda
  useEffect(() => {
    loadSupportedTokens();
  }, [selectedChain]);

  // Auto-quote quando inputs mudam
  useEffect(() => {
    if (fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0) {
      const debounceTimer = setTimeout(() => {
        fetchQuote();
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [fromToken, toToken, fromAmount, selectedChain]);

  const initializeSwapService = async () => {
    try {
      await swapService.init();
    } catch (error) {
      console.error('❌ Erro ao inicializar SwapService:', error);
    }
  };

  const loadSupportedTokens = async () => {
    try {
      const tokens = await swapService.getSupportedTokens(selectedChain);
      setSupportedTokens(tokens);
      
      // Set default tokens
      if (!fromToken && popularTokens[selectedChain]?.[0]) {
        setFromToken(popularTokens[selectedChain][0]);
      }
      if (!toToken && popularTokens[selectedChain]?.[1]) {
        setToToken(popularTokens[selectedChain][1]);
      }
    } catch (error) {
      console.error('Erro ao carregar tokens:', error);
    }
  };

  const loadRevenueStats = async () => {
    try {
      const stats = await swapService.getRevenueStats();
      setRevenueStats(stats);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  };

  const fetchQuote = async () => {
    if (!fromToken || !toToken || !fromAmount) return;

    setIsLoadingQuote(true);
    setQuoteError('');

    try {
      const params = {
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount: fromAmount,
        fromChain: selectedChain,
        toChain: selectedChain
      };

      const quote = await swapService.getBestQuote(params);
      setCurrentQuote(quote);
      setToAmount(quote.outputAmount);
      
      
    } catch (error) {
      setQuoteError(error.message);
      console.error('Erro ao obter cotação:', error);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const executeSwap = async () => {
    if (!currentQuote || !fromToken || !toToken) return;

    setIsSwapping(true);
    setSwapProgress(0);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setSwapProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const userAddress = '0x...'; // Obter do wallet conectado
      const result = await swapService.executeSwap(currentQuote, userAddress);
      
      clearInterval(progressInterval);
      setSwapProgress(100);
      
      setLastSwapResult(result);
      
      // Reset form
      setTimeout(() => {
        setFromAmount('');
        setToAmount('');
        setCurrentQuote(null);
        setSwapProgress(0);
        loadRevenueStats(); // Atualizar stats
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao executar swap:', error);
      setQuoteError(error.message);
    } finally {
      setIsSwapping(false);
    }
  };

  const toggleTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const formatAmount = (amount: string, decimals: number = 6) => {
    return parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  };

  const getOptimizationBadge = () => {
    if (!currentQuote?.improvement) return null;
    
    return (
      <Badge variant="secondary" className="ml-2">
        +{currentQuote.improvement.toFixed(2)}% melhor
      </Badge>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Sistema de Swap Otimizado</h1>
        <p className="text-muted-foreground">
          Encontramos automaticamente a melhor rota entre {Object.keys(swapService.supportedDEXs).length} DEXs
        </p>
      </div>

      {/* Stats Revenue */}
      {revenueStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💰 Revenue Dashboard
              <Badge variant="outline">{FEE_CONFIG.percentage * 100}% fee</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">${revenueStats.totalRevenue}</p>
                <p className="text-sm text-muted-foreground">Revenue Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">${revenueStats.dailyRevenue}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{revenueStats.totalSwaps}</p>
                <p className="text-sm text-muted-foreground">Total Swaps</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">${revenueStats.averageFee}</p>
                <p className="text-sm text-muted-foreground">Fee Médio</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{revenueStats.topDEX}</p>
                <p className="text-sm text-muted-foreground">DEX Principal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Swap Interface */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quick Trade
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_NETWORKS.map(chain => (
                      <SelectItem key={chain} value={chain}>
                        {chain.charAt(0).toUpperCase() + chain.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* From Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium">De</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Select 
                    value={fromToken?.symbol || ''} 
                    onValueChange={(value) => {
                      const token = popularTokens[selectedChain]?.find(t => t.symbol === value);
                      if (token) setFromToken(token);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularTokens[selectedChain]?.map(token => (
                        <SelectItem key={token.address} value={token.symbol}>
                          {token.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTokens}
                  className="rounded-full w-10 h-10 p-0"
                >
                  ↕️
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Para</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={toAmount}
                    readOnly
                    className="flex-1 bg-muted"
                  />
                  <Select 
                    value={toToken?.symbol || ''} 
                    onValueChange={(value) => {
                      const token = popularTokens[selectedChain]?.find(t => t.symbol === value);
                      if (token) setToToken(token);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularTokens[selectedChain]?.map(token => (
                        <SelectItem key={token.address} value={token.symbol}>
                          {token.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quote Loading */}
              {isLoadingQuote && (
                <div className="text-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Buscando melhor rota...</p>
                </div>
              )}

              {/* Quote Result */}
              {currentQuote && !isLoadingQuote && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Melhor Rota:</span>
                      <div className="flex items-center">
                        <Badge variant="default">{currentQuote.dex}</Badge>
                        {getOptimizationBadge()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Price Impact</p>
                        <p className="font-medium">{(currentQuote.priceImpact * 100).toFixed(3)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Nossa Taxa</p>
                        <p className="font-medium text-green-600">
                          ${currentQuote.serviceFee.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {currentQuote.alternatives && currentQuote.alternatives.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComparison(!showComparison)}
                        className="w-full"
                      >
                        {showComparison ? 'Ocultar' : 'Ver'} Alternativas ({currentQuote.alternatives.length})
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Comparação de Rotas */}
              {showComparison && currentQuote?.alternatives && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Comparação de Rotas</h4>
                    <div className="space-y-2">
                      {[currentQuote, ...currentQuote.alternatives].map((quote, index) => (
                        <div key={index} className={`flex justify-between p-2 rounded ${index === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted'}`}>
                          <span className="flex items-center gap-2">
                            {index === 0 && <span className="text-green-600">👑</span>}
                            <Badge variant={index === 0 ? "default" : "outline"}>{quote.dex}</Badge>
                          </span>
                          <span className="font-medium">
                            {formatAmount(quote.outputAmount)} {toToken?.symbol}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error */}
              {quoteError && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-red-600 text-sm">❌ {quoteError}</p>
                  </CardContent>
                </Card>
              )}

              {/* Swap Progress */}
              {isSwapping && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Executando swap...</span>
                        <span>{swapProgress}%</span>
                      </div>
                      <Progress value={swapProgress} className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Swap Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={executeSwap}
                disabled={!currentQuote || isSwapping || isLoadingQuote}
              >
                {isSwapping ? 'Executando...' : 'Executar Swap'}
              </Button>

              {/* Success Message */}
              {lastSwapResult?.success && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-green-600 text-sm">
                      ✅ Swap executado com sucesso! Revenue de ${currentQuote?.serviceFee.amount.toFixed(2)} coletado.
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          {/* DEX Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status DEXs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(swapService.supportedDEXs).map(([chain, dexs]) => (
                  <div key={chain}>
                    <p className="font-medium capitalize mb-1">{chain}</p>
                    <div className="flex flex-wrap gap-1">
                      {dexs.map(dex => (
                        <Badge key={dex} variant="outline" className="text-xs">
                          {dex}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚀 Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Otimização automática de rotas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Comparação entre {Object.values(swapService.supportedDEXs).flat().length} DEXs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Taxa fixa de {FEE_CONFIG.percentage * 100}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Suporte multi-chain</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Tracking de revenue em tempo real</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OptimizedSwapInterface;