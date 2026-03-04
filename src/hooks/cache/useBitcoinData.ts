import { useCache } from './useCache';
import { bitcoinService } from '@/lib/api/bitcoin';
import { cacheTTL } from '@/lib/cache';

/**
 * Hook para dados de Bitcoin com cache integrado
 */
export function useBitcoinPrice() {
  const result = useCache(
    'bitcoin:price:current',
    () => bitcoinService.getPrice(),
    {
      ttl: cacheTTL.BITCOIN_PRICE,
      refreshInterval: 60, // Atualizar a cada minuto
    }
  );

  // Garantir que sempre retornamos um objeto com a estrutura esperada
  return {
    ...result,
    data: result.data || { prices: { USD: 0 }, market_cap: 0, volume_24h: 0, change_24h: 0 }
  };
}

/**
 * Hook para gráfico de mercado com cache
 */
export function useBitcoinChart(days: number = 7) {
  return useCache(
    `bitcoin:chart:${days}days`,
    () => bitcoinService.getMarketChart(days),
    {
      ttl: cacheTTL.BITCOIN_PRICE * 5,
      refreshInterval: 300, // Atualizar a cada 5 minutos
    }
  );
}
