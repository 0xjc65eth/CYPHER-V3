'use client';

import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { AIInsightsPanel, NeuralPricePredictor, SentimentAnalysisPanel } from '@/components/ai';
import { Brain, Cpu, Activity, Zap } from 'lucide-react';
import { devLogger } from '@/lib/logger';
import { useEffect } from 'react';

export default function NeuralPage() {
  useEffect(() => {
    devLogger.log('PAGE', 'Neural Learning page loaded');
    devLogger.progress('Neural Page', 100);
    devLogger.milestone('AI Implementation', 'TensorFlow.js models integrados com sucesso');
  }, []);

  return (
    <TopNavLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Brain className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">Neural Learning Center</h1>
            <p className="text-gray-400">AI-powered Bitcoin analysis with TensorFlow.js</p>
          </div>
        </div>

        {/* AI System Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-500">Models</span>
            </div>
            <div className="text-2xl font-bold text-white">3</div>
            <div className="text-xs text-gray-400">Prediction + Sentiment + Risk</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-500">Engine</span>
            </div>
            <div className="text-2xl font-bold text-white">LSTM</div>
            <div className="text-xs text-gray-400">TensorFlow.js</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-500">Status</span>
            </div>
            <div className="text-2xl font-bold text-white">Live</div>
            <div className="text-xs text-gray-400">Continuous Analysis</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-xs text-gray-500">Runtime</span>
            </div>
            <div className="text-2xl font-bold text-white">Browser</div>
            <div className="text-xs text-gray-400">Client-side Inference</div>
          </div>
        </div>

        {/* CYPHER AI Insights */}
        <AIInsightsPanel />

        {/* Grid com Price Prediction e Sentiment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NeuralPricePredictor />
          <SentimentAnalysisPanel />
        </div>

        {/* Informações sobre o sistema */}
        <div className="bg-gray-900 rounded-lg p-6 border border-orange-500/20">
          <h3 className="text-lg font-semibold text-orange-500 mb-4">Neural Network Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">CYPHER AI Core</h4>
              <p className="text-xs text-gray-400">
                Multi-layer perceptron with 3 hidden layers, using ReLU activation
                and dropout for regularization. Trained on historical Bitcoin data.
              </p>
            </div>
            <div className="bg-black/40 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Price Prediction LSTM</h4>
              <p className="text-xs text-gray-400">
                Long Short-Term Memory network with 2 LSTM layers for time series
                prediction. Uses 60 historical points to predict next 24 hours.
              </p>
            </div>
            <div className="bg-black/40 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Sentiment Analysis</h4>
              <p className="text-xs text-gray-400">
                Embedding layer followed by LSTM for context understanding.
                Trained on crypto-specific vocabulary for accurate sentiment detection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
}