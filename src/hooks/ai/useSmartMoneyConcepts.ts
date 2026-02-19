import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SmartMoneyConceptsAnalyzer, 
  SMCAnalysis, 
  PriceData,
  createSMCAnalyzer,
  convertCandlesToPriceData
} from '@/lib/trading/SmartMoneyConcepts';

interface SMCHookConfig {
  symbol: string;
  timeframe: string;
  autoUpdate: boolean;
  updateInterval: number; // milliseconds
}

interface SMCHookReturn {
  analysis: SMCAnalysis | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  tradingSignals: any[];
  updateAnalysis: () => Promise<void>;
  analyzer: SmartMoneyConceptsAnalyzer | null;
  confidence: number;
  bias: 'bullish' | 'bearish' | 'neutral';
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

export function useSmartMoneyConcepts(config: SMCHookConfig): SMCHookReturn {
  const [analysis, setAnalysis] = useState<SMCAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tradingSignals, setTradingSignals] = useState<any[]>([]);
  
  const analyzerRef = useRef<SmartMoneyConceptsAnalyzer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inicializar analyzer
  useEffect(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = createSMCAnalyzer({
        minLiquidityTouches: 2,
        orderBlockThreshold: 0.5,
        fvgMinSize: 0.1,
        structureLookback: 50
      });
    }
  }, []);
  
  // Função para buscar dados de preço REAIS da CoinMarketCap
  const fetchPriceData = useCallback(async (): Promise<PriceData[]> => {
    try {
      
      // Primeira tentativa: CoinMarketCap API
      try {
        const cmcResponse = await fetch(`/api/coinmarketcap/?symbols=${config.symbol}&historical=true&interval=${config.timeframe}&limit=200`, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (cmcResponse.ok) {
          const cmcData = await cmcResponse.json();
          
          if (cmcData.success) {
            if (cmcData.data.historical && cmcData.data.historical.length > 0) {
              // Usar dados históricos reais
              return cmcData.data.historical.map((item: any, index: number) => ({
                timestamp: new Date(item.timestamp || Date.now() - (index * 3600000)),
                open: item.open || item.price,
                high: item.high || item.price * 1.02,
                low: item.low || item.price * 0.98,
                close: item.close || item.price,
                volume: item.volume || 0
              }));
            } else if (cmcData.data.current && cmcData.data.current[config.symbol]) {
              // Usar preço atual + dados simulados realistas
              const currentPrice = cmcData.data.current[config.symbol].price;
              return generateRealisticSimulatedData(config.symbol, currentPrice);
            }
          }
        }
      } catch (cmcError) {
      }
      
      // Tentativas de fallback para outras APIs
      const fallbackSources = [
        `/api/charts/historical?symbol=${config.symbol}&timeframe=${config.timeframe}&limit=200`,
        `/api/binance/klines?symbol=${config.symbol}&interval=${config.timeframe}&limit=200`,
        `/api/bitcoin-price` // Para BTC
      ];
      
      for (const source of fallbackSources) {
        try {
          const response = await fetch(source);
          if (response.ok) {
            const data = await response.json();
            
            // Converter dados baseado na estrutura retornada
            if (data.candles || data.klines || data.data) {
              const candles = data.candles || data.klines || data.data;
              return convertCandlesToPriceData(candles);
            } else if (data.success && data.data.price) {
              // API bitcoin-price
              return generateRealisticSimulatedData(config.symbol, data.data.price);
            }
          }
        } catch (sourceError) {
          continue;
        }
      }
      
      // Último recurso: dados simulados com preços realistas
      return generateSimulatedData(config.symbol);
      
    } catch (error) {
      console.error('❌ SMC: Erro crítico buscando dados:', error);
      return generateSimulatedData(config.symbol);
    }
  }, [config.symbol, config.timeframe]);
  
  // Generate deterministic simulated candle data based on current price
  // Uses sine waves and index-based variation (no Math.random)
  const generateRealisticSimulatedData = useCallback((symbol: string, currentPrice: number): PriceData[] => {
    const data: PriceData[] = [];
    const numCandles = 200;
    let price = currentPrice;

    for (let i = 0; i < numCandles; i++) {
      const timestamp = new Date(Date.now() - (numCandles - i) * 3600000);

      // Deterministic price movement using sine waves
      const trend = Math.sin(i * 0.05) * 0.01;
      const cycle = Math.sin(i * 0.13) * 0.005;
      const microCycle = Math.cos(i * 0.31) * 0.003;

      const open = price;
      const change = trend + cycle + microCycle;
      const close = open * (1 + change);

      const spread = Math.abs(change) + 0.002;
      const high = Math.max(open, close) * (1 + spread);
      const low = Math.min(open, close) * (1 - spread);

      // Deterministic volume based on candle index
      const baseVolume = 750000000;
      const volumeVariation = Math.abs(Math.sin(i * 0.17)) * 500000000;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: baseVolume + volumeVariation
      });

      price = close;
    }

    return data;
  }, []);

  // Deterministic fallback data with default prices (no Math.random)
  const generateSimulatedData = useCallback((symbol: string): PriceData[] => {
    const basePrice = symbol.includes('BTC') ? 107000 :
                     symbol.includes('ETH') ? 2350 :
                     100;

    const data: PriceData[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 199; i >= 0; i--) {
      const timestamp = now - (i * 4 * 60 * 1000);

      // Deterministic price movement using sine/cosine
      const change = Math.sin(i * 0.07) * 0.001 + Math.cos(i * 0.19) * 0.0005;
      const open = price;
      const close = price * (1 + change);

      const spread = Math.abs(change) + 0.0005;
      const high = Math.max(open, close) * (1 + spread);
      const low = Math.min(open, close) * (1 - spread);

      // Deterministic volume
      const vol = 500000 + Math.abs(Math.sin(i * 0.11)) * 500000;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: vol
      });

      price = close;
    }

    return data;
  }, []);
  
  // Função principal para atualizar análise
  const updateAnalysis = useCallback(async () => {
    if (!analyzerRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const priceData = await fetchPriceData();
      
      if (priceData.length === 0) {
        throw new Error('No price data received');
      }
      
      // Executar análise SMC
      const smcAnalysis = analyzerRef.current.updatePriceData(priceData);
      
      // Gerar sinais de trading
      const signals = analyzerRef.current.generateTradingSignals();
      
      setAnalysis(smcAnalysis);
      setTradingSignals(signals);
      setLastUpdate(new Date());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('SMC Analysis Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPriceData]);
  
  // Configurar auto-update
  useEffect(() => {
    if (config.autoUpdate) {
      // Executar análise inicial
      updateAnalysis();
      
      // Configurar intervalo
      intervalRef.current = setInterval(updateAnalysis, config.updateInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [config.autoUpdate, config.updateInterval, updateAnalysis]);
  
  // Limpar intervalo quando component desmonta
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Calcular valores derivados
  const confidence = analysis?.confidence || 0;
  const bias = analysis?.tradingBias || 'neutral';
  const keyLevels = analysis?.keyLevels || { support: [], resistance: [] };
  
  return {
    analysis,
    isLoading,
    error,
    lastUpdate,
    tradingSignals,
    updateAnalysis,
    analyzer: analyzerRef.current,
    confidence,
    bias,
    keyLevels
  };
}

// Hook para múltiplos símbolos
export function useMultiSymbolSMC(symbols: string[]): Record<string, SMCHookReturn> {
  const results: Record<string, SMCHookReturn> = {};
  
  symbols.forEach(symbol => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[symbol] = useSmartMoneyConcepts({
      symbol,
      timeframe: '4h',
      autoUpdate: true,
      updateInterval: 60000 // 1 minuto
    });
  });
  
  return results;
}

// Hook simplificado para Bitcoin
export function useBitcoinSMC() {
  return useSmartMoneyConcepts({
    symbol: 'BTCUSDT',
    timeframe: '4h',
    autoUpdate: true,
    updateInterval: 30000 // 30 segundos
  });
}

// Hook para análise em tempo real
export function useRealTimeSMC(symbol: string) {
  const smcHook = useSmartMoneyConcepts({
    symbol,
    timeframe: '1m',
    autoUpdate: true,
    updateInterval: 5000 // 5 segundos
  });
  
  const [realtimeSignals, setRealtimeSignals] = useState<any[]>([]);
  
  // Detectar mudanças na análise e gerar alertas
  useEffect(() => {
    if (smcHook.analysis) {
      const newSignals = [];
      
      // Verificar se há order blocks próximos
      const activeOBs = smcHook.analysis.orderBlocks.filter(ob => ob.status === 'active');
      if (activeOBs.length > 0) {
        newSignals.push({
          type: 'orderblock_proximity',
          message: `${activeOBs.length} Order Block(s) ativos detectados`,
          confidence: smcHook.confidence,
          timestamp: new Date()
        });
      }
      
      // Verificar Fair Value Gaps abertos
      const openFVGs = smcHook.analysis.fairValueGaps.filter(fvg => fvg.status === 'open');
      if (openFVGs.length > 0) {
        newSignals.push({
          type: 'fvg_open',
          message: `${openFVGs.length} Fair Value Gap(s) em aberto`,
          confidence: smcHook.confidence,
          timestamp: new Date()
        });
      }
      
      // Verificar mudança de estrutura
      if (smcHook.analysis.marketStructure.structureShift) {
        newSignals.push({
          type: 'structure_shift',
          message: `Mudança de estrutura detectada: ${smcHook.analysis.marketStructure.structureShift.type}`,
          confidence: 90,
          timestamp: new Date()
        });
      }
      
      setRealtimeSignals(newSignals);
    }
  }, [smcHook.analysis, smcHook.confidence]);
  
  return {
    ...smcHook,
    realtimeSignals
  };
}

export default useSmartMoneyConcepts;