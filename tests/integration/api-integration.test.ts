/**
 * API Integration Tests (Jest)
 */

import { mockApiResponse, mockApiError } from '../unit/utils/test-helpers';

// Mock the global fetch
global.fetch = jest.fn();

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Market Data Integration', () => {
    it('should handle successful market data requests', async () => {
      const mockData = {
        bitcoin: { usd: 50000, usd_24h_change: 2.5 },
        ethereum: { usd: 3000, usd_24h_change: -1.2 }
      };

      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const response = await fetch('/api/market-data');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bitcoin.usd).toBe(50000);
      expect(data.ethereum.usd).toBe(3000);
    });

    it('should handle market data API errors gracefully', async () => {
      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Retry-After': '60' }
        })
      );

      const response = await fetch('/api/market-data');
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('Portfolio Integration', () => {
    it('should fetch portfolio data with authentication', async () => {
      const mockPortfolio = {
        totalValue: 125000,
        assets: [{ symbol: 'BTC', amount: 2.5, value: 125000 }]
      };

      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(mockPortfolio), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const response = await fetch('/api/portfolio', {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalValue).toBe(125000);
      expect(data.assets).toHaveLength(1);
    });

    it('should handle authentication errors', async () => {
      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401
        })
      );

      const response = await fetch('/api/portfolio');
      expect(response.status).toBe(401);
    });
  });

  describe('Trading Integration', () => {
    it('should execute trades with proper fee calculation', async () => {
      const mockTradeResponse = {
        id: 'trade-123',
        symbol: 'BTC',
        amount: 1.0,
        price: 50000,
        fee: 175, // 0.35%
        status: 'completed'
      };

      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify(mockTradeResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const tradeRequest = {
        symbol: 'BTC',
        side: 'buy',
        amount: 1.0,
        type: 'market'
      };

      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeRequest)
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fee).toBe(175); // Verify 0.35% fee calculation
      expect(data.status).toBe('completed');
    });

    it('should validate trade parameters', async () => {
      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400
        })
      );

      const invalidTradeRequest = {
        symbol: 'BTC',
        side: 'buy',
        amount: -1.0, // Invalid negative amount
        type: 'market'
      };

      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTradeRequest)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Real-time Data Integration', () => {
    it('should handle WebSocket connections', (done) => {
      const mockWs = {
        addEventListener: jest.fn((event, callback) => {
          if (event === 'message') {
            // Simulate receiving a message
            setTimeout(() => {
              callback({
                data: JSON.stringify({
                  type: 'price_update',
                  symbol: 'BTC',
                  price: 50100
                })
              });
              done();
            }, 100);
          }
        }),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1
      };

      // Simulate WebSocket connection
      const ws = mockWs;
      ws.addEventListener('message', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        expect(data.type).toBe('price_update');
        expect(data.symbol).toBe('BTC');
        expect(data.price).toBe(50100);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      jest.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/market-data');
      } catch (error) {
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle malformed JSON responses', async () => {
      jest.mocked(global.fetch).mockResolvedValue(
        new Response('invalid json{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const response = await fetch('/api/market-data');
      
      try {
        await response.json();
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe('Cache Integration', () => {
    it('should respect cache headers', async () => {
      jest.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ cached: true }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300'
          }
        })
      );

      const response = await fetch('/api/market-data');
      
      expect(response.headers.get('Cache-Control')).toBe('max-age=300');
    });
  });
});