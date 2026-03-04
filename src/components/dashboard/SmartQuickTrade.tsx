import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from '@/components/ui/use-toast';
import { 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  DollarSign,
  Info,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe,
  Sparkles
} from 'lucide-react';
import { SmartFractionalTrading } from '@/lib/services/SmartFractionalTrading';
import { FractionalOrderValidator } from '@/lib/services/FractionalOrderValidator';

interface SmartQuickTradeProps {
  defaultNetwork?: string;
}

export const SmartQuickTrade: React.FC<SmartQuickTradeProps> = ({ 
  defaultNetwork = 'ethereum' 
}) => {
  const { walletInfo: wallet, isConnected: connected } = useWallet();
  const [smartTrader] = useState(() => new SmartFractionalTrading());
  
  // Form state
  const [inputAmount, setInputAmount] = useState('10');
  const [inputCurrency, setInputCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('BTC');
  const [targetNetwork, setTargetNetwork] = useState(defaultNetwork);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Order state
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

  useEffect(() => {
    // Subscribe to price updates
    const handlePriceUpdate = ({ symbol, price }: any) => {
      setPrices(prev => new Map(prev).set(symbol, price));
    };

    smartTrader.on('priceUpdate', handlePriceUpdate);

    return () => {
      smartTrader.off('priceUpdate', handlePriceUpdate);
      smartTrader.destroy();
    };
  }, [smartTrader]);

  useEffect(() => {
    // Validate order when inputs change
    if (inputAmount && targetCurrency && targetNetwork) {
      const result = FractionalOrderValidator.validateOrder({
        inputAmount: parseFloat(inputAmount) || 0,
        inputCurrency,
        targetCurrency,
        targetNetwork,
        walletBalance: wallet?.balance?.confirmed ?? undefined
      });
      setValidation(result);
    }
  }, [inputAmount, inputCurrency, targetCurrency, targetNetwork, wallet]);

  const handleQuickAmount = (amount: number) => {
    setInputAmount(amount.toString());
    setSelectedExample(amount);
  };

  const calculateOrder = useCallback(async () => {
    if (!validation?.isValid) return;

    setIsCalculating(true);
    try {
      const order = await smartTrader.calculateFractionalOrder(
        parseFloat(inputAmount),
        inputCurrency,
        targetCurrency,
        targetNetwork
      );
      setCurrentOrder(order);
    } catch (error: any) {
      toast({
        title: "Calculation Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  }, [inputAmount, inputCurrency, targetCurrency, targetNetwork, validation, smartTrader]);

  const executeOrder = async () => {
    if (!connected || !wallet || !currentOrder) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to continue",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    try {
      const executedOrder = await smartTrader.executeOrder(currentOrder, wallet);
      
      toast({
        title: "Trade Successful! 🎉",
        description: (
          <div className="space-y-1">
            <p>Bought {executedOrder.fractionalAmount.toFixed(8)} {targetCurrency}</p>
            <p className="text-sm text-gray-500">TX: {executedOrder.txHash?.slice(0, 10)}...</p>
          </div>
        ),
        variant: "default"
      });

      // Reset form
      setInputAmount('10');
      setCurrentOrder(null);
      setSelectedExample(null);
      
    } catch (error: any) {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const getCurrentPrice = (symbol: string): string => {
    const price = prices.get(symbol);
    return price ? formatPrice(price) : '...';
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-gray-900 to-black border-gray-800">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Smart Fractional Trading
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Convert any amount to crypto with automatic fractionation
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </div>

        {/* Quick Examples */}
        <div className="grid grid-cols-4 gap-2">
          {smartTrader.getQuickExamples().map((example) => (
            <Button
              key={example.amount}
              variant={selectedExample === example.amount ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickAmount(example.amount)}
              className="flex flex-col items-center py-3"
            >
              <span className="text-lg font-bold">${example.amount}</span>
              <span className="text-xs text-gray-400">{example.description}</span>
            </Button>
          ))}
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">You Pay</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.00"
                className="text-xl font-mono bg-gray-800 border-gray-700"
              />
              <select
                value={inputCurrency}
                onChange={(e: any) => setInputCurrency(e.target.value)}
                className="w-24 bg-gray-800 border-gray-700 rounded px-2 py-1 text-white"
              >
                <option value="USD">USD</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
            {inputCurrency !== 'USD' && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ ${((parseFloat(inputAmount) || 0) * (prices.get(inputCurrency) || 0)).toFixed(2)} USD
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">You Receive</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
                <span className="text-xl font-mono">
                  {currentOrder ? currentOrder.fractionalAmount.toFixed(8) : '0.00000000'}
                </span>
              </div>
              <select
                value={targetCurrency}
                onChange={(e: any) => setTargetCurrency(e.target.value)}
                className="w-24 bg-gray-800 border-gray-700 rounded px-2 py-1 text-white"
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
                <option value="ORDI">ORDI</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              @ {getCurrentPrice(targetCurrency)}
            </p>
          </div>
        </div>

        {/* Network Selection */}
        <div>
          <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Network
          </label>
          <div className="grid grid-cols-5 gap-2">
            {smartTrader.getSupportedNetworks().map((network) => (
              <Button
                key={network.name}
                variant={targetNetwork === network.name.toLowerCase() ? "default" : "outline"}
                size="sm"
                onClick={() => setTargetNetwork(network.name.toLowerCase())}
                className="text-xs"
              >
                {network.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Validation Messages */}
        {validation && (
          <div className="space-y-2">
            {validation.errors.map((error: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            ))}
            {validation.warnings.map((warning: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-yellow-500">
                <Info className="w-4 h-4 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
            {validation.suggestions.map((suggestion: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-blue-400">
                <Sparkles className="w-4 h-4 mt-0.5" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {/* Order Preview */}
        {currentOrder && (
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Order Preview
            </h4>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Amount:</span>
              <span className="text-right font-mono">
                {currentOrder.fractionalAmount.toFixed(8)} {targetCurrency}
              </span>
              
              <span className="text-gray-500">Price:</span>
              <span className="text-right">{formatPrice(currentOrder.estimatedPrice)}</span>
              
              <span className="text-gray-500">Network Fee:</span>
              <span className="text-right">${currentOrder.fee.toFixed(2)}</span>
              
              <span className="text-gray-500">Max Slippage:</span>
              <span className="text-right">{(currentOrder.slippage * 100).toFixed(1)}%</span>
              
              <div className="col-span-2 border-t border-gray-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Cost:</span>
                  <span>${(currentOrder.total + currentOrder.fee).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!currentOrder ? (
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="lg"
              onClick={calculateOrder}
              disabled={!validation?.isValid || isCalculating}
            >
              {isCalculating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Preview Trade
                </span>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentOrder(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={executeOrder}
                disabled={isExecuting || !connected}
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Execute Trade
                  </span>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1 border-t border-gray-800 pt-4">
          <p>💡 Smart routing finds the best prices across multiple exchanges</p>
          <p>🔒 Non-custodial: Your funds stay in your wallet until execution</p>
          <p>⚡ Instant conversion with automatic USD to crypto calculation</p>
        </div>
      </div>
    </Card>
  );
};