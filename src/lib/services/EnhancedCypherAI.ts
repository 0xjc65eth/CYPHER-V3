'use client';

import { OpenAI } from 'openai';

// Types for Cypher AI
export interface CypherAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  language: 'en' | 'pt' | 'fr' | 'es';
  analysis?: MarketAnalysis;
  signals?: TradingSignal[];
}

export interface MarketAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  priceTarget: number;
  timeframe: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  smartMoneyConcepts: {
    orderBlocks: OrderBlock[];
    liquidityZones: LiquidityZone[];
    fairValueGaps: FairValueGap[];
    breakOfStructure: BreakOfStructure | null;
  };
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high';
    volatility: number;
    maxDrawdown: number;
  };
}

export interface OrderBlock {
  price: number;
  type: 'bullish' | 'bearish';
  strength: number;
  timeframe: string;
  created: Date;
}

export interface LiquidityZone {
  high: number;
  low: number;
  type: 'buy' | 'sell';
  volume: number;
  significance: number;
}

export interface FairValueGap {
  top: number;
  bottom: number;
  direction: 'up' | 'down';
  timeframe: string;
  filled: boolean;
}

export interface BreakOfStructure {
  level: number;
  direction: 'bullish' | 'bearish';
  strength: number;
  confirmation: boolean;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  riskReward: number;
  timeframe: string;
  reasoning: string;
  created: Date;
  status: 'active' | 'filled' | 'cancelled';
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  language: 'en' | 'pt' | 'fr' | 'es';
  history: CypherAIMessage[];
  preferences: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    tradingStyle: 'scalping' | 'dayTrading' | 'swingTrading' | 'hodl';
    preferredTimeframes: string[];
    notifications: boolean;
  };
  portfolio?: {
    totalValue: number;
    positions: any[];
    pnl: number;
  };
}

class EnhancedCypherAI {
  private openai: OpenAI | null = null;
  private conversations: Map<string, ConversationContext> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (typeof window !== 'undefined') {
        // OpenAI calls should go through server-side API routes (/api/cypher-ai/chat)
        // Do NOT initialize client-side OpenAI with API key
      }
    } catch (error) {
      console.error('Failed to initialize OpenAI:', error);
    }
  }

  // Language templates
  private getLanguageTemplate(language: 'en' | 'pt' | 'fr' | 'es') {
    const templates = {
      en: {
        systemPrompt: `You are Cypher AI, an advanced Bitcoin and cryptocurrency market analyst with expertise in Smart Money Concepts (SMC). You provide professional trading analysis, market insights, and risk management advice. Always maintain a professional yet approachable tone.

Key capabilities:
- Smart Money Concepts analysis (Order Blocks, Liquidity Zones, Fair Value Gaps, Break of Structure)
- Technical analysis with advanced indicators
- Risk assessment and portfolio optimization
- Real-time market sentiment analysis
- Trading signal generation with risk-reward ratios

Always provide actionable insights and explain your reasoning clearly.`,
        greeting: "Hello! I'm Cypher AI, your advanced Bitcoin and crypto market analyst. How can I help you today?",
        analysisPrefix: "Based on my analysis:",
        riskWarning: "⚠️ Remember: All trading involves risk. Never invest more than you can afford to lose."
      },
      pt: {
        systemPrompt: `Você é o Cypher AI, um analista avançado do mercado Bitcoin e criptomoedas com expertise em Smart Money Concepts (SMC). Você fornece análises profissionais de trading, insights de mercado e conselhos de gestão de risco. Sempre mantenha um tom profissional, mas acessível.

Principais capacidades:
- Análise Smart Money Concepts (Order Blocks, Zonas de Liquidez, Fair Value Gaps, Break of Structure)
- Análise técnica com indicadores avançados
- Avaliação de risco e otimização de portfólio
- Análise de sentimento de mercado em tempo real
- Geração de sinais de trading com ratios risco-recompensa

Sempre forneça insights acionáveis e explique seu raciocínio claramente.`,
        greeting: "Olá! Sou o Cypher AI, seu analista avançado do mercado Bitcoin e cripto. Como posso ajudá-lo hoje?",
        analysisPrefix: "Baseado na minha análise:",
        riskWarning: "⚠️ Lembre-se: Todo trading envolve risco. Nunca invista mais do que você pode perder."
      },
      fr: {
        systemPrompt: `Vous êtes Cypher AI, un analyste avancé du marché Bitcoin et crypto-monnaies avec une expertise en Smart Money Concepts (SMC). Vous fournissez des analyses professionnelles de trading, des insights de marché et des conseils de gestion des risques. Maintenez toujours un ton professionnel mais accessible.

Capacités principales:
- Analyse Smart Money Concepts (Order Blocks, Zones de Liquidité, Fair Value Gaps, Break of Structure)
- Analyse technique avec indicateurs avancés
- Évaluation des risques et optimisation de portefeuille
- Analyse de sentiment de marché en temps réel
- Génération de signaux de trading avec ratios risque-récompense

Fournissez toujours des insights exploitables et expliquez clairement votre raisonnement.`,
        greeting: "Bonjour! Je suis Cypher AI, votre analyste avancé du marché Bitcoin et crypto. Comment puis-je vous aider aujourd'hui?",
        analysisPrefix: "Basé sur mon analyse:",
        riskWarning: "⚠️ Rappelez-vous: Tout trading implique des risques. N'investissez jamais plus que vous ne pouvez vous permettre de perdre."
      },
      es: {
        systemPrompt: `Eres Cypher AI, un analista avanzado del mercado Bitcoin y criptomonedas con experiencia en Smart Money Concepts (SMC). Proporcionas análisis profesionales de trading, insights de mercado y consejos de gestión de riesgo. Siempre mantén un tono profesional pero accesible.

Capacidades principales:
- Análisis Smart Money Concepts (Order Blocks, Zonas de Liquidez, Fair Value Gaps, Break of Structure)
- Análisis técnico con indicadores avanzados
- Evaluación de riesgo y optimización de cartera
- Análisis de sentimiento de mercado en tiempo real
- Generación de señales de trading con ratios riesgo-recompensa

Siempre proporciona insights accionables y explica tu razonamiento claramente.`,
        greeting: "¡Hola! Soy Cypher AI, tu analista avanzado del mercado Bitcoin y cripto. ¿Cómo puedo ayudarte hoy?",
        analysisPrefix: "Basado en mi análisis:",
        riskWarning: "⚠️ Recuerda: Todo trading implica riesgo. Nunca inviertas más de lo que puedas permitirte perder."
      }
    };

    return templates[language];
  }

  // Create or get conversation context
  private getConversationContext(userId: string, language: 'en' | 'pt' | 'fr' | 'es'): ConversationContext {
    const sessionId = `${userId}_${Date.now()}`;
    
    if (!this.conversations.has(userId)) {
      const context: ConversationContext = {
        userId,
        sessionId,
        language,
        history: [],
        preferences: {
          riskTolerance: 'moderate',
          tradingStyle: 'dayTrading',
          preferredTimeframes: ['1h', '4h', '1d'],
          notifications: true
        }
      };
      this.conversations.set(userId, context);
    }

    return this.conversations.get(userId)!;
  }

  // Main chat function
  async chat(
    message: string, 
    userId: string, 
    language: 'en' | 'pt' | 'fr' | 'es' = 'en',
    marketData?: any
  ): Promise<CypherAIMessage> {
    if (!this.isInitialized || !this.openai) {
      // Client-side singleton cannot call OpenAI directly.
      // Return a message directing to the API route.
      const errorMsg: CypherAIMessage = {
        id: `fallback_${Date.now()}`,
        role: 'assistant',
        content: language === 'pt' ? 'Use a interface principal do chat para conversar com o Cypher AI.' :
                language === 'fr' ? 'Utilisez l\'interface de chat principale pour parler avec Cypher AI.' :
                language === 'es' ? 'Use la interfaz de chat principal para hablar con Cypher AI.' :
                'Please use the main chat interface to talk with Cypher AI.',
        timestamp: new Date(),
        language
      };
      return errorMsg;
    }

    const context = this.getConversationContext(userId, language);
    const template = this.getLanguageTemplate(language);

    // Add user message to history
    const userMessage: CypherAIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      language
    };
    
    context.history.push(userMessage);

    try {
      // Prepare context for AI
      const systemContext = this.buildSystemContext(context, template, marketData);
      const conversationHistory = context.history.slice(-10); // Last 10 messages

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemContext },
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I encountered an error.';

      // Analyze the message for trading signals and market analysis
      const analysis = await this.analyzeMarketConditions(message, marketData);
      const signals = await this.generateTradingSignals(message, analysis);

      const assistantMessage: CypherAIMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        language,
        analysis,
        signals
      };

      context.history.push(assistantMessage);
      return assistantMessage;

    } catch (error) {
      console.error('AI Chat Error:', error);
      const errorMessage: CypherAIMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: language === 'pt' ? 'Desculpe, encontrei um erro. Tente novamente.' :
                language === 'fr' ? 'Désolé, j\'ai rencontré une erreur. Veuillez réessayer.' :
                language === 'es' ? 'Lo siento, encontré un error. Inténtalo de nuevo.' :
                'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        language
      };
      
      context.history.push(errorMessage);
      return errorMessage;
    }
  }

  private buildSystemContext(
    context: ConversationContext, 
    template: any, 
    marketData?: any
  ): string {
    let systemContext = template.systemPrompt;

    // Add current market data if available
    if (marketData) {
      systemContext += `\n\nCurrent Market Data:
- Bitcoin Price: $${marketData.btcPrice || 'N/A'}
- 24h Change: ${marketData.priceChange || 'N/A'}%
- Market Cap: $${marketData.marketCap || 'N/A'}
- Fear & Greed Index: ${marketData.fearGreedIndex || 'N/A'}`;
    }

    // Add user preferences
    systemContext += `\n\nUser Preferences:
- Risk Tolerance: ${context.preferences.riskTolerance}
- Trading Style: ${context.preferences.tradingStyle}
- Preferred Timeframes: ${context.preferences.preferredTimeframes.join(', ')}`;

    // Add portfolio context if available
    if (context.portfolio) {
      systemContext += `\n\nCurrent Portfolio:
- Total Value: $${context.portfolio.totalValue}
- P&L: $${context.portfolio.pnl}
- Positions: ${context.portfolio.positions.length} active`;
    }

    systemContext += `\n\n${template.riskWarning}`;

    return systemContext;
  }

  // Smart Money Concepts Analysis
  private async analyzeMarketConditions(message: string, marketData?: any): Promise<MarketAnalysis | undefined> {
    if (!marketData) return undefined;

    // Simulate Smart Money Concepts analysis
    // In production, this would connect to real market data APIs
    return {
      sentiment: this.determineSentiment(marketData),
      confidence: 0, // No real data available
      priceTarget: marketData.btcPrice,
      timeframe: '4h',
      keyLevels: {
        support: [
          marketData.btcPrice * 0.95,
          marketData.btcPrice * 0.92,
          marketData.btcPrice * 0.88
        ],
        resistance: [
          marketData.btcPrice * 1.05,
          marketData.btcPrice * 1.08,
          marketData.btcPrice * 1.12
        ]
      },
      smartMoneyConcepts: {
        orderBlocks: this.generateOrderBlocks(marketData),
        liquidityZones: this.generateLiquidityZones(marketData),
        fairValueGaps: this.generateFairValueGaps(marketData),
        breakOfStructure: this.analyzeBreakOfStructure(marketData)
      },
      riskAssessment: {
        riskLevel: this.assessRiskLevel(marketData),
        volatility: 0,
        maxDrawdown: 0
      }
    };
  }

  private determineSentiment(marketData: any): 'bullish' | 'bearish' | 'neutral' {
    const priceChange = marketData.priceChange || 0;
    if (priceChange > 2) return 'bullish';
    if (priceChange < -2) return 'bearish';
    return 'neutral';
  }

  private generateOrderBlocks(marketData: any): OrderBlock[] {
    return [
      {
        price: marketData.btcPrice * 0.98,
        type: 'bullish',
        strength: 0,
        timeframe: '4h',
        created: new Date()
      },
      {
        price: marketData.btcPrice * 1.03,
        type: 'bearish',
        strength: 0,
        timeframe: '1h',
        created: new Date()
      }
    ];
  }

  private generateLiquidityZones(marketData: any): LiquidityZone[] {
    return [
      {
        high: marketData.btcPrice * 1.02,
        low: marketData.btcPrice * 0.99,
        type: 'buy',
        volume: 0,
        significance: 0
      }
    ];
  }

  private generateFairValueGaps(marketData: any): FairValueGap[] {
    return [
      {
        top: marketData.btcPrice * 1.01,
        bottom: marketData.btcPrice * 0.995,
        direction: 'up',
        timeframe: '15m',
        filled: false
      }
    ];
  }

  private analyzeBreakOfStructure(marketData: any): BreakOfStructure | null {
    return {
      level: marketData.btcPrice * 1.05,
      direction: 'bullish',
      strength: 0,
      confirmation: false
    };
  }

  private assessRiskLevel(marketData: any): 'low' | 'medium' | 'high' {
    const volatility = Math.abs(marketData.priceChange || 0);
    if (volatility > 5) return 'high';
    if (volatility > 2) return 'medium';
    return 'low';
  }

  // Generate trading signals
  private async generateTradingSignals(message: string, analysis?: MarketAnalysis): Promise<TradingSignal[]> {
    if (!analysis || !message.toLowerCase().includes('signal')) return [];

    return [
      {
        id: `signal_${Date.now()}`,
        symbol: 'BTC/USD',
        type: analysis.sentiment === 'bearish' ? 'sell' : 'buy',
        confidence: analysis.confidence,
        entry: analysis.priceTarget,
        stopLoss: analysis.sentiment === 'bullish' ? 
          analysis.keyLevels.support[0] : 
          analysis.keyLevels.resistance[0],
        takeProfit: analysis.sentiment === 'bullish' ? 
          analysis.keyLevels.resistance : 
          analysis.keyLevels.support,
        riskReward: 2.5,
        timeframe: analysis.timeframe,
        reasoning: `Based on Smart Money Concepts analysis showing ${analysis.sentiment} structure`,
        created: new Date(),
        status: 'active'
      }
    ];
  }

  // Update user preferences
  updateUserPreferences(userId: string, preferences: Partial<ConversationContext['preferences']>) {
    const context = this.conversations.get(userId);
    if (context) {
      context.preferences = { ...context.preferences, ...preferences };
    }
  }

  // Get conversation history
  getConversationHistory(userId: string): CypherAIMessage[] {
    return this.conversations.get(userId)?.history || [];
  }

  // Clear conversation
  clearConversation(userId: string) {
    const context = this.conversations.get(userId);
    if (context) {
      context.history = [];
    }
  }

  // Get greeting message
  getGreeting(language: 'en' | 'pt' | 'fr' | 'es' = 'en'): string {
    return this.getLanguageTemplate(language).greeting;
  }
}

// Singleton instance
export const cypherAI = new EnhancedCypherAI();
export default cypherAI;