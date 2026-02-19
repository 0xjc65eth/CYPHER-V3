/**
 * 🪝 useBitcoinPrice Hook
 * Real-time Bitcoin price with WebSocket
 */

'use client';

import { useState, useEffect } from 'react';
import { getBitcoinWebSocket, BitcoinPrice } from '@/lib/websocket/bitcoin-websocket';

export function useBitcoinPrice() {
  const [price, setPrice] = useState<BitcoinPrice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Fallback API fetch function
  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/bitcoin-price/');
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      const bitcoinPrice: BitcoinPrice = {
        symbol: data.symbol,
        price: data.price,
        change24h: data.change24h,
        change24hPercent: data.change24h,
        volume24h: data.volume24h,
        high24h: data.high24h,
        low24h: data.low24h,
        timestamp: new Date(data.timestamp),
        source: data.source
      };
      
      setPrice(bitcoinPrice);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Bitcoin price from API:', err);
      setError('Failed to fetch price data');
    }
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // Try WebSocket first
    const ws = getBitcoinWebSocket();

    // Event handlers
    const handlePrice = (newPrice: BitcoinPrice) => {
      setPrice(newPrice);
      setError(null);
    };

    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (err: any) => {
      setError('Conexão com WebSocket falhou');
      console.error('WebSocket error:', err);
    };

    // Subscribe to events
    ws.on('price', handlePrice);
    ws.on('connected', handleConnected);
    ws.on('disconnected', handleDisconnected);
    ws.on('error', handleError);

    // Connect
    ws.connect();

    // Get last price if available
    const lastPrice = ws.getLastPrice();
    if (lastPrice) {
      setPrice(lastPrice);
    } else {
      // If no WebSocket price available, fetch from API immediately
      fetchBitcoinPrice();
    }

    // Set up API fallback interval (refresh every 30 seconds)
    const apiInterval = setInterval(fetchBitcoinPrice, 30000);

    // Cleanup
    return () => {
      ws.off('price', handlePrice);
      ws.off('connected', handleConnected);
      ws.off('disconnected', handleDisconnected);
      ws.off('error', handleError);
      clearInterval(apiInterval);
    };
  }, [isHydrated]);

  return {
    price: isHydrated ? (price?.price || 0) : 0,
    change24h: isHydrated ? (price?.change24hPercent || 0) : 0,
    volume24h: isHydrated ? (price?.volume24h || 0) : 0,
    rawPrice: price,
    isConnected,
    error,
    isLoading: !isHydrated || (!price && !error)
  };
}