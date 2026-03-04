'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Dynamic import with SSR disabled
const LightweightChart = dynamic(
  () => import('./LightweightChart').then((mod) => mod.LightweightChart),
  { 
    ssr: false,
    loading: () => (
      <Card className="p-6 bg-gray-900/50">
        <div className="flex items-center justify-center h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
          <span>Loading chart component...</span>
        </div>
      </Card>
    )
  }
);

interface DynamicChartProps {
  symbol: string;
  interval: string;
  height?: number;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ symbol, interval, height }) => {
  return (
    <LightweightChart
      type="line"
      data={[]}
      config={{
        title: symbol,
        height: height || 300,
        theme: 'dark',
      }}
    />
  );
};