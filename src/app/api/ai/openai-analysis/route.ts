import { NextRequest, NextResponse } from 'next/server';
import { API_KEYS } from '@/config/professionalApis';

export async function POST(request: NextRequest) {
  try {
    if (!API_KEYS.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Service unavailable', message: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    const { query, model = 'gpt-4-turbo', context = 'bitcoin_trading' } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Professional OpenAI Analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEYS.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are CYPHER AI, a professional Bitcoin ecosystem trading analyst specializing in Ordinals, Runes, and BRC-20 tokens. 

EXPERTISE:
- Bitcoin market analysis and predictions
- Ordinals collection evaluation and trends
- Runes protocol opportunities
- BRC-20 token analysis and discovery
- Risk assessment and portfolio optimization
- Technical and fundamental analysis
- Market sentiment and social metrics

RESPONSE FORMAT:
Provide clear, actionable analysis with:
1. Executive summary (2-3 sentences)
2. Key insights with confidence levels
3. Specific recommendations with risk levels
4. Timeframes for opportunities
5. Supporting data and reasoning

Be professional, precise, and focus on profitable opportunities while highlighting risks.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || 'Analysis unavailable';

    // Extract confidence and actions from analysis
    const confidence = extractConfidence(analysis);
    const actions = extractActions(analysis);

    return NextResponse.json({
      analysis,
      confidence,
      actions,
      model: model,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractConfidence(analysis: string): number {
  // Extract confidence from analysis text
  const confidenceRegex = /confidence[:\s]+(\d+)%/i;
  const match = analysis.match(confidenceRegex);
  if (match) {
    return parseInt(match[1]) / 100;
  }
  
  // Analyze sentiment words to estimate confidence
  const highConfidenceWords = ['strong', 'highly', 'excellent', 'outstanding', 'definite'];
  const lowConfidenceWords = ['weak', 'uncertain', 'risky', 'volatile', 'unclear'];
  
  const text = analysis.toLowerCase();
  const highCount = highConfidenceWords.filter(word => text.includes(word)).length;
  const lowCount = lowConfidenceWords.filter(word => text.includes(word)).length;
  
  if (highCount > lowCount) return 0.85;
  if (lowCount > highCount) return 0.65;
  return 0.75;
}

function extractActions(analysis: string): any[] {
  const actions = [];
  
  if (analysis.toLowerCase().includes('buy') || analysis.toLowerCase().includes('purchase')) {
    actions.push({
      id: 'buy-action',
      type: 'trade',
      label: 'Execute Buy Order',
      description: 'Execute recommended buy order',
      risk: 'medium',
      params: { action: 'buy' }
    });
  }
  
  if (analysis.toLowerCase().includes('sell')) {
    actions.push({
      id: 'sell-action',
      type: 'trade',
      label: 'Execute Sell Order',
      description: 'Execute recommended sell order',
      risk: 'low',
      params: { action: 'sell' }
    });
  }
  
  if (analysis.toLowerCase().includes('watch') || analysis.toLowerCase().includes('monitor')) {
    actions.push({
      id: 'watch-action',
      type: 'watch',
      label: 'Add to Watchlist',
      description: 'Monitor for opportunities',
      risk: 'low',
      params: { action: 'watch' }
    });
  }
  
  return actions;
}