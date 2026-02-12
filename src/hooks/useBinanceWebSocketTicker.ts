'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import binanceWebSocket from '@/lib/websocket/binance-websocket';

export interface TickerItem {
  symbol: string;
  price: number;
  change24h: number;
}

const DEFAULT_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'ordiusdt', 'runeusdt'];

export function useBinanceWebSocketTicker(symbols: string[] = DEFAULT_SYMBOLS) {
  const [tickers, setTickers] = useState<Map<string, TickerItem>>(new Map());
  const subIdRef = useRef<string | null>(null);
  const symbolsKey = symbols.join(',');

  const handleData = useCallback((data: any) => {
    if (data.symbol && data.price !== undefined) {
      setTickers(prev => {
        const next = new Map(prev);
        next.set(data.symbol, {
          symbol: data.symbol,
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price),
          change24h: typeof data.change24h === 'number' ? data.change24h : parseFloat(data.change24h || '0'),
        });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    binanceWebSocket.initialize().then(() => {
      const subId = binanceWebSocket.subscribe({
        symbols,
        streamTypes: ['ticker'],
        callback: handleData,
      });
      subIdRef.current = subId;
    });

    return () => {
      if (subIdRef.current) {
        binanceWebSocket.unsubscribe(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [symbolsKey, handleData]);

  return tickers;
}
