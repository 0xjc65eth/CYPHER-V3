// Serviço para análise de sentimento social de múltiplas fontes
import { EventEmitter } from 'events';

// Interface para dados de sentimento social
export interface SocialSentimentData {
  source: string;
  timestamp: string;
  sentiment: number; // -1 a 1, onde -1 é muito negativo, 0 é neutro e 1 é muito positivo
  volume: number; // Volume de menções/posts
  topics: string[]; // Tópicos relacionados
  hashtags: string[]; // Hashtags populares
  influencers: string[]; // Influenciadores relevantes
  keywords: string[]; // Palavras-chave relevantes
}

// Interface para tendências sociais
export interface SocialTrend {
  topic: string;
  sentiment: number;
  volume: number;
  change24h: number; // Mudança percentual nas últimas 24h
  sources: string[]; // Fontes onde a tendência aparece
  timestamp: string;
}

// Interface para insights de sentimento
export interface SentimentInsight {
  id: string;
  timestamp: string;
  source: string;
  insight: string;
  sentiment: number;
  confidence: number;
  topics: string[];
  relatedAssets: string[];
}

// Classe principal do serviço de sentimento social
export class SocialSentimentService extends EventEmitter {
  private static instance: SocialSentimentService;
  private sentimentData: SocialSentimentData[] = [];
  private trends: SocialTrend[] = [];
  private insights: SentimentInsight[] = [];
  private lastUpdate: string = new Date().toISOString();
  private isCollecting: boolean = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private apiKey: string = process.env.CMC_API_KEY || '';

  // Construtor privado para implementar Singleton
  private constructor() {
    super();
    this.initializeData();
  }

  // Método para obter a instância única
  public static getInstance(): SocialSentimentService {
    if (!SocialSentimentService.instance) {
      SocialSentimentService.instance = new SocialSentimentService();
    }
    return SocialSentimentService.instance;
  }

  // Fear & Greed index cached data
  private fngData: { value: number; classification: string; timestamp: string } | null = null;

  // Initialize with real data from Fear & Greed API
  private initializeData(): void {
    this.fetchFearAndGreedData().then(() => {
      this.buildSentimentFromFNG();
    }).catch(() => {
      this.buildSentimentFromFNG();
    });
  }

  // Fetch Fear & Greed Index from alternative.me
  private async fetchFearAndGreedData(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('https://api.alternative.me/fng/', { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const entry = json.data[0];
          this.fngData = {
            value: parseInt(entry.value, 10),
            classification: entry.value_classification,
            timestamp: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString()
          };
          return;
        }
      }
    } catch (error) {
    }
    // Fallback
    this.fngData = { value: 50, classification: 'Neutral', timestamp: new Date().toISOString() };
  }

  // Map Fear & Greed value (0-100) to sentiment score (-1 to 1)
  private fngToSentiment(value: number): number {
    return (value - 50) / 50; // 0 -> -1, 50 -> 0, 100 -> 1
  }

  // Build deterministic sentiment data from Fear & Greed index
  private buildSentimentFromFNG(): void {
    const fngValue = this.fngData?.value ?? 50;
    const baseSentiment = this.fngToSentiment(fngValue);
    const fngClassification = this.fngData?.classification ?? 'Neutral';
    const now = new Date().toISOString();

    // Single real data source: Fear & Greed Index
    this.sentimentData = [{
      source: 'Fear & Greed Index',
      timestamp: now,
      sentiment: baseSentiment,
      volume: 1,
      topics: ['Bitcoin', 'Crypto Market'],
      hashtags: ['#Bitcoin', '#Crypto'],
      influencers: [],
      keywords: [fngClassification.toLowerCase(), 'market sentiment', 'bitcoin']
    }];

    this.buildTrendsFromData();
    this.buildInsightsFromData(fngValue, fngClassification);

    this.lastUpdate = now;
  }

  // Build trends from existing sentiment data (no randomness)
  private buildTrendsFromData(): void {
    const allTopics = new Set<string>();
    this.sentimentData.forEach(data => {
      data.topics.forEach(topic => allTopics.add(topic));
    });

    this.trends = [];

    allTopics.forEach(topic => {
      const topicData = this.sentimentData.filter(data => data.topics.includes(topic));
      if (topicData.length > 0) {
        const avgSentiment = topicData.reduce((sum, data) => sum + data.sentiment, 0) / topicData.length;
        const totalVolume = topicData.reduce((sum, data) => sum + data.volume, 0);
        const sources = [...new Set(topicData.map(data => data.source))];

        // Derive change from sentiment direction (positive sentiment = positive change)
        const change24h = avgSentiment * 15;

        this.trends.push({
          topic,
          sentiment: avgSentiment,
          volume: totalVolume,
          change24h,
          sources,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.trends.sort((a, b) => b.volume - a.volume);
  }

  // Build insights from Fear & Greed data (deterministic)
  private buildInsightsFromData(fngValue: number, classification: string): void {
    const sentiment = this.fngToSentiment(fngValue);
    const direction = sentiment >= 0 ? 'positive' : 'negative';
    const strength = Math.abs(sentiment) > 0.5 ? 'strong' : 'moderate';

    this.insights = [
      {
        id: 'insight-fng-1',
        timestamp: new Date().toISOString(),
        source: 'Fear & Greed Index',
        insight: `Market sentiment is "${classification}" (${fngValue}/100). This indicates ${strength} ${direction} sentiment across crypto markets.`,
        sentiment,
        confidence: 90,
        topics: ['Bitcoin', 'Crypto Market'],
        relatedAssets: ['Bitcoin']
      },
      {
        id: 'insight-fng-2',
        timestamp: new Date().toISOString(),
        source: 'Fear & Greed Index',
        insight: fngValue > 70
          ? 'Extreme greed detected. Historically, this precedes market corrections. Consider taking profits.'
          : fngValue < 30
          ? 'Extreme fear detected. Historically, this presents buying opportunities for long-term holders.'
          : `Market is in a ${classification.toLowerCase()} zone. Monitor for directional shifts.`,
        sentiment,
        confidence: 85,
        topics: ['Bitcoin', 'Crypto Market', 'Arbitrage'],
        relatedAssets: ['Bitcoin', 'Ordinals']
      },
      {
        id: 'insight-fng-3',
        timestamp: new Date().toISOString(),
        source: 'Fear & Greed Index',
        insight: `Only one data source active (Fear & Greed Index). Additional sources (Twitter, Reddit, on-chain) are not connected.`,
        sentiment: 0,
        confidence: 50,
        topics: ['Bitcoin'],
        relatedAssets: ['Bitcoin']
      }
    ];
  }
  
  // Iniciar coleta de dados
  public startDataCollection(): void {
    if (this.isCollecting) {
      return;
    }
    
    this.isCollecting = true;
    
    // Coletar dados imediatamente
    this.collectData();
    
    // Configurar intervalo de coleta (a cada 5 minutos)
    this.collectionInterval = setInterval(() => {
      this.collectData();
    }, 5 * 60 * 1000);
    
    // Emitir evento de início
    this.emit('collection-started', {
      timestamp: new Date().toISOString()
    });
  }
  
  // Parar coleta de dados
  public stopDataCollection(): void {
    if (!this.isCollecting) {
      return;
    }
    
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    // Emitir evento de parada
    this.emit('collection-stopped', {
      timestamp: new Date().toISOString()
    });
  }
  
  // Coletar dados de sentimento social
  private async collectData(): Promise<void> {

    try {
      await this.fetchFearAndGreedData();
      this.buildSentimentFromFNG();
      
      // Emitir evento de dados coletados
      this.emit('data-collected', {
        timestamp: new Date().toISOString(),
        dataPoints: this.sentimentData.length,
        trends: this.trends.length,
        insights: this.insights.length
      });
    } catch (error) {
      console.error('Error collecting social sentiment data:', error);
      
      // Emitir evento de erro
      this.emit('collection-error', {
        timestamp: new Date().toISOString(),
        error
      });
    }
  }
  
  // Obter dados de sentimento social
  public getSentimentData(): SocialSentimentData[] {
    return this.sentimentData;
  }
  
  // Obter tendências sociais
  public getTrends(): SocialTrend[] {
    return this.trends;
  }
  
  // Obter insights de sentimento
  public getInsights(): SentimentInsight[] {
    return this.insights;
  }
  
  // Obter insights de sentimento por fonte
  public getInsightsBySource(source: string): SentimentInsight[] {
    return this.insights.filter(insight => insight.source === source);
  }
  
  // Obter insights de sentimento por tópico
  public getInsightsByTopic(topic: string): SentimentInsight[] {
    return this.insights.filter(insight => insight.topics.includes(topic));
  }
  
  // Obter insights de sentimento por ativo
  public getInsightsByAsset(asset: string): SentimentInsight[] {
    return this.insights.filter(insight => insight.relatedAssets.includes(asset));
  }
  
  // Obter status do serviço
  public getStatus(): any {
    return {
      isCollecting: this.isCollecting,
      lastUpdate: this.lastUpdate,
      dataPoints: this.sentimentData.length,
      trends: this.trends.length,
      insights: this.insights.length,
      sources: [...new Set(this.sentimentData.map(data => data.source))],
      topHashtags: this.getTopHashtags(5),
      topInfluencers: this.getTopInfluencers(5)
    };
  }
  
  // Obter as hashtags mais populares
  public getTopHashtags(count: number = 10): { hashtag: string; count: number }[] {
    const hashtagCounts = new Map<string, number>();
    
    // Contar ocorrências de cada hashtag
    this.sentimentData.forEach(data => {
      data.hashtags.forEach(hashtag => {
        const currentCount = hashtagCounts.get(hashtag) || 0;
        hashtagCounts.set(hashtag, currentCount + 1);
      });
    });
    
    // Converter para array e ordenar
    const sortedHashtags = Array.from(hashtagCounts.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count);
    
    return sortedHashtags.slice(0, count);
  }
  
  // Obter os influenciadores mais mencionados
  public getTopInfluencers(count: number = 10): { influencer: string; count: number }[] {
    const influencerCounts = new Map<string, number>();
    
    // Contar ocorrências de cada influenciador
    this.sentimentData.forEach(data => {
      data.influencers.forEach(influencer => {
        const currentCount = influencerCounts.get(influencer) || 0;
        influencerCounts.set(influencer, currentCount + 1);
      });
    });
    
    // Converter para array e ordenar
    const sortedInfluencers = Array.from(influencerCounts.entries())
      .map(([influencer, count]) => ({ influencer, count }))
      .sort((a, b) => b.count - a.count);
    
    return sortedInfluencers.slice(0, count);
  }
  
  // Forçar atualização dos dados
  public forceUpdate(): void {
    this.collectData();
  }
}

// Exportar instância única
export const socialSentimentService = SocialSentimentService.getInstance();
