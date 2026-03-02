'use client';

import React from 'react';

export interface VolumeChartProps {
  data?: any[];
  width?: number;
  height?: number;
}

export const VolumeChart: React.FC<VolumeChartProps> = () => {
  return <div className="volume-chart-placeholder" />;
};

export default VolumeChart;
