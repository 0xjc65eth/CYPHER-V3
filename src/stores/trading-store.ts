/**
 * CYPHER ORDI-FUTURE-V3 Trading Store
 * Zustand state management for trading, ordinals, runes, and portfolio data
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Types
export interface Price {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface OrderbookEntry {
  price: number;
  quantity: number;
}

export interface Orderbook {
  symbol: string;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp: number;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercentage: number;
  timestamp: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  timestamp: number;
}

export interface ArbitrageOpportunity {
  id: string;
  collection: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitAmount: number;
  profitPercentage: number;
  volume: number;
  timestamp: number;
}

export interface Inscription {
  id: string;
  number: number;
  content_type: string;
  content_url: string;
  collection?: string;
  rarity?: string;
  price?: number;
  owner?: string;
  timestamp: number;
}

export interface Rune {
  id: string;
  name: string;
  symbol: string;
  divisibility: number;
  cap?: number;
  amount?: number;
  burned?: number;
  mints: number;
  etching: string;
  terms?: any;
  timestamp: number;
}

export interface Wallet {
  address: string;
  type: 'xverse' | 'unisat' | 'oyl' | 'leather';
  balance: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
  inscriptions: Inscription[];
  runes: Rune[];
  connected: boolean;
  timestamp: number;
}

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalReturn: number;
  totalReturnPercent: number;
  bestPerformer: string;
  worstPerformer: string;
  diversificationScore: number;
  assets: any[];
  historical: Array<{
    timestamp: number;
    value: number;
  }>;
}

export interface Alert {
  id: string;
  type: 'price' | 'arbitrage' | 'inscription' | 'rune' | 'trade';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: number;
  read: boolean;
}

// Main Trading Store Interface
interface TradingState {
  // Connection & Status
  isConnected: boolean;
  lastUpdate: number;
  
  // Market Data
  prices: Record<string, Price>;
  trades: Trade[];
  orderbooks: Record<string, Orderbook>;
  
  // Trading
  positions: Record<string, Position>;
  orders: Order[];
  activeStrategy: string | null;
  botRunning: boolean;
  
  // Arbitrage
  arbitrageOpportunities: ArbitrageOpportunity[];
  arbitrageSettings: {
    minProfitPercent: number;
    maxPositionSize: number;
    enabledExchanges: string[];
    autoExecute: boolean;
  };
  
  // Ordinals & Runes
  inscriptions: Inscription[];
  runes: Rune[];
  topCollections: any[];
  runesActivity: any[];
  
  // Portfolio & Wallets
  wallets: Wallet[];
  activeWallet: Wallet | null;
  portfolio: Portfolio | null;
  
  // Alerts & Notifications
  alerts: Alert[];
  unreadAlerts: number;
  
  // UI State
  activeTab: string;
  gridLayout: any;
  
  // Actions
  setConnected: (connected: boolean) => void;
  updatePrice: (symbol: string, price: Price) => void;
  addTrade: (trade: Trade) => void;
  updateOrderbook: (symbol: string, orderbook: Orderbook) => void;
  addPosition: (position: Position) => void;
  updatePosition: (symbol: string, updates: Partial<Position>) => void;
  removePosition: (symbol: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  setActiveStrategy: (strategy: string | null) => void;
  setBotRunning: (running: boolean) => void;
  addArbitrageOpportunity: (opportunity: ArbitrageOpportunity) => void;
  updateArbitrageSettings: (settings: Partial<TradingState['arbitrageSettings']>) => void;
  addInscription: (inscription: Inscription) => void;
  addRune: (rune: Rune) => void;
  connectWallet: (wallet: Wallet) => void;
  disconnectWallet: (address: string) => void;
  setActiveWallet: (wallet: Wallet | null) => void;
  updatePortfolio: (portfolio: Portfolio) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertRead: (id: string) => void;
  clearAlerts: () => void;
  setActiveTab: (tab: string) => void;
  updateGridLayout: (layout: any) => void;
  reset: () => void;
}

// Default arbitrage settings
const defaultArbitrageSettings = {
  minProfitPercent: 0.3,
  maxPositionSize: 500,
  enabledExchanges: ['unisat', 'okx', 'gamma'],
  autoExecute: false,
};

// Create the store
export const useTradingStore = create<TradingState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      isConnected: false,
      lastUpdate: Date.now(),
      
      prices: {},
      trades: [],
      orderbooks: {},
      
      positions: {},
      orders: [],
      activeStrategy: null,
      botRunning: false,
      
      arbitrageOpportunities: [],
      arbitrageSettings: defaultArbitrageSettings,
      
      inscriptions: [],
      runes: [],
      topCollections: [],
      runesActivity: [],
      
      wallets: [],
      activeWallet: null,
      portfolio: null,
      
      alerts: [],
      unreadAlerts: 0,
      
      activeTab: 'dashboard',
      gridLayout: null,
      
      // Actions
      setConnected: (connected) => set({ isConnected: connected, lastUpdate: Date.now() }),
      
      updatePrice: (symbol, price) => set((state) => ({
        prices: { ...state.prices, [symbol]: price },
        lastUpdate: Date.now()
      })),
      
      addTrade: (trade) => set((state) => ({
        trades: [trade, ...state.trades.slice(0, 99)], // Keep last 100 trades
        lastUpdate: Date.now()
      })),
      
      updateOrderbook: (symbol, orderbook) => set((state) => ({
        orderbooks: { ...state.orderbooks, [symbol]: orderbook },
        lastUpdate: Date.now()
      })),
      
      addPosition: (position) => set((state) => ({
        positions: { ...state.positions, [position.symbol]: position },
        lastUpdate: Date.now()
      })),
      
      updatePosition: (symbol, updates) => set((state) => ({
        positions: {
          ...state.positions,
          [symbol]: { ...state.positions[symbol], ...updates }
        },
        lastUpdate: Date.now()
      })),
      
      removePosition: (symbol) => set((state) => {
        const { [symbol]: removed, ...rest } = state.positions;
        return { positions: rest, lastUpdate: Date.now() };
      }),
      
      addOrder: (order) => set((state) => ({
        orders: [order, ...state.orders],
        lastUpdate: Date.now()
      })),
      
      updateOrder: (id, updates) => set((state) => ({
        orders: state.orders.map(order => 
          order.id === id ? { ...order, ...updates } : order
        ),
        lastUpdate: Date.now()
      })),
      
      removeOrder: (id) => set((state) => ({
        orders: state.orders.filter(order => order.id !== id),
        lastUpdate: Date.now()
      })),
      
      setActiveStrategy: (strategy) => set({ activeStrategy: strategy }),
      
      setBotRunning: (running) => set({ botRunning: running }),
      
      addArbitrageOpportunity: (opportunity) => set((state) => ({
        arbitrageOpportunities: [
          opportunity, 
          ...state.arbitrageOpportunities.slice(0, 49) // Keep last 50
        ],
        lastUpdate: Date.now()
      })),
      
      updateArbitrageSettings: (settings) => set((state) => ({
        arbitrageSettings: { ...state.arbitrageSettings, ...settings }
      })),
      
      addInscription: (inscription) => set((state) => ({
        inscriptions: [inscription, ...state.inscriptions.slice(0, 99)],
        lastUpdate: Date.now()
      })),
      
      addRune: (rune) => set((state) => ({
        runes: [rune, ...state.runes.slice(0, 99)],
        lastUpdate: Date.now()
      })),
      
      connectWallet: (wallet) => set((state) => {
        const existingIndex = state.wallets.findIndex(w => w.address === wallet.address);
        const newWallets = existingIndex >= 0 
          ? state.wallets.map((w, i) => i === existingIndex ? wallet : w)
          : [...state.wallets, wallet];
        
        return {
          wallets: newWallets,
          activeWallet: wallet,
          lastUpdate: Date.now()
        };
      }),
      
      disconnectWallet: (address) => set((state) => ({
        wallets: state.wallets.filter(w => w.address !== address),
        activeWallet: state.activeWallet?.address === address ? null : state.activeWallet,
        lastUpdate: Date.now()
      })),
      
      setActiveWallet: (wallet) => set({ activeWallet: wallet }),
      
      updatePortfolio: (portfolio) => set({ portfolio, lastUpdate: Date.now() }),
      
      addAlert: (alertData) => {
        const alert: Alert = {
          ...alertData,
          id: Date.now().toString(),
          timestamp: Date.now(),
          read: false
        };
        
        set((state) => ({
          alerts: [alert, ...state.alerts.slice(0, 99)],
          unreadAlerts: state.unreadAlerts + 1,
          lastUpdate: Date.now()
        }));
      },
      
      markAlertRead: (id) => set((state) => ({
        alerts: state.alerts.map(alert => 
          alert.id === id ? { ...alert, read: true } : alert
        ),
        unreadAlerts: Math.max(0, state.unreadAlerts - 1)
      })),
      
      clearAlerts: () => set({ alerts: [], unreadAlerts: 0 }),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      updateGridLayout: (layout) => set({ gridLayout: layout }),
      
      reset: () => set({
        isConnected: false,
        prices: {},
        trades: [],
        orderbooks: {},
        positions: {},
        orders: [],
        activeStrategy: null,
        botRunning: false,
        arbitrageOpportunities: [],
        arbitrageSettings: defaultArbitrageSettings,
        inscriptions: [],
        runes: [],
        topCollections: [],
        runesActivity: [],
        wallets: [],
        activeWallet: null,
        portfolio: null,
        alerts: [],
        unreadAlerts: 0,
        activeTab: 'dashboard',
        gridLayout: null,
        lastUpdate: Date.now()
      })
    })),
    {
      name: 'cypher-trading-store'
    }
  )
);

// Selectors for derived state
export const useCurrentPrice = (symbol: string) =>
  useTradingStore(state => state.prices[symbol]);

export const usePositionPnL = () =>
  useTradingStore(state => 
    Object.values(state.positions).reduce((total, pos) => total + pos.pnl, 0)
  );

export const useTotalPortfolioValue = () =>
  useTradingStore(state => state.portfolio?.totalValue || 0);

export const useArbitrageCount = () =>
  useTradingStore(state => state.arbitrageOpportunities.length);

export const useWalletCount = () =>
  useTradingStore(state => state.wallets.filter(w => w.connected).length);

export const useUnreadAlerts = () =>
  useTradingStore(state => state.unreadAlerts);