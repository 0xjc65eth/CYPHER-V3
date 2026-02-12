'use client';

import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Bot, TrendingUp, Shield, Zap, BarChart3, Clock, Settings } from 'lucide-react';

export default function TradingBotPage() {
  return (
    <TopNavLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-amber-500 text-transparent bg-clip-text">
            TRADING BOT
          </h1>
          <p className="text-gray-400">
            Automated trading strategies powered by CYPHER AI
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gray-900 border border-orange-500/30 rounded-lg p-8 text-center">
          <Bot className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Our automated trading engine is currently in development. The bot will integrate with
            CYPHER AI analytics to execute data-driven strategies across multiple exchanges.
          </p>
          <div className="mt-4">
            <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
              IN DEVELOPMENT
            </span>
          </div>
        </div>

        {/* Planned Features Grid */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Planned Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={TrendingUp}
              title="Strategy Engine"
              description="DCA, grid trading, momentum, and mean reversion strategies with customizable parameters."
            />
            <FeatureCard
              icon={Shield}
              title="Risk Management"
              description="Configurable stop-loss, take-profit, position sizing, and portfolio rebalancing rules."
            />
            <FeatureCard
              icon={Zap}
              title="AI Signal Integration"
              description="Leverage CYPHER AI market analysis to trigger entries and exits based on sentiment and on-chain data."
            />
            <FeatureCard
              icon={BarChart3}
              title="Performance Analytics"
              description="Detailed P&L tracking, win rate, Sharpe ratio, drawdown analysis, and trade journal."
            />
            <FeatureCard
              icon={Clock}
              title="Backtesting"
              description="Test strategies against historical data before deploying with real capital."
            />
            <FeatureCard
              icon={Settings}
              title="Multi-Exchange Support"
              description="Connect to Binance, Kraken, Coinbase, and other major exchanges via API keys."
            />
          </div>
        </div>

        {/* Status Footer */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm font-mono">
            CYPHER TRADING BOT v1.0 | Status: Development | ETA: Q2 2025
          </p>
        </div>
      </div>
    </TopNavLayout>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <Icon className="w-8 h-8 text-orange-500/60 mb-3" />
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
