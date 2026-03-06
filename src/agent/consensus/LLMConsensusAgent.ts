/**
 * CYPHER AI Trading Agent - LLM Consensus Agent
 * Uses Gemini (primary) or any OpenAI-compatible API as fallback.
 * Rate-limited: max 1 call per pair per 5 minutes
 */

import { ConsensusVote, Candle, SMCContext } from '../core/types';

interface LLMMarketContext {
  pair: string;
  currentPrice: number;
  change24h: number;
  change7d: number;
  technicalSummary: string;
  sentimentSummary: string;
  smcSummary: string;
  recentCandles: { open: number; close: number; high: number; low: number }[];
  volume24h: number;
}

interface LLMResponse {
  direction: 'long' | 'short' | 'neutral';
  confidence: number;
  reasoning: string;
  entryZone?: { low: number; high: number };
  riskLevel: 'low' | 'medium' | 'high';
}

interface LLMProvider {
  name: string;
  apiKey: string;
  apiUrl: string;
  model: string;
  format: 'openai' | 'gemini';
}

export class LLMConsensusAgent {
  private name = 'LLMConsensus';
  private rateLimitCache: Map<string, number> = new Map();
  private rateLimitMs = 5 * 60_000; // 5 minutes per pair
  private providers: LLMProvider[] = [];

  constructor() {
    // Build provider chain in priority order
    // 1. Gemini (free tier available, user has key)
    if (process.env.GEMINI_API_KEY) {
      this.providers.push({
        name: 'Gemini',
        apiKey: process.env.GEMINI_API_KEY,
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: process.env.CONSENSUS_GEMINI_MODEL || 'gemini-2.0-flash',
        format: 'gemini',
      });
    }

    // 2. Grok / xAI (OpenAI-compatible)
    if (process.env.XAI_API_KEY) {
      this.providers.push({
        name: 'Grok',
        apiKey: process.env.XAI_API_KEY,
        apiUrl: process.env.XAI_API_URL || 'https://api.x.ai/v1/chat/completions',
        model: process.env.CONSENSUS_LLM_MODEL || 'grok-3-mini',
        format: 'openai',
      });
    }

    // 3. OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        format: 'openai',
      });
    }

    // 4. Anthropic (OpenAI-compatible via messages API)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push({
        name: 'Anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        apiUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-haiku-4-5-20251001',
        format: 'openai', // handled specially in callLLM
      });
    }
  }

  async analyze(context: LLMMarketContext): Promise<ConsensusVote> {
    // Rate limit check
    const lastCall = this.rateLimitCache.get(context.pair) || 0;
    if (Date.now() - lastCall < this.rateLimitMs) {
      return {
        agent: this.name,
        direction: 'abstain',
        confidence: 0,
        reasoning: `Rate limited - last call ${Math.floor((Date.now() - lastCall) / 1000)}s ago`,
        timestamp: Date.now(),
      };
    }

    if (this.providers.length === 0) {
      return {
        agent: this.name,
        direction: 'abstain',
        confidence: 0,
        reasoning: 'No LLM API key configured (set GEMINI_API_KEY, XAI_API_KEY, or OPENAI_API_KEY)',
        timestamp: Date.now(),
      };
    }

    try {
      this.rateLimitCache.set(context.pair, Date.now());
      const prompt = this.buildPrompt(context);

      // Try each provider in order until one succeeds
      for (const provider of this.providers) {
        try {
          const response = await this.callLLM(prompt, provider);
          if (response) {
            return {
              agent: this.name,
              direction: response.direction,
              confidence: Math.min(response.confidence, 0.9), // Cap LLM confidence
              reasoning: `[${provider.name}/${provider.model}] ${response.reasoning}`,
              timestamp: Date.now(),
            };
          }
        } catch (err) {
          console.error(`[LLMConsensus] ${provider.name} failed:`, err instanceof Error ? err.message : err);
          // Continue to next provider
        }
      }

      return {
        agent: this.name,
        direction: 'abstain',
        confidence: 0,
        reasoning: `All LLM providers failed (tried: ${this.providers.map(p => p.name).join(', ')})`,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        agent: this.name,
        direction: 'abstain',
        confidence: 0,
        reasoning: `LLM error: ${error instanceof Error ? error.message : 'unknown'}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Sanitize text before embedding in LLM prompt to prevent injection
   */
  private sanitize(text: string, maxLength: number = 500): string {
    return text
      .replace(/[^\w\s.,;:!?%$+\-/()[\]{}@#^&*=<>~`'"]/g, '') // Strip unusual chars
      .replace(/\b(system|assistant|user|ignore|forget|override|disregard)\b/gi, '[FILTERED]') // Block role keywords
      .replace(/```[\s\S]*?```/g, '[CODE_BLOCK]') // Strip code blocks
      .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
      .slice(0, maxLength)
      .trim();
  }

  private buildPrompt(context: LLMMarketContext): string {
    // Validate pair format (should be like "BTC/USDT" or "ETH-PERP")
    const safePair = context.pair.replace(/[^A-Za-z0-9/\-_]/g, '').slice(0, 20);
    const safeTechnical = this.sanitize(context.technicalSummary, 300);
    const safeSentiment = this.sanitize(context.sentimentSummary, 300);
    const safeSMC = this.sanitize(context.smcSummary, 300);

    return `You are a professional crypto/forex/stock trading analyst. Analyze the following market data and provide a trading recommendation.

ASSET: ${safePair}
CURRENT PRICE: $${context.currentPrice.toFixed(2)}
24H CHANGE: ${context.change24h > 0 ? '+' : ''}${context.change24h.toFixed(2)}%
7D CHANGE: ${context.change7d > 0 ? '+' : ''}${context.change7d.toFixed(2)}%
24H VOLUME: $${(context.volume24h / 1e6).toFixed(1)}M

TECHNICAL ANALYSIS SUMMARY:
${safeTechnical}

SENTIMENT ANALYSIS SUMMARY:
${safeSentiment}

SMART MONEY CONCEPTS (SMC):
${safeSMC}

RECENT PRICE ACTION (last 10 candles):
${context.recentCandles.slice(0, 10).map((c, i) => `  ${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`).join('\n')}

Respond in EXACTLY this JSON format (no other text):
{
  "direction": "long" | "short" | "neutral",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation (max 200 chars)",
  "riskLevel": "low" | "medium" | "high"
}`;
  }

  private async callLLM(prompt: string, provider: LLMProvider): Promise<LLMResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      let response: Response;

      if (provider.format === 'gemini') {
        // Gemini native API
        response = await fetch(
          `${provider.apiUrl}/${provider.model}:generateContent?key=${provider.apiKey}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `You are a professional trading analyst. Always respond with valid JSON only.\n\n${prompt}` }],
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 300,
              },
            }),
          }
        );

        clearTimeout(timeout);
        if (!response.ok) {
          console.error(`[LLMConsensus] ${provider.name} HTTP ${response.status}`);
          return null;
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) return null;

        return this.parseResponse(content);

      } else {
        // OpenAI-compatible API (Grok, OpenAI, etc.)
        response = await fetch(provider.apiUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: 'system', content: 'You are a professional trading analyst. Always respond with valid JSON only.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 300,
          }),
        });

        clearTimeout(timeout);
        if (!response.ok) {
          console.error(`[LLMConsensus] ${provider.name} HTTP ${response.status}`);
          return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) return null;

        return this.parseResponse(content);
      }
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private parseResponse(content: string): LLMResponse | null {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!['long', 'short', 'neutral'].includes(parsed.direction)) return null;
      if (typeof parsed.confidence !== 'number') return null;

      return {
        direction: parsed.direction,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        riskLevel: parsed.riskLevel || 'medium',
      };
    } catch {
      return null;
    }
  }

  /**
   * Build context from other agents' analyses
   */
  static buildMarketContext(
    pair: string,
    candles: Candle[],
    technicalVote: ConsensusVote,
    sentimentVote: ConsensusVote,
    smcContext?: SMCContext
  ): LLMMarketContext {
    const current = candles[candles.length - 1];
    const prev24h = candles.length > 288 ? candles[candles.length - 289] : candles[0]; // 288 * 5min = 24h
    const prev7d = candles.length > 2016 ? candles[candles.length - 2017] : candles[0];

    return {
      pair,
      currentPrice: current?.close || 0,
      change24h: prev24h ? ((current.close - prev24h.close) / prev24h.close) * 100 : 0,
      change7d: prev7d ? ((current.close - prev7d.close) / prev7d.close) * 100 : 0,
      technicalSummary: technicalVote.reasoning,
      sentimentSummary: sentimentVote.reasoning,
      smcSummary: smcContext
        ? `Structure: ${smcContext.structureDirection}, OBs: ${smcContext.orderBlocks.length}, FVGs: ${smcContext.fairValueGaps.length}, BOS: ${smcContext.breakOfStructure?.type || 'none'}`
        : 'No SMC data',
      recentCandles: candles.slice(-10).map(c => ({
        open: c.open,
        close: c.close,
        high: c.high,
        low: c.low,
      })),
      volume24h: candles.slice(-288).reduce((sum, c) => sum + c.volume, 0),
    };
  }
}
