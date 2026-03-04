'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowUpDown, 
  Zap, 
  Settings, 
  Sparkles, 
  TrendingUp, 
  Shield,
  BarChart3,
  History,
  Wallet,
  Search,
  Filter,
  Star,
  ChevronRight
} from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { RoutePreview } from './RoutePreview';
import { WalletConnection } from './WalletConnection';
import { TradeConfirmation } from './TradeConfirmation';

// Types
interface Token {
  symbol: string;
  name: string;
  address: string;
  price: number;
  decimals: number;
  logoUrl?: string;
  network: string;
  balance?: string;
}

interface Route {
  exchange: string;
  path: string[];
  gasEstimate: number;
  gasUSD: number;
  priceImpact: number;
  liquidityUSD: number;
  confidence: number;
  estimatedOutput: number;
  minimumOutput: number;
}

interface TradeDetails {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  bestRoute: Route;
  allRoutes: Route[];
  totalFees: number;
  priceImpact: number;
  estimatedTime: number;
}

interface TradeHistory {
  id: string;
  timestamp: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  exchange: string;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

export function CypherTradeInterface() {
  // Estados principais
  const [step, setStep] = useState<'input' | 'preview' | 'confirm' | 'processing'>('input');
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [tokenSelectorType, setTokenSelectorType] = useState<'from' | 'to'>('from');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [tradeDetails, setTradeDetails] = useState<TradeDetails | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [gasSpeed, setGasSpeed] = useState<'slow' | 'standard' | 'fast'>('standard');

  // Mock trade history
  const [tradeHistory] = useState<TradeHistory[]>([
    {
      id: '1',
      timestamp: Date.now() - 3600000,
      fromToken: 'ETH',
      toToken: 'USDC',
      fromAmount: '1.5',
      toAmount: '4275.00',
      exchange: 'Uniswap V3',
      status: 'completed',
      txHash: '0x1234...5678'
    },
    {
      id: '2', 
      timestamp: Date.now() - 7200000,
      fromToken: 'USDC',
      toToken: 'WBTC',
      fromAmount: '5000.00',
      toAmount: '0.0454',
      exchange: '1inch',
      status: 'completed',
      txHash: '0xabcd...ef00'
    }
  ]);

  // Redes suportadas
  const supportedNetworks = [
    { id: 'ethereum', name: 'Ethereum', color: 'blue' },
    { id: 'arbitrum', name: 'Arbitrum', color: 'blue' },
    { id: 'optimism', name: 'Optimism', color: 'red' },
    { id: 'polygon', name: 'Polygon', color: 'purple' },
    { id: 'base', name: 'Base', color: 'blue' },
    { id: 'avalanche', name: 'Avalanche', color: 'red' },
    { id: 'bsc', name: 'BSC', color: 'yellow' },
    { id: 'solana', name: 'Solana', color: 'purple' }
  ];

  // Função para trocar tokens
  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Função para abrir seletor de token
  const openTokenSelector = (type: 'from' | 'to') => {
    setTokenSelectorType(type);
    setIsTokenSelectorOpen(true);
  };

  // Função para selecionar token
  const handleTokenSelect = (token: Token) => {
    if (tokenSelectorType === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setIsTokenSelectorOpen(false);
  };

  // Função para analisar rota
  const analyzeRoute = async () => {
    if (!fromToken || !toToken || !fromAmount) return;

    setIsAnalyzing(true);
    
    // Simular análise de rota
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock trade details
    const mockTradeDetails: TradeDetails = {
      fromToken,
      toToken,
      fromAmount,
      toAmount: (parseFloat(fromAmount) * fromToken.price / toToken.price * 0.997).toString(),
      bestRoute: {
        exchange: 'Uniswap V3',
        path: [fromToken.symbol, toToken.symbol],
        gasEstimate: 150000,
        gasUSD: 12.50,
        priceImpact: 0.15,
        liquidityUSD: 2500000,
        confidence: 95,
        estimatedOutput: parseFloat(fromAmount) * fromToken.price / toToken.price * 0.997,
        minimumOutput: parseFloat(fromAmount) * fromToken.price / toToken.price * 0.995
      },
      allRoutes: [
        {
          exchange: 'Uniswap V3',
          path: [fromToken.symbol, toToken.symbol],
          gasEstimate: 150000,
          gasUSD: 12.50,
          priceImpact: 0.15,
          liquidityUSD: 2500000,
          confidence: 95,
          estimatedOutput: parseFloat(fromAmount) * fromToken.price / toToken.price * 0.997,
          minimumOutput: parseFloat(fromAmount) * fromToken.price / toToken.price * 0.995
        },
        {
          exchange: '1inch',
          path: [fromToken.symbol, 'USDC', toToken.symbol],
          gasEstimate: 180000,
          gasUSD: 15.20,
          priceImpact: 0.22,
          liquidityUSD: 1800000,
          confidence: 88,
          estimatedOutput: parseFloat(fromAmount) * fromToken.price / toToken.price * 0.994,
          minimumOutput: parseFloat(fromAmount) * fromToken.price / toToken.price * 0.992
        }
      ],
      totalFees: 12.50 + (parseFloat(fromAmount) * fromToken.price * 0.0005),
      priceImpact: 0.15,
      estimatedTime: 15
    };

    setTradeDetails(mockTradeDetails);
    setIsAnalyzing(false);
    setStep('preview');
  };

  // Função para confirmar trade
  const confirmTrade = () => {
    setStep('confirm');
  };

  // Função para executar trade
  const executeTrade = async (confirmed: boolean) => {
    if (confirmed) {
      setStep('processing');
      // Aqui seria implementada a lógica de execução do trade
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Resetar para o estado inicial após sucesso
      setStep('input');
      setFromAmount('');
      setToAmount('');
      setTradeDetails(null);
    } else {
      setStep('preview');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CYPHER TRADE
            </h1>
            <p className="text-gray-400">Interface profissional de trading DEX</p>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            Sistemas Online
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            8 Redes Ativas
          </Badge>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
            25+ DEXs Conectadas
          </Badge>
        </div>
      </div>

      {/* Network Selector */}
      <Card className="bg-gray-900 border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Selecionar Rede</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-400 hover:text-white"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {supportedNetworks.map((network) => (
            <Button
              key={network.id}
              variant={selectedNetwork === network.id ? 'default' : 'outline'}
              onClick={() => setSelectedNetwork(network.id)}
              className={`h-16 flex flex-col items-center justify-center ${
                selectedNetwork === network.id 
                  ? `bg-${network.color}-500/20 border-${network.color}-500 text-${network.color}-400` 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className={`w-8 h-8 rounded-full bg-${network.color}-500/20 flex items-center justify-center mb-1`}>
                <div className={`w-4 h-4 rounded-full bg-${network.color}-400`} />
              </div>
              <span className="text-xs">{network.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trade Input */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900 border-gray-700 p-6">
            <div className="space-y-4">
              {/* From Token */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400">Você paga</label>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
                    />
                    <Button
                      variant="outline"
                      onClick={() => openTokenSelector('from')}
                      className="flex items-center gap-2 min-w-[120px] border-gray-600 hover:border-gray-500"
                    >
                      {fromToken ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-xs font-bold">{fromToken.symbol[0]}</span>
                          </div>
                          <span>{fromToken.symbol}</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Selecionar</span>
                        </>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  {fromToken && fromAmount && (
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-400">
                        ≈ ${(parseFloat(fromAmount) * fromToken.price).toLocaleString()}
                      </span>
                      <span className="text-gray-400">
                        Balance: {fromToken.balance || '0.00'} {fromToken.symbol}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={swapTokens}
                  className="rounded-full p-3 border-gray-600 hover:border-gray-500 hover:bg-gray-700"
                >
                  <ArrowUpDown className="w-5 h-5" />
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400">Você recebe</label>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-2xl font-bold text-gray-500">
                      {toAmount || '0.0'}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => openTokenSelector('to')}
                      className="flex items-center gap-2 min-w-[120px] border-gray-600 hover:border-gray-500"
                    >
                      {toToken ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-xs font-bold">{toToken.symbol[0]}</span>
                          </div>
                          <span>{toToken.symbol}</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Selecionar</span>
                        </>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  {toToken && toAmount && (
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-400">
                        ≈ ${(parseFloat(toAmount) * toToken.price).toLocaleString()}
                      </span>
                      <span className="text-gray-400">
                        Balance: {toToken.balance || '0.00'} {toToken.symbol}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Amount Buttons */}
              {fromToken && (
                <div className="grid grid-cols-4 gap-2">
                  {['25%', '50%', '75%', 'MAX'].map((percentage) => (
                    <Button
                      key={percentage}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const balance = parseFloat(fromToken.balance || '0');
                        const multiplier = percentage === 'MAX' ? 1 : parseFloat(percentage) / 100;
                        setFromAmount((balance * multiplier).toString());
                      }}
                      className="border-gray-600 hover:border-blue-500 hover:bg-blue-500/10"
                    >
                      {percentage}
                    </Button>
                  ))}
                </div>
              )}

              {/* Analyze Button */}
              <Button
                onClick={analyzeRoute}
                disabled={!fromToken || !toToken || !fromAmount || isAnalyzing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 h-12"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analisando rotas...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Analisar melhor rota
                  </div>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Wallet Connection */}
          <WalletConnection
            isConnected={isWalletConnected}
            address={walletAddress}
            onConnect={(address) => {
              setIsWalletConnected(true);
              setWalletAddress(address);
            }}
            onDisconnect={() => {
              setIsWalletConnected(false);
              setWalletAddress('');
            }}
            selectedNetwork={selectedNetwork}
          />

          {/* Market Stats */}
          <Card className="bg-gray-900 border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Stats de Mercado</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Volume 24h</span>
                <span className="text-green-400">$2.8B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trades ativas</span>
                <span className="text-blue-400">12,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liquidez total</span>
                <span className="text-purple-400">$45.2B</span>
              </div>
            </div>
          </Card>

          {/* Popular Tokens */}
          <Card className="bg-gray-900 border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Tokens Populares</h3>
            <div className="space-y-2">
              {['ETH', 'BTC', 'USDC', 'SOL'].map((symbol) => (
                <div key={symbol} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-bold">{symbol[0]}</span>
                    </div>
                    <span className="text-white">{symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 text-sm">+2.4%</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Trade History */}
      {showHistory && (
        <Card className="bg-gray-900 border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Histórico de Trades</h3>
          <div className="space-y-3">
            {tradeHistory.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-white font-medium">{trade.fromAmount} {trade.fromToken}</span>
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">{trade.toAmount} {trade.toToken}</span>
                  </div>
                  <Badge variant="outline" className={`${
                    trade.status === 'completed' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : trade.status === 'pending'
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {trade.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">{trade.exchange}</div>
                  <div className="text-gray-500 text-xs">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        onSelect={handleTokenSelect}
        selectedNetwork={selectedNetwork}
        excludeToken={tokenSelectorType === 'from' ? toToken : fromToken}
      />

      {step === 'preview' && tradeDetails && (
        <RoutePreview
          tradeDetails={tradeDetails}
          onConfirm={confirmTrade}
          onBack={() => setStep('input')}
          slippageTolerance={slippageTolerance}
        />
      )}

      {step === 'confirm' && tradeDetails && (
        <TradeConfirmation
          tradeDetails={tradeDetails}
          walletAddress={walletAddress}
          onConfirm={() => executeTrade(true)}
          onBack={() => setStep('preview')}
        />
      )}
    </div>
  );
}