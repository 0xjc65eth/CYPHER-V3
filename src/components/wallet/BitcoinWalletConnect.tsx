'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle, AlertCircle, ExternalLink, Copy, LogOut } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import type { WalletType } from '@/services/WalletService';

const SUPPORTED_WALLETS = [
  {
    name: 'Unisat',
    id: 'unisat' as WalletType,
    icon: '🟠',
    description: 'Popular Bitcoin wallet with Ordinals support'
  },
  {
    name: 'Xverse',
    id: 'xverse' as WalletType,
    icon: '🔷',
    description: 'Bitcoin & Stacks wallet with advanced features'
  },
];

export function BitcoinWalletConnect() {
  const {
    isConnected,
    isConnecting,
    address,
    walletInfo,
    balance,
    connect,
    disconnect
  } = useWallet();
  const ordinalsAddress = walletInfo.ordinalsAddress?.address ?? null;
  const network = walletInfo.connected ? 'mainnet' : null;

  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConnect = async (walletId: WalletType) => {
    try {
      setError(null);
      setSelectedWallet(walletId);
      await connect(walletId);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(`Failed to connect ${walletId}. Make sure the wallet extension is installed.`);
      setSelectedWallet(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      disconnect();
      setSelectedWallet(null);
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatBalance = (balanceVal: number | null) => {
    if (balanceVal == null) return '0';
    return balanceVal.toFixed(8);
  };

  if (isConnected && address) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Wallet className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Bitcoin Wallet Connected</h3>
                <p className="text-sm text-gray-400">
                  {selectedWallet ? SUPPORTED_WALLETS.find(w => w.id === selectedWallet)?.name : 'Connected'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="border-red-600 text-red-400 hover:bg-red-600/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>

          <div className="space-y-3 bg-gray-800 rounded-lg p-4">
            {/* Payment Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">Payment Address</span>
                <Badge className="bg-green-600/20 text-green-400">Active</Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-orange-400 font-mono">
                  {formatAddress(address)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyAddress(address)}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Ordinals Address */}
            {ordinalsAddress && ordinalsAddress !== address && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Ordinals Address</span>
                  <Badge className="bg-purple-600/20 text-purple-400">Taproot</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-purple-400 font-mono">
                    {formatAddress(ordinalsAddress)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(ordinalsAddress)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Balance */}
            {balance != null && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                <span className="text-sm text-gray-400">Balance</span>
                <div className="text-right">
                  <div className="text-white font-bold">
                    {formatBalance(balance)} BTC
                  </div>
                </div>
              </div>
            )}

            {/* Network */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Network</span>
              <Badge className={network === 'mainnet' ? 'bg-green-600' : 'bg-yellow-600'}>
                {network || 'unknown'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700 p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Wallet className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Connect Bitcoin Wallet</h3>
            <p className="text-sm text-gray-400">Choose your preferred Bitcoin wallet</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUPPORTED_WALLETS.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              onClick={() => handleConnect(wallet.id)}
              disabled={isConnecting}
              className="h-auto p-4 flex flex-col items-center gap-2 border-gray-700 hover:border-orange-500 hover:bg-orange-500/10 transition-all"
            >
              <span className="text-2xl">{wallet.icon}</span>
              <div className="text-center">
                <div className="font-semibold text-white">{wallet.name}</div>
                <div className="text-xs text-gray-400 mt-1">{wallet.description}</div>
              </div>
              {isConnecting && selectedWallet === wallet.id && (
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              )}
            </Button>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span>
              Make sure you have one of these wallet extensions installed in your browser
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="link"
              size="sm"
              className="text-orange-400 hover:text-orange-300 p-0"
              onClick={() => window.open('https://unisat.io/', '_blank')}
            >
              Get Unisat
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-orange-400 hover:text-orange-300 p-0"
              onClick={() => window.open('https://www.xverse.app/', '_blank')}
            >
              Get Xverse
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}