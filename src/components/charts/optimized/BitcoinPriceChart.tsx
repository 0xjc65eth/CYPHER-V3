'use client';

import React from 'react';

export interface BitcoinPriceChartProps {
  data?: any[];
  width?: number;
  height?: number;
  timeframe?: string;
}

export const BitcoinPriceChart: React.FC<BitcoinPriceChartProps> = () => {
  return <div className="bitcoin-price-chart-placeholder" />;
};

export default BitcoinPriceChart;
