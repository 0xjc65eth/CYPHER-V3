/**
 * dYdX v4 TypeScript Interfaces
 * Types for the dYdX v4 Indexer API integration
 */

export interface DYdXMarket {
  ticker: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  indexPrice: string;
  oraclePrice: string;
  priceChange24H: string;
  volume24H: string;
  openInterest: string;
  nextFundingRate: string;
  initialMarginFraction: string;
  maintenanceMarginFraction: string;
  stepSize: string;
  tickSize: string;
  stepBaseQuantums: number;
  subticksPerTick: number;
}

export interface DYdXOrderbookLevel {
  price: string;
  size: string;
}

export interface DYdXOrderbook {
  bids: DYdXOrderbookLevel[];
  asks: DYdXOrderbookLevel[];
}

export interface DYdXCandle {
  startedAt: string;
  ticker: string;
  resolution: string;
  open: string;
  high: string;
  low: string;
  close: string;
  baseTokenVolume: string;
  usdVolume: string;
  trades: number;
}

export interface DYdXTrade {
  id: string;
  side: 'BUY' | 'SELL';
  size: string;
  price: string;
  type: string;
  createdAt: string;
  createdAtHeight: string;
}

export interface DYdXFundingRate {
  ticker: string;
  rate: string;
  effectiveAt: string;
  price: string;
}

export type DYdXCandleResolution =
  | '1MIN'
  | '5MINS'
  | '15MINS'
  | '30MINS'
  | '1HOUR'
  | '4HOURS'
  | '1DAY';
