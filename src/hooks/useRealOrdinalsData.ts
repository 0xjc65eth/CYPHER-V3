'use client';

import { useEffect, useState } from 'react';
import { useTradingStore } from '@/stores/trading-store';
import { OrdiscanClient } from '@/services/api/ordiscan-client';
import { HiroClient } from '@/services/api/hiro-client';

interface UseRealOrdinalsDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useRealOrdinalsData = (options: UseRealOrdinalsDataOptions = {}) => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  const { addInscription, addAlert } = useTradingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const ordiscanClient = new OrdiscanClient();
  const hiroClient = new HiroClient();

  const fetchLatestInscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch from Hiro API
      const hiroResponse = await hiroClient.getInscriptions(0, 20);
      
      if (hiroResponse?.results) {
        // Process each inscription
        for (const inscription of hiroResponse.results) {
          const formattedInscription = {
            id: inscription.id,
            number: inscription.number,
            content_type: inscription.content_type,
            content_url: `https://ordinals.com/content/${inscription.id}`,
            collection: inscription.collection || null,
            rarity: determineRarity(inscription.number),
            price: null, // Will be fetched from marketplace
            owner: inscription.address,
            timestamp: new Date(inscription.timestamp).getTime()
          };

          addInscription(formattedInscription);

          // Alert for significant inscriptions
          if (inscription.number < 1000 || inscription.number % 100000 === 0) {
            addAlert({
              type: 'inscription',
              title: 'Significant Inscription',
              message: `Inscription #${inscription.number} discovered`,
              severity: 'success',
              read: false
            });
          }
        }
      }

      // Fetch BRC-20 tokens
      const brc20Response = await hiroClient.getBRC20Tokens();
      if (brc20Response?.results) {
        for (const token of brc20Response.results) {
          if (token.inscription_id) {
            const brc20Inscription = {
              id: token.inscription_id,
              number: token.number || 0,
              content_type: 'text/plain;charset=utf-8',
              content_url: `https://ordinals.com/content/${token.inscription_id}`,
              collection: 'BRC-20',
              rarity: 'brc20',
              price: null,
              owner: token.address || null,
              timestamp: Date.now()
            };
            
            addInscription(brc20Inscription);
          }
        }
      }

    } catch (err) {
      console.error('Error fetching ordinals data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ordinals data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAddressInscriptions = async (address: string) => {
    try {
      const response = await ordiscanClient.getAddressInscriptions(address);
      
      if (response?.inscriptions) {
        for (const inscription of response.inscriptions) {
          const formattedInscription = {
            id: inscription.id,
            number: inscription.num,
            content_type: inscription.content_type,
            content_url: inscription.content_url || `https://ordinals.com/content/${inscription.id}`,
            collection: inscription.collection_name || null,
            rarity: inscription.rarity || 'common',
            price: inscription.listed_price ? parseFloat(inscription.listed_price) : null,
            owner: address,
            timestamp: inscription.created_at || Date.now()
          };

          addInscription(formattedInscription);
        }
      }
    } catch (err) {
      console.error('Error fetching address inscriptions:', err);
    }
  };

  const fetchMarketplaceData = async () => {
    try {
      // Fetch from proxy API routes instead of direct external calls
      const proxyEndpoints = [
        '/api/ordiscan?endpoint=/v1/marketplace/listings&limit=20',
        '/api/hiro-ordinals?limit=20'
      ];

      for (const endpoint of proxyEndpoints) {
        try {
          const response = await fetch(endpoint);

          if (response.ok) {
            const data = await response.json();
            processMarketplaceData(data);
          }
        } catch (err) {
          console.error(`Error fetching from ${endpoint}:`, err);
        }
      }
    } catch (err) {
      console.error('Error fetching marketplace data:', err);
    }
  };

  const processMarketplaceData = (data: any) => {
    if (data?.listings || data?.results) {
      const listings = data.listings || data.results;
      
      for (const listing of listings) {
        if (listing.inscription_id || listing.id) {
          const marketInscription = {
            id: listing.inscription_id || listing.id,
            number: listing.inscription_number || listing.number || 0,
            content_type: listing.content_type || 'image/png',
            content_url: listing.content_url || `https://ordinals.com/content/${listing.inscription_id || listing.id}`,
            collection: listing.collection || null,
            rarity: listing.rarity || 'common',
            price: listing.price ? parseFloat(listing.price) / 100000000 : null, // Convert sats to BTC
            owner: listing.seller || listing.owner || null,
            timestamp: listing.created_at || Date.now()
          };

          addInscription(marketInscription);

          // Alert for new listings
          if (marketInscription.price && marketInscription.price < 0.01) {
            addAlert({
              type: 'inscription',
              title: 'Low Price Alert',
              message: `Inscription #${marketInscription.number} listed for ${marketInscription.price.toFixed(4)} BTC`,
              severity: 'warning',
              read: false
            });
          }
        }
      }
    }
  };

  const determineRarity = (number: number): string => {
    if (number < 100) return 'legendary';
    if (number < 1000) return 'epic';
    if (number < 10000) return 'rare';
    if (number < 100000) return 'uncommon';
    return 'common';
  };

  useEffect(() => {
    // Initial fetch
    fetchLatestInscriptions();
    fetchMarketplaceData();

    // Setup refresh interval if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLatestInscriptions();
        fetchMarketplaceData();
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  return {
    isLoading,
    error,
    refetch: fetchLatestInscriptions,
    fetchAddressInscriptions,
    fetchMarketplaceData
  };
};