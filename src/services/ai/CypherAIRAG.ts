/**
 * Cypher AI RAG (Retrieval-Augmented Generation) System
 * Advanced multimodal AI with persistent memory and Brazilian Portuguese personality
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';

// AI System Types
export interface CypherAIConfig {
  openaiApiKey: string;
  geminiApiKey: string;
  elevenLabsApiKey: string;
  pineconeApiKey: string;
  pineconeEnvironment: string;
  pineconeIndex: string;
  personality: AIPersonality;
  capabilities: AICapabilities;
}

export interface AIPersonality {
  name: string;
  language: 'pt-BR' | 'en-US';
  traits: string[];
  speakingStyle: {
    formality: 'informal' | 'neutral' | 'formal';
    humor: boolean;
    emojis: boolean;
    slang: boolean;
    technicalLevel: 'beginner' | 'intermediate' | 'expert';
  };
  catchPhrases: string[];
  specializations: string[];
}

export interface AICapabilities {
  textGeneration: boolean;
  imageAnalysis: boolean;
  voiceInteraction: boolean;
  codeGeneration: boolean;
  marketAnalysis: boolean;
  portfolioAdvice: boolean;
  technicalAnalysis: boolean;
  riskAssessment: boolean;
  sentimentAnalysis: boolean;
  documentAnalysis: boolean;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  history: Message[];
  metadata: {
    userProfile?: UserProfile;
    currentPortfolio?: any;
    marketContext?: any;
    preferences?: any;
  };
  activeTools: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    entities?: Record<string, any>;
    sentiment?: number;
    language?: string;
    audioUrl?: string;
    imageUrls?: string[];
    citations?: Citation[];
  };
}

export interface Citation {
  source: string;
  title: string;
  excerpt: string;
  url?: string;
  relevance: number;
}

export interface UserProfile {
  id: string;
  name: string;
  experience: 'beginner' | 'intermediate' | 'expert';
  interests: string[];
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  preferredLanguage: string;
  timezone: string;
  tradingGoals: string[];
}

export interface KnowledgeDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'market_data' | 'technical_analysis' | 'news' | 'research' | 'user_data';
    timestamp: number;
    tags: string[];
    relevance: number;
  };
  embeddings?: number[];
}

export interface MultimodalInput {
  text?: string;
  audio?: Buffer | File;
  images?: Array<Buffer | File | string>;
  documents?: Array<Buffer | File>;
}

export interface AIResponse {
  text: string;
  audioUrl?: string;
  visualizations?: any[];
  suggestions?: string[];
  citations?: Citation[];
  confidence: number;
  intent: string;
  emotion: string;
  followUpQuestions?: string[];
}

export class CypherAIRAG extends EventEmitter {
  private config: CypherAIConfig;
  private openai: OpenAI;
  private pinecone: Pinecone;
  private logger: EnhancedLogger;
  private textSplitter: RecursiveCharacterTextSplitter;
  private conversations: Map<string, ConversationContext> = new Map();
  private knowledgeBase: Map<string, KnowledgeDocument> = new Map();
  private isInitialized: boolean = false;

  // Brazilian Portuguese personality
  private readonly brazilianSlang = [
    'Fala, meu consagrado! 🤙',
    'Bora que bora! 🚀',
    'Tá ligado né? 📈',
    'Isso aí, mano! 💪',
    'Partiu ganhar uma grana! 💰',
    'Tá bombando! 🔥',
    'Sucesso, fera! 🎯',
    'É nóis! 🤝',
    'Fechou! ✅',
    'Tá osso, mas vamo que vamo! 💎'
  ];

  private readonly marketEmojis = {
    bullish: '🚀📈🔥💚🐂',
    bearish: '📉🔴🐻❌💔',
    neutral: '➡️🤔💭⚖️😐',
    alert: '⚠️🚨📢⏰🔔',
    money: '💰💸💵🤑💎',
    chart: '📊📈📉💹📱',
    success: '✅🎯🏆🥇⭐',
    thinking: '🤔💭🧠💡🔍'
  };

  constructor(config: CypherAIConfig) {
    super();
    this.config = config;
    this.logger = new EnhancedLogger();
    
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey,
      environment: config.pineconeEnvironment
    });

    // Initialize text splitter for RAG
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });

    this.logger.info('Cypher AI RAG system initialized', {
      component: 'CypherAIRAG',
      personality: config.personality.name,
      language: config.personality.language
    });
  }

  /**
   * Initialize the AI system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Pinecone index
      const index = this.pinecone.index(this.config.pineconeIndex);
      
      // Load initial knowledge base
      await this.loadKnowledgeBase();
      
      // Test connections
      await this.testConnections();
      
      this.isInitialized = true;
      this.logger.info('Cypher AI RAG fully initialized');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Cypher AI RAG:');
      throw error;
    }
  }

  /**
   * Process multimodal input and generate response
   */
  async processInput(
    input: MultimodalInput,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      // Extract and analyze all modalities
      const analysis = await this.analyzeMultimodalInput(input);
      
      // Retrieve relevant context from knowledge base
      const relevantDocs = await this.retrieveRelevantDocuments(analysis.query, 5);
      
      // Enhance context with retrieved information
      const enhancedContext = this.enhanceContext(context, relevantDocs, analysis);
      
      // Generate response using RAG
      const response = await this.generateResponse(enhancedContext, analysis);
      
      // Add to conversation history
      this.updateConversation(context, input, response);
      
      // Store interaction in knowledge base
      await this.storeInteraction(context, input, response);
      
      return response;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Error processing input:');
      throw error;
    }
  }

  /**
   * Process text input with Brazilian personality
   */
  async processTextInput(
    text: string,
    userId: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const context = this.getOrCreateContext(userId, sessionId);
    
    return this.processInput({ text }, context);
  }

  /**
   * Process voice input
   */
  async processVoiceInput(
    audio: Buffer | File,
    userId: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const context = this.getOrCreateContext(userId, sessionId);
    
    // Transcribe audio
    const transcription = await this.transcribeAudio(audio);
    
    // Process as text with audio metadata
    const response = await this.processInput({ 
      text: transcription.text,
      audio 
    }, context);
    
    // Generate voice response
    if (this.config.capabilities.voiceInteraction) {
      response.audioUrl = await this.generateVoiceResponse(response.text);
    }
    
    return response;
  }

  /**
   * Process image input for analysis
   */
  async processImageInput(
    images: Array<Buffer | File | string>,
    text: string,
    userId: string,
    sessionId?: string
  ): Promise<AIResponse> {
    const context = this.getOrCreateContext(userId, sessionId);
    
    return this.processInput({ text, images }, context);
  }

  /**
   * Add documents to knowledge base
   */
  async addToKnowledgeBase(
    documents: Array<{
      content: string;
      metadata: {
        source: string;
        type: string;
        tags: string[];
      };
    }>
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex);
      
      for (const doc of documents) {
        // Split document into chunks
        const chunks = await (this.textSplitter as any).createDocuments(
          [doc.content],
          [doc.metadata]
        );
        
        // Generate embeddings for each chunk
        const embeddings = await this.generateEmbeddings(
          chunks.map((chunk: any) => chunk.pageContent)
        );

        // Store in Pinecone
        const vectors = chunks.map((chunk: any, i: number) => ({
          id: `doc-${Date.now()}-${i}`,
          values: embeddings[i],
          metadata: {
            ...chunk.metadata,
            content: chunk.pageContent,
            timestamp: Date.now()
          }
        }));
        
        await index.upsert(vectors);
        
        // Store in local knowledge base
        vectors.forEach((vector: any) => {
          this.knowledgeBase.set(vector.id, {
            id: vector.id,
            content: vector.metadata.content,
            metadata: vector.metadata as any,
            embeddings: vector.values
          });
        });
      }
      
      this.logger.info('Added documents to knowledge base', { count: documents.length });

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to add to knowledge base:');
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(userId: string, sessionId?: string): Message[] {
    const context = this.conversations.get(this.getContextKey(userId, sessionId));
    return context?.history || [];
  }

  /**
   * Clear conversation history
   */
  clearConversation(userId: string, sessionId?: string): void {
    const key = this.getContextKey(userId, sessionId);
    this.conversations.delete(key);
  }

  /**
   * Private methods
   */

  private async analyzeMultimodalInput(input: MultimodalInput): Promise<{
    query: string;
    intent: string;
    entities: Record<string, any>;
    sentiment: number;
    modalities: string[];
  }> {
    const modalities: string[] = [];
    let combinedQuery = input.text || '';
    
    if (input.text) modalities.push('text');
    if (input.audio) modalities.push('audio');
    if (input.images) modalities.push('image');
    if (input.documents) modalities.push('document');
    
    // Analyze images if present
    if (input.images && input.images.length > 0) {
      const imageAnalysis = await this.analyzeImages(input.images);
      combinedQuery += ` [Image context: ${imageAnalysis}]`;
    }
    
    // Analyze intent and entities
    const nlpAnalysis = await this.analyzeText(combinedQuery);
    
    return {
      query: combinedQuery,
      intent: nlpAnalysis.intent,
      entities: nlpAnalysis.entities,
      sentiment: nlpAnalysis.sentiment,
      modalities
    };
  }

  private async retrieveRelevantDocuments(
    query: string,
    topK: number = 5
  ): Promise<KnowledgeDocument[]> {
    try {
      const index = this.pinecone.index(this.config.pineconeIndex);
      
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search in Pinecone
      const results = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      });
      
      // Convert to KnowledgeDocument format
      const documents: KnowledgeDocument[] = results.matches?.map((match: any) => ({
        id: match.id,
        content: match.metadata?.content as string || '',
        metadata: {
          source: match.metadata?.source as string || '',
          type: match.metadata?.type as any || 'general',
          timestamp: match.metadata?.timestamp as number || Date.now(),
          tags: match.metadata?.tags as string[] || [],
          relevance: match.score || 0
        }
      })) || [];
      
      return documents;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to retrieve documents:');
      return [];
    }
  }

  private enhanceContext(
    context: ConversationContext,
    documents: KnowledgeDocument[],
    analysis: any
  ): any {
    return {
      ...context,
      retrievedDocuments: documents,
      analysis,
      systemPrompt: this.buildSystemPrompt(context, documents)
    };
  }

  private buildSystemPrompt(context: ConversationContext, documents: KnowledgeDocument[]): string {
    const personality = this.config.personality;
    const relevantInfo = documents.map(doc => doc.content).join('\n\n');
    
    let prompt = `Você é ${personality.name}, um assistente de trading de criptomoedas especializado em Bitcoin, Ordinals e Runes.\n\n`;
    
    if (personality.language === 'pt-BR') {
      prompt += `PERSONALIDADE:
- Fale em português brasileiro informal e amigável
- Use gírias como: ${this.brazilianSlang.slice(0, 5).join(', ')}
- ${personality.speakingStyle.emojis ? 'Use emojis relevantes' : 'Evite emojis'}
- ${personality.speakingStyle.humor ? 'Seja bem-humorado' : 'Mantenha tom profissional'}
- Nível técnico: ${(personality as any).technicalLevel === 'expert' ? 'avançado' : (personality as any).technicalLevel === 'intermediate' ? 'intermediário' : 'iniciante'}

ESPECIALIZAÇÕES:
${personality.specializations.join(', ')}

INFORMAÇÕES RELEVANTES DO CONTEXTO:
${relevantInfo}

HISTÓRICO RECENTE:
${context.history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

INSTRUÇÕES:
- Sempre forneça análises precisas e atualizadas
- Cite fontes quando usar informações específicas
- Sugira ações práticas quando apropriado
- Mantenha o tom ${personality.speakingStyle.formality}
- ${personality.speakingStyle.slang ? 'Use gírias do mercado crypto' : 'Evite jargões excessivos'}`;
    }
    
    return prompt;
  }

  private async generateResponse(
    enhancedContext: any,
    analysis: any
  ): Promise<AIResponse> {
    try {
      // Prepare messages for GPT
      const messages = [
        { role: 'system' as const, content: enhancedContext.systemPrompt },
        ...enhancedContext.history.map((msg: Message) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content: analysis.query }
      ];
      
      // Generate response with GPT-4
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });
      
      const responseText = completion.choices[0].message.content || '';
      
      // Extract citations from retrieved documents
      const citations = this.extractCitations(responseText, enhancedContext.retrievedDocuments);
      
      // Determine emotion and confidence
      const emotion = this.detectEmotion(responseText);
      const confidence = this.calculateConfidence(enhancedContext.retrievedDocuments);
      
      // Generate follow-up questions
      const followUpQuestions = await this.generateFollowUpQuestions(
        analysis.intent,
        enhancedContext
      );
      
      // Add personality touches
      const personalizedResponse = this.addPersonalityTouches(responseText, emotion);
      
      return {
        text: personalizedResponse,
        citations,
        confidence,
        intent: analysis.intent,
        emotion,
        followUpQuestions,
        suggestions: this.extractSuggestions(responseText)
      };

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to generate response:');
      
      // Fallback response
      return {
        text: this.getFallbackResponse(),
        confidence: 0,
        intent: 'error',
        emotion: 'apologetic',
        suggestions: ['Tente reformular sua pergunta', 'Peça informações mais específicas']
      };
    }
  }

  private addPersonalityTouches(text: string, emotion: string): string {
    let response = text;
    
    // Add greeting if appropriate
    if (!response.startsWith('Fala') && Math.random() > 0.7) {
      response = `${this.brazilianSlang[Math.floor(Math.random() * this.brazilianSlang.length)]} ${response}`;
    }
    
    // Add emojis based on emotion
    if (this.config.personality.speakingStyle.emojis) {
      const emojiMap: Record<string, string> = {
        'excited': '🚀🔥',
        'happy': '😊✨',
        'analytical': '📊🧠',
        'warning': '⚠️👀',
        'encouraging': '💪🎯'
      };
      
      const emojis = emojiMap[emotion] || '💡';
      response = response.replace(/\./g, (match, offset, string) => {
        // Add emoji to some sentence endings
        return offset === string.lastIndexOf('.') || Math.random() > 0.7 
          ? `. ${emojis.charAt(Math.floor(Math.random() * emojis.length))}` 
          : '.';
      });
    }
    
    // Add catchphrase occasionally
    if (Math.random() > 0.8 && this.config.personality.catchPhrases.length > 0) {
      const catchphrase = this.config.personality.catchPhrases[
        Math.floor(Math.random() * this.config.personality.catchPhrases.length)
      ];
      response += `\n\n${catchphrase}`;
    }
    
    return response;
  }

  private async transcribeAudio(audio: Buffer | File): Promise<{ text: string }> {
    try {
      const audioFile = audio instanceof Buffer 
        ? new File([audio], 'audio.mp3', { type: 'audio/mp3' })
        : audio;
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile as any,
        model: 'whisper-1',
        language: 'pt'
      });
      
      return { text: transcription.text };

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to transcribe audio:');
      throw error;
    }
  }

  private async generateVoiceResponse(text: string): Promise<string> {
    try {
      // Use ElevenLabs API to generate voice
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/voice-id', {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });
      
      const audioBuffer = await response.arrayBuffer();
      // In production, upload to cloud storage and return URL
      return `data:audio/mp3;base64,${Buffer.from(audioBuffer).toString('base64')}`;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to generate voice response:');
      return '';
    }
  }

  private async analyzeImages(images: Array<Buffer | File | string>): Promise<string> {
    try {
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          if (typeof image === 'string') return image;
          // In production, upload to cloud storage
          return 'data:image/jpeg;base64,xxx';
        })
      );
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze these images and describe what you see, focusing on any charts, data, or relevant information.' },
              ...imageUrls.map(url => ({ type: 'image_url' as const, image_url: { url } }))
            ]
          }
        ],
        max_tokens: 300
      });
      
      return response.choices[0].message.content || 'Unable to analyze images';

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to analyze images:');
      return 'Image analysis failed';
    }
  }

  private async analyzeText(text: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    sentiment: number;
  }> {
    // Simplified NLP analysis - in production would use more sophisticated NLP
    const intents = {
      'preço': 'price_query',
      'comprar': 'buy_intent',
      'vender': 'sell_intent',
      'análise': 'analysis_request',
      'portfolio': 'portfolio_query',
      'risco': 'risk_assessment',
      'notícias': 'news_query',
      'ajuda': 'help_request'
    };
    
    let detectedIntent = 'general_query';
    for (const [keyword, intent] of Object.entries(intents)) {
      if (text.toLowerCase().includes(keyword)) {
        detectedIntent = intent;
        break;
      }
    }
    
    // Extract entities (simplified)
    const entities: Record<string, any> = {};
    
    // Extract crypto symbols
    const cryptoRegex = /\b(BTC|ETH|SOL|ORDI|RUNE)\b/gi;
    const matches = text.match(cryptoRegex);
    if (matches) {
      entities.cryptocurrencies = matches.map(m => m.toUpperCase());
    }
    
    // Extract numbers
    const numberRegex = /\b\d+\.?\d*\b/g;
    const numbers = text.match(numberRegex);
    if (numbers) {
      entities.amounts = numbers.map(n => parseFloat(n));
    }
    
    // Simple sentiment analysis
    const positiveWords = ['bom', 'ótimo', 'excelente', 'alta', 'subir', 'ganhar'];
    const negativeWords = ['ruim', 'péssimo', 'queda', 'perder', 'cair', 'baixa'];
    
    let sentiment = 0;
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (positiveWords.includes(word)) sentiment += 0.2;
      if (negativeWords.includes(word)) sentiment -= 0.2;
    });
    
    sentiment = Math.max(-1, Math.min(1, sentiment));
    
    return { intent: detectedIntent, entities, sentiment };
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts
      });
      
      return response.data.map(item => item.embedding);

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to generate embeddings:');
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  private extractCitations(text: string, documents: KnowledgeDocument[]): Citation[] {
    // Simple citation extraction - in production would be more sophisticated
    return documents
      .filter(doc => doc.metadata.relevance > 0.7)
      .slice(0, 3)
      .map(doc => ({
        source: doc.metadata.source,
        title: doc.metadata.tags.join(', '),
        excerpt: doc.content.substring(0, 100) + '...',
        relevance: doc.metadata.relevance
      }));
  }

  private detectEmotion(text: string): string {
    // Simple emotion detection
    if (text.includes('🚀') || text.includes('bombando')) return 'excited';
    if (text.includes('⚠️') || text.includes('cuidado')) return 'warning';
    if (text.includes('📊') || text.includes('análise')) return 'analytical';
    if (text.includes('💪') || text.includes('vamo que vamo')) return 'encouraging';
    return 'neutral';
  }

  private calculateConfidence(documents: KnowledgeDocument[]): number {
    if (documents.length === 0) return 0.3;
    
    const avgRelevance = documents.reduce((sum, doc) => sum + doc.metadata.relevance, 0) / documents.length;
    const recency = documents.filter(doc => 
      Date.now() - doc.metadata.timestamp < 24 * 60 * 60 * 1000 // Less than 24h old
    ).length / documents.length;
    
    return Math.min(0.95, avgRelevance * 0.7 + recency * 0.3);
  }

  private async generateFollowUpQuestions(intent: string, context: any): Promise<string[]> {
    const questionMap: Record<string, string[]> = {
      'price_query': [
        'Quer ver a análise técnica desse ativo?',
        'Interessado em saber sobre o volume de negociação?',
        'Gostaria de configurar um alerta de preço?'
      ],
      'buy_intent': [
        'Qual valor você pretende investir?',
        'Quer ver uma análise de risco primeiro?',
        'Prefere ordem a mercado ou limitada?'
      ],
      'portfolio_query': [
        'Quer ver recomendações de rebalanceamento?',
        'Interessado em análise de performance?',
        'Gostaria de comparar com benchmarks?'
      ],
      'analysis_request': [
        'Quer incluir indicadores técnicos específicos?',
        'Interessado em análise de sentimento do mercado?',
        'Gostaria de ver projeções de preço?'
      ]
    };
    
    return questionMap[intent] || [
      'Posso ajudar com mais alguma coisa?',
      'Quer saber sobre outro ativo?',
      'Interessado em ver as últimas notícias do mercado?'
    ];
  }

  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    
    // Extract action items from response
    const actionPhrases = [
      /sugiro (.*?)(?:\.|,|$)/gi,
      /recomendo (.*?)(?:\.|,|$)/gi,
      /você pode (.*?)(?:\.|,|$)/gi,
      /seria bom (.*?)(?:\.|,|$)/gi
    ];
    
    actionPhrases.forEach(regex => {
      const matches = text.matchAll(regex);
      for (const match of matches) {
        if (match[1]) {
          suggestions.push(match[1].trim());
        }
      }
    });
    
    return suggestions.slice(0, 3);
  }

  private getFallbackResponse(): string {
    const responses = [
      'Poxa, tive um probleminha aqui. Pode tentar de novo? 🤔',
      'Ops, algo deu errado. Que tal reformular a pergunta? 😅',
      'Xiii, bugou aqui. Tenta de novo aí, por favor! 🛠️',
      'Desculpa, mano! Tive uma falha técnica. Bora tentar de novo? 💪'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getOrCreateContext(userId: string, sessionId?: string): ConversationContext {
    const key = this.getContextKey(userId, sessionId);
    
    if (!this.conversations.has(key)) {
      this.conversations.set(key, {
        userId,
        sessionId: sessionId || `session-${Date.now()}`,
        history: [],
        metadata: {},
        activeTools: []
      });
    }
    
    return this.conversations.get(key)!;
  }

  private getContextKey(userId: string, sessionId?: string): string {
    return `${userId}-${sessionId || 'default'}`;
  }

  private updateConversation(
    context: ConversationContext,
    input: MultimodalInput,
    response: AIResponse
  ): void {
    // Add user message
    context.history.push({
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input.text || '[Multimodal input]',
      timestamp: Date.now(),
      metadata: {
        audioUrl: input.audio ? '[Audio attached]' : undefined,
        imageUrls: input.images ? ['[Images attached]'] : undefined
      }
    });
    
    // Add assistant response
    context.history.push({
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: response.text,
      timestamp: Date.now(),
      metadata: {
        intent: response.intent,
        sentiment: response.confidence,
        citations: response.citations,
        audioUrl: response.audioUrl
      }
    });
    
    // Keep only last 20 messages
    if (context.history.length > 20) {
      context.history = context.history.slice(-20);
    }
  }

  private async storeInteraction(
    context: ConversationContext,
    input: MultimodalInput,
    response: AIResponse
  ): Promise<void> {
    try {
      const interactionDoc = {
        content: `User: ${input.text || '[Multimodal]'}\nAssistant: ${response.text}`,
        metadata: {
          source: 'user_interaction',
          type: 'conversation' as const,
          userId: context.userId,
          sessionId: context.sessionId,
          intent: response.intent,
          timestamp: Date.now(),
          tags: ['interaction', response.intent, context.userId]
        }
      };
      
      await this.addToKnowledgeBase([interactionDoc]);

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to store interaction:');
    }
  }

  private async loadKnowledgeBase(): Promise<void> {
    // Load initial knowledge base documents
    const initialDocs = [
      {
        content: 'Bitcoin é a primeira e mais valiosa criptomoeda, criada em 2009. É descentralizada e usa blockchain.',
        metadata: { source: 'system', type: 'crypto_basics' as const, tags: ['bitcoin', 'crypto', 'blockchain'] }
      },
      {
        content: 'Ordinals são inscrições digitais no blockchain do Bitcoin, permitindo NFTs nativos na rede Bitcoin.',
        metadata: { source: 'system', type: 'crypto_basics' as const, tags: ['ordinals', 'nft', 'bitcoin'] }
      },
      {
        content: 'Runes são tokens fungíveis no Bitcoin, oferecendo uma alternativa eficiente aos BRC-20.',
        metadata: { source: 'system', type: 'crypto_basics' as const, tags: ['runes', 'tokens', 'bitcoin'] }
      }
    ];
    
    await this.addToKnowledgeBase(initialDocs);
  }

  private async testConnections(): Promise<void> {
    // Test OpenAI
    await this.openai.models.list();
    
    // Test Pinecone
    await (this.pinecone as any).describeIndex(this.config.pineconeIndex);
    
    this.logger.info('All AI connections tested successfully');
  }
}

// Export factory function
export const createCypherAIRAG = (config: CypherAIConfig): CypherAIRAG => {
  return new CypherAIRAG(config);
};