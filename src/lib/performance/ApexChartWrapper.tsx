/**
 * ApexChart Wrapper - Deprecated
 * ApexCharts has been removed from the project.
 * Use recharts for dashboard charts or lightweight-charts for trading charts.
 */

import React from 'react';

interface ApexChartProps {
  data: any[];
  type?: 'line' | 'area' | 'bar' | 'candlestick';
  width?: number | string;
  height?: number | string;
  options?: any;
  onChartReady?: (chart: any) => void;
}

const ApexChartWrapper: React.FC<ApexChartProps> = ({
  height = 300,
}) => {
  return (
    <div
      className="bg-gray-900 border border-orange-500/20 rounded flex items-center justify-center"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="text-gray-500 text-sm">
        Chart library migrated - use recharts or lightweight-charts
      </div>
    </div>
  );
};

export default ApexChartWrapper;
