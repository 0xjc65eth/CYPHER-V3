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

// Settings interface for alert preferences (stored in localStorage)
interface AlertSettings {
  priceAlerts: boolean;
  arbitrageAlerts: boolean;
  neuralInsights: boolean;
}

function getAlertSettings(): AlertSettings {
  try {
    const stored = localStorage.getItem('alertSettings');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { priceAlerts: true, arbitrageAlerts: true, neuralInsights: true };
}

// Hook para monitorar preco e disparar alertas
export function usePriceAlerts() {
  const { addNotification } = useNotifications();
  const { data: btcPrice } = useBitcoinPrice();

  useEffect(() => {
    const settings = getAlertSettings();
    if (!btcPrice || !settings.priceAlerts) return;

    const price = (btcPrice as any)?.price ?? (btcPrice as any)?.prices?.USD ?? 0;
    if (!price) return;

    // Check stored price alerts
    const alertsJson = localStorage.getItem('priceAlerts');
    if (!alertsJson) return;

    const alerts: PriceAlert[] = JSON.parse(alertsJson);
    const updatedAlerts = alerts.map(alert => {
      if (alert.triggered) return alert;

      const shouldTrigger =
        (alert.direction === 'above' && price >= alert.price) ||
        (alert.direction === 'below' && price <= alert.price);

      if (shouldTrigger) {
        addNotification({
          type: 'info',
          title: 'Price Alert Triggered!',
          message: `Bitcoin is now ${alert.direction} $${alert.price.toLocaleString()} at $${price.toLocaleString()}`,
        } as any);

        devLogger.log('PRICE_ALERT', `Alert triggered: BTC ${alert.direction} $${alert.price}`);
        return { ...alert, triggered: true };
      }

      return alert;
    });

    // Update alerts in storage
    localStorage.setItem('priceAlerts', JSON.stringify(updatedAlerts));
  }, [btcPrice, addNotification]);
}
// Hook para monitorar oportunidades de arbitragem
export function useArbitrageAlerts() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const settings = getAlertSettings();
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
              type: 'info',
              title: 'Arbitrage Opportunity Detected!',
              message: `${opp.profitPercent.toFixed(2)}% profit between ${opp.exchange1 || opp.buyExchange} and ${opp.exchange2 || opp.sellExchange}`,
            } as any);

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
  }, [addNotification]);
}

// Hook para neural insights
export function useNeuralInsights() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const settings = getAlertSettings();
    if (!settings.neuralInsights) return;

    // Neural insights are generated server-side; this hook is a placeholder
    // until the neural insight API endpoint is available.
    // No fake random insights are generated.
    devLogger.log('NEURAL', 'Neural insights hook active - waiting for API integration');

    // Placeholder: no interval needed until real API is available
    return () => {};
  }, [addNotification]);
}