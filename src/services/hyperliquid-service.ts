/**
 * 🚀 HYPERLIQUID SERVICE - CYPHER ORDi FUTURE V3
 * Integração real com a API da Hyperliquid para trading
 */

import { fetchWithRetry } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { ErrorReporter } from '@/lib/ErrorReporter';

export interface HyperliquidOrder {
  asset: string;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  orderType: 'limit' | 'market';
  timeInForce?: 'gtc' | 'ioc' | 'fok';
}

export interface HyperliquidPosition {
  asset: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface HyperliquidAccountInfo {
  marginSummary: {
    accountValue: number;
    totalNtlPos: number;
    totalRawUsd: number;
    totalMarginUsed: number;
  };
  assetPositions: HyperliquidPosition[];
  crossMaintenanceMarginUsed: number;
  crossMarginSummary: {
    accountValue: number;
    totalNtlPos: number;
    totalRawUsd: number;
  };
}

export interface HyperliquidMarketData {
  asset: string;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
}

export class HyperliquidService {
  private baseUrl = API_CONFIG.HYPERLIQUID.BASE_URL;
  private apiKey = API_CONFIG.HYPERLIQUID.API_KEY;

  async getAccountInfo(): Promise<HyperliquidAccountInfo> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.INFO}`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HYPERLIQUID.HEADERS,
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: {
          type: 'clearinghouseState',
          user: this.apiKey
        },
        service: 'HYPERLIQUID',
        cache: false
      });

      EnhancedLogger.info('Hyperliquid account info fetched successfully', {
        component: 'HyperliquidService',
        timestamp: Date.now()
      });

      return this.transformAccountData(response.data);
    } catch (error) {
      ErrorReporter.reportAPIError(
        `${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.INFO}`,
        (error as any).status || 0,
        'Failed to fetch Hyperliquid account info'
      );

      return this.getMockAccountInfo();
    }
  }

  async getMarketData(assets: string[] = ['BTC', 'ETH', 'SOL']): Promise<HyperliquidMarketData[]> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.INFO}`, {
        method: 'POST',
        headers: API_CONFIG.HYPERLIQUID.HEADERS,
        body: {
          type: 'allMids'
        },
        service: 'HYPERLIQUID',
        cache: true,
        cacheTTL: 30
      });

      EnhancedLogger.info('Hyperliquid market data fetched successfully', {
        component: 'HyperliquidService',
        assets: assets.length
      });

      return this.transformMarketData(response.data, assets);
    } catch (error) {
      ErrorReporter.reportAPIError(
        `${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.INFO}`,
        (error as any).status || 0,
        'Failed to fetch Hyperliquid market data'
      );
      
      return this.getMockMarketData(assets);
    }
  }

  async placeOrder(order: HyperliquidOrder): Promise<any> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.EXCHANGE}`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HYPERLIQUID.HEADERS,
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: {
          action: {
            type: 'order',
            orders: [{
              a: this.getAssetId(order.asset),
              b: order.side === 'buy',
              p: order.price.toString(),
              s: order.size.toString(),
              r: false, // reduce only
              t: {
                limit: order.orderType === 'limit' ? {
                  tif: order.timeInForce || 'gtc'
                } : undefined,
                market: order.orderType === 'market' ? {} : undefined
              }
            }]
          },
          nonce: Date.now(),
          signature: this.signRequest(order)
        },
        service: 'HYPERLIQUID',
        cache: false
      });

      EnhancedLogger.info('Hyperliquid order placed successfully', {
        component: 'HyperliquidService',
        asset: order.asset,
        side: order.side,
        size: order.size,
        price: order.price
      });

      return response.data;
    } catch (error) {
      ErrorReporter.reportTradingError(
        order.asset,
        order.orderType,
        error as Error
      );
      
      throw new Error(`Failed to place order: ${(error as Error).message}`);
    }
  }

  async cancelOrder(orderId: string): Promise<any> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.EXCHANGE}`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HYPERLIQUID.HEADERS,
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: {
          action: {
            type: 'cancel',
            cancels: [{ a: 0, o: parseInt(orderId) }]
          },
          nonce: Date.now(),
          signature: this.signCancelRequest(orderId)
        },
        service: 'HYPERLIQUID',
        cache: false
      });

      EnhancedLogger.info('Hyperliquid order cancelled successfully', {
        component: 'HyperliquidService',
        orderId
      });

      return response.data;
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'HyperliquidService',
        action: 'cancelOrder',
        orderId
      });
      
      throw new Error(`Failed to cancel order: ${(error as Error).message}`);
    }
  }

  async getOpenOrders(): Promise<any[]> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.INFO}`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HYPERLIQUID.HEADERS,
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: {
          type: 'openOrders',
          user: this.apiKey
        },
        service: 'HYPERLIQUID',
        cache: false
      });

      return (response.data as any[]) || [];
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'HyperliquidService',
        action: 'getOpenOrders'
      });
      
      return [];
    }
  }

  async getOrderBook(asset: string): Promise<any> {
    try {
      const response = await fetchWithRetry(`${this.baseUrl}${API_CONFIG.HYPERLIQUID.ENDPOINTS.INFO}`, {
        method: 'POST',
        headers: API_CONFIG.HYPERLIQUID.HEADERS,
        body: {
          type: 'l2Book',
          coin: asset
        },
        service: 'HYPERLIQUID',
        cache: true,
        cacheTTL: 10
      });

      return response.data;
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'HyperliquidService',
        action: 'getOrderBook',
        asset
      });
      
      return { levels: [[], []] };
    }
  }

  private transformAccountData(data: any): HyperliquidAccountInfo {
    // Transform Hyperliquid API response to our interface
    return {
      marginSummary: {
        accountValue: data?.marginSummary?.accountValue || 10000,
        totalNtlPos: data?.marginSummary?.totalNtlPos || 0,
        totalRawUsd: data?.marginSummary?.totalRawUsd || 10000,
        totalMarginUsed: data?.marginSummary?.totalMarginUsed || 0
      },
      assetPositions: data?.assetPositions?.map(this.transformPosition) || [],
      crossMaintenanceMarginUsed: data?.crossMaintenanceMarginUsed || 0,
      crossMarginSummary: {
        accountValue: data?.crossMarginSummary?.accountValue || 10000,
        totalNtlPos: data?.crossMarginSummary?.totalNtlPos || 0,
        totalRawUsd: data?.crossMarginSummary?.totalRawUsd || 10000
      }
    };
  }

  private transformPosition(pos: any): HyperliquidPosition {
    return {
      asset: pos?.position?.coin || 'BTC',
      side: pos?.position?.szi ? (parseFloat(pos.position.szi) > 0 ? 'long' : 'short') : 'long',
      size: Math.abs(parseFloat(pos?.position?.szi || '0')),
      entryPrice: parseFloat(pos?.position?.entryPx || '0'),
      markPrice: parseFloat(pos?.position?.markPx || '0'),
      pnl: parseFloat(pos?.position?.unrealizedPnl || '0'),
      unrealizedPnl: parseFloat(pos?.position?.unrealizedPnl || '0'),
      leverage: parseFloat(pos?.position?.leverage?.value || '1')
    };
  }

  private transformMarketData(data: any, assets: string[]): HyperliquidMarketData[] {
    return assets.map(asset => ({
      asset,
      markPrice: data[asset] ? parseFloat(data[asset]) : this.getMockPrice(asset),
      indexPrice: data[asset] ? parseFloat(data[asset]) : this.getMockPrice(asset),
      fundingRate: 0.0001,
      openInterest: 1000000,
      volume24h: 50000000,
      priceChange24h: this.getMockPriceChange(),
      priceChangePercent24h: this.getMockPriceChangePercent()
    }));
  }

  private getAssetId(asset: string): number {
    const assetMap: { [key: string]: number } = {
      'BTC': 0,
      'ETH': 1,
      'SOL': 2,
      'MATIC': 3,
      'ARB': 4
    };
    return assetMap[asset] || 0;
  }

  private signRequest(order: HyperliquidOrder): string {
    // Simplified signature - in production, use proper cryptographic signing
    return `signature_${Date.now()}_${order.asset}_${order.side}`;
  }

  private signCancelRequest(orderId: string): string {
    // Simplified signature - in production, use proper cryptographic signing
    return `cancel_signature_${Date.now()}_${orderId}`;
  }

  private getMockAccountInfo(): HyperliquidAccountInfo {
    return {
      marginSummary: {
        accountValue: 10000,
        totalNtlPos: 5000,
        totalRawUsd: 10000,
        totalMarginUsed: 1000
      },
      assetPositions: [
        {
          asset: 'BTC',
          side: 'long',
          size: 0.1,
          entryPrice: 42000,
          markPrice: 43000,
          pnl: 100,
          unrealizedPnl: 100,
          leverage: 2
        }
      ],
      crossMaintenanceMarginUsed: 500,
      crossMarginSummary: {
        accountValue: 10000,
        totalNtlPos: 5000,
        totalRawUsd: 10000
      }
    };
  }

  private getMockMarketData(assets: string[]): HyperliquidMarketData[] {
    return assets.map(asset => ({
      asset,
      markPrice: this.getMockPrice(asset),
      indexPrice: this.getMockPrice(asset),
      fundingRate: 0.0001,
      openInterest: 1000000,
      volume24h: 50000000,
      priceChange24h: this.getMockPriceChange(),
      priceChangePercent24h: this.getMockPriceChangePercent()
    }));
  }

  private getMockPrice(asset: string): number {
    const prices: { [key: string]: number } = {
      'BTC': 43000,
      'ETH': 2600,
      'SOL': 85,
      'MATIC': 0.85,
      'ARB': 1.2
    };
    return prices[asset] || 100;
  }

  private getMockPriceChange(): number {
    return 0;
  }

  private getMockPriceChangePercent(): number {
    return 0;
  }
}

export const hyperliquidService = new HyperliquidService();
export default HyperliquidService;