'use client'

import React, { useState, useEffect } from 'react';
import { triangularArbitrage, ArbitrageOpportunity, ArbitrageAlert } from '@/services/arbitrage/TriangularArbitrage';
import { TrendingUp, AlertTriangle, Clock, DollarSign, Activity, Play, Target, Zap } from 'lucide-react';

interface ArbitragePanelProps {
  className?: string;
}

export function ArbitragePanel({ className = '' }: ArbitragePanelProps) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [alerts, setAlerts] = useState<ArbitrageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'alerts' | 'performance'>('opportunities');
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USDT');

  useEffect(() => {
    // Subscribe to arbitrage alerts
    const unsubscribe = triangularArbitrage.subscribeToAlerts((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20 alerts
    });

    // Load initial data
    loadOpportunities();

    // Set up real-time updates
    const interval = setInterval(loadOpportunities, 60000); // CoinGecko rate limit: increased to 60s

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [selectedCurrency]);

  const loadOpportunities = async () => {
    try {
      const activeOpportunities = selectedCurrency === 'ALL' 
        ? triangularArbitrage.getActiveOpportunities()
        : triangularArbitrage.getOpportunitiesByCurrency(selectedCurrency);
      
      setOpportunities(activeOpportunities);
    } catch (error) {
      console.error('Failed to load arbitrage opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeOpportunity = async (opportunityId: string) => {
    try {
      const result = await triangularArbitrage.executeArbitrage(opportunityId);
      
      if (result.success) {
        // Remove executed opportunity from list
        setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));
        // Show success message
        console.log('Arbitrage executed successfully:', result.message);
      } else {
        console.error('Arbitrage execution failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to execute arbitrage:', error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'HIGH':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const currencies = ['USDT', 'BTC', 'ETH', 'ALL'];

  if (loading) {
    return (
      <div className={`bg-black border border-orange-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-orange-400 font-mono">Scanning Arbitrage Opportunities...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black border border-orange-500/30 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-orange-500/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-orange-400" />
            <h2 className="text-orange-400 font-mono font-bold">TRIANGULAR ARBITRAGE</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-orange-300 font-mono text-sm">BASE:</span>
            {currencies.map((currency) => (
              <button
                key={currency}
                onClick={() => setSelectedCurrency(currency)}
                className={`px-2 py-1 text-xs font-mono border rounded ${
                  selectedCurrency === currency
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                    : 'bg-gray-900/50 text-gray-400 border-gray-600/50 hover:border-orange-500/30'
                }`}
              >
                {currency}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-1">
          {['opportunities', 'alerts', 'performance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1 text-xs font-mono uppercase border rounded ${
                activeTab === tab
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                  : 'bg-gray-900/50 text-gray-400 border-gray-600/50 hover:border-orange-500/30'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'opportunities' && (
          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <div className="text-center text-gray-500 py-8 font-mono">
                No arbitrage opportunities found
              </div>
            ) : (
              opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className={`border rounded-lg p-4 transition-all hover:border-orange-500/50 ${
                    selectedOpportunity?.id === opportunity.id
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-gray-700/50'
                  }`}
                >
                  {/* Opportunity Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-orange-400 font-mono font-bold">
                          {opportunity.tradingPath.map(step => step.toCurrency).join(' → ')}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded border text-xs font-mono ${getRiskColor(opportunity.riskLevel)}`}>
                        {opportunity.riskLevel} RISK
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-green-400 font-mono font-bold">
                          +{opportunity.expectedProfit.toFixed(2)}%
                        </div>
                        <div className="text-gray-400 font-mono text-xs">
                          {formatCurrency(opportunity.profitAmount)}
                        </div>
                      </div>
                      <button
                        onClick={() => executeOpportunity(opportunity.id)}
                        className="bg-green-500/20 border border-green-500/50 text-green-400 px-3 py-1 rounded font-mono text-xs hover:bg-green-500/30 transition-colors flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>EXECUTE</span>
                      </button>
                    </div>
                  </div>

                  {/* Opportunity Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm font-mono">
                    <div>
                      <span className="text-gray-400">Investment:</span>
                      <div className="text-orange-300">
                        {formatCurrency(opportunity.minInvestment)} - {formatCurrency(opportunity.maxInvestment)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Execution Time:</span>
                      <div className="text-orange-300">{formatTime(opportunity.executionTime)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Confidence:</span>
                      <div className="text-green-400">{opportunity.confidence}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Exchanges:</span>
                      <div className="text-orange-300">{opportunity.exchanges.join(', ')}</div>
                    </div>
                  </div>

                  {/* Trading Path */}
                  <div className="border-t border-gray-700/50 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-orange-400 font-mono text-sm font-bold">TRADING PATH</span>
                      <button
                        onClick={() => setSelectedOpportunity(
                          selectedOpportunity?.id === opportunity.id ? null : opportunity
                        )}
                        className="text-orange-400 font-mono text-xs hover:text-orange-300"
                      >
                        {selectedOpportunity?.id === opportunity.id ? 'HIDE DETAILS' : 'SHOW DETAILS'}
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      {opportunity.tradingPath.map((step, index) => (
                        <React.Fragment key={step.step}>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-400">{step.fromCurrency}</span>
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-orange-400">{step.toCurrency}</span>
                            <span className="text-gray-500">({step.exchange})</span>
                          </div>
                          {index < opportunity.tradingPath.length - 1 && (
                            <span className="text-gray-600">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {selectedOpportunity?.id === opportunity.id && (
                      <div className="mt-3 space-y-2">
                        {opportunity.tradingPath.map((step) => (
                          <div key={step.step} className="border border-gray-700/50 rounded p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-orange-400 font-mono text-xs font-bold">
                                  STEP {step.step}
                                </span>
                                <span className="text-gray-400 font-mono text-xs">
                                  {step.action} {step.pair}
                                </span>
                              </div>
                              <span className="text-gray-400 font-mono text-xs">
                                {step.exchange}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-1 text-xs font-mono">
                              <div>
                                <span className="text-gray-400">Price:</span>
                                <div className="text-orange-300">{step.price.toFixed(6)}</div>
                              </div>
                              <div>
                                <span className="text-gray-400">Volume:</span>
                                <div className="text-orange-300">{step.volume.toFixed(6)}</div>
                              </div>
                              <div>
                                <span className="text-gray-400">Time:</span>
                                <div className="text-orange-300">{formatTime(step.estimatedTime)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Fee Breakdown */}
                        <div className="border border-gray-700/50 rounded p-2">
                          <h4 className="text-orange-400 font-mono text-xs font-bold mb-1">FEE BREAKDOWN</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Trading:</span>
                              <span className="text-red-400">{formatCurrency(opportunity.fees.trading)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Network:</span>
                              <span className="text-red-400">{formatCurrency(opportunity.fees.network)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Slippage:</span>
                              <span className="text-red-400">{formatCurrency(opportunity.fees.slippage)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span className="text-gray-400">Total:</span>
                              <span className="text-red-400">{formatCurrency(opportunity.fees.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center text-gray-500 py-8 font-mono">
                No arbitrage alerts
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-3 ${
                    alert.urgency === 'CRITICAL' ? 'border-red-500/50 bg-red-500/5' :
                    alert.urgency === 'HIGH' ? 'border-orange-500/50 bg-orange-500/5' :
                    'border-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        alert.urgency === 'CRITICAL' ? 'text-red-400' :
                        alert.urgency === 'HIGH' ? 'text-orange-400' :
                        'text-yellow-400'
                      }`} />
                      <span className="font-mono text-sm">{alert.message}</span>
                    </div>
                    <span className="text-gray-500 text-xs font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            {(() => {
              const metrics = triangularArbitrage.getPerformanceMetrics();
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Target className="w-4 h-4 text-orange-400" />
                      <h3 className="text-orange-400 font-mono font-bold">EXECUTION METRICS</h3>
                    </div>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Opportunities:</span>
                        <span className="text-orange-300">{metrics.totalOpportunities.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Success Rate:</span>
                        <span className="text-green-400">{metrics.successRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average Profit:</span>
                        <span className="text-green-400">{metrics.avgProfit}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                      <h3 className="text-orange-400 font-mono font-bold">PROFIT SUMMARY</h3>
                    </div>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Profit:</span>
                        <span className="text-green-400">{formatCurrency(metrics.totalProfit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Today's Profit:</span>
                        <span className="text-green-400">{formatCurrency(247.83)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Capital:</span>
                        <span className="text-orange-300">{formatCurrency(50000)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}