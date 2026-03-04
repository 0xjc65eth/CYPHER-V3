import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Card } from '@/components/ui/card';

interface AdvancedChartsProps {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  indicators: string[];
}

export const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ 
  symbol, 
  interval, 
  indicators 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize TradingView Lightweight Charts
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#9B7DFF',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: '#9B7DFF',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candleSeriesRef.current = candleSeries;

    // Add volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add technical indicators based on props
    if (indicators.includes('MA')) {
      const maSeries = chart.addSeries(LineSeries, {
        color: '#2962FF',
        lineWidth: 2,
        title: 'MA 20',
      });
    }

    if (indicators.includes('RSI')) {
      // RSI would be on a separate pane
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#9B7DFF',
        lineWidth: 2,
        title: 'RSI',
        priceScaleId: 'rsi',
      });

      chart.priceScale('rsi').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // WebSocket connection for real-time data
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const candle = {
        time: Math.floor(data.k.t / 1000) as any,
        open: parseFloat(data.k.o),
        high: parseFloat(data.k.h),
        low: parseFloat(data.k.l),
        close: parseFloat(data.k.c),
      };
      
      candleSeries.update(candle);
      
      // Update volume
      volumeSeries.update({
        time: candle.time,
        value: parseFloat(data.k.v),
        color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
      });
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      chart.remove();
    };
  }, [symbol, interval, indicators]);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Advanced Chart - {symbol}</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-600 rounded text-sm">Drawing Tools</button>
          <button className="px-3 py-1 bg-green-600 rounded text-sm">Indicators</button>
          <button className="px-3 py-1 bg-purple-600 rounded text-sm">Templates</button>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </Card>
  );
};