'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Info,
  Calculator,
  Wallet,
  TrendingUp,
  Shield,
  Eye,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  DollarSign,
  Percent
} from 'lucide-react';
import { FeeStructure, FeeCalculation, FeeAddresses } from '@/types/fees';

interface FeeTransparencyProps {
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  selectedNetwork?: string;
  isPremium?: boolean;
}

interface FeeBreakdown {
  cypherFee: {
    amount: string;
    amountUSD: number;
    percentage: number;
    recipient: string;
  };
  dexFees: Array<{
    dex: string;
    amount: string;
    amountUSD: number;
    percentage: number;
  }>;
  gasFees: {
    estimatedGas: string;
    gasPrice: string;
    gasCostUSD: number;
  };
  bridgeFees?: {
    amount: string;
    amountUSD: number;
    fromChain: string;
    toChain: string;
  };
  totalFeeUSD: number;
  totalFeePercentage: number;
}

export function FeeTransparency({
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  selectedNetwork = 'ethereum',
  isPremium = false
}: FeeTransparencyProps) {
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [feeAddresses, setFeeAddresses] = useState<FeeAddresses | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch fee calculation
  useEffect(() => {
    if (amountIn && tokenIn && tokenOut) {
      calculateFees();
    }
  }, [amountIn, tokenIn, tokenOut, selectedNetwork]);

  // Fetch fee addresses
  useEffect(() => {
    fetchFeeAddresses();
  }, [selectedNetwork]);

  const calculateFees = async () => {
    if (!amountIn || !tokenIn || !tokenOut) return;

    setLoading(true);
    try {
      const response = await fetch('/api/fees/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amountIn,
          amountOut,
          network: selectedNetwork,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeeBreakdown(data);
      }
    } catch (error) {
      console.error('Error calculating fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeAddresses = async () => {
    try {
      const response = await fetch(`/api/fees/addresses?network=${selectedNetwork}`);
      if (response.ok) {
        const data = await response.json();
        setFeeAddresses(data);
      }
    } catch (error) {
      console.error('Error fetching fee addresses:', error);
    }
  };

  const copyAddress = async (address: string, type: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Error copying address:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-white text-lg">Transparência de Taxas</CardTitle>
            {isPremium ? (
              <Badge variant="outline" className="text-xs bg-green-900/20 text-green-400 border-green-500/30">
                YHP Member — 0% fees
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-green-900/20 text-green-400 border-green-500/30">
                0.3% Taxa
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showDetails ? 'Ocultar' : 'Detalhes'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="addresses">Endereços</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                <span className="ml-2 text-gray-400">Calculando taxas...</span>
              </div>
            ) : feeBreakdown ? (
              <div className="space-y-4">
                {/* Cypher Fee */}
                <div className={`${isPremium ? 'bg-green-900/20 border-green-500/30' : 'bg-blue-900/20 border-blue-500/30'} border rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className={`w-4 h-4 ${isPremium ? 'text-green-400' : 'text-blue-400'}`} />
                      <span className={`${isPremium ? 'text-green-400' : 'text-blue-400'} font-medium`}>
                        CYPHER Fee{isPremium ? ': 0% (YHP Member)' : ''}
                      </span>
                    </div>
                    {isPremium ? (
                      <Badge variant="outline" className="text-green-400 border-green-500/30">
                        YHP Member
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                        {feeBreakdown.cypherFee.percentage}%
                      </Badge>
                    )}
                  </div>
                  {!isPremium && (
                    <div className="mt-2 text-xs text-yellow-400/70 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Get YHP for 0% fees
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Valor</div>
                      <div className="text-white font-mono">{feeBreakdown.cypherFee.amount}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">USD</div>
                      <div className="text-white font-mono">{formatCurrency(feeBreakdown.cypherFee.amountUSD)}</div>
                    </div>
                  </div>
                  {showDetails && (
                    <div className="mt-3 pt-3 border-t border-blue-500/30">
                      <div className="text-xs text-gray-400">Endereço Receptor</div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-blue-300 font-mono">
                          {formatAddress(feeBreakdown.cypherFee.recipient)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAddress(feeBreakdown.cypherFee.recipient, 'cypher')}
                          className="h-6 w-6 p-0"
                        >
                          {copiedAddress === feeBreakdown.cypherFee.recipient ? 
                            <CheckCircle className="w-3 h-3 text-green-400" /> : 
                            <Copy className="w-3 h-3 text-gray-400" />
                          }
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* DEX Fees */}
                {feeBreakdown.dexFees.length > 0 && (
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-400 font-medium">Taxas DEX</span>
                    </div>
                    <div className="space-y-2">
                      {feeBreakdown.dexFees.map((dexFee, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{dexFee.dex}</span>
                            <Badge variant="outline" className="text-xs">
                              {dexFee.percentage}%
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-mono">{dexFee.amount}</div>
                            <div className="text-gray-400 text-xs">{formatCurrency(dexFee.amountUSD)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gas Fees */}
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 font-medium">Taxa de Gas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Gas Estimado</div>
                      <div className="text-white font-mono">{feeBreakdown.gasFees.estimatedGas}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Custo USD</div>
                      <div className="text-white font-mono">{formatCurrency(feeBreakdown.gasFees.gasCostUSD)}</div>
                    </div>
                  </div>
                  {showDetails && (
                    <div className="mt-2 text-xs text-gray-400">
                      Gas Price: {feeBreakdown.gasFees.gasPrice} gwei
                    </div>
                  )}
                </div>

                {/* Bridge Fees (if applicable) */}
                {feeBreakdown.bridgeFees && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-medium">Taxa de Bridge</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Valor</div>
                        <div className="text-white font-mono">{feeBreakdown.bridgeFees.amount}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">USD</div>
                        <div className="text-white font-mono">{formatCurrency(feeBreakdown.bridgeFees.amountUSD)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {feeBreakdown.bridgeFees.fromChain} → {feeBreakdown.bridgeFees.toChain}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="bg-gray-800 rounded-lg p-4 border-2 border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-semibold">Total de Taxas</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-400">
                        {formatCurrency(feeBreakdown.totalFeeUSD)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {feeBreakdown.totalFeePercentage.toFixed(2)}% do total
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Insira valores para calcular as taxas</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="addresses" className="space-y-4">
            {feeAddresses ? (
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Endereços de Taxa - {selectedNetwork}</span>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(feeAddresses).map(([network, address]) => (
                      <div key={network} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                        <div>
                          <div className="text-sm font-medium text-white capitalize">{network}</div>
                          <code className="text-xs text-gray-300 font-mono">{formatAddress(address)}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAddress(address, network)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {copiedAddress === address ? 
                              <CheckCircle className="w-4 h-4" /> : 
                              <Copy className="w-4 h-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://etherscan.io/address/${address}`, '_blank')}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <div className="font-medium mb-1">Verificação de Endereços</div>
                      <div className="text-xs">
                        Todos os endereços de taxa são publicamente verificáveis e transparentes. 
                        Clique no ícone de link externo para visualizar no explorador de blockchain.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Carregando endereços de taxa...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <div className="space-y-4">
              {/* Fee Structure Explanation */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Estrutura de Taxas</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Taxa CYPHER</span>
                    {isPremium ? (
                      <Badge variant="outline" className="text-green-400 border-green-500/30">
                        0% (YHP Member)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                        0.3%
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Taxas DEX</span>
                    <span className="text-gray-400">Variável por DEX</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Taxa de Gas</span>
                    <span className="text-gray-400">Estimada dinamicamente</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Taxa de Bridge</span>
                    <span className="text-gray-400">Apenas cross-chain</span>
                  </div>
                </div>
              </div>

              {/* Security Information */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-400 mt-0.5" />
                  <div className="text-sm text-green-200">
                    <div className="font-medium mb-1">Segurança e Transparência</div>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>{isPremium ? 'YHP Members: 0% CYPHER fee on all operations' : 'Taxa de 0.3% aplicada a todas as operações (0% para YHP Members)'}</li>
                      <li>Endereços de taxa publicamente verificáveis</li>
                      <li>Cálculos transparentes e auditáveis</li>
                      <li>Sem taxas ocultas ou custos adicionais</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div className="text-sm text-purple-200">
                    <div className="font-medium mb-1">Benefícios da Taxa CYPHER</div>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Financiamento de desenvolvimento contínuo</li>
                      <li>Manutenção de infraestrutura robusta</li>
                      <li>Suporte 24/7 e atualizações constantes</li>
                      <li>Integração com novas DEXs e blockchains</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact/Support */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Dúvidas sobre taxas?</div>
                    <div className="text-xs text-gray-400">Entre em contato com nosso suporte</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-600/20"
                  >
                    Suporte
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default FeeTransparency;