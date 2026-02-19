'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useBitcoinPrice } from '@/hooks/cache';
import { devLogger } from '@/lib/logger';

interface PriceAlert {
  id: string;
  price: number;
  direction: 'above' | 'below';
  triggered: boolean;
}

// Hook para monitorar preço e disparar alertas
export function usePriceAlerts() {
  const { addNotification, settings } = useNotifications();
  const { data: btcPrice } = useBitcoinPrice();

  useEffect(() => {
    if (!btcPrice || !settings.priceAlerts) return;

    // Check stored price alerts
    const alertsJson = localStorage.getItem('priceAlerts');
    if (!alertsJson) return;

    const alerts: PriceAlert[] = JSON.parse(alertsJson);
    const updatedAlerts = alerts.map(alert => {
      if (alert.triggered) return alert;

      const shouldTrigger = 
        (alert.direction === 'above' && btcPrice.price >= alert.price) ||
        (alert.direction === 'below' && btcPrice.price <= alert.price);

      if (shouldTrigger) {
        addNotification({
          type: 'price',
          title: 'Price Alert Triggered!',
          message: `Bitcoin is now ${alert.direction} $${alert.price.toLocaleString()} at $${btcPrice.price.toLocaleString()}`,
          action: {
            label: 'View Market',
            onClick: () => window.location.href = '/market',
          },
        });

        devLogger.log('PRICE_ALERT', `Alert triggered: BTC ${alert.direction} $${alert.price}`);
        return { ...alert, triggered: true };
      }

      return alert;
    });

    // Update alerts in storage
    localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
  }, [btcPrice, addNotification, settings.priceAlerts]);
}
// Hook para monitorar oportunidades de arbitragem
export function useArbitrageAlerts() {
  const { addNotification, settings } = useNotifications();

  useEffect(() => {
    if (!settings.arbitrageAlerts) return;

    // Check real arbitrage opportunities from API
    const checkArbitrage = async () => {
      try {
        const res = await fetch('/api/arbitrage/opportunities/');
        if (!res.ok) return;
        const data = await res.json();
        const opportunities = data.opportunities || data || [];

        // Only notify for significant opportunities (>0.5% profit)
        for (const opp of opportunities) {
          if (opp.profitPercent > 0.5) {
            addNotification({
              type: 'arbitrage',
              title: 'Arbitrage Opportunity Detected!',
              message: `${opp.profitPercent.toFixed(2)}% profit between ${opp.exchange1 || opp.buyExchange} and ${opp.exchange2 || opp.sellExchange}`,
              data: opp,
              action: {
                label: 'View Details',
                onClick: () => window.location.href = '/arbitrage',
              },
            });

            devLogger.log('ARBITRAGE', 'New opportunity detected', opp);
            break; // Only notify for the best opportunity per check
          }
        }
      } catch {
        // Silently fail - arbitrage API may not be available
      }
    };

    const interval = setInterval(checkArbitrage, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [addNotification, settings.arbitrageAlerts]);
}

// Hook para neural insights
export function useNeuralInsights() {
  const { addNotification, settings } = useNotifications();

  useEffect(() => {
    if (!settings.neuralInsights) return;

    // Neural insights are generated server-side; this hook is a placeholder
    // until the neural insight API endpoint is available.
    // No fake random insights are generated.
    devLogger.log('NEURAL', 'Neural insights hook active - waiting for API integration');

    // Placeholder: no interval needed until real API is available
    return () => {};
  }, [addNotification, settings.neuralInsights]);
}