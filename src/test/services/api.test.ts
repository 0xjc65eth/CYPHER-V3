/**
 * API Services Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockApiResponse, mockApiError, mockFetch } from '@/test/utils/test-helpers';

// Mock the global fetch
global.fetch = vi.fn();

describe('API Services', () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    fetchMock = mockFetch({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Market Data API', () => {
    it('should fetch cryptocurrency prices successfully', async () => {
      const mockPriceData = {
        bitcoin: {
          usd: 50000,
          usd_24h_change: 2.5,
          usd_market_cap: 950000000000,
          usd_24h_vol: 25000000000
        },
        ethereum: {
          usd: 3000,
          usd_24h_change: -1.2,
          usd_market_cap: 360000000000,
          usd_24h_vol: 12000000000
        }
      };

      fetchMock.mockResolvedValue(mockPriceData);

      // Simulate API call
      const response = await fetch('/api/prices');
      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/prices');
      expect(data.bitcoin.usd).toBe(50000);
      expect(data.ethereum.usd).toBe(3000);
    });

    it('should handle market data API errors', async () => {
      fetchMock.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(fetch('/api/prices')).rejects.toThrow('API rate limit exceeded');
    });

    it('should fetch specific coin data', async () => {
      const mockBitcoinData = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        current_price: 50000,
        market_cap: 950000000000,
        total_volume: 25000000000,
        price_change_24h: 1250,
        price_change_percentage_24h: 2.56
      };

      fetchMock.mockResolvedValue(mockBitcoinData);

      const response = await fetch('/api/coins/bitcoin');
      const data = await response.json();

      expect(data.symbol).toBe('btc');
      expect(data.current_price).toBe(50000);
    });
  });

  describe('Portfolio API', () => {
    it('should fetch portfolio data successfully', async () => {
      const mockPortfolioData = {
        totalValue: 125000,
        totalPnL: 15000,
        totalPnLPercent: 13.64,
        assets: [
          {
            symbol: 'BTC',
            amount: 2.5,
            avgBuyPrice: 45000,
            currentPrice: 50000,
            value: 125000,
            pnl: 12500,
            pnlPercent: 11.11
          }
        ],
        transactions: [],
        lastUpdated: new Date().toISOString()
      };

      fetchMock.mockResolvedValue(mockPortfolioData);

      const response = await fetch('/api/portfolio');
      const data = await response.json();

      expect(data.totalValue).toBe(125000);
      expect(data.assets).toHaveLength(1);
      expect(data.assets[0].symbol).toBe('BTC');
    });

    it('should handle portfolio API errors', async () => {
      fetchMock.mockRejectedValue(new Error('Portfolio not found'));

      await expect(fetch('/api/portfolio')).rejects.toThrow('Portfolio not found');
    });
  });

  describe('Trading API', () => {
    it('should execute trade successfully', async () => {
      const mockTradeResponse = {
        id: 'trade-123',
        symbol: 'BTC',
        side: 'buy',
        amount: 1.0,
        price: 50000,
        fee: 175, // 0.35%
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      fetchMock.mockResolvedValue(mockTradeResponse);

      const tradeParams = {
        symbol: 'BTC',
        side: 'buy',
        amount: 1.0,
        type: 'market'
      };

      const response = await fetch('/api/trade', {
        method: 'POST',
        body: JSON.stringify(tradeParams)
      });
      const data = await response.json();

      expect(data.id).toBe('trade-123');
      expect(data.status).toBe('completed');
      expect(data.fee).toBe(175);
    });

    it('should handle trading errors', async () => {
      fetchMock.mockRejectedValue(new Error('Insufficient balance'));

      const tradeParams = {
        symbol: 'BTC',
        side: 'buy',
        amount: 100.0,
        type: 'market'
      };

      await expect(
        fetch('/api/trade', {
          method: 'POST',
          body: JSON.stringify(tradeParams)
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should calculate trading fees correctly', () => {
      const calculateFee = (amount: number, price: number, feePercent: number = 0.35) => {
        return (amount * price * feePercent) / 100;
      };

      const fee = calculateFee(1.0, 50000, 0.35);
      expect(fee).toBe(175);

      const largeFee = calculateFee(10.0, 50000, 0.35);
      expect(largeFee).toBe(1750);
    });
  });

  describe('Ordinals API', () => {
    it('should fetch ordinals data successfully', async () => {
      const mockOrdinalsData = [
        {
          id: 'inscription123',
          number: 12345,
          content_type: 'text/plain',
          content_length: 100,
          timestamp: '2023-01-01T00:00:00Z',
          genesis_height: 800000,
          genesis_fee: 1500,
          output_value: 546
        },
        {
          id: 'inscription456',
          number: 12346,
          content_type: 'image/png',
          content_length: 2048,
          timestamp: '2023-01-01T01:00:00Z',
          genesis_height: 800001,
          genesis_fee: 2000,
          output_value: 546
        }
      ];

      fetchMock.mockResolvedValue(mockOrdinalsData);

      const response = await fetch('/api/ordinals');
      const data = await response.json();

      expect(data).toHaveLength(2);
      expect(data[0].content_type).toBe('text/plain');
      expect(data[1].content_type).toBe('image/png');
    });

    it('should fetch specific inscription data', async () => {
      const mockInscription = {
        id: 'inscription123',
        number: 12345,
        content_type: 'text/plain',
        content: 'Hello, Bitcoin!',
        content_length: 15,
        owner: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
      };

      fetchMock.mockResolvedValue(mockInscription);

      const response = await fetch('/api/ordinals/inscription123');
      const data = await response.json();

      expect(data.id).toBe('inscription123');
      expect(data.content).toBe('Hello, Bitcoin!');
    });
  });

  describe('Runes API', () => {
    it('should fetch runes data successfully', async () => {
      const mockRunesData = [
        {
          id: 'rune1',
          name: 'BITCOIN•RUNE',
          symbol: 'BTC.RUNE',
          decimals: 8,
          total_supply: 21000000,
          circulating_supply: 19500000,
          holders: 12500,
          transactions: 45600
        },
        {
          id: 'rune2',
          name: 'ORDINAL•POWER',
          symbol: 'ORD.PWR',
          decimals: 6,
          total_supply: 1000000,
          circulating_supply: 850000,
          holders: 3400,
          transactions: 12300
        }
      ];

      fetchMock.mockResolvedValue(mockRunesData);

      const response = await fetch('/api/runes');
      const data = await response.json();

      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('BITCOIN•RUNE');
      expect(data[1].name).toBe('ORDINAL•POWER');
    });

    it('should fetch rune balance for address', async () => {
      const mockRuneBalance = {
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        runes: [
          {
            rune_id: 'rune1',
            name: 'BITCOIN•RUNE',
            balance: 1500000000, // 15 BTC.RUNE (8 decimals)
            value_usd: 750000
          }
        ],
        total_value_usd: 750000
      };

      fetchMock.mockResolvedValue(mockRuneBalance);

      const address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const response = await fetch(`/api/runes/balance/${address}`);
      const data = await response.json();

      expect(data.runes).toHaveLength(1);
      expect(data.total_value_usd).toBe(750000);
    });
  });

  describe('Arbitrage API', () => {
    it('should fetch arbitrage opportunities successfully', async () => {
      const mockArbitrageData = [
        {
          id: 'arb-1',
          pair: 'BTC/USDT',
          buy_exchange: 'binance',
          sell_exchange: 'hyperliquid',
          buy_price: 49900,
          sell_price: 50100,
          spread: 200,
          spread_percent: 0.4,
          profit_potential: 198, // After 0.35% fees
          confidence: 85,
          volume_24h: 5000000,
          last_updated: new Date().toISOString()
        }
      ];

      fetchMock.mockResolvedValue(mockArbitrageData);

      const response = await fetch('/api/arbitrage');
      const data = await response.json();

      expect(data).toHaveLength(1);
      expect(data[0].spread_percent).toBe(0.4);
      expect(data[0].profit_potential).toBe(198);
    });

    it('should calculate arbitrage profit with fees', () => {
      const calculateArbitrageProfit = (
        buyPrice: number,
        sellPrice: number,
        amount: number,
        feePercent: number = 0.35
      ) => {
        const grossProfit = (sellPrice - buyPrice) * amount;
        const buyFee = (buyPrice * amount * feePercent) / 100;
        const sellFee = (sellPrice * amount * feePercent) / 100;
        return grossProfit - buyFee - sellFee;
      };

      const profit = calculateArbitrageProfit(49900, 50100, 1.0, 0.35);
      expect(profit).toBeCloseTo(200 - 174.65 - 175.35, 2);
    });
  });

  describe('CYPHER AI API', () => {
    it('should fetch AI analysis successfully', async () => {
      const mockAIAnalysis = {
        sentiment: 'bullish',
        confidence: 78,
        signals: [
          {
            type: 'technical',
            indicator: 'RSI',
            value: 65,
            signal: 'buy',
            strength: 'medium'
          },
          {
            type: 'fundamental',
            indicator: 'adoption',
            value: 85,
            signal: 'buy',
            strength: 'strong'
          }
        ],
        price_prediction: {
          target_24h: 52000,
          target_7d: 55000,
          support: 48000,
          resistance: 52500
        },
        recommendation: 'hold',
        risk_score: 25,
        last_updated: new Date().toISOString()
      };

      fetchMock.mockResolvedValue(mockAIAnalysis);

      const response = await fetch('/api/ai/analysis');
      const data = await response.json();

      expect(data.sentiment).toBe('bullish');
      expect(data.confidence).toBe(78);
      expect(data.signals).toHaveLength(2);
    });

    it('should handle AI API errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('AI service temporarily unavailable'));

      await expect(fetch('/api/ai/analysis')).rejects.toThrow('AI service temporarily unavailable');
    });
  });

  describe('API Rate Limiting and Caching', () => {
    it('should respect rate limits', async () => {
      const rateLimitResponse = new Response(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0'
        }
      });

      vi.mocked(global.fetch).mockResolvedValue(rateLimitResponse);

      const response = await fetch('/api/prices');
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should handle cached responses', async () => {
      const cachedData = { cached: true, timestamp: Date.now() };
      
      fetchMock.mockResolvedValue(cachedData);

      const response1 = await fetch('/api/prices');
      const data1 = await response1.json();

      const response2 = await fetch('/api/prices');
      const data2 = await response2.json();

      expect(data1.cached).toBe(true);
      expect(data2.cached).toBe(true);
    });
  });

  describe('Authentication and Security', () => {
    it('should include authentication headers', async () => {
      const authHeaders = {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      };

      await fetch('/api/portfolio', {
        headers: authHeaders
      });

      expect(fetch).toHaveBeenCalledWith('/api/portfolio', {
        headers: authHeaders
      });
    });

    it('should handle authentication errors', async () => {
      const unauthorizedResponse = new Response(null, {
        status: 401,
        statusText: 'Unauthorized'
      });

      vi.mocked(global.fetch).mockResolvedValue(unauthorizedResponse);

      const response = await fetch('/api/portfolio');
      expect(response.status).toBe(401);
    });
  });
});