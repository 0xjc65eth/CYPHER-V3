/**
 * 🤖 useCypherAI Hook - React Integration for CYPHER AI
 * Custom hook for managing CYPHER AI state and operations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import CypherAICore, { TradingSignal, MarketAnalysis, AIResponse } from '@/lib/agents/cypher-ai-core';
import AutoTradingEngine, { PortfolioStats, TradingMetrics } from '@/lib/agents/auto-trading-engine';

interface UseCypherAIState {
  isInitialized: boolean;
  isActive: boolean;
  accuracy: number;
  signals: TradingSignal[];
  portfolio: PortfolioStats | null;
  metrics: TradingMetrics | null;
  messages: AIResponse[];
  engineStatus: {
    isActive: boolean;
    emergencyStop: boolean;
    dailyTrades: number;
  };
}

interface UseCypherAIActions {
  processCommand: (command: string) => Promise<AIResponse>;
  generateSignals: (assets?: string[]) => Promise<TradingSignal[]>;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  emergencyStop: () => Promise<void>;
  resetEmergencyStop: () => Promise<void>;
  analyzeMarket: (asset: string) => Promise<MarketAnalysis>;
  getPortfolioStats: () => Promise<PortfolioStats>;
}

interface UseCypherAIReturn extends UseCypherAIState, UseCypherAIActions {
  ai: CypherAICore | null;
  engine: AutoTradingEngine | null;
}

export function useCypherAI(): UseCypherAIReturn {
  const [state, setState] = useState<UseCypherAIState>({
    isInitialized: false,
    isActive: false,
    accuracy: 0,
    signals: [],
    portfolio: null,
    metrics: null,
    messages: [],
    engineStatus: {
      isActive: false,
      emergencyStop: false,
      dailyTrades: 0
    }
  });

  const ai = useRef<CypherAICore | null>(null);
  const engine = useRef<AutoTradingEngine | null>(null);

  // Initialize CYPHER AI and Trading Engine
  useEffect(() => {
    const initializeAI = async () => {
      try {
        // Initialize CYPHER AI Core
        ai.current = new CypherAICore();
        
        // Initialize Auto-Trading Engine
        const exchangeConfig = {
          name: 'Simulation',
          apiKey: 'demo_key',
          secretKey: 'demo_secret',
          testnet: true,
          rateLimit: 100,
          maxOrdersPerSecond: 10,
          supportedPairs: ['BTC', 'ETH', 'ADA', 'LTC']
        };

        engine.current = new AutoTradingEngine(exchangeConfig);

        // Set up event listeners
        setupEventListeners();

        setState(prev => ({
          ...prev,
          isInitialized: true,
          isActive: true
        }));

        // Add initialization message
        addMessage({
          type: 'INFORMATION',
          message: '🤖 CYPHER AI System initialized successfully!',
          confidence: 1.0
        });

      } catch (error) {
        console.error('Error initializing CYPHER AI:', error);
        addMessage({
          type: 'ERROR',
          message: `Initialization error: ${(error as Error)?.message || 'Unknown error'}`,
          confidence: 0.1
        });
      }
    };

    initializeAI();

    return () => {
      // Cleanup
      if (ai.current) {
        ai.current.removeAllListeners();
      }
      if (engine.current) {
        engine.current.removeAllListeners();
      }
    };
  }, []);

  // Setup event listeners for AI and Engine
  const setupEventListeners = useCallback(() => {
    if (!ai.current || !engine.current) return;

    // CYPHER AI Events
    ai.current.on('signals_generated', (signals: TradingSignal[]) => {
      setState(prev => ({ ...prev, signals }));
    });

    ai.current.on('market_analyzed', (analysis: MarketAnalysis) => {
      addMessage({
        type: 'ANALYSIS',
        message: `📊 Market analysis completed for ${analysis.asset}`,
        confidence: analysis.confidence,
        data: analysis
      });
    });

    ai.current.on('learning_updated', (data: any) => {
      setState(prev => ({ ...prev, accuracy: data.accuracy * 100 }));
    });

    // Trading Engine Events
    engine.current.on('engine_started', () => {
      setState(prev => ({
        ...prev,
        engineStatus: { ...prev.engineStatus, isActive: true }
      }));
    });

    engine.current.on('engine_stopped', () => {
      setState(prev => ({
        ...prev,
        engineStatus: { ...prev.engineStatus, isActive: false }
      }));
    });

    engine.current.on('emergency_stop_activated', (data: any) => {
      setState(prev => ({
        ...prev,
        engineStatus: { ...prev.engineStatus, emergencyStop: true, isActive: false }
      }));
      addMessage({
        type: 'INFORMATION',
        message: `🚨 Emergency Stop: ${data.reason}`,
        confidence: 1.0
      });
    });

    engine.current.on('position_opened', (position: any) => {
      addMessage({
        type: 'TRADE_EXECUTION',
        message: `✅ Position opened: ${position.side} ${position.symbol} at $${position.entryPrice}`,
        confidence: 0.9
      });
    });

    engine.current.on('position_closed', (data: any) => {
      addMessage({
        type: 'TRADE_EXECUTION',
        message: `📈 Position closed: ${data.position.symbol} P&L: $${data.position.realizedPnL.toFixed(2)}`,
        confidence: 0.9
      });
    });

  }, []);

  // Add message to state
  const addMessage = useCallback((message: AIResponse) => {
    setState(prev => ({
      ...prev,
      messages: [{ ...message, timestamp: new Date() }, ...prev.messages.slice(0, 19)]
    }));
  }, []);

  // Process voice/text command
  const processCommand = useCallback(async (command: string): Promise<AIResponse> => {
    if (!ai.current) {
      throw new Error('CYPHER AI not initialized');
    }

    try {
      const response = await ai.current.processVoiceCommand(command);
      addMessage(response);
      return response;
    } catch (error) {
      const errorResponse: AIResponse = {
        type: 'ERROR',
        message: `Command processing error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      };
      addMessage(errorResponse);
      throw error;
    }
  }, [addMessage]);

  // Generate trading signals
  const generateSignals = useCallback(async (assets: string[] = ['BTC', 'ETH', 'ADA']): Promise<TradingSignal[]> => {
    if (!ai.current) {
      throw new Error('CYPHER AI not initialized');
    }

    try {
      const signals = await ai.current.generateSignals(assets);
      setState(prev => ({ ...prev, signals }));
      
      if (signals.length > 0) {
        addMessage({
          type: 'ANALYSIS',
          message: `🎯 Generated ${signals.length} trading signals`,
          confidence: signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
        });
      }
      
      return signals;
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Signal generation error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Start trading engine
  const startEngine = useCallback(async (): Promise<void> => {
    if (!engine.current) {
      throw new Error('Trading Engine not initialized');
    }

    try {
      await engine.current.startEngine();
      addMessage({
        type: 'INFORMATION',
        message: '▶️ Trading Engine started',
        confidence: 1.0
      });
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Engine start error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Stop trading engine
  const stopEngine = useCallback(async (): Promise<void> => {
    if (!engine.current) {
      throw new Error('Trading Engine not initialized');
    }

    try {
      await engine.current.stopEngine();
      addMessage({
        type: 'INFORMATION',
        message: '⏸️ Trading Engine stopped',
        confidence: 1.0
      });
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Engine stop error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Emergency stop
  const emergencyStop = useCallback(async (): Promise<void> => {
    if (!engine.current) {
      throw new Error('Trading Engine not initialized');
    }

    try {
      await engine.current.emergencyStopAll('Manual emergency stop');
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Emergency stop error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Reset emergency stop
  const resetEmergencyStop = useCallback(async (): Promise<void> => {
    if (!engine.current) {
      throw new Error('Trading Engine not initialized');
    }

    try {
      await engine.current.resetEmergencyStop();
      setState(prev => ({
        ...prev,
        engineStatus: { ...prev.engineStatus, emergencyStop: false }
      }));
      addMessage({
        type: 'INFORMATION',
        message: '🔄 Emergency stop reset',
        confidence: 1.0
      });
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Reset error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Analyze market
  const analyzeMarket = useCallback(async (asset: string): Promise<MarketAnalysis> => {
    if (!ai.current) {
      throw new Error('CYPHER AI not initialized');
    }

    try {
      const analysis = await ai.current.analyzeMarket(asset);
      return analysis;
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Market analysis error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Get portfolio statistics
  const getPortfolioStats = useCallback(async (): Promise<PortfolioStats> => {
    if (!engine.current) {
      throw new Error('Trading Engine not initialized');
    }

    try {
      const stats = await engine.current.getPortfolioStats();
      setState(prev => ({ ...prev, portfolio: stats }));
      return stats;
    } catch (error) {
      addMessage({
        type: 'ERROR',
        message: `Portfolio stats error: ${(error as Error)?.message || 'Unknown error'}`,
        confidence: 0.1
      });
      throw error;
    }
  }, [addMessage]);

  // Update metrics periodically
  useEffect(() => {
    if (!engine.current || !state.isInitialized) return;

    const updateMetrics = async () => {
      try {
        const metrics = engine.current?.getTradingMetrics();
        const portfolio = await engine.current?.getPortfolioStats();
        
        setState(prev => ({
          ...prev,
          metrics: metrics || null,
          portfolio: portfolio || null
        }));
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    };

    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [state.isInitialized]);

  return {
    // State
    ...state,
    
    // Actions
    processCommand,
    generateSignals,
    startEngine,
    stopEngine,
    emergencyStop,
    resetEmergencyStop,
    analyzeMarket,
    getPortfolioStats,
    
    // Instances
    ai: ai.current,
    engine: engine.current
  };
}

export default useCypherAI;
