// Google Gemini API Integration for CYPHER AI v2
// Advanced natural language understanding and generation

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CypherAIConfig } from '../types';

export class GeminiIntegration {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private config: CypherAIConfig;
  private isInitialized: boolean = false;

  constructor(config: CypherAIConfig) {
    this.config = config;
    if (!config.apiKeys?.gemini) {
    }
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKeys?.gemini) {
      throw new Error('Gemini API key é necessária');
    }

    try {
      // Initialize Gemini AI
      this.genAI = new GoogleGenerativeAI(this.config.apiKeys.gemini);
      this.model = this.genAI?.getGenerativeModel({ model: 'gemini-pro' });
      
      // Test the connection
      const result = await this.model?.generateContent('Hello');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar Gemini:', error);
      throw error;
    }
  }

  async generateResponse(params: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    text: string;
    confidence: number;
    metadata?: any;
  }> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini não está inicializado');
    }

    try {
      // Build enhanced prompt with context
      const fullPrompt = this.buildPrompt(params);
      
      // Generate response
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: params.temperature || 0.8,
          topK: 1,
          topP: 1,
          maxOutputTokens: params.maxTokens || 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      });

      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('Resposta vazia do Gemini');
      }

      return {
        text: text.trim(),
        confidence: 0.95, // Gemini Pro tem alta confiança
        metadata: {
          model: 'gemini-pro',
          promptTokens: fullPrompt.length / 4, // Estimativa
          completionTokens: text.length / 4
        }
      };
    } catch (error) {
      console.error('Erro ao gerar resposta com Gemini:', error);
      throw error;
    }
  }

  async analyzeIntent(text: string): Promise<{
    intent: string;
    entities: any[];
    confidence: number;
  }> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini não está inicializado');
    }

    const prompt = `Analise a seguinte mensagem e extraia a intenção principal e entidades:
    
Mensagem: "${text}"

Responda em JSON com o seguinte formato:
{
  "intent": "nome_da_intencao",
  "entities": [
    {"type": "tipo", "value": "valor"}
  ],
  "confidence": 0.95
}

Intents possíveis: greeting, price_query, market_analysis, portfolio_check, trading_advice, technical_analysis, ordinals_query, runes_query, mining_info, general_question

Entities possíveis: cryptocurrency, time_period, price_target, indicator, action`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback
      return {
        intent: 'general_question',
        entities: [],
        confidence: 0.5
      };
    } catch (error) {
      console.error('Erro ao analisar intent com Gemini:', error);
      return {
        intent: 'general_question',
        entities: [],
        confidence: 0.3
      };
    }
  }

  async generateStreamingResponse(params: {
    prompt: string;
    context?: string;
    onChunk: (chunk: string) => void;
  }): Promise<void> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini não está inicializado');
    }

    try {
      const fullPrompt = this.buildPrompt(params);
      
      // Generate streaming response
      const result = await this.model.generateContentStream(fullPrompt);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          params.onChunk(chunkText);
        }
      }
    } catch (error) {
      console.error('Erro no streaming com Gemini:', error);
      throw error;
    }
  }

  private buildPrompt(params: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
  }): string {
    let fullPrompt = '';
    
    // Add system prompt if provided
    if (params.systemPrompt) {
      fullPrompt += `${params.systemPrompt}\n\n`;
    } else {
      // Default system prompt for CYPHER AI
      fullPrompt += `Você é CYPHER AI, um assistente avançado especializado em Bitcoin, criptomoedas, trading, ordinals, runes e análise de mercado. 
Você deve fornecer análises detalhadas, insights profundos e recomendações baseadas em dados.
Sempre seja preciso, profissional e útil. Use dados de mercado quando disponível.
Responda em português brasileiro.\n\n`;
    }
    
    // Add context if provided
    if (params.context) {
      fullPrompt += `Contexto:\n${params.context}\n\n`;
    }
    
    // Add user prompt
    fullPrompt += `Usuário: ${params.prompt}\n\nAssistente:`;
    
    return fullPrompt;
  }

  // Helper method to analyze sentiment
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini não está inicializado');
    }

    const prompt = `Analise o sentimento do seguinte texto e responda apenas com: positive, negative ou neutral.
    
Texto: "${text}"

Sentimento:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const sentiment = response.text().trim().toLowerCase();
      
      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        return {
          sentiment: sentiment as 'positive' | 'negative' | 'neutral',
          confidence: 0.9
        };
      }
      
      return { sentiment: 'neutral', confidence: 0.5 };
    } catch (error) {
      console.error('Erro ao analisar sentimento:', error);
      return { sentiment: 'neutral', confidence: 0.3 };
    }
  }

  // Check if Gemini is available
  isAvailable(): boolean {
    return this.isInitialized && this.model !== null;
  }
}

export default GeminiIntegration;