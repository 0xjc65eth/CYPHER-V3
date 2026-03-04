'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Interfaces
interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: any;
}

interface BaseChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  className?: string;
  animated?: boolean;
  interactive?: boolean;
  theme?: 'light' | 'dark';
}

interface LineChartProps extends BaseChartProps {
  smooth?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  gradient?: boolean;
  strokeWidth?: number;
  color?: string;
}

interface BarChartProps extends BaseChartProps {
  orientation?: 'vertical' | 'horizontal';
  barSpacing?: number;
  showValues?: boolean;
  gradient?: boolean;
  rounded?: boolean;
}

interface PieChartProps extends Omit<BaseChartProps, 'data'> {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  showLabels?: boolean;
  showPercentages?: boolean;
  innerRadius?: number;
  explodeOnHover?: boolean;
}

interface AreaChartProps extends LineChartProps {
  fillOpacity?: number;
  stacked?: boolean;
}

interface ScatterPlotProps extends BaseChartProps {
  pointSize?: number;
  showTrendLine?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface HeatmapProps {
  data: Array<{
    x: string | number;
    y: string | number;
    value: number;
  }>;
  colorScale?: [string, string];
  cellSize?: number;
  className?: string;
  showValues?: boolean;
}

interface MiniChartProps {
  data: number[];
  type: 'line' | 'bar' | 'area';
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  content: React.ReactNode;
}

// Utilities
const createPath = (points: Array<{ x: number; y: number }>, smooth: boolean = false): string => {
  if (points.length === 0) return '';
  
  if (!smooth) {
    return points.reduce((path, point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
    }, '');
  }
  
  // Smooth curve using Catmull-Rom splines
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const next2 = points[i + 2];
    
    if (i === 1) {
      const cp1x = prev.x + (curr.x - prev.x) * 0.3;
      const cp1y = prev.y + (curr.y - prev.y) * 0.3;
      path += ` Q ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
    } else if (i === points.length - 1) {
      const cp1x = prev.x + (curr.x - prev.x) * 0.7;
      const cp1y = prev.y + (curr.y - prev.y) * 0.7;
      path += ` Q ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
    } else {
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y + (curr.y - prev.y) * 0.5;
      const cp2x = curr.x + (next.x - prev.x) * 0.16;
      const cp2y = curr.y + (next.y - prev.y) * 0.16;
      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
    }
  }
  
  return path;
};

const scaleValue = (value: number, min: number, max: number, outputMin: number, outputMax: number): number => {
  return ((value - min) / (max - min)) * (outputMax - outputMin) + outputMin;
};

// Tooltip Component
const ChartTooltip: React.FC<{ tooltip: TooltipData | null }> = ({ tooltip }) => {
  if (!tooltip) return null;
  
  return (
    <div
      className="absolute z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-all duration-200"
      style={{
        left: tooltip.x + 10,
        top: tooltip.y - 10,
        transform: 'translate(0, -100%)'
      }}
    >
      {tooltip.content}
    </div>
  );
};

// Line Chart
export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 400,
  height = 200,
  smooth = false,
  showPoints = true,
  showGrid = true,
  gradient = false,
  strokeWidth = 2,
  color = '#3b82f6',
  animated = true,
  interactive = true,
  theme = 'light',
  className
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimationProgress(1);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimationProgress(1);
    }
  }, [animated]);

  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    const yValues = data.map(d => d.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    return data.map((point, index) => ({
      ...point,
      x: padding + (index / (data.length - 1)) * chartWidth,
      y: padding + scaleValue(point.y, minY, maxY, chartHeight, 0)
    }));
  }, [data, chartWidth, chartHeight, padding]);

  const pathData = createPath(processedData, smooth);
  const gradientId = `gradient-line-chart`;

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find closest data point
    const closest = processedData.reduce((prev, curr) => {
      return Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev;
    });
    
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      content: (
        <div>
          <div className="font-semibold">{closest.label || closest.x}</div>
          <div>Value: {closest.y}</div>
        </div>
      )
    });
  };

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="0.1" />
            </linearGradient>
          </defs>
        )}
        
        {/* Grid */}
        {showGrid && (
          <g className="opacity-20">
            {[...Array(5)].map((_, i) => (
              <g key={i}>
                <line
                  x1={padding}
                  y1={padding + (i * chartHeight) / 4}
                  x2={width - padding}
                  y2={padding + (i * chartHeight) / 4}
                  stroke={theme === 'dark' ? '#fff' : '#000'}
                  strokeWidth="1"
                />
                <line
                  x1={padding + (i * chartWidth) / 4}
                  y1={padding}
                  x2={padding + (i * chartWidth) / 4}
                  y2={height - padding}
                  stroke={theme === 'dark' ? '#fff' : '#000'}
                  strokeWidth="1"
                />
              </g>
            ))}
          </g>
        )}
        
        {/* Area fill (if gradient) */}
        {gradient && (
          <path
            d={`${pathData} L ${processedData[processedData.length - 1]?.x} ${height - padding} L ${padding} ${height - padding} Z`}
            fill={`url(#${gradientId})`}
            opacity={animationProgress}
          />
        )}
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={animated ? `${pathData.length} ${pathData.length}` : undefined}
          strokeDashoffset={animated ? `${pathData.length * (1 - animationProgress)}` : undefined}
          className="transition-all duration-2000 ease-out"
        />
        
        {/* Points */}
        {showPoints && processedData.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            className="transition-all duration-300 hover:r-6 cursor-pointer"
            opacity={animationProgress}
            style={{
              transitionDelay: `${index * 50}ms`
            }}
          />
        ))}
      </svg>
      
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

// Bar Chart
export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 400,
  height = 200,
  orientation = 'vertical',
  barSpacing = 4,
  showValues = false,
  gradient = false,
  rounded = true,
  animated = true,
  interactive = true,
  theme = 'light',
  className
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimationProgress(1);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimationProgress(1);
    }
  }, [animated]);

  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    const yValues = data.map(d => d.y);
    const maxY = Math.max(...yValues);
    const barWidth = (chartWidth - (data.length - 1) * barSpacing) / data.length;
    
    return data.map((point, index) => {
      const barHeight = (point.y / maxY) * chartHeight * animationProgress;
      
      return {
        ...point,
        x: padding + index * (barWidth + barSpacing),
        y: height - padding - barHeight,
        width: barWidth,
        height: barHeight,
        color: point.color || '#3b82f6'
      };
    });
  }, [data, chartWidth, chartHeight, padding, barSpacing, animationProgress]);

  const handleBarHover = (event: React.MouseEvent, point: any) => {
    if (!interactive) return;
    
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      content: (
        <div>
          <div className="font-semibold">{point.label || point.x}</div>
          <div>Value: {point.y}</div>
        </div>
      )
    });
  };

  return (
    <div className={cn('relative', className)}>
      <svg ref={svgRef} width={width} height={height} className="overflow-visible">
        {processedData.map((bar, index) => (
          <g key={index}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              rx={rounded ? 4 : 0}
              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
              onMouseEnter={(e) => handleBarHover(e, bar)}
              onMouseLeave={() => setTooltip(null)}
              style={{
                transitionDelay: `${index * 100}ms`
              }}
            />
            
            {showValues && (
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 8}
                textAnchor="middle"
                className="text-xs fill-current"
                fill={theme === 'dark' ? '#fff' : '#000'}
              >
                {bar.y}
              </text>
            )}
          </g>
        ))}
      </svg>
      
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

// Pie Chart
export const PieChart: React.FC<PieChartProps> = ({
  data,
  width = 300,
  height = 300,
  showLabels = true,
  showPercentages = true,
  innerRadius = 0,
  explodeOnHover = true,
  animated = true,
  interactive = true,
  className
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimationProgress(1);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimationProgress(1);
    }
  }, [animated]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const processedData = useMemo(() => {
    let currentAngle = 0;
    
    return data.map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * 2 * Math.PI * animationProgress;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const explodeOffset = hoveredIndex === index && explodeOnHover ? 10 : 0;
      
      const x1 = centerX + (radius + explodeOffset) * Math.cos(startAngle - Math.PI / 2);
      const y1 = centerY + (radius + explodeOffset) * Math.sin(startAngle - Math.PI / 2);
      const x2 = centerX + (radius + explodeOffset) * Math.cos(endAngle - Math.PI / 2);
      const y2 = centerY + (radius + explodeOffset) * Math.sin(endAngle - Math.PI / 2);
      
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      
      let pathData = `M ${centerX + explodeOffset * Math.cos((startAngle + endAngle) / 2 - Math.PI / 2)} ${centerY + explodeOffset * Math.sin((startAngle + endAngle) / 2 - Math.PI / 2)}`;
      pathData += ` L ${x1} ${y1}`;
      pathData += ` A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
      pathData += ` Z`;
      
      if (innerRadius > 0) {
        const innerX1 = centerX + innerRadius * Math.cos(startAngle - Math.PI / 2);
        const innerY1 = centerY + innerRadius * Math.sin(startAngle - Math.PI / 2);
        const innerX2 = centerX + innerRadius * Math.cos(endAngle - Math.PI / 2);
        const innerY2 = centerY + innerRadius * Math.sin(endAngle - Math.PI / 2);
        
        pathData = `M ${centerX} ${centerY}`;
        pathData += ` L ${x1} ${y1}`;
        pathData += ` A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
        pathData += ` L ${innerX2} ${innerY2}`;
        pathData += ` A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`;
        pathData += ` Z`;
      }
      
      currentAngle = endAngle;
      
      return {
        ...item,
        pathData,
        percentage,
        startAngle,
        endAngle,
        color: item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`
      };
    });
  }, [data, total, centerX, centerY, radius, innerRadius, animationProgress, hoveredIndex, explodeOnHover]);

  const handleSliceHover = (event: React.MouseEvent, item: any, index: number) => {
    if (!interactive) return;
    
    setHoveredIndex(index);
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      content: (
        <div>
          <div className="font-semibold">{item.label}</div>
          <div>Value: {item.value}</div>
          <div>Percentage: {(item.percentage * 100).toFixed(1)}%</div>
        </div>
      )
    });
  };

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height} className="overflow-visible">
        {processedData.map((slice, index) => (
          <path
            key={index}
            d={slice.pathData}
            fill={slice.color}
            className="transition-all duration-300 cursor-pointer hover:opacity-80"
            onMouseEnter={(e) => handleSliceHover(e, slice, index)}
            onMouseLeave={() => {
              setHoveredIndex(null);
              setTooltip(null);
            }}
          />
        ))}
        
        {showLabels && processedData.map((slice, index) => {
          const angle = (slice.startAngle + slice.endAngle) / 2;
          const labelRadius = radius * 0.7;
          const x = centerX + labelRadius * Math.cos(angle - Math.PI / 2);
          const y = centerY + labelRadius * Math.sin(angle - Math.PI / 2);
          
          return (
            <text
              key={index}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-white"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {showPercentages ? `${(slice.percentage * 100).toFixed(0)}%` : slice.label}
            </text>
          );
        })}
      </svg>
      
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

// Mini Chart (Sparkline)
export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  type,
  color = '#3b82f6',
  width = 100,
  height = 30,
  className
}) => {
  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    return data.map((value, index) => ({
      x: (index / (data.length - 1)) * width,
      y: scaleValue(value, min, max, height, 0),
      value
    }));
  }, [data, width, height]);

  const renderChart = () => {
    switch (type) {
      case 'line':
        const pathData = createPath(processedData);
        return (
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      
      case 'area':
        const areaPath = `${createPath(processedData)} L ${width} ${height} L 0 ${height} Z`;
        return (
          <path
            d={areaPath}
            fill={color}
            fillOpacity="0.3"
            stroke={color}
            strokeWidth="1"
          />
        );
      
      case 'bar':
        const barWidth = width / data.length;
        return processedData.map((point, index) => (
          <rect
            key={index}
            x={index * barWidth}
            y={point.y}
            width={barWidth * 0.8}
            height={height - point.y}
            fill={color}
          />
        ));
      
      default:
        return null;
    }
  };

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)}>
      {renderChart()}
    </svg>
  );
};

// Heatmap
export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  colorScale = ['#f3f4f6', '#1f2937'],
  cellSize = 20,
  showValues = false,
  className
}) => {
  const uniqueX = Array.from(new Set(data.map(d => d.x)));
  const uniqueY = Array.from(new Set(data.map(d => d.y)));
  
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getColor = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    // Simple linear interpolation between two colors
    return `rgb(${Math.round(243 - ratio * (243 - 31))}, ${Math.round(244 - ratio * (244 - 41))}, ${Math.round(246 - ratio * (246 - 55))})`;
  };

  return (
    <svg
      width={uniqueX.length * cellSize}
      height={uniqueY.length * cellSize}
      className={cn('overflow-visible', className)}
    >
      {data.map((cell, index) => {
        const xIndex = uniqueX.indexOf(cell.x);
        const yIndex = uniqueY.indexOf(cell.y);
        
        return (
          <g key={index}>
            <rect
              x={xIndex * cellSize}
              y={yIndex * cellSize}
              width={cellSize}
              height={cellSize}
              fill={getColor(cell.value)}
              stroke="#fff"
              strokeWidth="1"
              className="transition-all duration-200 hover:opacity-80"
            />
            {showValues && (
              <text
                x={xIndex * cellSize + cellSize / 2}
                y={yIndex * cellSize + cellSize / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-current"
                fill="#fff"
              >
                {cell.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// Export all components
export {
  type BaseChartProps,
  type LineChartProps,
  type BarChartProps,
  type PieChartProps,
  type AreaChartProps,
  type ScatterPlotProps,
  type HeatmapProps,
  type MiniChartProps
};

export default {
  LineChart,
  BarChart,
  PieChart,
  MiniChart,
  Heatmap
};