'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Title, Text, Button } from '@tremor/react'
import { RiExchangeLine, RiTimeLine, RiShieldCheckLine, RiMoneyDollarCircleLine, RiPercentLine, RiExternalLinkLine, RiInformationLine, RiAlertLine } from 'react-icons/ri'

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

// Taxas reais dos marketplaces
const MARKETPLACE_FEES: Record<string, number> = {
  'Gamma.io': 2.0,
  'UniSat': 1.0,
  'OKX': 0.5,
  'Ordinals Market': 1.5,
};

// Links para os marketplaces
const MARKETPLACE_LINKS: Record<string, string> = {
  'Gamma.io': 'https://gamma.io/ordinals/',
  'UniSat': 'https://unisat.io/runes/market/',
  'OKX': 'https://www.okx.com/web3/marketplace/runes/',
  'Ordinals Market': 'https://ordinals.market/',
};

export function EnhancedArbitrageCard() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Gerar link de marketplace
  const generateLink = (exchange: string, asset: string): string => {
    const baseLink = MARKETPLACE_LINKS[exchange] || '#';
    const runeSlug = asset.replace('Rune/', '').replace(/[•]/g, '-').toLowerCase();
    return `${baseLink}${encodeURIComponent(runeSlug)}`;
  };

  // Buscar oportunidades reais da API de arbitragem de Runes
  const fetchRealOpportunities = useCallback(async (): Promise<ArbitrageOpportunity[]> => {
    try {
      // Buscar dados da API de arbitragem
      const response = await fetch('/api/arbitrage/opportunities/');
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json();
      const apiOpportunities = data.opportunities || data.data || data || [];

      if (!Array.isArray(apiOpportunities) || apiOpportunities.length === 0) {
        // Fallback: buscar do serviço de runas arbitragem
        const runesResponse = await fetch('/api/runes/trending/');
        if (!runesResponse.ok) return [];

        const runesData = await runesResponse.json();
        const trending = runesData.runes || runesData.data || [];

        // Buscar preços de múltiplas fontes para encontrar diferenças reais
        const opportunities: ArbitrageOpportunity[] = [];

        for (const rune of trending.slice(0, 8)) {
          const name = rune.spacedRune || rune.rune || rune.name;
          if (!name) continue;

          // Buscar preço do Gamma.io
          let mePrice = 0;
          let meVolume = 0;
          try {
            const meResp = await fetch(`/api/magiceden/runes/${encodeURIComponent(name)}/`);
            if (meResp.ok) {
              const meData = await meResp.json();
              mePrice = meData.floorUnitPrice?.value || meData.floorPrice || 0;
              meVolume = meData.volume24h || 0;
            }
          } catch { /* skip */ }

          // Buscar preço do UniSat / runes API
          let uniPrice = 0;
          let uniVolume = 0;
          try {
            const uniResp = await fetch(`/api/runes/${encodeURIComponent(name)}/`);
            if (uniResp.ok) {
              const uniData = await uniResp.json();
              uniPrice = uniData.market?.floorPrice || uniData.floorUnitPrice?.value || 0;
              uniVolume = uniData.market?.volume24h || uniData.volume24h || 0;
            }
          } catch { /* skip */ }

          // Se temos preços de ambas exchanges e há diferença
          if (mePrice > 0 && uniPrice > 0 && mePrice !== uniPrice) {
            const [cheap, expensive] = mePrice < uniPrice
              ? [{ name: 'Gamma.io', price: mePrice, vol: meVolume }, { name: 'UniSat', price: uniPrice, vol: uniVolume }]
              : [{ name: 'UniSat', price: uniPrice, vol: uniVolume }, { name: 'Gamma.io', price: mePrice, vol: meVolume }];

            const sourceFee = MARKETPLACE_FEES[cheap.name] || 1.0;
            const targetFee = MARKETPLACE_FEES[expensive.name] || 1.0;

            const buyWithFee = cheap.price * (1 + sourceFee / 100);
            const sellWithFee = expensive.price * (1 - targetFee / 100);
            const netProfitPerUnit = sellWithFee - buyWithFee;

            if (netProfitPerUnit <= 0) continue;

            const profitPercent = (netProfitPerUnit / buyWithFee) * 100;
            const totalVolume = cheap.vol + expensive.vol;
            const timeWindow = totalVolume > 500000 ? 5 : totalVolume > 100000 ? 10 : 20;

            // Determinar risco
            let risk: 'Low' | 'Medium' | 'High';
            if (profitPercent > 10) risk = 'High';
            else if (profitPercent > 5) risk = 'Medium';
            else risk = 'Low';

            // Confiança baseada no volume e spread
            const volumeFactor = Math.min(totalVolume / 1000000, 0.1);
            const spreadFactor = Math.min(profitPercent / 20, 0.1);
            const confidence = Math.min(95, Math.round((0.75 + volumeFactor + spreadFactor) * 100));

            opportunities.push({
              id: `ARB-${name.substring(0, 8)}-${Date.now()}`,
              sourceExchange: cheap.name,
              targetExchange: expensive.name,
              asset: `Rune/${name}`,
              sourceBuyPrice: cheap.price,
              targetSellPrice: expensive.price,
              sourceFeePercent: sourceFee,
              targetFeePercent: targetFee,
              volume24h: totalVolume,
              estimatedProfit: netProfitPerUnit,
              netProfit: netProfitPerUnit,
              profitPercent,
              risk,
              timeToExecute: `${timeWindow}m`,
              confidence,
              status: 'Active',
              timestamp: new Date().toISOString(),
              sourceBuyLink: generateLink(cheap.name, `Rune/${name}`),
              targetSellLink: generateLink(expensive.name, `Rune/${name}`),
            });
          }
        }

        return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
      }

      // Map API data to our ArbitrageOpportunity interface
      return apiOpportunities.map((opp: any, idx: number) => {
        const sourceFee = MARKETPLACE_FEES[opp.sourceExchange] || opp.sourceFeePercent || 1.0;
        const targetFee = MARKETPLACE_FEES[opp.targetExchange] || opp.targetFeePercent || 1.0;

        const buyWithFee = (opp.sourceBuyPrice || 0) * (1 + sourceFee / 100);
        const sellWithFee = (opp.targetSellPrice || 0) * (1 - targetFee / 100);
        const netProfit = sellWithFee - buyWithFee;
        const profitPercent = buyWithFee > 0 ? (netProfit / buyWithFee) * 100 : 0;

        let risk: 'Low' | 'Medium' | 'High';
        if (profitPercent > 10) risk = 'High';
        else if (profitPercent > 5) risk = 'Medium';
        else risk = 'Low';

        const totalVolume = opp.volume24h || 0;
        const timeWindow = totalVolume > 500000 ? 5 : totalVolume > 100000 ? 10 : 20;
        const confidence = opp.confidence || Math.min(95, Math.round(75 + Math.min(totalVolume / 1000000, 10)));

        return {
          id: opp.id || `ARB-${idx}`,
          sourceExchange: opp.sourceExchange || 'Gamma.io',
          targetExchange: opp.targetExchange || 'UniSat',
          asset: opp.asset || opp.rune || 'Unknown',
          sourceBuyPrice: opp.sourceBuyPrice || 0,
          targetSellPrice: opp.targetSellPrice || 0,
          sourceFeePercent: sourceFee,
          targetFeePercent: targetFee,
          volume24h: totalVolume,
          estimatedProfit: netProfit,
          netProfit,
          profitPercent,
          risk,
          timeToExecute: `${timeWindow}m`,
          confidence,
          status: opp.status || 'Active',
          timestamp: opp.timestamp || new Date().toISOString(),
          sourceBuyLink: generateLink(opp.sourceExchange || 'Gamma.io', opp.asset || ''),
          targetSellLink: generateLink(opp.targetExchange || 'UniSat', opp.asset || ''),
        };
      }).filter((opp: ArbitrageOpportunity) => opp.profitPercent > 0)
        .sort((a: ArbitrageOpportunity, b: ArbitrageOpportunity) => b.profitPercent - a.profitPercent);
    } catch (error) {
      console.error('Erro ao buscar oportunidades reais de arbitragem:', error);
      return [];
    }
  }, []);

  // Buscar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchRealOpportunities();
        setOpportunities(data);
        setLastUpdated(new Date());
        if (data.length === 0) {
          setError('Nenhuma oportunidade de arbitragem encontrada. Mercados podem estar alinhados.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Erro ao buscar oportunidades de arbitragem:', err);
        setError('Falha ao conectar com APIs de mercado');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Atualizar a cada 60 segundos (respeitar rate limits)
    const intervalId = setInterval(async () => {
      try {
        const data = await fetchRealOpportunities();
        if (data.length > 0) {
          setOpportunities(data);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (err) {
        console.error('Erro ao atualizar oportunidades de arbitragem:', err);
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchRealOpportunities]);

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
            Não foi possível detectar oportunidades de arbitragem. As APIs podem estar com rate limit ou os mercados estão alinhados.
          </Text>
        </div>
        <button
          onClick={async () => {
            setIsLoading(true);
            setError(null);
            const data = await fetchRealOpportunities();
            setOpportunities(data);
            setLastUpdated(new Date());
            if (data.length === 0) {
              setError('Nenhuma oportunidade encontrada. Mercados alinhados.');
            }
            setIsLoading(false);
          }}
          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all"
        >
          Tentar novamente
        </button>
      </Card>
    );
  }

  // Filtrar para mostrar apenas oportunidades ativas com profit positivo
  const activeOpportunities = opportunities.filter(
    opp => (opp.status === 'Active' || opp.status === 'New') && opp.profitPercent > 0
  );

  // Obter as 6 melhores oportunidades
  const topOpportunities = activeOpportunities.slice(0, 6);

  const currentDate = new Date();
  const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

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
              {lastUpdated ? `Última atualização: ${lastUpdated.toLocaleTimeString()}` : 'Conectando às APIs...'}
            </Text>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></div>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-500/30 shadow-md">
              {topOpportunities.length} Oportunidades
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-xs font-bold text-blue-300 border border-blue-500/30 shadow-md">
            Dados em tempo real
          </div>
        </div>
      </div>

      <div className="mb-6 p-5 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl border border-emerald-700/30 shadow-lg">
        <div className="flex items-start mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 border border-emerald-500/30 mt-1">
            <RiInformationLine className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <Text className="text-emerald-300 font-bold text-lg mb-2">Arbitragem de Runes entre Exchanges</Text>
            <Text className="text-gray-300 text-sm leading-relaxed">
              Diferenças reais de preço detectadas entre marketplaces de Runes. Lucros calculados após taxas reais de cada exchange.
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
                  <Text className="text-white font-medium">Janela Média</Text>
                </div>
                <Text className="text-blue-400 font-bold text-lg">
                  {topOpportunities.length > 0
                    ? `~${Math.round(topOpportunities.reduce((sum, opp) => sum + parseInt(opp.timeToExecute), 0) / topOpportunities.length)}m`
                    : 'N/A'}
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiShieldCheckLine className="w-4 h-4 text-amber-400 mr-2" />
                  <Text className="text-white font-medium">Confiança</Text>
                </div>
                <Text className="text-amber-400 font-bold text-lg">
                  {topOpportunities.length > 0
                    ? `${Math.round(topOpportunities.reduce((sum, opp) => sum + opp.confidence, 0) / topOpportunities.length)}%`
                    : '0%'}
                </Text>
              </div>
              <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/30">
                <div className="flex items-center mb-1">
                  <RiExchangeLine className="w-4 h-4 text-purple-400 mr-2" />
                  <Text className="text-white font-medium">Exchanges</Text>
                </div>
                <Text className="text-purple-400 font-bold text-lg">
                  Gamma / UniSat / OKX
                </Text>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700/30 text-xs text-gray-400">
          Data: {formattedDate} | Fontes: Gamma.io API, UniSat API | Atualização: a cada 60s
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
                  <Text className="text-white font-medium">Resumo</Text>
                </div>
                <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
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
                  <span className="text-gray-400 mr-1">Net:</span>
                  <span className="text-emerald-400 font-bold">{opportunity.netProfit.toFixed(0)} sats</span>
                </div>
                <div className="flex items-center">
                  <RiTimeLine className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-gray-400 mr-1">Janela:</span>
                  <span className="text-white">{opportunity.timeToExecute}</span>
                </div>
                <div className="flex items-center">
                  <RiShieldCheckLine className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-gray-400 mr-1">Conf:</span>
                  <span className="text-white">{opportunity.confidence}%</span>
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
                    <span className="text-gray-400">Floor:</span>
                    <span className="text-white font-medium">{opportunity.sourceBuyPrice.toLocaleString()} sats</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa:</span>
                    <span className="text-rose-300">{opportunity.sourceFeePercent}%</span>
                  </div>
                </div>
                <a
                  href={opportunity.sourceBuyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all text-xs mt-3 font-bold"
                >
                  Comprar <RiExternalLinkLine className="ml-1" />
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
                    <span className="text-gray-400">Floor:</span>
                    <span className="text-white font-medium">{opportunity.targetSellPrice.toLocaleString()} sats</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxa:</span>
                    <span className="text-rose-300">{opportunity.targetFeePercent}%</span>
                  </div>
                </div>
                <a
                  href={opportunity.targetSellLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-xs mt-3 font-bold"
                >
                  Vender <RiExternalLinkLine className="ml-1" />
                </a>
              </div>
            </div>

            <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 shadow-inner">
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Comprar em {opportunity.sourceExchange}:</span>
                  <span className="text-white">{opportunity.sourceBuyPrice.toLocaleString()} sats/unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa compra ({opportunity.sourceFeePercent}%):</span>
                  <span className="text-rose-300">-{Math.round(opportunity.sourceBuyPrice * opportunity.sourceFeePercent / 100)} sats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vender em {opportunity.targetExchange}:</span>
                  <span className="text-white">{opportunity.targetSellPrice.toLocaleString()} sats/unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa venda ({opportunity.targetFeePercent}%):</span>
                  <span className="text-rose-300">-{Math.round(opportunity.targetSellPrice * opportunity.targetFeePercent / 100)} sats</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700/30">
                  <span className="text-gray-300 font-medium">Lucro líquido:</span>
                  <span className="text-emerald-400 font-bold">{opportunity.netProfit.toFixed(0)} sats/unit ({opportunity.profitPercent.toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {topOpportunities.length === 0 && (
        <div className="text-center py-6">
          <Text className="text-gray-400">Nenhuma oportunidade de arbitragem detectada. Mercados estão alinhados.</Text>
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
              Oportunidades de arbitragem são baseadas em preços de floor em tempo real e podem mudar rapidamente. Considere slippage, taxas de rede Bitcoin, e tempo de confirmação de transações antes de executar.
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
