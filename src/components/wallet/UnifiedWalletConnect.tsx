'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  ChevronDown, 
  Copy, 
  CheckCircle, 
  LogOut, 
  Shield,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useWalletDetection } from '@/hooks';

interface UnifiedWalletConnectProps {
  size?: 'sm' | 'md' | 'lg';
  showBalance?: boolean;
  showDisconnect?: boolean;
  variant?: 'button' | 'card' | 'minimal';
  network?: 'auto' | 'bitcoin' | 'ethereum' | 'solana';
}

export function UnifiedWalletConnect({ 
  size = 'md',
  showBalance = true,
  showDisconnect = true,
  variant = 'button',
  network = 'auto'
}: UnifiedWalletConnectProps) {
  const wallet = useWallet();
  const { hasEthereum, hasSolana, connectEthereum, connectSolana } = useWalletDetection();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Real wallet connection handlers
  const handleConnectBitcoin = async () => {
    try {
      setConnecting(true);
      await wallet.connect('unisat'); // Try Unisat first
    } catch (error) {
      console.error('Failed to connect Bitcoin wallet:', error);
      try {
        await wallet.connect('xverse'); // Fallback to Xverse
      } catch (fallbackError) {
        console.error('All Bitcoin wallet connections failed:', fallbackError);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectEthereum = async () => {
    try {
      setConnecting(true);
      const address = await connectEthereum();
    } catch (error) {
      console.error('Failed to connect EVM wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectSolana = async () => {
    try {
      setConnecting(true);
      const address = await connectSolana();
    } catch (error) {
      console.error('Failed to connect Solana wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await wallet.disconnect();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: any) => {
    if (!balance) return '0.00';
    if (typeof balance === 'number') {
      return (balance / 100000000).toFixed(8); // Bitcoin format
    }
    if (balance.bitcoin) {
      return (balance.bitcoin / 100000000).toFixed(8);
    }
    return '0.00';
  };

  // Connected state - show wallet info
  if (wallet.isConnected && wallet.address) {
    if (variant === 'card') {
      return (
        <Card className="bg-gray-900 border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Shield className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {formatAddress(wallet.address)}
                </div>
                {showBalance && wallet.balance && (
                  <div className="text-xs text-gray-400">
                    {formatBalance(wallet.balance)} BTC
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              {showDisconnect && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      );
    }

    if (variant === 'minimal') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white">
            <Shield className="w-3 h-3 mr-1" />
            Connected
          </Badge>
          <span className="text-sm text-gray-300 font-mono">
            {formatAddress(wallet.address)}
          </span>
        </div>
      );
    }

    // Default button variant when connected
    return (
      <div className="relative">
        <Button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="bg-green-600 hover:bg-green-700 text-white"
          size={size}
        >
          <Shield className="w-4 h-4 mr-2" />
          {formatAddress(wallet.address)}
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isDropdownOpen && (
          <Card className="absolute top-full mt-2 right-0 w-80 bg-gray-900 border-gray-700 p-4 z-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Wallet Address</span>
                <Badge className="bg-green-600 text-white">Active</Badge>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-gray-800 rounded">
                <code className="flex-1 text-sm text-white font-mono break-all">
                  {wallet.address}
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

              {showBalance && wallet.balance && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Bitcoin Balance</span>
                    <span className="text-sm text-white font-mono">
                      {formatBalance(wallet.balance)} BTC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">USD Value</span>
                    <span className="text-sm text-green-400">
                      ${wallet.balance?.usd?.toLocaleString() || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              {showDisconnect && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect Wallet
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Not connected state - show connect options
  if (variant === 'card') {
    return (
      <Card className="bg-gray-900 border-gray-700 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-white">Connect Wallet</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={handleConnectBitcoin}
              disabled={connecting}
              className="bg-orange-600 hover:bg-orange-700 justify-start"
              size="sm"
            >
              <span className="mr-2">₿</span>
              Bitcoin Wallets
            </Button>
            
            {hasEthereum && (
              <Button
                onClick={handleConnectEthereum}
                disabled={connecting}
                className="bg-blue-600 hover:bg-blue-700 justify-start"
                size="sm"
              >
                <span className="mr-2">⟠</span>
                Ethereum Wallets
              </Button>
            )}
            
            {hasSolana && (
              <Button
                onClick={handleConnectSolana}
                disabled={connecting}
                className="bg-purple-600 hover:bg-purple-700 justify-start"
                size="sm"
              >
                <span className="mr-2">◎</span>
                Solana Wallets
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'minimal') {
    return (
      <Button
        onClick={network === 'bitcoin' ? handleConnectBitcoin : 
                network === 'ethereum' ? handleConnectEthereum :
                network === 'solana' ? handleConnectSolana :
                handleConnectBitcoin} // Default to Bitcoin
        disabled={connecting}
        size="sm"
        className="bg-orange-600 hover:bg-orange-700"
      >
        <Wallet className="w-3 h-3 mr-1" />
        Connect
      </Button>
    );
  }

  // Default button variant when not connected
  return (
    <div className="relative">
      <Button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={connecting}
        className="bg-orange-600 hover:bg-orange-700 text-white"
        size={size}
      >
        <Wallet className="w-4 h-4 mr-2" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isDropdownOpen && (
        <Card className="absolute top-full mt-2 right-0 w-64 bg-gray-900 border-gray-700 p-4 z-50">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white mb-3">Choose Wallet Type</h3>
            
            <Button
              onClick={handleConnectBitcoin}
              disabled={connecting}
              className="w-full bg-orange-600 hover:bg-orange-700 justify-start"
            >
              <span className="mr-2">₿</span>
              Bitcoin Wallets
              <span className="ml-auto text-xs text-orange-200">Unisat, Xverse</span>
            </Button>
            
            {hasEthereum && (
              <Button
                onClick={handleConnectEthereum}
                disabled={connecting}
                className="w-full bg-blue-600 hover:bg-blue-700 justify-start"
              >
                <span className="mr-2">⟠</span>
                Ethereum Wallets
                <span className="ml-auto text-xs text-blue-200">MetaMask, WalletConnect</span>
              </Button>
            )}
            
            {hasSolana && (
              <Button
                onClick={handleConnectSolana}
                disabled={connecting}
                className="w-full bg-purple-600 hover:bg-purple-700 justify-start"
              >
                <span className="mr-2">◎</span>
                Solana Wallets
                <span className="ml-auto text-xs text-purple-200">Phantom, Solflare</span>
              </Button>
            )}

            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-start gap-2 text-xs text-gray-400">
                <AlertTriangle className="w-3 h-3 mt-0.5" />
                <span>Real wallet connections only. No demo mode.</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}