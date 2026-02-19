/**
 * Binance Exchange Connector
 * Integração com a API da Binance para trading real
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface BinanceConfig {
  apiKey?: string;
  apiSecret?: string;
  testnet?: boolean;
}

export interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface Order {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  status: string;
  price: number;
  quantity: number;
  executedQty: number;
  time: number;
}

export class BinanceConnector extends EventEmitter {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private wsBaseUrl: string;
  private ws: WebSocket | null = null;

  constructor(config: BinanceConfig = {}) {
    super();
    this.apiKey = config.apiKey || process.env.BINANCE_API_KEY || '';
    this.apiSecret = config.apiSecret || process.env.BINANCE_SECRET_KEY || '';
    
    if (config.testnet) {
      this.baseUrl = 'https://testnet.binance.vision/api/v3';
      this.wsBaseUrl = 'wss://testnet.binance.vision/ws';
    } else {
      this.baseUrl = 'https://api.binance.com/api/v3';
      this.wsBaseUrl = 'wss://stream.binance.com:9443/ws';
    }
  }

  /**
   * Gera assinatura para requisições autenticadas
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Faz requisição para a API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: any = {},
    requiresAuth: boolean = false
  ): Promise<any> {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      let headers: any = {
        'Content-Type': 'application/json',
      };

      if (requiresAuth) {
        if (!this.apiKey || !this.apiSecret) {
          throw new Error('API credentials not configured');
        }

        headers['X-MBX-APIKEY'] = this.apiKey;
        
        // Add timestamp
        params.timestamp = Date.now();
        
        // Create query string
        const queryString = new URLSearchParams(params).toString();
        
        // Generate signature
        params.signature = this.generateSignature(queryString);
        
        if (method === 'GET') {
          url += '?' + new URLSearchParams(params).toString();
        }
      } else if (method === 'GET' && Object.keys(params).length > 0) {
        url += '?' + new URLSearchParams(params).toString();
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (method === 'POST' && requiresAuth) {
        options.body = new URLSearchParams(params).toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'API request failed');
      }

      return data;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Obtém informações da conta
   */
  async getAccountInfo(): Promise<any> {
    return this.makeRequest('/account', 'GET', {}, true);
  }

  /**
   * Obtém balanços
   */
  async getBalances(): Promise<Balance[]> {
    const account = await this.getAccountInfo();
    return account.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked),
      }));
  }

  /**
   * Cria uma ordem
   */
  async createOrder(params: OrderParams): Promise<Order> {
    const orderParams: any = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    };

    if (params.type === 'LIMIT') {
      if (!params.price) throw new Error('Price required for LIMIT orders');
      orderParams.price = params.price;
      orderParams.timeInForce = params.timeInForce || 'GTC';
    }

    if (params.type === 'STOP_LOSS' || params.type === 'STOP_LOSS_LIMIT') {
      if (!params.stopPrice) throw new Error('Stop price required');
      orderParams.stopPrice = params.stopPrice;
      if (params.type === 'STOP_LOSS_LIMIT' && params.price) {
        orderParams.price = params.price;
      }
    }

    const result = await this.makeRequest('/order', 'POST', orderParams, true);
    
    this.emit('order:created', result);
    
    return {
      orderId: result.orderId,
      symbol: result.symbol,
      side: result.side,
      type: result.type,
      status: result.status,
      price: parseFloat(result.price || '0'),
      quantity: parseFloat(result.origQty),
      executedQty: parseFloat(result.executedQty),
      time: result.transactTime,
    };
  }

  /**
   * Cancela uma ordem
   */
  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    const result = await this.makeRequest('/order', 'DELETE', {
      symbol,
      orderId,
    }, true);
    
    this.emit('order:cancelled', result);
  }

  /**
   * Obtém ordens abertas
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const params = symbol ? { symbol } : {};
    const orders = await this.makeRequest('/openOrders', 'GET', params, true);
    
    return orders.map((o: any) => ({
      orderId: o.orderId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      status: o.status,
      price: parseFloat(o.price),
      quantity: parseFloat(o.origQty),
      executedQty: parseFloat(o.executedQty),
      time: o.time,
    }));
  }

  /**
   * Obtém ticker de preço
   */
  async getTicker(symbol: string): Promise<any> {
    return this.makeRequest('/ticker/24hr', 'GET', { symbol });
  }

  /**
   * Conecta ao WebSocket para dados em tempo real
   */
  connectWebSocket(streams: string[]): void {
    if (this.ws) {
      this.ws.close();
    }

    const streamUrl = `${this.wsBaseUrl}/${streams.join('/')}`;
    this.ws = new WebSocket(streamUrl);

    this.ws.onopen = () => {
      this.emit('ws:connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit('ws:message', data);
    };

    this.ws.onerror = (error) => {
      this.emit('ws:error', error);
      console.error('❌ WebSocket error:', error);
    };

    this.ws.onclose = () => {
      this.emit('ws:disconnected');
      
      // Reconectar após 5 segundos
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CLOSED) {
          this.connectWebSocket(streams);
        }
      }, 5000);
    };
  }

  /**
   * Desconecta do WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Testa conectividade
   */
  async ping(): Promise<boolean> {
    try {
      await this.makeRequest('/ping');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém tempo do servidor
   */
  async getServerTime(): Promise<number> {
    const result = await this.makeRequest('/time');
    return result.serverTime;
  }
}

// Export singleton instance for easy use
export const binance = new BinanceConnector();
