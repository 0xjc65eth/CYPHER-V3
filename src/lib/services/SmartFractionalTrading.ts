import { EventEmitter } from 'events';

interface CryptoPrice {
  symbol: string;
  price: number;
  network: string;
  timestamp: number;
}

interface FractionalOrder {
  id: string;
  type: 'buy' | 'sell';
  inputAmount: number;
  inputCurrency: 'USD' | 'BTC' | 'ETH' | 'ORDI' | 'SOL';
  targetCurrency: string;
  targetNetwork: string;
  fractionalAmount: number;
  estimatedPrice: number;
  slippage: number;
  fee: number;
  total: number;
  status: 'pending' | 'calculating' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  txHash?: string;
}

interface NetworkConfig {
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  minAmount: number;
  decimals: number;
}

export class SmartFractionalTrading extends EventEmitter {
  private priceFeeds: Map<string, CryptoPrice> = new Map();
  private networks: Map<string, NetworkConfig> = new Map();
  private priceUpdateInterval?: NodeJS.Timeout;
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor() {
    super();
    this.initializeNetworks();
    this.startPriceFeeds();
  }

  private initializeNetworks() {
    // Bitcoin Network
    this.networks.set('bitcoin', {
      name: 'Bitcoin',
      symbol: 'BTC',
      chainId: 0,
      rpcUrl: 'https://btc.getblock.io',
      explorerUrl: 'https://mempool.space',
      minAmount: 0.00000546, // dust limit
      decimals: 8
    });

    // Ethereum Network
    this.networks.set('ethereum', {
      name: 'Ethereum',
      symbol: 'ETH',
      chainId: 1,
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
      explorerUrl: 'https://etherscan.io',
      minAmount: 0.000001,
      decimals: 18
    });

    // Binance Smart Chain
    this.networks.set('bsc', {
      name: 'Binance Smart Chain',
      symbol: 'BNB',
      chainId: 56,
      rpcUrl: 'https://bsc-dataseed.binance.org',
      explorerUrl: 'https://bscscan.com',
      minAmount: 0.000001,
      decimals: 18
    });

    // Polygon
    this.networks.set('polygon', {
      name: 'Polygon',
      symbol: 'MATIC',
      chainId: 137,
      rpcUrl: 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
      minAmount: 0.000001,
      decimals: 18
    });

    // Solana
    this.networks.set('solana', {
      name: 'Solana',
      symbol: 'SOL',
      chainId: 501,
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://solscan.io',
      minAmount: 0.000001,
      decimals: 9
    });
  }

  private startPriceFeeds() {
    // Connect to multiple price feeds for redundancy
    this.connectToBinanceStream();
    this.connectToCoinbaseStream();
    this.startAggregatedPriceFeed();

    // Update prices every 5 seconds
    this.priceUpdateInterval = setInterval(() => {
      this.updateAllPrices();
    }, 5000);
  }

  private connectToBinanceStream() {
    const symbols = ['btcusdt', 'ethusdt', 'solusdt', 'ordiusdt'];
    const streams = symbols.map(s => `${s}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.s) {
        const symbol = data.s.replace('USDT', '').toUpperCase();
        this.updatePrice(symbol, parseFloat(data.c), 'binance');
      }
    };

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
      setTimeout(() => this.connectToBinanceStream(), 5000);
    };

    this.wsConnections.set('binance', ws);
  }

  private connectToCoinbaseStream() {
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
        channels: ['ticker']
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ticker' && data.price) {
        const symbol = data.product_id.split('-')[0];
        this.updatePrice(symbol, parseFloat(data.price), 'coinbase');
      }
    };

    ws.onerror = (error) => {
      console.error('Coinbase WebSocket error:', error);
      setTimeout(() => this.connectToCoinbaseStream(), 5000);
    };

    this.wsConnections.set('coinbase', ws);
  }

  private startAggregatedPriceFeed() {
    // Fetch prices from multiple sources and aggregate
    this.fetchPricesFromCoinGecko();
    this.fetchPricesFromCryptoCompare();
  }

  private async fetchPricesFromCoinGecko() {
    try {
      const ids = 'bitcoin,ethereum,solana,ordinals';
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      const data = await response.json();
      
      if (data.bitcoin) this.updatePrice('BTC', data.bitcoin.usd, 'coingecko');
      if (data.ethereum) this.updatePrice('ETH', data.ethereum.usd, 'coingecko');
      if (data.solana) this.updatePrice('SOL', data.solana.usd, 'coingecko');
      if (data.ordinals) this.updatePrice('ORDI', data.ordinals.usd, 'coingecko');
    } catch (error) {
      console.error('CoinGecko API error:', error);
    }
  }

  private async fetchPricesFromCryptoCompare() {
    try {
      const response = await fetch(
        'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,ORDI&tsyms=USD'
      );
      const data = await response.json();
      
      Object.entries(data).forEach(([symbol, prices]: [string, any]) => {
        if (prices.USD) {
          this.updatePrice(symbol, prices.USD, 'cryptocompare');
        }
      });
    } catch (error) {
      console.error('CryptoCompare API error:', error);
    }
  }

  private updatePrice(symbol: string, price: number, source: string) {
    const existingPrice = this.priceFeeds.get(symbol);
    
    // Use weighted average if we have multiple sources
    if (existingPrice && Math.abs(existingPrice.timestamp - Date.now()) < 10000) {
      price = (existingPrice.price + price) / 2;
    }

    this.priceFeeds.set(symbol, {
      symbol,
      price,
      network: this.getNetworkForSymbol(symbol),
      timestamp: Date.now()
    });

    this.emit('priceUpdate', { symbol, price, source });
  }

  private getNetworkForSymbol(symbol: string): string {
    const networkMap: { [key: string]: string } = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'bsc',
      'MATIC': 'polygon',
      'SOL': 'solana',
      'ORDI': 'bitcoin' // Ordinals are on Bitcoin network
    };
    return networkMap[symbol] || 'ethereum';
  }

  private async updateAllPrices() {
    await Promise.all([
      this.fetchPricesFromCoinGecko(),
      this.fetchPricesFromCryptoCompare()
    ]);
  }

  public async calculateFractionalOrder(
    inputAmount: number,
    inputCurrency: string,
    targetCurrency: string,
    targetNetwork: string
  ): Promise<FractionalOrder> {
    const orderId = this.generateOrderId();
    
    const order: FractionalOrder = {
      id: orderId,
      type: 'buy',
      inputAmount,
      inputCurrency: inputCurrency as any,
      targetCurrency,
      targetNetwork,
      fractionalAmount: 0,
      estimatedPrice: 0,
      slippage: 0.005, // 0.5% default slippage
      fee: 0,
      total: 0,
      status: 'calculating',
      createdAt: new Date()
    };

    this.emit('orderCreated', order);

    try {
      // Get current prices
      const targetPrice = await this.getCurrentPrice(targetCurrency);
      const inputPrice = inputCurrency === 'USD' ? 1 : await this.getCurrentPrice(inputCurrency);
      
      if (!targetPrice || !inputPrice) {
        throw new Error('Unable to fetch current prices');
      }

      // Calculate conversion
      const inputValueInUSD = inputAmount * inputPrice;
      const fractionalAmount = inputValueInUSD / targetPrice;
      
      // Get network configuration
      const network = this.networks.get(targetNetwork);
      if (!network) {
        throw new Error(`Unknown network: ${targetNetwork}`);
      }

      // Check minimum amount
      if (fractionalAmount < network.minAmount) {
        throw new Error(`Amount too small. Minimum is ${network.minAmount} ${targetCurrency}`);
      }

      // Calculate fees based on network
      const networkFee = this.calculateNetworkFee(targetNetwork, fractionalAmount);
      const tradingFee = inputValueInUSD * 0.001; // 0.1% trading fee
      const totalFee = networkFee + tradingFee;

      // Update order
      order.fractionalAmount = fractionalAmount;
      order.estimatedPrice = targetPrice;
      order.fee = totalFee;
      order.total = inputValueInUSD;
      order.status = 'pending';

      this.emit('orderCalculated', order);
      return order;

    } catch (error) {
      order.status = 'failed';
      this.emit('orderFailed', { order, error });
      throw error;
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const price = this.priceFeeds.get(symbol);
    
    if (!price || Date.now() - price.timestamp > 60000) {
      // Price is stale, fetch fresh data
      await this.updateAllPrices();
      const updatedPrice = this.priceFeeds.get(symbol);
      if (!updatedPrice) {
        throw new Error(`No price available for ${symbol}`);
      }
      return updatedPrice.price;
    }

    return price.price;
  }

  private calculateNetworkFee(network: string, amount: number): number {
    // Simplified fee calculation - in production, fetch real-time gas prices
    const feeMap: { [key: string]: number } = {
      'bitcoin': 0.0001, // ~$5 at $50k BTC
      'ethereum': 0.003, // ~$10 at $3k ETH
      'bsc': 0.0005, // ~$0.25 at $500 BNB
      'polygon': 0.01, // ~$0.01 at $1 MATIC
      'solana': 0.00025 // ~$0.025 at $100 SOL
    };

    const networkFeeInCrypto = feeMap[network] || 0.001;
    return networkFeeInCrypto * (this.priceFeeds.get(this.networks.get(network)?.symbol || 'ETH')?.price ?? 0);
  }

  public async executeOrder(order: FractionalOrder, wallet: any): Promise<FractionalOrder> {
    if (order.status !== 'pending') {
      throw new Error('Order is not in pending status');
    }

    order.status = 'executing';
    this.emit('orderExecuting', order);

    try {
      // Simulate order execution
      // In production, this would interact with DEX aggregators, bridges, etc.
      await this.simulateOrderExecution(order, wallet);

      order.status = 'completed';
      order.executedAt = new Date();
      order.txHash = this.generateTxHash();

      this.emit('orderCompleted', order);
      return order;

    } catch (error) {
      order.status = 'failed';
      this.emit('orderFailed', { order, error });
      throw error;
    }
  }

  private async simulateOrderExecution(order: FractionalOrder, wallet: any): Promise<void> {
    // Simulate network delay (deterministic)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Deterministic: no random failures
  }

  public getQuickExamples(): Array<{ amount: number; description: string }> {
    return [
      { amount: 10, description: 'Coffee money → Crypto' },
      { amount: 50, description: 'Dinner budget → DeFi' },
      { amount: 100, description: 'Weekend fund → Web3' },
      { amount: 500, description: 'Savings boost → Staking' }
    ];
  }

  public getSupportedNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  public getSupportedCurrencies(): string[] {
    return ['USD', 'BTC', 'ETH', 'SOL', 'ORDI', 'BNB', 'MATIC'];
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTxHash(): string {
    return `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  public destroy() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.wsConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.removeAllListeners();
  }
}