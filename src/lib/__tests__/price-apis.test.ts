/**
 * Price APIs Tests
 * Tests for real-time price fetching from Binance, Hiro, UniSat, and OKX
 */

let priceApis: typeof import('@/lib/price-apis');

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as unknown as Response;
}

function errorResponse(status = 500): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => '',
    headers: new Headers(),
  } as unknown as Response;
}

/**
 * Route fetch mock calls by URL pattern so parallel promises
 * don't consume each other's responses.
 */
function routeFetch(routes: Record<string, Response | Error>) {
  mockFetch.mockImplementation((url: string) => {
    for (const [pattern, response] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        if (response instanceof Error) return Promise.reject(response);
        return Promise.resolve(response);
      }
    }
    // Default: return a valid BTC price (many functions call fetchBTCPrice internally)
    return Promise.resolve(okResponse({ price: '95000.00' }));
  });
}

// Re-import to reset module-level BTC price cache
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  priceApis = require('@/lib/price-apis');
});

// ---------------------------------------------------------------------------
// fetchBTCPrice
// ---------------------------------------------------------------------------

describe('fetchBTCPrice', () => {
  it('should return BTC price from Binance', async () => {
    routeFetch({ 'binance.com': okResponse({ price: '95420.50' }) });
    const price = await priceApis.fetchBTCPrice();
    expect(price).toBe(95420.5);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
      expect.any(Object),
    );
  });

  it('should parse price string to number', async () => {
    routeFetch({ 'binance.com': okResponse({ price: '100123.99' }) });
    const price = await priceApis.fetchBTCPrice();
    expect(typeof price).toBe('number');
    expect(price).toBe(100123.99);
  });

  it('should return fallback 100000 when fetch fails and no cache', async () => {
    routeFetch({ 'binance.com': new Error('Network error') });
    const price = await priceApis.fetchBTCPrice();
    expect(price).toBe(100000);
  });

  it('should return cached price on second call within TTL', async () => {
    routeFetch({ 'binance.com': okResponse({ price: '88000.00' }) });
    const first = await priceApis.fetchBTCPrice();
    expect(first).toBe(88000);

    // Change mock — but cache is still valid (60s TTL)
    routeFetch({ 'binance.com': okResponse({ price: '99000.00' }) });
    const second = await priceApis.fetchBTCPrice();
    expect(second).toBe(88000); // cached
  });

  it('should handle non-ok response and return fallback', async () => {
    routeFetch({ 'binance.com': errorResponse(500) });
    const price = await priceApis.fetchBTCPrice();
    expect(price).toBe(100000);
  });
});

// ---------------------------------------------------------------------------
// fetchMarketCollection (Hiro API)
// ---------------------------------------------------------------------------

describe('fetchMarketCollection', () => {
  it('should fetch and transform Hiro collection data', async () => {
    routeFetch({
      'hiro.so/ordinals': okResponse({
        name: 'NodeMonkes',
        floor_price: '5000000',
        volume_24h: '100000000',
        inscription_count: 10000,
        listed_count: 500,
        owner_count: 3000,
      }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchMarketCollection('nodemonkes');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('nodemonkes');
    expect(result!.name).toBe('NodeMonkes');
    expect(result!.floorPrice).toBe(0.05);
    expect(result!.floorPriceUSD).toBeCloseTo(0.05 * 95000);
    expect(result!.volume24h).toBe(1);
    expect(result!.totalSupply).toBe(10000);
    expect(result!.listedSupply).toBe(500);
    expect(result!.holders).toBe(3000);
    expect(result!.source).toBe('gamma');
  });

  it('should return null on non-ok response', async () => {
    routeFetch({ 'hiro.so': errorResponse(404) });
    const result = await priceApis.fetchMarketCollection('nonexistent');
    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    routeFetch({ 'hiro.so': new Error('Network error') });
    const result = await priceApis.fetchMarketCollection('nodemonkes');
    expect(result).toBeNull();
  });

  it('should handle missing floor_price gracefully', async () => {
    routeFetch({
      'hiro.so': okResponse({
        name: 'Empty Collection',
        floor_price: null,
        volume_24h: null,
        inscription_count: 0,
      }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchMarketCollection('empty');
    expect(result).not.toBeNull();
    expect(result!.floorPrice).toBe(0);
    expect(result!.floorPriceUSD).toBe(0);
    expect(result!.volume24h).toBe(0);
  });

  it('should use collection symbol as fallback name when name missing', async () => {
    routeFetch({
      'hiro.so': okResponse({ floor_price: '1000000', inscription_count: 5 }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchMarketCollection('my-collection');
    expect(result!.name).toBe('my-collection');
  });
});

// ---------------------------------------------------------------------------
// fetchMarketListings
// ---------------------------------------------------------------------------

describe('fetchMarketListings', () => {
  it('should return inscriptions array from Hiro', async () => {
    routeFetch({
      'hiro.so': okResponse({
        results: [{ id: 'abc123i0' }, { id: 'def456i0' }],
      }),
    });

    const listings = await priceApis.fetchMarketListings('nodemonkes', 10);
    expect(listings).toHaveLength(2);
    expect(listings[0].id).toBe('abc123i0');
  });

  it('should return empty array on error', async () => {
    routeFetch({ 'hiro.so': new Error('timeout') });
    const listings = await priceApis.fetchMarketListings('nodemonkes');
    expect(listings).toEqual([]);
  });

  it('should return empty array on non-ok response', async () => {
    routeFetch({ 'hiro.so': errorResponse(500) });
    const listings = await priceApis.fetchMarketListings('nodemonkes');
    expect(listings).toEqual([]);
  });

  it('should handle missing results field', async () => {
    routeFetch({ 'hiro.so': okResponse({}) });
    const listings = await priceApis.fetchMarketListings('nodemonkes');
    expect(listings).toEqual([]);
  });

  it('should use default limit of 20', async () => {
    routeFetch({ 'hiro.so': okResponse({ results: [] }) });
    await priceApis.fetchMarketListings('test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
      expect.any(Object),
    );
  });
});

// ---------------------------------------------------------------------------
// fetchUnisatBRC20Info
// ---------------------------------------------------------------------------

describe('fetchUnisatBRC20Info', () => {
  it('should fetch and transform BRC-20 token info', async () => {
    routeFetch({
      'unisat.io': okResponse({ code: 0, data: { holdersCount: 15000 } }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchUnisatBRC20Info('ordi');
    expect(result).not.toBeNull();
    expect(result!.ticker).toBe('ORDI');
    expect(result!.holders).toBe(15000);
    expect(result!.source).toBe('unisat');
    expect(result!.timestamp).toBeGreaterThan(0);
  });

  it('should return null when code is not 0', async () => {
    routeFetch({
      'unisat.io': okResponse({ code: -1, msg: 'not found' }),
    });
    const result = await priceApis.fetchUnisatBRC20Info('nonexistent');
    expect(result).toBeNull();
  });

  it('should return null on 404', async () => {
    routeFetch({ 'unisat.io': errorResponse(404) });
    const result = await priceApis.fetchUnisatBRC20Info('fake');
    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    routeFetch({ 'unisat.io': new Error('Network error') });
    const result = await priceApis.fetchUnisatBRC20Info('ordi');
    expect(result).toBeNull();
  });

  it('should uppercase the ticker', async () => {
    routeFetch({
      'unisat.io': okResponse({ code: 0, data: { holdersCount: 100 } }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchUnisatBRC20Info('sats');
    expect(result!.ticker).toBe('SATS');
  });

  it('should return null when data is missing', async () => {
    routeFetch({
      'unisat.io': okResponse({ code: 0, data: null }),
    });
    const result = await priceApis.fetchUnisatBRC20Info('test');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchUnisatBRC20List
// ---------------------------------------------------------------------------

describe('fetchUnisatBRC20List', () => {
  it('should return list of BRC-20 tokens', async () => {
    routeFetch({
      'unisat.io': okResponse({
        code: 0,
        data: {
          detail: [
            { ticker: 'ordi', holdersCount: 15000 },
            { ticker: 'sats', holdersCount: 50000 },
          ],
        },
      }),
    });

    const list = await priceApis.fetchUnisatBRC20List(0, 10);
    expect(list).toHaveLength(2);
    expect(list[0].ticker).toBe('ordi');
  });

  it('should return empty array on error', async () => {
    routeFetch({ 'unisat.io': new Error('timeout') });
    const list = await priceApis.fetchUnisatBRC20List();
    expect(list).toEqual([]);
  });

  it('should return empty array when code is not 0', async () => {
    routeFetch({ 'unisat.io': okResponse({ code: -1 }) });
    const list = await priceApis.fetchUnisatBRC20List();
    expect(list).toEqual([]);
  });

  it('should return empty array on non-ok response', async () => {
    routeFetch({ 'unisat.io': errorResponse(429) });
    const list = await priceApis.fetchUnisatBRC20List();
    expect(list).toEqual([]);
  });

  it('should return empty array when data.detail is missing', async () => {
    routeFetch({ 'unisat.io': okResponse({ code: 0, data: {} }) });
    const list = await priceApis.fetchUnisatBRC20List();
    expect(list).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchOKXCollection
// ---------------------------------------------------------------------------

describe('fetchOKXCollection', () => {
  it('should fetch and transform OKX collection data', async () => {
    routeFetch({
      'okx.com': okResponse({
        code: '0',
        data: {
          name: 'Bitcoin Puppets',
          floorPrice: '0.035',
          volume24h: '2.5',
          volumeChange24h: '10.5',
          totalSupply: '10000',
          listedCount: '200',
          holders: '5000',
        },
      }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchOKXCollection('bitcoin-puppets');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Bitcoin Puppets');
    expect(result!.floorPrice).toBe(0.035);
    expect(result!.floorPriceUSD).toBeCloseTo(0.035 * 95000);
    expect(result!.volume24h).toBe(2.5);
    expect(result!.volumeChange24h).toBe(10.5);
    expect(result!.totalSupply).toBe(10000);
    expect(result!.listedSupply).toBe(200);
    expect(result!.holders).toBe(5000);
    expect(result!.source).toBe('okx');
  });

  it('should return null when OKX code is not 0', async () => {
    routeFetch({
      'okx.com': okResponse({ code: '50000', msg: 'System error' }),
    });
    const result = await priceApis.fetchOKXCollection('test');
    expect(result).toBeNull();
  });

  it('should return null on non-ok response', async () => {
    routeFetch({ 'okx.com': errorResponse(500) });
    const result = await priceApis.fetchOKXCollection('test');
    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    routeFetch({ 'okx.com': new Error('Network error') });
    const result = await priceApis.fetchOKXCollection('test');
    expect(result).toBeNull();
  });

  it('should handle missing data field', async () => {
    routeFetch({
      'okx.com': okResponse({ code: '0', data: null }),
    });
    const result = await priceApis.fetchOKXCollection('test');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchOKXRunesMarketData
// ---------------------------------------------------------------------------

describe('fetchOKXRunesMarketData', () => {
  it('should fetch and transform Runes market data', async () => {
    routeFetch({
      'okx.com': okResponse({
        code: '0',
        data: {
          symbol: 'DOG',
          floorPrice: '0.00001',
          volume24h: '5.2',
          marketCap: '500000',
          holders: '12000',
          supply: '100000000000',
        },
      }),
    });

    const result = await priceApis.fetchOKXRunesMarketData('DOG•GO•TO•THE•MOON');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('DOG•GO•TO•THE•MOON');
    expect(result!.symbol).toBe('DOG');
    expect(result!.floorPrice).toBe(0.00001);
    expect(result!.volume24h).toBe(5.2);
    expect(result!.marketCap).toBe(500000);
    expect(result!.holders).toBe(12000);
    expect(result!.supply).toBe('100000000000');
    expect(result!.source).toBe('okx');
  });

  it('should return null when OKX code is not 0', async () => {
    routeFetch({
      'okx.com': okResponse({ code: '50000', msg: 'error' }),
    });
    const result = await priceApis.fetchOKXRunesMarketData('TEST');
    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    routeFetch({ 'okx.com': new Error('Network error') });
    const result = await priceApis.fetchOKXRunesMarketData('TEST');
    expect(result).toBeNull();
  });

  it('should return null on non-ok response', async () => {
    routeFetch({ 'okx.com': errorResponse(403) });
    const result = await priceApis.fetchOKXRunesMarketData('TEST');
    expect(result).toBeNull();
  });

  it('should handle missing optional fields with null/defaults', async () => {
    routeFetch({
      'okx.com': okResponse({
        code: '0',
        data: { holders: '0' },
      }),
    });
    const result = await priceApis.fetchOKXRunesMarketData('EMPTY•RUNE');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('');
    expect(result!.floorPrice).toBeNull();
    expect(result!.supply).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// fetchAggregatedPrice
// ---------------------------------------------------------------------------

describe('fetchAggregatedPrice', () => {
  it('should aggregate BRC-20 data from UniSat', async () => {
    routeFetch({
      'unisat.io': okResponse({ code: 0, data: { holdersCount: 5000 } }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchAggregatedPrice('ordi', 'brc20');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('unisat');
  });

  it('should aggregate ordinals data from Hiro/Gamma', async () => {
    routeFetch({
      'hiro.so': okResponse({
        name: 'NodeMonkes',
        floor_price: '5000000',
        volume_24h: '100000000',
        inscription_count: 10000,
      }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchAggregatedPrice('nodemonkes', 'ordinals');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('gamma');
    expect(result!.price).toBe(0.05);
  });

  it('should return null when BRC-20 source fails', async () => {
    routeFetch({
      'unisat.io': errorResponse(404),
    });
    const result = await priceApis.fetchAggregatedPrice('nonexistent', 'brc20');
    expect(result).toBeNull();
  });

  it('should return null for runes type (no runes handler)', async () => {
    const result = await priceApis.fetchAggregatedPrice('test', 'runes');
    expect(result).toBeNull();
  });

  it('should calculate marketCap from floorPrice * totalSupply for ordinals', async () => {
    routeFetch({
      'hiro.so': okResponse({
        name: 'Test',
        floor_price: '10000000', // 0.1 BTC
        volume_24h: '0',
        inscription_count: 1000,
      }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const result = await priceApis.fetchAggregatedPrice('test', 'ordinals');
    expect(result).not.toBeNull();
    expect(result!.marketCap).toBeCloseTo(0.1 * 1000);
  });
});

// ---------------------------------------------------------------------------
// fetchMultipleCollections (batch)
// ---------------------------------------------------------------------------

describe('fetchMultipleCollections', () => {
  it('should fetch collections and return a Map', async () => {
    routeFetch({
      'hiro.so': okResponse({
        name: 'Collection',
        floor_price: '5000000',
        volume_24h: '50000000',
        inscription_count: 10000,
      }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const results = await priceApis.fetchMultipleCollections(['col1']);
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(1);
    expect(results.get('col1')!.name).toBe('Collection');
  });

  it('should handle empty input', async () => {
    const results = await priceApis.fetchMultipleCollections([]);
    expect(results.size).toBe(0);
  });

  it('should fallback to OKX when Hiro fails', async () => {
    // Hiro fails but OKX succeeds
    let callCount = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('hiro.so')) {
        return Promise.resolve(errorResponse(500));
      }
      if (url.includes('okx.com')) {
        return Promise.resolve(
          okResponse({
            code: '0',
            data: {
              name: 'OKX Collection',
              floorPrice: '0.05',
              volume24h: '1.0',
              volumeChange24h: '5.0',
              totalSupply: '100',
              listedCount: '10',
              holders: '50',
            },
          }),
        );
      }
      if (url.includes('binance.com')) {
        return Promise.resolve(okResponse({ price: '95000.00' }));
      }
      return Promise.resolve(okResponse({}));
    });

    const results = await priceApis.fetchMultipleCollections(['test']);
    expect(results.size).toBe(1);
    expect(results.get('test')!.source).toBe('okx');
  });

  it('should not crash when all sources fail', async () => {
    routeFetch({
      'hiro.so': errorResponse(500),
      'okx.com': errorResponse(500),
    });

    const results = await priceApis.fetchMultipleCollections(['bad1', 'bad2']);
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchMultipleBRC20Tokens (batch)
// ---------------------------------------------------------------------------

describe('fetchMultipleBRC20Tokens', () => {
  it('should fetch BRC-20 tokens and return a Map keyed by uppercase ticker', async () => {
    routeFetch({
      'unisat.io': okResponse({ code: 0, data: { holdersCount: 15000 } }),
      'binance.com': okResponse({ price: '95000.00' }),
    });

    const results = await priceApis.fetchMultipleBRC20Tokens(['ordi']);
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(1);
    expect(results.get('ORDI')!.holders).toBe(15000);
  });

  it('should handle empty input', async () => {
    const results = await priceApis.fetchMultipleBRC20Tokens([]);
    expect(results.size).toBe(0);
  });

  it('should skip tokens that fail without crashing', async () => {
    routeFetch({
      'unisat.io': errorResponse(500),
    });

    const results = await priceApis.fetchMultipleBRC20Tokens(['bad']);
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe('formatBTC', () => {
  it('should convert satoshis to BTC string with 8 decimals', () => {
    expect(priceApis.formatBTC(100000000)).toBe('1.00000000');
    expect(priceApis.formatBTC(5000000)).toBe('0.05000000');
    expect(priceApis.formatBTC(546)).toBe('0.00000546');
    expect(priceApis.formatBTC(0)).toBe('0.00000000');
  });

  it('should handle large values', () => {
    expect(priceApis.formatBTC(2100000000000000)).toBe('21000000.00000000');
  });
});

describe('formatUSD', () => {
  it('should format as USD currency', () => {
    expect(priceApis.formatUSD(95420.5)).toBe('$95,420.50');
    expect(priceApis.formatUSD(0)).toBe('$0.00');
    expect(priceApis.formatUSD(1234567.89)).toBe('$1,234,567.89');
  });

  it('should handle negative values', () => {
    expect(priceApis.formatUSD(-100)).toBe('-$100.00');
  });

  it('should handle very small values', () => {
    expect(priceApis.formatUSD(0.01)).toBe('$0.01');
  });
});

describe('calculatePriceChange', () => {
  it('should calculate positive change percentage', () => {
    expect(priceApis.calculatePriceChange(100, 110)).toBeCloseTo(10);
  });

  it('should calculate negative change percentage', () => {
    expect(priceApis.calculatePriceChange(100, 90)).toBeCloseTo(-10);
  });

  it('should return 0 when old price is 0', () => {
    expect(priceApis.calculatePriceChange(0, 100)).toBe(0);
  });

  it('should return 0 for no change', () => {
    expect(priceApis.calculatePriceChange(50, 50)).toBe(0);
  });

  it('should handle decimal prices', () => {
    expect(priceApis.calculatePriceChange(0.05, 0.055)).toBeCloseTo(10);
  });

  it('should handle 100% loss', () => {
    expect(priceApis.calculatePriceChange(100, 0)).toBeCloseTo(-100);
  });
});
