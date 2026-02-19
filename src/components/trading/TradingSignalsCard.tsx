import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Tab, TabGroup, TabList } from '@tremor/react';
import { getCryptoPrices, formatPrice } from '@/services/coinmarketcap-service';

interface TradingSignal {
  id: string;
  pair: string;
  direction: 'Long' | 'Short';
  status: 'Pending' | 'Triggered' | 'Invalidated';
  entryPrice: number;
  stopLoss: number;
  riskReward: number;
  winRate: number;
  timeframe: string;
  structure: string;
  entryTime: string;
  keyLevels: {
    type: string;
    level: number;
  }[];
  takeProfits: {
    level: number;
    id: number;
  }[];
  isBreaker: boolean;
  isRetestSignal: boolean;
}

export function TradingSignalsCard() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPrices, setCurrentPrices] = useState<{[key: string]: number}>({});

  // Função para buscar os preços atuais das criptomoedas
  const fetchCurrentPrices = async (pairs: string[]) => {
    try {
      // Extrair os símbolos das criptomoedas dos pares (ex: BTC/USD -> BTC)
      const symbols = pairs.map(pair => pair.split('/')[0]);

      // Verificar se há símbolos válidos
      if (!symbols.length) {
        return;
      }

      // Buscar preços com tratamento de erro
      try {
        const pricesData = await getCryptoPrices(symbols);

        // Criar um objeto com os preços atuais
        const prices: {[key: string]: number} = {};
        for (const symbol in pricesData) {
          // Encontrar o par correspondente
          const pair = pairs.find(p => p.startsWith(symbol));
          if (pair && pricesData[symbol] && typeof pricesData[symbol].price === 'number') {
            prices[pair] = pricesData[symbol].price;
          }
        }

        // Atualizar o estado apenas se houver preços válidos
        if (Object.keys(prices).length > 0) {
          setCurrentPrices(prevPrices => ({...prevPrices, ...prices}));
        }
      } catch (apiError) {
        console.error('Erro na API de preços:', apiError);
        // Não atualiza os preços em caso de erro, mantendo os valores anteriores
      }
    } catch (error) {
      console.error('Erro ao processar busca de preços:', error);
    }
  };

  useEffect(() => {
    // Simular a busca de sinais de trading
    const fetchSignals = async () => {
      try {
        setLoading(true);

        // Dados simulados de sinais de trading
        const mockSignals: TradingSignal[] = [
          {
            id: '1',
            pair: 'BTC/USD',
            direction: 'Long',
            status: 'Pending',
            entryPrice: 64665.402,
            stopLoss: 62479.244,
            riskReward: 0.88,
            winRate: 75,
            timeframe: '1D',
            structure: 'Downtrend',
            entryTime: '30/04/2024, 03:18:15',
            keyLevels: [
              { type: 'FVG 1', level: 66714.4 },
              { type: 'BOS 2', level: 66436.701 },
              { type: 'Support 3', level: 61280.992 },
              { type: 'Support 4', level: 61287.207 }
            ],
            takeProfits: [
              { id: 1, level: 65495.943 },
              { id: 2, level: 66590.562 },
              { id: 3, level: 68521.657 },
              { id: 4, level: 70807.62 }
            ],
            isBreaker: true,
            isRetestSignal: false
          },
          {
            id: '2',
            pair: 'AVAX/USD',
            direction: 'Short',
            status: 'Triggered',
            entryPrice: 64442.408,
            stopLoss: 66913.533,
            riskReward: 0.98,
            winRate: 88,
            timeframe: '1h',
            structure: 'Range',
            entryTime: '30/04/2024, 03:18:06',
            keyLevels: [
              { type: 'BOS 1', level: 63278.152 },
              { type: 'OB 2', level: 61268.424 },
              { type: 'FVG 3', level: 63502.608 },
              { type: 'Support 4', level: 62295.017 }
            ],
            takeProfits: [
              { id: 1, level: 63124.04 },
              { id: 2, level: 62030.453 },
              { id: 3, level: 60887.368 },
              { id: 4, level: 59652.916 }
            ],
            isBreaker: false,
            isRetestSignal: true
          },
          {
            id: '3',
            pair: 'BNB/USD',
            direction: 'Short',
            status: 'Invalidated',
            entryPrice: 61483.362,
            stopLoss: 63913.533,
            riskReward: 0.92,
            winRate: 82,
            timeframe: '4h',
            structure: 'Range',
            entryTime: '30/04/2024, 02:45:22',
            keyLevels: [
              { type: 'BOS 1', level: 60278.152 },
              { type: 'OB 2', level: 59268.424 },
              { type: 'FVG 3', level: 61502.608 },
              { type: 'Support 4', level: 60295.017 }
            ],
            takeProfits: [
              { id: 1, level: 59972.43 },
              { id: 2, level: 58030.453 },
              { id: 3, level: 57887.368 },
              { id: 4, level: 56652.916 }
            ],
            isBreaker: true,
            isRetestSignal: false
          }
        ];

        setSignals(mockSignals);

        // Buscar os preços atuais
        try {
          const pairs = mockSignals.map(signal => signal.pair);
          await fetchCurrentPrices(pairs);
        } catch (priceError) {
          console.error('Erro ao buscar preços iniciais:', priceError);
          // Continua mesmo se falhar a busca de preços
        }
      } catch (error) {
        console.error('Erro ao buscar sinais de trading:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();

    // Atualizar os preços a cada 60 segundos
    const intervalId = setInterval(() => {
      try {
        if (signals.length > 0) {
          const pairs = signals.map(signal => signal.pair);
          fetchCurrentPrices(pairs);
        }
      } catch (error) {
        console.error('Erro na atualização periódica de preços:', error);
      }
    }, 60000);

    return () => {
      try {
        clearInterval(intervalId);
      } catch (error) {
        console.error('Erro ao limpar intervalo:', error);
      }
    };
  }, []);

  // Filtrar sinais com base na aba ativa
  const filteredSignals = signals.filter(signal => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return signal.status === 'Pending';
    if (activeTab === 'triggered') return signal.status === 'Triggered';
    if (activeTab === 'invalidated') return signal.status === 'Invalidated';
    return true;
  });

  // Função para renderizar o status do sinal
  const renderStatus = (status: string) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">Pending</span>;
      case 'Triggered':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">Triggered</span>;
      case 'Invalidated':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-300 border border-gray-500/30">Invalidated</span>;
      default:
        return null;
    }
  };

  // Função para renderizar a direção do sinal
  const renderDirection = (direction: string, isBreaker: boolean, isRetestSignal: boolean) => {
    let tags = [];

    if (direction === 'Long') {
      tags.push(<span key="long" className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">Long</span>);
    } else {
      tags.push(<span key="short" className="px-2 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">Short</span>);
    }

    if (isBreaker) {
      tags.push(<span key="breaker" className="ml-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">Breaker</span>);
    }

    if (isRetestSignal) {
      tags.push(<span key="retest" className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">OB Retest</span>);
    }

    return <div className="flex flex-wrap gap-1">{tags}</div>;
  };

  return (
    <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title className="text-white text-xl">SMC Trading Signals</Title>
          <Text className="text-gray-400 text-sm">
            Smart Money Concept trading signals with 4TP and SL
          </Text>
        </div>
      </div>

      <TabGroup defaultIndex={0} onIndexChange={(index) => setActiveTab(['all', 'pending', 'triggered', 'invalidated'][index])}>
        <TabList className="mb-4">
          <Tab>All Signals</Tab>
          <Tab>Pending</Tab>
          <Tab>Triggered</Tab>
          <Tab>Invalidated</Tab>
        </TabList>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-gray-700/30 rounded-lg animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-6 w-24 bg-gray-700/50 rounded"></div>
                  <div className="h-6 w-20 bg-gray-700/50 rounded"></div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="h-5 w-full bg-gray-700/50 rounded"></div>
                  <div className="h-5 w-full bg-gray-700/50 rounded"></div>
                  <div className="h-5 w-full bg-gray-700/50 rounded"></div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div className="h-4 w-full bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-full bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-full bg-gray-700/50 rounded"></div>
                  <div className="h-4 w-full bg-gray-700/50 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSignals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No signals found in this category
              </div>
            ) : (
              filteredSignals.map((signal) => (
                <div key={signal.id} className="p-4 border border-gray-700/30 rounded-lg hover:bg-gray-800/30 transition-colors">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <Text className="text-white font-medium">{signal.pair} ({signal.timeframe})</Text>
                      <div className="ml-2">
                        {renderDirection(signal.direction, signal.isBreaker, signal.isRetestSignal)}
                      </div>
                    </div>
                    <div>
                      {renderStatus(signal.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <Text className="text-gray-400 text-xs">Entry</Text>
                      <Text className="text-white font-medium">
                        ${formatPrice(currentPrices[signal.pair] || signal.entryPrice)}
                      </Text>
                    </div>
                    <div>
                      <Text className="text-gray-400 text-xs">Stop Loss</Text>
                      <Text className="text-rose-300 font-medium">${formatPrice(signal.stopLoss)}</Text>
                    </div>
                    <div>
                      <Text className="text-gray-400 text-xs">Risk/Reward</Text>
                      <Text className="text-amber-300 font-medium">{signal.riskReward}</Text>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                    <div className="flex items-center">
                      <div className="w-4 h-4 flex items-center justify-center mr-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 16V12" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 8H12.01" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <Text className="text-gray-400 text-xs">Win Rate: <span className="text-green-300">{signal.winRate}%</span></Text>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 flex items-center justify-center mr-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 8V12L15 15" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <Text className="text-gray-400 text-xs">Time: {signal.timeframe}</Text>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 flex items-center justify-center mr-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 12H18L15 21L9 3L6 12H2" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <Text className="text-gray-400 text-xs">Structure: {signal.structure}</Text>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 flex items-center justify-center mr-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 8V12L15 15" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <Text className="text-gray-400 text-xs">Entry time: {signal.entryTime}</Text>
                    </div>
                  </div>

                  <div className="mb-2">
                    <Text className="text-gray-400 text-xs mb-1">Key Levels:</Text>
                    <div className="flex flex-wrap gap-2">
                      {signal.keyLevels.map((level, index) => (
                        <span key={index} className="px-2 py-0.5 rounded-full text-xs bg-gray-800/50 text-gray-300 border border-gray-700/50">
                          {level.type}: ${formatPrice(level.level)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Text className="text-gray-400 text-xs mb-1">Take Profit Targets:</Text>
                    <div className="grid grid-cols-4 gap-2">
                      {signal.takeProfits.map((tp) => (
                        <div key={tp.id} className="flex flex-col">
                          <Text className="text-gray-400 text-xs">TP{tp.id}</Text>
                          <Text className="text-green-300 font-medium">${formatPrice(tp.level)}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
          <Text className="text-xs text-blue-300 font-bold">HOW IT WORKS:</Text>
          <Text className="text-xs text-gray-400 mt-1">
            These signals are based on Smart Money Concept (SMC) trading strategies. They identify key market structures,
            order blocks, fair value gaps, and breaker blocks to determine high-probability entry points with favorable risk-to-reward ratios.
            Each signal includes 4 take profit levels and a stop loss level based on market structure.
          </Text>
        </div>
      </TabGroup>
    </Card>
  );
}
