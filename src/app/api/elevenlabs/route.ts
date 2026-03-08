import { NextRequest, NextResponse } from 'next/server';
import { strictRateLimit } from '@/lib/middleware/rate-limiter';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function POST(request: NextRequest) {
  const rateLimitRes = await strictRateLimit(request, 10, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'Service unavailable', message: 'ElevenLabs API key not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { text, voice_id = 'AZnzlk1XvdvUeBnXmlld', model_id = 'eleven_multilingual_v2' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs API Error:', response.status, response.statusText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('ElevenLabs API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}