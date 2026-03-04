import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ArbitrageOpportunity {
  id: string;
  type: 'ordinals' | 'runes' | 'rare-sats';
  asset: string;
  collection?: string;
  symbol: string;
  buyMarketplace: string;
  sellMarketplace: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercent: number;
  fees: {
    buyFee: number;
    sellFee: number;
    networkFee: number;
    transferFee: number;
  };
  profitAmount: number;
  profitPercent: number;
  netProfit: number;
  netProfitPercent: number;
  estimatedProfit: number;
  executionTime: number;
  volume24h: number;
  liquidity: string;
  liquidityScore: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  timestamp: Date;
  lastUpdated: number;
  status: 'active' | 'expired' | 'executed' | 'monitoring';
  buyLink: string;
  sellLink: string;
}

export interface ArbitrageMetrics {
  totalOpportunities: number;
  activeOpportunities: number;
  averageSpread: number;
  totalPotentialProfit: number;
  averageExecutionTime: number;
  successRate: number;
  totalExecuted: number;
  totalProfit: number;
}

export interface SpreadHistoryEntry {
  timestamp: string;
  averageSpread: number;
  maxSpread: number;
}

export interface ExchangeData {
  name: string;
  opportunities: number;
  avgSpread: number;
  reliability: number;
  volume: number;
  color: string;
}

interface ArbitrageOptions {
  minSpread?: number;
  maxRisk?: number;
  activeOnly?: boolean;
}

const MARKETPLACE_FEES: Record<string, number> = {
  'Gamma.io': 0.02,
  'Unisat': 0.02,
};

// Estimated average network fee in BTC for a typical runes transaction
const ESTIMATED_NETWORK_FEE = 0.00005;

interface MagicEdenRune {
  rune: string;
  spacedRune?: string;
  symbol?: string;
  floorUnitPrice?: { formatted?: string; value?: number };
  volume?: number;
  volumeChange?: number;
  sales?: number;
  holders?: number;
  listedCount?: number;
  marketCap?: number;
}

interface UniSatRuneInfo {
  runeid: string;
  rune: string;
  spacedRune: string;
  number: number;
  holders: number;
  transactions: number;
  supply: string;
  divisibility: number;
  symbol: string;
}

interface UniSatAuctionItem {
  auctionId: string;
  runeid: string;
  rune: string;
  spacedRune: string;
  unitPrice: string;
  totalPrice: string;
  amount: string;
  status: string;
}

export function useArbitrageOpportunities(_symbol?: string, _options?: ArbitrageOptions) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch Magic Eden rune collection stats (floor prices)
      const meRes = await fetch(
        '/api/magiceden/runes/collection-stats/?limit=20&sortBy=volume&sortDirection=desc&window=1d'
      );

      if (!meRes.ok) {
        throw new Error(`Magic Eden API error: ${meRes.status}`);
      }

      const meData = await meRes.json();
      const meRunes: MagicEdenRune[] = meData.runes || [];

      if (meRunes.length === 0) {
        setOpportunities([]);
        setLoading(false);
        return;
      }

      // Build a map of Magic Eden rune names to their floor prices (in BTC)
      const meFloorPrices = new Map<
        string,
        { price: number; volume: number; rune: string; spacedRune: string }
      >();

      for (const r of meRunes) {
        const floorSats = r.floorUnitPrice?.value;
        if (floorSats && floorSats > 0) {
          // Magic Eden floor is in sats/unit, normalize the rune name for matching
          const normalizedName = (r.rune || '').toUpperCase().replace(/[•·]/g, '');
          meFloorPrices.set(normalizedName, {
            price: floorSats / 1e8, // Convert sats to BTC
            volume: r.volume || 0,
            rune: r.rune || '',
            spacedRune: r.spacedRune || r.rune || '',
          });
        }
      }

      // Fetch UniSat rune list for matching
      let unisatRunes: UniSatRuneInfo[] = [];
      try {
        const usRes = await fetch('/api/unisat/runes/list/?limit=50');
        if (usRes.ok) {
          const usData = await usRes.json();
          unisatRunes = usData.list || usData.data?.list || [];
        }
      } catch {
        // UniSat rune list fetch failed - continue without it
      }

      // Build a map of UniSat rune IDs for matching
      const unisatRuneMap = new Map<string, UniSatRuneInfo>();
      for (const r of unisatRunes) {
        const normalizedName = (r.rune || '').toUpperCase().replace(/[•·]/g, '');
        unisatRuneMap.set(normalizedName, r);
      }

      // For runes that exist on both platforms, fetch UniSat market listings to get floor prices
      const matchedRunes = Array.from(meFloorPrices.keys()).filter((name) =>
        unisatRuneMap.has(name)
      );

      const results: ArbitrageOpportunity[] = [];

      // Fetch UniSat auction prices for matched runes (batch in parallel, max 5 at a time)
      const batchSize = 5;
      for (let i = 0; i < matchedRunes.length; i += batchSize) {
        const batch = matchedRunes.slice(i, i + batchSize);

        const auctionPromises = batch.map(async (normalizedName) => {
          const uniRune = unisatRuneMap.get(normalizedName);
          const meInfo = meFloorPrices.get(normalizedName);
          if (!uniRune || !meInfo) return null;

          try {
            const auctionRes = await fetch(`/api/unisat/market/runes/list/?runeid=${encodeURIComponent(uniRune.runeid)}&sort=priceAsc&limit=1&status=listed`
            );

            if (!auctionRes.ok) return null;

            const auctionData = await auctionRes.json();
            const listings: UniSatAuctionItem[] =
              auctionData.list || auctionData.data?.list || [];

            if (listings.length === 0) return null;

            const cheapestListing = listings[0];
            // UniSat unitPrice is in sats per unit
            const unisatUnitPriceSats = parseFloat(cheapestListing.unitPrice);
            if (isNaN(unisatUnitPriceSats) || unisatUnitPriceSats <= 0) return null;

            const unisatPriceBtc = unisatUnitPriceSats / 1e8;
            const mePriceBtc = meInfo.price;

            // Determine which marketplace is cheaper
            let buyMarketplace: string;
            let sellMarketplace: string;
            let buyPrice: number;
            let sellPrice: number;

            if (unisatPriceBtc < mePriceBtc) {
              buyMarketplace = 'Unisat';
              sellMarketplace = 'Gamma.io';
              buyPrice = unisatPriceBtc;
              sellPrice = mePriceBtc;
            } else {
              buyMarketplace = 'Gamma.io';
              sellMarketplace = 'Unisat';
              buyPrice = mePriceBtc;
              sellPrice = unisatPriceBtc;
            }

            const buyFee = MARKETPLACE_FEES[buyMarketplace];
            const sellFee = MARKETPLACE_FEES[sellMarketplace];
            const networkFee = ESTIMATED_NETWORK_FEE;

            const totalCost = buyPrice * (1 + buyFee) + networkFee;
            const totalRevenue = sellPrice * (1 - sellFee);
            const profitAmount = totalRevenue - totalCost;
            const profitPercent = totalCost > 0 ? (profitAmount / totalCost) * 100 : 0;

            // Determine liquidity based on listed count or volume
            const volume24h = meInfo.volume;
            let liquidity: string;
            if (volume24h > 1) {
              liquidity = 'High';
            } else if (volume24h > 0.1) {
              liquidity = 'Medium';
            } else {
              liquidity = 'Low';
            }

            // Confidence based on volume and spread magnitude
            let confidence: number;
            if (volume24h > 0.5 && Math.abs(profitPercent) < 20) {
              confidence = 0.85;
            } else if (volume24h > 0.1) {
              confidence = 0.7;
            } else {
              confidence = 0.5;
            }

            // Risk level based on profit percent (very high spreads may indicate stale data)
            let riskLevel: 'low' | 'medium' | 'high';
            if (profitPercent > 15) {
              riskLevel = 'high'; // May be stale listing
            } else if (profitPercent > 5) {
              riskLevel = 'medium';
            } else {
              riskLevel = 'low';
            }

            const spacedRune = meInfo.spacedRune || uniRune.spacedRune;

            return {
              id: `arb-${normalizedName}`,
              type: 'runes' as const,
              asset: spacedRune,
              collection: spacedRune,
              symbol: spacedRune,
              buyMarketplace,
              sellMarketplace,
              buyExchange: buyMarketplace,
              sellExchange: sellMarketplace,
              buyPrice,
              sellPrice,
              spread: sellPrice - buyPrice,
              spreadPercent: buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0,
              fees: { buyFee, sellFee, networkFee, transferFee: 0 },
              profitAmount,
              profitPercent,
              netProfit: profitAmount,
              netProfitPercent: profitPercent,
              estimatedProfit: profitAmount,
              executionTime: 0,
              volume24h,
              liquidity,
              liquidityScore: volume24h > 1 ? 0.8 : volume24h > 0.1 ? 0.5 : 0.2,
              confidence,
              riskLevel,
              riskScore: riskLevel === 'high' ? 0.8 : riskLevel === 'medium' ? 0.5 : 0.2,
              timestamp: new Date(),
              lastUpdated: Date.now(),
              status: 'active' as const,
              buyLink:
                buyMarketplace === 'Unisat'
                  ? `https://unisat.io/runes/market?tick=${encodeURIComponent(uniRune.rune)}`
                  : `https://gamma.io/ordinals/collections/${encodeURIComponent(meInfo.rune)}`,
              sellLink:
                sellMarketplace === 'Unisat'
                  ? `https://unisat.io/runes/market?tick=${encodeURIComponent(uniRune.rune)}`
                  : `https://gamma.io/ordinals/collections/${encodeURIComponent(meInfo.rune)}`,
            };
          } catch {
            return null;
          }
        });

        const batchResults = await Promise.all(auctionPromises);
        for (const result of batchResults) {
          if (result) {
            results.push(result);
          }
        }
      }

      // Sort by profit percent descending, show all real spreads
      results.sort((a, b) => b.profitPercent - a.profitPercent);
      setOpportunities(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useArbitrageOpportunities] Error:', message);
      setError(message);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetchOpportunities();

    // Refresh every 60 seconds
    const interval = setInterval(fetchOpportunities, 60000);
    return () => clearInterval(interval);
  }, [fetchOpportunities]);

  return {
    opportunities,
    loading,
    error,
    refresh,
  };
}
