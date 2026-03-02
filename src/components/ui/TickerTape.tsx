'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Zap, AlertTriangle } from 'lucide-react';
import styles from '../../styles/WallStreet.module.css';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  type: 'crypto' | 'rune' | 'ordinal' | 'stock';
  trending?: boolean;
  alert?: 'high' | 'medium' | 'low';
  lastUpdate: number;
}

interface TickerTapeProps {
  items: TickerItem[];
  speed?: number;
  pauseOnHover?: boolean;
  showVolume?: boolean;
  className?: string;
}

export default function TickerTape({
  items = [],
  speed = 30,
  pauseOnHover = true,
  showVolume = true,
  className = ''
}: TickerTapeProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(speed);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Atualizar duração da animação baseada na velocidade
  useEffect(() => {
    setAnimationDuration(speed);
  }, [speed]);

  // Formatação de preços
  const formatPrice = (price: number): string => {
    if (price < 0.000001) return `${(price * 100000000).toFixed(0)} sats`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 1000) return `$${price.toFixed(2)}`;
    if (price < 1000000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${(price / 1000000).toFixed(1)}M`;
  };

  const formatChange = (change: number, isPercent: boolean = false): string => {
    const sign = change >= 0 ? '+' : '';
    const suffix = isPercent ? '%' : '';
    return `${sign}${change.toFixed(2)}${suffix}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(1)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  // Obter ícone do tipo de asset
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'crypto': return '₿';
      case 'rune': return '⚡';
      case 'ordinal': return '🔸';
      case 'stock': return '📈';
      default: return '●';
    }
  };

  // Obter cor do alerta
  const getAlertColor = (alert?: string) => {
    switch (alert) {
      case 'high': return '#ff0000';
      case 'medium': return '#ffff00';
      case 'low': return '#00ff00';
      default: return 'transparent';
    }
  };

  // Duplicar items para scroll contínuo
  const duplicatedItems = [...items, ...items];

  const handleMouseEnter = () => {
    if (pauseOnHover) setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) setIsPaused(false);
  };

  return (
    <div 
      className={`${styles.tickerTape} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Linha de scan animada */}
      <div className={styles.scanLine}></div>
      
      {/* Conteúdo do ticker */}
      <div 
        ref={tickerRef}
        className={styles.tickerContent}
        style={{
          animationDuration: `${animationDuration}s`,
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div key={`${item.symbol}-${index}`} className={styles.tickerItem}>
            {/* Ícone do tipo de asset */}
            <span 
              className="mr-2 text-yellow-400"
              style={{ 
                textShadow: '0 0 5px rgba(255, 255, 0, 0.8)',
                filter: item.alert ? `drop-shadow(0 0 3px ${getAlertColor(item.alert)})` : 'none'
              }}
            >
              {getAssetIcon(item.type)}
            </span>

            {/* Símbolo */}
            <span className={styles.tickerSymbol}>
              {item.symbol}
            </span>

            {/* Preço */}
            <span className={styles.tickerPrice}>
              {formatPrice(item.price)}
            </span>

            {/* Mudança percentual */}
            <span 
              className={`${styles.tickerChange} ${
                item.changePercent24h >= 0 
                  ? styles.tickerChangePositive 
                  : styles.tickerChangeNegative
              }`}
            >
              {item.changePercent24h >= 0 ? (
                <TrendingUp className="inline w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="inline w-3 h-3 mr-1" />
              )}
              {formatChange(item.changePercent24h, true)}
            </span>

            {/* Volume (opcional) */}
            {showVolume && (
              <span className="ml-2 text-gray-400 text-xs">
                Vol: {formatVolume(item.volume24h)}
              </span>
            )}

            {/* Indicadores especiais */}
            <div className="ml-2 flex items-center space-x-1">
              {/* Trending */}
              {item.trending && (
                <Zap className="w-3 h-3 text-orange-400 animate-pulse" />
              )}
              
              {/* Alert */}
              {item.alert && (
                <AlertTriangle 
                  className="w-3 h-3 animate-pulse" 
                  style={{ color: getAlertColor(item.alert) }}
                />
              )}
            </div>

            {/* Separador */}
            <span className="ml-4 text-gray-600">|</span>
          </div>
        ))}
      </div>

      {/* Gradientes nas bordas para efeito de fade */}
      <div 
        className="absolute left-0 top-0 w-16 h-full bg-gradient-to-r from-black to-transparent pointer-events-none z-10"
      />
      <div 
        className="absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-black to-transparent pointer-events-none z-10"
      />

      {/* Status de conexão */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20">
        <div className={styles.connectionStatus}>
          <div className={`${styles.connectionDot} ${styles.connectionDotConnected}`}></div>
          <span className="text-xs text-green-400">LIVE</span>
        </div>
      </div>
    </div>
  );
}

// Hook for ticker data - fetches from real market data API
// FALLBACK: Replace with real WebSocket or polling API for live ticker prices
export function useTickerData() {
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTickerData = async () => {
      try {
        // Attempt to fetch real ticker data from API
        const response = await fetch('/api/market/tickers/');
        if (response.ok) {
          const result = await response.json();
          if (result?.length) {
            setTickerData(result);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('[useTickerData] API unavailable, ticker will be empty:', error);
      }
      // No data available - ticker will be empty
      setTickerData([]);
      setIsLoading(false);
    };

    loadTickerData();

    // Refresh ticker data periodically
    const interval = setInterval(loadTickerData, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { tickerData, isLoading };
}