'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useNotification } from '@/contexts/NotificationContext';
import QuickTradeInterface from '@/components/quick-trade/QuickTradeInterface';
import {
  ArrowUpDown,
  TrendingUp,
  Coins,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  ExternalLink,
  Wallet,
  History,
  X,
  Maximize2
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
  requiresWallet?: boolean;
  comingSoon?: boolean;
}

export default function QuickActions() {
  const { isConnected } = useWallet();
  const { addNotification } = useNotification();
  const [showQuickTrade, setShowQuickTrade] = useState(false);

  const handleAction = (actionName: string, requiresWallet: boolean = false) => {
    if (actionName === 'Quick Trade') {
      if (requiresWallet && !isConnected) {
        addNotification({
          type: 'warning',
          title: 'Wallet Required',
          message: 'Please connect your wallet to use this feature',
        });
        return;
      }
      setShowQuickTrade(true);
      return;
    }

    if (requiresWallet && !isConnected) {
      addNotification({
        type: 'warning',
        title: 'Wallet Required',
        message: 'Please connect your wallet to use this feature',
      });
      return;
    }

    addNotification({
      type: 'info',
      title: 'Feature Access',
      message: `${actionName} feature accessed successfully`,
    });
  };

  const actions: QuickAction[] = [
    {
      title: 'Quick Trade',
      description: 'Buy/sell Bitcoin, Ordinals & Runes',
      icon: ArrowUpDown,
      color: 'orange',
      requiresWallet: true,
      action: () => handleAction('Quick Trade', true)
    },
    {
      title: 'Portfolio Analytics',
      description: 'View detailed portfolio insights',
      icon: BarChart3,
      color: 'blue',
      requiresWallet: true,
      action: () => handleAction('Portfolio Analytics', true)
    },
    {
      title: 'Ordinals Explorer',
      description: 'Discover and track Ordinals',
      icon: Coins,
      color: 'purple',
      action: () => handleAction('Ordinals Explorer')
    },
    {
      title: 'Runes Trading',
      description: 'Trade Runes tokens',
      icon: Zap,
      color: 'yellow',
      requiresWallet: true,
      action: () => handleAction('Runes Trading', true)
    },
    {
      title: 'Market Signals',
      description: 'AI-powered trading signals',
      icon: TrendingUp,
      color: 'green',
      action: () => handleAction('Market Signals')
    },
    {
      title: 'Transaction History',
      description: 'View your transaction history',
      icon: History,
      color: 'gray',
      requiresWallet: true,
      action: () => handleAction('Transaction History', true)
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      orange: {
        bg: 'bg-orange-500/10 hover:bg-orange-500/20',
        border: 'border-orange-500/30',
        icon: 'text-orange-400',
        button: 'bg-orange-500 hover:bg-orange-600 text-black'
      },
      blue: {
        bg: 'bg-blue-500/10 hover:bg-blue-500/20',
        border: 'border-blue-500/30',
        icon: 'text-blue-400',
        button: 'bg-blue-500 hover:bg-blue-600 text-white'
      },
      purple: {
        bg: 'bg-purple-500/10 hover:bg-purple-500/20',
        border: 'border-purple-500/30',
        icon: 'text-purple-400',
        button: 'bg-purple-500 hover:bg-purple-600 text-white'
      },
      yellow: {
        bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
        border: 'border-yellow-500/30',
        icon: 'text-yellow-400',
        button: 'bg-yellow-500 hover:bg-yellow-600 text-black'
      },
      green: {
        bg: 'bg-green-500/10 hover:bg-green-500/20',
        border: 'border-green-500/30',
        icon: 'text-green-400',
        button: 'bg-green-500 hover:bg-green-600 text-white'
      },
      gray: {
        bg: 'bg-gray-500/10 hover:bg-gray-500/20',
        border: 'border-gray-500/30',
        icon: 'text-gray-400',
        button: 'bg-gray-500 hover:bg-gray-600 text-white'
      }
    };
    return colors[color as keyof typeof colors] || colors.orange;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {actions.map((action, index) => {
        const colorClasses = getColorClasses(action.color);
        const Icon = action.icon;
        const isDisabled = action.requiresWallet && !isConnected;

        return (
          <Card
            key={index}
            className={`${colorClasses.bg} ${colorClasses.border} backdrop-blur-sm transition-all duration-300 group cursor-pointer ${
              isDisabled ? 'opacity-50' : 'hover:scale-105'
            }`}
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-black/20 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
                </div>
                {action.requiresWallet && !isConnected && (
                  <div className="flex items-center space-x-1 text-yellow-400">
                    <Wallet className="w-4 h-4" />
                    <span className="text-xs">Wallet Required</span>
                  </div>
                )}
                {action.comingSoon && (
                  <div className="bg-blue-500/20 px-2 py-1 rounded text-xs text-blue-400">
                    Coming Soon
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">
                  {action.description}
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={action.action}
                disabled={isDisabled || action.comingSoon}
                className={`w-full ${colorClasses.button} font-medium transition-all duration-300 ${
                  isDisabled || action.comingSoon 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'group-hover:shadow-lg'
                }`}
              >
                {action.comingSoon ? (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Coming Soon
                  </>
                ) : isDisabled ? (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Launch
                  </>
                )}
              </Button>
            </div>
          </Card>
        );
      })}

      {/* Refresh Markets Card */}
      <Card className="bg-gray-800/30 border-gray-700 backdrop-blur-sm transition-all duration-300 group hover:bg-gray-800/50">
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center min-h-[180px] sm:min-h-[200px]">
          <div className="p-3 sm:p-4 rounded-full bg-gray-700/50 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 group-hover:rotate-180 transition-transform duration-500" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
            Refresh Data
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
            Update all market data and portfolio information
          </p>
          <Button
            onClick={() => handleAction('Data Refresh')}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </Card>

      {/* Quick Trade Modal */}
      {showQuickTrade && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
                  <ArrowUpDown className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Quick Trade Pro</h2>
                  <p className="text-sm text-gray-400">Multi-chain DEX aggregator with optimal routing</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickTrade(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickTrade(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <QuickTradeInterface 
                onSwapComplete={(result) => {
                  addNotification({
                    type: 'success',
                    title: 'Trade Completed',
                    message: `Swap completed successfully: ${result.status}`,
                  });
                  setShowQuickTrade(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}