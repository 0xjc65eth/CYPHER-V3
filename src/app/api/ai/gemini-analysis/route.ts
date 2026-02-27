import { NextRequest, NextResponse } from 'next/server';
import { API_KEYS } from '@/config/professionalApis';

export async function POST(request: NextRequest) {
  try {
    if (!API_KEYS.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Service unavailable', message: 'Gemini API key not configured' },
        { status: 503 }
      );
    }

    const { query, model = 'gemini-pro', focus = 'ordinals_runes_brc20' } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Professional Gemini Analysis
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEYS.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are CYPHER AI's Gemini specialist, an expert in Bitcoin ecosystem analysis with deep focus on Ordinals, Runes, and BRC-20 tokens.

SPECIALIZED EXPERTISE:
- Bitcoin Ordinals marketplace trends and collection analysis
- Runes protocol opportunities and yield strategies  
- BRC-20 token discovery and fundamental analysis
- Cross-protocol arbitrage opportunities
- Inscription data analysis and pattern recognition
- Bitcoin Layer 2 ecosystem evaluation
- NFT utility and community strength assessment

ANALYSIS FRAMEWORK:
1. Technical Analysis: Chart patterns, volume, momentum indicators
2. Fundamental Analysis: Protocol adoption, developer activity, community metrics
3. Market Sentiment: Social signals, whale activity, funding rates
4. Risk Assessment: Volatility analysis, liquidity concerns, regulatory factors
5. Opportunity Scoring: Profit potential vs risk ratio with confidence levels

RESPONSE STRUCTURE:
- Executive Summary (key insight in 1-2 sentences)
- Detailed Analysis (technical + fundamental factors)
- Specific Opportunities (ranked by probability and profit potential)
- Risk Factors (clearly identified with mitigation strategies)
- Actionable Recommendations (specific entry/exit points when applicable)
- Confidence Score (0-100% based on data quality and signal strength)

Focus Area: ${focus}

User Query: ${query}

Provide professional-grade analysis with specific, actionable insights optimized for profitable trading decisions.`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable';

    // Extract confidence and recommendations from insight
    const confidence = extractConfidenceFromGemini(insight);
    const recommendations = extractRecommendationsFromGemini(insight);

    return NextResponse.json({
      insight,
      confidence,
      recommendations,
      model: model,
      focus: focus,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Gemini analysis error:', error);
    return NextResponse.json(
      { error: 'Gemini analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractConfidenceFromGemini(insight: string): number {
  // Look for explicit confidence mentions
  const confidenceRegex = /confidence[:\s]+([\d.]+)%?/i;
  const match = insight.match(confidenceRegex);
  if (match) {
    const value = parseFloat(match[1]);
    return value > 1 ? value / 100 : value;
  }
  
  // Analyze language patterns for confidence estimation
  const highConfidencePatterns = [
    /strong\s+bullish/i, /highly\s+confident/i, /clear\s+opportunity/i,
    /definitive\s+trend/i, /confirmed\s+pattern/i, /solid\s+fundamentals/i
  ];
  
  const lowConfidencePatterns = [
    /uncertain/i, /mixed\s+signals/i, /volatile\s+conditions/i,
    /unclear\s+direction/i, /conflicting\s+indicators/i, /high\s+risk/i
  ];
  
  const mediumConfidencePatterns = [
    /moderate\s+confidence/i, /likely/i, /probable/i,
    /emerging\s+trend/i, /developing\s+pattern/i
  ];
  
  const text = insight.toLowerCase();
  
  if (highConfidencePatterns.some(pattern => pattern.test(text))) {
    return 0.88;
  } else if (lowConfidencePatterns.some(pattern => pattern.test(text))) {
    return 0.62;
  } else if (mediumConfidencePatterns.some(pattern => pattern.test(text))) {
    return 0.75;
  }
  
  // Default confidence for Gemini analysis
  return 0.82;
}

function extractRecommendationsFromGemini(insight: string): any[] {
  const recommendations = [];
  const text = insight.toLowerCase();
  
  // Buy recommendations
  if (text.includes('buy') || text.includes('accumulate') || text.includes('long position')) {
    recommendations.push({
      id: 'gemini-buy-rec',
      type: 'trade',
      action: 'buy',
      label: 'Execute Buy Strategy',
      description: 'Gemini AI recommends buying based on current analysis',
      risk: text.includes('high risk') ? 'high' : text.includes('low risk') ? 'low' : 'medium',
      confidence: extractConfidenceFromGemini(insight),
      params: { action: 'buy', source: 'gemini' }
    });
  }
  
  // Sell recommendations  
  if (text.includes('sell') || text.includes('take profit') || text.includes('exit')) {
    recommendations.push({
      id: 'gemini-sell-rec',
      type: 'trade', 
      action: 'sell',
      label: 'Execute Sell Strategy',
      description: 'Gemini AI recommends selling based on current analysis',
      risk: 'low',
      confidence: extractConfidenceFromGemini(insight),
      params: { action: 'sell', source: 'gemini' }
    });
  }
  
  // Watch recommendations
  if (text.includes('monitor') || text.includes('watch') || text.includes('observe')) {
    recommendations.push({
      id: 'gemini-watch-rec',
      type: 'watch',
      action: 'monitor',
      label: 'Add to Watchlist', 
      description: 'Monitor for developing opportunities',
      risk: 'low',
      confidence: extractConfidenceFromGemini(insight),
      params: { action: 'watch', source: 'gemini' }
    });
  }
  
  // Research recommendations
  if (text.includes('research') || text.includes('investigate') || text.includes('analyze further')) {
    recommendations.push({
      id: 'gemini-research-rec',
      type: 'research',
      action: 'research', 
      label: 'Deep Research',
      description: 'Conduct additional research on identified opportunities',
      risk: 'low',
      confidence: extractConfidenceFromGemini(insight),
      params: { action: 'research', source: 'gemini' }
    });
  }
  
  return recommendations;
}