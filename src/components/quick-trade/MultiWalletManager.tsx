/**
 * Multi-Wallet Manager Component
 * Interface principal para gerenciar múltiplas carteiras em Quick Trade
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  RefreshCw,
  Copy,
  ExternalLink,
  Settings,
  Plus,
  Minus,
  Target,
  Network,
  Bitcoin,
  Coins
} from 'lucide-react';
import useMultiWallet from '@/hooks/useMultiWallet';

interface MultiWalletManagerProps {
  selectedAsset?: string;
  onWalletChange?: (walletInfo: any) => void;
  autoConnect?: boolean;
  showRecommendations?: boolean;
}

/**
 * Componente principal do gerenciador de carteiras
 */
export function MultiWalletManager({ 
  selectedAsset = 'BTC',
  onWalletChange,
  autoConnect = true,
  showRecommendations = true
}: MultiWalletManagerProps) {
  const multiWallet = useMultiWallet();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Estado local para controle de conexões
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  // Recomendação para o ativo atual
  const recommendation = multiWallet.getWalletRecommendation(selectedAsset);
  const activeWallet = multiWallet.getActiveWalletForAsset(selectedAsset);

  /**
   * Conecta carteira automaticamente se necessário
   */
  useEffect(() => {
    if (autoConnect && recommendation && !activeWallet && multiWallet.isInitialized) {
      // Note: Auto-connect pode ser habilitado aqui se desejado
    }
  }, [autoConnect, recommendation, activeWallet, selectedAsset, multiWallet.isInitialized]);

  /**
   * Notifica mudanças de carteira
   */
  useEffect(() => {
    if (onWalletChange && activeWallet) {
      onWalletChange(activeWallet);
    }
  }, [activeWallet, onWalletChange]);

  /**
   * Conecta carteira específica
   */
  const handleConnectWallet = async (networkType: 'bitcoin' | 'evm' | 'solana', walletType: string) => {
    setConnectingWallet(`${networkType}-${walletType}`);
    
    try {
      switch (networkType) {
        case 'bitcoin':
          await multiWallet.connectBitcoinWallet(walletType as any);
          break;
        case 'evm':
          await multiWallet.connectEVMWallet(walletType as any);
          break;
        case 'solana':
          await multiWallet.connectSolanaWallet(walletType as any);
          break;
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnectingWallet(null);
    }
  };

  /**
   * Desconecta carteira específica
   */
  const handleDisconnectWallet = async (networkType: 'bitcoin' | 'evm' | 'solana', walletType: string) => {
    try {
      switch (networkType) {
        case 'bitcoin':
          await multiWallet.disconnectBitcoinWallet();
          break;
        case 'evm':
          await multiWallet.disconnectEVMWallet(walletType);
          break;
        case 'solana':
          await multiWallet.disconnectSolanaWallet(walletType);
          break;
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  /**
   * Copia endereço para clipboard
   */
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  /**
   * Formata endereço para exibição
   */
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Formata saldo
   */
  const formatBalance = (balance: number, symbol: string = '') => {
    if (balance === 0) return '0.00';
    if (balance < 0.001) return '< 0.001';
    return `${balance.toFixed(6)} ${symbol}`.trim();
  };

  /**
   * Obtém ícone da carteira
   */
  const getWalletIcon = (walletType: string) => {
    const icons: Record<string, string> = {
      // Bitcoin
      unisat: '🟠',
      xverse: '✖️',
      oyl: '🛢️',
      magiceden: '🪄',
      // EVM
      metamask: '🦊',
      rabby: '🐰',
      coinbase: '🔵',
      walletconnect: '🔗',
      // Solana
      phantom: '👻',
      solflare: '☀️',
      backpack: '🎒',
      sollet: '🟣'
    };
    return icons[walletType] || '💼';
  };

  /**
   * Obtém cor da rede
   */
  const getNetworkColor = (networkType: 'bitcoin' | 'evm' | 'solana') => {
    const colors = {
      bitcoin: 'text-orange-500 bg-orange-100',
      evm: 'text-blue-500 bg-blue-100',
      solana: 'text-purple-500 bg-purple-100'
    };
    return colors[networkType] || 'text-gray-500 bg-gray-100';
  };

  if (!multiWallet.isInitialized) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-gray-600">Inicializando carteiras...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com resumo */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span>Multi-Wallet Manager</span>
              <Badge variant="outline" className="ml-2">
                {multiWallet.totalConnections} connected
              </Badge>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Recomendação para ativo atual */}
          {showRecommendations && recommendation && (
            <Alert className={recommendation.isOptimal ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"}>
              <Target className="w-4 h-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Para {selectedAsset}:</strong> {recommendation.walletType} 
                    {recommendation.isOptimal ? ' (Conectado)' : ' (Recomendado)'}
                  </span>
                  {!recommendation.isOptimal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConnectWallet(recommendation.networkType, recommendation.walletType)}
                      disabled={connectingWallet === `${recommendation.networkType}-${recommendation.walletType}`}
                    >
                      {connectingWallet === `${recommendation.networkType}-${recommendation.walletType}` ? (
                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Conectar
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Carteira ativa para o ativo */}
          {activeWallet && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getWalletIcon(activeWallet.walletType)}</span>
                  <div>
                    <div className="font-medium">
                      {activeWallet.walletType} ({activeWallet.type})
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatAddress(activeWallet.address)}
                    </div>
                  </div>
                  <Badge className={getNetworkColor(activeWallet.type)}>
                    {activeWallet.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatBalance(activeWallet.balance, selectedAsset)}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAddress(activeWallet.address)}
                    >
                      {copiedAddress === activeWallet.address ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://explorer.com/address/${activeWallet.address}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhes expandidos */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Bitcoin Wallets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Bitcoin className="w-5 h-5 text-orange-500" />
                <span>Bitcoin Wallets</span>
                <Badge variant="outline">
                  {multiWallet.bitcoin.isConnected ? '1 connected' : 'Not connected'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {multiWallet.bitcoin.isConnected ? (
                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getWalletIcon(multiWallet.bitcoin.walletType || '')}</span>
                    <div>
                      <div className="font-medium">{multiWallet.bitcoin.walletType}</div>
                      <div className="text-sm text-gray-600">
                        {formatAddress(multiWallet.bitcoin.address || '')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {formatBalance(multiWallet.bitcoin.balance, 'BTC')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectWallet('bitcoin', multiWallet.bitcoin.walletType || '')}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {['unisat', 'xverse', 'oyl', 'magiceden'].map(walletType => (
                    <Button
                      key={walletType}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleConnectWallet('bitcoin', walletType)}
                      disabled={connectingWallet === `bitcoin-${walletType}`}
                    >
                      <span className="mr-2">{getWalletIcon(walletType)}</span>
                      {walletType}
                      {connectingWallet === `bitcoin-${walletType}` && (
                        <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
              {multiWallet.bitcoin.error && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{multiWallet.bitcoin.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* EVM Wallets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-blue-500" />
                <span>EVM Wallets</span>
                <Badge variant="outline">
                  {multiWallet.evm.connections.length} connected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {multiWallet.evm.connections.length > 0 ? (
                <div className="space-y-2">
                  {multiWallet.evm.connections.map(connection => (
                    <div key={connection.walletType} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getWalletIcon(connection.walletType)}</span>
                        <div>
                          <div className="font-medium">{connection.walletType}</div>
                          <div className="text-sm text-gray-600">
                            {formatAddress(connection.address)} • Chain {connection.chainId}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {formatBalance(parseFloat(connection.balance) / 1e18, 'ETH')}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectWallet('evm', connection.walletType)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {multiWallet.evm.availableWallets.map(walletType => (
                    <Button
                      key={walletType}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleConnectWallet('evm', walletType)}
                      disabled={connectingWallet === `evm-${walletType}`}
                    >
                      <span className="mr-2">{getWalletIcon(walletType)}</span>
                      {walletType}
                      {connectingWallet === `evm-${walletType}` && (
                        <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
              {multiWallet.evm.error && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{multiWallet.evm.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Solana Wallets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-purple-500" />
                <span>Solana Wallets</span>
                <Badge variant="outline">
                  {multiWallet.solana.connections.length} connected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {multiWallet.solana.connections.length > 0 ? (
                <div className="space-y-2">
                  {multiWallet.solana.connections.map(connection => (
                    <div key={connection.walletType} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getWalletIcon(connection.walletType)}</span>
                        <div>
                          <div className="font-medium">{connection.walletType}</div>
                          <div className="text-sm text-gray-600">
                            {formatAddress(connection.address)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {formatBalance(connection.balance, 'SOL')}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectWallet('solana', connection.walletType)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {multiWallet.solana.availableWallets.map(walletType => (
                    <Button
                      key={walletType}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleConnectWallet('solana', walletType)}
                      disabled={connectingWallet === `solana-${walletType}`}
                    >
                      <span className="mr-2">{getWalletIcon(walletType)}</span>
                      {walletType}
                      {connectingWallet === `solana-${walletType}` && (
                        <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
              {multiWallet.solana.error && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{multiWallet.solana.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configurações avançadas */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações Avançadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Auto-connect para assets</span>
              <Badge variant={autoConnect ? "default" : "outline"}>
                {autoConnect ? "Ativado" : "Desativado"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Mostrar recomendações</span>
              <Badge variant={showRecommendations ? "default" : "outline"}>
                {showRecommendations ? "Ativado" : "Desativado"}
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={multiWallet.initializeWallets}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Redetectar Carteiras
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MultiWalletManager;