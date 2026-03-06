import { neuralLearningService } from './neural-learning-service';
import { runesMarketService, type RuneMarketInfo, type RuneCollectionStat } from './runesMarketService';
import { xverseAPI } from '@/lib/api/xverse';

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
    name: 'Xverse/Aggregated',
    url: 'https://wallet.xverse.app',
    fee: 1.5,
    source: 'xverse' as const,
  },
  {
    name: 'Gamma.io',
    url: 'https://gamma.io/ordinals/collections/runes',
    fee: 2.0,
    source: 'gamma' as const,
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
   * Busca preços reais de uma runa no Gamma.io
   */
  private async fetchGammaPrice(runeName: string): Promise<ExchangePrice | null> {
    try {
      const info: RuneMarketInfo = await runesMarketService.getRuneMarketInfo(runeName);
      if (!info || !info.floorUnitPrice?.value) return null;

      return {
        exchange: RUNE_EXCHANGES.find(e => e.source === 'gamma')!,
        floorPriceSats: info.floorUnitPrice.value,
        volume24h: info.volume24h || 0,
        listedCount: info.listedCount || 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch rune prices directly from external APIs (not internal API routes).
   * Server-side services cannot call their own /api routes.
   */
  private async fetchAlternativePrices(runeName: string): Promise<ExchangePrice[]> {
    const prices: ExchangePrice[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // UniSat direct API — preserve bullet character in encoding
    try {
      const encodedName = encodeURIComponent(runeName);
      const response = await fetch(
        `https://open-api.unisat.io/v1/indexer/runes/${encodedName}/info`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            ...(process.env.UNISAT_API_KEY
              ? { 'Authorization': `Bearer ${process.env.UNISAT_API_KEY}` }
              : {}),
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const info = data?.data;
        if (info?.floorPrice && info.floorPrice > 0) {
          prices.push({
            exchange: RUNE_EXCHANGES.find(e => e.source === 'unisat')!,
            floorPriceSats: info.floorPrice,
            volume24h: info.volume24h || 0,
            listedCount: info.listedCount || 0,
          });
        }
      }
    } catch (err) {
      console.warn(`[RunesArbitrage] UniSat API failed for ${runeName}:`, err instanceof Error ? err.message : err);
    }

    // OKX Web3 Marketplace API
    try {
      const response = await fetch(
        `https://www.okx.com/api/v5/mktplace/nft/ordinals/runes/rune-detail?runeName=${encodeURIComponent(runeName)}`,
        { signal: controller.signal }
      );
      if (response.ok) {
        const data = await response.json();
        const runeData = data?.data?.[0];
        if (runeData?.floorPrice && parseFloat(runeData.floorPrice) > 0) {
          prices.push({
            exchange: RUNE_EXCHANGES.find(e => e.source === 'okx')!,
            floorPriceSats: parseFloat(runeData.floorPrice),
            volume24h: parseFloat(runeData.volume24h || '0'),
            listedCount: parseInt(runeData.listedCount || '0', 10),
          });
        }
      }
    } catch (err) {
      console.warn(`[RunesArbitrage] OKX API failed for ${runeName}:`, err instanceof Error ? err.message : err);
    }

    clearTimeout(timeout);
    return prices;
  }

  /**
   * Fetch Xverse price data for a rune (aggregated from multiple marketplaces)
   */
  private async fetchXversePrice(runeName: string): Promise<ExchangePrice | null> {
    try {
      // Try batch info first for efficiency
      const batchResult = await xverseAPI.getRunesBatchInfo([runeName]);
      if (batchResult) {
        const runeData = Object.values(batchResult)[0];
        if (runeData && runeData.floorPrice > 0) {
          return {
            exchange: RUNE_EXCHANGES.find(e => e.source === 'xverse')!,
            floorPriceSats: runeData.floorPrice,
            volume24h: runeData.volume24h || 0,
            listedCount: 0,
          };
        }
      }
    } catch (err) {
      console.warn(`[RunesArbitrage] Xverse API failed for ${runeName}:`, err instanceof Error ? err.message : err);
    }
    return null;
  }

  /**
   * Busca dados top de mercado — Xverse primary, Gamma.io fallback
   */
  private async fetchTopRunes(): Promise<RuneCollectionStat[]> {
    // Try Xverse first (richer data)
    try {
      const xverseTop = await xverseAPI.getTopRunes({ limit: 20, timePeriod: '24h' });
      if (xverseTop && xverseTop.length > 0) {
        return xverseTop.map(r => ({
          rune: r.runeName,
          spacedRune: r.spacedRuneName,
          floorUnitPrice: { value: r.floorPrice },
          volume24h: r.volume,
          listedCount: 0,
        })) as unknown as RuneCollectionStat[];
      }
    } catch { /* fallback below */ }

    // Fallback: Gamma.io / Gamma.io
    try {
      const stats = await runesMarketService.getRuneCollectionStats({
        sortBy: 'volume',
        sortDirection: 'desc',
        limit: 20,
      });
      return stats?.runes || [];
    } catch {
      return [];
    }
  }

  // Gerar insights de arbitragem usando dados reais das APIs
  private async generateRunesArbitrageInsights(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {

      // 1. Obter lista de runas populares do Gamma.io
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
        const [xversePriceData, mePriceData, altPrices] = await Promise.all([
          this.fetchXversePrice(runeName),
          this.fetchGammaPrice(runeName),
          this.fetchAlternativePrices(runeName),
        ]);

        // Agregar todos os preços disponíveis
        const allPrices: ExchangePrice[] = [];
        if (xversePriceData) allPrices.push(xversePriceData);
        if (mePriceData) allPrices.push(mePriceData);
        allPrices.push(...altPrices);

        // Precisamos de pelo menos 2 exchanges com preços válidos
        if (allPrices.length < 2) {
          console.warn(`[RunesArbitrage] ${runeName}: only ${allPrices.length} exchange(s) returned prices, need ≥2`);
          continue;
        }

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
