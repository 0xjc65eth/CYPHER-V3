'use client';

// Volume Chart para analise de trading
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BaseChart } from '../base/BaseChart';

interface VolumeChartProps {
  data?: any[];
  height?: number;
}

export function VolumeChart({ data, height = 300 }: VolumeChartProps) {
  // Generate deterministic volume data
  const volumeData = data || Array.from({ length: 24 }, (_, i) => {
    const t = i / 24;
    const totalVol = Math.floor(1000000 + Math.sin(t * Math.PI * 6) * 300000 + Math.cos(t * Math.PI * 3) * 200000);
    const buyRatio = 0.55 + Math.sin(t * Math.PI * 4 + i * 0.3) * 0.15;
    return {
      time: `${i}:00`,
      volume: totalVol,
      buyVolume: Math.floor(totalVol * buyRatio),
      sellVolume: Math.floor(totalVol * (1 - buyRatio)),
    };
  });

  return (
    <BaseChart title="Volume de Negociacao" height={height} data={volumeData}>
      <BarChart data={volumeData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="time" stroke="#888" />
        <YAxis stroke="#888" />
        <Tooltip
          contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
          labelStyle={{ color: '#888' }}
        />
        <Bar dataKey="buyVolume" stackId="a" fill="#10b981" />
        <Bar dataKey="sellVolume" stackId="a" fill="#ef4444" />
      </BarChart>
    </BaseChart>
  );
}
