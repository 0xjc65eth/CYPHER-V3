'use client';

import React, { useRef, useEffect, memo } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PairCandlestickChartProps {
  data: CandleData[];
  height: number;
  chartType: 'candlestick' | 'line' | 'area';
  onCandleClick?: (candle: any) => void;
}

function PairCandlestickChart({ data, height, chartType, onCandleClick }: PairCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9CA3AF' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: { borderColor: '#374151', timeVisible: true },
    });

    chartRef.current = chart;

    const formattedData = data
      .map((c) => ({
        time: Math.floor(c.timestamp / 1000) as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .sort((a: any, b: any) => (a.time as number) - (b.time as number));

    let series: any;

    if (chartType === 'candlestick') {
      series = chart.addCandlestickSeries({
        upColor: '#10B981', downColor: '#EF4444',
        borderUpColor: '#10B981', borderDownColor: '#EF4444',
        wickUpColor: '#10B981', wickDownColor: '#EF4444',
      });
      series.setData(formattedData);
    } else if (chartType === 'line') {
      series = chart.addLineSeries({ color: '#F59E0B', lineWidth: 2 });
      series.setData(formattedData.map((d: any) => ({ time: d.time, value: d.close })));
    } else {
      series = chart.addAreaSeries({
        topColor: 'rgba(245, 158, 11, 0.4)', bottomColor: 'rgba(245, 158, 11, 0.0)',
        lineColor: '#F59E0B', lineWidth: 2,
      });
      series.setData(formattedData.map((d: any) => ({ time: d.time, value: d.close })));
    }

    // Volume histogram
    const volumeSeries = chart.addHistogramSeries({
      color: '#F59E0B',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(
      data
        .map((c) => ({
          time: Math.floor(c.timestamp / 1000) as any,
          value: c.volume || 0,
          color: c.close >= c.open ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        }))
        .sort((a: any, b: any) => (a.time as number) - (b.time as number))
    );

    chart.timeScale().fitContent();

    if (onCandleClick) {
      chart.subscribeCrosshairMove((param) => {
        if (param.time && param.seriesData?.size > 0) {
          const candleData = param.seriesData.get(series);
          if (candleData) {
            onCandleClick({ ...candleData, timestamp: (param.time as number) * 1000 });
          }
        }
      });
    }

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height, chartType, onCandleClick]);

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center bg-gray-900/50 rounded-lg border border-orange-500/20" style={{ height }}>
        <div className="text-center text-gray-400">
          <p className="text-sm">No chart data available</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} />;
}

export default memo(PairCandlestickChart);
