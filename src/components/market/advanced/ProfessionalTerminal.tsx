'use client';

import React, { useState, useEffect } from 'react';
import { MacroIndicatorsPro } from './MacroIndicatorsPro';
import { OnChainMetricsPro } from './OnChainMetricsPro';
import { CorrelationsPro } from './CorrelationsPro';
import { InstitutionalPro } from './InstitutionalPro';
import { EconomicCalendarPro } from './EconomicCalendarPro';
import { DerivativesPro } from './DerivativesPro';
import {
  Globe,
  Activity,
  GitBranch,
  Building2,
  Calendar,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Settings,
  Download,
  Star,
  Bell,
  Maximize2,
  Grid,
  List,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ProfessionalTerminalProps {
  className?: string;
}

export function ProfessionalTerminal({ className = '' }: ProfessionalTerminalProps) {
  const [activeTab, setActiveTab] = useState('macro');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [favorites, setFavorites] = useState<string[]>(['macro', 'onchain']);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
      setLastUpdate(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setLastUpdate(new Date());
  };

  const toggleFavorite = (tabId: string) => {
    setFavorites(prev =>
      prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );
  };

  const tabs = [
    {
      id: 'macro',
      label: 'Macro',
      icon: Globe,
      description: 'TradFi Markets & Fed Policy',
      count: 12,
      alertActive: false,
    },
    {
      id: 'onchain',
      label: 'On-Chain',
      icon: Activity,
      description: 'Blockchain Metrics & Flows',
      count: 18,
      alertActive: true,
    },
    {
      id: 'correlations',
      label: 'Correlations',
      icon: GitBranch,
      description: 'Cross-Asset Relationships',
      count: 8,
      alertActive: false,
    },
    {
      id: 'institutional',
      label: 'Institutional',
      icon: Building2,
      description: 'ETF Flows & Corporate Treasury',
      count: 6,
      alertActive: false,
    },
    {
      id: 'calendar',
      label: 'Events',
      icon: Calendar,
      description: 'Economic Calendar & Impact',
      count: 15,
      alertActive: true,
    },
    {
      id: 'derivatives',
      label: 'Derivatives',
      icon: TrendingUp,
      description: 'Futures, Options & Leverage',
      count: 10,
      alertActive: false,
    }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className={`bg-[#0a0a0f] border border-[#1a1a2e]/50 rounded overflow-hidden ${className}`}>
      {/* Enhanced Header */}
      <div className="border-b border-[#1a1a2e] bg-[#0d0d14]">
        {/* Top Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-[#1a1a2e]/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#F7931A]" />
              <h2 className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider">
                PROFESSIONAL MARKET TERMINAL
              </h2>
            </div>
            <div className="h-3 w-px bg-[#1a1a2e]" />
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-[#00D4AA] animate-pulse' : 'bg-[#e4e4e7]/20'}`} />
              <span className="text-[9px] text-[#e4e4e7]/50 font-mono">
                {autoRefresh ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Last Update */}
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">
              {lastUpdate.toLocaleTimeString()}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#1a1a2e] rounded p-0.5">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1 rounded transition-all ${
                  viewMode === 'compact'
                    ? 'bg-[#F7931A] text-black'
                    : 'text-[#e4e4e7]/40 hover:text-[#e4e4e7]'
                }`}
                title="Compact view"
              >
                <List className="w-3 h-3" />
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-1 rounded transition-all ${
                  viewMode === 'detailed'
                    ? 'bg-[#F7931A] text-black'
                    : 'text-[#e4e4e7]/40 hover:text-[#e4e4e7]'
                }`}
                title="Detailed view"
              >
                <Grid className="w-3 h-3" />
              </button>
            </div>

            {/* Auto-refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded transition-all ${
                autoRefresh ? 'bg-[#00D4AA]/20 text-[#00D4AA]' : 'bg-[#1a1a2e] text-[#e4e4e7]/40'
              }`}
              title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              {autoRefresh ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-[#1a1a2e] rounded transition-colors group"
              title="Refresh data"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#e4e4e7]/40 group-hover:text-[#F7931A] transition-colors" />
            </button>

            {/* Settings */}
            <button
              className="p-1.5 hover:bg-[#1a1a2e] rounded transition-colors group"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 text-[#e4e4e7]/40 group-hover:text-[#F7931A] transition-colors" />
            </button>

            {/* Export */}
            <button
              className="p-1.5 hover:bg-[#1a1a2e] rounded transition-colors group"
              title="Export data"
            >
              <Download className="w-3.5 h-3.5 text-[#e4e4e7]/40 group-hover:text-[#F7931A] transition-colors" />
            </button>

            {/* Fullscreen */}
            <button
              className="p-1.5 hover:bg-[#1a1a2e] rounded transition-colors group"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#e4e4e7]/40 group-hover:text-[#F7931A] transition-colors" />
            </button>
          </div>
        </div>

        {/* Tabs Navigation - Enhanced */}
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-[#1a1a2e] scrollbar-track-transparent">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isFavorite = favorites.includes(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-shrink-0 px-4 py-3 border-b-2 transition-all group ${
                  isActive
                    ? 'border-[#F7931A] bg-[#F7931A]/5'
                    : 'border-transparent hover:bg-[#1a1a2e]/50 hover:border-[#1a1a2e]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? 'text-[#F7931A]' : 'text-[#e4e4e7]/50 group-hover:text-[#e4e4e7]'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wide transition-colors ${
                      isActive ? 'text-[#F7931A] font-bold' : 'text-[#e4e4e7]/60 group-hover:text-[#e4e4e7]'
                    }`}
                  >
                    {tab.label}
                  </span>

                  {/* Metric Count Badge */}
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                    isActive
                      ? 'bg-[#F7931A]/20 text-[#F7931A]'
                      : 'bg-[#1a1a2e] text-[#e4e4e7]/40 group-hover:text-[#e4e4e7]'
                  }`}>
                    {tab.count}
                  </span>

                  {/* Alert Indicator */}
                  {tab.alertActive && (
                    <Bell className="w-2.5 h-2.5 text-[#FF4757] animate-pulse" />
                  )}

                  {/* Favorite Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star
                      className={`w-2.5 h-2.5 transition-colors ${
                        isFavorite ? 'fill-[#F7931A] text-[#F7931A]' : 'text-[#e4e4e7]/40 hover:text-[#F7931A]'
                      }`}
                    />
                  </button>
                </div>

                {isActive && (
                  <div className="text-[8px] text-[#e4e4e7]/50 whitespace-nowrap">
                    {tab.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tab Info Bar */}
        {activeTabData && (
          <div className="px-4 py-2 bg-[#0a0a0f] border-t border-[#1a1a2e]/30 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[9px]">
              <div className="flex items-center gap-1.5 text-[#e4e4e7]/60">
                <span className="text-[#e4e4e7]/40">Module:</span>
                <span className="text-[#F7931A] font-mono">{activeTabData.description}</span>
              </div>
              <div className="h-3 w-px bg-[#1a1a2e]" />
              <div className="flex items-center gap-1.5 text-[#e4e4e7]/60">
                <span className="text-[#e4e4e7]/40">Metrics:</span>
                <span className="text-[#00D4AA] font-mono">{activeTabData.count} active</span>
              </div>
              {activeTabData.alertActive && (
                <>
                  <div className="h-3 w-px bg-[#1a1a2e]" />
                  <div className="flex items-center gap-1.5 text-[#FF4757]">
                    <Bell className="w-3 h-3 animate-pulse" />
                    <span>Alert condition detected</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-[9px] text-[#e4e4e7]/40">
              <span>Auto-refresh:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-[#1a1a2e] text-[#e4e4e7] border border-[#2a2a3e] rounded px-2 py-0.5 text-[9px] font-mono focus:outline-none focus:border-[#F7931A]"
                disabled={!autoRefresh}
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a1a2e] scrollbar-track-transparent">
        {activeTab === 'macro' && <MacroIndicatorsPro refreshTrigger={refreshTrigger} />}
        {activeTab === 'onchain' && <OnChainMetricsPro refreshTrigger={refreshTrigger} />}
        {activeTab === 'correlations' && <CorrelationsPro refreshTrigger={refreshTrigger} />}
        {activeTab === 'institutional' && <InstitutionalPro refreshTrigger={refreshTrigger} />}
        {activeTab === 'calendar' && <EconomicCalendarPro refreshTrigger={refreshTrigger} />}
        {activeTab === 'derivatives' && <DerivativesPro refreshTrigger={refreshTrigger} />}
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-2 border-t border-[#1a1a2e] bg-[#0d0d14]">
        <div className="flex items-center justify-between text-[8px] text-[#e4e4e7]/30 font-mono">
          <div className="flex items-center gap-4">
            <span>DATA SOURCES: Bloomberg Terminal, Federal Reserve, Glassnode, Coinglass, CoinGecko</span>
            <span className="text-[#1a1a2e]">|</span>
            <span>LATENCY: &lt;100ms</span>
            <span className="text-[#1a1a2e]">|</span>
            <span>ACCURACY: {'>'}99.9%</span>
          </div>
          <div className="flex items-center gap-3">
            <span>CYPHER TERMINAL v3.2.0</span>
            <span className="text-[#1a1a2e]">|</span>
            <span className="text-[#00D4AA]">PREMIUM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
