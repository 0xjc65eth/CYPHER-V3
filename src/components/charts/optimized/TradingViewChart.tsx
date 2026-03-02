'use client';

import React from 'react';

export interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  width?: number;
  height?: number;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = () => {
  return <div className="tradingview-chart-placeholder" />;
};

export default TradingViewChart;
