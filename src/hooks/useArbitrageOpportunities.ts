import { useState, useEffect, useCallback } from 'react';

interface ArbitrageOpportunity {
  id: string;
  type: 'ordinals' | 'runes' | 'rare-sats';
  asset: string;
  collection?: string;
  buyMarketplace: string;
  sellMarketplace: string;
  buyPrice: number;
  sellPrice: number;
  fees: {
    buyFee: number;
    sellFee: number;
    networkFee: number;
  };
  profitAmount: number;
  profitPercent: number;
  volume24h: number;
  liquidity: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  buyLink: string;
  sellLink: string;
}

const MARKETPLACE_FEES: Record<string, number> = {
  'Magic Eden': 0.025,
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

export function useArbitrageOpportunities() {
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
              sellMarketplace = 'Magic Eden';
              buyPrice = unisatPriceBtc;
              sellPrice = mePriceBtc;
            } else {
              buyMarketplace = 'Magic Eden';
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
              buyMarketplace,
              sellMarketplace,
              buyPrice,
              sellPrice,
              fees: { buyFee, sellFee, networkFee },
              profitAmount,
              profitPercent,
              volume24h,
              liquidity,
              confidence,
              riskLevel,
              timestamp: new Date(),
              buyLink:
                buyMarketplace === 'Unisat'
                  ? `https://unisat.io/runes/market?tick=${encodeURIComponent(uniRune.rune)}`
                  : `https://magiceden.io/runes/${encodeURIComponent(meInfo.rune)}`,
              sellLink:
                sellMarketplace === 'Unisat'
                  ? `https://unisat.io/runes/market?tick=${encodeURIComponent(uniRune.rune)}`
                  : `https://magiceden.io/runes/${encodeURIComponent(meInfo.rune)}`,
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
