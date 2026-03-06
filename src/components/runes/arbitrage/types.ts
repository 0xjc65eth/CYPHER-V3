export interface ArbitrageOpportunity {
  id: string;
  runeName: string;
  spacedName: string;
  xversePrice: number;
  uniSatPrice: number;
  spread: number;
  bestBuy: string;
  bestSell: string;
  netProfit: number;
  liquidity: 'High' | 'Medium' | 'Low';
  confidence: number;
  executionDifficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTimeMinutes: number;
}

export type SortKey = 'spread' | 'netProfit' | 'confidence';

export const MARKETPLACES = ['Xverse', 'UniSat'] as const;
export const REFRESH_INTERVAL = 30;
export const FEE_BUY = 2.0;
export const FEE_SELL = 2.0;
export const FEE_NETWORK = 0.5;
export const FEE_TOTAL = FEE_BUY + FEE_SELL + FEE_NETWORK;
