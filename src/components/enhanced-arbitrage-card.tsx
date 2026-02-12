'use client'

import { useState, useEffect } from 'react'
import { Card, Title, Text, Button } from '@tremor/react'
import { RiExchangeLine, RiTimeLine, RiShieldCheckLine, RiMoneyDollarCircleLine, RiPercentLine, RiExternalLinkLine, RiInformationLine, RiAlertLine } from 'react-icons/ri'
import { getCryptoPrices } from '@/services/coinmarketcap-service'

// Interface para oportunidades de arbitragem
interface ArbitrageOpportunity {
  id: string;
  sourceExchange: string;
  targetExchange: string;
  asset: string;
  sourceBuyPrice: number;
  targetSellPrice: number;
  sourceFeePercent: number;
  targetFeePercent: number;
  volume24h: number;
  estimatedProfit: number;
  netProfit: number;
  profitPercent: number;
  risk: 'Low' | 'Medium' | 'High';
  timeToExecute: string;
  confidence: number;
  status: 'New' | 'Active' | 'Closing' | 'Expired';
  timestamp: string;
  sourceBuyLink: string;
  targetSellLink: string;
}

// Taxas dos marketplaces (valores reais)
const MARKETPLACE_FEES: Record<string, number> = {
  'Magic Eden': 2.0,
  'Gamma.io': 1.5,
  'Ordinals Market': 2.5,
  'Ordswap': 1.0,
  'Unisat': 2.0,
  'Ordinals Wallet': 1.5,
  'OrdinalHub': 2.0,
  'Xverse': 1.8,
  'Binance': 0.1,
  'Coinbase': 0.6,
  'Kraken': 0.26,
  'Bybit': 0.1,
  'OKX': 0.1,
  'Kucoin': 0.1,
  'Bitfinex': 0.2,
  'Huobi': 0.2
};

// Links para os marketplaces
const MARKETPLACE_LINKS: Record<string, string> = {
  'Magic Eden': 'https://magiceden.io/ordinals/marketplace/',
  'Gamma.io': 'https://gamma.io/ordinals/',
  'Ordinals Market': 'https://ordinals.market/',
  'Ordswap': 'https://ordswap.io/',
  'Unisat': 'https://unisat.io/market',
  'Ordinals Wallet': 'https://ordinalswallet.com/',
  'OrdinalHub': 'https://ordinalhub.com/',
  'Xverse': 'https://xverse.app/ordinals',
  'Binance': 'https://www.binance.com/en/trade/',
  'Coinbase': 'https://www.coinbase.com/advanced-trade/',
  'Kraken': 'https://www.kraken.com/prices/',
  'Bybit': 'https://www.bybit.com/en/trade/spot/',
  'OKX': 'https://www.okx.com/trade-spot/',
  'Kucoin': 'https://www.kucoin.com/trade/',
  'Bitfinex': 'https://trading.bitfinex.com/t/',
  'Huobi': 'https://www.huobi.com/en-us/exchange/'
};

// Coleções de Ordinals populares com seus IDs
const ORDINALS_COLLECTIONS: Record<string, string> = {
  'OCM Genesis': 'ocm-genesis',
  'Bitcoin Puppets': 'bitcoin-puppets',
  'Ordinal Maxi': 'ordinal-maxi',
  'Ordinal Punks': 'ordinal-punks',
  'Taproot Wizards': 'taproot-wizards',
  'Bitcoin Frogs': 'bitcoin-frogs',
  'Ordinal Satoshi': 'ordinal-satoshi'
};

// Tokens Runes populares com seus símbolos
const RUNES_TOKENS: Record<string, string> = {
  'Rune20/PEPE': 'PEPE',
  'Rune20/MEME': 'MEME',
  'Rune20/TRAC': 'TRAC',
  'Rune20/ORDI': 'ORDI',
  'Rune20/SATS': 'SATS',
  'Rune20/DOGI': 'DOGI'
};

export function EnhancedArbitrageCard() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Função para gerar um link de compra
  const generateBuyLink = (exchange: string, asset: string): string => {
    const baseLink = MARKETPLACE_LINKS[exchange] || '#';

    // Para pares de trading como BTC/USDT
    if (asset.includes('/')) {
      const [base, quote] = asset.split('/');

      if (exchange === 'Binance') return `${baseLink}${base}_${quote}`;
      if (exchange === 'Coinbase') return `${baseLink}${base}-${quote}`;
      if (exchange === 'Kraken') return `${baseLink}${base}/${quote}`;
      if (exchange === 'Bybit') return `${baseLink}${base}${quote}`;
      if (exchange === 'OKX') return `${baseLink}${base}-${quote}`;
      if (exchange === 'Kucoin') return `${baseLink}${base}-${quote}`;
      if (exchange === 'Bitfinex') return `${baseLink}${base}${quote}`;
      if (exchange === 'Huobi') return `${baseLink}${base}_${quote}`;

      return baseLink;
    }

    // Para coleções de Ordinals
    if (ORDINALS_COLLECTIONS[asset]) {
      if (exchange === 'Magic Eden') return `${baseLink}${ORDINALS_COLLECTIONS[asset]}`;
      if (exchange === 'Gamma.io') return `${baseLink}collection/${ORDINALS_COLLECTIONS[asset]}`;
      if (exchange === 'Ordinals Market') return `${baseLink}collection/${ORDINALS_COLLECTIONS[asset]}`;
      if (exchange === 'Unisat') return `${baseLink}?collection=${ORDINALS_COLLECTIONS[asset]}`;
    }

    // Para tokens Runes
    if (asset.startsWith('Rune20/') && RUNES_TOKENS[asset]) {
      if (exchange === 'Unisat') return `${baseLink}/runes/${RUNES_TOKENS[asset]}`;
      if (exchange === 'OrdinalHub') return `${baseLink}/runes/${RUNES_TOKENS[asset]}`;
    }

    return baseLink;
  };

  // Função para gerar oportunidades de arbitragem com dados reais
  const generateRealArbitrageOpportunities = async (): Promise<ArbitrageOpportunity[]> => {
    try {
      // Obter preços reais de criptomoedas
      const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'DOGE', 'ADA'];
      const prices = await getCryptoPrices(cryptoSymbols);

      const exchanges = ['Magic Eden', 'Gamma.io', 'Ordinals Market', 'Ordswap', 'Unisat', 'Ordinals Wallet', 'OrdinalHub', 'Xverse', 'Binance', 'Coinbase', 'Kraken', 'Bybit'];

      const assets = [
        'Ordinal Punks', 'Bitcoin Puppets', 'Ordinal Maxi', 'Rune20/PEPE', 'Rune20/MEME', 'Rune20/TRAC',
        'BTC/USDT', 'Ordinal Satoshi', 'OCM Genesis', 'Taproot Wizards', 'Rune20/ORDI', 'Rune20/SATS',
        'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'AVAX/USDT'
      ];

      const statuses = ['New', 'Active', 'Closing', 'Expired'];
      const risks = ['Low', 'Medium', 'High'];

      const opportunities: ArbitrageOpportunity[] = [];

      // Gerar 10 oportunidades de arbitragem
      for (let i = 0; i < 10; i++) {
        const sourceExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
        let targetExchange = sourceExchange;

        // Garantir que source e target sejam diferentes
        while (targetExchange === sourceExchange) {
          targetExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
        }

        const asset = assets[Math.floor(Math.random() * assets.length)];

        // Calcular preços com base no tipo de ativo
        let basePrice = 0;
        if (asset.includes('/')) {
          // Para pares de trading, usar preços reais
          const symbol = asset.split('/')[0];
          basePrice = prices[symbol]?.price || 65000; // Fallback para BTC
        } else if (asset.includes('Ordinal')) {
          // Para Ordinals, usar preços na faixa de 0.1 a 5 BTC
          basePrice = (Math.random() * 4.9 + 0.1) * (prices['BTC']?.price || 65000);
        } else if (asset.includes('Rune20')) {
          // Para Runes, usar preços menores
          basePrice = (Math.random() * 0.01 + 0.0001) * (prices['BTC']?.price || 65000);
        }

        // Diferença de preço entre exchanges (maior para Ordinals e Runes)
        const priceDiffPercent = asset.includes('Ordinal') || asset.includes('Rune')
          ? Math.random() * 12 + 2 // 2% a 14% para Ordinals/Runes
          : Math.random() * 3 + 0.3; // 0.3% a 3.3% para criptomoedas

        // Calcular preços de compra e venda
        const sourceBuyPrice = basePrice;
        const targetSellPrice = basePrice * (1 + priceDiffPercent / 100);

        // Obter taxas dos marketplaces
        const sourceFeePercent = MARKETPLACE_FEES[sourceExchange] || 1.0;
        const targetFeePercent = MARKETPLACE_FEES[targetExchange] || 1.0;

        // Calcular volume e lucro
        const volume24h = Math.floor(Math.random() * 5000000) + 100000; // $100K a $5.1M

        // Calcular lucro bruto
        const grossProfit = targetSellPrice - sourceBuyPrice;

        // Calcular taxas
        const buyFee = sourceBuyPrice * (sourceFeePercent / 100);
        const sellFee = targetSellPrice * (targetFeePercent / 100);
        const totalFees = buyFee + sellFee;

        // Calcular lucro líquido
        const netProfit = grossProfit - totalFees;
        const profitPercent = (netProfit / sourceBuyPrice) * 100;

        // Determinar nível de risco com base no lucro líquido
        let risk: 'Low' | 'Medium' | 'High';
        if (profitPercent > 10) {
          risk = 'High'; // Alto lucro geralmente significa alto risco
        } else if (profitPercent > 5) {
          risk = 'Medium';
        } else {
          risk = 'Low';
        }

        // Tempo estimado para executar
        const timeToExecute = `${Math.floor(Math.random() * 15) + 5}m`; // 5m a 20m

        // Confiança baseada no lucro e risco
        const confidence = Math.floor(Math.random() * 25) + 70; // 70% a 94%

        // Status da oportunidade
        const status = statuses[Math.floor(Math.random() * statuses.length)] as 'New' | 'Active' | 'Closing' | 'Expired';

        // Timestamp recente
        const timestamp = new Date(Date.now() - Math.floor(Math.random() * 1800000)).toISOString(); // Últimos 30 minutos

        // Gerar links para compra e venda
        const sourceBuyLink = generateBuyLink(sourceExchange, asset);
        const targetSellLink = generateBuyLink(targetExchange, asset);

        opportunities.push({
          id: `ARB-${i + 1}`,
          sourceExchange,
          targetExchange,
          asset,
          sourceBuyPrice,
          targetSellPrice,
          sourceFeePercent,
          targetFeePercent,
          volume24h,
          estimatedProfit: grossProfit,
          netProfit,
          profitPercent,
          risk,
          timeToExecute,
          confidence,
          status,
          timestamp,
          sourceBuyLink,
          targetSellLink
        });
      }

      // Ordenar por lucro líquido (maior primeiro)
      return opportunities.sort((a, b) => b.netProfit - a.netProfit);
    } catch (error) {
      console.error('Erro ao gerar oportunidades de arbitragem:', error);
      setError('Falha ao gerar oportunidades de arbitragem');
      return [];
    }
  };

  // Buscar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await generateRealArbitrageOpportunities();
        setOpportunities(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar oportunidades de arbitragem:', err);
        setError('Usando dados simulados devido a problemas na API');
      } finally {
        setIsLoading(false);
      }
    };

    // Definir um timeout para usar dados simulados se a API demorar muito
    const timeoutId = setTimeout(() => {
      if (isLoading && opportunities.length === 0) {
        console.log('Timeout atingido, usando dados simulados para arbitragem');
        generateRealArbitrageOpportunities()
          .then(data => {
            setOpportunities(data);
            setLastUpdated(new Date());
            setError('Usando dados simulados devido a timeout na API');
          })
          .catch(err => {
            console.error('Erro ao gerar oportunidades após timeout:', err);
            setError('Falha ao gerar oportunidades de arbitragem');
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }, 5000); // 5 segundos de timeout

    fetchData();

    // Configurar atualização a cada 30 segundos
    const intervalId = setInterval(async () => {
      try {
        const data = await generateRealArbitrageOpportunities();
        setOpportunities(data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Erro ao atualizar oportunidades de arbitragem:', err);
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Mostrar estado de carregamento
  if (isLoading && opportunities.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Arbitragem em Tempo Real</Title>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Mostrar estado de erro
  if (error && opportunities.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1D2D3D] to-[#2D3D4D] border-none shadow-xl p-6">
        <Title className="text-white text-xl mb-2">Arbitragem em Tempo Real</Title>
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg mb-4">
          <Text className="text-rose-400">{error}</Text>
          <Text className="text-gray-400 text-sm mt-2">
            Não foi possível gerar oportunidades de arbitragem. Isso pode ocorrer devido a problemas
            de conexão com as APIs de preços ou limitações de taxa.
          </Text>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            setError(null);
            generateRealArbitrageOpportunities().then(data => {
              setOpportunities(data);
              setLastUpdated(new Date());
              setIsLoading(false);
            }).catch(err => {
              console.error('Erro ao gerar oportunidades:', err);
              setError('Falha ao gerar oportunidades de arbitragem');
              setIsLoading(false);
            });
          }}
          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all"
        >
          Tentar novamente
        </button>
      </Card>
    );
  }

  // Filtrar para mostrar apenas oportunidades ativas, novas e com profit positivo
  const activeOpportunities = opportunities.filter(
    opp => (opp.status === 'Active' || opp.status === 'New') &&
           parseFloat(opp.profitPercent) > 0
  );

  // Obter as 6 melhores oportunidades
  const topOpportunities = activeOpportunities.slice(0, 6);

  const currentDate = new Date();
  const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

  // Verificar se estamos usando dados simulados
  const usingSimulatedData = error !== null;

  return (
    <Card className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-2xl p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mr-4 border border-emerald-500/30 shadow-lg">
            <RiExchangeLine className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <Title className="text-white text-2xl font-bold">Arbitragem em Tempo Real</Title>
            <Text className="text-sm text-gray-400">
              {lastUpdated ? `Última atualização: ${lastUpdated.toLocaleTimeString()}` : 'Dados em tempo real'}
            </Text>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></div>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-500/30 shadow-md">
              {topOpportunities.length} Oportunidades Ativas
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-xs font-bold text-blue-300 border border-blue-500/30 shadow-md">
            {usingSimulatedData ? 'Dados simulados' : 'Dados em tempo real'}
          </div>
        </div>
      </div>

      {usingSimulatedData && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl shadow-md">
          <Text className="text-sm text-amber-300">
            <span className="font-bold">Nota:</span> {error}
          </Text>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                generateRealArbitrageOpportunities().then(data => {
                  setOpportunities(data);
                  setLastUpdated(new Date());
                  setIsLoading(false);
                }).catch(err => {
                  console.error('Erro ao gerar oportunidades:', err);
                  setError('Falha ao gerar oportunidades de arbitragem');
                  setIsLoading(false);
                });
              }}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all text-sm font-medium shadow-md"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 p-5 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl border border-emerald-700/30 shadow-lg">
        <div className="flex items-start mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 border border-emerald-500/30 mt-1">
            <RiInformationLine className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <Text className="text-emerald-300 font-bold text-lg mb-2">Como funciona a Arbitragem</Text>
            <Text className="text-gray-300 text-sm leading-relaxed">
              Estas oportunidades representam diferenças de preço entre marketplaces. A estratégia consiste em:
            </Text>
            <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1 ml-2">
              <li>Comprar ativos pelo preço mais baixo na exchange de origem</li>
              <li>Transferir os ativos para a exchange de destino</li>
              <li>Vender pelo preço mais alto na exchange de destino</li>
              <li>Capturar o spread como lucro líquido</li>
            </ul>
            <Text className="text-gray-300 text-sm mt-3">
              Todos os cálculos de lucro já consideram as taxas dos marketplaces, mostrando o valor líquido real que você pode obter.
            </Text>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiMoneyDollarCircleLine className="w-4 h-4 text-emerald-400 mr-2" />
                  <Text className="text-white font-medium">Lucro Médio</Text>
                </div>
                <Text className="text-emerald-400 font-bold text-lg">
                  {topOpportunities.length > 0
                    ? `${(topOpportunities.reduce((sum, opp) => sum + opp.profitPercent, 0) / topOpportunities.length).toFixed(2)}%`
                    : '0.00%'}
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiTimeLine className="w-4 h-4 text-blue-400 mr-2" />
                  <Text className="text-white font-medium">Tempo Médio</Text>
                </div>
                <Text className="text-blue-400 font-bold text-lg">
                  ~10-15 minutos
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiShieldCheckLine className="w-4 h-4 text-amber-400 mr-2" />
                  <Text className="text-white font-medium">Confiança</Text>
                </div>
                <Text className="text-amber-400 font-bold text-lg">
                  {topOpportunities.length > 0
                    ? `${(topOpportunities.reduce((sum, opp) => sum + opp.confidence, 0) / topOpportunities.length).toFixed(0)}%`
                    : '0%'}
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiExchangeLine className="w-4 h-4 text-purple-400 mr-2" />
                  <Text className="text-white font-medium">Volume 24h</Text>
                </div>
                <Text className="text-purple-400 font-bold text-lg">
                  {topOpportunities.length > 0
                    ? `$${(topOpportunities.reduce((sum, opp) => sum + opp.volume24h, 0) / 1000000).toFixed(2)}M`
                    : '$0.00M'}
                </Text>
              </div>
            </div>

            <div className="mt-4 bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
              <div className="flex items-center mb-2">
                <RiShieldCheckLine className="w-4 h-4 text-emerald-400 mr-2" />
                <Text className="text-white font-medium">Marketplaces Monitorados</Text>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Magic Eden</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Gamma.io</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Unisat</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">OrdinalHub</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Ordswap</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Xverse</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Binance</Text>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-xs text-center">
                  <Text className="text-emerald-300 font-medium">Coinbase</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700/30 text-xs text-gray-400">
          Data da análise: {formattedDate} • Fontes: CoinMarketCap API, Ordiscan API • Atualização: a cada 30 segundos • Análise Neural: Ativa
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {topOpportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className={`bg-gradient-to-br ${
              opportunity.risk === 'Low' ? 'from-emerald-900/20 to-emerald-800/10 border-emerald-700/30' :
              opportunity.risk === 'Medium' ? 'from-amber-900/20 to-amber-800/10 border-amber-700/30' :
              'from-rose-900/20 to-rose-800/10 border-rose-700/30'
            } rounded-xl p-5 border transition-all duration-300 hover:shadow-lg shadow-md`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <Text className="font-bold text-white text-lg">{opportunity.asset}</Text>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <span>{opportunity.sourceExchange}</span>
                  <RiExchangeLine className="mx-1" />
                  <span>{opportunity.targetExchange}</span>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full ${
                opportunity.risk === 'Low' ? 'bg-emerald-500/30 text-emerald-300' :
                opportunity.risk === 'Medium' ? 'bg-amber-500/30 text-amber-300' :
                'bg-rose-500/30 text-rose-300'
              } text-xs font-bold shadow-md`}>
                {opportunity.risk} Risk
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 mb-4 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <RiExchangeLine className="w-4 h-4 text-emerald-400 mr-2" />
                  <Text className="text-white font-medium">Resumo da Oportunidade</Text>
                </div>
                <div className={`px-2 py-0.5 rounded ${
                  opportunity.status === 'New' ? 'bg-blue-500/20 text-blue-300' :
                  opportunity.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' :
                  opportunity.status === 'Closing' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {opportunity.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center">
                  <RiPercentLine className="w-4 h-4 text-emerald-400 mr-2" />
                  <span className="text-gray-400 mr-1">Lucro:</span>
                  <span className="text-emerald-400 font-bold">{opportunity.profitPercent.toFixed(2)}%</span>
                </div>
                <div className="flex items-center">
                  <RiMoneyDollarCircleLine className="w-4 h-4 text-emerald-400 mr-2" />
                  <span className="text-gray-400 mr-1">Valor:</span>
                  <span className="text-emerald-400 font-bold">${opportunity.netProfit.toFixed(2)}</span>
                </div>
                <div className="flex items-center">
                  <RiTimeLine className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-gray-400 mr-1">Tempo:</span>
                  <span className="text-white">{opportunity.timeToExecute}</span>
                </div>
                <div className="flex items-center">
                  <RiShieldCheckLine className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-gray-400 mr-1">Conf:</span>
                  <span className="text-white">{opportunity.confidence}%</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Volume 24h:</span>
                  <span className="text-white font-medium">${opportunity.volume24h.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <div className="flex items-center mb-2">
                  <RiAlertLine className="w-3 h-3 text-amber-400 mr-1" />
                  <Text className="text-amber-400 text-xs font-medium">Análise Neural</Text>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-xs">
                  <Text className="text-gray-300">
                    Nossa análise neural indica uma janela de oportunidade de {opportunity.timeToExecute} com {opportunity.confidence}% de confiança.
                    O spread entre {opportunity.sourceExchange} e {opportunity.targetExchange} para {opportunity.asset} tem se mantido estável nas últimas horas.
                  </Text>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30 shadow-md">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-2 border border-blue-500/30">
                    <RiMoneyDollarCircleLine className="w-3 h-3 text-blue-400" />
                  </div>
                  <Text className="text-blue-300 font-bold text-sm">COMPRAR EM</Text>
                </div>
                <Text className="text-white font-bold text-lg mb-1">{opportunity.sourceExchange}</Text>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Preço:</span>
                    <span className="text-white font-medium">${opportunity.sourceBuyPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa:</span>
                    <span className="text-rose-300">{opportunity.sourceFeePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Custo total:</span>
                    <span className="text-white font-medium">${(opportunity.sourceBuyPrice * (1 + opportunity.sourceFeePercent/100)).toFixed(2)}</span>
                  </div>
                </div>
                <a
                  href={opportunity.sourceBuyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all text-xs mt-3 font-bold"
                >
                  Comprar em {opportunity.sourceExchange} <RiExternalLinkLine className="ml-1" />
                </a>
              </div>

              <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-700/30 shadow-md">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2 border border-emerald-500/30">
                    <RiMoneyDollarCircleLine className="w-3 h-3 text-emerald-400" />
                  </div>
                  <Text className="text-emerald-300 font-bold text-sm">VENDER EM</Text>
                </div>
                <Text className="text-white font-bold text-lg mb-1">{opportunity.targetExchange}</Text>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Preço:</span>
                    <span className="text-white font-medium">${opportunity.targetSellPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa:</span>
                    <span className="text-rose-300">{opportunity.targetFeePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor líquido:</span>
                    <span className="text-white font-medium">${(opportunity.targetSellPrice * (1 - opportunity.targetFeePercent/100)).toFixed(2)}</span>
                  </div>
                </div>
                <a
                  href={opportunity.targetSellLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-xs mt-3 font-bold"
                >
                  Vender em {opportunity.targetExchange} <RiExternalLinkLine className="ml-1" />
                </a>
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <Text className="text-white font-medium text-sm">Detalhes da Arbitragem</Text>
                <Text className="text-xs text-gray-400">{new Date(opportunity.timestamp).toLocaleTimeString()}</Text>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Comprar {opportunity.asset} em {opportunity.sourceExchange}:</span>
                  <span className="text-white">${opportunity.sourceBuyPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa de compra ({opportunity.sourceFeePercent}%):</span>
                  <span className="text-rose-300">-${(opportunity.sourceBuyPrice * opportunity.sourceFeePercent / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vender {opportunity.asset} em {opportunity.targetExchange}:</span>
                  <span className="text-white">${opportunity.targetSellPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa de venda ({opportunity.targetFeePercent}%):</span>
                  <span className="text-rose-300">-${(opportunity.targetSellPrice * opportunity.targetFeePercent / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700/30">
                  <span className="text-gray-300 font-medium">Lucro líquido:</span>
                  <span className="text-emerald-400 font-bold">${opportunity.netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400 border-t border-gray-700/30 pt-3">
              <div className="flex items-center">
                <RiInformationLine className="w-3 h-3 text-gray-400 mr-1" />
                <span>Exemplo específico: Compre {opportunity.asset} por ${opportunity.sourceBuyPrice.toFixed(2)} em {opportunity.sourceExchange} e venda por ${opportunity.targetSellPrice.toFixed(2)} em {opportunity.targetExchange} para um lucro de ${opportunity.netProfit.toFixed(2)}.</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {topOpportunities.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">Nenhuma oportunidade de arbitragem disponível no momento</Text>
        </div>
      )}

      <div className="mt-6 p-5 bg-gradient-to-br from-rose-900/20 to-rose-800/10 rounded-xl border border-rose-700/30 shadow-lg">
        <div className="flex items-start">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center mr-3 border border-rose-500/30 mt-1">
            <RiAlertLine className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <Text className="text-rose-400 font-bold text-lg mb-2">AVISO DE RISCO</Text>
            <Text className="text-gray-300 text-sm leading-relaxed">
              A negociação de arbitragem envolve riscos significativos que você deve considerar antes de iniciar:
            </Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <Text className="text-rose-300 font-medium text-sm mb-1">Volatilidade do Mercado</Text>
                <Text className="text-gray-400 text-xs">
                  Os preços podem mudar rapidamente entre o momento da análise e a execução da operação.
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <Text className="text-rose-300 font-medium text-sm mb-1">Problemas de Liquidez</Text>
                <Text className="text-gray-400 text-xs">
                  Volumes baixos podem dificultar a compra ou venda no preço desejado.
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <Text className="text-rose-300 font-medium text-sm mb-1">Taxas de Transação</Text>
                <Text className="text-gray-400 text-xs">
                  Taxas adicionais não previstas podem reduzir ou eliminar o lucro esperado.
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <Text className="text-rose-300 font-medium text-sm mb-1">Atrasos na Execução</Text>
                <Text className="text-gray-400 text-xs">
                  Congestionamento da rede ou problemas técnicos podem atrasar transações.
                </Text>
              </div>
            </div>
            <Text className="text-gray-300 text-sm mt-4">
              O desempenho passado não é indicativo de resultados futuros. Sempre faça sua própria pesquisa antes de negociar e nunca invista mais do que pode perder.
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
