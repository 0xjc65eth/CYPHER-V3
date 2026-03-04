'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MacroIndicators } from './MacroIndicators';
import { OnChainMetrics } from './OnChainMetrics';
import { MarketCorrelations } from './MarketCorrelations';
import { InstitutionalFlow } from './InstitutionalFlow';
import { EconomicCalendar } from './EconomicCalendar';
import { DerivativesMetrics } from './DerivativesMetrics';
import {
  Globe,
  Activity,
  GitBranch,
  Building2,
  Calendar,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface ProfessionalMarketAnalysisProps {
  className?: string;
}

export function ProfessionalMarketAnalysis({ className = '' }: ProfessionalMarketAnalysisProps) {
  const [activeTab, setActiveTab] = useState('macro');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setLastUpdate(new Date());
  }, []);

  const handleRefresh = () => {
    setLastUpdate(new Date());
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'macro', label: 'Macro', icon: Globe, description: 'Traditional markets & economic indicators' },
    { id: 'onchain', label: 'On-Chain', icon: Activity, description: 'Bitcoin blockchain metrics' },
    { id: 'correlations', label: 'Correlations', icon: GitBranch, description: 'Asset correlation matrix' },
    { id: 'institutional', label: 'Institutional', icon: Building2, description: 'ETF flows & corporate holdings' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Economic events schedule' },
    { id: 'derivatives', label: 'Derivatives', icon: TrendingUp, description: 'Funding rates & positioning' }
  ];

  return (
    <div className={`bg-[#0d0d14] border border-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a2e] bg-[#0a0a0f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#F7931A]" />
            <h2 className="text-sm font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
              Professional Market Analysis
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono">
              Updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-[#1a1a2e] rounded transition-colors group"
              title="Refresh data"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#e4e4e7]/40 group-hover:text-[#F7931A] transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#1a1a2e] bg-[#0a0a0f]">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-[#1a1a2e] scrollbar-track-transparent">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2.5 border-b-2 transition-all ${
                  isActive
                    ? 'border-[#F7931A] bg-[#F7931A]/5'
                    : 'border-transparent hover:bg-[#1a1a2e]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-[#F7931A]' : 'text-[#e4e4e7]/50'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-mono uppercase tracking-wide ${
                      isActive ? 'text-[#F7931A] font-bold' : 'text-[#e4e4e7]/60'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
                {isActive && (
                  <div className="text-[8px] text-[#e4e4e7]/40 mt-0.5">
                    {tab.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'macro' && <MacroIndicators refreshTrigger={refreshTrigger} />}
        {activeTab === 'onchain' && <OnChainMetrics refreshTrigger={refreshTrigger} />}
        {activeTab === 'correlations' && <MarketCorrelations refreshTrigger={refreshTrigger} />}
        {activeTab === 'institutional' && <InstitutionalFlow refreshTrigger={refreshTrigger} />}
        {activeTab === 'calendar' && <EconomicCalendar />}
        {activeTab === 'derivatives' && <DerivativesMetrics refreshTrigger={refreshTrigger} />}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-[#1a1a2e] bg-[#0a0a0f]">
        <div className="flex items-center justify-between">
          <div className="text-[8px] text-[#e4e4e7]/30 font-mono">
            Data aggregated from Bloomberg, Federal Reserve, CoinGecko, Glassnode & Coinglass
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-[#00D4AA] animate-pulse" />
            <span className="text-[8px] text-[#00D4AA] font-mono">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
