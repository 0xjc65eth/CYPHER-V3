import { useState, useEffect } from 'react';

interface MarketplaceFees {
  [marketplace: string]: number;
}

export function useMarketplaceFees() {
  const [fees, setFees] = useState<MarketplaceFees>({
    'Gamma.io': 0.025,      // 2.5%
    'OrdSwap': 0.021,        // 2.1%
    'Gamma': 0.015,          // 1.5%
    'Unisat': 0.02,          // 2.0%
    'OKX': 0.01,             // 1.0%
    'Ordinals Wallet': 0.025, // 2.5%
    'Ordinals Market': 0.03,  // 3.0%
    'Inscribe Now': 0.029,    // 2.9%
  });

  const [loading, setLoading] = useState(false);

  // In a real app, this would fetch from an API
  useEffect(() => {
    // Fees are relatively static, but could be updated from API
    setLoading(false);
  }, []);

  return {
    fees,
    loading,
    getFee: (marketplace: string) => fees[marketplace] || 0.025
  };
}