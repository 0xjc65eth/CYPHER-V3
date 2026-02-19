'use client';

import React from 'react';

interface TickerAsset {
  symbol: string;
  price: number;
  change: number;
}

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

interface ForexPair {
  pair: string;
  price: number;
  changePercent: number;
}

interface CommodityAsset {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface IndexAsset {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface StockAsset {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface TickerBarProps {
  data: {
    crypto: CryptoAsset[];
    forex: ForexPair[];
    commodities: CommodityAsset[];
    indices: IndexAsset[];
    stocks: StockAsset[];
  } | null;
  loading: boolean;
}

function formatPrice(price: number, isForex?: boolean): string {
  if (isForex) {
    return price.toFixed(price > 100 ? 2 : 4);
  }
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(change: number): string {
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
}

function flattenAssets(data: TickerBarProps['data']): TickerAsset[] {
  if (!data) return [];

  const items: TickerAsset[] = [];

  // Crypto
  for (const c of data.crypto) {
    items.push({ symbol: c.symbol.toUpperCase(), price: c.price, change: c.change24h });
  }

  // Forex
  for (const f of data.forex) {
    items.push({ symbol: f.pair, price: f.price, change: f.changePercent });
  }

  // Commodities
  for (const c of data.commodities) {
    items.push({ symbol: c.name.toUpperCase(), price: c.price, change: c.changePercent });
  }

  // Indices
  for (const i of data.indices) {
    items.push({ symbol: i.symbol, price: i.price, change: i.changePercent });
  }

  // Stocks
  for (const s of data.stocks) {
    items.push({ symbol: s.symbol, price: s.price, change: s.changePercent });
  }

  return items;
}

const FOREX_SYMBOLS = new Set(['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD']);

export function TickerBar({ data, loading }: TickerBarProps) {
  if (loading) {
    return (
      <div className="h-9 bg-[#0a0a0f] border-b border-[#1a1a2e] flex items-center overflow-hidden">
        <div className="flex items-center gap-8 px-4 animate-pulse">
          <span className="text-xs font-mono text-[#F7931A]/60">LOADING MARKET DATA...</span>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 w-24 bg-[#2a2a3e] rounded" />
          ))}
        </div>
      </div>
    );
  }

  const items = flattenAssets(data);
  if (items.length === 0) return null;

  return (
    <div className="h-9 bg-[#0a0a0f] border-b border-[#1a1a2e] overflow-hidden group">
      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 60s linear infinite;
        }
        .group:hover .ticker-track {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-track flex items-center h-full whitespace-nowrap">
        {/* Duplicate items for seamless loop */}
        {[0, 1].map((pass) => (
          <div key={pass} className="flex items-center shrink-0">
            {items.map((item, idx) => {
              const isForex = FOREX_SYMBOLS.has(item.symbol);
              const positive = item.change >= 0;
              return (
                <div
                  key={`${pass}-${idx}`}
                  className="flex items-center gap-1.5 px-4 h-9 border-r border-[#1a1a2e]/50"
                >
                  <span className="text-xs font-mono font-bold text-[#F7931A]">
                    {item.symbol}
                  </span>
                  <span className="text-xs font-mono text-[#e4e4e7]">
                    {isForex ? formatPrice(item.price, true) : `$${formatPrice(item.price)}`}
                  </span>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      positive ? 'text-[#00ff88]' : 'text-[#ff3366]'
                    }`}
                  >
                    {formatChange(item.change)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TickerBar;
