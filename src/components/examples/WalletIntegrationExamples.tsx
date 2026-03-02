'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bitcoin, 
  Crown, 
  Gem, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  DollarSign,
  Wallet,
  Shield,
  RefreshCw
} from 'lucide-react';
// WALLET TEMPORARILY DISABLED - import { useWalletPortfolio, useBitcoinWallet, useOrdinalsWallet, useRunesWallet } from '@/hooks/useWalletPortfolio';
import { WalletStatusIndicator } from '@/components/wallet/WalletStatusIndicator';
import { ProfessionalWalletConnect } from '@/components/wallet/ProfessionalWalletConnect';

// Example: Bitcoin Tab Component
export function BitcoinTabExample() {
  // WALLET TEMPORARILY DISABLED - const bitcoinWallet = useBitcoinWallet();
  const bitcoinWallet = {
    balance: 0,
    usdValue: 0,
    isConnected: false,
    address: null,
    refreshData: () => {},
    averageBuyPrice: 0,
    totalPNL: 0,
    totalPNLPercentage: 0,
    currentPrice: 0
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === 0) return '0.00';
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  if (!bitcoinWallet.isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8 text-center">
        <Bitcoin className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Bitcoin Analytics</h2>
        <p className="text-gray-400 mb-6">Connect your wallet to view Bitcoin holdings and analytics</p>
        <ProfessionalWalletConnect />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      <WalletStatusIndicator variant="full" showPortfolio={true} />

      {/* Bitcoin Holdings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-6 h-6 text-orange-500" />
              <span className="font-semibold text-white">Bitcoin Balance</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={bitcoinWallet.refreshData}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-white">
              {bitcoinWallet.balance.toFixed(8)} BTC
            </div>
            <div className="text-gray-400">
              ${formatNumber(bitcoinWallet.usdValue)}
            </div>
            <div className="text-sm text-gray-500">
              Avg. Buy Price: ${formatNumber(bitcoinWallet.averageBuyPrice)}
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            {bitcoinWallet.totalPNL >= 0 ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
            <span className="font-semibold text-white">Total P&L</span>
          </div>
          
          <div className="space-y-2">
            <div className={`text-2xl font-bold ${
              bitcoinWallet.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {bitcoinWallet.totalPNL >= 0 ? '+' : ''}${formatNumber(bitcoinWallet.totalPNL)}
            </div>
            <div className={`text-sm ${
              bitcoinWallet.totalPNLPercentage >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {bitcoinWallet.totalPNLPercentage >= 0 ? '+' : ''}{formatNumber(bitcoinWallet.totalPNLPercentage)}%
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-blue-500" />
            <span className="font-semibold text-white">Current Price</span>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-white">
              ${formatNumber(bitcoinWallet.currentPrice)}
            </div>
            <div className="text-sm text-gray-400">
              Per Bitcoin
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Example: Ordinals Tab Component
export function OrdinalsTabExample() {
  // WALLET TEMPORARILY DISABLED - const ordinalsWallet = useOrdinalsWallet();
  interface Inscription {
    id: string;
    number: number;
    content_type: string;
    value?: number;
  }

  const ordinalsWallet = {
    inscriptions: [] as Inscription[],
    totalCount: 0,
    totalValue: 0,
    isConnected: false,
    address: null,
    refreshData: () => {},
    floorPrice: 0
  };

  if (!ordinalsWallet.isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8 text-center">
        <Crown className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Ordinals Collection</h2>
        <p className="text-gray-400 mb-6">Connect your wallet to view your Ordinals inscriptions</p>
        <ProfessionalWalletConnect />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status - Compact for inner tabs */}
      <WalletStatusIndicator variant="compact" className="mb-4" />

      {/* Ordinals Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-purple-500" />
            <span className="font-semibold text-white">Total Inscriptions</span>
          </div>
          <div className="text-3xl font-bold text-white">{ordinalsWallet.totalCount}</div>
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-green-500" />
            <span className="font-semibold text-white">Total Value</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ${ordinalsWallet.totalValue.toLocaleString()}
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <span className="font-semibold text-white">Floor Price</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ${ordinalsWallet.floorPrice.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Inscriptions List */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Inscriptions</h3>
        {ordinalsWallet.inscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordinalsWallet.inscriptions.slice(0, 6).map((inscription, index) => (
              <div key={inscription.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-xs">
                    #{inscription.number}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {inscription.content_type}
                  </span>
                </div>
                <div className="text-sm text-white font-medium mb-1">
                  Inscription {inscription.number}
                </div>
                <div className="text-xs text-gray-400">
                  Value: ${(inscription.value || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Crown className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No inscriptions found</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// Example: Runes Tab Component
export function RunesTabExample() {
  // WALLET TEMPORARILY DISABLED - const runesWallet = useRunesWallet();
  interface RuneBalance {
    rune: string;
    spacedRune?: string;
    symbol: string;
    amount: string;
    divisibility: number;
  }

  const runesWallet = {
    balances: [] as RuneBalance[],
    totalCount: 0,
    totalValue: 0,
    isConnected: false,
    address: null,
    refreshData: () => {}
  };

  if (!runesWallet.isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8 text-center">
        <Gem className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Runes Portfolio</h2>
        <p className="text-gray-400 mb-6">Connect your wallet to view your Runes tokens</p>
        <ProfessionalWalletConnect />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status - Compact for inner tabs */}
      <WalletStatusIndicator variant="compact" className="mb-4" />

      {/* Runes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gem className="w-6 h-6 text-green-500" />
            <span className="font-semibold text-white">Total Runes</span>
          </div>
          <div className="text-3xl font-bold text-white">{runesWallet.totalCount}</div>
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-green-500" />
            <span className="font-semibold text-white">Total Value</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ${runesWallet.totalValue.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Runes List */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Runes</h3>
        {runesWallet.balances.length > 0 ? (
          <div className="space-y-3">
            {runesWallet.balances.map((rune, index) => (
              <div key={rune.rune} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Gem className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {rune.spacedRune || rune.rune}
                    </div>
                    <div className="text-xs text-gray-400">
                      {rune.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {(parseInt(rune.amount) / Math.pow(10, rune.divisibility)).toFixed(rune.divisibility)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {rune.symbol}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Gem className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No runes found</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// Main Example Component showing all tabs
export function WalletIntegrationExamples() {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Professional Wallet Integration</h1>
        <p className="text-gray-400 mb-6">
          This demonstrates how wallet data flows across all dashboard tabs with professional features.
        </p>
        
        {/* Global Wallet Connect */}
        <div className="mb-6">
          <ProfessionalWalletConnect />
        </div>
        
        {/* Example Tabs */}
        <Tabs defaultValue="bitcoin" className="space-y-4">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="bitcoin">Bitcoin</TabsTrigger>
            <TabsTrigger value="ordinals">Ordinals</TabsTrigger>
            <TabsTrigger value="runes">Runes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bitcoin">
            <BitcoinTabExample />
          </TabsContent>
          
          <TabsContent value="ordinals">
            <OrdinalsTabExample />
          </TabsContent>
          
          <TabsContent value="runes">
            <RunesTabExample />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}