/**
 * Runes Data Types
 * 
 * This file defines the types for Bitcoin Runes data used in the Bitcoin Blockchain Analytics application.
 */

export interface RuneData {
  id: string;
  runeName: string;
  runeId: string;
  symbol: string;
  decimals: number;
  supply: string; // Big numbers as strings
  maxSupply: string;
  mintProgress: number; // 0-100%
  mintAuthority?: string;
  burnAuthority?: string;
  timestamp: string;
  blockHeight: number;
  txid: string;
  creator: string;
  description?: string;
  iconUrl?: string;
  verified: boolean;
  attributes?: Record<string, string>;
  // Market data properties (optional, populated when available)
  mintRate?: number;
  volume24h?: number;
  price?: number;
  priceChange24h?: number;
  marketCap?: number;
  holders?: number;
}

export interface RuneBalance {
  address: string;
  runeId: string;
  balance: string; // Big numbers as strings
  percentage: number; // Percentage of total supply
  lastUpdated: string;
  transactions: number;
  firstSeen: string;
}

export interface RuneTransaction {
  id: string;
  runeId: string;
  txid: string;
  blockHeight: number;
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  amount: string; // Big numbers as strings
  type: 'mint' | 'transfer' | 'burn';
  feeRate: number;
  feeTotal: number;
}

export interface RuneMarketData {
  timestamp: string;
  runeId: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  marketCap: number;
  fullyDilutedMarketCap: number;
  holders: number;
  transactions24h: number;
  liquidityBTC: number;
}

export interface RuneStats {
  totalRunes: number;
  runesLast24h: number;
  runesLast7d: number;
  totalTransactions: number;
  transactionsLast24h: number;
  transactionsLast7d: number;
  totalHolders: number;
  totalMarketCapBTC: number;
  totalVolumeBTC24h: number;
  averageTransactionValue: number;
  largestRune: {
    id: string;
    name: string;
    marketCap: number;
  };
  mostActiveRune: {
    id: string;
    name: string;
    transactions24h: number;
  };
}

export interface RuneProtocolStats {
  blockHeight: number;
  timestamp: string;
  totalRuneTypes: number;
  totalRuneSupply: string;
  totalTransactions: number;
  activeAddresses24h: number;
  averageFeeRate: number;
  protocolVersion: string;
}
