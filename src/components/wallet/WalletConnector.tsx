'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Bitcoin,
  Zap,
  Globe,
  ChevronDown,
  Coins,
  Unplug,
  TrendingUp
} from 'lucide-react';

interface Asset {
  name: string;
  type: string;
  amount: number;
  value?: number;
}

interface Transaction {
  hash: string;
  type: string;
  amount: number;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
}

interface WalletInfo {
  address: string;
  balance: number;
  network: string;
  walletType: string;
  assets: Asset[];
  recentTransactions: Transaction[];
}

const SUPPORTED_WALLETS = {
  bitcoin: [
    { name: 'Xverse', icon: '🟠', id: 'xverse' },
    { name: 'Unisat', icon: '🦄', id: 'unisat' },
    { name: 'OKX Wallet', icon: '⚫', id: 'okx' },
    { name: 'Leather', icon: '🤎', id: 'leather' },
  ],
  ethereum: [
    { name: 'MetaMask', icon: '🦊', id: 'metamask' },
    { name: 'WalletConnect', icon: '🔗', id: 'walletconnect' },
    { name: 'Coinbase Wallet', icon: '💙', id: 'coinbase' },
    { name: 'OKX Wallet', icon: '⚫', id: 'okx' },
  ],
  solana: [
    { name: 'Phantom', icon: '👻', id: 'phantom' },
    { name: 'Solflare', icon: '☀️', id: 'solflare' },
    { name: 'Backpack', icon: '🎒', id: 'backpack' },
  ]
};

export function WalletConnector() {
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof SUPPORTED_WALLETS>('bitcoin');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [showWallets, setShowWallets] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get Bitcoin balance from real API
  const getBitcoinBalance = async (address: string): Promise<number> => {
    try {
      const response = await fetch(`https://blockstream.info/api/address/${address}`);
      const data = await response.json();
      return data.chain_stats.funded_txo_sum / 100000000; // Convert satoshis to BTC
    } catch (error) {
      console.error('Error fetching Bitcoin balance:', error);
      return 0;
    }
  };

  // Get Bitcoin assets
  const getBitcoinAssets = async (address: string): Promise<Asset[]> => {
    try {
      const balance = await getBitcoinBalance(address);
      const currentPrice = 58000; // You could fetch this from your price API
      
      return [
        {
          name: 'Bitcoin',
          type: 'bitcoin',
          amount: balance,
          value: balance * currentPrice
        },
        {
          name: 'Ordinals',
          type: 'ordinals',
          amount: Math.floor(Math.random() * 5) + 1,
          value: (Math.floor(Math.random() * 5) + 1) * 1000
        },
        {
          name: 'Runes',
          type: 'runes',
          amount: Math.floor(Math.random() * 100) + 10,
          value: (Math.floor(Math.random() * 100) + 10) * 50
        },
        {
          name: 'Rare Sats',
          type: 'rare_sats',
          amount: Math.floor(Math.random() * 10000) + 1000,
          value: (Math.floor(Math.random() * 10000) + 1000) * 0.1
        }
      ];
    } catch (error) {
      console.error('Error fetching Bitcoin assets:', error);
      return [];
    }
  };

  // Get Bitcoin transactions
  const getBitcoinTransactions = async (address: string): Promise<Transaction[]> => {
    try {
      const response = await fetch(`https://blockstream.info/api/address/${address}/txs`);
      const txs = await response.json();
      
      return txs.slice(0, 5).map((tx: any) => ({
        hash: tx.txid.slice(0, 8) + '...' + tx.txid.slice(-6),
        type: tx.status.confirmed ? 'Confirmed' : 'Pending',
        amount: (tx.vout[0]?.value || 0) / 100000000,
        timestamp: new Date(tx.status.block_time * 1000).toLocaleDateString(),
        status: tx.status.confirmed ? 'confirmed' as const : 'pending' as const
      }));
    } catch (error) {
      console.error('Error fetching Bitcoin transactions:', error);
      return [];
    }
  };

  const connectWallet = async (walletId: string) => {
    setIsConnecting(true);
    
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock address for demo
      const mockAddresses = {
        bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        ethereum: '0x742F...5D8a',
        solana: 'DjVE...k1Ms'
      };
      
      const address = mockAddresses[selectedNetwork];
      
      let assets: Asset[] = [];
      let transactions: Transaction[] = [];
      let balance = 0;
      
      if (selectedNetwork === 'bitcoin') {
        assets = await getBitcoinAssets(address);
        transactions = await getBitcoinTransactions(address);
        balance = await getBitcoinBalance(address);
      } else {
        // Mock data for other networks
        balance = Math.random() * 10 + 1;
        assets = [
          {
            name: selectedNetwork === 'ethereum' ? 'Ethereum' : 'Solana',
            type: selectedNetwork,
            amount: balance,
            value: balance * (selectedNetwork === 'ethereum' ? 2500 : 100)
          }
        ];
        transactions = [
          {
            hash: 'abc123...def456',
            type: 'Transfer',
            amount: 0.5,
            timestamp: new Date().toLocaleDateString(),
            status: 'confirmed'
          }
        ];
      }
      
      setWalletInfo({
        address,
        balance,
        network: selectedNetwork,
        walletType: walletId,
        assets,
        recentTransactions: transactions
      });
      
      setShowWallets(false);
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectManualAddress = async () => {
    if (!manualAddress) return;
    
    setIsConnecting(true);
    
    try {
      let assets: Asset[] = [];
      let transactions: Transaction[] = [];
      let balance = 0;
      
      if (selectedNetwork === 'bitcoin') {
        assets = await getBitcoinAssets(manualAddress);
        transactions = await getBitcoinTransactions(manualAddress);
        balance = await getBitcoinBalance(manualAddress);
      } else {
        balance = Math.random() * 10 + 1;
        assets = [
          {
            name: selectedNetwork === 'ethereum' ? 'Ethereum' : 'Solana',
            type: selectedNetwork,
            amount: balance,
            value: balance * (selectedNetwork === 'ethereum' ? 2500 : 100)
          }
        ];
        transactions = [
          {
            hash: 'manual123...address456',
            type: 'Transfer',
            amount: 0.3,
            timestamp: new Date().toLocaleDateString(),
            status: 'confirmed'
          }
        ];
      }
      
      setWalletInfo({
        address: manualAddress,
        balance,
        network: selectedNetwork,
        walletType: 'manual',
        assets,
        recentTransactions: transactions
      });
      
      setShowAddressInput(false);
      setManualAddress('');
      
    } catch (error) {
      console.error('Error connecting manual address:', error);
      alert('Failed to connect address. Please check the address and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletInfo(null);
  };

  const copyAddress = async () => {
    if (walletInfo?.address) {
      try {
        await navigator.clipboard.writeText(walletInfo.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address');
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTotalValue = () => {
    return walletInfo?.assets.reduce((total, asset) => total + (asset.value || 0), 0) || 0;
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'bitcoin': return <Bitcoin className="w-5 h-5 text-orange-400" />;
      case 'ordinals': return <Coins className="w-5 h-5 text-purple-400" />;
      case 'runes': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'rare_sats': return <TrendingUp className="w-5 h-5 text-yellow-400" />;
      case 'ethereum': return <Globe className="w-5 h-5 text-blue-400" />;
      case 'solana': return <Zap className="w-5 h-5 text-purple-400" />;
      default: return <Coins className="w-5 h-5 text-gray-400" />;
    }
  };

  // If wallet is connected, show wallet info
  if (walletInfo) {
    return (
      <div className="space-y-4">
        {/* Wallet Header */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white capitalize">{walletInfo.walletType} Wallet</h3>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-400">
                    {formatAddress(walletInfo.address)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                ${getTotalValue().toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  Connected
                </span>
                <button
                  onClick={disconnectWallet}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Unplug className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assets */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-white mb-4">Portfolio Assets</h4>
          <div className="space-y-3">
            {walletInfo.assets.map((asset, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  {getAssetIcon(asset.type)}
                  <div>
                    <p className="font-medium text-white">{asset.name}</p>
                    <p className="text-sm text-gray-400">
                      {asset.amount.toLocaleString()} {asset.type === 'bitcoin' ? 'BTC' : 'units'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    ${(asset.value || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {asset.type === 'bitcoin' ? 
                      `$${(asset.value! / asset.amount).toLocaleString()}/BTC` :
                      `$${((asset.value || 0) / asset.amount).toFixed(4)}/unit`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-white mb-4">Recent Transactions</h4>
          <div className="space-y-3">
            {walletInfo.recentTransactions.map((tx, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.status === 'confirmed' ? 'bg-green-400' : 
                    tx.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{tx.type}</div>
                    <div className="text-xs text-gray-400">{tx.timestamp}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    tx.amount > 0 ? 'text-green-400' : tx.amount < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {tx.amount !== 0 && (tx.amount > 0 ? '+' : '')}{tx.amount} BTC
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {tx.hash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Network Selector */}
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(SUPPORTED_WALLETS).map((network) => (
          <button
            key={network}
            onClick={() => setSelectedNetwork(network as keyof typeof SUPPORTED_WALLETS)}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
              selectedNetwork === network
                ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            {network === 'bitcoin' && <Bitcoin className="w-4 h-4" />}
            {network === 'ethereum' && <Globe className="w-4 h-4" />}
            {network === 'solana' && <Zap className="w-4 h-4" />}
            <span className="text-sm font-medium capitalize">{network}</span>
          </button>
        ))}
      </div>

      {/* Connect Options */}
      <div className="space-y-3">
        
        {/* Wallet Connection */}
        <button
          onClick={() => setShowWallets(!showWallets)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">Connect Wallet</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showWallets ? 'rotate-180' : ''}`} />
        </button>

        {showWallets && (
          <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-3 space-y-2">
            {SUPPORTED_WALLETS[selectedNetwork].map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => connectWallet(wallet.id)}
                disabled={isConnecting}
                className="w-full flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <span className="text-lg">{wallet.icon}</span>
                <span className="font-medium text-white">{wallet.name}</span>
                {isConnecting && <div className="ml-auto w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
              </button>
            ))}
          </div>
        )}

        {/* Manual Address Input */}
        <button
          onClick={() => setShowAddressInput(!showAddressInput)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-green-400" />
            <span className="font-medium text-white">Paste Address</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAddressInput ? 'rotate-180' : ''}`} />
        </button>

        {showAddressInput && (
          <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-3 space-y-3">
            <input
              type="text"
              placeholder={`Enter ${selectedNetwork} address...`}
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={connectManualAddress}
              disabled={!manualAddress || isConnecting}
              className="w-full p-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg font-medium text-white transition-colors"
            >
              {isConnecting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </div>
              ) : (
                'Connect Address'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Multi-Chain Wallet Support</span>
        </div>
        <p className="text-xs text-blue-300/80">
          Connect your {selectedNetwork} wallet or paste an address to view portfolio data and execute trades.
        </p>
      </div>
      
    </div>
  );
}