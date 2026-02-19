/**
 * CYPHER AI Trading Agent - LLM Consensus Agent
 * Uses Grok (xAI) for high-level market assessment
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

export class LLMConsensusAgent {
  private name = 'LLMConsensus';
  private rateLimitCache: Map<string, number> = new Map();
  private rateLimitMs = 5 * 60_000; // 5 minutes per pair
  private model: string;
  private apiKey: string | null;
  private apiUrl: string;

  constructor() {
    this.model = process.env.CONSENSUS_LLM_MODEL || 'grok-3-mini';
    this.apiKey = process.env.XAI_API_KEY || null;
    this.apiUrl = process.env.XAI_API_URL || 'https://api.x.ai/v1/chat/completions';
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

    if (!this.apiKey) {
      return {
        agent: this.name,
        direction: 'abstain',
        confidence: 0,
        reasoning: 'No LLM API key configured',
        timestamp: Date.now(),
      };
    }

    try {
      this.rateLimitCache.set(context.pair, Date.now());

      const prompt = this.buildPrompt(context);
      const response = await this.callLLM(prompt);

      if (!response) {
        return {
          agent: this.name,
          direction: 'abstain',
          confidence: 0,
          reasoning: 'LLM response parsing failed',
          timestamp: Date.now(),
        };
      }

      return {
        agent: this.name,
        direction: response.direction,
        confidence: Math.min(response.confidence, 0.9), // Cap LLM confidence
        reasoning: `[${this.model}] ${response.reasoning}`,
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

  private buildPrompt(context: LLMMarketContext): string {
    return `You are a professional crypto/forex/stock trading analyst. Analyze the following market data and provide a trading recommendation.

ASSET: ${context.pair}
CURRENT PRICE: $${context.currentPrice.toFixed(2)}
24H CHANGE: ${context.change24h > 0 ? '+' : ''}${context.change24h.toFixed(2)}%
7D CHANGE: ${context.change7d > 0 ? '+' : ''}${context.change7d.toFixed(2)}%
24H VOLUME: $${(context.volume24h / 1e6).toFixed(1)}M

TECHNICAL ANALYSIS SUMMARY:
${context.technicalSummary}

SENTIMENT ANALYSIS SUMMARY:
${context.sentimentSummary}

SMART MONEY CONCEPTS (SMC):
${context.smcSummary}

RECENT PRICE ACTION (last 10 candles):
${context.recentCandles.map((c, i) => `  ${i + 1}. O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`).join('\n')}

Respond in EXACTLY this JSON format (no other text):
{
  "direction": "long" | "short" | "neutral",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation (max 200 chars)",
  "riskLevel": "low" | "medium" | "high"
}`;
  }

  private async callLLM(prompt: string): Promise<LLMResponse | null> {
    try {
      // Grok (xAI) API - OpenAI-compatible endpoint
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional trading analyst. Always respond with valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        console.error(`[LLMConsensus] API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) return null;

      const parsed = JSON.parse(content);

      // Validate response structure
      if (!['long', 'short', 'neutral'].includes(parsed.direction)) return null;
      if (typeof parsed.confidence !== 'number') return null;

      return {
        direction: parsed.direction,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        riskLevel: parsed.riskLevel || 'medium',
      };
    } catch (error) {
      console.error('[LLMConsensus] Parse error:', error);
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
