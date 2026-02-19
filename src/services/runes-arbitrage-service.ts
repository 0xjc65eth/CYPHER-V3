import { neuralLearningService } from './neural-learning-service';
import { magicEdenRunesService, type RuneMarketInfo, type RuneCollectionStat } from './magicEdenRunesService';

// Runas populares para monitorar arbitragem (nomes reais do protocolo)
const TRACKED_RUNES = [
  'DOG•GO•TO•THE•MOON',
  'RSIC•GENESIS•RUNE',
  'PUPS•WORLD•PEACE',
  'SATOSHI•NAKAMOTO',
  'BILLION•DOLLAR•CAT',
  'RUNES•X•BITCOIN',
  'MEME•ECONOMICS',
  'THE•RUNESTONE',
];

// Exchanges reais que suportam Runes com taxas verificadas
const RUNE_EXCHANGES = [
  {
    name: 'Magic Eden',
    url: 'https://magiceden.io/runes',
    fee: 2.0,
    source: 'magiceden' as const,
  },
  {
    name: 'UniSat',
    url: 'https://unisat.io/runes/market',
    fee: 1.0,
    source: 'unisat' as const,
  },
  {
    name: 'OKX',
    url: 'https://www.okx.com/web3/marketplace/runes',
    fee: 0.5,
    source: 'okx' as const,
  },
];

// Interface para dados de preço de uma exchange
interface ExchangePrice {
  exchange: typeof RUNE_EXCHANGES[number];
  floorPriceSats: number;
  volume24h: number;
  listedCount: number;
}

// Interface para insights de arbitragem de runas
export interface RuneArbitrageInsight {
  id: string;
  timestamp: string;
  modelId: string;
  confidence: number;
  type: 'arbitrage';
  prediction: {
    sourceExchange: string;
    targetExchange: string;
    asset: string;
    sourceBuyPrice: number;
    targetSellPrice: number;
    profitPercent: string;
    estimatedProfit: number;
    timeWindow: string;
  };
  explanation: string;
  relatedMetrics: string[];
  dataPoints: number;
}

// Serviço para gerar insights de arbitragem de runas usando dados reais
export class RunesArbitrageService {
  private static instance: RunesArbitrageService;
  private lastUpdate: Date = new Date(0);
  private cachedInsights: RuneArbitrageInsight[] = [];
  private updateInterval: number = 120000; // 2 minutos
  private updateTimer: NodeJS.Timeout | null = null;
  private isUpdating: boolean = false;

  private constructor() {
    this.generateRunesArbitrageInsights();
    this.startAutoUpdate();
  }

  public static getInstance(): RunesArbitrageService {
    if (!RunesArbitrageService.instance) {
      RunesArbitrageService.instance = new RunesArbitrageService();
    }
    return RunesArbitrageService.instance;
  }

  private startAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.updateTimer = setInterval(() => {
      this.generateRunesArbitrageInsights();
    }, this.updateInterval);
  }

  public stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Busca preços reais de uma runa no Magic Eden
   */
  private async fetchMagicEdenPrice(runeName: string): Promise<ExchangePrice | null> {
    try {
      const info: RuneMarketInfo = await magicEdenRunesService.getRuneMarketInfo(runeName);
      if (!info || !info.floorUnitPrice?.value) return null;

      return {
        exchange: RUNE_EXCHANGES.find(e => e.source === 'magiceden')!,
        floorPriceSats: info.floorUnitPrice.value,
        volume24h: info.volume24h || 0,
        listedCount: info.listedCount || 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca preços reais de runas via API interna (agrega UniSat + OKX)
   */
  private async fetchAlternativePrices(runeName: string): Promise<ExchangePrice[]> {
    const prices: ExchangePrice[] = [];

    // Busca preço via API interna que agrega dados de UniSat
    try {
      const response = await fetch(`/api/runes/${encodeURIComponent(runeName)}/`);
      if (response.ok) {
        const data = await response.json();
        if (data?.market?.floorPrice || data?.floorUnitPrice) {
          const floorSats = data.market?.floorPrice || data.floorUnitPrice?.value || 0;
          if (floorSats > 0) {
            prices.push({
              exchange: RUNE_EXCHANGES.find(e => e.source === 'unisat')!,
              floorPriceSats: floorSats,
              volume24h: data.market?.volume24h || data.volume24h || 0,
              listedCount: data.market?.listedCount || data.listedCount || 0,
            });
          }
        }
      }
    } catch (error) {
    }

    // OKX via API route
    try {
      const response = await fetch(`/api/okx/runes/${encodeURIComponent(runeName)}/`);
      if (response.ok) {
        const data = await response.json();
        if (data?.floorPrice && data.floorPrice > 0) {
          prices.push({
            exchange: RUNE_EXCHANGES.find(e => e.source === 'okx')!,
            floorPriceSats: data.floorPrice,
            volume24h: data.volume24h || 0,
            listedCount: data.listedCount || 0,
          });
        }
      }
    } catch (error) {
      // OKX API may not be available - silently ignore
    }

    return prices;
  }

  /**
   * Busca dados top de mercado do Magic Eden para obter lista de runas ativas
   */
  private async fetchTopRunes(): Promise<RuneCollectionStat[]> {
    try {
      const stats = await magicEdenRunesService.getRuneCollectionStats({
        sortBy: 'volume',
        sortDirection: 'desc',
        limit: 20,
      });
      return stats?.runes || [];
    } catch (error) {
      return [];
    }
  }

  // Gerar insights de arbitragem usando dados reais das APIs
  private async generateRunesArbitrageInsights(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {

      // 1. Obter lista de runas populares do Magic Eden
      const topRunes = await this.fetchTopRunes();
      const runeNames = topRunes.length > 0
        ? topRunes.map(r => r.spacedRune || r.rune).filter(Boolean).slice(0, 10)
        : TRACKED_RUNES.slice(0, 6);

      const newInsights: RuneArbitrageInsight[] = [];
      const arbitrageModel = neuralLearningService.getModel('arbitrage-opportunities');
      const baseConfidence = arbitrageModel?.accuracy || 0.75;

      // 2. Para cada runa, buscar preços em múltiplas exchanges
      for (let i = 0; i < runeNames.length; i++) {
        const runeName = runeNames[i];

        // Buscar preços reais de todas as exchanges em paralelo
        const [mePriceData, altPrices] = await Promise.all([
          this.fetchMagicEdenPrice(runeName),
          this.fetchAlternativePrices(runeName),
        ]);

        // Agregar todos os preços disponíveis
        const allPrices: ExchangePrice[] = [];
        if (mePriceData) allPrices.push(mePriceData);
        allPrices.push(...altPrices);

        // Precisamos de pelo menos 2 exchanges com preços válidos
        if (allPrices.length < 2) continue;

        // Ordenar por preço (menor para maior)
        allPrices.sort((a, b) => a.floorPriceSats - b.floorPriceSats);

        const cheapest = allPrices[0];
        const mostExpensive = allPrices[allPrices.length - 1];

        // Calcular diferença percentual real
        const priceDiffPercent = ((mostExpensive.floorPriceSats - cheapest.floorPriceSats) / cheapest.floorPriceSats) * 100;

        // Ignorar diferenças menores que 2% (não vale após taxas)
        if (priceDiffPercent < 2) continue;

        // Calcular lucro líquido considerando taxas reais
        const sourceFeeRate = cheapest.exchange.fee / 100;
        const targetFeeRate = mostExpensive.exchange.fee / 100;

        const buyWithFee = cheapest.floorPriceSats * (1 + sourceFeeRate);
        const sellWithFee = mostExpensive.floorPriceSats * (1 - targetFeeRate);

        const netProfitPerUnit = sellWithFee - buyWithFee;

        // Se lucro líquido é negativo após taxas, não é oportunidade real
        if (netProfitPerUnit <= 0) continue;

        const netProfitPercent = (netProfitPerUnit / buyWithFee) * 100;

        // Volume real para estimar tamanho da oportunidade
        const totalVolume = cheapest.volume24h + mostExpensive.volume24h;
        const minListed = Math.min(cheapest.listedCount, mostExpensive.listedCount);
        const transactionSize = Math.max(1, Math.min(minListed, Math.floor(totalVolume * 0.001)));

        const estimatedProfit = netProfitPerUnit * transactionSize;

        // Confiança baseada em dados reais: volume, liquidez, spread
        const volumeFactor = Math.min(totalVolume / 1_000_000, 0.1);
        const liquidityFactor = Math.min(minListed / 100, 0.05);
        const spreadFactor = Math.min(netProfitPercent / 20, 0.1);
        const confidence = Math.min(0.95, baseConfidence + volumeFactor + liquidityFactor + spreadFactor);

        // Janela de tempo baseada no volume (mais volume = oportunidade fecha mais rápido)
        const timeWindowMinutes = totalVolume > 500000 ? 5 : totalVolume > 100000 ? 10 : 20;

        const explanation = `Oportunidade real detectada: ${runeName} listada a ${cheapest.floorPriceSats} sats/unit em ${cheapest.exchange.name} e ${mostExpensive.floorPriceSats} sats/unit em ${mostExpensive.exchange.name}.

Spread bruto: ${priceDiffPercent.toFixed(2)}%. Após taxas (${cheapest.exchange.fee}% + ${mostExpensive.exchange.fee}%), lucro líquido: ${netProfitPercent.toFixed(2)}%.

Volume 24h combinado: ${totalVolume.toLocaleString()} sats. Listagens disponíveis: ${minListed} na exchange mais barata. Janela estimada: ${timeWindowMinutes} minutos.`;

        newInsights.push({
          id: `rune-arb-${Date.now()}-${i}`,
          timestamp: new Date().toISOString(),
          modelId: 'arbitrage-opportunities',
          confidence: Math.round(confidence * 100),
          type: 'arbitrage',
          prediction: {
            sourceExchange: cheapest.exchange.name,
            targetExchange: mostExpensive.exchange.name,
            asset: `Rune/${runeName}`,
            sourceBuyPrice: cheapest.floorPriceSats,
            targetSellPrice: mostExpensive.floorPriceSats,
            profitPercent: netProfitPercent.toFixed(2),
            estimatedProfit,
            timeWindow: `${timeWindowMinutes} minutos`,
          },
          explanation,
          relatedMetrics: ['floorPrice', 'volume24h', 'listedCount', 'exchangeFees', 'spread'],
          dataPoints: totalVolume > 0 ? Math.round(totalVolume / 100) : 0,
        });
      }

      // Ordenar por lucro percentual (maior primeiro)
      newInsights.sort((a, b) =>
        parseFloat(b.prediction.profitPercent) - parseFloat(a.prediction.profitPercent)
      );

      this.cachedInsights = newInsights;
      this.lastUpdate = new Date();

    } catch (error) {
      console.error('[Arbitrage] Error generating runes arbitrage insights:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  public getRunesArbitrageInsights(): RuneArbitrageInsight[] {
    const now = new Date();
    if (now.getTime() - this.lastUpdate.getTime() > this.updateInterval) {
      this.generateRunesArbitrageInsights();
    }
    return this.cachedInsights;
  }

  public forceUpdate(): void {
    this.generateRunesArbitrageInsights();
  }
}

export const runesArbitrageService = RunesArbitrageService.getInstance();
