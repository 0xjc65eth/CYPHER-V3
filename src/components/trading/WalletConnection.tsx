'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet,
  Shield,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  Globe,
  Smartphone,
  Monitor as Desktop,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  LogOut,
  User,
  DollarSign
} from 'lucide-react';

// Interfaces
interface WalletConnectionProps {
  isConnected: boolean;
  address: string;
  onConnect: (address: string, walletType: string) => void;
  onDisconnect: () => void;
  selectedNetwork: string;
}

// Tipos de wallet suportados
interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  isInstalled: boolean;
  networks: string[];
  downloadUrl: string;
}

// Mock wallet providers
const WALLET_PROVIDERS: WalletProvider[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'A crypto wallet & gateway to blockchain apps',
    isInstalled: typeof window !== 'undefined' && !!window.ethereum?.isMetaMask,
    networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'avalanche', 'bsc'],
    downloadUrl: 'https://metamask.io/'
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Connect with mobile wallets',
    isInstalled: true,
    networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'avalanche', 'bsc'],
    downloadUrl: 'https://walletconnect.org/'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Connect with Coinbase Wallet',
    isInstalled: typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet,
    networks: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base'],
    downloadUrl: 'https://wallet.coinbase.com/'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    description: 'A friendly Solana wallet',
    isInstalled: typeof window !== 'undefined' && !!window.solana?.isPhantom,
    networks: ['solana'],
    downloadUrl: 'https://phantom.app/'
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '🌟',
    description: 'Solana wallet for DeFi & NFTs',
    isInstalled: typeof window !== 'undefined' && !!(window as any).solflare,
    networks: ['solana'],
    downloadUrl: 'https://solflare.com/'
  }
];

export function WalletConnection({ isConnected, address, onConnect, onDisconnect, selectedNetwork }: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'auto' | 'manual'>('auto');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>('');
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'connecting' | 'error'>('connected');

  // Filtrar wallets por rede
  const compatibleWallets = WALLET_PROVIDERS.filter(wallet =>
    wallet.networks.includes(selectedNetwork)
  );

  // Mock balance para demonstração
  useEffect(() => {
    if (isConnected) {
      setWalletBalance('$12,847.32');
    } else {
      setWalletBalance('');
    }
  }, [isConnected]);

  // Conectar com wallet específica
  const connectWallet = async (walletId: string) => {
    const wallet = WALLET_PROVIDERS.find(w => w.id === walletId);
    if (!wallet) return;

    if (!wallet.isInstalled) {
      if (confirm(`${wallet.name} não está instalada. Deseja baixar?`)) {
        window.open(wallet.downloadUrl, '_blank');
      }
      return;
    }

    setIsConnecting(true);
    setNetworkStatus('connecting');

    try {
      let connectedAddress = '';

      switch (walletId) {
        case 'metamask':
          if (window.ethereum?.isMetaMask) {
            const accounts = await (window.ethereum as any).request({
              method: 'eth_requestAccounts'
            });
            connectedAddress = accounts[0];
          }
          break;

        case 'phantom':
          if (window.solana?.isPhantom) {
            const response = await window.solana.connect();
            connectedAddress = response.publicKey.toString();
          }
          break;

        case 'walletconnect':
          // Simular conexão WalletConnect
          await new Promise(resolve => setTimeout(resolve, 2000));
          connectedAddress = '0x742d35Cc6634C0532925a3b8D74B432'; // Mock address
          break;

        case 'coinbase':
          if (window.ethereum?.isCoinbaseWallet) {
            const accounts = await (window.ethereum as any).request({
              method: 'eth_requestAccounts'
            });
            connectedAddress = accounts[0];
          }
          break;

        default:
          throw new Error('Wallet não suportada');
      }

      if (connectedAddress) {
        setNetworkStatus('connected');
        onConnect(connectedAddress, walletId);
      } else {
        throw new Error('Falha ao obter endereço');
      }
    } catch (error) {
      console.error('Erro ao conectar wallet:', error);
      setNetworkStatus('error');
      alert('Erro ao conectar wallet. Tente novamente.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Conectar manualmente
  const connectManually = () => {
    if (!manualAddress.trim()) {
      alert('Por favor, insira um endereço válido');
      return;
    }

    // Validação básica de endereço
    const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(manualAddress);
    const isSolAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(manualAddress);

    if (selectedNetwork === 'solana' && !isSolAddress) {
      alert('Endereço Solana inválido');
      return;
    } else if (selectedNetwork !== 'solana' && !isEthAddress) {
      alert('Endereço Ethereum inválido');
      return;
    }

    onConnect(manualAddress, 'manual');
    setManualAddress('');
    setShowManualInput(false);
  };

  // Copiar endereço
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  // Formatar endereço
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Se já conectado, mostrar status
  if (isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-4">
        <div className="space-y-4">
          {/* Header conectado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Carteira Conectada</div>
                <div className="text-xs text-green-400">Rede: {selectedNetwork}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                networkStatus === 'connected' ? 'bg-green-400' : 
                networkStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-gray-400">
                {networkStatus === 'connected' ? 'Online' : 
                 networkStatus === 'connecting' ? 'Conectando' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 mb-1">Endereço</div>
                <div className="font-mono text-sm text-white">{formatAddress(address)}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="text-blue-400 hover:text-blue-300"
              >
                {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Balance */}
          {walletBalance && (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Saldo Estimado</div>
                  <div className="text-lg font-bold text-blue-400">{walletBalance}</div>
                </div>
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNetworkStatus('connecting')}
              className="flex-1 border-gray-600 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              className="flex-1 border-red-600 text-red-400 hover:bg-red-600/10 text-xs"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Desconectar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Interface de conexão
  return (
    <Card className="bg-gray-900 border-gray-700 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Conectar Carteira</h3>
            <p className="text-sm text-gray-400">Escolha uma carteira para continuar</p>
          </div>
        </div>

        {/* Connection Methods */}
        <Tabs value={connectionMethod} onValueChange={(value) => setConnectionMethod(value as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="auto">Automática</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-3">
            {compatibleWallets.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma carteira compatível com {selectedNetwork}</p>
              </div>
            ) : (
              compatibleWallets.map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  onClick={() => connectWallet(wallet.id)}
                  disabled={isConnecting}
                  className={`w-full justify-start p-4 h-auto border-gray-600 hover:border-blue-500 ${
                    !wallet.isInstalled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-2xl">{wallet.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white flex items-center gap-2">
                        {wallet.name}
                        {!wallet.isInstalled && (
                          <Badge variant="outline" className="text-xs">
                            Não instalada
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{wallet.description}</div>
                    </div>
                    {isConnecting ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : !wallet.isInstalled ? (
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    ) : (
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                    )}
                  </div>
                </Button>
              ))
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Endereço da carteira ({selectedNetwork === 'solana' ? 'Solana' : 'EVM'})
                </label>
                <Input
                  placeholder={
                    selectedNetwork === 'solana'
                      ? 'Cole seu endereço Solana aqui...'
                      : 'Cole seu endereço EVM aqui...'
                  }
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 font-mono text-sm"
                />
              </div>
              
              <Button
                onClick={connectManually}
                disabled={!manualAddress.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <User className="w-4 h-4 mr-2" />
                Conectar Manualmente
              </Button>
            </div>

            {/* Manual Connection Info */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <div className="font-medium mb-1">Conexão Manual</div>
                  <div className="text-xs">
                    Apenas visualização. Você não poderá assinar transações automaticamente.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Network Info */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400">Rede ativa:</span>
            </div>
            <span className="text-blue-400 font-medium capitalize">{selectedNetwork}</span>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-green-400 mt-0.5" />
            <div className="text-sm text-green-200">
              <div className="font-medium mb-1">Segurança Garantida</div>
              <div className="text-xs">
                CYPHER TRADE nunca armazena suas chaves privadas. Todas as transações são assinadas localmente.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}