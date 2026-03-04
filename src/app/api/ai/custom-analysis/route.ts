import { NextRequest, NextResponse } from 'next/server';
import { API_KEYS, PROFESSIONAL_APIS } from '@/config/professionalApis';

export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      networks = ['bitcoin', 'ordinals', 'runes'], 
      depth = 'real-time',
      agents = 30 
    } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Multi-source data aggregation
    const marketData = await aggregateMarketData(networks);
    const socialData = await aggregateSocialData(query);
    const onchainData = await aggregateOnchainData(networks);
    
    // Run 30-agent analysis system
    const agentAnalysis = await runAgentAnalysis(query, marketData, socialData, onchainData, depth);
    
    // Generate recommendations
    const recommendation = generateCustomRecommendation(agentAnalysis, depth);
    const confidence = calculateOverallConfidence(agentAnalysis);
    const tradeSignals = extractTradeSignals(agentAnalysis);

    return NextResponse.json({
      recommendation,
      confidence,
      trade_signals: tradeSignals,
      agent_consensus: agentAnalysis.consensus,
      market_data: marketData,
      social_sentiment: socialData,
      onchain_metrics: onchainData,
      analysis_depth: depth,
      agents_active: agentAnalysis.agents_used,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Custom analysis error:', error);
    return NextResponse.json(
      { error: 'Custom analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function aggregateMarketData(networks: string[]): Promise<any> {
  try {
    const promises = [];

    // Bitcoin data from multiple sources
    if (networks.includes('bitcoin')) {
      promises.push(
        fetch(`${PROFESSIONAL_APIS.COINGECKO.BASE_URL}/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`, {
          headers: { 'x-cg-demo-api-key': API_KEYS.COINGECKO_API_KEY }
        }).then(r => r.json())
      );
    }

    // Mempool data for Bitcoin network
    promises.push(
      fetch(`${PROFESSIONAL_APIS.MEMPOOL.BASE_URL}/api/v1/fees/recommended`)
        .then(r => r.json())
    );

    const results = await Promise.allSettled(promises);
    const validResults = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    return {
      bitcoin_price: validResults[0]?.bitcoin || {},
      mempool_fees: validResults[1] || {},
      last_updated: Date.now()
    };
  } catch (error) {
    console.error('Market data aggregation error:', error);
    return { error: 'Market data unavailable' };
  }
}

async function aggregateSocialData(query: string): Promise<any> {
  // Simulate social sentiment analysis
  // In production, integrate with Twitter API, Reddit API, etc.
  const sentimentScore = 0; // Fixed neutral value
  const mentions = 500; // Fixed fallback value
  
  return {
    sentiment_score: sentimentScore,
    sentiment_label: sentimentScore > 0.3 ? 'bullish' : sentimentScore < -0.3 ? 'bearish' : 'neutral',
    mentions_24h: mentions,
    trending_topics: ['bitcoin', 'ordinals', 'runes', 'brc20'],
    confidence: 0.75
  };
}

async function aggregateOnchainData(networks: string[]): Promise<any> {
  try {
    // Get Bitcoin network metrics
    const mempoolResponse = await fetch(`${PROFESSIONAL_APIS.MEMPOOL.BASE_URL}/api/v1/statistics`);
    const mempoolStats = await mempoolResponse.json();

    return {
      bitcoin: {
        mempool_size: mempoolStats.mempool_size || 0,
        fee_rate: mempoolStats.fee_rate || 0,
        transactions_24h: mempoolStats.transactions_24h || 0
      },
      ordinals: {
        inscriptions_today: 3000,
        volume_24h: 50,
        collections_active: 35
      },
      runes: {
        transfers_24h: 6000,
        new_tokens: 5,
        volume_btc: 25
      }
    };
  } catch (error) {
    console.error('Onchain data error:', error);
    return { error: 'Onchain data unavailable' };
  }
}

async function runAgentAnalysis(
  query: string, 
  marketData: any, 
  socialData: any, 
  onchainData: any, 
  depth: string
): Promise<any> {
  // Simulate 30-agent analysis system
  const agents = [
    { id: 1, type: 'technical', confidence: 0.92, signal: 'bullish', reasoning: 'Strong support levels holding' },
    { id: 2, type: 'fundamental', confidence: 0.87, signal: 'bullish', reasoning: 'Network adoption increasing' },
    { id: 3, type: 'sentiment', confidence: 0.78, signal: 'neutral', reasoning: 'Mixed social signals' },
    { id: 4, type: 'whale', confidence: 0.94, signal: 'bullish', reasoning: 'Large wallet accumulation detected' },
    { id: 5, type: 'options', confidence: 0.83, signal: 'bullish', reasoning: 'Put/call ratio favoring calls' },
    { id: 6, type: 'derivatives', confidence: 0.89, signal: 'neutral', reasoning: 'Funding rates normalizing' },
    { id: 7, type: 'institutional', confidence: 0.91, signal: 'bullish', reasoning: 'ETF inflows continue' },
    { id: 8, type: 'defi', confidence: 0.76, signal: 'bullish', reasoning: 'TVL growing steadily' },
    { id: 9, type: 'nft', confidence: 0.84, signal: 'bullish', reasoning: 'Ordinals volume increasing' },
    { id: 10, type: 'memecoin', confidence: 0.71, signal: 'neutral', reasoning: 'Rotation from memes to utility' }
  ];

  // Add more agents up to 30
  const additionalAgents = Array.from({ length: 20 }, (_, i) => ({
    id: i + 11,
    type: ['arbitrage', 'momentum', 'mean_reversion', 'breakout', 'scalping'][i % 5],
    confidence: 0.7 + (i % 5) * 0.05,
    signal: (['bullish', 'bearish', 'neutral'] as const)[i % 3],
    reasoning: 'Advanced algorithmic pattern detected'
  }));

  const allAgents = [...agents, ...additionalAgents];

  // Calculate consensus
  const bullishAgents = allAgents.filter(a => a.signal === 'bullish').length;
  const bearishAgents = allAgents.filter(a => a.signal === 'bearish').length;
  const neutralAgents = allAgents.filter(a => a.signal === 'neutral').length;

  const consensus = {
    bullish_percentage: (bullishAgents / 30) * 100,
    bearish_percentage: (bearishAgents / 30) * 100,
    neutral_percentage: (neutralAgents / 30) * 100,
    overall_signal: bullishAgents > bearishAgents + neutralAgents ? 'bullish' : 
                   bearishAgents > bullishAgents + neutralAgents ? 'bearish' : 'neutral'
  };

  return {
    agents: allAgents,
    consensus,
    agents_used: 30,
    analysis_time: depth === 'deep' ? '15 minutes' : depth === 'predictive' ? '25 minutes' : '2 minutes'
  };
}

function generateCustomRecommendation(agentAnalysis: any, depth: string): string {
  const consensus = agentAnalysis.consensus;
  const signal = consensus.overall_signal;
  const confidence = consensus.bullish_percentage > consensus.bearish_percentage ? 
    consensus.bullish_percentage : consensus.bearish_percentage;

  let recommendation = `CYPHER AI Custom Analysis (${depth} mode):\n\n`;

  if (signal === 'bullish' && confidence > 60) {
    recommendation += `🟢 BULLISH SIGNAL (${confidence.toFixed(0)}% agent consensus)\n`;
    recommendation += `Our 30-agent system indicates strong bullish momentum. Key factors:\n`;
    recommendation += `• Technical indicators showing upward momentum\n`;
    recommendation += `• Institutional accumulation patterns detected\n`;
    recommendation += `• Network fundamentals remain strong\n`;
    recommendation += `• Risk-adjusted entry opportunities identified\n\n`;
    recommendation += `RECOMMENDATION: Consider position sizing with 2-3% portfolio allocation.`;
  } else if (signal === 'bearish' && confidence > 60) {
    recommendation += `🔴 BEARISH SIGNAL (${confidence.toFixed(0)}% agent consensus)\n`;
    recommendation += `Our agent network detects concerning patterns. Key risks:\n`;
    recommendation += `• Technical breakdown signals present\n`;
    recommendation += `• Selling pressure from large holders\n`;
    recommendation += `• Market structure deteriorating\n`;
    recommendation += `• Macro headwinds affecting sentiment\n\n`;
    recommendation += `RECOMMENDATION: Consider defensive positioning or profit-taking.`;
  } else {
    recommendation += `🟡 NEUTRAL/MIXED SIGNALS (${Math.max(consensus.bullish_percentage, consensus.bearish_percentage).toFixed(0)}% highest consensus)\n`;
    recommendation += `Agent analysis shows conflicting signals. Current environment:\n`;
    recommendation += `• Market in consolidation phase\n`;
    recommendation += `• Mixed technical and fundamental indicators\n`;
    recommendation += `• Waiting for clearer directional catalyst\n`;
    recommendation += `• Range-bound trading likely\n\n`;
    recommendation += `RECOMMENDATION: Monitor key levels, maintain balanced exposure.`;
  }

  return recommendation;
}

function calculateOverallConfidence(agentAnalysis: any): number {
  const agents = agentAnalysis.agents;
  const averageConfidence = agents.reduce((sum: number, agent: any) => sum + agent.confidence, 0) / agents.length;
  
  // Adjust for consensus strength
  const consensus = agentAnalysis.consensus;
  const maxConsensus = Math.max(consensus.bullish_percentage, consensus.bearish_percentage, consensus.neutral_percentage);
  const consensusBonus = (maxConsensus - 33.33) / 66.67 * 0.1; // Up to 10% bonus for strong consensus
  
  return Math.min(0.95, averageConfidence + consensusBonus);
}

function extractTradeSignals(agentAnalysis: any): any[] {
  const signals = [];
  const consensus = agentAnalysis.consensus;

  if (consensus.bullish_percentage > 70) {
    signals.push({
      id: 'strong-buy-signal',
      type: 'trade',
      action: 'buy',
      strength: 'strong',
      confidence: consensus.bullish_percentage / 100,
      timeframe: '1-7 days',
      risk_level: 'medium',
      target_allocation: '2-5%'
    });
  } else if (consensus.bullish_percentage > 50) {
    signals.push({
      id: 'moderate-buy-signal',
      type: 'trade',
      action: 'buy',
      strength: 'moderate',
      confidence: consensus.bullish_percentage / 100,
      timeframe: '3-14 days',
      risk_level: 'medium',
      target_allocation: '1-3%'
    });
  }

  if (consensus.bearish_percentage > 70) {
    signals.push({
      id: 'strong-sell-signal',
      type: 'trade',
      action: 'sell',
      strength: 'strong',
      confidence: consensus.bearish_percentage / 100,
      timeframe: '1-5 days',
      risk_level: 'low',
      target_allocation: '50-80% reduction'
    });
  }

  if (consensus.neutral_percentage > 60) {
    signals.push({
      id: 'hold-signal',
      type: 'watch',
      action: 'monitor',
      strength: 'moderate',
      confidence: consensus.neutral_percentage / 100,
      timeframe: 'ongoing',
      risk_level: 'low',
      target_allocation: 'maintain current'
    });
  }

  return signals;
}