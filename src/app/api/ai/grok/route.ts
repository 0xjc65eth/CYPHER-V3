import { NextRequest, NextResponse } from 'next/server';

const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1';
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-4-latest';

const SYSTEM_PROMPTS: Record<string, string> = {
  analyze_market: `You are CYPHER AI, an elite crypto trading analyst with access to real-time data.
Analyze the provided market data and return ONLY valid JSON:
{
  "sentiment": "bullish"|"bearish"|"neutral",
  "confidence": 0-100,
  "signals": [{"type":"buy"|"sell"|"hold","asset":"...","reason":"...","entry":number,"stopLoss":number,"takeProfit":number,"timeframe":"..."}],
  "analysis": "...",
  "risks": ["..."],
  "marketStructure": "accumulation"|"distribution"|"markup"|"markdown"
}`,

  evaluate_trade: `You are CYPHER AI Risk Manager. Evaluate the trade.
Return ONLY valid JSON:
{
  "approved": boolean,
  "riskScore": 1-10,
  "positionSize": "suggested % of portfolio",
  "reasoning": "...",
  "adjustments": [{"field":"...","current":null,"suggested":null,"reason":"..."}]
}`,

  arbitrage_scan: `You are CYPHER AI Arbitrage Scanner. Analyze price differences across exchanges.
Return ONLY valid JSON:
{
  "opportunities": [{"asset":"...","buyExchange":"...","sellExchange":"...","buyPrice":0,"sellPrice":0,"spreadPercent":0,"estimatedProfit":0,"risk":"low"|"medium"|"high","action":"execute"|"monitor"|"skip"}],
  "summary": "..."
}`,

  ordinals_analysis: `You are CYPHER AI Ordinals Analyst. Analyze Bitcoin Ordinals and Runes market data.
Return ONLY valid JSON:
{
  "trending": [{"name":"...","type":"ordinal"|"rune","floorPrice":0,"change24h":0,"volume24h":0,"recommendation":"buy"|"sell"|"hold"}],
  "analysis": "...",
  "alphaOpportunities": ["..."]
}`,

  autonomous_decision: `You are CYPHER AI Autonomous Trading Agent. Based on market conditions, make trading decisions.
You MUST be conservative. Never risk more than 2% per trade. Always use stop losses.
Return ONLY valid JSON:
{
  "action": "open_long"|"open_short"|"close_position"|"add_liquidity"|"remove_liquidity"|"place_order"|"cancel_order"|"wait",
  "params": {},
  "reasoning": "...",
  "confidence": 0-100,
  "riskPercent": 0
}`
};

export async function POST(request: NextRequest) {
  try {
    if (!GROK_API_KEY || GROK_API_KEY.includes('your_')) {
      return NextResponse.json({ success: false, error: 'GROK_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, messages, marketData, context } = body;

    const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.analyze_market;

    const grokMessages: any[] = [{ role: 'system', content: systemPrompt }];

    if (marketData) {
      grokMessages.push({ role: 'user', content: `Market Data:\n${JSON.stringify(marketData, null, 2)}` });
    }
    if (context) {
      grokMessages.push({ role: 'user', content: `Context:\n${JSON.stringify(context, null, 2)}` });
    }
    if (Array.isArray(messages)) {
      grokMessages.push(...messages);
    } else if (typeof messages === 'string') {
      grokMessages.push({ role: 'user', content: messages });
    }

    const res = await fetch(`${GROK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({ messages: grokMessages, model: GROK_MODEL, stream: false, temperature: 0.2, max_tokens: 3000 }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Grok AI] Error:', err);
      return NextResponse.json({ success: false, error: 'Grok AI request failed' }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed: any = content;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { /* keep as string */ }

    return NextResponse.json({
      success: true,
      response: parsed,
      model: GROK_MODEL,
      usage: data.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Grok AI] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
