'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, Zap, TrendingUp, TrendingDown, Target, Shield, 
  AlertTriangle, Rocket, DollarSign, Bitcoin, Gem, Sparkles,
  CheckCircle, XCircle, Info, Lightbulb, Bot, Cpu, BarChart3,
  TrendingUp as Growth, Calculator, Percent, Clock, Star,
  ArrowUpRight, ArrowDownRight, Eye, Coins, Banknote
} from 'lucide-react';

interface AIAnalysisProps {
  portfolioData: any;
  currentBtcPrice: number;
  walletAddress: string;
}

interface InvestmentOpportunity {
  id: string;
  name: string;
  category: 'bitcoin' | 'ordinals' | 'runes' | 'defi' | 'lightning';
  riskLevel: 'safe' | 'moderate' | 'degen' | 'degen_lfg';
  expectedReturn: number;
  satoshiPotential: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
  strategy: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
}

const riskLevelColors = {
  safe: 'bg-green-600',
  moderate: 'bg-yellow-600', 
  degen: 'bg-orange-600',
  degen_lfg: 'bg-red-600'
};

const riskLevelIcons = {
  safe: Shield,
  moderate: Target,
  degen: Zap,
  degen_lfg: Rocket
};

export function AIPortfolioAnalysis({ portfolioData, currentBtcPrice, walletAddress }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [riskProfile, setRiskProfile] = useState<'safe' | 'moderate' | 'degen' | 'degen_lfg'>('moderate');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAIAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/portfolio-analysis/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          portfolioData,
          riskProfile,
          currentBtcPrice
        })
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.data.analysis);
      }
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
  }, [riskProfile]);

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <Brain className="w-8 h-8 text-purple-500 animate-pulse" />
          <h2 className="text-2xl font-bold text-white">CYPHER AI Neural Network</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-purple-400">
            <Cpu className="w-5 h-5 animate-spin" />
            <span>Analisando seu portfolio com IA avançada...</span>
          </div>
          <Progress value={33} className="w-full" />
          <div className="text-center text-sm text-gray-400">
            Processando {portfolioData.transactions?.length || 0} transações • 
            Calculando oportunidades • 
            Gerando recomendações personalizadas
          </div>
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-8 text-center">
        <Bot className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-4">CYPHER AI Portfolio Analyzer</h3>
        <p className="text-gray-400 mb-6">
          Configure seu perfil de risco para receber análises personalizadas e oportunidades de investimento
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(['safe', 'moderate', 'degen', 'degen_lfg'] as const).map((level) => (
            <Button
              key={level}
              variant={riskProfile === level ? 'default' : 'outline'}
              onClick={() => setRiskProfile(level)}
              className={`${riskProfile === level ? riskLevelColors[level] : 'border-gray-600'} flex flex-col gap-1 h-auto py-3`}
            >
              {React.createElement(riskLevelIcons[level], { className: 'w-5 h-5' })}
              <span className="text-xs capitalize">{level.replace('_', ' ')}</span>
            </Button>
          ))}
        </div>
        <Button onClick={fetchAIAnalysis} className="bg-purple-600 hover:bg-purple-700">
          <Brain className="w-4 h-4 mr-2" />
          Iniciar Análise AI
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <Card className="bg-gradient-to-r from-purple-900 via-gray-900 to-purple-900 border-purple-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">CYPHER AI Neural Analysis</h2>
              <p className="text-purple-300">Portfolio Intelligence • Satoshi Maximization</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={riskProfile} 
              onChange={(e) => setRiskProfile(e.target.value as any)}
              className="bg-gray-800 border border-purple-600 rounded px-3 py-2 text-white text-sm"
            >
              <option value="safe">🛡️ SAFE</option>
              <option value="moderate">⚖️ MODERATE</option>
              <option value="degen">🎯 DEGEN</option>
              <option value="degen_lfg">🚀 DEGEN LFG</option>
            </select>
            <Button onClick={fetchAIAnalysis} variant="outline" className="border-purple-600">
              <Cpu className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Portfolio Health Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-500">HEALTH SCORE</span>
            </div>
            <p className="text-2xl font-bold text-white">{analysis.portfolioHealth.score}/100</p>
            <Progress value={analysis.portfolioHealth.score} className="mt-2" />
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <Growth className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-500">GROWTH POTENTIAL</span>
            </div>
            <p className="text-2xl font-bold text-white">
              +{analysis.neuralPredictions?.portfolioGrowthPotential?.toFixed(0) || '0'}%
            </p>
            <p className="text-xs text-gray-400">Next 90 days</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <Bitcoin className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-500">BTC PREDICTION</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${analysis.neuralPredictions?.btcPrice30d?.toLocaleString() || '110,000'}
            </p>
            <p className="text-xs text-gray-400">30d neural forecast</p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-gray-500">RISK SCORE</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {analysis.neuralPredictions?.riskScore?.toFixed(1) || '5.0'}/10
            </p>
            <p className="text-xs text-gray-400">Portfolio risk level</p>
          </Card>
        </div>
      </Card>

      {/* Main Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview">AI Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Investment Opportunities</TabsTrigger>
          <TabsTrigger value="satoshi-plan">Satoshi Plan</TabsTrigger>
          <TabsTrigger value="neural-insights">Neural Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Portfolio Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Portfolio Strengths
              </h3>
              <div className="space-y-3">
                {(analysis.portfolioHealth?.strengths || []).map((strength: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{strength}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-gray-900 border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Areas for Improvement
              </h3>
              <div className="space-y-3">
                {(analysis.portfolioHealth?.weaknesses || []).map((weakness: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{weakness}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Recommendations
            </h3>
            <div className="grid gap-3">
              {(analysis.portfolioHealth?.recommendations || []).map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid gap-4">
            {(analysis.opportunities || []).map((opportunity: InvestmentOpportunity, index: number) => {
              const RiskIcon = riskLevelIcons[opportunity.riskLevel];
              return (
                <Card key={opportunity.id} className="bg-gray-900 border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-white">{opportunity.name}</h4>
                        <Badge className={`${riskLevelColors[opportunity.riskLevel]} text-white`}>
                          <RiskIcon className="w-3 h-3 mr-1" />
                          {opportunity.riskLevel.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{opportunity.reasoning}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-500">
                        +{opportunity.expectedReturn}%
                      </div>
                      <div className="text-sm text-gray-400">{opportunity.timeframe}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-800/50 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-gray-400">SATOSHI POTENTIAL</span>
                      </div>
                      <div className="text-lg font-bold text-white">{opportunity.satoshiPotential}%</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-400">CONFIDENCE</span>
                      </div>
                      <div className="text-lg font-bold text-white">{opportunity.confidence}%</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-400">TIMEFRAME</span>
                      </div>
                      <div className="text-lg font-bold text-white">{opportunity.timeframe}</div>
                    </div>
                  </div>

                  <div className="bg-gray-800/30 rounded p-4">
                    <h5 className="font-medium text-white mb-2">Strategy:</h5>
                    <p className="text-gray-300 text-sm">{opportunity.strategy}</p>
                    
                    {opportunity.entryPrice && (
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-green-500">Entry: ${opportunity.entryPrice.toLocaleString()}</span>
                        {opportunity.targetPrice && (
                          <span className="text-blue-500">Target: ${opportunity.targetPrice.toLocaleString()}</span>
                        )}
                        {opportunity.stopLoss && (
                          <span className="text-red-500">Stop: ${opportunity.stopLoss.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="satoshi-plan" className="space-y-6">
          <Card className="bg-gradient-to-r from-orange-900 via-gray-900 to-orange-900 border-orange-700 p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Bitcoin className="w-6 h-6 text-orange-500" />
              Satoshi Accumulation Master Plan
            </h3>
            <p className="text-orange-200 text-lg mb-6">{analysis.satoshiAccumulationPlan?.strategy || 'Optimize Bitcoin accumulation through strategic DCA and market timing'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Accumulation Targets</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Weekly Target:</span>
                    <span className="text-orange-500 font-bold">
                      {analysis.satoshiAccumulationPlan?.weeklyTarget?.toLocaleString() || '100,000'} sats
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly Target:</span>
                    <span className="text-orange-500 font-bold">
                      {analysis.satoshiAccumulationPlan?.monthlyTarget?.toLocaleString() || '400,000'} sats
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Yearly Projection:</span>
                    <span className="text-orange-500 font-bold">
                      {((analysis.satoshiAccumulationPlan?.monthlyTarget || 400000) * 12).toLocaleString()} sats
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Accumulation Methods</h4>
                <div className="space-y-2">
                  {(analysis.satoshiAccumulationPlan?.methods || []).map((method: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-300 text-sm">{method}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="neural-insights" className="space-y-6">
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              Neural Network Predictions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Bitcoin Price Forecasts</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                    <span className="text-gray-400">7-Day Prediction:</span>
                    <div className="text-right">
                      <div className="text-white font-bold">
                        ${analysis.neuralPredictions?.btcPrice7d?.toLocaleString() || '110,000'}
                      </div>
                      <div className={`text-sm ${(analysis.neuralPredictions?.btcPrice7d || 110000) > currentBtcPrice ? 'text-green-500' : 'text-red-500'}`}>
                        {(((analysis.neuralPredictions?.btcPrice7d || 110000) / currentBtcPrice - 1) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
                    <span className="text-gray-400">30-Day Prediction:</span>
                    <div className="text-right">
                      <div className="text-white font-bold">
                        ${analysis.neuralPredictions?.btcPrice30d?.toLocaleString() || '120,000'}
                      </div>
                      <div className={`text-sm ${(analysis.neuralPredictions?.btcPrice30d || 120000) > currentBtcPrice ? 'text-green-500' : 'text-red-500'}`}>
                        {(((analysis.neuralPredictions?.btcPrice30d || 120000) / currentBtcPrice - 1) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-white">AI Confidence Metrics</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-800/50 rounded">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Model Accuracy</span>
                      <span className="text-white text-sm">94.7%</span>
                    </div>
                    <Progress value={94.7} className="h-2" />
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Data Quality</span>
                      <span className="text-white text-sm">98.2%</span>
                    </div>
                    <Progress value={98.2} className="h-2" />
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 text-sm">Prediction Confidence</span>
                      <span className="text-white text-sm">87.3%</span>
                    </div>
                    <Progress value={87.3} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}