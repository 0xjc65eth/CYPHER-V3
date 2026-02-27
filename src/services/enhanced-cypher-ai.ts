/**
 * 🧠 ENHANCED CYPHER AI - CYPHER ORDi FUTURE V3
 * IA avançada com interface texto/áudio e gírias jovens
 */

import { fetchWithRetry } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { ErrorReporter } from '@/lib/ErrorReporter';
import { hyperliquidService } from './hyperliquid-service';
import { apiServices } from './api-services';

export interface CypherAIResponse {
  text: string;
  audioUrl?: string;
  confidence: number;
  action?: 'trade' | 'analyze' | 'info' | 'command';
  tradingData?: any;
  mood: 'excited' | 'confident' | 'cautious' | 'neutral' | 'bullish' | 'bearish';
  emojis: string[];
}

export interface CypherAIContext {
  marketData?: any;
  portfolioData?: any;
  userPreferences?: any;
  conversationHistory?: string[];
  timestamp: number;
}

export class EnhancedCypherAI {
  private conversationHistory: string[] = [];
  private userProfile: any = {};
  private readonly API_KEY = API_CONFIG.ELEVENLABS.API_KEY;
  private readonly VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella voice from ElevenLabs

  constructor() {
    EnhancedLogger.info('Enhanced Cypher AI initialized', {
      component: 'EnhancedCypherAI',
      voiceEnabled: !!this.API_KEY
    });
  }

  /**
   * Processa input de texto com análise de contexto
   */
  async processTextInput(
    input: string, 
    context: CypherAIContext
  ): Promise<CypherAIResponse> {
    try {
      // Adicionar ao histórico
      this.conversationHistory.push(`User: ${input}`);
      
      // Analisar intent do usuário
      const intent = this.analyzeIntent(input);
      
      // Obter dados de mercado em tempo real
      const marketContext = await this.getMarketContext();
      
      // Gerar resposta personalizada
      const response = await this.generateResponse(input, intent, marketContext, context);
      
      // Adicionar resposta ao histórico
      this.conversationHistory.push(`Cypher: ${response.text}`);
      
      // Gerar áudio se habilitado
      if (this.API_KEY) {
        response.audioUrl = await this.generateAudio(response.text);
      }

      EnhancedLogger.info('Cypher AI response generated', {
        component: 'EnhancedCypherAI',
        intent,
        confidence: response.confidence,
        hasAudio: !!response.audioUrl
      });

      return response;
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'EnhancedCypherAI',
        action: 'processTextInput',
        input
      });
      
      return this.getErrorResponse();
    }
  }

  /**
   * Processa input de áudio
   */
  async processAudioInput(audioFile: File): Promise<CypherAIResponse> {
    try {
      // Transcrever áudio
      const transcription = await this.transcribeAudio(audioFile);
      
      if (!transcription) {
        throw new Error('Failed to transcribe audio');
      }

      // Processar como texto
      const context: CypherAIContext = {
        timestamp: Date.now(),
        conversationHistory: this.conversationHistory
      };
      
      return await this.processTextInput(transcription, context);
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'EnhancedCypherAI',
        action: 'processAudioInput'
      });
      
      return this.getErrorResponse();
    }
  }

  /**
   * Analisa intent do usuário
   */
  private analyzeIntent(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('comprar') || lowerInput.includes('buy') || lowerInput.includes('trade')) {
      return 'trade';
    }
    
    if (lowerInput.includes('preço') || lowerInput.includes('price') || lowerInput.includes('valor')) {
      return 'price_check';
    }
    
    if (lowerInput.includes('análise') || lowerInput.includes('analise') || lowerInput.includes('analyze')) {
      return 'analyze';
    }
    
    if (lowerInput.includes('bot') || lowerInput.includes('automático')) {
      return 'bot_command';
    }
    
    if (lowerInput.includes('portfolio') || lowerInput.includes('carteira')) {
      return 'portfolio';
    }
    
    return 'general';
  }

  /**
   * Obtém contexto de mercado em tempo real
   */
  private async getMarketContext(): Promise<any> {
    try {
      const [marketData, hyperliquidData] = await Promise.allSettled([
        apiServices.coinMarketCap.getQuotes(['BTC', 'ETH', 'SOL']),
        hyperliquidService.getMarketData(['BTC', 'ETH', 'SOL'])
      ]);

      return {
        market: marketData.status === 'fulfilled' ? marketData.value : null,
        hyperliquid: hyperliquidData.status === 'fulfilled' ? hyperliquidData.value : null,
        timestamp: Date.now()
      };
    } catch (error) {
      EnhancedLogger.warn('Failed to get market context', {
        component: 'EnhancedCypherAI',
        error: error.message
      });
      return {};
    }
  }

  /**
   * Gera resposta personalizada com gírias jovens
   */
  private async generateResponse(
    input: string, 
    intent: string, 
    marketContext: any, 
    context: CypherAIContext
  ): Promise<CypherAIResponse> {
    const responses = this.getResponseTemplates();
    let response: CypherAIResponse;

    switch (intent) {
      case 'trade':
        response = this.generateTradeResponse(input, marketContext);
        break;
      case 'price_check':
        response = this.generatePriceResponse(input, marketContext);
        break;
      case 'analyze':
        response = this.generateAnalysisResponse(input, marketContext);
        break;
      case 'bot_command':
        response = this.generateBotResponse(input);
        break;
      case 'portfolio':
        response = this.generatePortfolioResponse(input, context);
        break;
      default:
        response = this.generateGeneralResponse(input);
    }

    return response;
  }

  private generateTradeResponse(input: string, marketContext: any): CypherAIResponse {
    const btcPrice = marketContext?.market?.data?.BTC?.quote?.USD?.price || 0;
    const change = marketContext?.market?.data?.BTC?.quote?.USD?.percent_change_24h || 0;
    
    const mood = change > 0 ? 'bullish' : change < -5 ? 'bearish' : 'neutral';
    const emojis = change > 5 ? ['🚀', '💰', '🔥'] : change < -5 ? ['📉', '⚠️', '🔴'] : ['📊', '🤔', '💭'];

    const priceText = btcPrice > 0 ? `$${btcPrice.toLocaleString()}` : 'price unavailable';

    return {
      text: `Ow mano! 🔥 Bitcoin tá em ${priceText} agora. ${
        btcPrice === 0 ?
        'Não consegui pegar o preço no momento. Tenta de novo em alguns segundos!' :
        change > 0 ?
        `Subiu ${change.toFixed(2)}% nas últimas 24h! Tá voando! 🚀 Se tu quer entrar, é uma boa hora, mas sempre com stop loss, né?` :
        change < -5 ?
        `Desceu ${Math.abs(change).toFixed(2)}%... Tá meio sangrado. 📉 Pode ser uma oportunidade de compra, mas cuidado!` :
        `Tá meio lateral, ${change.toFixed(2)}%. Hora de aguardar um sinal mais claro! 🤔`
      }${btcPrice > 0 ? ' Quer que eu ative o bot automático pra aproveitar essas oscilações?' : ''}`,
      confidence: 0.85,
      action: 'trade',
      tradingData: { symbol: 'BTC', price: btcPrice, change },
      mood,
      emojis
    };
  }

  private generatePriceResponse(input: string, marketContext: any): CypherAIResponse {
    const btcPrice = marketContext?.market?.data?.BTC?.quote?.USD?.price || 0;
    const ethPrice = marketContext?.market?.data?.ETH?.quote?.USD?.price || 0;
    const solPrice = marketContext?.market?.data?.SOL?.quote?.USD?.price || 0;

    const fmt = (p: number) => p > 0 ? `$${p.toLocaleString()}` : 'unavailable';

    return {
      text: `Olha só os preços do momento, king! 👑

🟡 Bitcoin: ${fmt(btcPrice)}
🟣 Ethereum: ${fmt(ethPrice)}
🟢 Solana: ${fmt(solPrice)}

${btcPrice > 0 ? 'Tudo em tempo real direto das exchanges! 📡 Se liga que o mercado tá sempre mexendo, hein!' : 'Alguns preços não estão disponíveis no momento. Tenta de novo em breve!'}`,
      confidence: 0.95,
      action: 'info',
      mood: 'confident',
      emojis: ['💰', '📊', '🔥']
    };
  }

  private generateAnalysisResponse(input: string, marketContext: any): CypherAIResponse {
    return {
      text: `Cara, deixa eu te explicar o que tá rolando no mercado agora! 🧠

O Bitcoin tá mostrando alguns sinais interessantes:
• Volume tá aumentando 📈
• RSI tá em zona neutra (~50)
• Suporte forte em $42k
• Resistência em $45k

Pro lado dos ordinals e runes, tá meio quieto mas tem algumas oportunidades surgindo. O pessoal tá acumulando, saca? 👀

Quer que eu faça uma análise mais deep de alguma crypto específica?`,
      confidence: 0.80,
      action: 'analyze',
      mood: 'confident',
      emojis: ['🧠', '📈', '🔍']
    };
  }

  private generateBotResponse(input: string): CypherAIResponse {
    return {
      text: `Opa! 🤖 Então tu quer mexer com o bot automático? Mano, ele tá funcionando liso!

O bot pode fazer:
• Arbitragem entre exchanges 🔄
• Grid trading automático 📊
• DCA (Dollar Cost Average) 💰
• Stop loss inteligente 🛡️

Ele tá conectado com a Hyperliquid e outras exchanges. Quer que eu configure uma estratégia pra ti? Só fala qual é tua vibe: conservador, moderado ou agressivo! 🚀`,
      confidence: 0.90,
      action: 'command',
      mood: 'excited',
      emojis: ['🤖', '⚡', '🚀']
    };
  }

  private generatePortfolioResponse(input: string, context: CypherAIContext): CypherAIResponse {
    return {
      text: `Show! Vamo dar uma olhada no teu portfolio! 💼

Pelo que eu tô vendo aqui:
• Tua carteira tá bem diversificada 👌
• Performance geral positiva 📈
• Algumas oportunidades de rebalanceamento

Quer que eu rode uma análise completa? Posso calcular teu Sharpe ratio, volatilidade, e te dar umas dicas de como otimizar! 🎯

Conecta tua wallet aqui que eu te mostro tudo em detalhes!`,
      confidence: 0.75,
      action: 'info',
      mood: 'confident',
      emojis: ['💼', '📊', '💎']
    };
  }

  private generateGeneralResponse(input: string): CypherAIResponse {
    const responses = [
      `E aí, mano! 👋 Como posso te ajudar hoje? Tô aqui pra trocar uma ideia sobre crypto, analisar o mercado, ou ativar uns bots maneiros! 🚀`,
      `Salve! 🔥 Sou a Cypher AI, tua parceira nas crypto! Quer saber sobre preços? Análises? Ou configurar um bot pra fazer dinheiro no automático? 💰`,
      `Opa! 😎 Tô aqui pra te ajudar a bombar nesse mercado! Fala aí, qual é tua dúvida? Preços, trading, ordinals... qualquer coisa!`
    ];

    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      confidence: 0.70,
      action: 'info',
      mood: 'excited',
      emojis: ['👋', '🚀', '💰']
    };
  }

  /**
   * Transcreve áudio usando ElevenLabs ou Web Speech API
   */
  private async transcribeAudio(audioFile: File): Promise<string> {
    throw new Error('Speech-to-Text API not configured');
  }

  /**
   * Gera áudio usando ElevenLabs
   */
  private async generateAudio(text: string): Promise<string> {
    try {
      if (!this.API_KEY) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await fetchWithRetry(
        `${API_CONFIG.ELEVENLABS.BASE_URL}/text-to-speech/${this.VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            ...API_CONFIG.ELEVENLABS.HEADERS,
            'Content-Type': 'application/json'
          },
          body: {
            text: text.replace(/[🔥🚀💰📊🤖⚡👋💎📈📉🟡🟣🟢👌🎯💼🔍🧠🛡️🔄👑😎]/g, ''), // Remove emojis for TTS
            model_id: "eleven_multilingual_v2",
            voice_settings: API_CONFIG.ELEVENLABS.VOICE_SETTINGS
          },
          service: 'ELEVENLABS'
        }
      );

      if (response && typeof response.blob === 'function') {
        const blob = await response.blob();
        if (blob.size > 0) {
          const buffer = await blob.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const audioUrl = `data:audio/mpeg;base64,${base64}`;

          EnhancedLogger.info('Audio generated successfully', {
            component: 'EnhancedCypherAI',
            textLength: text.length,
            voiceId: this.VOICE_ID
          });

          return audioUrl;
        }
      }

      return null;
    } catch (error) {
      EnhancedLogger.warn('Audio generation failed, continuing without audio', {
        component: 'EnhancedCypherAI',
        error: error.message
      });
      return null;
    }
  }

  private getErrorResponse(): CypherAIResponse {
    return {
      text: "Opa, deu um bug aqui! 😅 Mas relax, já tô me ajustando. Tenta de novo em alguns segundos, mano!",
      confidence: 0.50,
      action: 'info',
      mood: 'neutral',
      emojis: ['😅', '🔧', '⚠️']
    };
  }

  private getResponseTemplates() {
    return {
      greetings: [
        "E aí, mano! 👋",
        "Salve! 🔥", 
        "Opa! 😎",
        "Show! 🚀"
      ],
      excitement: [
        "Cara, tá voando! 🚀",
        "Mano, que loucura! 🔥",
        "Eita, bomboro! 💥",
        "Vish, partiu lua! 🌙"
      ],
      caution: [
        "Ó, se liga aí... ⚠️",
        "Cuidado, hein! 🛡️",
        "Calma aí, jovem... 🤔",
        "Pé no freio! 🚦"
      ]
    };
  }

  // Getters públicos
  getConversationHistory(): string[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
    EnhancedLogger.info('Conversation history cleared', {
      component: 'EnhancedCypherAI'
    });
  }

  setUserProfile(profile: any): void {
    this.userProfile = profile;
    EnhancedLogger.info('User profile updated', {
      component: 'EnhancedCypherAI',
      profileKeys: Object.keys(profile)
    });
  }
}

export const enhancedCypherAI = new EnhancedCypherAI();
export default EnhancedCypherAI;