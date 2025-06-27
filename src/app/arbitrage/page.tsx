'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Volume2,
  Eye,
  ExternalLink,
  Filter,
  RefreshCw,
  Zap,
  Target,
  Bell,
  BellOff,
  Maximize2,
  BarChart3,
  Home,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { RunesTerminalProvider } from '@/contexts/RunesTerminalContext';
import { useArbitrage } from '@/hooks/useArbitrage';
import ArbitrageHeatmap from '@/components/arbitrage/ArbitrageHeatmap';
import OpportunityDetails from '@/components/arbitrage/OpportunityDetails';
import ArbitrageHistory from '@/components/arbitrage/ArbitrageHistory';
import SpreadChart from '@/components/arbitrage/SpreadChart';

export default function ArbitragePage() {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'history' | 'chart'>('opportunities');
  const [minSpread, setMinSpread] = useState(5);
  const [selectedAssetType, setSelectedAssetType] = useState<'all' | 'ordinals' | 'runes' | 'tokens'>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [newOpportunityCount, setNewOpportunityCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { 
    opportunities, 
    loading, 
    error, 
    lastUpdate,
    totalSpread,
    avgSpread 
  } = useArbitrage(minSpread, selectedAssetType);

  // Alert system for new opportunities
  useEffect(() => {
    if (opportunities.length > newOpportunityCount && newOpportunityCount > 0 && alertsEnabled) {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      setNewOpportunityCount(opportunities.length);
    } else {
      setNewOpportunityCount(opportunities.length);
    }
  }, [opportunities.length, newOpportunityCount, alertsEnabled]);

  const formatCurrency = (value: number, currency: string = 'BTC') => {
    if (currency === 'BTC') {
      return `₿${value.toFixed(8)}`;
    } else if (currency === 'USD') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${value.toFixed(6)} ${currency}`;
  };

  const formatSpread = (spread: number) => {
    const color = spread >= 15 ? 'text-red-400' : spread >= 10 ? 'text-orange-400' : 'text-green-400';
    return <span className={`font-bold ${color}`}>{spread.toFixed(2)}%</span>;
  };

  const getRiskBadgeColor = (riskScore: string) => {
    switch (riskScore) {
      case 'low': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'high': return 'bg-red-500/20 border-red-500 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const formatExecutionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const OpportunityRow = ({ opportunity, index }: { opportunity: any; index: number }) => {
    return (
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
        className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-all duration-200"
        onClick={() => setSelectedOpportunity(opportunity)}
      >
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Badge className={`${
              opportunity.type === 'ordinals' ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
              opportunity.type === 'runes' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
              'bg-blue-500/20 border-blue-500 text-blue-400'
            } border`}>
              {opportunity.type.toUpperCase()}
            </Badge>
            <div>
              <div className="font-bold text-white">{opportunity.symbol}</div>
              <div className="text-xs text-gray-400">{opportunity.name}</div>
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-green-400 font-mono font-bold">
              {formatCurrency(opportunity.buyPrice, opportunity.baseCurrency)}
            </div>
            <div className="text-xs text-gray-400">{opportunity.buySource}</div>
          </div>
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-red-400 font-mono font-bold">
              {formatCurrency(opportunity.sellPrice, opportunity.baseCurrency)}
            </div>
            <div className="text-xs text-gray-400">{opportunity.sellSource}</div>
          </div>
        </td>
        <td className="p-4 text-center">
          {formatSpread(opportunity.spread)}
        </td>
        <td className="p-4">
          <div className="text-center">
            <div className="text-white font-mono">
              {formatCurrency(opportunity.potentialProfit, opportunity.baseCurrency)}
            </div>
            <div className="text-xs text-gray-400">
              Taxa: {opportunity.estimatedFees ? formatCurrency(opportunity.estimatedFees.total, opportunity.baseCurrency) : 'N/A'}
            </div>
          </div>
        </td>
        {/* New Risk & Trust Score Column */}
        <td className="p-4">
          <div className="text-center space-y-1">
            <Badge className={`${getRiskBadgeColor(opportunity.riskScore)} border text-xs`}>
              {opportunity.riskScore === 'low' ? '🟢' : opportunity.riskScore === 'medium' ? '🟡' : '🔴'}
              {opportunity.riskScore.toUpperCase()}
            </Badge>
            <div className="text-xs text-gray-400">
              Trust: {opportunity.trustScore || 0}%
            </div>
          </div>
        </td>
        {/* New Execution Time Column */}
        <td className="p-4">
          <div className="text-center">
            <div className="text-cyan-400 font-mono font-bold">
              {formatExecutionTime(opportunity.executionTime || 300)}
            </div>
            <div className="text-xs text-gray-400">
              {opportunity.historicalSuccess ? `${opportunity.historicalSuccess}% taxa sucesso` : 'Novo'}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center justify-center gap-1">
            {opportunity.liquidity >= 80 ? (
              <Badge className="bg-green-500/20 border-green-500 text-green-400 border">Alta</Badge>
            ) : opportunity.liquidity >= 50 ? (
              <Badge className="bg-yellow-500/20 border-yellow-500 text-yellow-400 border">Média</Badge>
            ) : (
              <Badge className="bg-red-500/20 border-red-500 text-red-400 border">Baixa</Badge>
            )}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOpportunity(opportunity);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Detalhes
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 hover:border-green-500"
              onClick={(e) => {
                e.stopPropagation();
                window.open(opportunity.buyLink, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </motion.tr>
    );
  };

  return (
    <RunesTerminalProvider>
      <div className="min-h-screen bg-black text-white font-mono">
        {/* Navigation */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2 border-gray-600 hover:border-orange-500">
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-gray-400">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Neural Arbitrage Detection</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Brain className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-3xl font-bold text-orange-400">CYPHER ARBITRAGE</h1>
                <p className="text-gray-400">Detecção Neural de Spreads • Ordinals & Tokens</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                variant={alertsEnabled ? 'default' : 'outline'}
                size="sm"
                className={alertsEnabled ? 'bg-green-600' : 'border-gray-600'}
              >
                {alertsEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                Alertas {alertsEnabled ? 'ON' : 'OFF'}
              </Button>
              
              {lastUpdate && (
                <div className="text-xs text-gray-400">
                  Última atualização: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-800">
          <div className="px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('opportunities')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'opportunities'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Oportunidades Ativas
                  {opportunities.length > 0 && (
                    <Badge className="bg-orange-500/20 border-orange-500 text-orange-400 border text-xs">
                      {opportunities.length}
                    </Badge>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Histórico & Analytics
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('chart')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chart'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Comparador de Spreads
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-900/50 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-400">{opportunities.length}</div>
                    <div className="text-sm text-gray-400">Oportunidades Ativas</div>
                  </div>
                  <Target className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{totalSpread ? totalSpread.toFixed(1) : '0.0'}%</div>
                    <div className="text-sm text-gray-400">Spread Total</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{avgSpread ? avgSpread.toFixed(1) : '0.0'}%</div>
                    <div className="text-sm text-gray-400">Spread Médio</div>
                  </div>
                  <Activity className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {opportunities.filter(o => o.spread >= 10).length}
                    </div>
                    <div className="text-sm text-gray-400">Spreads &gt; 10%</div>
                  </div>
                  <Zap className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Content */}
          {activeTab === 'opportunities' && (
            <>
              {/* Filters */}
              <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Spread mínimo:</span>
                <div className="flex gap-1">
                  {[3, 5, 10, 15].map(value => (
                    <Button
                      key={value}
                      size="sm"
                      variant={minSpread === value ? 'default' : 'outline'}
                      className={minSpread === value ? 'bg-orange-600' : 'border-gray-600 hover:border-orange-500'}
                      onClick={() => setMinSpread(value)}
                    >
                      {value}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Tipo:</span>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'ordinals', label: 'Ordinals' },
                    { key: 'runes', label: 'Runes' },
                    { key: 'tokens', label: 'Tokens' }
                  ].map(type => (
                    <Button
                      key={type.key}
                      size="sm"
                      variant={selectedAssetType === type.key ? 'default' : 'outline'}
                      className={selectedAssetType === type.key ? 'bg-blue-600' : 'border-gray-600 hover:border-blue-500'}
                      onClick={() => setSelectedAssetType(type.key as any)}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 hover:border-green-500"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Opportunities Table */}
            <div className="xl:col-span-3">
              <Card className="bg-black/50 border-orange-500/30">
                <CardHeader>
                  <CardTitle className="text-orange-400 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Oportunidades de Arbitragem • Spread ≥ {minSpread}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 text-orange-400 animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Escaneando mercados...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
                        <p className="text-red-400">Erro ao carregar dados</p>
                        <p className="text-gray-400 text-sm">{error}</p>
                      </div>
                    </div>
                  ) : opportunities.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Target className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Nenhuma oportunidade encontrada</p>
                        <p className="text-gray-500 text-sm">Diminua o spread mínimo para ver mais opções</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left p-4 text-gray-400 font-mono">Ativo</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Comprar</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Vender</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Spread</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Lucro/Taxas</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Risco/Trust</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Exec. Time</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Liquidez</th>
                            <th className="text-center p-4 text-gray-400 font-mono">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opportunities.map((opportunity, index) => (
                            <OpportunityRow 
                              key={`${opportunity.symbol}-${opportunity.buySource}-${opportunity.sellSource}`}
                              opportunity={opportunity}
                              index={index}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Heatmap Sidebar */}
            <div className="xl:col-span-1">
              <Card className="bg-black/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Atividade de Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ArbitrageHeatmap opportunities={opportunities} />
                </CardContent>
              </Card>
            </div>
          </div>
            </>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <ArbitrageHistory />
          )}

          {/* Chart Tab */}
          {activeTab === 'chart' && (
            <SpreadChart opportunities={opportunities} />
          )}
        </div>

        {/* Opportunity Details Modal */}
        <OpportunityDetails
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
        />

        {/* Alert Audio */}
        <audio ref={audioRef} preload="auto">
          <source src="/sounds/alert.wav" type="audio/wav" />
          <source src="/sounds/alert.mp3" type="audio/mpeg" />
        </audio>
      </div>
    </RunesTerminalProvider>
  );
}