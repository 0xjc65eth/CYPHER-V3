/**
 * usePortfolio Hook Tests
 * Tests data fetching, mapping, error handling, and edge cases.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePortfolio } from '../usePortfolio';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Suppress console.error in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  mockFetch.mockReset();
});

function mockFetchSuccess(data: Record<string, unknown>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'Server error' }),
  });
}

const FULL_RESPONSE = {
  btc: { amount: 1.5, value: 142500 },
  ordinals: { count: 10, value: 25000 },
  runes: { count: 5, value: 8000 },
  rareSats: { count: 3, value: 1500 },
  recentTransactions: [
    { type: 'Received', amount: '0.5 BTC', valueUSD: 47500, date: '2026-03-01' },
    { type: 'Sent', amount: '0.1 BTC', valueUSD: 9500, date: '2026-02-28' },
  ],
};

describe('usePortfolio', () => {
  // =========================================
  // Basic fetch behavior
  // =========================================
  describe('fetching', () => {
    it('should start in loading state', () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should fetch data on mount with correct URL', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      renderHook(() => usePortfolio('bc1qtest123'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/portfolio/data/?address=bc1qtest123');
      });
    });

    it('should set data and stop loading on success', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when address is empty', async () => {
      const { result } = renderHook(() => usePortfolio(''));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
    });
  });

  // =========================================
  // Data mapping (mapPortfolioData)
  // =========================================
  describe('data mapping', () => {
    it('should calculate totalValue as sum of all asset values', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      // 142500 + 25000 + 8000 + 1500 = 177000
      expect(result.current.data!.totalValue).toBe(177000);
    });

    it('should map btc data correctly', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.btc.amount).toBe(1.5);
      expect(result.current.data!.btc.value).toBe(142500);
    });

    it('should map ordinals data correctly', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.ordinals.count).toBe(10);
      expect(result.current.data!.ordinals.value).toBe(25000);
    });

    it('should map runes data correctly', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.runes.count).toBe(5);
      expect(result.current.data!.runes.value).toBe(8000);
    });

    it('should map rareSats data correctly', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.rareSats.count).toBe(3);
      expect(result.current.data!.rareSats.value).toBe(1500);
    });

    it('should map recentTransactions correctly', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.recentTransactions).toHaveLength(2);
      expect(result.current.data!.recentTransactions[0].type).toBe('Received');
    });
  });

  // =========================================
  // Null/undefined handling in mapping
  // =========================================
  describe('null and missing data handling', () => {
    it('should default btc to zeros when missing', async () => {
      mockFetchSuccess({});
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.btc.amount).toBe(0);
      expect(result.current.data!.btc.value).toBe(0);
    });

    it('should default ordinals to zeros when missing', async () => {
      mockFetchSuccess({});
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.ordinals.count).toBe(0);
      expect(result.current.data!.ordinals.value).toBe(0);
    });

    it('should default runes to zeros when missing', async () => {
      mockFetchSuccess({});
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.runes.count).toBe(0);
      expect(result.current.data!.runes.value).toBe(0);
    });

    it('should default rareSats to zeros when missing', async () => {
      mockFetchSuccess({});
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.rareSats.count).toBe(0);
      expect(result.current.data!.rareSats.value).toBe(0);
    });

    it('should default recentTransactions to empty array when missing', async () => {
      mockFetchSuccess({});
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.recentTransactions).toEqual([]);
    });

    it('should default recentTransactions to empty array when not an array', async () => {
      mockFetchSuccess({ recentTransactions: 'not-an-array' });
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.recentTransactions).toEqual([]);
    });

    it('should compute totalValue as 0 when all values are missing', async () => {
      mockFetchSuccess({});
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data!.totalValue).toBe(0);
    });
  });

  // =========================================
  // Error handling
  // =========================================
  describe('error handling', () => {
    it('should set error on HTTP error response', async () => {
      mockFetchError(500);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toContain('500');
    });

    it('should set error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toBe('Network error');
    });

    it('should wrap non-Error throws in Error', async () => {
      mockFetch.mockRejectedValueOnce('string error');
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toBe('Failed to fetch portfolio data');
    });

    it('should set data to null on error', async () => {
      mockFetchError(500);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  // =========================================
  // Refetch
  // =========================================
  describe('refetch', () => {
    it('should provide a refetch function', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      mockFetchSuccess(FULL_RESPONSE);
      const { result } = renderHook(() => usePortfolio('bc1qtest'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedResponse = {
        ...FULL_RESPONSE,
        btc: { amount: 2.0, value: 190000 },
      };
      mockFetchSuccess(updatedResponse);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data!.btc.amount).toBe(2.0);
      expect(result.current.data!.btc.value).toBe(190000);
    });
  });
});
