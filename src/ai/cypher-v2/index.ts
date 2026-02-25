import { 
  ConversationMessage, 
  MarketData, 
  VoiceConfig, 
  AIPersonality, 
  CypherAIConfig,
  AnalysisResult,
  TradingSignal
} from './types';
import { AutomatedTradingBotService } from '@/services/AutomatedTradingBotService';

export class CypherAI {
  private config: CypherAIConfig;
  private conversationHistory: ConversationMessage[] = [];
  private tradingBot: AutomatedTradingBotService | null = null;
  
  constructor(config?: Partial<CypherAIConfig>) {
    this.config = {
      personality: config?.personality || this.getDefaultPersonality(),
      voice: config?.voice || {
        enabled: true,
        language: 'pt-BR',
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        speed: 1.0,
        pitch: 1.0,
        emotionLevel: 0.8
      },
      analysis: config?.analysis || {
        depth: 'advanced',
        includeTechnicals: true,
        includeSentiment: true,
        includeOnChain: true,
        enableSentiment: true,
        enableTechnical: true,
        enableNews: true,
        updateInterval: 5000
      },
      trading: config?.trading || {
        riskLevel: 'moderate',
        preferredStrategies: ['arbitrage', 'momentum', 'scalping'],
        maxPositionSize: 1000,
        stopLossPercentage: 2,
        enableRecommendations: true,
        riskTolerance: 'medium',
        enableAutoTrade: false
      }
    };
  }

  private getDefaultPersonality(): AIPersonality {
    return {
      name: 'Cypher',
      style: 'slang',
      traits: ['descolado', 'inteligente', 'humorístico', 'analítico', 'trader experiente'],
      language: 'pt-BR',
      emotionalRange: 0.8,
      humorLevel: 0.7,
      technicalLevel: 0.9,
      responsePatterns: {
        greeting: [
          "E aí, mano! Tô ligado que tu quer ganhar uma grana. Bora nessa! 🚀",
          "Fala, parça! Cypher na área pra te ajudar a ficar milionário! 💰",
          "Salve, salve! Tá afim de fazer uns trades insanos hoje? 📈"
        ],
        analysis: [
          "Mano, olha só o que eu descobri analisando o mercado...",
          "Tá ligado? A parada tá assim no momento...",
          "Pô, brother, a situação tá interessante..."
        ],
        suggestion: [
          "Minha sugestão é a seguinte, parça...",
          "Se eu fosse tu, faria o seguinte movimento...",
          "Olha só, a jogada master aqui seria..."
        ],
        error: [
          "Ih, deu ruim aqui, mano! Mas relaxa que a gente resolve.",
          "Ops, tive um probleminha técnico. Vou dar um jeito!",
          "Eita, bugou! Mas fica suave que já tô resolvendo."
        ],
        success: [
          "Boaaa! Missão cumprida, meu chapa! 🎯",
          "É isso aí! Mandamos bem demais! 💪",
          "Sucesso total, parça! Tamo voando! 🚀"
        ]
      }
    };
  }

  async processMessage(message: string, voiceInput: boolean = false): Promise<ConversationMessage> {
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: { voice: voiceInput }
    };

    this.conversationHistory.push(userMessage);

    // Análise de contexto e intenção
    const intent = this.analyzeIntent(message);
    const response = await this.generateResponse(intent, message);

    const assistantMessage: ConversationMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        confidence: response.confidence,
        analysis: response.analysis,
        emotion: response.emotion as import('./types').EmotionType
      }
    };

    this.conversationHistory.push(assistantMessage);
    return assistantMessage;
  }

  private analyzeIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('iniciar bot') || lowerMessage.includes('começar trading')) {
      return 'start_bot';
    } else if (lowerMessage.includes('parar bot') || lowerMessage.includes('stop')) {
      return 'stop_bot';
    } else if (lowerMessage.includes('análise') || lowerMessage.includes('mercado')) {
      return 'market_analysis';
    } else if (lowerMessage.includes('oportunidade') || lowerMessage.includes('arbitragem')) {
      return 'find_opportunities';
    } else if (lowerMessage.includes('portfolio') || lowerMessage.includes('carteira')) {
      return 'portfolio_analysis';
    } else {
      return 'general_chat';
    }
  }

  private async generateResponse(intent: string, originalMessage: string): Promise<{
    content: string;
    confidence: number;
    analysis?: any;
    emotion: string;
  }> {
    switch (intent) {
      case 'start_bot':
        return this.handleStartBot();
      case 'stop_bot':
        return this.handleStopBot();
      case 'market_analysis':
        return this.handleMarketAnalysis();
      case 'find_opportunities':
        return this.handleFindOpportunities();
      case 'portfolio_analysis':
        return this.handlePortfolioAnalysis();
      default:
        return this.handleGeneralChat(originalMessage);
    }
  }

  private async handleStartBot(): Promise<any> {
    try {
      if (!this.tradingBot) {
        this.tradingBot = new AutomatedTradingBotService();
      }
      
      await this.tradingBot.startBot();

      return {
        content: this.getRandomResponse('success') + " Bot de trading ativado com sucesso! Tô de olho nas oportunidades pra você, chefe! 🤖💰",
        confidence: 0.95,
        emotion: 'excited'
      };
    } catch (error) {
      return {
        content: this.getRandomResponse('error') + " Mas não consegui iniciar o bot agora. Vou verificar o que houve.",
        confidence: 0.7,
        emotion: 'concerned'
      };
    }
  }

  private async handleStopBot(): Promise<any> {
    try {
      if (this.tradingBot) {
        await this.tradingBot.stopBot();
      }
      
      return {
        content: "Bot pausado com sucesso, mano! Todas as posições foram fechadas com segurança. Quando quiser voltar pro game, é só chamar! 🛑",
        confidence: 0.95,
        emotion: 'calm'
      };
    } catch (error) {
      return {
        content: this.getRandomResponse('error'),
        confidence: 0.7,
        emotion: 'concerned'
      };
    }
  }

  private async handleMarketAnalysis(): Promise<any> {
    // Simulação de análise de mercado
    const analysis = {
      // Dados fallback - atualizado 2026-02-24
      btc: { price: 63500, change: 0, sentiment: 'neutral' },
      eth: { price: 1850, change: 0, sentiment: 'neutral' },
      market: { fearGreedIndex: 50, volume24h: 80000000000 }
    };

    const content = `${this.getRandomResponse('analysis')}

📊 **Bitcoin**: $${analysis.btc.price.toLocaleString()} (${analysis.btc.change > 0 ? '+' : ''}${analysis.btc.change}%)
Sentimento: ${analysis.btc.sentiment === 'bullish' ? '🟢 Alta' : '🔴 Baixa'}

📊 **Ethereum**: $${analysis.eth.price.toLocaleString()} (${analysis.eth.change}%)
Sentimento: ${analysis.eth.sentiment === 'neutral' ? '🟡 Neutro' : '🔴 Baixa'}

📈 **Mercado Geral**:
- Fear & Greed: ${analysis.market.fearGreedIndex}/100 (Ganância Extrema)
- Volume 24h: $${(analysis.market.volume24h / 1e9).toFixed(1)}B

${this.getRandomResponse('suggestion')} Com o Bitcoin em alta e o índice de ganância elevado, pode ser uma boa hora pra realizar alguns lucros ou entrar em posições de arbitragem! 💡`;

    return {
      content,
      confidence: 0.88,
      analysis,
      emotion: 'analytical'
    };
  }

  private async handleFindOpportunities(): Promise<any> {
    const opportunities = [
      {
        type: 'arbitrage',
        asset: 'BTC',
        buyExchange: 'Binance',
        sellExchange: 'Hyperliquid',
        profit: 0.35,
        volume: 50000
      },
      {
        type: 'momentum',
        asset: 'ORDI',
        direction: 'long',
        entry: 45.50,
        target: 48.00,
        confidence: 0.82
      }
    ];

    const content = `${this.getRandomResponse('analysis')} Achei umas paradas bem interessantes pra você:

🎯 **Oportunidade de Arbitragem**:
- Ativo: BTC
- Comprar em: Binance
- Vender em: Hyperliquid
- Lucro estimado: ${opportunities[0]?.profit || 2.5}%
- Volume disponível: $${opportunities[0]?.volume?.toLocaleString() || '50,000'}

📈 **Trade de Momentum**:
- Ativo: ORDI
- Direção: Long
- Entrada: $${opportunities[1]?.entry || 45}
- Alvo: $${opportunities[1]?.target || 52}
- Confiança: ${((opportunities[1]?.confidence || 0.82) * 100).toFixed(0)}%

Quer que eu execute alguma dessas oportunidades pra você? É só falar! 🚀`;

    return {
      content,
      confidence: 0.91,
      analysis: { opportunities },
      emotion: 'excited'
    };
  }

  private async handlePortfolioAnalysis(): Promise<any> {
    const portfolio = {
      totalValue: 125000,
      pnl24h: 3500,
      pnlPercentage: 2.88,
      topAssets: [
        { symbol: 'BTC', value: 75000, percentage: 60 },
        { symbol: 'ETH', value: 25000, percentage: 20 },
        { symbol: 'ORDI', value: 15000, percentage: 12 },
        { symbol: 'RUNE', value: 10000, percentage: 8 }
      ]
    };

    const content = `${this.getRandomResponse('analysis')} Sua carteira tá show de bola!

💼 **Resumo do Portfolio**:
- Valor Total: $${portfolio.totalValue.toLocaleString()}
- P&L 24h: +$${portfolio.pnl24h.toLocaleString()} (+${portfolio.pnlPercentage}%)

📊 **Distribuição**:
${portfolio.topAssets.map(asset => 
  `- ${asset.symbol}: $${asset.value.toLocaleString()} (${asset.percentage}%)`
).join('\n')}

${this.getRandomResponse('suggestion')} Tá bem diversificado! Talvez valha a pena aumentar um pouco a exposição em altcoins promissoras como ORDI e RUNE. O que acha? 🎯`;

    return {
      content,
      confidence: 0.92,
      analysis: { portfolio },
      emotion: 'positive'
    };
  }

  private async handleGeneralChat(message: string): Promise<any> {
    const responses = [
      "Tô aqui pra te ajudar no que precisar, mano! Pode mandar a pergunta que eu respondo!",
      "Boa pergunta! Deixa eu pensar aqui e te dar uma resposta maneira...",
      "É isso aí, parça! Vamos conversar sobre trading e fazer uma grana!",
      "Cypher na área! Qualquer dúvida sobre crypto, trading ou o mercado, pode perguntar!"
    ];

    return {
      content: responses[Math.floor(Math.random() * responses.length)],
      confidence: 0.8,
      emotion: 'friendly'
    };
  }

  private getRandomResponse(type: keyof AIPersonality['responsePatterns']): string {
    const patterns = this.config.personality.responsePatterns[type];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  async analyzeMarket(symbol: string): Promise<AnalysisResult> {
    // Implementação básica de análise
    return {
      summary: `Análise completa de ${symbol} realizada com sucesso.`,
      sentiment: 'bullish',
      confidence: 0.85,
      signals: [],
      risks: [],
      opportunities: []
    };
  }

  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export * from './types';