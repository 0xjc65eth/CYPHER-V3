import { NextRequest, NextResponse } from 'next/server';
import { routeToAgent, agents } from '@/lib/agents/gemini-agents';
import { dataFetcherMap } from '@/lib/agents/agent-data-fetchers';
import { rateLimiter } from '@/lib/rateLimiter';

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface ChatRequest {
  message: string;
  language?: string;
  agentHint?: string | null;
  marketContext?: {
    btcPrice?: string;
    volume?: string;
    hashRate?: string;
    difficulty?: string;
    mempoolSize?: string;
  };
}

/**
 * Call Gemini API directly via REST (no SDK dependency)
 */
async function callGemini(userMessage: string, systemPrompt: string, signal?: AbortSignal): Promise<string> {
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  };

  const url = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    console.error(`Gemini API error ${res.status}: ${errText}`);
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty Gemini response');
  }
  return text;
}

/**
 * Build a useful fallback response when Gemini is unavailable,
 * incorporating any live data that was fetched.
 */
function buildFallbackResponse(agent: { name: string; role: string }, message: string, liveData: string): string {
  const parts: string[] = [];
  parts.push(`**${agent.name}** (${agent.role}) here.`);

  if (liveData && liveData.trim().length > 20) {
    parts.push(`\nHere is the latest data I have:\n\n${liveData}`);
    parts.push(`\n*Note: AI language model is currently unavailable. Showing raw data for your query: "${message.slice(0, 100)}". Configure GEMINI_API_KEY for full AI analysis.*`);
  } else {
    parts.push(`\nI received your query: "${message.slice(0, 100)}"`);
    parts.push(`\n*The AI language model is currently unavailable. Please configure GEMINI_API_KEY in your environment to enable full AI-powered responses. In the meantime, you can use specific commands like "BTC price", "analyze market", or "show runes" via the /api/ai/command endpoint.*`);
  }

  return parts.join('\n');
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const geminiConfigured = !!GEMINI_API_KEY;

    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    if (!rateLimiter.canMakeRequestForKey('cypher-ai-chat', clientIp)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const { message, language, agentHint, marketContext }: ChatRequest = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 });
    }

    // Route to the best agent
    const agent = routeToAgent(message, agentHint);

    // Abort controller for the entire request (25s server-side timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {

    // Fetch agent-specific real-time data in parallel (using allSettled for resilience)
    const validFetchers = agent.dataFetchers.filter((name) => dataFetcherMap[name]);
    const fetchResults = await Promise.allSettled(
      validFetchers.map((name) => dataFetcherMap[name]())
    );
    const dataSources = validFetchers.filter(
      (_, i) => fetchResults[i].status === 'fulfilled'
    );
    const fetchedParts = fetchResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value);
    const liveDataContext = fetchedParts.filter(Boolean).join('\n\n');

    // Build client market context if provided
    let clientContext = '';
    if (marketContext) {
      const parts: string[] = [];
      if (marketContext.btcPrice) parts.push(`BTC Price: $${marketContext.btcPrice}`);
      if (marketContext.volume) parts.push(`24h Volume: $${marketContext.volume}`);
      if (marketContext.hashRate) parts.push(`Hash Rate: ${marketContext.hashRate} EH/s`);
      if (marketContext.difficulty) parts.push(`Difficulty: ${marketContext.difficulty}T`);
      if (marketContext.mempoolSize) parts.push(`Mempool Size: ${marketContext.mempoolSize} txs`);
      if (parts.length > 0) {
        clientContext = `\n\n[Client Market Context]\n${parts.join('\n')}`;
      }
    }

    // Build the enhanced system prompt with live data
    const systemPrompt = [
      agent.systemPrompt,
      liveDataContext ? `\n\n[Live Data — use this in your response]\n${liveDataContext}` : '',
    ].join('');

    // Build the user message with optional context
    const languageHint = language && language !== 'auto'
      ? `\n\n[User language preference: ${language}]`
      : '';
    const enhancedMessage = `${message}${clientContext}${languageHint}`;

    // Call Gemini (or fallback if not configured)
    let response: string;
    let source = 'gemini-2.0-flash';

    if (!geminiConfigured) {
      // Provide a useful fallback response using live data context
      response = buildFallbackResponse(agent, message, liveDataContext);
      source = 'local-fallback';
    } else {
      try {
        response = await callGemini(enhancedMessage, systemPrompt, controller.signal);
      } catch (error) {
        console.error('Gemini call failed:', error);
        response = buildFallbackResponse(agent, message, liveDataContext);
        source = 'fallback';
      }
    }

    return NextResponse.json({
      response,
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        icon: agent.icon,
        color: agent.color,
        specialty: agent.role,
      },
      source,
      dataSources,
      timestamp: new Date().toISOString(),
    });

    } catch (innerError) {
      if (innerError instanceof Error && innerError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      throw innerError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler — API status
export async function GET() {
  return NextResponse.json({
    status: 'CYPHER AI Multi-Agent Chat API Online',
    version: '4.0.0',
    model: GEMINI_MODEL,
    agentCount: agents.length,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      icon: a.icon,
      color: a.color,
    })),
    features: [
      '8 specialized AI agents with keyword + hint routing',
      'Per-agent real-time data injection (Binance, Mempool, Fear&Greed, CryptoCompare, Derivatives)',
      'Deep Ordinals/Runes/BRC-20 knowledge (Quantum Cats, Puppets, NodeMonkes, etc.)',
      'Gemini 2.0 Flash via REST API',
      'Auto language detection',
      'Smart Money Concepts analysis',
    ],
    endpoints: {
      POST: '/api/cypher-ai/chat — Send {message, language?, agentHint?}',
      GET: '/api/cypher-ai/chat — API status',
    },
  });
}
