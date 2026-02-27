// CYPHER AI v2 - Advanced Natural Language Understanding
// Gemini-like NLU capabilities for sophisticated conversation

import EventEmitter from 'events';
import type { Intent, ConversationMessage, EmotionType } from '../types';

export interface EntityExtraction {
  asset?: string;
  amount?: number;
  timeframe?: string;
  percentage?: number;
  price?: number;
  action?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  urgency?: 'low' | 'medium' | 'high';
  confidence?: number;
}

export interface AdvancedIntent extends Intent {
  subIntent?: string;
  context?: string[];
  followUp?: string[];
  emotionalTone?: EmotionType;
  complexity?: 'simple' | 'medium' | 'complex';
  requiresData?: boolean;
  requiresAction?: boolean;
}

export interface ConversationContext {
  topic?: string;
  entities: EntityExtraction;
  conversationFlow: string[];
  userProfile: {
    expertise: 'beginner' | 'intermediate' | 'expert';
    interests: string[];
    preferences: Record<string, any>;
  };
  sessionMemory: ConversationMessage[];
  isActive?: boolean;
}

export class AdvancedNLU extends EventEmitter {
  private context!: ConversationContext;
  private knowledgeGraph: Map<string, string[]> = new Map();
  private patterns: Map<string, RegExp[]> = new Map();
  private entityPatterns: Map<string, RegExp> = new Map();

  constructor() {
    super();
    this.initializeContext();
    this.buildKnowledgeGraph();
    this.buildPatterns();
    this.buildEntityPatterns();
  }

  private initializeContext(): void {
    this.context = {
      entities: {},
      conversationFlow: [],
      userProfile: {
        expertise: 'intermediate',
        interests: ['bitcoin', 'trading', 'market-analysis'],
        preferences: {}
      },
      sessionMemory: []
    };
  }

  private buildKnowledgeGraph(): void {
    // Build semantic relationships for better understanding
    this.knowledgeGraph.set('bitcoin', [
      'btc', 'satoshi', 'cryptocurrency', 'digital-gold', 'store-of-value',
      'peer-to-peer', 'blockchain', 'mining', 'halving', 'lightning-network'
    ]);

    this.knowledgeGraph.set('trading', [
      'buy', 'sell', 'long', 'short', 'position', 'leverage', 'margin',
      'order', 'market', 'limit', 'stop-loss', 'take-profit'
    ]);

    this.knowledgeGraph.set('analysis', [
      'technical', 'fundamental', 'sentiment', 'on-chain', 'chart',
      'indicator', 'pattern', 'trend', 'support', 'resistance'
    ]);

    this.knowledgeGraph.set('market', [
      'price', 'volume', 'market-cap', 'liquidity', 'volatility',
      'correlation', 'dominance', 'fear-greed', 'sentiment'
    ]);

    this.knowledgeGraph.set('ordinals', [
      'inscription', 'nft', 'digital-artifact', 'sat', 'rare-sat',
      'collection', 'metadata', 'provenance'
    ]);

    this.knowledgeGraph.set('runes', [
      'token', 'protocol', 'fungible', 'supply', 'holder',
      'transaction', 'minting', 'etching'
    ]);
  }

  private buildPatterns(): void {
    // Complex intent patterns
    this.patterns.set('greeting', [
      /^(oi|olá|hey|hi|bom\s+dia|boa\s+tarde|boa\s+noite)\b/i,
      /\b(como\s+(é|está)|tudo\s+bem|como\s+vai|beleza)\b/i,
      /^(cypher|ai)\b/i
    ]);

    this.patterns.set('price_inquiry', [
      /\b(qual|quanto)\s+(é|está|custa)\s+(o\s+)?preço\s+(do\s+|de\s+)?(bitcoin|btc)\b/i,
      /(preço|cotação|valor)\s+(atual\s+)?(do\s+|de\s+)?(bitcoin|btc)/i,
      /\b(bitcoin|btc)\s+(preço|cotação|valor|está)/i,
      /quanto\s+(vale|custa)\s+(o\s+)?(bitcoin|btc)/i
    ]);

    this.patterns.set('market_analysis', [
      /\b(análise|analise|analysis)\s+(de\s+mercado|market|técnica|fundamental)/i,
      /(como\s+está|status\s+do)\s+(mercado|market)/i,
      /(tendência|trend|movimento)\s+(do\s+)?(mercado|bitcoin)/i,
      /\b(indicadores|sinais|signals)\s+(técnicos|fundamentais)/i
    ]);

    this.patterns.set('trading_intent', [
      /(quero|vou|pretendo|penso\s+em)\s+(comprar|vender|buy|sell)/i,
      /(comprar|buy|adquirir|investir)\s+.*\b(bitcoin|btc)\b/i,
      /(vender|sell|liquidar)\s+.*\b(bitcoin|btc)\b/i,
      /\b(entrada|exit|saída)\s+(em|no|para)\s+(bitcoin|btc)/i
    ]);

    this.patterns.set('help_request', [
      /(ajuda|help|não\s+entendo|explica|como\s+funciona)/i,
      /(o\s+que\s+você|suas\s+funções|capabilities|recursos)/i,
      /(tutorial|guia|orientação|instrução)/i
    ]);

    this.patterns.set('market_sentiment', [
      /\b(sentimento|sentiment|humor)\s+(do\s+)?mercado/i,
      /(fear|greed|medo|ganância|ansiedade)/i,
      /(otimista|pessimista|bullish|bearish)/i
    ]);

    this.patterns.set('portfolio_inquiry', [
      /(meu\s+portfolio|minha\s+carteira|minhas\s+posições)/i,
      /(saldo|balance|investimentos|holdings)/i,
      /(performance|rendimento|lucro|prejuízo)/i
    ]);

    this.patterns.set('news_request', [
      /(notícias|news|novidades|acontecendo)/i,
      /(últimas|recent|hoje|today)/i,
      /(eventos|updates|announcements)/i
    ]);

    this.patterns.set('explanation_request', [
      /(o\s+que\s+é|what\s+is|explique|define)/i,
      /(como\s+funciona|how\s+does|mechanism)/i,
      /(diferença\s+entre|compare|comparison)/i
    ]);
  }

  private buildEntityPatterns(): void {
    // Entity extraction patterns
    this.entityPatterns.set('amount', /\b(\d+(?:[.,]\d+)?)\s*(btc|bitcoin|satoshi|sats|usd|dollar|real)?\b/gi);
    this.entityPatterns.set('percentage', /\b(\d+(?:[.,]\d+)?)\s*%/g);
    this.entityPatterns.set('price', /\$\s*(\d+(?:[.,]\d+)?)/g);
    this.entityPatterns.set('timeframe', /\b(hoje|today|ontem|yesterday|semana|week|mês|month|ano|year|24h|1d|7d|30d)\b/gi);
    this.entityPatterns.set('asset', /\b(bitcoin|btc|ethereum|eth|solana|sol|cardano|ada|polygon|matic|ordinals|runes)\b/gi);
  }

  async processInput(input: string, conversationHistory: ConversationMessage[] = []): Promise<AdvancedIntent> {
    // Update session memory
    this.context.sessionMemory = conversationHistory.slice(-10);
    
    // Preprocess input
    const cleanInput = this.preprocessText(input);
    
    // Extract entities
    const entities = this.extractEntities(cleanInput);
    
    // Detect intent with context
    const intent = await this.detectIntentWithContext(cleanInput, entities);
    
    // Determine emotional tone
    const emotionalTone = this.analyzeEmotionalTone(cleanInput);
    
    // Assess complexity
    const complexity = this.assessComplexity(cleanInput, intent);
    
    // Generate follow-up suggestions
    const followUp = this.generateFollowUpSuggestions(intent, entities);
    
    // Update conversation flow
    this.updateConversationFlow(intent.name);
    
    return {
      ...intent,
      entities,
      emotionalTone,
      complexity,
      followUp,
      requiresData: this.requiresDataAccess(intent.name),
      requiresAction: this.requiresActionExecution(intent.name)
    };
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Remove punctuation but preserve decimal separators within numbers (e.g. "$42,500.00")
      .replace(/(?<!\d)[.,!?;]+|[!?;]+/g, ' ')
      .replace(/[.,](?!\d)/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private extractEntities(text: string): EntityExtraction {
    const entities: EntityExtraction = {};

    // Extract amounts
    const amountMatches = Array.from(text.matchAll(this.entityPatterns.get('amount')!));
    if (amountMatches.length > 0) {
      entities.amount = parseFloat(amountMatches[0][1].replace(',', '.'));
    }

    // Extract percentages
    const percentageMatches = Array.from(text.matchAll(this.entityPatterns.get('percentage')!));
    if (percentageMatches.length > 0) {
      entities.percentage = parseFloat(percentageMatches[0][1].replace(',', '.'));
    }

    // Extract prices
    const priceMatches = Array.from(text.matchAll(this.entityPatterns.get('price')!));
    if (priceMatches.length > 0) {
      entities.price = parseFloat(priceMatches[0][1].replace(',', '.'));
    }

    // Extract timeframes
    const timeframeMatches = Array.from(text.matchAll(this.entityPatterns.get('timeframe')!));
    if (timeframeMatches.length > 0) {
      entities.timeframe = timeframeMatches[0][1];
    }

    // Extract assets
    const assetMatches = Array.from(text.matchAll(this.entityPatterns.get('asset')!));
    if (assetMatches.length > 0) {
      entities.asset = this.normalizeAsset(assetMatches[0][1]);
    }

    // Extract sentiment
    entities.sentiment = this.extractSentiment(text);

    // Extract urgency
    entities.urgency = this.extractUrgency(text);

    return entities;
  }

  private async detectIntentWithContext(text: string, entities: EntityExtraction): Promise<Intent> {
    let bestMatch: Intent = {
      name: 'general_question',
      confidence: 0.3,
      entities,
      category: 'general'
    };

    // Check each pattern category
    for (const [intentName, patterns] of this.patterns.entries()) {
      const confidence = this.calculatePatternMatch(text, patterns);
      
      if (confidence > (bestMatch.confidence || 0)) {
        bestMatch = {
          name: intentName,
          confidence,
          entities,
          category: this.getCategoryForIntent(intentName),
          action: this.getActionForIntent(intentName)
        };
      }
    }

    // Boost confidence based on context
    bestMatch.confidence = this.applyContextBoost(bestMatch, text);

    // Apply semantic understanding
    bestMatch = this.applySemanticUnderstanding(bestMatch, text);

    return bestMatch;
  }

  private calculatePatternMatch(text: string, patterns: RegExp[]): number {
    let maxConfidence = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        // Calculate confidence based on match quality
        const matches = text.match(pattern);
        if (matches) {
          const matchLength = matches[0].length;
          const textLength = text.length;
          const confidence = 0.6 + (matchLength / textLength) * 0.4;
          maxConfidence = Math.max(maxConfidence, confidence);
        }
      }
    }
    
    return Math.min(maxConfidence, 0.95);
  }

  private getCategoryForIntent(intentName: string): string {
    const categoryMap: Record<string, string> = {
      'greeting': 'conversation',
      'price_inquiry': 'market',
      'market_analysis': 'analysis',
      'trading_intent': 'trading',
      'help_request': 'information',
      'market_sentiment': 'analysis',
      'portfolio_inquiry': 'portfolio',
      'news_request': 'information',
      'explanation_request': 'information'
    };
    
    return categoryMap[intentName] || 'general';
  }

  private getActionForIntent(intentName: string): string | undefined {
    const actionMap: Record<string, string> = {
      'price_inquiry': 'get_price',
      'market_analysis': 'analyze_market',
      'trading_intent': 'prepare_trade',
      'portfolio_inquiry': 'show_portfolio',
      'news_request': 'fetch_news'
    };
    
    return actionMap[intentName];
  }

  private applyContextBoost(intent: Intent, text: string): number {
    let confidence = intent.confidence || 0.5;
    
    // Boost based on conversation history
    const recentTopics = this.getRecentTopics();
    if (recentTopics.includes(intent.category)) {
      confidence += 0.1;
    }
    
    // Boost based on semantic relationships
    const relatedTerms = this.findRelatedTerms(text);
    if (relatedTerms.length > 0) {
      confidence += 0.05 * relatedTerms.length;
    }
    
    return Math.min(confidence || 0.5, 0.98);
  }

  private applySemanticUnderstanding(intent: Intent, text: string): Intent {
    // Add sub-intent classification
    if (intent.name === 'trading_intent') {
      if (text.includes('comprar') || text.includes('buy')) {
        intent.subIntent = 'buy';
      } else if (text.includes('vender') || text.includes('sell')) {
        intent.subIntent = 'sell';
      }
    }
    
    if (intent.name === 'market_analysis') {
      if (text.includes('técnica') || text.includes('technical')) {
        intent.subIntent = 'technical';
      } else if (text.includes('fundamental')) {
        intent.subIntent = 'fundamental';
      } else if (text.includes('sentimento') || text.includes('sentiment')) {
        intent.subIntent = 'sentiment';
      }
    }
    
    return intent;
  }

  private analyzeEmotionalTone(text: string): EmotionType {
    // Positive indicators
    const positiveWords = ['ótimo', 'excelente', 'bom', 'good', 'great', 'awesome', 'excited'];
    const negativeWords = ['ruim', 'bad', 'terrible', 'worried', 'scared', 'concerned'];
    const neutralWords = ['ok', 'normal', 'regular', 'standard'];
    
    const words = text.toLowerCase().split(/\s+/);
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveScore++;
      if (negativeWords.some(nw => word.includes(nw))) negativeScore++;
    }
    
    if (positiveScore > negativeScore) return 'happy';
    if (negativeScore > positiveScore) return 'concerned';
    
    // Context-based emotion
    if (text.includes('urgente') || text.includes('rápido')) return 'excited';
    if (text.includes('análise') || text.includes('dados')) return 'analytical';
    
    return 'neutral';
  }

  private assessComplexity(text: string, intent: Intent): 'simple' | 'medium' | 'complex' {
    const wordCount = text.split(/\s+/).length;
    const hasMultipleEntities = Object.keys(intent.entities || {}).length > 2;
    const hasComplexTerms = /\b(análise|correlação|volatilidade|derivativos|arbitragem)\b/i.test(text);
    
    if (wordCount < 5 && !hasMultipleEntities) return 'simple';
    if (wordCount > 15 || hasComplexTerms || hasMultipleEntities) return 'complex';
    return 'medium';
  }

  private generateFollowUpSuggestions(intent: Intent, entities: EntityExtraction): string[] {
    const suggestions: string[] = [];
    
    switch (intent.name) {
      case 'price_inquiry':
        suggestions.push(
          'Quer ver o gráfico também?',
          'Devo fazer uma análise técnica?',
          'Interesse em notícias relacionadas?'
        );
        break;
        
      case 'trading_intent':
        suggestions.push(
          'Precisa de análise de risco?',
          'Quer definir stop-loss?',
          'Devo calcular o tamanho da posição?'
        );
        break;
        
      case 'market_analysis':
        suggestions.push(
          'Quer dados on-chain também?',
          'Interesse em correlações?',
          'Devo incluir sentiment analysis?'
        );
        break;
    }
    
    return suggestions;
  }

  private updateConversationFlow(intentName: string): void {
    this.context.conversationFlow.push(intentName);
    
    // Keep only last 10 intents
    if (this.context.conversationFlow.length > 10) {
      this.context.conversationFlow = this.context.conversationFlow.slice(-10);
    }
    
    // Update topic if needed
    const topic = this.inferCurrentTopic();
    if (topic) {
      this.context.topic = topic;
    }
  }

  private getRecentTopics(): string[] {
    return this.context.conversationFlow
      .slice(-3)
      .map(intent => this.getCategoryForIntent(intent))
      .filter((category, index, arr) => arr.indexOf(category) === index);
  }

  private findRelatedTerms(text: string): string[] {
    const relatedTerms: string[] = [];
    
    for (const [concept, terms] of this.knowledgeGraph.entries()) {
      if (terms.some(term => text.includes(term))) {
        relatedTerms.push(concept);
      }
    }
    
    return relatedTerms;
  }

  private inferCurrentTopic(): string | undefined {
    const recentIntents = this.context.conversationFlow.slice(-3);
    const categories = recentIntents.map(intent => this.getCategoryForIntent(intent));
    
    // Find most common category
    const categoryCount = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommon = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostCommon ? mostCommon[0] : undefined;
  }

  private requiresDataAccess(intentName: string): boolean {
    const dataRequiredIntents = [
      'price_inquiry',
      'market_analysis',
      'portfolio_inquiry',
      'news_request',
      'market_sentiment'
    ];
    
    return dataRequiredIntents.includes(intentName);
  }

  private requiresActionExecution(intentName: string): boolean {
    const actionRequiredIntents = [
      'trading_intent'
    ];
    
    return actionRequiredIntents.includes(intentName);
  }

  private normalizeAsset(asset: string): string {
    const assetMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'btc': 'BTC',
      'ethereum': 'ETH',
      'eth': 'ETH',
      'solana': 'SOL',
      'sol': 'SOL'
    };
    
    return assetMap[asset.toLowerCase()] || asset.toUpperCase();
  }

  private extractSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveIndicators = ['otimista', 'bullish', 'alta', 'subir', 'moon'];
    const negativeIndicators = ['pessimista', 'bearish', 'baixa', 'cair', 'crash'];
    
    const hasPositive = positiveIndicators.some(word => text.includes(word));
    const hasNegative = negativeIndicators.some(word => text.includes(word));
    
    if (hasPositive && !hasNegative) return 'positive';
    if (hasNegative && !hasPositive) return 'negative';
    return 'neutral';
  }

  private extractUrgency(text: string): 'low' | 'medium' | 'high' {
    const highUrgencyWords = ['urgente', 'agora', 'imediatamente', 'rápido'];
    const mediumUrgencyWords = ['hoje', 'logo', 'breve'];
    
    if (highUrgencyWords.some(word => text.includes(word))) return 'high';
    if (mediumUrgencyWords.some(word => text.includes(word))) return 'medium';
    return 'low';
  }

  getContext(): ConversationContext {
    return { ...this.context };
  }

  updateUserProfile(updates: Partial<ConversationContext['userProfile']>): void {
    this.context.userProfile = { ...this.context.userProfile, ...updates };
  }

  clearSession(): void {
    this.context.sessionMemory = [];
    this.context.conversationFlow = [];
    this.context.topic = undefined;
  }
}