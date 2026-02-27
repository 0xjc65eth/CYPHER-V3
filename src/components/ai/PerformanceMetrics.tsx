/**
 * 📈 Performance Metrics Chart
 * Visual representation of AI trading performance
 */

'use client';

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Target } from 'lucide-react';

interface PerformanceData {
  date: string;
  profit: number;
  trades: number;
  winRate: number;
}

interface PerformanceMetricsProps {
  data: PerformanceData[];
  totalProfit: number;
  avgWinRate: number;
  bestDay: number;
}

export function PerformanceMetrics({ 
  data, 
  totalProfit, 
  avgWinRate, 
  bestDay 
}: PerformanceMetricsProps) {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Analytics</h3>
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No performance data yet -- connect trading agent to track</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Performance Analytics</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Total Profit</span>
          </div>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}%
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{avgWinRate.toFixed(1)}%</p>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Best Day</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">+{bestDay.toFixed(2)}%</p>
        </div>
      </div>

      {/* Profit Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Line type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1}  />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trade Volume Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
            <YAxis stroke="#9ca3af" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="trades" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
