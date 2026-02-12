/**
 * 📊 Enhanced Bitcoin Price Display
 * Real-time price with WebSocket updates
 */

'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

export function BitcoinPriceDisplay() {
  const [bitcoinData, setBitcoinData] = useState<{price: number, change24h: number} | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Fetch real Bitcoin data from CoinMarketCap API
  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/coinmarketcap?symbols=BTC');
      const data = await response.json();
      
      if (data.success && data.data.current.BTC) {
        const btcData = data.data.current.BTC;
        setBitcoinData({
          price: btcData.price,
          change24h: btcData.change24h
        });
        setError(null);
        console.log('✅ Bitcoin price from CMC:', btcData.price);
      } else {
        throw new Error('Failed to fetch Bitcoin price from CMC');
      }
    } catch (err) {
      console.error('❌ Error fetching Bitcoin price:', err);
      setError('Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchBitcoinPrice();
    // Update every 30 seconds
    const interval = setInterval(fetchBitcoinPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine which data source to use
  const currentPrice = bitcoinData?.price || 0;
  const change24h = bitcoinData?.change24h || 0;

  // Price change animation
  useEffect(() => {
    if (currentPrice && previousPrice && currentPrice !== previousPrice) {
      setPriceFlash(currentPrice > previousPrice ? 'up' : 'down');
      setTimeout(() => setPriceFlash(null), 500);
    }
    if (currentPrice && currentPrice !== previousPrice) {
      setPreviousPrice(currentPrice);
    }
  }, [currentPrice, previousPrice]);

  // Prevent hydration errors by not rendering until mounted
  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-400">BTC:</span>
        <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  const isPositive = change24h >= 0;
  const priceFormatted = currentPrice 
    ? `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '--';
  const changeFormatted = `${isPositive ? '+' : ''}${change24h.toFixed(2)}%`;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const isConnected = !error && bitcoinData !== null;

  return (
    <div className="flex items-center space-x-3" aria-live="polite" aria-atomic="true">
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-400">BTC:</span>
        <span className={`text-sm font-medium text-white transition-all duration-300 ${
          priceFlash === 'up' ? 'text-green-400 scale-105' :
          priceFlash === 'down' ? 'text-red-400 scale-105' : ''
        }`}>
          {priceFormatted}
        </span>
      </div>

      <div className={`flex items-center space-x-1 ${changeColor}`}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <TrendingDown className="h-3 w-3" aria-hidden="true" />
        )}
        <span className="text-xs font-medium">{changeFormatted}</span>
      </div>

      {/* Connection indicator */}
      <div className="flex items-center" aria-label={isConnected ? "Price feed connected" : "Price feed disconnected"}>
        {isConnected ? (
          <Activity className="h-3 w-3 text-green-400 animate-pulse" aria-hidden="true" />
        ) : error ? (
          <AlertCircle className="h-3 w-3 text-red-400" aria-hidden="true" />
        ) : null}
      </div>
      <span className="sr-only">Bitcoin price: {priceFormatted}, 24h change: {changeFormatted}</span>
    </div>
  );
}

export default BitcoinPriceDisplay;
