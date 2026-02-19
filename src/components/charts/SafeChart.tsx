'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { SimpleChart } from './SimpleChart';

// Dynamic import do WorkingChart
const WorkingChart = dynamic(
  () => import('./WorkingChart').then(mod => mod.WorkingChart),
  { 
    ssr: false,
    loading: () => <SimpleChart symbol="" interval="1h" />
  }
);

interface SafeChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  forceSimple?: boolean;
}

export const SafeChart: React.FC<SafeChartProps> = ({ 
  symbol, 
  interval = '1h',
  height = 400,
  forceSimple = false
}) => {
  const [useSimple, setUseSimple] = React.useState(forceSimple);

  // Error boundary logic
  React.useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message.includes('chart') || e.message.includes('Chart')) {
        setUseSimple(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (useSimple) {
    return <SimpleChart symbol={symbol} interval={interval} />;
  }

  return (
    <div 
      onError={() => {
        setUseSimple(true);
      }}
    >
      <WorkingChart symbol={symbol} interval={interval} height={height} />
    </div>
  );
};