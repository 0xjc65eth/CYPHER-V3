'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { ArbitrageOpportunity } from '@/hooks/useArbitrage';

interface ArbitrageHeatmapProps {
  opportunities: ArbitrageOpportunity[];
}

export default function ArbitrageHeatmap({ opportunities }: ArbitrageHeatmapProps) {
  // Group opportunities by asset type and source
  const heatmapData = useMemo(() => {
    const sources = ['Gamma.io', 'UniSat', 'OKX', 'Ordiscan', 'Gate.io'];
    const assetTypes = ['ordinals', 'runes', 'tokens'];
    
    return sources.map(source => ({
      source,
      assets: assetTypes.map(type => {
        const typeOpportunities = opportunities.filter(
          opp => opp.type === type && (opp.buySource === source || opp.sellSource === source)
        );
        
        const totalSpread = typeOpportunities.reduce((sum, opp) => sum + opp.spread, 0);
        const avgSpread = typeOpportunities.length > 0 ? totalSpread / typeOpportunities.length : 0;
        
        return {
          type,
          count: typeOpportunities.length,
          avgSpread,
          intensity: Math.min(100, avgSpread * 5) // Convert spread to intensity (0-100)
        };
      })
    }));
  }, [opportunities]);

  // Market activity summary
  const marketSummary = useMemo(() => {
    const totalOpportunities = opportunities.length;
    const avgSpread = opportunities.length > 0 
      ? opportunities.reduce((sum, opp) => sum + opp.spread, 0) / opportunities.length 
      : 0;
    
    const highSpreadCount = opportunities.filter(opp => opp.spread >= 15).length;
    const mediumSpreadCount = opportunities.filter(opp => opp.spread >= 10 && opp.spread < 15).length;
    const lowSpreadCount = opportunities.filter(opp => opp.spread < 10).length;

    return {
      totalOpportunities,
      avgSpread,
      highSpreadCount,
      mediumSpreadCount,
      lowSpreadCount
    };
  }, [opportunities]);

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 80) return 'bg-red-500';
    if (intensity >= 60) return 'bg-orange-500';
    if (intensity >= 40) return 'bg-yellow-500';
    if (intensity >= 20) return 'bg-green-500';
    return 'bg-gray-600';
  };

  const getIntensityOpacity = (intensity: number) => {
    return Math.max(0.1, intensity / 100);
  };

  return (
    <div className="space-y-6">
      {/* Market Activity Summary */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Atividade Total</span>
          </div>
          <div className="text-lg font-bold text-white">{marketSummary.totalOpportunities}</div>
          <div className="text-xs text-gray-400">
            Spread médio: {marketSummary.avgSpread.toFixed(1)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-xs text-gray-400">Alto Spread</span>
          </div>
          <div className="text-lg font-bold text-green-400">{marketSummary.highSpreadCount}</div>
          <div className="text-xs text-gray-400">≥ 15%</div>
        </motion.div>
      </div>

      {/* Spread Distribution */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400">Distribuição de Spreads</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Alto (≥15%)</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ 
                    width: `${marketSummary.totalOpportunities > 0 ? (marketSummary.highSpreadCount / marketSummary.totalOpportunities) * 100 : 0}%` 
                  }}
                />
              </div>
              <span className="text-xs text-red-400 font-mono">{marketSummary.highSpreadCount}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Médio (10-15%)</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ 
                    width: `${marketSummary.totalOpportunities > 0 ? (marketSummary.mediumSpreadCount / marketSummary.totalOpportunities) * 100 : 0}%` 
                  }}
                />
              </div>
              <span className="text-xs text-orange-400 font-mono">{marketSummary.mediumSpreadCount}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Baixo (&lt;10%)</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ 
                    width: `${marketSummary.totalOpportunities > 0 ? (marketSummary.lowSpreadCount / marketSummary.totalOpportunities) * 100 : 0}%` 
                  }}
                />
              </div>
              <span className="text-xs text-green-400 font-mono">{marketSummary.lowSpreadCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source vs Asset Type Heatmap */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">Matriz de Fontes vs Ativos</h4>
        
        {/* Header */}
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div></div>
          <div className="text-center text-orange-400">ORD</div>
          <div className="text-center text-purple-400">RUN</div>
          <div className="text-center text-blue-400">TOK</div>
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-1">
          {heatmapData.map((sourceData, sourceIndex) => (
            <motion.div
              key={sourceData.source}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: sourceIndex * 0.1 }}
              className="grid grid-cols-4 gap-1 items-center"
            >
              {/* Source name */}
              <div className="text-xs text-gray-400 truncate pr-1">
                {sourceData.source.split(' ')[0]}
              </div>
              
              {/* Asset type cells */}
              {sourceData.assets.map((asset, assetIndex) => (
                <motion.div
                  key={`${sourceData.source}-${asset.type}`}
                  className={`relative h-8 rounded border border-gray-600 overflow-hidden cursor-pointer group ${getIntensityColor(asset.intensity)}`}
                  style={{ 
                    opacity: getIntensityOpacity(asset.intensity)
                  }}
                  whileHover={{ scale: 1.05 }}
                  title={`${sourceData.source} - ${asset.type}\nOportunidades: ${asset.count}\nSpread médio: ${asset.avgSpread.toFixed(1)}%`}
                >
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <div className="text-xs font-bold">{asset.count}</div>
                    {asset.avgSpread > 0 && (
                      <div className="text-xs opacity-80">{asset.avgSpread.toFixed(0)}%</div>
                    )}
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400">Legenda</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-400">Alto spread (≥15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-400">Médio (10-15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-400">Baixo (5-10%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-400">Muito baixo (&lt;5%)</span>
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-700">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-400">Atualização em tempo real</span>
      </div>
    </div>
  );
}