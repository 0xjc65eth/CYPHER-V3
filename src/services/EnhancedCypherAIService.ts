/**
 * 🤖 Enhanced Cypher AI Service with ElevenLabs Voice Integration
 * Combines the original CypherAI personality with ultra-fluid Portuguese voice
 * Real-time voice responses with Brazilian slang and trading expertise
 */

import VoiceAIManager from './VoiceAIManager';
import { CypherAIService } from './CypherAIService.js';

interface VoiceEnabledResponse {
  response: string;
  voiceResponse?: string;
  shouldSpeak: boolean;
  emotion: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action?: any;
  insights?: any[];
  alerts?: any[];
  marketData?: any;
  confidence: number;
  timestamp: string;
  personality: string;
}

interface VoiceProcessingOptions {
  enableVoice?: boolean;
  skipQueue?: boolean;
  emotion?: string;
  interrupt?: boolean;
  userPreference?: 'voice_only' | 'text_only' | 'both';
}

export class EnhancedCypherAIService extends CypherAIService {
  private voiceManager: VoiceAIManager;
  private isVoiceEnabled: boolean = true;
  // PERFORMANCE FIX: Audio cache com limite de tamanho para evitar memory leak.
  // Sem limite, buffers de audio acumulam indefinidamente e causam OOM.
  private voiceResponseCache: Map<string, AudioBuffer> = new Map();
  private readonly MAX_VOICE_CACHE_SIZE = 50; // Max 50 cached audio responses
  private lastResponseTime: number = 0;
  private responseQueue: Array<{ text: string; options: VoiceProcessingOptions }> = [];

  /**
   * Limpa entradas antigas do cache de audio quando excede o limite.
   * Evita memory leak em processos de longa duração.
   */
  private pruneVoiceCache(): void {
    if (this.voiceResponseCache.size > this.MAX_VOICE_CACHE_SIZE) {
      // Remove as entradas mais antigas (primeiras inseridas no Map)
      const toDelete = this.voiceResponseCache.size - this.MAX_VOICE_CACHE_SIZE;
      let deleted = 0;
      for (const key of this.voiceResponseCache.keys()) {
        if (deleted >= toDelete) break;
        this.voiceResponseCache.delete(key);
        deleted++;
      }
      console.debug(`[VoiceCache] Pruned ${deleted} entries, size now: ${this.voiceResponseCache.size}`);
    }
  }

  constructor(elevenLabsApiKey?: string) {
    super();
    
    // Initialize voice manager with ElevenLabs integration
    this.voiceManager = new VoiceAIManager(elevenLabsApiKey);
    
  }

  /**
   * Enhanced query processing with voice response capabilities
   */
  async processQueryWithVoice(
    query: string, 
    context: any = {},
    voiceOptions: VoiceProcessingOptions = {}
  ): Promise<VoiceEnabledResponse> {
    const startTime = Date.now();
    
    try {
      // Process query with original CypherAI logic
      const originalResponse = await this.processQuery(query, context);
      
      // Enhance response with voice capabilities
      const enhancedResponse = await this.enhanceResponseForVoice(
        originalResponse,
        query,
        context,
        voiceOptions
      );
      
      // Process voice output if enabled
      if (this.isVoiceEnabled && voiceOptions.enableVoice !== false) {
        await this.processVoiceResponse(enhancedResponse, voiceOptions);
      }
      
      this.lastResponseTime = Date.now() - startTime;
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('🤖 Enhanced Cypher AI error:', error);
      
      // Fallback voice response for errors
      const fallbackResponse = this.getFallbackVoiceResponse(query, context);
      
      if (this.isVoiceEnabled && voiceOptions.enableVoice !== false) {
        await this.processVoiceResponse(fallbackResponse, { ...voiceOptions, emotion: 'warning' });
      }
      
      return fallbackResponse;
    }
  }

  /**
   * Enhance original response with voice-optimized content
   */
  private async enhanceResponseForVoice(
    originalResponse: any,
    query: string,
    context: any,
    voiceOptions: VoiceProcessingOptions
  ): Promise<VoiceEnabledResponse> {
    const voiceResponse = this.optimizeTextForVoice(originalResponse.response || originalResponse);
    const emotion = this.determineEmotionFromContext(originalResponse, query);
    const priority = this.determinePriorityFromContent(originalResponse.response || originalResponse);
    
    return {
      response: originalResponse.response || originalResponse,
      voiceResponse,
      shouldSpeak: true,
      emotion,
      priority,
      action: originalResponse.action,
      insights: originalResponse.insights,
      alerts: originalResponse.alerts,
      marketData: originalResponse.marketData,
      confidence: originalResponse.confidence || 0.9,
      timestamp: new Date().toISOString(),
      personality: 'Enhanced Brazilian Trader with Voice'
    };
  }

  /**
   * Optimize text content specifically for voice synthesis
   */
  private optimizeTextForVoice(text: string): string {
    return text
      // Remove complex markdown that doesn't translate well to speech
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1')     // Italic
      .replace(/#{1,6}\s/g, '')          // Headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
      
      // Replace technical abbreviations with full words
      .replace(/\bSMC\b/g, 'Smart Money Concepts')
      .replace(/\bFVG\b/g, 'Fair Value Gap')
      .replace(/\bBOS\b/g, 'Break of Structure')
      .replace(/\bATH\b/g, 'All Time High')
      .replace(/\bATL\b/g, 'All Time Low')
      .replace(/\bDCA\b/g, 'Dollar Cost Average')
      .replace(/\bROI\b/g, 'Return on Investment')
      .replace(/\bFOMO\b/g, 'Fear of Missing Out')
      .replace(/\bFUD\b/g, 'Fear, Uncertainty and Doubt')
      
      // Convert symbols to spoken words
      .replace(/>/g, ' maior que ')
      .replace(/</g, ' menor que ')
      .replace(/=/g, ' igual a ')
      .replace(/\+/g, ' mais ')
      .replace(/\-/g, ' menos ')
      .replace(/%/g, ' por cento')
      .replace(/\$/g, ' dólares ')
      .replace(/₿/g, ' bitcoin ')
      
      // Break up long sentences for better speech flow
      .replace(/([.!?])\s*([A-Z])/g, '$1 ... $2')
      
      // Add emphasis pauses before important market data
      .replace(/(Bitcoin|BTC|preço|valor)/gi, '... $1')
      
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Determine appropriate emotion based on content and context
   */
  private determineEmotionFromContext(response: any, query: string): string {
    const content = (response.response || response).toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Urgent situations
    if (content.includes('cuidado') || content.includes('perigo') || content.includes('risco alto')) {
      return 'warning';
    }
    
    // Exciting market movements
    if (content.includes('bombando') || content.includes('voando') || content.includes('massa') || 
        content.includes('show de bola') || content.includes('oportunidade')) {
      return 'excited';
    }
    
    // Technical analysis
    if (content.includes('análise') || content.includes('indicador') || content.includes('rsi') || 
        content.includes('macd') || queryLower.includes('análise')) {
      return 'analytical';
    }
    
    // Confident trading advice
    if (content.includes('certeza') || content.includes('garantido') || content.includes('confiança') ||
        content.includes('recomend')) {
      return 'confident';
    }
    
    // Default casual tone
    return 'casual';
  }

  /**
   * Determine response priority for voice queue management
   */
  private determinePriorityFromContent(content: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lowerContent = content.toLowerCase();
    
    // Urgent: Stop loss, emergency alerts
    if (lowerContent.includes('stop loss') || lowerContent.includes('pare') || 
        lowerContent.includes('urgente') || lowerContent.includes('alerta')) {
      return 'urgent';
    }
    
    // High: Real-time market data, trading signals
    if (lowerContent.includes('preço') || lowerContent.includes('sinal') || 
        lowerContent.includes('entrada') || lowerContent.includes('oportunidade')) {
      return 'high';
    }
    
    // Medium: Analysis, explanations
    if (lowerContent.includes('análise') || lowerContent.includes('porque') || 
        lowerContent.includes('explicação')) {
      return 'medium';
    }
    
    // Low: General conversation
    return 'low';
  }

  /**
   * Process voice response with queue management
   */
  private async processVoiceResponse(
    response: VoiceEnabledResponse,
    options: VoiceProcessingOptions
  ): Promise<void> {
    try {
      // PERFORMANCE: Prune voice cache antes de adicionar novos entries
      this.pruneVoiceCache();

      const voiceText = response.voiceResponse || response.response;

      // Split long responses for optimal voice synthesis
      const chunks = this.splitResponseForVoice(voiceText);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkOptions = {
          skipQueue: options.skipQueue || i === 0, // First chunk skips queue for responsiveness
          priority: i === 0 ? response.priority : 'medium' as const,
          emotion: options.emotion || response.emotion,
          interrupt: options.interrupt && i === 0
        };

        // Call processTextToSpeech if it exists
        if (typeof (this.voiceManager as any).processTextToSpeech === 'function') {
          await (this.voiceManager as any).processTextToSpeech(chunk, chunkOptions);
        }

        // Small delay between chunks for natural flow
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error) {
      console.error('🎤 Voice response processing error:', error);
    }
  }

  /**
   * Split long responses into optimal chunks for voice synthesis
   */
  private splitResponseForVoice(text: string, maxLength: number = 400): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const chunks: string[] = [];
    
    // Split by sections marked with double line breaks
    const sections = text.split(/\n\n+/);
    
    let currentChunk = '';
    
    for (const section of sections) {
      if (currentChunk.length + section.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? '\n\n' : '') + section;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        // If section is still too long, split by sentences
        if (section.length > maxLength) {
          const sentences = section.split(/[.!?]+/).filter(s => s.trim());
          let sentenceChunk = '';
          
          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length + 1 <= maxLength) {
              sentenceChunk += (sentenceChunk ? '. ' : '') + sentence.trim();
            } else {
              if (sentenceChunk) {
                chunks.push(sentenceChunk + '.');
              }
              sentenceChunk = sentence.trim();
            }
          }
          
          if (sentenceChunk) {
            currentChunk = sentenceChunk + '.';
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = section;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Get fallback voice response for errors
   */
  private getFallbackVoiceResponse(query: string, context: any): VoiceEnabledResponse {
    const fallbackText = `Eita, deu uma zebra aqui no sistema, mano! 
      Mas relaxa que o Cypher tá aqui pra te ajudar mesmo assim. 
      ${query.toLowerCase().includes('bitcoin') ? 'Bitcoin tá firme e forte!' : ''}
      Reformula tua pergunta que vou te dar uma resposta show de bola!`;
    
    return {
      response: fallbackText,
      voiceResponse: fallbackText,
      shouldSpeak: true,
      emotion: 'casual',
      priority: 'medium',
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      personality: 'Enhanced Brazilian Trader with Voice - Fallback'
    };
  }

  /**
   * Voice command processing with enhanced recognition
   */
  async processVoiceCommand(
    transcript: string,
    context: any = {}
  ): Promise<VoiceEnabledResponse> {
    // Add voice interaction context
    const voiceContext = {
      ...context,
      isVoiceInput: true,
      timestamp: Date.now(),
      inputMethod: 'voice'
    };

    // Update conversation context in voice manager (if method exists)
    if (typeof (this.voiceManager as any).updateContext === 'function') {
      const conversationContext = typeof (this.voiceManager as any).getConversationContext === 'function'
        ? (this.voiceManager as any).getConversationContext()
        : { messageHistory: [] };

      (this.voiceManager as any).updateContext({
        lastInteraction: Date.now(),
        messageHistory: [
          ...(conversationContext.messageHistory || []),
          { role: 'user', content: transcript, timestamp: Date.now() }
        ]
      });
    }

    // Process with voice-optimized options
    return await this.processQueryWithVoice(transcript, voiceContext, {
      enableVoice: true,
      priority: 'high', // Voice commands get high priority
      interrupt: false // Don't interrupt ongoing speech unless urgent
    });
  }

  /**
   * Quick voice response for immediate feedback
   */
  async quickVoiceResponse(
    text: string,
    emotion: string = 'casual',
    interrupt: boolean = false
  ): Promise<void> {
    if (!this.isVoiceEnabled) return;

    const optimizedText = this.optimizeTextForVoice(text);

    if (typeof (this.voiceManager as any).processTextToSpeech === 'function') {
      await (this.voiceManager as any).processTextToSpeech(optimizedText, {
        priority: 'urgent',
        emotion,
        interrupt,
        skipQueue: true
      });
    }
  }

  /**
   * Start voice listening
   */
  async startListening(): Promise<boolean> {
    if (typeof (this.voiceManager as any).startListening === 'function') {
      return await (this.voiceManager as any).startListening();
    }
    return false;
  }

  /**
   * Stop voice listening
   */
  stopListening(): void {
    if (typeof (this.voiceManager as any).stopListening === 'function') {
      (this.voiceManager as any).stopListening();
    }
  }

  /**
   * Stop voice output
   */
  stopSpeaking(): void {
    if (typeof (this.voiceManager as any).stopSpeaking === 'function') {
      (this.voiceManager as any).stopSpeaking();
    }
  }

  /**
   * Toggle voice enabled state
   */
  toggleVoice(): boolean {
    this.isVoiceEnabled = !this.isVoiceEnabled;
    
    if (!this.isVoiceEnabled) {
      this.stopSpeaking();
    }
    
    return this.isVoiceEnabled;
  }

  /**
   * Get current voice state
   */
  getVoiceState(): {
    isEnabled: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    queueLength: number;
    lastResponseTime: number;
  } {
    const voiceState = typeof (this.voiceManager as any).getVoiceState === 'function'
      ? (this.voiceManager as any).getVoiceState()
      : { isListening: false, isSpeaking: false, queueLength: 0 };

    return {
      isEnabled: this.isVoiceEnabled,
      isListening: voiceState.isListening || false,
      isSpeaking: voiceState.isSpeaking || false,
      queueLength: voiceState.queueLength || 0,
      lastResponseTime: this.lastResponseTime
    };
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(settings: {
    emotion?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    enableVoice?: boolean;
  }): void {
    if (settings.enableVoice !== undefined) {
      this.isVoiceEnabled = settings.enableVoice;
    }
    
  }

  /**
   * Get voice performance metrics
   */
  getVoiceMetrics(): any {
    const voiceState = typeof (this.voiceManager as any).getVoiceState === 'function'
      ? (this.voiceManager as any).getVoiceState()
      : {};
    return voiceState.metrics || {};
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (typeof (this.voiceManager as any).destroy === 'function') {
      (this.voiceManager as any).destroy();
    }
    this.voiceResponseCache.clear();
  }
}

export default EnhancedCypherAIService;