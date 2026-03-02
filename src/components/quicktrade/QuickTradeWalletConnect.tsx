'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useBitcoinWallet } from '@/contexts/BitcoinWalletContext';

interface QuickTradeWalletConnectProps {
  onWalletConnect?: (address: string, walletType: 'bitcoin' | 'ethereum' | 'solana') => void;
  selectedNetwork?: string;
  requiredNetworks?: string[];
}

export function QuickTradeWalletConnect({
  onWalletConnect,
  selectedNetwork = 'ethereum',
  requiredNetworks = ['ethereum', 'bitcoin', 'solana']
}: QuickTradeWalletConnectProps) {
  const bitcoinWallet = useBitcoinWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Extract values from wallet context
  const isConnected = bitcoinWallet.state.isConnected;
  const address = bitcoinWallet.state.address;
  const walletType = bitcoinWallet.state.provider as 'bitcoin' | 'ethereum' | 'solana' | null;
  const balance = { bitcoin: bitcoinWallet.state.balance, ethereum: 0, solana: 0, usd: 0 };

  // Notificar pai quando conectar
  useEffect(() => {
    if (isConnected && address && walletType && onWalletConnect) {
      onWalletConnect(address, walletType);
    }
  }, [isConnected, address, walletType, onWalletConnect]);

  // Handlers de conexão
  const handleConnectBitcoin = async (type: 'unisat' | 'xverse' | 'ord') => {
    try {
      setError(null);
      setIsConnecting(true);
      await bitcoinWallet.connectWallet(type);
      setShowDropdown(false);
    } catch (error: any) {
      setError(error.message || 'Erro ao conectar carteira Bitcoin');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectEthereum = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      await bitcoinWallet.connectWallet('ethereum');
      setShowDropdown(false);
    } catch (error: any) {
      setError(error.message || 'Erro ao conectar MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSolana = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      await bitcoinWallet.connectWallet('solana');
      setShowDropdown(false);
    } catch (error: any) {
      setError(error.message || 'Erro ao conectar Phantom');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      bitcoinWallet.disconnectWallet();
      setShowDropdown(false);
    } catch (error: any) {
      setError(error.message || 'Erro ao desconectar');
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getWalletIcon = () => {
    switch (walletType) {
      case 'bitcoin': return '₿';
      case 'ethereum': return '🦊';
      case 'solana': return '👻';
      default: return '💳';
    }
  };

  const getWalletLabel = () => {
    switch (walletType) {
      case 'bitcoin': return 'Bitcoin Wallet';
      case 'ethereum': return 'MetaMask';
      case 'solana': return 'Phantom';
      default: return 'Wallet';
    }
  };

  const getBalanceDisplay = () => {
    if (!balance) return '0.00';

    switch (walletType) {
      case 'bitcoin':
        return `${(balance.bitcoin || 0).toFixed(8)} BTC`;
      case 'ethereum':
        return `${(balance.ethereum || 0).toFixed(4)} ETH`;
      case 'solana':
        return `${(balance.solana || 0).toFixed(2)} SOL`;
      default:
        return '0.00';
    }
  };

  // Estado conectado
  if (isConnected && address) {
    return (
      <div className="relative">
        <Button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <Shield className="w-4 h-4 mr-2" />
          {getWalletIcon()} {formatAddress(address)}
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </Button>

        {showDropdown && (
          <Card className="absolute top-full mt-2 left-0 w-80 bg-gray-900 border-gray-700 p-4 z-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{getWalletLabel()}</span>
                <Badge className="bg-green-600 text-white">Connected</Badge>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-gray-800 rounded">
                <code className="flex-1 text-sm text-white font-mono break-all">
                  {address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Balance</span>
                  <span className="text-sm text-white font-mono">
                    {getBalanceDisplay()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">USD Value</span>
                  <span className="text-sm text-green-400">
                    ${(balance?.usd || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Estado não conectado - seletor de carteiras
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-500" />
          Connect Wallet for Quick Trade
        </h3>
        <Badge variant="outline" className="text-xs">
          Required for Trading
        </Badge>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Network-specific wallet options */}
      <div className="grid gap-2">
        {/* Bitcoin Wallets */}
        {(selectedNetwork === 'bitcoin' || requiredNetworks.includes('bitcoin')) && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium">Bitcoin Wallets</div>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => handleConnectBitcoin('unisat')}
                disabled={isConnecting}
                variant="outline"
                className="justify-start border-orange-600 hover:bg-orange-600/10"
              >
                🟠 Unisat Wallet
                <span className="ml-auto text-xs text-orange-400">Recommended</span>
              </Button>
              <Button
                onClick={() => handleConnectBitcoin('xverse')}
                disabled={isConnecting}
                variant="outline"
                className="justify-start border-purple-600 hover:bg-purple-600/10"
              >
                🔷 Xverse Wallet
                <span className="ml-auto text-xs text-purple-400">Advanced</span>
              </Button>
            </div>
          </div>
        )}

        {/* Ethereum Wallets */}
        {(selectedNetwork === 'ethereum' || selectedNetwork === 'arbitrum' || selectedNetwork === 'optimism' || selectedNetwork === 'polygon' || selectedNetwork === 'base' || selectedNetwork === 'avalanche' || selectedNetwork === 'bsc' || requiredNetworks.some(net => ['ethereum', 'arbitrum', 'optimism', 'polygon', 'base', 'avalanche', 'bsc'].includes(net))) && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium">EVM Wallets</div>
            <Button
              onClick={handleConnectEthereum}
              disabled={isConnecting}
              variant="outline"
              className="justify-start border-blue-600 hover:bg-blue-600/10"
            >
              🦊 MetaMask
              <span className="ml-auto text-xs text-blue-400">Most Popular</span>
            </Button>
          </div>
        )}

        {/* Solana Wallets */}
        {(selectedNetwork === 'solana' || requiredNetworks.includes('solana')) && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium">Solana Wallets</div>
            <Button
              onClick={handleConnectSolana}
              disabled={isConnecting}
              variant="outline"
              className="justify-start border-purple-600 hover:bg-purple-600/10"
            >
              👻 Phantom Wallet
              <span className="ml-auto text-xs text-purple-400">Popular</span>
            </Button>
          </div>
        )}
      </div>

      {isConnecting && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-sm text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Connecting wallet...
          </div>
        </div>
      )}

      {/* Help Links */}
      <div className="pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2">Need a wallet?</div>
        <div className="flex gap-2">
          <Button
            variant="link"
            size="sm"
            className="text-orange-400 hover:text-orange-300 p-0 h-auto"
            onClick={() => window.open('https://unisat.io/', '_blank')}
          >
            Get Unisat
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          <Button
            variant="link"
            size="sm"
            className="text-blue-400 hover:text-blue-300 p-0 h-auto"
            onClick={() => window.open('https://metamask.io/', '_blank')}
          >
            Get MetaMask
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          <Button
            variant="link"
            size="sm"
            className="text-purple-400 hover:text-purple-300 p-0 h-auto"
            onClick={() => window.open('https://phantom.app/', '_blank')}
          >
            Get Phantom
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}