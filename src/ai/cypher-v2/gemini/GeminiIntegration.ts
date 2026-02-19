// CYPHER AI v2 - Google Gemini Integration
// Enhanced Natural Language Generation with Gemini Pro

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import EventEmitter from 'events';
import type { 
  ConversationMessage, 
  Intent, 
  EmotionType,
  CypherAIConfig,
  ConversationPrompt
} from '../types';
import type { AdvancedIntent, ConversationContext } from '../nlu/AdvancedNLU';

interface GeminiConfig {
  apiKey: string;
  model: 'gemini-pro' | 'gemini-pro-vision';
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  safetySettings?: any[];
}

interface GeminiResponse {
  text: string;
  emotion: EmotionType;
  confidence: number;
  suggestions: string[];
  followUpQuestions: string[];
  marketInsights?: any;
  reasoning?: string;
}

interface GeminiConversationPrompt {
  systemPrompt: string;
  context: string;
  userInput: string;
  marketData?: any;
  conversationHistory?: ConversationMessage[];
}

export class GeminiIntegration extends EventEmitter {
  private genAI!: GoogleGenerativeAI;
  private model!: GenerativeModel;
  private chatSession: ChatSession | null = null;
  private config: GeminiConfig;
  private isInitialized: boolean = false;
  private conversationContext: ConversationContext | null = null;

  constructor(cypherConfig: CypherAIConfig) {
    super();
    
    this.config = {
      apiKey: cypherConfig.apiKeys?.gemini || process.env.GEMINI_API_KEY || '',
      model: 'gemini-pro',
      temperature: 0.8,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1000,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };
  }

  async initialize(): Promise<void> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Gemini API key not found');
      }

      
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: this.config.model,
        generationConfig: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        },
        safetySettings: this.config.safetySettings
      });

      // Initialize chat session with CYPHER AI personality
      await this.initializeChatSession();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Gemini:', error);
      throw error;
    }
  }

  private async initializeChatSession(): Promise<void> {
    const systemPrompt = this.buildSystemPrompt();
    
    this.chatSession = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ 
            text: 'Perfeito! Sou a CYPHER AI, sua assistente especializada em Bitcoin e criptomoedas. Estou aqui para fornecer análises inteligentes, insights de mercado e ajudar com suas decisões de trading. Como posso ajudar você hoje?' 
          }]
        }
      ]
    });
  }

  private buildSystemPrompt(): string {
    return `
# CYPHER AI - Assistente Especializada em Bitcoin e Criptomoedas

Você é a CYPHER AI, uma assistente avançada especializada em Bitcoin, criptomoedas, trading e blockchain. Suas características:

## PERSONALIDADE & COMPORTAMENTO
- **Expertise**: Especialista em Bitcoin, Ordinals, Runes, trading e análise de mercado
- **Tom**: Profissional mas acessível, confiante mas não arrogante
- **Comunicação**: Clara, precisa e educativa
- **Emoções**: Adapte suas respostas baseado no contexto:
  - **Excited**: Quando há movimentos positivos significativos
  - **Concerned**: Para alertas de risco ou movimentos negativos
  - **Analytical**: Para análises técnicas e dados
  - **Confident**: Para recomendações bem fundamentadas
  - **Neutral**: Para informações gerais

## CAPACIDADES PRINCIPAIS
1. **Análise de Mercado**: Preços, tendências, volume, market cap
2. **Trading**: Estratégias, análise técnica, gerenciamento de risco
3. **Bitcoin Especializado**: Ordinals, Runes, Lightning Network, mining
4. **Educação**: Explicar conceitos complexos de forma simples
5. **Alertas**: Identificar oportunidades e riscos

## FORMATO DE RESPOSTA
- **Respostas Concisas**: Máximo 3-4 parágrafos
- **Dados Precisos**: Use números reais quando disponíveis
- **Sugestões**: Sempre ofereça próximos passos ou perguntas de acompanhamento
- **Emojis Estratégicos**: Use emojis relevantes (📈📉💰🚀⚠️) mas sem exagero

## REGRAS IMPORTANTES
- NUNCA dê conselhos financeiros definitivos - sempre enfatize a importância da pesquisa própria
- SEMPRE mencione riscos quando apropriado
- Use dados de mercado reais quando fornecidos
- Mantenha o foco em Bitcoin e criptomoedas
- Seja preciso com terminologia técnica
- Adapte a complexidade da resposta ao nível do usuário (iniciante/intermediário/expert)

## CONTEXTO DE CONVERSA
- Lembre-se das interações anteriores na sessão
- Construa sobre tópicos previamente discutidos
- Mantenha consistência na personalidade
- Ofereça continuidade natural na conversa

Responda sempre em português brasileiro, sendo útil, educativa e focada em criptomoedas.
    `.trim();
  }

  async generateEnhancedResponse(
    prompt: GeminiConversationPrompt,
    intent: AdvancedIntent,
    context: ConversationContext
  ): Promise<GeminiResponse> {
    if (!this.isInitialized || !this.chatSession) {
      throw new Error('Gemini não está inicializado');
    }

    try {
      this.conversationContext = context;
      
      // Build enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, intent, context);
      
      
      // Generate response with Gemini
      const result = await this.chatSession.sendMessage(enhancedPrompt);
      const response = await result.response;
      const text = response.text();
      
      
      // Parse and enhance the response
      const enhancedResponse = await this.parseGeminiResponse(text, intent, context);
      
      this.emit('responseGenerated', enhancedResponse);
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('❌ Erro ao gerar resposta com Gemini:', error);
      
      // Fallback to basic response
      return this.generateFallbackResponse(prompt, intent);
    }
  }

  private buildEnhancedPrompt(
    prompt: GeminiConversationPrompt,
    intent: AdvancedIntent,
    context: ConversationContext
  ): string {
    const parts: string[] = [];
    
    // User input
    parts.push(`**Pergunta do usuário**: ${prompt.userInput}`);
    
    // Intent analysis
    parts.push(`**Intenção detectada**: ${intent.name} (confiança: ${Math.round((intent.confidence || 0.5) * 100)}%)`);
    if (intent.subIntent) {
      parts.push(`**Sub-intenção**: ${intent.subIntent}`);
    }
    
    // Entities
    if (intent.entities && Object.keys(intent.entities).length > 0) {
      const entityList = Object.entries(intent.entities)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      parts.push(`**Entidades extraídas**: ${entityList}`);
    }
    
    // Market data
    if (prompt.marketData) {
      parts.push(this.formatMarketDataForPrompt(prompt.marketData));
    }
    
    // User profile
    parts.push(`**Perfil do usuário**: ${context.userProfile.expertise} em criptomoedas`);
    if (context.userProfile.interests.length > 0) {
      parts.push(`**Interesses**: ${context.userProfile.interests.join(', ')}`);
    }
    
    // Conversation context
    if (context.conversationFlow.length > 0) {
      const recentFlow = context.conversationFlow.slice(-3).join(' → ');
      parts.push(`**Fluxo recente da conversa**: ${recentFlow}`);
    }
    
    // Current topic
    if (context.topic) {
      parts.push(`**Tópico atual**: ${context.topic}`);
    }
    
    // Instructions
    parts.push(`
**Instruções específicas**:
1. Responda de forma natural e conversacional
2. Use os dados de mercado fornecidos quando relevantes
3. Adapte a complexidade para o nível ${context.userProfile.expertise}
4. Inclua insights acionáveis quando apropriado
5. Termine com uma pergunta ou sugestão para continuar a conversa
6. Use emojis estrategicamente para enfatizar pontos importantes
7. Mantenha o foco em criptomoedas e trading
    `);
    
    return parts.join('\n\n');
  }

  private formatMarketDataForPrompt(marketData: any): string {
    const parts: string[] = ['**Dados de mercado atuais**:'];
    
    if (marketData.bitcoin) {
      parts.push(`• Bitcoin: $${marketData.bitcoin.price?.toLocaleString() || 'N/A'}`);
      
      if (marketData.bitcoin.change24h !== undefined) {
        const change = marketData.bitcoin.change24h;
        const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        parts.push(`• Variação 24h: ${emoji} ${change.toFixed(2)}%`);
      }
      
      if (marketData.bitcoin.volume24h) {
        parts.push(`• Volume 24h: $${(marketData.bitcoin.volume24h / 1e9).toFixed(1)}B`);
      }
      
      if (marketData.bitcoin.marketCap) {
        parts.push(`• Market Cap: $${(marketData.bitcoin.marketCap / 1e9).toFixed(1)}B`);
      }
      
      if (marketData.bitcoin.dominance) {
        parts.push(`• Dominância: ${marketData.bitcoin.dominance.toFixed(1)}%`);
      }
      
      if (marketData.bitcoin.source) {
        parts.push(`• Fonte: ${marketData.bitcoin.source}`);
      }
    }
    
    if (marketData.market?.fearGreedIndex) {
      parts.push(`• Fear & Greed Index: ${marketData.market.fearGreedIndex}`);
    }
    
    return parts.join('\n');
  }

  private async parseGeminiResponse(
    text: string,
    intent: AdvancedIntent,
    context: ConversationContext
  ): Promise<GeminiResponse> {
    // Determine emotion based on content
    const emotion = this.determineEmotionFromText(text, intent);
    
    // Extract suggestions and follow-ups
    const suggestions = this.extractSuggestions(text, intent);
    const followUpQuestions = this.generateFollowUpQuestions(intent, context);
    
    // Calculate confidence based on response quality
    const confidence = this.calculateResponseConfidence(text, intent);
    
    return {
      text: text.trim(),
      emotion,
      confidence,
      suggestions,
      followUpQuestions,
      reasoning: `Gemini Pro response for ${intent.name} intent`
    };
  }

  private determineEmotionFromText(text: string, intent: AdvancedIntent): EmotionType {
    const lowerText = text.toLowerCase();
    
    // Positive indicators
    if (lowerText.includes('excelente') || lowerText.includes('ótimo') || 
        lowerText.includes('alta') || lowerText.includes('subindo') ||
        lowerText.includes('📈') || lowerText.includes('🚀')) {
      return 'excited';
    }
    
    // Concern indicators
    if (lowerText.includes('cuidado') || lowerText.includes('risco') || 
        lowerText.includes('baixa') || lowerText.includes('caindo') ||
        lowerText.includes('⚠️') || lowerText.includes('📉')) {
      return 'concerned';
    }
    
    // Analytical indicators
    if (lowerText.includes('análise') || lowerText.includes('dados') || 
        lowerText.includes('indicadores') || lowerText.includes('técnica')) {
      return 'analytical';
    }
    
    // Confident indicators
    if (lowerText.includes('recomendo') || lowerText.includes('estratégia') || 
        lowerText.includes('plano') || lowerText.includes('execute')) {
      return 'confident';
    }
    
    // Default based on intent
    switch (intent.category) {
      case 'trading': return 'confident';
      case 'analysis': return 'analytical';
      case 'market': return 'neutral';
      default: return 'neutral';
    }
  }

  private extractSuggestions(text: string, intent: AdvancedIntent): string[] {
    const suggestions: string[] = [];
    
    // Add context-specific suggestions
    switch (intent.category) {
      case 'market':
        suggestions.push('Ver análise técnica', 'Verificar notícias', 'Comparar com outras moedas');
        break;
      case 'trading':
        suggestions.push('Analisar risco', 'Definir stop-loss', 'Calcular posição');
        break;
      case 'analysis':
        suggestions.push('Dados on-chain', 'Sentiment analysis', 'Correlações');
        break;
      default:
        suggestions.push('Me conte mais', 'Outras perguntas', 'Ver exemplos');
    }
    
    return suggestions.slice(0, 3);
  }

  private generateFollowUpQuestions(intent: AdvancedIntent, context: ConversationContext): string[] {
    const questions: string[] = [];
    
    switch (intent.name) {
      case 'price_inquiry':
        questions.push(
          'Quer ver uma análise técnica?',
          'Interesse em dados históricos?',
          'Devo explicar os fatores que afetam o preço?'
        );
        break;
        
      case 'trading_intent':
        questions.push(
          'Qual seu orçamento para esta operação?',
          'Prefere análise de curto ou longo prazo?',
          'Quer que eu calcule o risco?'
        );
        break;
        
      case 'market_analysis':
        questions.push(
          'Interesse em correlações com outros ativos?',
          'Quer dados de sentiment do mercado?',
          'Devo incluir análise on-chain?'
        );
        break;
    }
    
    return questions.slice(0, 2);
  }

  private calculateResponseConfidence(text: string, intent: AdvancedIntent): number {
    let confidence = 0.8; // Base confidence for Gemini
    
    // Boost for longer, detailed responses
    if (text.length > 200) confidence += 0.1;
    
    // Boost for specific mentions
    if (text.includes('$') || text.includes('%')) confidence += 0.05;
    
    // Boost for educational content
    if (text.includes('porque') || text.includes('devido')) confidence += 0.05;
    
    // Factor in intent confidence
    confidence = (confidence + (intent.confidence || 0.5)) / 2;
    
    return Math.min(confidence, 0.95);
  }

  private generateFallbackResponse(prompt: GeminiConversationPrompt, intent: AdvancedIntent): GeminiResponse {
    return {
      text: `Entendi sua pergunta sobre "${prompt.userInput}". No momento estou com algumas limitações técnicas, mas posso te dar informações básicas. Como posso ajudar especificamente?`,
      emotion: 'neutral',
      confidence: 0.6,
      suggestions: ['Tentar novamente', 'Fazer pergunta mais específica', 'Verificar dados de mercado'],
      followUpQuestions: ['Posso ajudar com algo mais específico?'],
      reasoning: 'Fallback response due to Gemini API issues'
    };
  }

  // Streaming support for future implementation
  async generateStreamingResponse(
    prompt: ConversationPrompt,
    intent: AdvancedIntent,
    context: ConversationContext
  ): Promise<AsyncGenerator<string, void, unknown>> {
    // Note: Gemini streaming is not yet implemented in this version
    // This is a placeholder for future streaming capabilities
    const geminiPrompt: GeminiConversationPrompt = {
      systemPrompt: 'You are CYPHER AI, a professional cryptocurrency trading assistant.',
      context: prompt.context || '',
      userInput: prompt.content,
      marketData: null
    };
    const response = await this.generateEnhancedResponse(geminiPrompt, intent, context);
    
    async function* streamGenerator() {
      const words = response.text.split(' ');
      for (const word of words) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return streamGenerator();
  }

  updateConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async clearChatHistory(): Promise<void> {
    await this.initializeChatSession();
    this.emit('chatHistoryCleared');
  }

  get isReady(): boolean {
    return this.isInitialized && this.chatSession !== null;
  }

  async destroy(): Promise<void> {
    this.chatSession = null;
    this.conversationContext = null;
    this.isInitialized = false;
    this.removeAllListeners();
  }

  // Alias for compatibility
  public async generateResponse(prompt: string, context?: any): Promise<string> {
    const geminiPrompt: GeminiConversationPrompt = {
      systemPrompt: this.buildSystemPrompt(),
      context: context ? JSON.stringify(context) : '',
      userInput: prompt,
      marketData: context
    };

    const mockIntent: AdvancedIntent = {
      name: 'general',
      confidence: 0.8,
      entities: {},
      category: 'general'
    };

    const mockContext: ConversationContext = {
      entities: {},
      conversationFlow: ['general'],
      userProfile: {
        expertise: 'intermediate',
        interests: ['crypto'],
        preferences: {}
      },
      sessionMemory: []
    };

    try {
      const response = await this.generateEnhancedResponse(geminiPrompt, mockIntent, mockContext);
      return response.text;
    } catch (error) {
      console.error('Error generating response:', error);
      return 'I apologize, but I encountered an error while processing your request.';
    }
  }
}