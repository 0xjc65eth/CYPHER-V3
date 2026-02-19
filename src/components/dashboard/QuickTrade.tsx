// Quick Trade com Fracionamento Automático Inteligente

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownUp, Zap, Info, Calculator, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Tipos
interface Asset {
  symbol: string;
  name: string;
  price: number;
  minOrderSize: number;
  precision: number;
  icon?: string;
}

interface FractionalOrder {
  asset: string;
  amount: number;
  displayAmount: string;
  totalValueUSD: number;
  unitPrice: number;
  estimatedFees: number;
  network: string;
}

// Serviço de cálculo de fracionamento
class SmartFractionalTrading {
  private static readonly FEE_PERCENTAGE = 0.0034; // 0.34%
  
  static calculateFractionalAmount(
    targetValueUSD: number,
    asset: Asset
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
    
    // Verificar ordem mínima do ativo (mas garantir que $10 seja sempre aceito)
    const minOrderUSD = asset.minOrderSize * asset.price;
    if (targetValueUSD < minOrderUSD && targetValueUSD < 10) {
      return null;
    }
    
    // Para valores acima de $10, ajustar se necessário
    const finalAmount = Math.max(amount, asset.minOrderSize);
    
    // Calcular taxas
    const estimatedFees = targetValueUSD * this.FEE_PERCENTAGE;
    const netValue = targetValueUSD - estimatedFees;
    
    return {
      asset: asset.symbol,
      amount: finalAmount,
      displayAmount: this.formatAmount(finalAmount, asset.precision),
      totalValueUSD: targetValueUSD,
      unitPrice: asset.price,
      estimatedFees: estimatedFees,
      network: 'Ethereum' // Default, pode ser dinâmico
    };
  }
  
  static formatAmount(amount: number, precision: number): string {
    return amount.toFixed(precision).replace(/\.?0+$/, '');
  }
  
  static getMinimumUSD(asset: Asset): number {
    return asset.minOrderSize * asset.price;
  }
}

// Hook para precos em tempo real via CoinGecko API
const useLivePrices = () => {
  const [prices, setPrices] = useState<Record<string, number>>({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    USDC: 1.00,
    BNB: 0,
    AVAX: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          '/api/coingecko?endpoint=/simple/price&params=' +
            encodeURIComponent('ids=bitcoin,ethereum,solana,binancecoin,avalanche-2&vs_currencies=usd')
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data === 'object') {
          setPrices(prev => ({
            ...prev,
            BTC: data.bitcoin?.usd || prev.BTC,
            ETH: data.ethereum?.usd || prev.ETH,
            SOL: data.solana?.usd || prev.SOL,
            BNB: data.binancecoin?.usd || prev.BNB,
            AVAX: data['avalanche-2']?.usd || prev.AVAX,
          }));
        }
      } catch (err) {
        console.error('QuickTrade price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return { prices, loading };
};

// Componente Principal
const QuickTrade: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('10');
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('Ethereum');
  const [fractionalOrder, setFractionalOrder] = useState<FractionalOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  
  const { prices, loading } = useLivePrices();
  
  // Assets disponíveis com configurações
  const assets: Asset[] = [
    { symbol: 'BTC', name: 'Bitcoin', price: prices.BTC, minOrderSize: 0.00001, precision: 8 },
    { symbol: 'ETH', name: 'Ethereum', price: prices.ETH, minOrderSize: 0.0001, precision: 6 },
    { symbol: 'SOL', name: 'Solana', price: prices.SOL, minOrderSize: 0.01, precision: 4 },
    { symbol: 'USDC', name: 'USD Coin', price: prices.USDC, minOrderSize: 1, precision: 2 },
    { symbol: 'BNB', name: 'BNB', price: prices.BNB, minOrderSize: 0.001, precision: 5 },
    { symbol: 'AVAX', name: 'Avalanche', price: prices.AVAX, minOrderSize: 0.01, precision: 4 }
  ];
  
  // Redes disponíveis
  const networks = [
    'Ethereum', 'Arbitrum', 'Optimism', 'Polygon',
    'Base', 'Avalanche', 'BSC', 'Solana'
  ];
  
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
    
    const order = SmartFractionalTrading.calculateFractionalAmount(value, asset);
    if (order) {
      setError('');
      setFractionalOrder({ ...order, network: selectedNetwork });
    } else {
      setError('Erro ao calcular fracionamento');
      setFractionalOrder(null);
    }
  }, [inputValue, selectedAsset, selectedNetwork, assets]);
  
  useEffect(() => {
    calculateFractional();
  }, [calculateFractional]);
  
  // Processar trade
  const handleTrade = async () => {
    if (!fractionalOrder || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`✅ Trade executado: ${fractionalOrder.displayAmount} ${fractionalOrder.asset}`);
      
      // Resetar formulário
      setInputValue('10');
    } catch (error) {
      console.error('Erro no trade:', error);
      alert('❌ Erro ao executar trade');
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            <span>Quick Trade</span>
          </div>
          <span className="text-sm text-green-500 bg-green-100 px-3 py-1 rounded-full">
            0.34% Fee
          </span>
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Melhor execução cross-DEX com fracionamento automático
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Seleção de Rede */}
        <div>
          <label className="text-sm font-medium mb-2 block">Rede</label>
          <div className="grid grid-cols-4 gap-2">
            {networks.map(network => (
              <button
                key={network}
                onClick={() => setSelectedNetwork(network)}
                className={`p-2 rounded-lg border transition-all text-sm ${
                  selectedNetwork === network
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {network}
              </button>
            ))}
          </div>
        </div>
        
        {/* Input de Valor */}
        <div>
          <label className="text-sm font-medium mb-2 block">Valor em USD</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-8 text-lg"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map(asset => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    {asset.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Exemplos Rápidos */}
          <div className="flex gap-2 mt-2">
            {quickExamples.map(example => (
              <button
                key={example.value}
                onClick={() => setInputValue(example.value.toString())}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Conversão em Tempo Real */}
        {fractionalOrder && !error && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center text-2xl font-bold">
              <span className="text-gray-600">${fractionalOrder.totalValueUSD}</span>
              <ArrowDownUp className="mx-3 h-5 w-5 text-gray-400" />
              <span className="text-blue-600">
                {fractionalOrder.displayAmount} {fractionalOrder.asset}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Preço unitário:</span>
                <span className="font-medium">${fractionalOrder.unitPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxa estimada:</span>
                <span className="font-medium">${fractionalOrder.estimatedFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Rede:</span>
                <span className="font-medium">{fractionalOrder.network}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Informação */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Fracionamento automático baseado no preço do ativo em tempo real. 
            Valores mínimos aplicados por ativo.
          </AlertDescription>
        </Alert>
        
        {/* Botão de Trade */}
        <Button
          onClick={handleTrade}
          disabled={!fractionalOrder || isProcessing || !!error}
          className="w-full h-12 text-lg font-medium"
          size="lg"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚡</span>
              Processando...
            </span>
          ) : (
            `Trocar $${inputValue || '0'} por ${selectedAsset}`
          )}
        </Button>
        
        {/* Status de Preços */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
          <span>Preços atualizados em tempo real</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickTrade;