/**
 * 🔧 Global Type Definitions
 * Tipos TypeScript para o projeto
 */

// Window extensions
declare global {
  interface Window {
    XverseProviders?: any;
    unisat?: any;
    magicEden?: any;
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
    fs?: {
      readFile: (path: string, options?: { encoding?: string }) => Promise<any>;
    };
  }
}

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string;
    REDIS_URL?: string;
    BINANCE_API_KEY?: string;
    BINANCE_API_SECRET?: string;
    ORDINALS_API_KEY?: string;
    TELEGRAM_BOT_TOKEN?: string;
    EMAIL_API_KEY?: string;
  }
}

// Bitcoin types
export interface BitcoinData {
  price: number;
  change24h: number;
  change24hPercent: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

// Trading types
export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  amount: number;
  timestamp: Date;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  pnl?: number;
}

// AI Agent types
export interface AgentStatus {
  id: string;
  name: string;
  active: boolean;
  accuracy: number;
  totalSignals: number;
  lastActivity: Date;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
}

export {};