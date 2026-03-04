'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Globe,
  Bitcoin,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateSwapDeeplink } from '@/config/feeRecipients';

export interface WalletConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  networks: string[];
  website: string;
  downloadUrl?: string;
  deepLinkSupport?: boolean;
}

const BITCOIN_WALLETS: WalletConfig[] = [
  {
    id: 'XVERSE',
    name: 'Xverse',
    icon: '🟣',
    description: 'Multi-chain Bitcoin wallet',
    networks: ['Bitcoin'],
    website: 'https://xverse.app',
    downloadUrl: 'https://chrome.google.com/webstore/detail/xverse-wallet/idnnbdplmphgjfnlphdnchkgggfhhgjd'
  },
  {
    id: 'UNISAT',
    name: 'UniSat',
    icon: '🟠',
    description: 'Professional Bitcoin wallet',
    networks: ['Bitcoin'],
    website: 'https://unisat.io',
    downloadUrl: 'https://chrome.google.com/webstore/detail/unisat-wallet/ppbibelpcjmhbdihakflkdcoccbgbkpo'
  }
];

const EVM_WALLETS: WalletConfig[] = [
  {
    id: 'METAMASK',
    name: 'MetaMask',
    icon: '🦊',
    description: 'The most popular Ethereum wallet',
    networks: ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche', 'Base'],
    website: 'https://metamask.io',
    downloadUrl: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
    deepLinkSupport: true
  },
  {
    id: 'RABBY',
    name: 'Rabby Wallet',
    icon: '🐰',
    description: 'Multi-chain wallet with advanced features',
    networks: ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Avalanche', 'Base'],
    website: 'https://rabby.io',
    downloadUrl: 'https://chrome.google.com/webstore/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch',
    deepLinkSupport: true
  }
];

const SOLANA_WALLETS: WalletConfig[] = [
  {
    id: 'PHANTOM',
    name: 'Phantom',
    icon: '👻',
    description: 'The leading Solana wallet',
    networks: ['Solana'],
    website: 'https://phantom.app',
    downloadUrl: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
    deepLinkSupport: true
  }
];

// Top 20 DEXs for each network
const DEX_CONFIGS = {
  ethereum: [
    { name: 'Uniswap V3', url: 'https://app.uniswap.org', priority: 1 },
    { name: '1inch', url: 'https://app.1inch.io', priority: 2 },
    { name: 'SushiSwap', url: 'https://app.sushi.com', priority: 3 },
    { name: 'Curve', url: 'https://curve.fi', priority: 4 },
    { name: 'Balancer', url: 'https://app.balancer.fi', priority: 5 }
  ],
  bsc: [
    { name: 'PancakeSwap', url: 'https://pancakeswap.finance', priority: 1 },
    { name: '1inch BSC', url: 'https://app.1inch.io', priority: 2 },
    { name: 'Biswap', url: 'https://biswap.org', priority: 3 }
  ],
  solana: [
    { name: 'Jupiter', url: 'https://jup.ag', priority: 1 },
    { name: 'Raydium', url: 'https://raydium.io', priority: 2 },
    { name: 'Orca', url: 'https://orca.so', priority: 3 }
  ],
  bitcoin: [
    { name: 'RunesDX', url: 'https://runesdx.io', priority: 1 },
    { name: 'Magic Eden', url: 'https://magiceden.io/runes', priority: 2 }
  ]
};

interface MultiChainWalletConnectorProps {
  onClose: () => void;
  onWalletSelect: (wallet: WalletConfig, network: string) => void;
  selectedFromToken?: any;
  selectedToToken?: any;
  amount?: string;
}

export default function MultiChainWalletConnector({
  onClose,
  onWalletSelect,
  selectedFromToken,
  selectedToToken,
  amount
}: MultiChainWalletConnectorProps) {
  const [activeTab, setActiveTab] = useState('bitcoin');
  const [installedWallets, setInstalledWallets] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // Check installed wallets
  useEffect(() => {
    const checkInstalledWallets = () => {
      const installed: string[] = [];

      if (typeof window !== 'undefined') {
        // Bitcoin wallets
        if (window.XverseProviders?.BitcoinProvider) installed.push('XVERSE');
        if (window.unisat) installed.push('UNISAT');

        // EVM wallets
        if (window.ethereum?.isMetaMask) installed.push('METAMASK');
        if (window.ethereum?.isRabby) installed.push('RABBY');

        // Solana wallets
        if (window.solana?.isPhantom) installed.push('PHANTOM');
      }

      setInstalledWallets(installed);
    };

    checkInstalledWallets();
  }, []);

  const handleWalletConnect = async (wallet: WalletConfig, network: string) => {
    if (!installedWallets.includes(wallet.id)) {
      if (wallet.downloadUrl) {
        window.open(wallet.downloadUrl, '_blank');
      }
      return;
    }

    setSelectedWallet(wallet.id);
    setConnecting(true);

    try {
      // Instead of connecting directly, we'll redirect to DEX
      if (wallet.deepLinkSupport && selectedFromToken && selectedToToken) {
        redirectToDEX(wallet, network);
      } else {
        onWalletSelect(wallet, network);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  const redirectToDEX = (wallet: WalletConfig, network: string) => {
    const dexList = DEX_CONFIGS[network as keyof typeof DEX_CONFIGS] || [];
    const primaryDex = dexList[0];

    if (primaryDex && selectedFromToken && selectedToToken) {
      let deepLink = '';

      // Generate appropriate deep link based on network and DEX
      switch (network) {
        case 'bitcoin':
          deepLink = generateSwapDeeplink({
            fromToken: selectedFromToken.symbol,
            toToken: selectedToToken.symbol,
            amount: amount || '0',
            fromChain: 'bitcoin',
          });
          break;
        case 'ethereum':
          deepLink = generateSwapDeeplink({
            fromToken: selectedFromToken.address,
            toToken: selectedToToken.address,
            amount: amount || '0',
            fromChain: 'ethereum',
          });
          break;
        case 'solana':
          deepLink = generateSwapDeeplink({
            fromToken: selectedFromToken.address,
            toToken: selectedToToken.address,
            amount: amount || '0',
            fromChain: 'solana',
          });
          break;
      }

      if (deepLink && deepLink !== '#') {
        window.open(deepLink, '_blank');
        onClose();
      }
    }
  };

  const getWalletsByTab = (tab: string) => {
    switch (tab) {
      case 'bitcoin':
        return BITCOIN_WALLETS;
      case 'evm':
        return EVM_WALLETS;
      case 'solana':
        return SOLANA_WALLETS;
      default:
        return [];
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'bitcoin':
        return <Bitcoin className="w-4 h-4" />;
      case 'evm':
        return <Globe className="w-4 h-4" />;
      case 'solana':
        return <Zap className="w-4 h-4" />;
      default:
        return null;
    }
  };

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
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Connect Wallet</h2>
              <p className="text-sm text-gray-400">Choose wallet to complete trade</p>
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

        {/* Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="bitcoin" className="flex items-center gap-2">
                {getTabIcon('bitcoin')}
                Bitcoin
              </TabsTrigger>
              <TabsTrigger value="evm" className="flex items-center gap-2">
                {getTabIcon('evm')}
                EVM Chains
              </TabsTrigger>
              <TabsTrigger value="solana" className="flex items-center gap-2">
                {getTabIcon('solana')}
                Solana
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 max-h-[400px] overflow-y-auto space-y-3">
              {getWalletsByTab(activeTab).map((wallet) => {
                const isInstalled = installedWallets.includes(wallet.id);
                const isConnecting = connecting && selectedWallet === wallet.id;

                return (
                  <Card
                    key={wallet.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isInstalled
                        ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800 hover:border-cyan-500/50'
                        : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                    }`}
                    onClick={() => handleWalletConnect(wallet, activeTab)}
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
                            {wallet.networks.map((network) => (
                              <Badge
                                key={network}
                                variant="outline"
                                className="text-xs border-gray-600 text-gray-400"
                              >
                                {network}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnecting ? (
                            <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </Tabs>

          {/* DEX Redirect Info */}
          {selectedFromToken && selectedToToken && (
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-300">
                  <strong>Trade Execution:</strong> You'll be redirected to the best DEX for your trade.
                  Our platform aggregates the top exchanges to ensure optimal pricing and execution.
                </div>
              </div>
            </div>
          )}

          {/* Supported DEXs */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">
              Supported Exchanges ({activeTab}):
            </h4>
            <div className="flex flex-wrap gap-2">
              {(DEX_CONFIGS[activeTab as keyof typeof DEX_CONFIGS] || []).map((dex) => (
                <Badge
                  key={dex.name}
                  variant="outline"
                  className="text-xs border-gray-600 text-gray-400"
                >
                  {dex.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}