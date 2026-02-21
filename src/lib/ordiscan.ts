import { cacheService, cacheTTL } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

// Função para buscar dados da API do Ordiscan
export async function fetchOrdiscanData(endpoint: string) {
  const cacheKey = `ordiscan:${endpoint.replace(/\//g, ':')}`;
  
  return await cacheService.getOrCompute(
    cacheKey,
    async () => {
      try {
        // During development, return fallback data
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Ordiscan] Development mode - returning fallback data for ${endpoint}`);
          return getFallbackData(endpoint);
        }

        const apiKey = process.env.ORDISCAN_API_KEY;
        if (!apiKey) {
          console.warn(`[Ordiscan] No API key configured - returning fallback data for ${endpoint}`);
          return getFallbackData(endpoint);
        }

        devLogger.log('API', `Fetching from Ordiscan: ${endpoint}`);
        const response = await fetch(`https://api.ordiscan.com${endpoint}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          console.error(`API error: ${response.status}`);
          console.warn(`[Ordiscan] API error ${response.status} - returning fallback data for ${endpoint}`);
          return getFallbackData(endpoint);
        }

        return await response.json();
      } catch (error) {
        devLogger.error(error as Error, `Error fetching data from Ordiscan API: ${endpoint}`);
        console.warn(`[Ordiscan] API fetch failed - returning fallback data for ${endpoint}`);
        return getFallbackData(endpoint);
      }
    },
    endpoint.includes('ordinals') ? cacheTTL.ordinals : cacheTTL.default
  );
}

// Return fallback data with isFallback flag when the API is not available
function getFallbackData(endpoint: string) {
  const fallbackData: Record<string, any> = {
    '/price': {
      price: 0,
      change_24h: 0,
      isFallback: true,
    },
    '/mempool': {
      pending_transactions: 0,
      average_fee_rate: 0,
      isFallback: true,
    },
    '/mining': {
      hash_rate: 0,
      difficulty: 0,
      block_time: 0,
      isFallback: true,
    },
    '/ordinals': {
      total_inscriptions: 0,
      volume_24h: 0,
      floor_price: 0,
      popular_collections: [],
      isFallback: true,
    },
    '/runes': {
      volume_24h: 0,
      active_runes: [],
      isFallback: true,
    },
  };

  return fallbackData[endpoint] || { isFallback: true };
}