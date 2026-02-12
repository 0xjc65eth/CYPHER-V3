'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, TrendingDown, Clock, DollarSign, Activity, 
  ArrowUpRight, ArrowDownRight, AlertCircle, Zap, Shield,
  BarChart3, Layers, BookOpen, History
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRunesMarket } from '@/hooks/runes/useRunesMarket';
import { useRunesLiquidity } from '@/hooks/runes/useRunesLiquidity';
import { useRunesDXOrders, OrderFormData } from '@/hooks/runes/useRunesDXOrders';
import { useWallet } from '@/hooks/useWallet';
import { runesDXService } from '@/services/RunesDXService';
import { runesService, type RuneMarketData } from '@/services/runes';

export function RunesTradingTerminal() {
  const [selectedRune, setSelectedRune] = useState('DOG•GO•TO•THE•MOON');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [slippage, setSlippage] = useState([0.5]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(null);
  const [enhancedRunesData, setEnhancedRunesData] = useState<RuneMarketData[]>([]);
  const [selectedRuneData, setSelectedRuneData] = useState<RuneMarketData | null>(null);
  const [realTimePrice, setRealTimePrice] = useState<number>(0);

  const { data: marketData, isLoading: marketLoading } = useRunesMarket(selectedRune);
  const { data: liquidityData, isLoading: liquidityLoading } = useRunesLiquidity(selectedRune);
  
  // Load enhanced data
  useEffect(() => {
    const loadEnhancedData = async () => {
      try {
        const data = await runesService.getRunesMarketData();
        setEnhancedRunesData(data);
        
        // Find selected rune data
        const selectedData = data.find(r => r.name === selectedRune || r.symbol === selectedRune);
        if (selectedData) {
          setSelectedRuneData(selectedData);
          setRealTimePrice(selectedData.price.current);
        }
      } catch (error) {
        console.error('Failed to load enhanced runes data:', error);
      }
    };
    
    loadEnhancedData();
  }, [selectedRune]);
  
  // Real-time price updates
  useEffect(() => {
    const unsubscribe = runesService.subscribeToRunesPrices((updates) => {
      const update = updates.find(u => u.id === selectedRuneData?.id);
      if (update?.price?.current) {
        setRealTimePrice(update.price.current);
      }
    });
    
    return unsubscribe;
  }, [selectedRuneData?.id]);
  
  // Wallet integration
  const { isConnected, address, connectWallet } = useWallet();
  
  // Update price when switching order types
  useEffect(() => {
    if (orderType === 'market' && selectedRuneData) {
      setPrice(selectedRuneData.price.current.toString());
    }
  }, [orderType, selectedRuneData]);
  
  // RUNESDX.IO order management
  const {
    placeOrder,
    isPlacingOrder,
    placeOrderError,
    lastPlacedOrder,
    activeOrders,
    orderHistory,
    cancelOrder,
    isCancellingOrder,
    estimateFeesQuery,
    connectionStatus,
  } = useRunesDXOrders({ autoRefresh: true });

  // Real-time market data from RUNESDX.IO
  const [runesDXMarketData, setRunesDXMarketData] = useState(null);
  const [runesDXOrderBook, setRunesDXOrderBook] = useState(null);

  // Fetch RUNESDX.IO market data
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [marketData, orderBook] = await Promise.all([
          runesDXService.getMarketData(selectedRune),
          runesDXService.getOrderBook(selectedRune)
        ]);
        setRunesDXMarketData(marketData);
        setRunesDXOrderBook(orderBook);
      } catch (error) {
        console.error('Failed to fetch RUNESDX market data:', error);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // CoinGecko rate limit: increased to 60s
    
    return () => clearInterval(interval);
  }, [selectedRune]);

  // Mock data for charts
  const priceData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    price: 0.0123 + Math.random() * 0.002 - 0.001,
    volume: Math.random() * 50000 + 10000
  }));

  const orderBookData = {
    bids: Array.from({ length: 15 }, (_, i) => ({
      price: 0.0123 - i * 0.0001,
      amount: Math.random() * 10000 + 1000,
      total: 0
    })),
    asks: Array.from({ length: 15 }, (_, i) => ({
      price: 0.0123 + i * 0.0001,
      amount: Math.random() * 10000 + 1000,
      total: 0
    }))
  };

  // Calculate totals
  orderBookData.bids.forEach((bid, i) => {
    bid.total = orderBookData.bids.slice(0, i + 1).reduce((sum, b) => sum + b.amount, 0);
  });
  orderBookData.asks.forEach((ask, i) => {
    ask.total = orderBookData.asks.slice(0, i + 1).reduce((sum, a) => sum + a.amount, 0);
  });

  const tradeHistory = Array.from({ length: 20 }, (_, i) => ({
    time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
    price: 0.0123 + (Math.random() * 0.002 - 0.001),
    amount: Math.random() * 5000 + 100,
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    marketplace: ['Unisat', 'OKX', 'MagicEden'][Math.floor(Math.random() * 3)]
  }));

  const calculateSlippageImpact = () => {
    const numAmount = parseFloat(amount) || 0;
    const basePrice = 0.0123;
    const slippagePercent = slippage[0];
    const priceImpact = basePrice * (slippagePercent / 100);
    const totalCost = numAmount * basePrice;
    const slippageCost = numAmount * priceImpact;
    
    return {
      expectedPrice: side === 'buy' ? basePrice + priceImpact : basePrice - priceImpact,
      slippageCost,
      totalCost: side === 'buy' ? totalCost + slippageCost : totalCost - slippageCost
    };
  };

  const slippageImpact = calculateSlippageImpact();

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!isConnected) {
      // Show wallet connection modal or connect wallet
      await connectWallet('unisat'); // Default to Unisat, could be user's choice
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      alert('Please enter a valid price for limit orders');
      return;
    }

    try {
      const orderData: OrderFormData = {
        type: orderType,
        side,
        runeSymbol: selectedRune,
        amount,
        price: orderType === 'limit' ? price : undefined,
        slippageTolerance: slippage[0],
      };

      const response = await placeOrder(orderData);
      
      if (response?.success) {
        setOrderConfirmation(`Order placed successfully! Order ID: ${response.orderId}`);
        // Clear form
        setAmount('');
        setPrice('');
        // Auto-hide confirmation after 5 seconds
        setTimeout(() => setOrderConfirmation(null), 5000);
      }
    } catch (error) {
      console.error('Order placement failed:', error);
      alert(`Order placement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get fee estimation for current order
  const feeEstimation = typeof estimateFeesQuery === 'function' ? estimateFeesQuery({
    type: orderType,
    side,
    runeSymbol: selectedRune,
    amount,
    price: orderType === 'limit' ? price : undefined,
  }) : null;

  // Use RUNESDX order book data if available, otherwise fallback to mock data
  const displayOrderBook = runesDXOrderBook || {
    bids: orderBookData.bids,
    asks: orderBookData.asks,
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left Column - Price Chart & Order Form */}
      <div className="xl:col-span-2 space-y-6">
        {/* Price Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {selectedRune} Price Chart
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15.2%
                </Badge>
                <span className="text-2xl font-bold">$0.0123</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={priceData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" domain={['dataMin - 0.001', 'dataMax + 0.001']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#999' }}
                />
                <Line type="monotone" dataKey="price" stroke="#f97316" fillOpacity={1}  />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Time Frame Selector */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {['1H', '4H', '1D', '1W', '1M'].map((tf) => (
                <Button key={tf} variant="ghost" size="sm" className="text-xs">
                  {tf}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trading Form */}
        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Type Tabs */}
            <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">
                  Buy
                </TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500">
                  Sell
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Market/Limit Toggle */}
            <div className="flex items-center gap-4">
              <Button
                variant={orderType === 'market' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('market')}
              >
                Market
              </Button>
              <Button
                variant={orderType === 'limit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setOrderType('limit')}
              >
                Limit
              </Button>
            </div>

            {/* Order Form */}
            <div className="space-y-4">
              {orderType === 'limit' && (
                <div>
                  <Label>Price (BTC)</Label>
                  <Input
                    type="number"
                    placeholder="0.0000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label>Amount ({selectedRune})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Advanced Options */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="advanced"
                  checked={advancedMode}
                  onCheckedChange={setAdvancedMode}
                />
                <Label htmlFor="advanced">Advanced Options</Label>
              </div>

              {advancedMode && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Slippage Tolerance: {slippage[0]}%</Label>
                    <Slider
                      value={slippage}
                      onValueChange={setSlippage}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>MEV Protection</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch id="mev" />
                      <Label htmlFor="mev" className="text-sm text-muted-foreground">
                        Enable MEV protection (recommended)
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Price</span>
                  <span>{slippageImpact.expectedPrice.toFixed(4)} BTC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Slippage Impact</span>
                  <span className="text-yellow-500">{slippageImpact.slippageCost.toFixed(4)} BTC</span>
                </div>
                {feeEstimation.data && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Network Fee</span>
                      <span>{feeEstimation.data.networkFee} BTC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Trading Fee</span>
                      <span>{feeEstimation.data.tradingFee} BTC</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{slippageImpact.totalCost.toFixed(4)} BTC</span>
                </div>
              </div>

              {/* Connection Status */}
              {!isConnected && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Connect wallet to place orders</span>
                  </div>
                </div>
              )}

              {/* RUNESDX Connection Status */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>RUNESDX.IO Status:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{connectionStatus.connected ? 'Connected' : 'Disconnected'}</span>
                  {connectionStatus.websocketConnected && (
                    <span className="text-green-500">• Live</span>
                  )}
                </div>
              </div>

              {/* Order Confirmation */}
              {orderConfirmation && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-500">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">{orderConfirmation}</span>
                  </div>
                </div>
              )}

              {/* Order Errors */}
              {placeOrderError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{placeOrderError.message}</span>
                  </div>
                </div>
              )}

              <Button 
                className={`w-full ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !connectionStatus.connected}
              >
                {isPlacingOrder ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Placing Order...</span>
                  </div>
                ) : (
                  <>
                    {!isConnected ? 'Connect Wallet & ' : ''}{side === 'buy' ? 'Buy' : 'Sell'} {selectedRune}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Order Book & Trade History */}
      <div className="space-y-6">
        {/* Order Book */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Order Book
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Order Book Header */}
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>Price</span>
                <span>Size</span>
                <span>Total</span>
              </div>
              
              {/* Asks */}
              <div className="space-y-1">
                {(displayOrderBook.asks || orderBookData.asks).slice(0, 8).reverse().map((ask, i) => {
                  const price = typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price;
                  const quantity = typeof ask.quantity === 'string' ? parseFloat(ask.quantity) : (ask.amount || ask.quantity);
                  const total = typeof ask.total === 'string' ? parseFloat(ask.total) : ask.total;
                  
                  return (
                    <div key={i} className="relative">
                      <div 
                        className="absolute inset-0 bg-red-500/10" 
                        style={{ width: `${Math.min((total / ((displayOrderBook.asks || orderBookData.asks)[0]?.total || 1)) * 100, 100)}%` }}
                      />
                      <div className="relative flex justify-between text-xs py-1 px-2">
                        <span className="text-red-400">{price.toFixed(4)}</span>
                        <span>{quantity.toFixed(0)}</span>
                        <span className="text-muted-foreground">{total.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Spread */}
              <div className="flex justify-center py-2 border-y">
                <span className="text-sm font-medium">
                  {runesDXOrderBook?.spread ? (
                    `Spread: ${runesDXOrderBook.spread} BTC`
                  ) : (
                    `Spread: ${((orderBookData.asks[0].price - orderBookData.bids[0].price) * 10000).toFixed(2)} sats`
                  )}
                </span>
              </div>
              
              {/* Bids */}
              <div className="space-y-1">
                {(displayOrderBook.bids || orderBookData.bids).slice(0, 8).map((bid, i) => {
                  const price = typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price;
                  const quantity = typeof bid.quantity === 'string' ? parseFloat(bid.quantity) : (bid.amount || bid.quantity);
                  const total = typeof bid.total === 'string' ? parseFloat(bid.total) : bid.total;
                  
                  return (
                    <div key={i} className="relative">
                      <div 
                        className="absolute inset-0 bg-green-500/10" 
                        style={{ width: `${Math.min((total / ((displayOrderBook.bids || orderBookData.bids)[0]?.total || 1)) * 100, 100)}%` }}
                      />
                      <div className="relative flex justify-between text-xs py-1 px-2">
                        <span className="text-green-400">{price.toFixed(4)}</span>
                        <span>{quantity.toFixed(0)}</span>
                        <span className="text-muted-foreground">{total.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tradeHistory.map((trade, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {trade.side === 'buy' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                      {trade.price.toFixed(4)}
                    </span>
                  </div>
                  <span>{trade.amount.toFixed(0)}</span>
                  <div className="text-right">
                    <div className="text-muted-foreground">{trade.time}</div>
                    <div className="text-[10px] text-muted-foreground">{trade.marketplace}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Active Orders ({activeOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activeOrders.map((order) => (
                  <div key={order.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {order.side === 'buy' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`font-medium ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                          {order.side.toUpperCase()} {order.amount} {order.runeSymbol}
                        </span>
                      </div>
                      <Badge variant="outline" className={
                        order.status === 'pending' ? 'border-yellow-500 text-yellow-500' :
                        order.status === 'placed' ? 'border-blue-500 text-blue-500' :
                        order.status === 'partial' ? 'border-orange-500 text-orange-500' :
                        'border-gray-500 text-gray-500'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>
                        <span>Type: {order.type}</span>
                      </div>
                      <div>
                        <span>Price: {order.price || 'Market'}</span>
                      </div>
                      <div>
                        <span>Total: {order.totalValue} BTC</span>
                      </div>
                      <div>
                        <span>Fee: {order.fees.total} BTC</span>
                      </div>
                    </div>

                    {order.status === 'pending' || order.status === 'placed' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => cancelOrder(order.id)}
                        disabled={isCancellingOrder}
                      >
                        {isCancellingOrder ? 'Cancelling...' : 'Cancel Order'}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Market Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume</span>
                <span className="font-medium">124.5 BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Trades</span>
                <span className="font-medium">3,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h High</span>
                <span className="font-medium text-green-500">0.0145</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Low</span>
                <span className="font-medium text-red-500">0.0098</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidity Score</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">8.7/10</span>
                  <Badge variant="outline" className="text-xs">High</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}