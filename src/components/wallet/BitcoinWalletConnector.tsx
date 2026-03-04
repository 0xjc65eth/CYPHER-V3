'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Coins,
  TrendingUp,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSafeLaserEyes } from '@/hooks/useSafeLaserEyes';

export interface BitcoinWallet {
  id: string;
  name: string;
  icon: string;
  description: string;
  supported: string[];
  website: string;
  downloadUrl?: string;
}

const BITCOIN_WALLETS: BitcoinWallet[] = [
  {
    id: 'XVERSE',
    name: 'Xverse',
    icon: '🟣',
    description: 'The most popular Bitcoin wallet for Ordinals and Runes',
    supported: ['Bitcoin', 'Ordinals', 'Runes', 'BRC-20', 'Stacks'],
    website: 'https://xverse.app',
    downloadUrl: 'https://chrome.google.com/webstore/detail/xverse-wallet/idnnbdplmphgjfnlphdnchkgggfhhgjd'
  },
  {
    id: 'UNISAT',
    name: 'UniSat',
    icon: '🟠',
    description: 'Professional Bitcoin wallet with advanced features',
    supported: ['Bitcoin', 'Ordinals', 'Runes', 'BRC-20'],
    website: 'https://unisat.io',
    downloadUrl: 'https://chrome.google.com/webstore/detail/unisat-wallet/ppbibelpcjmhbdihakflkdcoccbgbkpo'
  },
  {
    id: 'OYL',
    name: 'OYL Wallet',
    icon: '🔵',
    description: 'Advanced Bitcoin wallet for power users',
    supported: ['Bitcoin', 'Ordinals', 'Runes', 'BRC-20'],
    website: 'https://oyl.io',
    downloadUrl: 'https://chrome.google.com/webstore/detail/oyl-wallet/hbllddbaojdpiobhnbklmhfaijhcgdpm'
  },
  {
    id: 'MAGIC_EDEN',
    name: 'Gamma.io',
    icon: '🟢',
    description: 'The leading Bitcoin NFT marketplace',
    supported: ['Bitcoin', 'Ordinals', 'Runes'],
    website: 'https://gamma.io',
    downloadUrl: 'https://gamma.io'
  }
];

interface BitcoinWalletConnectorProps {
  onClose: () => void;
  onConnect: (walletId: string) => void;
}

export default function BitcoinWalletConnector({ onClose, onConnect }: BitcoinWalletConnectorProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [installedWallets, setInstalledWallets] = useState<string[]>([]);
  const [showBalance, setShowBalance] = useState(true);

  const {
    connected,
    address,
    balance,
    connect: laserEyesConnect,
    disconnect,
  } = useSafeLaserEyes() as any;

  // Check installed wallets
  useEffect(() => {
    const checkInstalledWallets = () => {
      const installed: string[] = [];

      if (typeof window !== 'undefined') {
        // Check for Xverse
        if (window.XverseProviders?.BitcoinProvider) {
          installed.push('XVERSE');
        }

        // Check for UniSat
        if (window.unisat) {
          installed.push('UNISAT');
        }

        // Check for OYL
        if (window.oyl) {
          installed.push('OYL');
        }

        // Check for Magic Eden
        if (window.magicEden?.bitcoin) {
          installed.push('MAGIC_EDEN');
        }
      }

      setInstalledWallets(installed);
    };

    checkInstalledWallets();
  }, []);

  const handleWalletConnect = async (walletId: string) => {
    if (!installedWallets.includes(walletId)) {
      const wallet = BITCOIN_WALLETS.find(w => w.id === walletId);
      if (wallet?.downloadUrl) {
        window.open(wallet.downloadUrl, '_blank');
      }
      return;
    }

    setSelectedWallet(walletId);
    setConnecting(true);

    try {
      await laserEyesConnect(walletId as any);
      onConnect(walletId);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const formatBalance = (amount: number) => {
    return showBalance ? amount.toFixed(8) : '••••••••';
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  if (connected && address) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Wallet Connected</h2>
                <p className="text-sm text-gray-400">Bitcoin wallet successfully connected</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Wallet Info */}
          <div className="p-6 space-y-4">
            {/* Address */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Address</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAddress}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <a
                      href={`https://mempool.space/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="font-mono text-sm text-white">
                  {formatAddress(address)}
                </div>
              </CardContent>
            </Card>

            {/* Balance */}
            {balance && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Bitcoin Balance</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-gray-400 hover:text-white"
                    >
                      {showBalance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="text-lg font-bold text-orange-400">
                    {formatBalance(balance?.cardinal ?? balance)} BTC
                  </div>
                  <div className="text-sm text-gray-400">
                    ${((balance?.cardinal ?? balance) * 67000).toLocaleString()} USD
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assets Overview */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="p-3 text-center">
                  <Coins className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">Ordinals</div>
                  <div className="text-sm font-bold text-purple-400">12</div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">Runes</div>
                  <div className="text-sm font-bold text-yellow-400">5</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-3 text-center">
                  <Coins className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">BRC-20</div>
                  <div className="text-sm font-bold text-green-400">8</div>
                </CardContent>
              </Card>
            </div>

            <Separator className="bg-gray-700" />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  onClose();
                  // Navigate to portfolio
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black"
              >
                View Portfolio
              </Button>
              <Button
                onClick={disconnect}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Connect Bitcoin Wallet</h2>
              <p className="text-sm text-gray-400">Choose your preferred Bitcoin wallet</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Wallet List */}
        <div className="p-6 space-y-3">
          {BITCOIN_WALLETS.map((wallet) => {
            const isInstalled = installedWallets.includes(wallet.id);
            const isConnecting = connecting && selectedWallet === wallet.id;

            return (
              <Card
                key={wallet.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isInstalled
                    ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800 hover:border-orange-500/50'
                    : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                }`}
                onClick={() => handleWalletConnect(wallet.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{wallet.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{wallet.name}</h3>
                        {isInstalled ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Installed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            Not Installed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{wallet.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {wallet.supported.map((feature) => (
                          <Badge
                            key={feature}
                            variant="outline"
                            className="text-xs border-gray-600 text-gray-400"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      {isConnecting ? (
                        <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />
                      ) : isInstalled ? (
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black">
                          Connect
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-400">
                          Install
                        </Button>
                      )}
                      <a
                        href={wallet.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <strong>Security Note:</strong> Only download wallets from official sources.
                Always verify the authenticity of wallet extensions before installing.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}