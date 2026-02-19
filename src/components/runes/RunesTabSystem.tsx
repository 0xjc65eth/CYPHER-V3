'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Activity,
  Timer,
  Crown,
  Clock,
  ShoppingCart,
  ArrowLeftRight,
  Radio,
  Keyboard,
  HelpCircle
} from 'lucide-react';
import { KeyboardShortcutsModal, defaultRunesShortcuts } from '@/components/ui/professional';

// Lazy-loaded tab components - Professional versions
const RunesMarketOverviewFixed = lazy(() => import('./professional/MarketOverviewPro'));
const RunesEtchingHistory = lazy(() => import('./professional/EtchingsPro'));
const RunesMarketplace = lazy(() => import('./RunesMarketplace'));
const RunesArbitrage = lazy(() => import('./RunesArbitrage'));
const RunesLiveFeed = lazy(() => import('./RunesLiveFeed'));
const RunesAnalyticsFixed = lazy(() => import('./professional/AnalyticsPro'));

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  badge?: string;
  color: string;
  description: string;
  hotkey: string;
}

const tabs: Tab[] = [
  {
    id: 'market',
    label: 'Market Overview',
    shortLabel: 'Market',
    icon: Activity,
    component: RunesMarketOverviewFixed,
    badge: 'LIVE',
    color: 'orange',
    description: 'Real-time Runes market data — Supply, holders, watchlist',
    hotkey: '1'
  },
  {
    id: 'etchings',
    label: 'Etching History',
    shortLabel: 'Etchings',
    icon: Clock,
    component: RunesEtchingHistory,
    badge: 'LIVE',
    color: 'purple',
    description: 'Recently created Runes — Mint status, premine, supply details',
    hotkey: '2'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    shortLabel: 'Market',
    icon: ShoppingCart,
    component: RunesMarketplace,
    color: 'green',
    description: 'Active listings, order book, and trade history across marketplaces',
    hotkey: '3'
  },
  {
    id: 'arbitrage',
    label: 'Arbitrage',
    shortLabel: 'Arb',
    icon: ArrowLeftRight,
    component: RunesArbitrage,
    color: 'cyan',
    description: 'Cross-marketplace arbitrage opportunities and spread analysis',
    hotkey: '4'
  },
  {
    id: 'live',
    label: 'Live Feed',
    shortLabel: 'Live',
    icon: Radio,
    component: RunesLiveFeed,
    badge: 'LIVE',
    color: 'red',
    description: 'Real-time activity feed — Mints, trades, transfers, whale alerts',
    hotkey: '5'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: 'Analytics',
    icon: BarChart3,
    component: RunesAnalyticsFixed,
    badge: 'LIVE',
    color: 'blue',
    description: 'Comprehensive analytics — Top by holders, supply, turbo runes',
    hotkey: '6'
  }
];

const colorMap: Record<string, Record<string, string>> = {
  orange: { text: 'text-orange-400', border: 'border-orange-400', bg: 'bg-orange-400', bgSoft: 'bg-orange-400/20' },
  blue: { text: 'text-blue-400', border: 'border-blue-400', bg: 'bg-blue-400', bgSoft: 'bg-blue-400/20' },
  purple: { text: 'text-purple-400', border: 'border-purple-400', bg: 'bg-purple-400', bgSoft: 'bg-purple-400/20' },
  green: { text: 'text-green-400', border: 'border-green-400', bg: 'bg-green-400', bgSoft: 'bg-green-400/20' },
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400', bg: 'bg-cyan-400', bgSoft: 'bg-cyan-400/20' },
  red: { text: 'text-red-400', border: 'border-red-400', bg: 'bg-red-400', bgSoft: 'bg-red-400/20' },
};

const getColor = (color: string, type: string) => colorMap[color]?.[type] || 'text-gray-400';

interface TickerRune {
  spaced_name: string;
  holders: number | null;
  symbol: string;
}

function TopRunesTicker() {
  const [topRunes, setTopRunes] = useState<TickerRune[]>([]);
  const [totalRunes, setTotalRunes] = useState<number>(0);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch('/api/runes/popular/?limit=60&offset=0');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data) {
          setTopRunes(data.data.map((r: any) => ({
            spaced_name: r.spaced_name || r.name,
            holders: r.holders,
            symbol: r.symbol || ''
          })));
          setTotalRunes(data.total || 0);
        }
      } catch { /* silent */ }
    }
    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  if (topRunes.length === 0) return null;

  return (
    <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-1.5 overflow-hidden">
      <div className="flex items-center gap-6 text-xs overflow-x-auto scrollbar-hide">
        <span className="text-gray-500 font-medium whitespace-nowrap flex-shrink-0">
          {totalRunes.toLocaleString()} RUNES
        </span>
        <span className="text-gray-700">|</span>
        {topRunes.map((rune, i) => (
          <span key={i} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
            <span className="text-gray-400">{rune.symbol}</span>
            <span className="text-white font-medium">{rune.spaced_name}</span>
            {rune.holders != null && (
              <span className="text-blue-400">{rune.holders.toLocaleString()} holders</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function TabLoadingFallback({ tab }: { tab: Tab }) {
  return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-4 mx-auto w-16 h-16">
          <div className="w-16 h-16 border-4 border-gray-700 rounded-full">
            <div className={`absolute inset-2 border-4 ${getColor(tab.color, 'border')} border-t-transparent rounded-full animate-spin`}
              style={{ animationDuration: '0.8s' }} />
          </div>
        </div>
        <h3 className={`text-xl font-bold ${getColor(tab.color, 'text')} mb-2`}>
          Loading {tab.label}
        </h3>
        <p className="text-gray-400 text-sm">{tab.description}</p>
      </div>
    </div>
  );
}

export default function RunesTabSystem() {
  const [activeTab, setActiveTab] = useState('market');
  const [showKeyHints, setShowKeyHints] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  // Update time on client only (prevents hydration errors)
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    // Set initial time
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key;

      // Tab navigation (1-6)
      if (key >= '1' && key <= '6') {
        const index = parseInt(key) - 1;
        if (tabs[index]) {
          setActiveTab(tabs[index].id);
        }
      }

      // Show shortcuts modal (?)
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(true);
      }

      // Close modal (Esc)
      if (key === 'Escape') {
        setShowShortcutsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Ticker */}
      <TopRunesTicker />

      {/* Header with Status Bar */}
      <div className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Crown className="h-7 w-7 text-yellow-500" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent">
                  RUNES PROFESSIONAL TERMINAL
                </h1>
                <p className="text-xs text-gray-500">Real-time data from Hiro API</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="bg-green-500/20 border-green-500 text-green-400 text-xs">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse" />
                LIVE
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-orange-400 text-xs gap-1"
                onClick={() => setShowShortcutsModal(true)}
                title="Keyboard Shortcuts (?)"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Help</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-300 text-xs gap-1"
                onClick={() => setShowKeyHints(!showKeyHints)}
              >
                <Keyboard className="h-3.5 w-3.5" />
                {showKeyHints ? 'Hide' : '1-6'}
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? `${getColor(tab.color, 'bgSoft')} ${getColor(tab.color, 'border')} border ${getColor(tab.color, 'text')}`
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60 border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>

                  {showKeyHints && (
                    <span className="text-[10px] px-1 py-0 rounded bg-gray-700 text-gray-300 font-mono">
                      {tab.hotkey}
                    </span>
                  )}

                  {tab.badge && (
                    <span className={`text-[10px] px-1 rounded ${
                      tab.badge === 'LIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}

                  {isActive && (
                    <div className={`absolute bottom-0 left-1 right-1 h-0.5 ${getColor(tab.color, 'bg')} rounded-full`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Tab Description Bar */}
      {activeTabData && (
        <div className="bg-gray-900/40 border-b border-gray-800/50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 ${getColor(activeTabData.color, 'bg')} rounded-full animate-pulse`} />
              <span className="text-xs text-gray-500">{activeTabData.description}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="h-3 w-3 text-gray-600" />
              <span className="text-[10px] text-gray-600">
                {currentTime}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="relative">
        {activeTabData && (
          <Suspense fallback={<TabLoadingFallback tab={activeTabData} />}>
            <activeTabData.component />
          </Suspense>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={defaultRunesShortcuts}
      />
    </div>
  );
}
