// CYPHER AI v2 - Conversation Module
// Intelligent conversation management and response generation

import EventEmitter from 'events';
import { GeminiIntegration } from '../gemini/GeminiIntegration';
import { SmartResponseGenerator } from './SmartResponseGenerator';
import { AIOrchestrator } from '../integrations/AIOrchestrator';
import type { 
  CypherAIConfig, 
  ConversationMessage, 
  Intent, 
  AIPersonality,
  EmotionType,
  CommandResult 
} from '../types';
import type { AdvancedIntent, ConversationContext } from '../nlu/AdvancedNLU';

export class ConversationModule extends EventEmitter {
  private config: CypherAIConfig;
  private conversationHistory: ConversationMessage[] = [];
  private personality: AIPersonality;
  private contextWindow: number = 20;
  private gemini: GeminiIntegration | null = null;
  private useGemini: boolean = false;
  private smartResponse: SmartResponseGenerator;
  private aiOrchestrator: AIOrchestrator;

  constructor(config: CypherAIConfig) {
    super();
    this.config = config;
    this.personality = config.personality;
    
    // Initialize Smart Response Generator
    this.smartResponse = new SmartResponseGenerator();
    
    // Initialize AI Orchestrator with all APIs
    this.aiOrchestrator = new AIOrchestrator(config);
    
    // Initialize Gemini for backward compatibility
    if (config.apiKeys?.gemini) {
      this.gemini = new GeminiIntegration(config);
      this.useGemini = true;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize conversation memory
      this.conversationHistory = [];
      
      // Initialize Gemini if available
      if (this.gemini && this.useGemini) {
        try {
          await this.gemini.initialize();
        } catch (error) {
          this.useGemini = false;
        }
      }
      
      this.emit('initialized');
    } catch (error) {
      console.error('Erro ao inicializar ConversationModule:', error);
      throw error;
    }
  }

  async generateResponse(params: {
    text: string;
    intent: Intent;
    marketContext?: any;
    personality: AIPersonality;
  }): Promise<{
    text: string;
    emotion: EmotionType;
    confidence: number;
    data?: any;
  }> {
    const { text, intent, marketContext } = params;

    try {
      // Generate contextual response based on intent
      const response = await this.generateContextualResponse(intent, marketContext, text);
      
      // Apply personality traits
      const personalizedResponse = this.applyPersonality(response, this.personality);
      
      // Determine emotion
      const emotion = this.determineEmotion(intent, response);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(intent, marketContext);

      return {
        text: personalizedResponse,
        emotion,
        confidence,
        data: marketContext
      };
    } catch (error) {
      console.error('Erro ao gerar resposta:', error);
      return {
        text: 'Desculpe, tive um problema para processar sua solicitação. Pode tentar novamente?',
        emotion: 'concerned',
        confidence: 0.5
      };
    }
  }

  // Enhanced response generation with Gemini
  async generateEnhancedResponse(params: {
    text: string;
    intent: AdvancedIntent;
    marketContext?: any;
    conversationContext?: ConversationContext;
  }): Promise<{
    text: string;
    emotion: EmotionType;
    confidence: number;
    suggestions?: string[];
    data?: any;
  }> {
    const { text, intent, marketContext, conversationContext } = params;

    try {
      // Use AI Orchestrator for intelligent fallback across all APIs
      
      const orchestratorResponse = await this.aiOrchestrator.generateResponse({
        prompt: text,
        context: this.buildContextString(intent, marketContext),
        intent,
        marketData: marketContext,
        temperature: 0.7
      });
      
      // Enhanced response with orchestrator
      return {
        text: orchestratorResponse.text,
        emotion: orchestratorResponse.emotion || this.determineEmotion(intent, orchestratorResponse.text),
        confidence: orchestratorResponse.confidence,
        suggestions: this.generateSuggestions(intent, text),
        data: {
          ...marketContext,
          source: orchestratorResponse.source,
          apiStatus: this.aiOrchestrator.getApiStatus(),
          activeApis: this.aiOrchestrator.getActiveApiCount()
        }
      };
      
    } catch (error) {
      console.error('Erro ao gerar resposta:', error);
      return {
        text: 'Desculpe, tive um problema para processar sua solicitação. Pode tentar novamente?',
        emotion: 'concerned',
        confidence: 0.5
      };
    }
  }
  
  private buildContextString(intent: AdvancedIntent, marketContext: any): string {
    const parts: string[] = [];
    
    parts.push(`Intent: ${intent.name} (${intent.category})`);
    
    if (intent.entities && Object.keys(intent.entities).length > 0) {
      parts.push(`Entities: ${JSON.stringify(intent.entities)}`);
    }
    
    if (marketContext?.bitcoin) {
      parts.push(`Bitcoin Price: $${marketContext.bitcoin.price}`);
      if (marketContext.bitcoin.change24h !== undefined) {
        parts.push(`24h Change: ${marketContext.bitcoin.change24h.toFixed(2)}%`);
      }
    }
    
    return parts.join(' | ');
  }

  async generateCommandResponse(command: string, result: CommandResult): Promise<string> {
    try {
      if (result.success) {
        return this.generateSuccessResponse(command, result);
      } else {
        return this.generateErrorResponse(command, result);
      }
    } catch (error) {
      console.error('Erro ao gerar resposta de comando:', error);
      return 'Comando executado, mas houve um problema na resposta.';
    }
  }

  private async generateContextualResponse(intent: Intent, marketContext: any, originalText: string): Promise<string> {
    switch (intent.category) {
      case 'trading':
        return this.generateTradingResponse(intent, marketContext);
      
      case 'analysis':
        return this.generateAnalysisResponse(intent, marketContext);
      
      case 'portfolio':
        return this.generatePortfolioResponse(intent, marketContext);
      
      case 'market':
        return this.generateMarketResponse(intent, marketContext);
      
      default:
        return this.generateGeneralResponse(intent, originalText);
    }
  }

  private generateTradingResponse(intent: Intent, marketContext: any): string {
    const { entities } = intent;
    const asset = entities.asset || 'BTC';
    const amount = entities.amount || 'uma quantia';

    switch (intent.name) {
      case 'buy_crypto':
        return `Entendi que você quer comprar ${amount} de ${asset}. ` +
               `O preço atual está em $${marketContext?.bitcoin?.price?.toLocaleString() || 'carregando...'}. ` +
               `Quer que eu execute essa operação?`;
      
      case 'sell_crypto':
        return `Você quer vender ${amount} de ${asset}. ` +
               `Com o preço atual, isso daria aproximadamente $${this.calculateSellValue(amount, marketContext)}. ` +
               `Confirma a venda?`;
      
      default:
        return `Posso ajudar você com trading de ${asset}. Qual operação deseja realizar?`;
    }
  }

  private generateAnalysisResponse(intent: Intent, marketContext: any): string {
    const { entities } = intent;
    const asset = entities.asset || 'Bitcoin';
    const type = entities.type || 'geral';

    const currentPrice = marketContext?.bitcoin?.price || 0;
    const change24h = marketContext?.bitcoin?.change24h || 0;
    const changeText = change24h > 0 ? `subiu ${change24h.toFixed(2)}%` : `caiu ${Math.abs(change24h).toFixed(2)}%`;

    switch (type) {
      case 'technical':
        return `Análise técnica do ${asset}: ` +
               `Preço atual: $${currentPrice.toLocaleString()}, ${changeText} nas últimas 24h. ` +
               `Com base nos indicadores, vejo uma tendência ${change24h > 0 ? 'bullish' : 'bearish'} no curto prazo.`;
      
      case 'sentiment':
        return `O sentimento do mercado para ${asset} está ${change24h > 0 ? 'positivo' : 'negativo'} hoje. ` +
               `O Fear & Greed Index indica ${this.interpretFearGreed(marketContext?.market?.fearGreedIndex)}.`;
      
      default:
        return `${asset} está cotado a $${currentPrice.toLocaleString()}, ${changeText} hoje. ` +
               `O volume de negociação está em $${marketContext?.bitcoin?.volume24h?.toLocaleString() || 'N/A'}.`;
    }
  }

  private generatePortfolioResponse(intent: Intent, marketContext: any): string {
    // Simulate portfolio data
    const totalValue = '$45,230';
    const change24h = '+2.3%';
    
    return `Seu portfolio está avaliado em ${totalValue}, com variação de ${change24h} nas últimas 24h. ` +
           `Sua maior posição é em Bitcoin (60%), seguida por Ethereum (25%) e outros altcoins (15%).`;
  }

  private generateMarketResponse(intent: Intent, marketContext: any): string {
    const currentPrice = marketContext?.bitcoin?.price || 0;
    const change24h = marketContext?.bitcoin?.change24h || 0;
    const marketCap = marketContext?.bitcoin?.marketCap || 0;
    const volume24h = marketContext?.bitcoin?.volume24h || 0;
    const dominance = marketContext?.bitcoin?.dominance || 0;
    const source = marketContext?.bitcoin?.source || 'dados de mercado';

    switch (intent.name) {
      case 'price_check':
        const priceFormatted = currentPrice.toLocaleString('pt-BR', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0 
        });
        
        const changeDirection = change24h > 0 ? '🟢' : '🔴';
        const changeText = change24h > 0 ? 'alta' : 'baixa';
        const marketCapB = (marketCap / 1e9).toFixed(1);
        const volumeB = (volume24h / 1e9).toFixed(1);
        
        let response = `${changeDirection} **Bitcoin agora**: $${priceFormatted}\n`;
        response += `${changeText} de ${Math.abs(change24h).toFixed(2)}% nas últimas 24h\n`;
        response += `Market Cap: $${marketCapB}B | Volume: $${volumeB}B`;
        
        if (dominance > 0) {
          response += ` | Dominância: ${dominance.toFixed(1)}%`;
        }
        
        response += `\n\n${this.getMarketInsight(change24h, currentPrice)}`;
        
        return response;
      
      default:
        const marketTrend = change24h > 0 ? 'força compradora' : 'pressão vendedora';
        const emoji = change24h > 0 ? '🚀' : '📉';
        
        return `${emoji} O mercado cripto mostra ${marketTrend} hoje. ` +
               `Bitcoin ${change24h > 0 ? 'lidera os ganhos' : 'enfrenta correção'} com ${Math.abs(change24h).toFixed(2)}%. ` +
               `${this.getMarketContextAdvice(change24h)}`;
    }
  }
  
  private getMarketInsight(change24h: number, price: number): string {
    if (change24h > 5) {
      return '🚀 Movimento forte de alta! Bom momento para avaliar realizações parciais.';
    } else if (change24h > 2) {
      return '📈 Tendência positiva mantida. Mercado demonstrando confiança.';
    } else if (change24h > -2) {
      return '🟡 Movimento lateral. Bom período para acumulação gradual.';
    } else if (change24h > -5) {
      return '📉 Correção saudável. Oportunidade para posições de longo prazo.';
    } else {
      return '⚠️ Movimento de correção forte. Importante gerenciar riscos.';
    }
  }
  
  private getMarketContextAdvice(change24h: number): string {
    if (change24h > 3) {
      return 'Momentum positivo, mas mantenha disciplina no risk management.';
    } else if (change24h < -3) {
      return 'Correção pode oferecer boas oportunidades de entrada para holders.';
    } else {
      return 'Movimento dentro da normalidade do mercado 24/7.';
    }
  }

  private generateGeneralResponse(intent: Intent, originalText: string): string {
    // Enhanced general response with better conversation flow
    switch (intent.name) {
      case 'greeting':
        return this.generateGreetingResponse();
        
      case 'help_request':
        return this.generateHelpResponse();
        
      case 'market_news':
        return this.generateNewsResponse();
        
      default:
        return this.generateContextualGeneralResponse(originalText);
    }
  }
  
  private generateGreetingResponse(): string {
    const timeBasedGreetings = this.getTimeBasedGreeting();
    const greetingResponses = [
      `${timeBasedGreetings}! Sou a CYPHER AI, sua assistente especializada em Bitcoin e criptomoedas. Como posso ajudar você hoje?`,
      `${timeBasedGreetings}! Pronto para explorar o mundo das criptomoedas? Posso te ajudar com preços, análises, trading e muito mais!`,
      `${timeBasedGreetings}! CYPHER AI aqui! Especialista em Bitcoin, Ordinals, Runes e o mercado cripto. No que posso te auxiliar?`,
      `${timeBasedGreetings}! Que bom te ver! Estou aqui para te ajudar com tudo sobre criptomoedas. Qual sua dúvida ou interesse hoje?`
    ];
    
    return greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
  }
  
  private generateHelpResponse(): string {
    return `Claro! Posso te ajudar com várias coisas relacionadas a criptomoedas:

` +
           `💰 **Preços e Cotações**: "Qual o preço do Bitcoin?"
` +
           `📈 **Análises de Mercado**: "Como está o mercado hoje?"
` +
           `💼 **Portfolio**: "Como está meu portfolio?"
` +
           `📈 **Trading**: "Quero comprar Bitcoin"
` +
           `📰 **Notícias**: "Quais as novidades do mercado?"
` +
           `🎲 **Ordinals e Runes**: Informações sobre NFTs Bitcoin

` +
           `Pode me perguntar qualquer coisa sobre criptomoedas de forma natural, como se estivesse conversando com um amigo especialista!`;
  }
  
  private generateNewsResponse(): string {
    const currentHour = new Date().getHours();
    const marketStatus = currentHour >= 9 && currentHour <= 17 ? 'mercados tradicionais abertos' : 'período noturno';
    
    return `Vamos às novidades do mercado cripto! Estamos no ${marketStatus}.

` +
           `📈 Bitcoin mantendo tendência de alta estrutural
` +
           `🌍 Adoção institucional crescendo globalmente
` +
           `⚡ Lightning Network expandindo casos de uso
` +
           `🎲 Ordinals e Runes ganhando tração na comunidade

` +
           `Quer que eu aprofunde em algum desses temas ou você tem interesse em algo específico?`;
  }
  
  private generateContextualGeneralResponse(originalText: string): string {
    // Use Smart Response Generator for intelligent responses
    const marketContext = this.getLatestMarketContext();
    const intent = this.inferIntent(originalText);
    
    return this.smartResponse.generateIntelligentResponse(
      originalText,
      intent,
      marketContext
    );
  }
  
  private getLatestMarketContext(): any {
    // Get the latest market data from conversation history
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const msg = this.conversationHistory[i];
      if (msg.metadata?.marketContext) {
        return msg.metadata.marketContext;
      }
    }
    return null;
  }
  
  private inferIntent(text: string): Intent {
    // Basic intent inference for fallback
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('preço') || lowerText.includes('quanto')) {
      return { name: 'price_check', category: 'market', confidence: 0.8, entities: {} };
    }
    if (lowerText.includes('comprar') || lowerText.includes('vender')) {
      return { name: 'trading_query', category: 'trading', confidence: 0.7, entities: {} };
    }
    if (lowerText.includes('análise') || lowerText.includes('analisar')) {
      return { name: 'analysis_request', category: 'analysis', confidence: 0.7, entities: {} };
    }
    
    return { name: 'general_question', category: 'general', confidence: 0.5, entities: {} };
  }
  
  private generateSuggestions(intent: AdvancedIntent, userText: string): string[] {
    const suggestions: string[] = [];
    
    switch (intent.category) {
      case 'market':
        suggestions.push(
          'Análise técnica detalhada',
          'Previsão de preço para próxima semana',
          'Comparar com outros ativos'
        );
        break;
      case 'trading':
        suggestions.push(
          'Estratégias de risk management',
          'Melhores pontos de entrada',
          'Análise de volume'
        );
        break;
      case 'analysis':
        suggestions.push(
          'Indicadores on-chain',
          'Sentimento do mercado',
          'Correlação com mercados tradicionais'
        );
        break;
      default:
        suggestions.push(
          'Preço atual do Bitcoin',
          'Notícias do mercado',
          'Análise técnica'
        );
    }
    
    return suggestions;
  }
  
  private isGenericResponse(response: string): boolean {
    // Check if response contains generic patterns
    const genericPatterns = [
      'interessante! sobre',
      'vários ângulos que podemos explorar',
      'posso te dar uma visão completa',
      'você tem algum aspecto específico',
      'tema importante no mundo cripto',
      'ótima pergunta!'
    ];
    
    const lowerResponse = response.toLowerCase();
    return genericPatterns.some(pattern => lowerResponse.includes(pattern));
  }
  
  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    if (hour >= 18 && hour < 22) return 'Boa noite';
    return 'Olá';
  }

  private generateSuccessResponse(command: string, result: CommandResult): string {
    const responses = [
      `✅ Comando "${command}" executado com sucesso! ${result.message}`,
      `Perfeito! "${command}" foi processado. ${result.message}`,
      `Concluído! "${command}" executado sem problemas. ${result.message}`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateErrorResponse(command: string, result: CommandResult): string {
    return `❌ Ops! Houve um problema ao executar "${command}": ${result.message}. ` +
           `Quer que eu tente novamente ou precisa de ajuda?`;
  }

  private applyPersonality(response: string, personality: AIPersonality): string {
    switch (personality.name) {
      case 'professional':
        return this.makeProfessional(response);
      
      case 'friendly':
        return this.makeFriendly(response);
      
      case 'analytical':
        return this.makeAnalytical(response);
      
      case 'casual':
        return this.makeCasual(response);
      
      case 'expert':
        return this.makeExpert(response);
      
      default:
        return response;
    }
  }

  private makeProfessional(text: string): string {
    // Add professional tone
    return text.replace(/oi|olá/gi, 'Bom dia/tarde')
               .replace(/beleza/gi, 'perfeito')
               .replace(/show/gi, 'excelente');
  }

  private makeFriendly(text: string): string {
    // Add friendly expressions
    const friendlyPrefixes = ['😊 ', '👍 ', '🚀 '];
    const prefix = friendlyPrefixes[Math.floor(Math.random() * friendlyPrefixes.length)];
    return prefix + text;
  }

  private makeAnalytical(text: string): string {
    // Add analytical language
    return text.replace(/acho que/gi, 'com base nos dados,')
               .replace(/talvez/gi, 'há uma probabilidade de que')
               .replace(/pode ser/gi, 'indica que');
  }

  private makeCasual(text: string): string {
    // Add casual expressions
    return text.replace(/você/gi, 'você')
               .replace(/Entendi/gi, 'Saquei')
               .replace(/perfeito/gi, 'show!');
  }

  private makeExpert(text: string): string {
    // Add expert terminology
    return text.replace(/preço/gi, 'cotação')
               .replace(/comprar/gi, 'adquirir posição long')
               .replace(/vender/gi, 'realizar posição');
  }

  private determineEmotion(intent: Intent, response: string): EmotionType {
    // Determine emotion based on intent and response content
    if (intent.category === 'trading') {
      return response.includes('risco') ? 'concerned' : 'confident';
    }
    
    if (response.includes('alta') || response.includes('ganho') || response.includes('lucro')) {
      return 'excited';
    }
    
    if (response.includes('baixa') || response.includes('perda')) {
      return 'concerned';
    }
    
    if (response.includes('análise') || response.includes('dados')) {
      return 'analytical';
    }
    
    if (response.includes('✅') || response.includes('sucesso')) {
      return 'happy';
    }
    
    return 'neutral';
  }

  private calculateConfidence(intent: Intent, marketContext: any): number {
    let confidence = 0.7; // Base confidence
    
    // Market data quality assessment
    if (marketContext) {
      confidence += 0.1;
      
      // Bonus for real-time data vs simulated
      if (marketContext.bitcoin?.source && marketContext.bitcoin.source !== 'simulated') {
        confidence += 0.05;
      }
      
      // Bonus for multiple data points
      if (marketContext.bitcoin?.volume24h && marketContext.bitcoin?.marketCap) {
        confidence += 0.03;
      }
    }
    
    // Adjust based on intent category
    switch (intent.category) {
      case 'market':
        confidence += 0.1;
        break;
      case 'conversation':
        confidence += 0.15; // High confidence for greetings/conversation
        break;
      case 'information':
        confidence += 0.12; // High confidence for help/info
        break;
      case 'trading':
        confidence += 0.05; // Lower for trading (requires caution)
        break;
      case 'analysis':
        confidence += 0.08;
        break;
    }
    
    // Intent confidence factor
    confidence += (intent.confidence || 0.5) * 0.1;
    
    // Conversation context bonus
    const conversationLength = this.conversationHistory.length;
    if (conversationLength > 2) {
      confidence += 0.05; // Bonus for ongoing conversation
    }
    
    // Specific intent bonuses
    if (intent.name === 'greeting') {
      confidence += 0.2; // Very high confidence for greetings
    }
    
    if (intent.name === 'help_request') {
      confidence += 0.15; // High confidence for help
    }
    
    return Math.min(confidence, 0.98);
  }

  private calculateSellValue(amount: any, marketContext: any): string {
    if (typeof amount === 'number' && marketContext?.bitcoin?.price) {
      const value = amount * marketContext.bitcoin.price;
      return value.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    return 'calculando...';
  }

  private interpretFearGreed(index: number): string {
    if (!index) return 'neutro';
    
    if (index < 25) return 'medo extremo';
    if (index < 45) return 'medo';
    if (index < 55) return 'neutro';
    if (index < 75) return 'ganância';
    return 'ganância extrema';
  }

  setPersonality(personality: AIPersonality): void {
    this.personality = personality;
  }

  getHistory(): ConversationMessage[] {
    return this.conversationHistory.slice(-this.contextWindow);
  }

  addToHistory(message: ConversationMessage): void {
    this.conversationHistory.push({
      ...message,
      timestamp: new Date()
    });
    
    // Keep only recent messages within context window
    if (this.conversationHistory.length > this.contextWindow * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.contextWindow);
    }
    
    // Emit conversation update for external listeners
    this.emit('conversationUpdate', {
      message,
      historyLength: this.conversationHistory.length
    });
  }
  
  getConversationContext(): string {
    // Generate a summary of recent conversation for better context awareness
    const recentMessages = this.getHistory().slice(-5); // Last 5 messages
    
    if (recentMessages.length === 0) {
      return 'Nova conversa iniciada.';
    }
    
    const topics = recentMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('. ');
      
    return `Contexto recente: ${topics}`;
  }
  
  hasRecentContext(keyword: string): boolean {
    const recentMessages = this.getHistory().slice(-3);
    return recentMessages.some(msg => 
      msg.content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  async destroy(): Promise<void> {
    this.clearHistory();
    
    // Destroy Gemini integration
    if (this.gemini) {
      await this.gemini.destroy();
    }
    
    this.removeAllListeners();
  }
  
  // New methods for Gemini integration
  async switchToGemini(): Promise<boolean> {
    if (!this.gemini) {
      return false;
    }
    
    try {
      if (!this.gemini.isReady) {
        await this.gemini.initialize();
      }
      this.useGemini = true;
      return true;
    } catch (error) {
      console.error('❌ Falha ao alternar para Gemini:', error);
      return false;
    }
  }
  
  switchToBasic(): void {
    this.useGemini = false;
  }
  
  isUsingGemini(): boolean {
    return this.useGemini && this.gemini?.isReady === true;
  }
  
  async clearGeminiHistory(): Promise<void> {
    if (this.gemini) {
      await this.gemini.clearChatHistory();
    }
  }
}