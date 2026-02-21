'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bitcoin,
  Activity,
  PieChart,
  BarChart3,
  Eye,
  Wallet,
  Target,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import {
  MarketTickerTape,
  StockPriceCard,
  ExecutiveCard,
  ChartContainer,
  FinancialMetric,
  ExecutiveSummaryGrid,
  TradingButton,
  FinancialDataTable,
  MarketStatusIndicator,
} from '../ui/WallStreetTheme';

interface MarketData {
  btcPrice: number;
  btcChange24h: number;
  btcChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  dominance: number;
}

interface PortfolioData {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  totalProfit: number;
  totalProfitPercent: number;
}

interface TradingPair {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume: number;
}

// Default data - replaced with real data from hooks when available
// TODO: Replace with real data from useMarketData() hook
const defaultMarketData: MarketData = {
  btcPrice: 0,
  btcChange24h: 0,
  btcChangePercent24h: 0,
  marketCap: 0,
  volume24h: 0,
  dominance: 0,
};

const defaultPortfolioData: PortfolioData = {
  totalValue: 0,
  todayChange: 0,
  todayChangePercent: 0,
  totalProfit: 0,
  totalProfitPercent: 0,
};

const defaultTickerData: TradingPair[] = [];

const defaultTopPerformers: Array<{ symbol: string; change: number; price: number }> = [];

const defaultRecentTransactions: Array<{ type: string; asset: string; amount: number; price: number; time: string }> = [];

export const FinancialDashboard: React.FC = () => {
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed' | 'pre-market' | 'after-hours'>('open');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    // Simulate market status updates
    const updateMarketStatus = () => {
      const hour = new Date().getHours();
      if (hour >= 9 && hour < 16) {
        setMarketStatus('open');
      } else if (hour >= 7 && hour < 9) {
        setMarketStatus('pre-market');
      } else if (hour >= 16 && hour < 20) {
        setMarketStatus('after-hours');
      } else {
        setMarketStatus('closed');
      }
    };

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ws-theme min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Market Ticker Tape */}
      <MarketTickerTape items={defaultTickerData} />

      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Executive Dashboard
            </h1>
            <p className="text-gray-400">
              Real-time Bitcoin & Digital Assets Analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <MarketStatusIndicator status={marketStatus} />
            <select 
              className="ws-select"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <ExecutiveSummaryGrid>
          <StockPriceCard
            title="Bitcoin Price"
            value={defaultMarketData.btcPrice}
            change={defaultMarketData.btcChange24h}
            changePercent={defaultMarketData.btcChangePercent24h}
            prefix="$"
            icon={<Bitcoin size={24} />}
          />
          
          <StockPriceCard
            title="Portfolio Value"
            value={defaultPortfolioData.totalValue}
            change={defaultPortfolioData.todayChange}
            changePercent={defaultPortfolioData.todayChangePercent}
            prefix="$"
            icon={<Wallet size={24} />}
          />
          
          <StockPriceCard
            title="24h Volume"
            value={`${(defaultMarketData.volume24h / 1e9).toFixed(1)}B`}
            prefix="$"
            icon={<BarChart3 size={24} />}
          />
          
          <StockPriceCard
            title="BTC Dominance"
            value={`${defaultMarketData.dominance}%`}
            icon={<PieChart size={24} />}
          />
        </ExecutiveSummaryGrid>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Portfolio Performance */}
          <div className="lg:col-span-2">
            <ExecutiveCard title="Portfolio Performance">
              <ChartContainer title="Asset Allocation" subtitle="Real-time portfolio breakdown">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FinancialMetric
                      label="Total Profit/Loss"
                      value={defaultPortfolioData.totalProfit}
                      trend="up"
                      prefix="$"
                    />
                    <FinancialMetric
                      label="Total ROI"
                      value={`${defaultPortfolioData.totalProfitPercent}%`}
                      trend="up"
                    />
                    <FinancialMetric
                      label="Today's P&L"
                      value={defaultPortfolioData.todayChange}
                      trend="up"
                      prefix="$"
                    />
                    <FinancialMetric
                      label="Available Cash"
                      value="15,750"
                      prefix="$"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-sm font-semibold text-gray-400 mb-4">Asset Distribution</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Bitcoin (BTC)</span>
                          <span className="text-sm font-mono text-yellow-400">65%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Ordinals (ORDI)</span>
                          <span className="text-sm font-mono text-green-400">20%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Runes</span>
                          <span className="text-sm font-mono text-blue-400">10%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Cash</span>
                          <span className="text-sm font-mono text-gray-400">5%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ChartContainer>
            </ExecutiveCard>
          </div>

          {/* Market Insights */}
          <div>
            <ExecutiveCard title="Market Insights">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Top Performers (24h)</h4>
                  <div className="space-y-2">
                    {defaultTopPerformers.map((asset, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="font-medium">{asset.symbol}</span>
                        <div className="text-right">
                          <div className="text-green-400 font-mono text-sm">
                            +{asset.change.toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-400">
                            ${asset.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Market Alerts</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertTriangle size={16} className="text-yellow-400 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-yellow-400">Price Alert</div>
                        <div className="text-gray-300">BTC approaching resistance at $68,000</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <Target size={16} className="text-green-400 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-green-400">Opportunity</div>
                        <div className="text-gray-300">ORDI showing bullish momentum</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ExecutiveCard>
          </div>
        </div>

        {/* Trading Interface & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Trading */}
          <ExecutiveCard title="Quick Trading">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="ws-label">Asset</label>
                  <select className="ws-select w-full">
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ORDI">Ordinals (ORDI)</option>
                    <option value="RUNES">Runes</option>
                  </select>
                </div>
                <div>
                  <label className="ws-label">Amount</label>
                  <input 
                    type="number" 
                    className="ws-input w-full" 
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <TradingButton variant="buy" size="lg">
                  <DollarSign size={16} className="mr-2" />
                  Buy
                </TradingButton>
                <TradingButton variant="sell" size="lg">
                  <TrendingDown size={16} className="mr-2" />
                  Sell
                </TradingButton>
              </div>
              
              <div className="text-xs text-gray-400 text-center">
                Estimated fees: $2.50 | Available balance: $15,750
              </div>
            </div>
          </ExecutiveCard>

          {/* Recent Transactions */}
          <ExecutiveCard title="Recent Activity">
            <div className="space-y-4">
              {defaultRecentTransactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 ws-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'Buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {tx.type === 'Buy' ? 
                        <TrendingUp size={14} className="text-green-400" /> : 
                        <TrendingDown size={14} className="text-red-400" />
                      }
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {tx.type} {tx.asset}
                      </div>
                      <div className="text-xs text-gray-400">
                        {tx.amount} @ ${tx.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">
                      ${(tx.amount * tx.price).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {tx.time}
                    </div>
                  </div>
                </div>
              ))}
              
              <TradingButton variant="neutral" size="sm" className="w-full">
                <Eye size={14} className="mr-2" />
                View All Transactions
              </TradingButton>
            </div>
          </ExecutiveCard>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;