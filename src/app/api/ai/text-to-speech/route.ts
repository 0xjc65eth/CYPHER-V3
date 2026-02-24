import { NextRequest, NextResponse } from 'next/server';
import { API_KEYS } from '@/config/professionalApis';

export async function POST(request: NextRequest) {
  try {
    const { text, voice_id = 'professional_male', model_id = 'eleven_multilingual_v2' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length for cost control
    const limitedText = text.substring(0, 500);

    // Professional voice mapping
    const voiceMapping = {
      'professional_male': 'pNInz6obpgDQGcFmaJgB', // Adam - Professional narrator
      'professional_female': 'EXAVITQu4vr4xnSDxMaL', // Bella - Professional female
      'analyst_male': 'VR6AewLTigWG4xSOukaG', // Arnold - Crisp analytical
      'analyst_female': 'ThT5KcBeYPX3keUQqHPh'  // Dorothy - Clear analytical
    };

    const selectedVoiceId = voiceMapping[voice_id as keyof typeof voiceMapping] || voiceMapping.professional_male;

    // ElevenLabs Text-to-Speech API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEYS.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: limitedText,
        model_id: model_id,
        voice_settings: {
          stability: 0.5,        // Professional stability
          similarity_boost: 0.8, // High similarity to voice
          style: 0.2,           // Slight style variation
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Return audio stream
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://cypherordifuture.xyz',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Text-to-speech error:', error);
    return NextResponse.json(
      { error: 'Text-to-speech failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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