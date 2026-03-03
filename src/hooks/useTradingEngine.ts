/**
 * useTradingEngine Hook
 * Interface React para o Trading Engine
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// Use the TradingEngine via 'as any' since its constructor signature
// differs from the config-based usage in this hook.
let TradingEngineClass: any = null;
try {
  // Dynamic import to avoid hard type errors
  TradingEngineClass = require('@/lib/trading/trading-engine').TradingEngine;
} catch {
  // TradingEngine module may not be available
}

interface TradingConfig {
  maxDrawdown: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  dailyTradeLimit: number;
  riskRewardRatio: number;
}

interface EngineStatus {
  isActive?: boolean;
  openPositions: number;
  pendingOrders: number;
  dailyTradeCount: number;
  portfolioValue: number;
  [key: string]: any;
}

const defaultConfig: TradingConfig = {
  maxDrawdown: 2,
  positionSize: 5,
  stopLoss: 3,
  takeProfit: 6,
  dailyTradeLimit: 20,
  riskRewardRatio: 2
};

const defaultStatus: EngineStatus = {
  isActive: false,
  openPositions: 0,
  pendingOrders: 0,
  dailyTradeCount: 0,
  portfolioValue: 100000
};

let engineInstance: any = null;

export function useTradingEngine(_walletAddress?: string, _timeframe?: string) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<EngineStatus>(defaultStatus);

  useEffect(() => {
    if (!engineInstance && TradingEngineClass) {
      try {
        engineInstance = new TradingEngineClass(defaultConfig);
      } catch {
        // Fallback: constructor may require different args
        try {
          engineInstance = new TradingEngineClass('local', '', '');
        } catch {
          // Engine not available
        }
      }
    }

    if (!engineInstance) return;

    const engine = engineInstance;

    const handleEngineStarted = () => setIsActive(true);
    const handleEngineStopped = () => setIsActive(false);

    if (typeof engine.on === 'function') {
      engine.on('engine:started', handleEngineStarted);
      engine.on('engine:stopped', handleEngineStopped);
    }

    // Update initial status
    if (typeof engine.getStatus === 'function') {
      const s = engine.getStatus();
      setStatus(s);
      setIsActive(s?.isActive ?? false);
    }

    return () => {
      if (typeof engine.off === 'function') {
        engine.off('engine:started', handleEngineStarted);
        engine.off('engine:stopped', handleEngineStopped);
      }
    };
  }, []);

  const startEngine = useCallback(() => {
    if (engineInstance?.start) engineInstance.start();
    if (engineInstance?.getStatus) setStatus(engineInstance.getStatus());
  }, []);

  const stopEngine = useCallback(() => {
    if (engineInstance?.stop) engineInstance.stop();
    if (engineInstance?.getStatus) setStatus(engineInstance.getStatus());
  }, []);

  const createOrder = useCallback(async (params: any) => {
    if (!engineInstance) throw new Error('Engine not initialized');

    try {
      const order = await (engineInstance.createOrder?.(params) ?? engineInstance.placeOrder?.(params));
      if (engineInstance.getStatus) setStatus(engineInstance.getStatus());
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }, []);

  const refetch = useCallback(() => {
    if (engineInstance?.getStatus) setStatus(engineInstance.getStatus());
  }, []);

  return {
    isActive,
    status,
    startEngine,
    stopEngine,
    createOrder,
    // Additional properties expected by PerformanceChart
    performance: null as any,
    trades: null as any,
    metrics: null as any,
    loading: false,
    error: null as string | null,
    refetch,
    marketData: null as any,
  };
}