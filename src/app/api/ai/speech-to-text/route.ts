import { NextRequest, NextResponse } from 'next/server';
import { API_KEYS } from '@/config/professionalApis';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';
    const enhance = formData.get('enhance') as string || 'true';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Convert File to buffer for AssemblyAI
    const audioBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);

    // Step 1: Upload audio file to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': API_KEYS.ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream'
      },
      body: audioData
    });

    if (!uploadResponse.ok) {
      throw new Error(`AssemblyAI upload error: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;

    // Step 2: Request transcription with professional settings
    const transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': API_KEYS.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: language,
        // Professional features for trading context
        speaker_labels: true,           // Identify different speakers
        auto_highlights: true,          // Extract key highlights
        sentiment_analysis: true,       // Analyze sentiment
        entity_detection: true,         // Detect financial entities
        iab_categories: true,          // Topic classification
        content_safety: true,          // Content moderation
        auto_chapters: false,          // Not needed for short audio
        summarization: true,           // Generate summary
        summary_model: 'informative',  // Professional summary style
        summary_type: 'bullets',       // Bullet point format
        // Audio enhancement
        audio_start_from: 0,
        audio_end_at: null,
        boost_param: enhance === 'true' ? 'high' : 'default',
        // Custom vocabulary for crypto/trading terms
        word_boost: [
          'bitcoin', 'ordinals', 'runes', 'brc-20', 'satoshi', 'mempool',
          'inscription', 'collection', 'marketplace', 'trading', 'volume',
          'resistance', 'support', 'bullish', 'bearish', 'hodl', 'whale'
        ],
        boost_param: 'high'
      })
    });

    if (!transcriptionResponse.ok) {
      throw new Error(`AssemblyAI transcription error: ${transcriptionResponse.status}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcriptId = transcriptionData.id;

    // Step 3: Poll for completion (simplified - in production use webhooks)
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes timeout
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': API_KEYS.ASSEMBLYAI_API_KEY
        }
      });

      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        // Extract trading-relevant insights
        const insights = extractTradingInsights(statusData);
        
        return NextResponse.json({
          transcript: statusData.text,
          confidence: statusData.confidence,
          summary: statusData.summary,
          highlights: statusData.auto_highlights_result?.results || [],
          sentiment: statusData.sentiment_analysis_results || [],
          entities: statusData.entities || [],
          insights: insights,
          duration: statusData.audio_duration,
          words: statusData.words?.length || 0,
          timestamp: Date.now()
        });
      } else if (statusData.status === 'error') {
        throw new Error(`Transcription failed: ${statusData.error}`);
      }

      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    throw new Error('Transcription timeout - please try again with shorter audio');

  } catch (error) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { error: 'Speech-to-text failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractTradingInsights(transcriptionData: any): any[] {
  const insights = [];
  const text = transcriptionData.text?.toLowerCase() || '';

  // Extract trading signals from speech
  const tradingKeywords = {
    bullish: ['buy', 'bullish', 'moon', 'pump', 'rally', 'breakout', 'uptrend'],
    bearish: ['sell', 'bearish', 'dump', 'crash', 'breakdown', 'downtrend'],
    neutral: ['hold', 'wait', 'sideways', 'consolidation', 'range'],
    risk: ['risk', 'careful', 'dangerous', 'volatile', 'risky'],
    opportunity: ['opportunity', 'alpha', 'gem', 'undervalued', 'potential']
  };

  // Analyze sentiment from keywords
  let bullishCount = 0;
  let bearishCount = 0;
  let riskCount = 0;
  let opportunityCount = 0;

  for (const [category, keywords] of Object.entries(tradingKeywords)) {
    const count = keywords.reduce((acc, keyword) => 
      acc + (text.match(new RegExp(keyword, 'gi')) || []).length, 0
    );
    
    if (category === 'bullish') bullishCount = count;
    if (category === 'bearish') bearishCount = count;
    if (category === 'risk') riskCount = count;
    if (category === 'opportunity') opportunityCount = count;
  }

  // Generate insights
  if (bullishCount > bearishCount && bullishCount > 2) {
    insights.push({
      type: 'sentiment',
      signal: 'bullish',
      confidence: Math.min(0.9, bullishCount / 10),
      description: 'Speech analysis indicates bullish sentiment',
      keywords_found: bullishCount
    });
  }

  if (bearishCount > bullishCount && bearishCount > 2) {
    insights.push({
      type: 'sentiment', 
      signal: 'bearish',
      confidence: Math.min(0.9, bearishCount / 10),
      description: 'Speech analysis indicates bearish sentiment',
      keywords_found: bearishCount
    });
  }

  if (opportunityCount > 3) {
    insights.push({
      type: 'opportunity',
      signal: 'potential_alpha',
      confidence: Math.min(0.85, opportunityCount / 8),
      description: 'Multiple opportunities mentioned in speech',
      keywords_found: opportunityCount
    });
  }

  if (riskCount > 2) {
    insights.push({
      type: 'risk_warning',
      signal: 'high_risk',
      confidence: Math.min(0.8, riskCount / 6),
      description: 'Risk factors mentioned in speech analysis',
      keywords_found: riskCount
    });
  }

  // Extract mentioned cryptocurrencies/tokens
  const cryptoMentions = [];
  const cryptoRegex = /(bitcoin|btc|ordinals|runes|brc-?20|sats|inscription)/gi;
  const matches = text.match(cryptoRegex);
  
  if (matches) {
    const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
    cryptoMentions.push(...uniqueMatches);
    
    insights.push({
      type: 'asset_mentions',
      signal: 'crypto_discussion',
      confidence: 0.95,
      description: `Mentioned crypto assets: ${uniqueMatches.join(', ')}`,
      assets: uniqueMatches
    });
  }

  return insights;
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}