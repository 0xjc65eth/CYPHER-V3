'use client';

import React, { useMemo } from 'react';
import { useBinanceWebSocketTicker, TickerItem } from '@/hooks/useBinanceWebSocketTicker';

const TICKER_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'ordiusdt', 'runeusdt'];

const DISPLAY_NAMES: Record<string, string> = {
  BTCUSDT: 'BTC',
  ETHUSDT: 'ETH',
  SOLUSDT: 'SOL',
  ORDIUSDT: 'ORDI',
  RUNEUSDT: 'RUNE',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function TickerItemDisplay({ item }: { item: TickerItem }) {
  const displayName = DISPLAY_NAMES[item.symbol] || item.symbol;
  const isPositive = item.change24h >= 0;

  return (
    <span className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
      <span className="text-[#00ff88] font-bold">{displayName}</span>
      <span className="text-[#e4e4e7]">${formatPrice(item.price)}</span>
      <span className={isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}>
        {isPositive ? '+' : ''}{item.change24h.toFixed(2)}%
      </span>
    </span>
  );
}

export function LivePriceTicker() {
  const tickers = useBinanceWebSocketTicker(TICKER_SYMBOLS);

  const items = useMemo(() => {
    if (tickers.size === 0) return null;
    return TICKER_SYMBOLS
      .map(s => tickers.get(s.toUpperCase()) || tickers.get(s))
      .filter(Boolean) as TickerItem[];
  }, [tickers]);

  // Show minimal placeholder while loading (no misleading "connecting" text)
  if (!items || items.length === 0) {
    return (
      <div className="bg-[#12121a]/80 border-b border-[#2a2a3e] py-1.5 overflow-hidden">
        <div className="flex items-center text-xs font-mono text-[#e4e4e7]/20 px-4">
          BTC — ETH — SOL — ORDI — RUNE
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#12121a]/80 border-b border-[#2a2a3e] py-1.5 overflow-hidden group">
      <div className="ticker-scroll flex text-xs font-mono group-hover:[animation-play-state:paused]">
        {/* Duplicate items for seamless loop */}
        {[...items, ...items].map((item, i) => (
          <TickerItemDisplay key={`${item.symbol}-${i}`} item={item} />
        ))}
      </div>
      <style jsx>{`
        .ticker-scroll {
          animation: ticker-marquee 20s linear infinite;
          width: max-content;
        }
        @keyframes ticker-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
