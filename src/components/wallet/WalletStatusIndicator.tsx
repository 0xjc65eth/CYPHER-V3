'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Bitcoin,
  Crown,
  Gem,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
// WALLET TEMPORARILY DISABLED - import { useWallet } from '@/contexts/WalletContext';
// WALLET TEMPORARILY DISABLED - import { useWalletPortfolio } from '@/hooks/useWalletPortfolio';

interface WalletStatusIndicatorProps {
  variant?: 'compact' | 'full' | 'minimal';
  showPortfolio?: boolean;
  className?: string;
}

export function WalletStatusIndicator({ 
  variant = 'compact', 
  showPortfolio = true,
  className = '' 
}: WalletStatusIndicatorProps) {
  // WALLET TEMPORARILY DISABLED - const wallet = useWallet();
  // WALLET TEMPORARILY DISABLED - const portfolio = useWalletPortfolio();
  
  // Mock wallet data (wallet temporarily disabled)
  const wallet = {
    isConnected: false,
    address: null as string | null,
    balance: null as number | null,
    currentWallet: null as string | null,
    connect: () => {},
    disconnect: () => {},
    portfolioData: null as any,
  };
  
  const portfolio = {
    isConnected: false,
    isLoading: false,
    error: null,
    portfolioData: null,
    balance: null,
    refreshAll: () => {}
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === 0) return '0.00';
    if (Math.abs(num) < 0.01) return '< 0.01';
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Minimal variant - just connection status
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {wallet.isConnected ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Wallet Connected</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span className="text-xs text-gray-500">No Wallet</span>
          </>
        )}
      </div>
    );
  }

  // Compact variant - connection status with basic info
  if (variant === 'compact') {
    if (!wallet.isConnected) {
      return (
        <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
          <Wallet className="w-4 h-4" />
          <span className="text-xs">Connect Wallet</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-400">{formatAddress(wallet.address || '')}</span>
        </div>
        
        {wallet.balance && showPortfolio && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-gray-400" />
              <span className="text-white">${formatNumber(wallet.balance.usd)}</span>
            </div>
            {wallet.portfolioData && (
              <div className={`flex items-center gap-1 ${
                wallet.portfolioData.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {wallet.portfolioData.totalPNL >= 0 ? 
                  <TrendingUp className="w-3 h-3" /> : 
                  <TrendingDown className="w-3 h-3" />
                }
                <span>
                  {wallet.portfolioData.totalPNL >= 0 ? '+' : ''}{formatNumber(wallet.portfolioData.totalPNLPercentage)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full variant - comprehensive wallet status card
  if (!wallet.isConnected) {
    return (
      <Card className={`bg-gray-800/50 border-gray-700 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-300">No Wallet Connected</div>
              <div className="text-xs text-gray-500">Connect to view portfolio</div>
            </div>
          </div>
          <Badge variant="outline" className="border-gray-600 text-gray-400">
            Disconnected
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-800/50 border-gray-700 p-4 ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-medium text-white">
                {formatAddress(wallet.address || '')}
              </div>
              <div className="text-xs text-gray-400">
                {wallet.walletType?.toUpperCase()} Wallet
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white">Connected</Badge>
            {portfolio.isLoading ? (
              <WifiOff className="w-4 h-4 text-yellow-500 animate-pulse" />
            ) : (
              <Wifi className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Portfolio Summary */}
        {wallet.balance && showPortfolio && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-gray-500">Total Value</div>
              <div className="text-sm font-semibold text-white">
                ${formatNumber(wallet.balance.usd)}
              </div>
            </div>
            
            {wallet.portfolioData && (
              <>
                <div className="text-center">
                  <div className="text-xs text-gray-500">P&L</div>
                  <div className={`text-sm font-semibold ${
                    wallet.portfolioData.totalPNL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {wallet.portfolioData.totalPNL >= 0 ? '+' : ''}${formatNumber(wallet.portfolioData.totalPNL)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-500">Return %</div>
                  <div className={`text-sm font-semibold ${
                    wallet.portfolioData.totalPNLPercentage >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {wallet.portfolioData.totalPNLPercentage >= 0 ? '+' : ''}{formatNumber(wallet.portfolioData.totalPNLPercentage)}%
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Asset Breakdown */}
        {wallet.balance && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <Bitcoin className="w-4 h-4 text-orange-500" />
                <span className="text-gray-300">Bitcoin</span>
              </div>
              <span className="text-white font-medium">
                {wallet.balance.bitcoin.toFixed(6)} BTC
              </span>
            </div>
            
            {wallet.balance.ordinals > 0 && (
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-300">Ordinals</span>
                </div>
                <span className="text-white font-medium">{wallet.balance.ordinals}</span>
              </div>
            )}
            
            {wallet.balance.runes > 0 && (
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-green-500" />
                  <span className="text-gray-300">Runes</span>
                </div>
                <span className="text-white font-medium">{wallet.balance.runes}</span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {(wallet.error || portfolio.error) && (
          <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-600/30 rounded text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>{wallet.error || portfolio.error}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// Hook to check wallet connection status across the app
export function useWalletStatus() {
  const wallet = useWallet();
  const portfolio = useWalletPortfolio();

  return {
    isConnected: wallet.isConnected,
    hasPortfolioData: !!wallet.portfolioData,
    hasBalance: !!wallet.balance,
    isLoading: wallet.loading || portfolio.isLoading,
    error: wallet.error || portfolio.error,
    address: wallet.address,
    walletType: wallet.walletType,
    portfolioValue: wallet.balance?.usd || 0,
    portfolioPNL: wallet.portfolioData?.totalPNL || 0,
    portfolioPNLPercentage: wallet.portfolioData?.totalPNLPercentage || 0,
  };
}