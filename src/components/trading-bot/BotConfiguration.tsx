'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  Shield, 
  Target, 
  Zap, 
  Clock, 
  DollarSign,
  AlertTriangle,
  Info,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface BotConfigurationProps {
  config: any;
  onUpdateConfig: (updates: any) => void;
  isRunning: boolean;
}

interface StrategyConfig {
  name: string;
  key: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  parameters: {
    [key: string]: {
      label: string;
      type: 'number' | 'percentage' | 'boolean' | 'select';
      value: number | boolean | string;
      min?: number;
      max?: number;
      step?: number;
      options?: string[];
      unit?: string;
      description: string;
    };
  };
}

const strategyConfigs: StrategyConfig[] = [
  {
    name: 'Arbitrage Scanner',
    key: 'arbitrage',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-yellow-400 border-yellow-400/30',
    description: 'Identifica e executa oportunidades de arbitragem entre exchanges',
    riskLevel: 'low',
    parameters: {
      minSpread: {
        label: 'Spread Mínimo',
        type: 'percentage',
        value: 0.1,
        min: 0.05,
        max: 1.0,
        step: 0.05,
        unit: '%',
        description: 'Diferença mínima de preço para executar arbitragem'
      },
      maxSlippage: {
        label: 'Slippage Máximo',
        type: 'percentage',
        value: 0.2,
        min: 0.1,
        max: 0.5,
        step: 0.1,
        unit: '%',
        description: 'Tolerância máxima de deslizamento de preço'
      },
      timeout: {
        label: 'Timeout de Execução',
        type: 'number',
        value: 30,
        min: 10,
        max: 120,
        step: 10,
        unit: 's',
        description: 'Tempo limite para executar a arbitragem'
      }
    }
  },
  {
    name: 'Grid Trading',
    key: 'gridTrading',
    icon: <Target className="w-5 h-5" />,
    color: 'text-blue-400 border-blue-400/30',
    description: 'Coloca ordens em níveis de preço para capturar volatilidade',
    riskLevel: 'medium',
    parameters: {
      gridLevels: {
        label: 'Níveis do Grid',
        type: 'number',
        value: 10,
        min: 5,
        max: 20,
        step: 1,
        description: 'Número de níveis de preço no grid'
      },
      gridRange: {
        label: 'Range do Grid',
        type: 'percentage',
        value: 2.0,
        min: 1.0,
        max: 5.0,
        step: 0.5,
        unit: '%',
        description: 'Faixa de preço coberta pelo grid'
      },
      rebalanceInterval: {
        label: 'Intervalo de Rebalanceamento',
        type: 'number',
        value: 60,
        min: 30,
        max: 240,
        step: 30,
        unit: 'min',
        description: 'Frequência de ajuste do grid'
      }
    }
  },
  {
    name: 'DCA Strategy',
    key: 'dca',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-green-400 border-green-400/30',
    description: 'Compras periódicas para reduzir preço médio de entrada',
    riskLevel: 'low',
    parameters: {
      buyInterval: {
        label: 'Intervalo de Compra',
        type: 'select',
        value: '24h',
        options: ['1h', '4h', '12h', '24h', '48h'],
        description: 'Frequência das compras automáticas'
      },
      buyAmount: {
        label: 'Valor por Compra',
        type: 'number',
        value: 100,
        min: 50,
        max: 1000,
        step: 50,
        unit: 'USD',
        description: 'Valor investido em cada compra'
      },
      maxBuys: {
        label: 'Máximo de Compras',
        type: 'number',
        value: 10,
        min: 5,
        max: 50,
        step: 5,
        description: 'Número máximo de compras consecutivas'
      }
    }
  },
  {
    name: 'Momentum Trading',
    key: 'momentum',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'text-purple-400 border-purple-400/30',
    description: 'Segue tendências fortes do mercado',
    riskLevel: 'high',
    parameters: {
      momentumThreshold: {
        label: 'Threshold de Momentum',
        type: 'percentage',
        value: 5.0,
        min: 2.0,
        max: 10.0,
        step: 0.5,
        unit: '%',
        description: 'Mudança mínima de preço para acionar sinal'
      },
      volumeThreshold: {
        label: 'Volume Mínimo',
        type: 'number',
        value: 1000000,
        min: 500000,
        max: 5000000,
        step: 500000,
        unit: 'USD',
        description: 'Volume mínimo para validar momentum'
      },
      timeframe: {
        label: 'Timeframe',
        type: 'select',
        value: '1h',
        options: ['15m', '30m', '1h', '4h', '1d'],
        description: 'Período de análise do momentum'
      }
    }
  },
  {
    name: 'Mean Reversion',
    key: 'meanReversion',
    icon: <RefreshCw className="w-5 h-5" />,
    color: 'text-cyan-400 border-cyan-400/30',
    description: 'Opera contra movimentos extremos esperando reversão',
    riskLevel: 'medium',
    parameters: {
      deviationThreshold: {
        label: 'Threshold de Desvio',
        type: 'number',
        value: 2.0,
        min: 1.5,
        max: 3.0,
        step: 0.1,
        unit: 'σ',
        description: 'Número de desvios padrão para acionar sinal'
      },
      lookbackPeriod: {
        label: 'Período de Análise',
        type: 'number',
        value: 20,
        min: 10,
        max: 50,
        step: 5,
        description: 'Número de períodos para calcular média'
      },
      maxHoldTime: {
        label: 'Tempo Máximo de Posição',
        type: 'number',
        value: 24,
        min: 6,
        max: 72,
        step: 6,
        unit: 'h',
        description: 'Tempo máximo para manter posição aberta'
      }
    }
  }
];

export default function BotConfiguration({ config, onUpdateConfig, isRunning }: BotConfigurationProps) {
  const [activeStrategy, setActiveStrategy] = useState<string | null>(null);

  const handleStrategyToggle = (strategyKey: string) => {
    onUpdateConfig({
      strategies: {
        ...config.strategies,
        [strategyKey]: !config.strategies[strategyKey]
      }
    });
  };

  const handleParameterUpdate = (strategyKey: string, paramKey: string, value: any) => {
    // This would update strategy-specific parameters
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 border-green-400/30';
      case 'medium': return 'text-yellow-400 border-yellow-400/30';
      case 'high': return 'text-red-400 border-red-400/30';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card className="bg-black border-orange-500/30 p-6">
        <h3 className="text-lg font-bold text-orange-500 font-mono mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          CONFIGURAÇÕES GLOBAIS
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-mono text-orange-500/60 mb-2 block">
              NÍVEL DE RISCO GLOBAL
            </label>
            <div className="flex gap-2">
              {['conservative', 'moderate', 'aggressive'].map((level) => (
                <Button
                  key={level}
                  variant={config?.riskLevel === level ? 'default' : 'outline'}
                  onClick={() => onUpdateConfig({ riskLevel: level })}
                  disabled={isRunning}
                  className="font-mono text-xs"
                >
                  {level === 'conservative' && <Shield className="w-3 h-3 mr-1" />}
                  {level === 'moderate' && <Target className="w-3 h-3 mr-1" />}
                  {level === 'aggressive' && <Zap className="w-3 h-3 mr-1" />}
                  {level.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-mono text-orange-500/60 mb-2 block">
              CAPITAL MÁXIMO POR ESTRATÉGIA
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config?.maxPositionSize || 1000}
                onChange={(e) => onUpdateConfig({ maxPositionSize: parseInt(e.target.value) })}
                className="flex-1 p-2 bg-gray-900 border border-orange-500/30 rounded text-orange-500 font-mono text-sm"
                disabled={isRunning}
                min="100"
                max="100000"
                step="100"
              />
              <span className="text-sm text-orange-500/60 font-mono">USD</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-mono text-orange-500/60 mb-2 block">
              PERDA MÁXIMA DIÁRIA
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config?.maxDailyLoss || 500}
                onChange={(e) => onUpdateConfig({ maxDailyLoss: parseInt(e.target.value) })}
                className="flex-1 p-2 bg-gray-900 border border-orange-500/30 rounded text-orange-500 font-mono text-sm"
                disabled={isRunning}
                min="100"
                max="10000"
                step="100"
              />
              <span className="text-sm text-orange-500/60 font-mono">USD</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-mono text-orange-500/60 mb-2 block">
              STOP LOSS GLOBAL (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config?.stopLossPercent || 2}
                onChange={(e) => onUpdateConfig({ stopLossPercent: parseFloat(e.target.value) })}
                className="flex-1 p-2 bg-gray-900 border border-orange-500/30 rounded text-orange-500 font-mono text-sm"
                disabled={isRunning}
                min="0.5"
                max="10"
                step="0.5"
              />
              <span className="text-sm text-orange-500/60 font-mono">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Strategy Configuration */}
      <Card className="bg-black border-orange-500/30 p-6">
        <h3 className="text-lg font-bold text-orange-500 font-mono mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          CONFIGURAÇÃO DE ESTRATÉGIAS
        </h3>
        
        <div className="space-y-4">
          {strategyConfigs.map((strategy) => (
            <div key={strategy.key} className="border border-orange-500/20 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${strategy.color.split(' ')[0]}`}>
                      {strategy.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-500 font-mono">{strategy.name}</h4>
                      <p className="text-sm text-orange-500/60">{strategy.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={getRiskLevelColor(strategy.riskLevel)}
                    >
                      {strategy.riskLevel.toUpperCase()}
                    </Badge>
                    
                    <Switch
                      checked={config?.strategies?.[strategy.key] || false}
                      onCheckedChange={() => handleStrategyToggle(strategy.key)}
                      disabled={isRunning}
                    />
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveStrategy(activeStrategy === strategy.key ? null : strategy.key)}
                      className="text-orange-500 hover:bg-orange-500/10"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {activeStrategy === strategy.key && (
                <div className="p-4 bg-gray-900/50 border-t border-orange-500/20">
                  <h5 className="text-sm font-bold text-orange-500 font-mono mb-3">
                    PARÂMETROS AVANÇADOS
                  </h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(strategy.parameters).map(([paramKey, param]) => (
                      <div key={paramKey}>
                        <label className="text-xs font-mono text-orange-500/60 mb-2 block">
                          {param.label}
                          {param.unit && <span className="ml-1">({param.unit})</span>}
                        </label>
                        
                        {param.type === 'number' || param.type === 'percentage' ? (
                          <div className="space-y-2">
                            <input
                              type="number"
                              value={param.value as number}
                              onChange={(e) => handleParameterUpdate(strategy.key, paramKey, parseFloat(e.target.value))}
                              className="w-full p-2 bg-gray-900 border border-orange-500/30 rounded text-orange-500 font-mono text-xs"
                              disabled={isRunning}
                              min={param.min}
                              max={param.max}
                              step={param.step}
                            />
                            {param.min !== undefined && param.max !== undefined && (
                              <div className="px-2">
                                <Slider
                                  value={[param.value as number]}
                                  onValueChange={([value]) => handleParameterUpdate(strategy.key, paramKey, value)}
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  disabled={isRunning}
                                  className="w-full"
                                />
                              </div>
                            )}
                          </div>
                        ) : param.type === 'select' ? (
                          <select
                            value={param.value as string}
                            onChange={(e) => handleParameterUpdate(strategy.key, paramKey, e.target.value)}
                            className="w-full p-2 bg-gray-900 border border-orange-500/30 rounded text-orange-500 font-mono text-xs"
                            disabled={isRunning}
                          >
                            {param.options?.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <Switch
                            checked={param.value as boolean}
                            onCheckedChange={(checked) => handleParameterUpdate(strategy.key, paramKey, checked)}
                            disabled={isRunning}
                          />
                        )}
                        
                        <p className="text-xs text-orange-500/40 mt-1">{param.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Asset Selection */}
      <Card className="bg-black border-orange-500/30 p-6">
        <h3 className="text-lg font-bold text-orange-500 font-mono mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          SELEÇÃO DE ATIVOS
        </h3>
        
        <div className="grid grid-cols-5 gap-3">
          {['BTC', 'ETH', 'SOL', 'DOGE', 'AVAX', 'ADA', 'DOT', 'MATIC', 'LINK', 'UNI'].map(asset => (
            <Button
              key={asset}
              variant={config?.assets?.includes(asset) ? 'default' : 'outline'}
              onClick={() => {
                const currentAssets = config?.assets || [];
                const newAssets = currentAssets.includes(asset)
                  ? currentAssets.filter((a: string) => a !== asset)
                  : [...currentAssets, asset];
                onUpdateConfig({ assets: newAssets });
              }}
              disabled={isRunning}
              className="font-mono text-sm"
            >
              {asset}
            </Button>
          ))}
        </div>
      </Card>

      {/* Warning */}
      <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-yellow-400 font-mono mb-1">AVISO IMPORTANTE</h4>
            <p className="text-sm text-yellow-400/80 font-mono leading-relaxed">
              Trading automatizado envolve riscos significativos. Configure limites de perda apropriados 
              e monitore regularmente o desempenho. Nunca invista mais do que pode perder.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}