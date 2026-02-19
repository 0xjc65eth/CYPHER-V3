/**
 * Advanced OrderBook Engine for CYPHER ORDi Future V3
 * High-performance order matching with real-time market depth
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// OrderBook Types
export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'iceberg' | 'post_only';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  status: 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'rejected';
  timestamp: number;
  expiryTime?: number;
  filledQuantity: number;
  remainingQuantity: number;
  avgFillPrice: number;
  fees: number;
  icebergQuantity?: number;
  postOnly?: boolean;
  reduceOnly?: boolean;
  clientOrderId?: string;
  metadata: {
    source: string;
    strategy?: string;
    parentOrderId?: string;
    slippage?: number;
  };
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
  orders: Order[];
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdate: number;
  sequence: number;
  spread: number;
  midPrice: number;
  bestBid?: OrderBookLevel;
  bestAsk?: OrderBookLevel;
  depth: {
    bids: { [price: string]: number };
    asks: { [price: string]: number };
  };
  volume24h: number;
  priceChange24h: number;
}

export interface Trade {
  id: string;
  symbol: string;
  buyOrderId: string;
  sellOrderId: string;
  buyUserId: string;
  sellUserId: string;
  price: number;
  quantity: number;
  timestamp: number;
  side: 'buy' | 'sell'; // Taker side
  fees: {
    maker: number;
    taker: number;
  };
  sequence: number;
}

export interface OrderMatchResult {
  trades: Trade[];
  updatedOrders: Order[];
  newOrderStatus: Order;
  marketImpact: {
    priceImpact: number;
    slippage: number;
    effectivePrice: number;
  };
}

export interface MarketDepth {
  symbol: string;
  timestamp: number;
  depth: {
    level: number;
    bid: { price: number; quantity: number; total: number };
    ask: { price: number; quantity: number; total: number };
  }[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
  imbalance: number; // (bid_volume - ask_volume) / (bid_volume + ask_volume)
}

export interface OrderBookMetrics {
  symbol: string;
  timestamp: number;
  totalBidVolume: number;
  totalAskVolume: number;
  bidLevels: number;
  askLevels: number;
  averageBidSize: number;
  averageAskSize: number;
  maxBidSize: number;
  maxAskSize: number;
  volumeWeightedAveragePrice: number;
  volatility: number;
  turnover: number;
  efficiency: number;
}

export class OrderBookEngine extends EventEmitter {
  private orderBooks: Map<string, OrderBook> = new Map();
  private orders: Map<string, Order> = new Map();
  private userOrders: Map<string, Set<string>> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private sequence: number = 0;
  private priceTimeSeries: Map<string, { price: number; timestamp: number }[]> = new Map();

  // Fee configuration
  private readonly FEE_STRUCTURE = {
    maker: 0.001, // 0.1%
    taker: 0.002, // 0.2%
    vip: {
      level1: { maker: 0.0008, taker: 0.0015 },
      level2: { maker: 0.0006, taker: 0.0012 },
      level3: { maker: 0.0004, taker: 0.001 }
    }
  };

  // Order book configuration
  private readonly PRICE_PRECISION = 8;
  private readonly QUANTITY_PRECISION = 8;
  private readonly MAX_PRICE_LEVELS = 1000;
  private readonly MAX_ORDERS_PER_LEVEL = 100;

  constructor() {
    super();
    EnhancedLogger.info('OrderBook Engine initialized', {
      component: 'OrderBookEngine',
      pricePrecision: this.PRICE_PRECISION,
      quantityPrecision: this.QUANTITY_PRECISION
    });
  }

  /**
   * Initialize order book for a symbol
   */
  initializeOrderBook(symbol: string): void {
    if (this.orderBooks.has(symbol)) {
      EnhancedLogger.warn('OrderBook already exists', { symbol });
      return;
    }

    const orderBook: OrderBook = {
      symbol,
      bids: [],
      asks: [],
      lastUpdate: Date.now(),
      sequence: 0,
      spread: 0,
      midPrice: 0,
      depth: { bids: {}, asks: {} },
      volume24h: 0,
      priceChange24h: 0
    };

    this.orderBooks.set(symbol, orderBook);
    this.trades.set(symbol, []);
    this.priceTimeSeries.set(symbol, []);

    EnhancedLogger.info('OrderBook initialized', { symbol });
    this.emit('orderBookInitialized', { symbol, orderBook });
  }

  /**
   * Place a new order
   */
  async placeOrder(orderRequest: Omit<Order, 'id' | 'timestamp' | 'status' | 'filledQuantity' | 'remainingQuantity' | 'avgFillPrice' | 'fees'>): Promise<OrderMatchResult> {
    try {
      // Validate order
      this.validateOrder(orderRequest);

      // Create order
      const order: Order = {
        ...orderRequest,
        id: this.generateOrderId(),
        timestamp: Date.now(),
        status: 'pending',
        filledQuantity: 0,
        remainingQuantity: orderRequest.quantity,
        avgFillPrice: 0,
        fees: 0
      };

      // Add to orders map
      this.orders.set(order.id, order);

      // Add to user orders
      if (!this.userOrders.has(order.userId)) {
        this.userOrders.set(order.userId, new Set());
      }
      this.userOrders.get(order.userId)!.add(order.id);

      // Process order
      const matchResult = await this.processOrder(order);

      EnhancedLogger.info('Order placed', {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        trades: matchResult.trades.length
      });

      this.emit('orderPlaced', { order, matchResult });
      return matchResult;

    } catch (error) {
      EnhancedLogger.error('Failed to place order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = this.orders.get(orderId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new Error(`Order ${orderId} does not belong to user ${userId}`);
    }

    if (order.status !== 'open' && order.status !== 'partial') {
      throw new Error(`Order ${orderId} cannot be cancelled (status: ${order.status})`);
    }

    // Remove from order book
    this.removeOrderFromBook(order);

    // Update order status
    order.status = 'cancelled';
    this.orders.set(orderId, order);

    EnhancedLogger.info('Order cancelled', {
      orderId,
      userId,
      symbol: order.symbol,
      remainingQuantity: order.remainingQuantity
    });

    this.emit('orderCancelled', order);
    return order;
  }

  /**
   * Get order book for a symbol
   */
  getOrderBook(symbol: string, depth: number = 20): OrderBook | null {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) return null;

    // Return limited depth
    return {
      ...orderBook,
      bids: orderBook.bids.slice(0, depth),
      asks: orderBook.asks.slice(0, depth)
    };
  }

  /**
   * Get market depth
   */
  getMarketDepth(symbol: string, levels: number = 10): MarketDepth | null {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) return null;

    const depth: MarketDepth['depth'] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < Math.min(levels, orderBook.bids.length, orderBook.asks.length); i++) {
      const bid = orderBook.bids[i];
      const ask = orderBook.asks[i];

      bidTotal += bid?.quantity || 0;
      askTotal += ask?.quantity || 0;

      depth.push({
        level: i + 1,
        bid: bid ? { price: bid.price, quantity: bid.quantity, total: bidTotal } : { price: 0, quantity: 0, total: bidTotal },
        ask: ask ? { price: ask.price, quantity: ask.quantity, total: askTotal } : { price: 0, quantity: 0, total: askTotal }
      });
    }

    const totalBidVolume = orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const totalAskVolume = orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);
    const imbalance = totalBidVolume + totalAskVolume > 0 
      ? (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)
      : 0;

    return {
      symbol,
      timestamp: Date.now(),
      depth,
      spread: orderBook.spread,
      spreadPercent: orderBook.midPrice > 0 ? (orderBook.spread / orderBook.midPrice) * 100 : 0,
      midPrice: orderBook.midPrice,
      imbalance
    };
  }

  /**
   * Get order book metrics
   */
  getOrderBookMetrics(symbol: string): OrderBookMetrics | null {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) return null;

    const totalBidVolume = orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const totalAskVolume = orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);

    const bidSizes = orderBook.bids.map(level => level.quantity);
    const askSizes = orderBook.asks.map(level => level.quantity);

    const trades = this.trades.get(symbol) || [];
    const recentTrades = trades.filter(t => Date.now() - t.timestamp < 24 * 60 * 60 * 1000);
    
    const vwap = this.calculateVWAP(recentTrades);
    const volatility = this.calculateVolatility(symbol);
    const turnover = recentTrades.reduce((sum, trade) => sum + trade.price * trade.quantity, 0);

    return {
      symbol,
      timestamp: Date.now(),
      totalBidVolume,
      totalAskVolume,
      bidLevels: orderBook.bids.length,
      askLevels: orderBook.asks.length,
      averageBidSize: bidSizes.length > 0 ? bidSizes.reduce((sum, size) => sum + size, 0) / bidSizes.length : 0,
      averageAskSize: askSizes.length > 0 ? askSizes.reduce((sum, size) => sum + size, 0) / askSizes.length : 0,
      maxBidSize: bidSizes.length > 0 ? Math.max(...bidSizes) : 0,
      maxAskSize: askSizes.length > 0 ? Math.max(...askSizes) : 0,
      volumeWeightedAveragePrice: vwap,
      volatility,
      turnover,
      efficiency: this.calculateMarketEfficiency(orderBook)
    };
  }

  /**
   * Get user orders
   */
  getUserOrders(userId: string, symbol?: string): Order[] {
    const userOrderIds = this.userOrders.get(userId);
    if (!userOrderIds) return [];

    const orders = Array.from(userOrderIds)
      .map(orderId => this.orders.get(orderId))
      .filter((order): order is Order => order !== undefined);

    return symbol ? orders.filter(order => order.symbol === symbol) : orders;
  }

  /**
   * Get recent trades
   */
  getRecentTrades(symbol: string, limit: number = 50): Trade[] {
    const trades = this.trades.get(symbol) || [];
    return trades.slice(-limit).reverse();
  }

  /**
   * Private methods
   */

  private validateOrder(orderRequest: any): void {
    if (!orderRequest.symbol || !orderRequest.side || !orderRequest.quantity) {
      throw new Error('Missing required order fields');
    }

    if (orderRequest.quantity <= 0) {
      throw new Error('Order quantity must be positive');
    }

    if (orderRequest.type === 'limit' && (!orderRequest.price || orderRequest.price <= 0)) {
      throw new Error('Limit orders must have a positive price');
    }

    if (!this.orderBooks.has(orderRequest.symbol)) {
      throw new Error(`OrderBook for symbol ${orderRequest.symbol} not initialized`);
    }
  }

  private async processOrder(order: Order): Promise<OrderMatchResult> {
    const orderBook = this.orderBooks.get(order.symbol)!;
    const trades: Trade[] = [];
    const updatedOrders: Order[] = [];

    if (order.type === 'market') {
      return this.processMarketOrder(order, orderBook);
    } else {
      return this.processLimitOrder(order, orderBook);
    }
  }

  private processMarketOrder(order: Order, orderBook: OrderBook): OrderMatchResult {
    const trades: Trade[] = [];
    const updatedOrders: Order[] = [];
    let remainingQuantity = order.quantity;
    let totalFillValue = 0;

    // Get opposite side of order book
    const levels = order.side === 'buy' ? orderBook.asks : orderBook.bids;

    for (const level of levels) {
      if (remainingQuantity <= 0) break;

      for (const levelOrder of level.orders) {
        if (remainingQuantity <= 0) break;

        const fillQuantity = Math.min(remainingQuantity, levelOrder.remainingQuantity);
        const fillPrice = levelOrder.price!;

        // Create trade
        const trade = this.createTrade(order, levelOrder, fillQuantity, fillPrice);
        trades.push(trade);

        // Update order statuses
        this.updateOrderFromFill(order, fillQuantity, fillPrice);
        this.updateOrderFromFill(levelOrder, fillQuantity, fillPrice);

        updatedOrders.push(levelOrder);

        remainingQuantity -= fillQuantity;
        totalFillValue += fillQuantity * fillPrice;

        // Remove filled orders
        if (levelOrder.remainingQuantity === 0) {
          this.removeOrderFromBook(levelOrder);
        }
      }
    }

    // Update order status
    if (remainingQuantity === 0) {
      order.status = 'filled';
    } else if (remainingQuantity < order.quantity) {
      order.status = 'partial';
    } else {
      order.status = 'rejected'; // No liquidity
    }

    // Calculate market impact
    const avgFillPrice = order.filledQuantity > 0 ? totalFillValue / order.filledQuantity : 0;
    const marketImpact = this.calculateMarketImpact(order, avgFillPrice, orderBook);

    // Update order book
    this.updateOrderBook(orderBook, trades);

    return {
      trades,
      updatedOrders,
      newOrderStatus: order,
      marketImpact
    };
  }

  private processLimitOrder(order: Order, orderBook: OrderBook): OrderMatchResult {
    const trades: Trade[] = [];
    const updatedOrders: Order[] = [];

    // First try to match with existing orders
    const matchResult = this.matchLimitOrder(order, orderBook);
    trades.push(...matchResult.trades);
    updatedOrders.push(...matchResult.updatedOrders);

    // If order is not fully filled, add to order book
    if (order.remainingQuantity > 0 && order.status !== 'cancelled') {
      this.addOrderToBook(order, orderBook);
      order.status = order.filledQuantity > 0 ? 'partial' : 'open';
    }

    const marketImpact = this.calculateMarketImpact(order, order.avgFillPrice, orderBook);

    // Update order book
    this.updateOrderBook(orderBook, trades);

    return {
      trades,
      updatedOrders,
      newOrderStatus: order,
      marketImpact
    };
  }

  private matchLimitOrder(order: Order, orderBook: OrderBook): { trades: Trade[]; updatedOrders: Order[] } {
    const trades: Trade[] = [];
    const updatedOrders: Order[] = [];
    
    // Get opposite side levels that can match
    const levels = order.side === 'buy' ? orderBook.asks : orderBook.bids;
    const canMatch = order.side === 'buy' 
      ? (level: OrderBookLevel) => level.price <= order.price!
      : (level: OrderBookLevel) => level.price >= order.price!;

    for (const level of levels) {
      if (order.remainingQuantity <= 0 || !canMatch(level)) break;

      for (const levelOrder of level.orders) {
        if (order.remainingQuantity <= 0) break;

        const fillQuantity = Math.min(order.remainingQuantity, levelOrder.remainingQuantity);
        const fillPrice = levelOrder.price!;

        // Create trade
        const trade = this.createTrade(order, levelOrder, fillQuantity, fillPrice);
        trades.push(trade);

        // Update orders
        this.updateOrderFromFill(order, fillQuantity, fillPrice);
        this.updateOrderFromFill(levelOrder, fillQuantity, fillPrice);

        updatedOrders.push(levelOrder);

        // Remove filled orders
        if (levelOrder.remainingQuantity === 0) {
          this.removeOrderFromBook(levelOrder);
        }
      }
    }

    return { trades, updatedOrders };
  }

  private createTrade(buyOrder: Order, sellOrder: Order, quantity: number, price: number): Trade {
    const isBuyerTaker = buyOrder.timestamp > sellOrder.timestamp;
    const trade: Trade = {
      id: this.generateTradeId(),
      symbol: buyOrder.symbol,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyUserId: buyOrder.userId,
      sellUserId: sellOrder.userId,
      price,
      quantity,
      timestamp: Date.now(),
      side: isBuyerTaker ? 'buy' : 'sell',
      fees: {
        maker: quantity * price * this.FEE_STRUCTURE.maker,
        taker: quantity * price * this.FEE_STRUCTURE.taker
      },
      sequence: ++this.sequence
    };

    // Add trade to symbol trades
    const trades = this.trades.get(buyOrder.symbol) || [];
    trades.push(trade);
    
    // Keep only recent trades (last 10000)
    if (trades.length > 10000) {
      trades.splice(0, trades.length - 10000);
    }
    
    this.trades.set(buyOrder.symbol, trades);

    this.emit('tradeExecuted', trade);
    return trade;
  }

  private updateOrderFromFill(order: Order, fillQuantity: number, fillPrice: number): void {
    const previousFilled = order.filledQuantity;
    order.filledQuantity += fillQuantity;
    order.remainingQuantity -= fillQuantity;

    // Update average fill price
    const totalFillValue = (previousFilled * order.avgFillPrice) + (fillQuantity * fillPrice);
    order.avgFillPrice = totalFillValue / order.filledQuantity;

    // Update fees
    const feeRate = order.timestamp < Date.now() - 1000 ? this.FEE_STRUCTURE.maker : this.FEE_STRUCTURE.taker;
    order.fees += fillQuantity * fillPrice * feeRate;

    // Update status
    if (order.remainingQuantity === 0) {
      order.status = 'filled';
    } else if (order.filledQuantity > 0) {
      order.status = 'partial';
    }

    this.orders.set(order.id, order);
  }

  private addOrderToBook(order: Order, orderBook: OrderBook): void {
    const levels = order.side === 'buy' ? orderBook.bids : orderBook.asks;
    const price = order.price!;

    // Find or create price level
    let level = levels.find(l => l.price === price);
    if (!level) {
      level = {
        price,
        quantity: 0,
        orderCount: 0,
        orders: []
      };

      // Insert in correct position (sorted)
      const insertIndex = order.side === 'buy' 
        ? levels.findIndex(l => l.price < price)
        : levels.findIndex(l => l.price > price);
      
      if (insertIndex === -1) {
        levels.push(level);
      } else {
        levels.splice(insertIndex, 0, level);
      }
    }

    // Add order to level
    level.orders.push(order);
    level.quantity += order.remainingQuantity;
    level.orderCount++;

    // Update depth
    const depthKey = price.toFixed(this.PRICE_PRECISION);
    if (order.side === 'buy') {
      orderBook.depth.bids[depthKey] = (orderBook.depth.bids[depthKey] || 0) + order.remainingQuantity;
    } else {
      orderBook.depth.asks[depthKey] = (orderBook.depth.asks[depthKey] || 0) + order.remainingQuantity;
    }
  }

  private removeOrderFromBook(order: Order): void {
    const orderBook = this.orderBooks.get(order.symbol);
    if (!orderBook) return;

    const levels = order.side === 'buy' ? orderBook.bids : orderBook.asks;
    const levelIndex = levels.findIndex(l => l.price === order.price);
    
    if (levelIndex === -1) return;

    const level = levels[levelIndex];
    const orderIndex = level.orders.findIndex(o => o.id === order.id);
    
    if (orderIndex === -1) return;

    // Remove order
    level.orders.splice(orderIndex, 1);
    level.quantity -= order.remainingQuantity;
    level.orderCount--;

    // Remove level if empty
    if (level.orders.length === 0) {
      levels.splice(levelIndex, 1);
    }

    // Update depth
    const depthKey = order.price!.toFixed(this.PRICE_PRECISION);
    if (order.side === 'buy') {
      orderBook.depth.bids[depthKey] = Math.max(0, (orderBook.depth.bids[depthKey] || 0) - order.remainingQuantity);
      if (orderBook.depth.bids[depthKey] === 0) {
        delete orderBook.depth.bids[depthKey];
      }
    } else {
      orderBook.depth.asks[depthKey] = Math.max(0, (orderBook.depth.asks[depthKey] || 0) - order.remainingQuantity);
      if (orderBook.depth.asks[depthKey] === 0) {
        delete orderBook.depth.asks[depthKey];
      }
    }
  }

  private updateOrderBook(orderBook: OrderBook, trades: Trade[]): void {
    orderBook.lastUpdate = Date.now();
    orderBook.sequence++;

    // Update best bid/ask
    orderBook.bestBid = orderBook.bids[0];
    orderBook.bestAsk = orderBook.asks[0];

    // Update spread and mid price
    if (orderBook.bestBid && orderBook.bestAsk) {
      orderBook.spread = orderBook.bestAsk.price - orderBook.bestBid.price;
      orderBook.midPrice = (orderBook.bestBid.price + orderBook.bestAsk.price) / 2;
    }

    // Update 24h volume
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = (this.trades.get(orderBook.symbol) || [])
      .filter(trade => trade.timestamp > oneDayAgo);
    
    orderBook.volume24h = recentTrades.reduce((sum, trade) => sum + trade.quantity, 0);

    // Update price change
    if (recentTrades.length > 0) {
      const oldestTrade = recentTrades[0];
      const latestTrade = recentTrades[recentTrades.length - 1];
      orderBook.priceChange24h = ((latestTrade.price - oldestTrade.price) / oldestTrade.price) * 100;
    }

    // Update price time series
    if (trades.length > 0) {
      const latestTrade = trades[trades.length - 1];
      const timeSeries = this.priceTimeSeries.get(orderBook.symbol) || [];
      timeSeries.push({ price: latestTrade.price, timestamp: latestTrade.timestamp });
      
      // Keep only recent data
      const filtered = timeSeries.filter(point => Date.now() - point.timestamp < 24 * 60 * 60 * 1000);
      this.priceTimeSeries.set(orderBook.symbol, filtered);
    }

    this.emit('orderBookUpdated', orderBook);
  }

  private calculateMarketImpact(order: Order, avgFillPrice: number, orderBook: OrderBook): OrderMatchResult['marketImpact'] {
    const midPrice = orderBook.midPrice;
    const priceImpact = midPrice > 0 ? Math.abs((avgFillPrice - midPrice) / midPrice) * 100 : 0;
    
    let expectedPrice = midPrice;
    if (order.type === 'limit' && order.price) {
      expectedPrice = order.price;
    }
    
    const slippage = expectedPrice > 0 ? Math.abs((avgFillPrice - expectedPrice) / expectedPrice) * 100 : 0;

    return {
      priceImpact,
      slippage,
      effectivePrice: avgFillPrice
    };
  }

  private calculateVWAP(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    const totalValue = trades.reduce((sum, trade) => sum + trade.price * trade.quantity, 0);
    const totalVolume = trades.reduce((sum, trade) => sum + trade.quantity, 0);

    return totalVolume > 0 ? totalValue / totalVolume : 0;
  }

  private calculateVolatility(symbol: string): number {
    const timeSeries = this.priceTimeSeries.get(symbol) || [];
    if (timeSeries.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < timeSeries.length; i++) {
      const returnRate = (timeSeries[i].price - timeSeries[i - 1].price) / timeSeries[i - 1].price;
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 365); // Annualized volatility
  }

  private calculateMarketEfficiency(orderBook: OrderBook): number {
    // Simple efficiency metric based on spread relative to mid price
    if (!orderBook.bestBid || !orderBook.bestAsk || orderBook.midPrice === 0) return 0;
    
    const spreadPercent = (orderBook.spread / orderBook.midPrice) * 100;
    return Math.max(0, 100 - spreadPercent * 10); // Lower spread = higher efficiency
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
  }
}

// Singleton instance
export const orderBookEngine = new OrderBookEngine();

// Export utility functions
export const OrderBookUtils = {
  /**
   * Calculate order book imbalance
   */
  calculateImbalance(orderBook: OrderBook): number {
    const bidVolume = orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const askVolume = orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);
    
    return bidVolume + askVolume > 0 ? (bidVolume - askVolume) / (bidVolume + askVolume) : 0;
  },

  /**
   * Estimate market impact for an order
   */
  estimateMarketImpact(orderBook: OrderBook, side: 'buy' | 'sell', quantity: number): {
    priceImpact: number;
    avgPrice: number;
    requiredLiquidity: number;
  } {
    const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
    let remainingQuantity = quantity;
    let totalValue = 0;
    let requiredLiquidity = 0;

    for (const level of levels) {
      if (remainingQuantity <= 0) break;

      const fillQuantity = Math.min(remainingQuantity, level.quantity);
      totalValue += fillQuantity * level.price;
      requiredLiquidity += fillQuantity;
      remainingQuantity -= fillQuantity;
    }

    const avgPrice = requiredLiquidity > 0 ? totalValue / requiredLiquidity : 0;
    const priceImpact = orderBook.midPrice > 0 ? Math.abs((avgPrice - orderBook.midPrice) / orderBook.midPrice) * 100 : 0;

    return {
      priceImpact,
      avgPrice,
      requiredLiquidity
    };
  },

  /**
   * Format price with correct precision
   */
  formatPrice(price: number, precision: number = 8): number {
    return parseFloat(price.toFixed(precision));
  },

  /**
   * Format quantity with correct precision
   */
  formatQuantity(quantity: number, precision: number = 8): number {
    return parseFloat(quantity.toFixed(precision));
  }
};