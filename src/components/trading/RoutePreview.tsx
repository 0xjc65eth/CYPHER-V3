'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Clock,
  DollarSign,
  Fuel,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Repeat,
  Target,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Types (replicando do componente principal)
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

interface RoutePreviewProps {
  tradeDetails: TradeDetails;
  onConfirm: () => void;
  onBack: () => void;
  slippageTolerance: number;
}

// Exchange logos
const exchangeLogos: Record<string, string> = {
  'Uniswap V3': '🦄',
  'Uniswap V2': '🦄',
  '1inch': '🔮',
  'SushiSwap': '🍣',
  'PancakeSwap': '🥞',
  'Curve': '🌊',
  'Balancer': '⚖️',
  'Kyber': '💎',
  'Bancor': '🔗',
  'Velodrome': '🏎️'
};

export function RoutePreview({ tradeDetails, onConfirm, onBack, slippageTolerance }: RoutePreviewProps) {
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [customSlippage, setCustomSlippage] = useState(slippageTolerance);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { fromToken, toToken, fromAmount, bestRoute, allRoutes, totalFees, priceImpact, estimatedTime } = tradeDetails;

  // Calcular preço de execução
  const executionPrice = bestRoute.estimatedOutput / parseFloat(fromAmount);
  const marketPrice = toToken.price / fromToken.price;
  const priceDifference = ((executionPrice - marketPrice) / marketPrice) * 100;

  // Calcular output mínimo com slippage
  const minimumReceived = bestRoute.estimatedOutput * (1 - customSlippage / 100);

  // Determinar cor do impacto de preço
  const getPriceImpactColor = (impact: number) => {
    if (impact < 0.1) return 'text-green-400';
    if (impact < 0.5) return 'text-yellow-400';
    if (impact < 1) return 'text-orange-400';
    return 'text-red-400';
  };

  // Formatar números
  const formatNumber = (num: number, decimals: number = 4) => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-white">Preview da Rota</h2>
                  <p className="text-sm text-gray-400">Revise os detalhes antes de confirmar</p>
                </div>
              </div>
              <Badge className="bg-green-600 text-white">
                Melhor Rota Encontrada
              </Badge>
            </div>

            {/* Trade Summary */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="font-bold text-white">{fromToken.symbol[0]}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{fromAmount}</div>
                    <div className="text-sm text-gray-400">{fromToken.symbol}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-6 h-6 text-blue-400" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">
                      {formatNumber(bestRoute.estimatedOutput)}
                    </div>
                    <div className="text-sm text-gray-400">{toToken.symbol}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="font-bold text-white">{toToken.symbol[0]}</span>
                  </div>
                </div>
              </div>

              {/* USD Values */}
              <div className="flex justify-between text-sm text-gray-400 border-t border-gray-700 pt-3">
                <span>≈ ${(parseFloat(fromAmount) * fromToken.price).toLocaleString()}</span>
                <span>≈ ${(bestRoute.estimatedOutput * toToken.price).toLocaleString()}</span>
              </div>
            </Card>

            {/* Best Route Details */}
            <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {exchangeLogos[bestRoute.exchange] || '🔄'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{bestRoute.exchange ?? '—'}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-white text-xs">
                        {bestRoute.confidence}% Confiança
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Liquidez: ${(bestRoute.liquidityUSD / 1000000).toFixed(1)}M
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Rota Otimizada</span>
                  </div>
                </div>
              </div>

              {/* Route Path */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-400">Caminho:</span>
                {bestRoute.path.map((token, index) => (
                  <React.Fragment key={token}>
                    <Badge variant="outline" className="text-xs">
                      {token}
                    </Badge>
                    {index < bestRoute.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-lg font-bold ${getPriceImpactColor(bestRoute.priceImpact)}`}>
                    {bestRoute.priceImpact.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-400">Impacto no Preço</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    ${bestRoute.gasUSD.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Taxa de Rede</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">
                    ~{estimatedTime}s
                  </div>
                  <div className="text-xs text-gray-400">Tempo Estimado</div>
                </div>
              </div>
            </Card>

            {/* Slippage Settings */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Configurações de Slippage
                </h4>
                <span className="text-sm text-blue-400">{customSlippage.toFixed(1)}%</span>
              </div>
              
              <div className="space-y-3">
                <Slider
                  value={[customSlippage]}
                  onValueChange={([value]: number[]) => setCustomSlippage(value)}
                  max={5}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0.1% (Baixo risco)</span>
                  <span>5.0% (Alto risco)</span>
                </div>
                
                <div className="bg-gray-700/50 rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Mínimo recebido:</span>
                    <span className="text-white font-medium">
                      {formatNumber(minimumReceived)} {toToken.symbol}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Com {customSlippage}% de tolerância ao slippage
                  </div>
                </div>
              </div>
            </Card>

            {/* Cost Breakdown */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Detalhamento de Custos
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa de rede ({bestRoute.exchange}):</span>
                  <span className="text-white">${bestRoute.gasUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa CYPHER (0.05%):</span>
                  <span className="text-orange-400">
                    ${((parseFloat(fromAmount) * fromToken.price) * 0.0005).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Impacto no preço:</span>
                  <span className={getPriceImpactColor(bestRoute.priceImpact)}>
                    ${((parseFloat(fromAmount) * fromToken.price) * (bestRoute.priceImpact / 100)).toFixed(2)}
                  </span>
                </div>
                <hr className="border-gray-600" />
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Custo total estimado:</span>
                  <span className="text-white">${totalFees.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* All Routes Comparison */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Comparação de Rotas ({allRoutes.length})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllRoutes(!showAllRoutes)}
                >
                  {showAllRoutes ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {showAllRoutes && (
                <div className="space-y-2">
                  {allRoutes.map((route, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded border ${
                        index === 0 
                          ? 'bg-green-900/20 border-green-500/30' 
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {exchangeLogos[route.exchange] || '🔄'}
                          </span>
                          <div>
                            <div className="font-medium text-white">{route.exchange ?? '—'}</div>
                            <div className="text-xs text-gray-400">
                              Gas: ${route.gasUSD.toFixed(2)} • Impacto: {route.priceImpact.toFixed(2)}%
                            </div>
                          </div>
                          {index === 0 && (
                            <Badge className="bg-green-600 text-white text-xs">
                              Melhor
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            {formatNumber(route.estimatedOutput)} {toToken.symbol}
                          </div>
                          <div className="text-xs text-gray-400">
                            {route.confidence}% confiança
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Risk Warnings */}
            <Card className="bg-yellow-900/20 border-yellow-500/30 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-400 mb-2">Avisos Importantes</h4>
                  <ul className="text-sm text-yellow-200 space-y-1">
                    <li>• O preço pode mudar durante a execução da transação</li>
                    <li>• Taxa de rede pode variar dependendo do congestionamento</li>
                    <li>• Slippage maior que {customSlippage}% fará a transação falhar</li>
                    {bestRoute.priceImpact > 1 && (
                      <li className="text-red-400">• Alto impacto no preço detectado ({bestRoute.priceImpact.toFixed(2)}%)</li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="flex-1 border-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Trade
              </Button>
            </div>

            {/* Footer Info */}
            <div className="text-center text-xs text-gray-400">
              Powered by CYPHER TRADE • Melhor execução cross-DEX garantida
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}