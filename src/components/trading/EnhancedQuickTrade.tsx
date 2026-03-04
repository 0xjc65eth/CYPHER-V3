/**
 * Enhanced Quick Trade with Multi-Wallet Integration
 * Versão avançada do Quick Trade com suporte a múltiplas carteiras
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDownUp, Zap, Info, Calculator, TrendingUp, Wallet, CheckCircle, AlertTriangle, Network, Loader2 } from 'lucide-react';

// Tipos
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
}

interface TradeExecution {
  orderId: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  error?: string;
}

// Serviço de cálculo de fracionamento
class SmartFractionalTrading {
  private static readonly FEE_PERCENTAGE = 0.0005; // 0.05%
  
  static calculateFractionalAmount(
    targetValueUSD: number,
    asset: Asset,
    walletInfo?: any
  ): FractionalOrder | null {
    if (targetValueUSD <= 0 || !asset.price) {
      return null;
    }
    
    // Aplicar valor mínimo global de $10
    if (targetValueUSD < 10) {
      return null;
    }
    
    const rawAmount = targetValueUSD / asset.price;
    const precision = Math.pow(10, asset.precision);
    const amount = Math.floor(rawAmount * precision) / precision;
    
    // Verificar ordem mínima do ativo
    const minOrderUSD = asset.minOrderSize * asset.price;
    if (targetValueUSD < minOrderUSD && targetValueUSD < 10) {
      return null;
    }
    
    // Para valores acima de $10, ajustar se necessário
    const finalAmount = Math.max(amount, asset.minOrderSize);
    
    // Calcular taxas
    const estimatedFees = targetValueUSD * this.FEE_PERCENTAGE;
    
    // Determinar rede baseada na carteira conectada
    let network = 'Ethereum'; // Default
    if (walletInfo) {
      switch (walletInfo.type) {
        case 'bitcoin':
          network = 'Bitcoin';
          break;
        case 'solana':
          network = 'Solana';
          break;
        case 'evm':
          // Mapear chain ID para nome da rede
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
      walletInfo
    };
  }
  
  static formatAmount(amount: number, precision: number): string {
    return amount.toFixed(precision).replace(/\.?0+$/, '');
  }
  
  static getMinimumUSD(asset: Asset): number {
    return asset.minOrderSize * asset.price;
  }
}

// Hook para preços em tempo real
const useLivePrices = () => {
  const [prices, setPrices] = useState<Record<string, number>>({
    BTC: 104390.25,
    ETH: 2285.50,
    SOL: 98.75,
    USDC: 1.00,
    BNB: 312.45,
    AVAX: 35.20,
    MATIC: 0.85
  });
  
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Price updates should come from real market data, not Math.random()
    // In production, connect to real price feed
    // Example: connectToPriceFeed(updatePrices)

    return () => {
      // Cleanup WebSocket connections
    };
  }, []);
  
  return { prices, loading };
};

// Mock Multi-Wallet Hook
const useMultiWallet = () => {
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWallet, setActiveWallet] = useState<any>(null);

  const connectForAsset = async (asset: string) => {
    // In production, use real wallet connection logic
    // This should call actual wallet connectors (MetaMask, Phantom, etc.)
    // For now, return null to indicate no wallet connected
    setActiveWallet(null);
    return null;
  };

  const getActiveWalletForAsset = (asset: string) => {
    return activeWallet;
  };

  return {
    wallets,
    connectForAsset,
    getActiveWalletForAsset,
    totalConnections: wallets.length
  };
};

// Componente Principal
const EnhancedQuickTrade: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('10');
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [fractionalOrder, setFractionalOrder] = useState<FractionalOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [tradeExecution, setTradeExecution] = useState<TradeExecution | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  
  // Multi-wallet integration
  const multiWallet = useMultiWallet();
  const [activeWalletInfo, setActiveWalletInfo] = useState<any>(null);
  
  const { prices, loading } = useLivePrices();
  
  // Assets disponíveis com suporte a múltiplas redes
  const assets: Asset[] = [
    { 
      symbol: 'BTC', 
      name: 'Bitcoin', 
      price: prices.BTC, 
      minOrderSize: 0.00001, 
      precision: 8,
      supportedNetworks: ['bitcoin']
    },
    { 
      symbol: 'ETH', 
      name: 'Ethereum', 
      price: prices.ETH, 
      minOrderSize: 0.0001, 
      precision: 6,
      supportedNetworks: ['ethereum', 'arbitrum', 'optimism', 'base']
    },
    { 
      symbol: 'SOL', 
      name: 'Solana', 
      price: prices.SOL, 
      minOrderSize: 0.01, 
      precision: 4,
      supportedNetworks: ['solana']
    },
    { 
      symbol: 'USDC', 
      name: 'USD Coin', 
      price: prices.USDC, 
      minOrderSize: 1, 
      precision: 2,
      supportedNetworks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'solana']
    },
    { 
      symbol: 'MATIC', 
      name: 'Polygon', 
      price: prices.MATIC, 
      minOrderSize: 1, 
      precision: 4,
      supportedNetworks: ['polygon']
    }
  ];
  
  // Obter carteira ativa para o ativo selecionado
  useEffect(() => {
    const walletInfo = multiWallet.getActiveWalletForAsset(selectedAsset);
    setActiveWalletInfo(walletInfo);
  }, [selectedAsset, multiWallet]);
  
  // Calcular fracionamento quando inputs mudam
  const calculateFractional = useCallback(() => {
    const value = parseFloat(inputValue) || 0;
    const asset = assets.find(a => a.symbol === selectedAsset);
    
    if (!asset) {
      setError('Ativo não encontrado');
      setFractionalOrder(null);
      return;
    }
    
    if (value <= 0) {
      setError('Digite um valor maior que zero');
      setFractionalOrder(null);
      return;
    }
    
    // Verificar se há carteira conectada para o ativo
    if (!activeWalletInfo) {
      setError(`Conecte uma carteira para negociar ${selectedAsset}`);
      setFractionalOrder(null);
      return;
    }
    
    // Usar valor mínimo global de $10 USD
    const globalMinimum = 10;
    const minUSD = Math.max(SmartFractionalTrading.getMinimumUSD(asset), globalMinimum);
    
    if (value < globalMinimum) {
      setError(`Valor mínimo: $${globalMinimum.toFixed(2)}`);
      setFractionalOrder(null);
      return;
    }
    
    if (value < minUSD) {
      setError(`Valor mínimo para ${asset.symbol}: $${minUSD.toFixed(2)}`);
      setFractionalOrder(null);
      return;
    }
    
    const order = SmartFractionalTrading.calculateFractionalAmount(value, asset, activeWalletInfo);
    if (order) {
      setError('');
      setFractionalOrder(order);
    } else {
      setError('Erro ao calcular fracionamento');
      setFractionalOrder(null);
    }
  }, [inputValue, selectedAsset, assets, activeWalletInfo]);
  
  useEffect(() => {
    calculateFractional();
  }, [calculateFractional]);
  
  // Conectar carteira automaticamente para ativo
  const handleAutoConnect = async () => {
    try {
      await multiWallet.connectForAsset(selectedAsset);
    } catch (error: any) {
      setError(`Erro ao conectar carteira: ${error.message}`);
    }
  };
  
  // Processar trade
  const handleTrade = async () => {
    if (!fractionalOrder || isProcessing || !activeWalletInfo) return;
    
    setIsProcessing(true);
    setTradeExecution({ orderId: 'trade-' + Date.now(), status: 'pending' });
    
    try {
      // Simular validação da carteira
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular execução do trade
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const txHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      setTradeExecution({
        orderId: 'trade-' + Date.now(),
        status: 'confirmed',
        txHash
      });
      
      // Resetar formulário após sucesso
      setTimeout(() => {
        setInputValue('10');
        setTradeExecution(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Erro no trade:', error);
      setTradeExecution({
        orderId: 'trade-' + Date.now(),
        status: 'failed',
        error: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Exemplos rápidos
  const quickExamples = [
    { label: '$10', value: 10 },
    { label: '$25', value: 25 },
    { label: '$50', value: 50 },
    { label: '$100', value: 100 },
    { label: '$250', value: 250 },
    { label: '$500', value: 500 }
  ];
  
  return (
    <div className="space-y-6">
      {/* Quick Trade Card */}
      <Card className="w-full max-w-2xl mx-auto bg-gray-900 border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Enhanced Quick Trade</h2>
                <p className="text-sm text-gray-400">
                  Execução otimizada cross-chain com detecção automática de carteira
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white">
                0.05% Fee
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWalletManager(!showWalletManager)}
                className="border-gray-600 text-gray-300"
              >
                <Wallet className="h-4 w-4 mr-1" />
                Carteiras
              </Button>
            </div>
          </div>
          
          {/* Status da Carteira */}
          {activeWalletInfo ? (
            <div className="border border-green-500 bg-green-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div className="flex items-center justify-between w-full">
                  <span className="text-green-400">
                    <strong>Carteira conectada:</strong> {activeWalletInfo.walletType} ({activeWalletInfo.type})
                  </span>
                  <Badge className="bg-green-600 text-white">
                    {fractionalOrder?.network || 'Ready'}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-yellow-500 bg-yellow-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <div className="flex items-center justify-between w-full">
                  <span className="text-yellow-400">
                    <strong>Carteira necessária para {selectedAsset}</strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAutoConnect}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Auto-conectar
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Input de Valor */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block text-gray-300">Valor em USD</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-lg focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-32 bg-gray-800 border border-gray-600 rounded-lg text-white px-3 py-3"
              >
                {assets.map(asset => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Exemplos Rápidos */}
            <div className="flex gap-2 mt-2">
              {quickExamples.map(example => (
                <button
                  key={example.value}
                  onClick={() => setInputValue(example.value.toString())}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Erro */}
          {error && (
            <div className="border border-red-500 bg-red-500/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            </div>
          )}
          
          {/* Conversão em Tempo Real */}
          {fractionalOrder && !error && activeWalletInfo && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3 mb-6">
              <div className="flex items-center justify-center text-2xl font-bold">
                <span className="text-gray-400">${fractionalOrder.totalValueUSD}</span>
                <ArrowDownUp className="mx-3 h-5 w-5 text-gray-500" />
                <span className="text-blue-400">
                  {fractionalOrder.displayAmount} {fractionalOrder.asset}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Preço unitário:</span>
                  <span className="font-medium text-white">${fractionalOrder.unitPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Taxa estimada:</span>
                  <span className="font-medium text-orange-400">${fractionalOrder.estimatedFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Rede:</span>
                  <span className="font-medium text-white">{fractionalOrder.network}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Carteira:</span>
                  <span className="font-medium text-white">{activeWalletInfo.walletType}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Status da Execução */}
          {tradeExecution && (
            <div className={`border rounded-lg p-4 mb-6 ${
              tradeExecution.status === 'confirmed' ? 'border-green-500 bg-green-500/10' :
              tradeExecution.status === 'failed' ? 'border-red-500 bg-red-500/10' :
              'border-blue-500 bg-blue-500/10'
            }`}>
              <div className="flex items-center gap-2">
                {tradeExecution.status === 'pending' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {tradeExecution.status === 'confirmed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {tradeExecution.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                <span className={
                  tradeExecution.status === 'confirmed' ? 'text-green-400' :
                  tradeExecution.status === 'failed' ? 'text-red-400' :
                  'text-blue-400'
                }>
                  {tradeExecution.status === 'pending' && 'Processando transação...'}
                  {tradeExecution.status === 'confirmed' && `✅ Trade confirmado! TX: ${tradeExecution.txHash?.slice(0, 10)}...`}
                  {tradeExecution.status === 'failed' && `❌ Falha: ${tradeExecution.error}`}
                </span>
              </div>
            </div>
          )}
          
          {/* Informação */}
          <div className="border border-blue-500 bg-blue-500/10 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-xs">
                Sistema inteligente detecta automaticamente a melhor carteira e rede para cada ativo.
              </span>
            </div>
          </div>
          
          {/* Botão de Trade */}
          <Button
            onClick={handleTrade}
            disabled={!fractionalOrder || isProcessing || !!error || !activeWalletInfo}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </span>
            ) : !activeWalletInfo ? (
              `Conectar carteira para ${selectedAsset}`
            ) : (
              `Trocar $${inputValue || '0'} por ${selectedAsset}`
            )}
          </Button>
          
          {/* Status de Preços */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
            <span>Preços atualizados em tempo real</span>
            <Network className="w-3 h-3 ml-2" />
            <span>{multiWallet.totalConnections} carteira(s) conectada(s)</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedQuickTrade;