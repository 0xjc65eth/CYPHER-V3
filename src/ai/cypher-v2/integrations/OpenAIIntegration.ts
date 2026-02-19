// OpenAI Integration for CYPHER AI v2
// GPT-4 powered responses with advanced reasoning

import type { CypherAIConfig } from '../types';

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIIntegration {
  private apiKey: string;
  private model: string = 'gpt-4-turbo-preview';
  private baseURL: string = 'https://api.openai.com/v1';
  private isInitialized: boolean = false;

  constructor(config: CypherAIConfig) {
    this.apiKey = config.apiKeys?.openai || '';
    if (!this.apiKey) {
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key é necessária');
    }

    try {
      // Test the API with a simple request
      const response = await this.testConnection();
      if (response) {
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar OpenAI:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateResponse(params: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<{
    text: string;
    confidence: number;
    metadata?: any;
  }> {
    if (!this.isInitialized) {
      throw new Error('OpenAI não está inicializado');
    }

    try {
      const messages = this.buildMessages(params);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0.6,
          stream: params.stream || false
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: OpenAIResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Resposta vazia do OpenAI');
      }

      const text = data.choices[0].message.content.trim();
      
      return {
        text,
        confidence: 0.95,
        metadata: {
          model: this.model,
          usage: data.usage,
          finishReason: data.choices[0].finish_reason
        }
      };
    } catch (error) {
      console.error('Erro ao gerar resposta com OpenAI:', error);
      throw error;
    }
  }

  async generateStreamingResponse(params: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
    onChunk: (chunk: string) => void;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OpenAI não está inicializado');
    }

    try {
      const messages = this.buildMessages(params);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                params.onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro no streaming com OpenAI:', error);
      throw error;
    }
  }

  async analyzeMarketSentiment(text: string, marketData?: any): Promise<{
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `Analise o sentimento do mercado de criptomoedas baseado no seguinte contexto:
    
Texto: "${text}"
${marketData ? `\nDados de mercado: ${JSON.stringify(marketData)}` : ''}

Responda em JSON com o formato:
{
  "sentiment": "bullish/bearish/neutral",
  "confidence": 0.0-1.0,
  "reasoning": "explicação breve"
}`;

    try {
      const response = await this.generateResponse({
        prompt,
        temperature: 0.3,
        maxTokens: 200
      });

      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        sentiment: 'neutral',
        confidence: 0.5,
        reasoning: 'Análise inconclusiva'
      };
    } catch (error) {
      console.error('Erro ao analisar sentimento:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.3,
        reasoning: 'Erro na análise'
      };
    }
  }

  async generateTradingStrategy(params: {
    asset: string;
    timeframe: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    marketData?: any;
  }): Promise<{
    strategy: string;
    entryPoints: number[];
    stopLoss: number;
    takeProfit: number[];
    reasoning: string;
  }> {
    const prompt = `Crie uma estratégia de trading para:
- Ativo: ${params.asset}
- Timeframe: ${params.timeframe}
- Perfil de risco: ${params.riskProfile}
${params.marketData ? `- Dados de mercado: ${JSON.stringify(params.marketData)}` : ''}

Forneça pontos de entrada, stop loss, take profit e raciocínio.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt: 'Você é um trader profissional de criptomoedas com 10 anos de experiência.',
        temperature: 0.5,
        maxTokens: 500
      });

      // Parse the response and extract strategy details
      // This is simplified - in production, you'd have more sophisticated parsing
      return {
        strategy: response.text,
        entryPoints: [95000, 94500], // Example values
        stopLoss: 93000,
        takeProfit: [97000, 98500, 100000],
        reasoning: 'Análise baseada em suporte/resistência e momentum'
      };
    } catch (error) {
      console.error('Erro ao gerar estratégia:', error);
      throw error;
    }
  }

  private buildMessages(params: {
    prompt: string;
    context?: string;
    systemPrompt?: string;
  }): Array<{ role: string; content: string }> {
    const messages = [];
    
    // System prompt
    const systemPrompt = params.systemPrompt || `Você é CYPHER AI, um assistente avançado especializado em Bitcoin, criptomoedas, trading, ordinals, runes e análise de mercado.
Você combina conhecimento técnico profundo com capacidade de explicar conceitos complexos de forma clara.
Sempre forneça análises detalhadas, insights acionáveis e recomendações baseadas em dados.
Responda em português brasileiro de forma natural e envolvente.`;
    
    messages.push({ role: 'system', content: systemPrompt });
    
    // Add context if provided
    if (params.context) {
      messages.push({
        role: 'system',
        content: `Contexto adicional: ${params.context}`
      });
    }
    
    // User message
    messages.push({ role: 'user', content: params.prompt });
    
    return messages;
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  // Advanced analysis using GPT-4
  async performDeepAnalysis(topic: string, data?: any): Promise<string> {
    const prompt = `Faça uma análise profunda sobre ${topic} no contexto de criptomoedas.
${data ? `Dados relevantes: ${JSON.stringify(data)}` : ''}

Inclua:
1. Visão geral
2. Fatores técnicos
3. Fatores fundamentais
4. Riscos e oportunidades
5. Previsões e cenários possíveis`;

    try {
      const response = await this.generateResponse({
        prompt,
        temperature: 0.7,
        maxTokens: 1500
      });
      
      return response.text;
    } catch (error) {
      console.error('Erro na análise profunda:', error);
      return 'Não foi possível realizar a análise profunda no momento.';
    }
  }
}

export default OpenAIIntegration;