'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, Wallet, ArrowRight, CheckCircle, AlertCircle,
  Coins, TrendingUp, Shield, Zap, Info, Copy, ExternalLink,
  Clock, Network, BarChart3, Target, Calculator
} from 'lucide-react';
// import { TaxCollectionFlow } from './TaxCollectionFlow';

interface FeeExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeeExplanationModal({ isOpen, onClose }: FeeExplanationModalProps) {
  if (!isOpen) return null;

  const destinationWallets = {
    ethereum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    arbitrum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    optimism: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    polygon: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    base: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    avalanche: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    bsc: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
    solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH'
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Endereço copiado!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Sistema de Taxa 0.34%</h2>
                <p className="text-green-400">Como Funciona a Arrecadação Automática</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Fluxo de Funcionamento */}
          <Card className="bg-gray-800 border-gray-700 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Fluxo Completo de Arrecadação
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Passo 1 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                  <span className="font-medium text-white">Análise</span>
                </div>
                <p className="text-sm text-gray-300">
                  Sistema analisa melhor DEX e calcula taxa de 0.34% sobre o valor da transação
                </p>
              </div>

              {/* Passo 2 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                  <span className="font-medium text-white">Redirecionamento</span>
                </div>
                <p className="text-sm text-gray-300">
                  Usuário é redirecionado para DEX e executa transação normalmente
                </p>
              </div>

              {/* Passo 3 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                  <span className="font-medium text-white">Monitoramento</span>
                </div>
                <p className="text-sm text-gray-300">
                  Sistema monitora blockchain e detecta quando transação é confirmada
                </p>
              </div>

              {/* Passo 4 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
                  <span className="font-medium text-white">Coleta</span>
                </div>
                <p className="text-sm text-gray-300">
                  Taxa é automaticamente coletada e enviada para carteiras de destino
                </p>
              </div>
            </div>
          </Card>

          {/* Exemplo Prático */}
          <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/30 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-500" />
              Exemplo Prático de Cálculo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">Cenário: Swap ETH → USDC</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor da Transação:</span>
                    <span className="text-white font-bold">$5,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa QuickTrade (0.05%):</span>
                    <span className="text-green-400 font-bold">$2.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa de Rede (Gas):</span>
                    <span className="text-white">$12.00</span>
                  </div>
                  <hr className="border-gray-600" />
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total de Taxas:</span>
                    <span className="text-white font-bold">$14.50</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-white mb-3">Distribuição da Taxa</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Para Carteira EVM:</span>
                    <span className="text-green-400 font-bold">$2.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token de Pagamento:</span>
                    <span className="text-white">USDC/USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tempo de Coleta:</span>
                    <span className="text-blue-400">2-5 minutos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">Automático</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Carteiras de Destino */}
          <Card className="bg-gray-800 border-gray-700 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-500" />
              Carteiras de Destino das Taxas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* EVM Networks */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-500" />
                  Redes EVM (ETH, ARB, OP, POLY, BASE, AVAX, BSC)
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Endereço:</span>
                  </div>
                  <div className="bg-gray-800 rounded p-2 flex items-center gap-2">
                    <code className="text-green-400 text-xs font-mono flex-1">
                      {destinationWallets.ethereum}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(destinationWallets.ethereum)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    ✅ Tokens aceitos: USDC, USDT, ETH, tokens nativos
                  </div>
                </div>
              </div>

              {/* Solana */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-purple-500" />
                  Rede Solana
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Endereço:</span>
                  </div>
                  <div className="bg-gray-800 rounded p-2 flex items-center gap-2">
                    <code className="text-purple-400 text-xs font-mono flex-1">
                      {destinationWallets.solana}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(destinationWallets.solana)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    ✅ Tokens aceitos: USDC, USDT, SOL
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Métodos de Coleta */}
          <Card className="bg-gray-800 border-gray-700 p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Métodos de Coleta Automática
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Coleta por Monitoramento
                </h4>
                <p className="text-sm text-gray-300 mb-2">
                  Sistema monitora transação na blockchain e executa coleta automaticamente
                </p>
                <div className="text-xs text-blue-400">
                  ⏱️ Tempo: 2-5 minutos após confirmação
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  Coleta por Token
                </h4>
                <p className="text-sm text-gray-300 mb-2">
                  Taxa é coletada no mesmo token da transação (USDC, USDT, etc.)
                </p>
                <div className="text-xs text-green-400">
                  💰 Método: Transferência direta
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  Coleta Segura
                </h4>
                <p className="text-sm text-gray-300 mb-2">
                  Múltiplas tentativas de coleta com fallback em caso de falha
                </p>
                <div className="text-xs text-purple-400">
                  🔒 Taxa de sucesso: 99.5%
                </div>
              </div>
            </div>
          </Card>

          {/* Transparência e Tracking */}
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-500" />
              Transparência e Tracking
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-white mb-2">📊 Logs de Auditoria</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Cada transação é registrada com timestamp</li>
                    <li>• Hash da transação original é armazenado</li>
                    <li>• Hash da coleta de taxa é registrado</li>
                    <li>• Valor exato coletado é documentado</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">🔍 Verificação Pública</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Carteiras de destino são públicas</li>
                    <li>• Transações visíveis no blockchain explorer</li>
                    <li>• Relatórios mensais de arrecadação</li>
                    <li>• API pública para verificação</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">Garantia de Transparência</p>
                    <p className="text-blue-200 text-sm">
                      Todas as taxas coletadas são registradas publicamente e podem ser verificadas 
                      nos blockchain explorers. O sistema opera com total transparência.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tax Collection Flow Component */}
          {/* <TaxCollectionFlow /> */}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="border-gray-600">
              Fechar
            </Button>
            <Button 
              onClick={() => window.open('https://etherscan.io/address/' + destinationWallets.ethereum, '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Carteira no Explorer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}