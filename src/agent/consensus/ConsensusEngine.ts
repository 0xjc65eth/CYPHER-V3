/**
 * CYPHER AI Trading Agent - Consensus Engine
 * Coordinates multiple AI agents to reach trading decisions
 *
 * Weighted voting system:
 *   Technical Analyst: 0.35
 *   Risk Manager: 0.30 (+ veto power)
 *   LLM Consensus: 0.20
 *   Sentiment Analyst: 0.15
 *
 * Minimum 0.65 weighted confidence to approve a trade
 */

import { Candle, ConsensusVote, ConsensusResult, SMCContext, Position, RiskLimits, AgentPerformance } from '../core/types';
import { TechnicalAnalystAgent } from './TechnicalAnalystAgent';
import { SentimentAnalystAgent } from './SentimentAnalystAgent';
import { RiskManagerAgent, TradeProposal } from './RiskManagerAgent';
import { LLMConsensusAgent } from './LLMConsensusAgent';
import { AgentEventBus, getAgentEventBus } from './AgentEventBus';
import { getAgentPersistence } from '../persistence';

export interface ConsensusConfig {
  weights: {
    technical: number;
    sentiment: number;
    risk: number;
    llm: number;
  };
  minConfidence: number;
  enableLLM: boolean;
  /** Per-user opt-in for autonomous trade execution (set by wizard Step 5) */
  enableTrading?: boolean;
}

const DEFAULT_CONSENSUS_CONFIG: ConsensusConfig = {
  weights: {
    technical: 0.35,
    sentiment: 0.15,
    risk: 0.30,
    llm: 0.20,
  },
  minConfidence: parseFloat(process.env.CONSENSUS_MIN_CONFIDENCE || '0.65'),
  enableLLM: !!process.env.XAI_API_KEY,
};

export class ConsensusEngine {
  private technicalAgent: TechnicalAnalystAgent;
  private sentimentAgent: SentimentAnalystAgent;
  private riskAgent: RiskManagerAgent;
  private llmAgent: LLMConsensusAgent;
  private eventBus: AgentEventBus;
  private config: ConsensusConfig;

  constructor(config?: Partial<ConsensusConfig>) {
    this.config = { ...DEFAULT_CONSENSUS_CONFIG, ...config };
    this.technicalAgent = new TechnicalAnalystAgent();
    this.sentimentAgent = new SentimentAnalystAgent();
    this.riskAgent = new RiskManagerAgent();
    this.llmAgent = new LLMConsensusAgent();
    this.eventBus = getAgentEventBus();
  }

  /**
   * Main consensus evaluation
   * Returns whether a trade should be executed and with what parameters
   */
  async evaluateProposal(
    proposal: TradeProposal,
    candles: Candle[],
    smcContext: SMCContext | undefined,
    portfolioContext: {
      totalEquity: number;
      openPositions: Position[];
      performance: AgentPerformance;
      riskLimits: RiskLimits;
    }
  ): Promise<ConsensusResult> {
    const startTime = Date.now();

    // Emit consensus request event
    this.eventBus.publish({
      type: 'consensus_request',
      source: 'ConsensusEngine',
      data: { pair: proposal.pair, direction: proposal.direction },
      timestamp: startTime,
      priority: 'high',
    });

    // 1. Gather votes from all agents in parallel
    const [technicalVote, sentimentVote, riskVote] = await Promise.all([
      this.technicalAgent.analyze(proposal.pair, candles, smcContext),
      this.sentimentAgent.analyze(proposal.pair),
      this.riskAgent.evaluate(proposal, portfolioContext),
    ]);

    // 2. LLM vote (optional, rate-limited)
    let llmVote: ConsensusVote;
    if (this.config.enableLLM) {
      const llmContext = LLMConsensusAgent.buildMarketContext(
        proposal.pair,
        candles,
        technicalVote,
        sentimentVote,
        smcContext
      );
      llmVote = await this.llmAgent.analyze(llmContext);
    } else {
      llmVote = {
        agent: 'LLMConsensus',
        direction: 'abstain',
        confidence: 0,
        reasoning: 'LLM disabled',
        timestamp: Date.now(),
      };
    }

    const votes = [technicalVote, sentimentVote, riskVote, llmVote];

    // 3. Check for Risk Manager VETO
    // Detect veto: direction=abstain with high confidence, or reasoning starts with "VETO:"
    const isVeto = (riskVote.direction === 'abstain' && riskVote.confidence >= 0.95)
      || riskVote.reasoning?.startsWith('VETO:');
    if (isVeto) {
      const result: ConsensusResult = {
        approved: false,
        direction: proposal.direction,
        confidence: 0,
        positionSize: 0,
        votes,
        reasoning: `VETOED by Risk Manager: ${riskVote.reasoning}`,
        timestamp: Date.now(),
      };

      await this.recordDecision(proposal, result);
      this.emitResult(result);
      return result;
    }

    // 4. Calculate weighted consensus
    const { direction, confidence } = this.calculateWeightedConsensus(votes);

    // 5. Determine position size (use risk manager's suggestion if available)
    const positionSize = riskVote.positionSize || proposal.positionSizeUSD;

    // 6. Build result
    const meetsThreshold = confidence >= this.config.minConfidence
      && direction !== 'neutral'
      && direction !== 'abstain';

    // SECURITY FIX: Trades require explicit user opt-in.
    // Auto-trade is DISABLED by default. Enable via:
    //   1. Environment variable: ENABLE_AUTO_TRADE=true (global)
    //   2. Agent config: enableTrading=true (per-user, set by wizard Step 5)
    // Without this, AI decisions are logged but NOT executed.
    const autoTradeEnabled = process.env.ENABLE_AUTO_TRADE === 'true'
      || this.config?.enableTrading === true;
    const approved = meetsThreshold && autoTradeEnabled;

    const allReasons = votes
      .filter(v => v.direction !== 'abstain')
      .map(v => `[${v.agent}] ${v.direction} (${(v.confidence * 100).toFixed(0)}%): ${v.reasoning}`)
      .join(' | ');

    const result: ConsensusResult = {
      approved,
      direction: (direction === 'neutral' || direction === 'abstain') ? proposal.direction : direction,
      confidence,
      positionSize: approved ? positionSize : 0,
      votes,
      reasoning: approved
        ? `APPROVED (${(confidence * 100).toFixed(0)}%): ${allReasons}`
        : `REJECTED (${(confidence * 100).toFixed(0)}% < ${(this.config.minConfidence * 100).toFixed(0)}% min): ${allReasons}`,
      timestamp: Date.now(),
    };

    // 7. Persist and emit
    await this.recordDecision(proposal, result);
    this.emitResult(result);

    return result;
  }

  private calculateWeightedConsensus(votes: ConsensusVote[]): { direction: 'long' | 'short' | 'neutral' | 'abstain'; confidence: number } {
    const weights = this.config.weights;
    const agentWeightMap: Record<string, number> = {
      TechnicalAnalyst: weights.technical,
      SentimentAnalyst: weights.sentiment,
      RiskManager: weights.risk,
      LLMConsensus: weights.llm,
    };

    let longScore = 0;
    let shortScore = 0;
    let totalWeight = 0;

    for (const vote of votes) {
      if (vote.direction === 'abstain') continue;

      const weight = agentWeightMap[vote.agent] || 0;
      totalWeight += weight;

      if (vote.direction === 'long') {
        longScore += weight * vote.confidence;
      } else if (vote.direction === 'short') {
        shortScore += weight * vote.confidence;
      }
      // neutral votes contribute to neither
    }

    if (totalWeight === 0) {
      return { direction: 'abstain', confidence: 0 };
    }

    const normalizedLong = longScore / totalWeight;
    const normalizedShort = shortScore / totalWeight;

    if (normalizedLong > normalizedShort && normalizedLong > 0.1) {
      return { direction: 'long', confidence: normalizedLong };
    } else if (normalizedShort > normalizedLong && normalizedShort > 0.1) {
      return { direction: 'short', confidence: normalizedShort };
    }

    return { direction: 'neutral', confidence: Math.max(normalizedLong, normalizedShort) };
  }

  private async recordDecision(proposal: TradeProposal, result: ConsensusResult): Promise<void> {
    try {
      const persistence = getAgentPersistence();
      await persistence.recordConsensusDecision({
        agent_config_id: '', // Set by orchestrator
        pair: proposal.pair,
        proposal,
        votes: result.votes,
        result: {
          approved: result.approved,
          direction: result.direction,
          confidence: result.confidence,
          positionSize: result.positionSize,
        },
        approved: result.approved,
        executed: false,
      });
    } catch (error) {
      console.error('[Consensus] Failed to record decision:', error);
    }
  }

  private emitResult(result: ConsensusResult): void {
    this.eventBus.publish({
      type: 'consensus_result',
      source: 'ConsensusEngine',
      data: {
        approved: result.approved,
        direction: result.direction,
        confidence: result.confidence,
        positionSize: result.positionSize,
        reasoning: result.reasoning,
      },
      timestamp: Date.now(),
      priority: result.approved ? 'high' : 'medium',
    });
  }

  updateConfig(config: Partial<ConsensusConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ConsensusConfig {
    return { ...this.config };
  }
}

// Singleton
let consensusInstance: ConsensusEngine | null = null;

export function getConsensusEngine(): ConsensusEngine {
  if (!consensusInstance) {
    consensusInstance = new ConsensusEngine();
  }
  return consensusInstance;
}
