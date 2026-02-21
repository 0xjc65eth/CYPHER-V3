// Servico para gerar dados de trading, arbitragem e analises SMC

export interface ArbitrageOpportunity {
  id: string;
  sourceExchange: string;
  targetExchange: string;
  asset: string;
  priceDifference: number;
  percentageDifference: number;
  volume24h: number;
  estimatedProfit: number;
  risk: 'Low' | 'Medium' | 'High';
  timeToExecute: string;
  confidence: number;
  status: 'New' | 'Active' | 'Closing' | 'Expired';
  timestamp: string;
  isFallback?: boolean;
}

export interface SmcTradeSetup {
  id: string;
  asset: string;
  timeframe: string;
  direction: 'Long' | 'Short';
  entry: number;
  stopLoss: number;
  takeProfits: {
    tp1: number;
    tp2: number;
    tp3: number;
    tp4: number;
  };
  riskRewardRatio: number;
  winRate: number;
  setup: string;
  confidence: number;
  status: 'Pending' | 'Active' | 'Triggered' | 'Completed' | 'Invalidated';
  keyLevels: {
    name: string;
    price: number;
    type: 'Support' | 'Resistance' | 'OB' | 'FVG' | 'BOS';
  }[];
  timestamp: string;
  expectedTimeInTrade: string;
  marketStructure: string;
  orderBlocks: {
    price: string;
    type: 'Bullish' | 'Bearish';
    strength: number;
  }[];
  fairValueGaps: {
    price: string;
    type: 'Bullish' | 'Bearish';
    status: string;
  }[];
  isFallback?: boolean;
}

export interface NeuralMetric {
  name: string;
  value: number;
  interpretation: string;
  trend: 'Up' | 'Down' | 'Neutral';
  confidence: number;
  timeframe: string;
}

export interface MarketInsight {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  assets: string[];
  source: string;
  timestamp: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  isFallback?: boolean;
}

export interface TradingData {
  arbitrageOpportunities: ArbitrageOpportunity[];
  smcTradeSetups: SmcTradeSetup[];
  neuralMetrics: NeuralMetric[];
  marketInsights: MarketInsight[];
  lastUpdated: string;
  isFallback?: boolean;
}

// Funcao para obter oportunidades de arbitragem reais com foco em Ordinals e Runes
async function fetchArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
  try {
    // Array para armazenar oportunidades de arbitragem
    const opportunities: ArbitrageOpportunity[] = [];

    // Obter dados de precos de BTC de diferentes exchanges
    try {
      const binanceBTC = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT').then(res => res.json());
      const coinbaseBTC = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot').then(res => res.json());

      // BTC arbitragem entre Binance e Coinbase
      if (binanceBTC && coinbaseBTC) {
        const binancePrice = parseFloat(binanceBTC.price);
        const coinbasePrice = parseFloat(coinbaseBTC.data.amount);

        if (binancePrice !== coinbasePrice) {
          const percentageDifference = Math.abs((binancePrice - coinbasePrice) / Math.min(binancePrice, coinbasePrice) * 100);
          const volume24h = 0; // No fake volume
          const estimatedProfit = 0; // No fake profit

          opportunities.push({
            id: `ARB-BTC-1`,
            sourceExchange: binancePrice < coinbasePrice ? 'Binance' : 'Coinbase',
            targetExchange: binancePrice < coinbasePrice ? 'Coinbase' : 'Binance',
            asset: 'BTC/USDT',
            priceDifference: Math.abs(binancePrice - coinbasePrice),
            percentageDifference,
            volume24h,
            estimatedProfit,
            risk: percentageDifference > 1 ? 'High' : percentageDifference > 0.5 ? 'Medium' : 'Low',
            timeToExecute: '5m',
            confidence: 0,
            status: 'Active',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error fetching BTC arbitrage data:', error);

      // Zero-value fallback for BTC
      console.warn('[TradingData] Returning zero-value fallback for BTC arbitrage');
      opportunities.push({
        id: `ARB-BTC-1`,
        sourceExchange: 'Binance',
        targetExchange: 'Coinbase',
        asset: 'BTC/USDT',
        priceDifference: 0,
        percentageDifference: 0,
        volume24h: 0,
        estimatedProfit: 0,
        risk: 'Low',
        timeToExecute: '5m',
        confidence: 0,
        status: 'Active',
        timestamp: new Date().toISOString(),
        isFallback: true
      });
    }

    // Ordenar oportunidades por lucro estimado (maior primeiro)
    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  } catch (error) {
    console.error('Error fetching arbitrage opportunities:', error);
    console.warn('[TradingData] Returning empty fallback arbitrage data');

    return [];
  }
}

// Funcao para gerar setups de trade SMC - returns zero-value fallback data
function generateSmcTradeSetups(count: number = 8): SmcTradeSetup[] {
  console.warn('[TradingData] SMC trade setups returning zero-value fallback data - connect to real trading signals');

  const assets = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'AVAX/USD'];
  const timeframes = ['15m', '1h', '4h', 'Daily'];
  const setups = ['OB Retest', 'FVG Fill', 'BOS Retest', 'Liquidity Sweep', 'Equal Highs/Lows', 'Breaker', 'Swing Failure', 'Imbalance'];
  const marketStructures = ['Uptrend', 'Downtrend', 'Range', 'Accumulation', 'Distribution', 'Wyckoff Spring', 'Wyckoff Upthrust'];

  return Array.from({ length: count }, (_, index) => {
    const asset = assets[index % assets.length];

    return {
      id: `SMC-${index + 1}`,
      asset,
      timeframe: timeframes[index % timeframes.length],
      direction: 'Long' as const,
      entry: 0,
      stopLoss: 0,
      takeProfits: {
        tp1: 0,
        tp2: 0,
        tp3: 0,
        tp4: 0
      },
      riskRewardRatio: 0,
      winRate: 0,
      setup: setups[index % setups.length],
      confidence: 0,
      status: 'Pending' as const,
      keyLevels: [],
      timestamp: new Date().toISOString(),
      expectedTimeInTrade: '0h',
      marketStructure: marketStructures[index % marketStructures.length],
      orderBlocks: [],
      fairValueGaps: [],
      isFallback: true
    };
  });
}

// Funcao para obter metricas neurais reais com foco em Bitcoin, Ordinals e Runes
async function fetchNeuralMetrics(): Promise<NeuralMetric[]> {
  try {
    // Obter dados reais de APIs
    const btcPriceData = await fetch('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BTC', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || ''
      }
    }).then(res => res.json()).catch((error) => {
      console.error('Error fetching BTC price data:', error);
      return null;
    });

    const ordinalsData = await fetch('https://api.ordiscan.com/v1/stats?key=' + process.env.ORDISCAN_API_KEY)
      .then(res => res.json())
      .catch((error) => {
        console.error('Error fetching Ordinals data:', error);
        return null;
      });

    const mempoolData = await fetch('https://mempool.space/api/v1/fees/recommended')
      .then(res => res.json())
      .catch((error) => {
        console.error('Error fetching mempool data:', error);
        return null;
      });

    const hashrateData = await fetch('https://mempool.space/api/v1/mining/hashrate/1m')
      .then(res => res.json())
      .catch((error) => {
        console.error('Error fetching hashrate data:', error);
        return null;
      });

    // Criar metricas neurais baseadas em dados reais
    const metrics: NeuralMetric[] = [];

    // Bitcoin Price Momentum
    if (btcPriceData && btcPriceData.data && btcPriceData.data.BTC && btcPriceData.data.BTC[0]) {
      const btcData = btcPriceData.data.BTC[0];
      const priceChange24h = btcData.quote?.USD?.percent_change_24h || 0;
      const priceChange7d = btcData.quote?.USD?.percent_change_7d || 0;

      // Calcular valor baseado nas mudancas de preco
      const value = 50 + (priceChange24h * 0.3) + (priceChange7d * 0.7);
      const trend = priceChange24h > 0 ? 'Up' : priceChange24h < 0 ? 'Down' : 'Neutral';

      let interpretation = '';
      if (value > 70) {
        interpretation = `Strong bullish momentum with positive price action across multiple timeframes.`;
      } else if (value > 50) {
        interpretation = `Moderate bullish bias with positive long-term trend.`;
      } else if (value > 40) {
        interpretation = `Neutral price action, market in consolidation phase.`;
      } else if (value > 20) {
        interpretation = `Bearish short-term momentum, caution advised.`;
      } else {
        interpretation = `Strong bearish trend across multiple timeframes.`;
      }

      metrics.push({
        name: 'Bitcoin Price Momentum',
        value,
        interpretation,
        trend,
        confidence: 90,
        timeframe: '1D'
      });
    }

    // Ordinals Inscription Rate
    if (ordinalsData) {
      try {
        // Calcular valor baseado na taxa de inscricao
        const inscriptionRate = ordinalsData.inscription_rate || 0;
        const normalizedRate = Math.min(100, Math.max(0, (inscriptionRate / 1000) * 100));
        const trend = normalizedRate > 50 ? 'Up' : normalizedRate < 40 ? 'Down' : 'Neutral';

      let interpretation = '';
      if (normalizedRate > 70) {
        interpretation = `Strong inscription activity and growing collector interest in Ordinals.`;
      } else if (normalizedRate > 50) {
        interpretation = `Moderate inscription growth with stable collector interest.`;
      } else if (normalizedRate > 40) {
        interpretation = `Neutral inscription rate, market in consolidation phase.`;
      } else if (normalizedRate > 20) {
        interpretation = `Declining inscription rate, potential market saturation.`;
      } else {
        interpretation = `Significant drop in inscription activity, bearish market conditions.`;
      }

      metrics.push({
        name: 'Ordinals Inscription Rate',
        value: normalizedRate,
        interpretation,
        trend,
        confidence: 85,
        timeframe: '1D'
      });
      } catch (error) {
        console.error('Error processing Ordinals data:', error);
      }
    }

    // Bitcoin Network Health
    if (mempoolData && hashrateData) {
      try {
        // Calcular valor baseado na taxa de transacao e hashrate
        const feeRate = mempoolData.fastestFee || 0;
        const hashrate = hashrateData.currentHashrate || 0;

      // Normalizar valores
      const normalizedFee = Math.min(100, Math.max(0, 100 - (feeRate / 100) * 100)); // Menor taxa = melhor saude
      const normalizedHashrate = Math.min(100, Math.max(0, (hashrate / 300000000000000) * 100)); // Maior hashrate = melhor saude

      const value = (normalizedFee * 0.3) + (normalizedHashrate * 0.7);
      const trend = value > 60 ? 'Up' : value < 40 ? 'Down' : 'Neutral';

      let interpretation = '';
      if (value > 70) {
        interpretation = `Excellent network health with strong hashrate and reasonable fees.`;
      } else if (value > 50) {
        interpretation = `Good network conditions with balanced fee market.`;
      } else if (value > 40) {
        interpretation = `Neutral network health, monitoring congestion levels.`;
      } else if (value > 20) {
        interpretation = `Network congestion with elevated fees, potential delays.`;
      } else {
        interpretation = `Poor network conditions with high fees and potential security concerns.`;
      }

      metrics.push({
        name: 'Bitcoin Network Health',
        value,
        interpretation,
        trend,
        confidence: 88,
        timeframe: '1D'
      });
      } catch (error) {
        console.error('Error processing Network Health data:', error);
      }
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching neural metrics:', error);
    return [];
  }
}

// Funcao para gerar insights de mercado - static content, no random data
function generateMarketInsights(): MarketInsight[] {
  console.warn('[TradingData] Market insights returning static fallback data - connect to real news/analysis feeds');

  const insights = [
    {
      title: 'Bitcoin Institutional Accumulation',
      description: 'On-chain analysis shows large wallets accumulating BTC, suggesting strong institutional interest.',
      impact: 'High',
      assets: ['BTC'],
      source: 'On-chain Analysis',
      sentiment: 'Bullish'
    },
    {
      title: 'Ordinals Inscription Rate Surging',
      description: 'Daily Ordinals inscription rate has increased, with premium collections seeing higher floor prices and trading volume.',
      impact: 'Medium',
      assets: ['Ordinals'],
      source: 'Ordiscan API',
      sentiment: 'Bullish'
    },
    {
      title: 'Runes Adoption Milestone',
      description: 'Runes protocol continues to grow, marking adoption milestones for the Bitcoin-based token standard.',
      impact: 'Medium',
      assets: ['Runes'],
      source: 'Runes Explorer',
      sentiment: 'Bullish'
    },
    {
      title: 'Whale Alert: Large BTC Transfer',
      description: 'Whale wallet activity detected. Monitor closely for distribution patterns.',
      impact: 'High',
      assets: ['BTC'],
      source: 'Blockchain Data',
      sentiment: 'Bearish'
    },
    {
      title: 'Premium Ordinals Collections Trend',
      description: 'Top-tier Ordinals collections showing increased buying activity from whale wallets.',
      impact: 'Medium',
      assets: ['Ordinals'],
      source: 'Marketplace Data',
      sentiment: 'Bullish'
    },
    {
      title: 'Runes Liquidity Expansion',
      description: 'Major Runes tokens seeing significant liquidity expansion across decentralized exchanges.',
      impact: 'Medium',
      assets: ['Runes'],
      source: 'DEX Analytics',
      sentiment: 'Bullish'
    },
    {
      title: 'Bitcoin Options Sentiment',
      description: 'Options market showing demand for BTC calls, indicating bullish sentiment among derivatives traders.',
      impact: 'Medium',
      assets: ['BTC'],
      source: 'Options Chain Analysis',
      sentiment: 'Bullish'
    },
    {
      title: 'Ordinals Market Consolidation',
      description: 'Ordinals market entering consolidation phase with trading volumes normalizing and price discovery stabilizing.',
      impact: 'Low',
      assets: ['Ordinals'],
      source: 'Market Analysis',
      sentiment: 'Neutral'
    }
  ];

  return insights.map((insight, index) => ({
    id: `INS-${index + 1}`,
    title: insight.title,
    description: insight.description,
    impact: insight.impact as 'High' | 'Medium' | 'Low',
    assets: insight.assets,
    source: insight.source,
    timestamp: new Date().toISOString(),
    sentiment: insight.sentiment as 'Bullish' | 'Bearish' | 'Neutral',
    isFallback: true
  }));
}

// Funcao principal para obter todos os dados reais
export async function fetchTradingData(): Promise<TradingData> {
  try {
    // Obter dados reais de diferentes fontes
    const [arbitrageOpportunities, neuralMetrics] = await Promise.all([
      fetchArbitrageOpportunities(),
      fetchNeuralMetrics()
    ]);

    // SMC e insights retornam dados zero-value fallback
    const smcTradeSetups = generateSmcTradeSetups();
    const marketInsights = generateMarketInsights();

    return {
      arbitrageOpportunities,
      smcTradeSetups,
      neuralMetrics,
      marketInsights,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching trading data:', error);
    // Em caso de erro, retornamos dados vazios
    return {
      arbitrageOpportunities: [],
      smcTradeSetups: [],
      neuralMetrics: [],
      marketInsights: [],
      lastUpdated: new Date().toISOString(),
      isFallback: true
    };
  }
}

// Singleton para manter os dados consistentes entre chamadas
let tradingDataInstance: TradingData | null = null;

// Funcao para obter dados de trading
export async function getTradingData(): Promise<TradingData> {
  if (!tradingDataInstance) {
    try {
      tradingDataInstance = await fetchTradingData();
    } catch (error) {
      console.error('Error getting trading data:', error);
      // Em caso de erro, retornamos dados vazios
      tradingDataInstance = {
        arbitrageOpportunities: [],
        smcTradeSetups: [],
        neuralMetrics: [],
        marketInsights: [],
        lastUpdated: new Date().toISOString(),
        isFallback: true
      };
    }
  }
  return tradingDataInstance;
}

// Funcao para atualizar os dados com dados reais
export async function refreshTradingData(): Promise<TradingData> {
  try {
    // Obter dados reais atualizados
    tradingDataInstance = await fetchTradingData();
    return tradingDataInstance;
  } catch (error) {
    console.error('Error refreshing trading data:', error);
    // Em caso de erro, mantemos os dados existentes ou retornamos dados vazios
    if (!tradingDataInstance) {
      tradingDataInstance = {
        arbitrageOpportunities: [],
        smcTradeSetups: [],
        neuralMetrics: [],
        marketInsights: [],
        lastUpdated: new Date().toISOString(),
        isFallback: true
      };
    }
    return tradingDataInstance;
  }
}
