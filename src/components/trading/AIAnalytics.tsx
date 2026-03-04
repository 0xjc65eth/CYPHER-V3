/**
 * 🧠 AI ANALYTICS - CYPHER AI v3.0
 * Dashboard de análise da IA e machine learning
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  Eye, 
  Database,
  RefreshCw,
  Download,
  Upload,
  Activity
} from 'lucide-react';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  loss: number;
  trainingTime: number;
  totalTrades: number;
  successfulPredictions: number;
}

interface TrainingData {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
}

interface PredictionConfidence {
  action: string;
  confidence: number;
  market: string;
  timestamp: number;
}

export function AIAnalytics() {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics>({
    accuracy: 87.3,
    precision: 89.1,
    recall: 85.6,
    f1Score: 87.3,
    loss: 0.123,
    trainingTime: 45.2,
    totalTrades: 1247,
    successfulPredictions: 1089
  });

  const [trainingHistory, setTrainingHistory] = useState<TrainingData[]>([]);
  const [predictions, setPredictions] = useState<PredictionConfidence[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedModel, setSelectedModel] = useState('primary');

  useEffect(() => {
    // Initialize with empty data - real training data should come from ML pipeline
    setTrainingHistory([]);
    setPredictions([]);

    // In production, load real training history and predictions from API
    // Example: loadTrainingHistory() / loadPredictions()
  }, []);

  const strategyDistribution = [
    { name: 'RSI + Bollinger', value: 35, color: '#3B82F6' },
    { name: 'MACD + EMA', value: 28, color: '#8B5CF6' },
    { name: 'Volume Profile', value: 20, color: '#10B981' },
    { name: 'Mean Reversion', value: 12, color: '#F59E0B' },
    { name: 'Momentum', value: 5, color: '#EF4444' }
  ];

  const confidenceLevels = [
    { range: '90-100%', count: 156, color: '#10B981' },
    { range: '80-89%', count: 234, color: '#3B82F6' },
    { range: '70-79%', count: 189, color: '#8B5CF6' },
    { range: '60-69%', count: 98, color: '#F59E0B' },
    { range: '<60%', count: 23, color: '#EF4444' }
  ];

  const startTraining = async () => {
    setIsTraining(true);
    // In production, trigger real model training
    // Example: await trainModel()
    setTimeout(() => {
      setIsTraining(false);
      // Metrics should be updated from real training results, not Math.random()
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Brain className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">AI Analytics Dashboard</h2>
              <p className="text-gray-400">Machine Learning Performance & Insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-green-500 border-green-500">
              Model v3.2.1
            </Badge>
            <Button 
              onClick={startTraining}
              disabled={isTraining}
              className="flex items-center space-x-2"
            >
              {isTraining ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isTraining ? 'Training...' : 'Retrain'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Model Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-500">
              {modelMetrics.accuracy.toFixed(1)}%
            </span>
          </div>
          <div className="text-sm text-gray-400 mb-2">Accuracy</div>
          <Progress value={modelMetrics.accuracy} className="h-2" />
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-blue-500">
              {modelMetrics.precision.toFixed(1)}%
            </span>
          </div>
          <div className="text-sm text-gray-400 mb-2">Precision</div>
          <Progress value={modelMetrics.precision} className="h-2" />
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold text-purple-500">
              {modelMetrics.recall.toFixed(1)}%
            </span>
          </div>
          <div className="text-sm text-gray-400 mb-2">Recall</div>
          <Progress value={modelMetrics.recall} className="h-2" />
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-500">
              {modelMetrics.f1Score.toFixed(1)}%
            </span>
          </div>
          <div className="text-sm text-gray-400 mb-2">F1-Score</div>
          <Progress value={modelMetrics.f1Score} className="h-2" />
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="training" className="space-y-4">
        <TabsList className="grid grid-cols-4 bg-gray-800">
          <TabsTrigger value="training">Training History</TabsTrigger>
          <TabsTrigger value="predictions">Live Predictions</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Analysis</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Levels</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Training Progress</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingHistory.slice(-50)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="epoch" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#10B981"
                    name="Training Accuracy"
                  />
                  <Line
                    type="monotone"
                    dataKey="valAccuracy"
                    stroke="#3B82F6"
                    name="Validation Accuracy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-900 border-gray-800 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  {modelMetrics.totalTrades.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Total Trades Analyzed</div>
              </div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 mb-2">
                  {modelMetrics.successfulPredictions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Successful Predictions</div>
              </div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500 mb-2">
                  {modelMetrics.trainingTime.toFixed(1)}h
                </div>
                <div className="text-sm text-gray-400">Total Training Time</div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Predictions</h3>
            <div className="space-y-3">
              {predictions.slice(0, 10).map((pred, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={pred.action === 'buy' ? 'default' : pred.action === 'sell' ? 'destructive' : 'secondary'}
                    >
                      {pred.action.toUpperCase()}
                    </Badge>
                    <span className="text-white font-medium">{pred.market}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-white font-medium">{pred.confidence.toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">
                        {new Date(pred.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <Progress value={pred.confidence} className="w-20 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Strategy Usage Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {strategyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    formatter={(value) => [`${value}%`, 'Usage']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {strategyDistribution.map((strategy, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: strategy.color }}
                  />
                  <span className="text-gray-300">{strategy.name}</span>
                  <span className="text-white font-medium">{strategy.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="confidence" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Prediction Confidence Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceLevels}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {confidenceLevels.map((level, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 p-4">
                <div className="text-center">
                  <div 
                    className="text-2xl font-bold mb-2"
                    style={{ color: level.color }}
                  >
                    {level.count}
                  </div>
                  <div className="text-sm text-gray-400">{level.range}</div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Model Controls */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Model Management</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Model</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Import Model</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Backup Data</span>
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            Last backup: {new Date().toLocaleDateString()}
          </div>
        </div>
      </Card>
    </div>
  );
}