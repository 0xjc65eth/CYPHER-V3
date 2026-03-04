'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with no SSR to prevent hydration issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RechartsComponents: any = dynamic(
  (() => import('recharts').then((mod) => ({
    default: (props: any) => props.children({
      LineChart: mod.LineChart,
      AreaChart: mod.AreaChart,
      BarChart: mod.BarChart,
      XAxis: mod.XAxis,
      YAxis: mod.YAxis,
      CartesianGrid: mod.CartesianGrid,
      Tooltip: mod.Tooltip,
      Legend: mod.Legend,
      ResponsiveContainer: mod.ResponsiveContainer,
      Line: mod.Line,
      Area: mod.Area,
      Bar: mod.Bar,
    })
  }))) as any,
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-gray-800/50 rounded-lg flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-gray-400">Loading chart...</span>
        </div>
      </div>
    )
  }
);

interface ClientOnlyChartProps {
  type?: 'line' | 'area' | 'bar';
  data?: any[];
  width?: string | number;
  height?: number;
  dataKey?: string;
  xAxisKey?: string;
  title?: string;
  color?: string;
  className?: string;
}

export function ClientOnlyChart({
  type = 'line',
  data = [],
  width = '100%',
  height = 400,
  dataKey = 'value',
  xAxisKey = 'time',
  title,
  color = '#3b82f6',
  className = ''
}: ClientOnlyChartProps) {
  const [mounted, setMounted] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    
    // Generate default data if none provided
    if (data.length === 0) {
      const defaultData = Array.from({ length: 24 }, (_, i) => ({
        [xAxisKey]: `${i}:00`,
        [dataKey]: Math.random() * 100 + 50,
        price: 65000 + Math.random() * 5000,
        volume: Math.random() * 1000000,
      }));
      setChartData(defaultData);
    } else {
      setChartData(data);
    }
  }, [data, dataKey, xAxisKey]);

  if (!mounted) {
    return (
      <div className={`w-full bg-gray-800/50 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-gray-400">Initializing chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-gray-800 rounded-lg p-4 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      )}
      
      <RechartsComponents>
        {({ ResponsiveContainer, LineChart, AreaChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Line, Area, Bar }: any) => (
          <ResponsiveContainer width={width} height={height}>
            {type === 'line' && (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={xAxisKey} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F3F4F6'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke={color} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
            
            {type === 'area' && (
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={xAxisKey} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke={color} 
                  fillOpacity={1} 
                  fill="url(#colorGradient)" 
                />
              </AreaChart>
            )}
            
            {type === 'bar' && (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={xAxisKey} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar dataKey={dataKey} fill={color} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </RechartsComponents>
    </div>
  );
}