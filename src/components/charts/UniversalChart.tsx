'use client';

import React, { useState, useEffect } from 'react';
import { DynamicChart } from './DynamicChart';
import { SimpleChart } from './SimpleChart';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { chartDebugger } from '@/lib/debug/chartDebugger';

interface UniversalChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  defaultMode?: 'dynamic' | 'simple';
  autoFallback?: boolean;
}

export const UniversalChart: React.FC<UniversalChartProps> = ({ 
  symbol, 
  interval = '1h',
  height = 400,
  defaultMode = 'dynamic',
  autoFallback = true
}) => {
  const [mode, setMode] = useState<'dynamic' | 'simple'>(defaultMode);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset error state when props change
  useEffect(() => {
    setError(false);
    setRetryCount(0);
  }, [symbol, interval]);

  const handleChartError = () => {
    chartDebugger.logError('UniversalChart', `Chart error for ${symbol}`, { mode, retryCount });
    
    if (retryCount < 2) {
      // Try again with the same mode
      setRetryCount(prev => prev + 1);
      setError(false);
    } else if (autoFallback && mode === 'dynamic') {
      // Fallback to simple chart
      chartDebugger.logError('UniversalChart', `Fallback to SimpleChart for ${symbol}`);
      setMode('simple');
      setError(false);
      setRetryCount(0);
    } else {
      // Show error state
      setError(true);
    }
  };

  const retry = () => {
    setError(false);
    setRetryCount(0);
    setMode(defaultMode);
  };

  if (error) {
    return (
      <Card className="p-6 bg-gray-900">
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Chart Loading Error</h3>
          <p className="text-gray-400 mb-4">
            Unable to load chart for {symbol}
          </p>
          <button
            onClick={retry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </Card>
    );
  }

  // Render chart based on mode
  return (
    <div className="relative">
      {/* Mode indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-xs px-2 py-1 rounded ${
            mode === 'dynamic' 
              ? 'bg-blue-600/20 text-blue-400' 
              : 'bg-green-600/20 text-green-400'
          }`}>
            {mode === 'dynamic' ? '⚡ Lightweight' : '📊 Recharts'}
          </span>
        </div>
      )}
      
      {mode === 'dynamic' ? (
        <div onError={handleChartError}>
          <DynamicChart 
            symbol={symbol} 
            interval={interval} 
            height={height}
          />
        </div>
      ) : (
        <SimpleChart
          type="line"
          data={[]}
          config={{ title: symbol, height: height || 300 }}
        />
      )}
    </div>
  );
};

// Export a memoized version for better performance
export default React.memo(UniversalChart);