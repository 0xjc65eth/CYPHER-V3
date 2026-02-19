import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'inscriptions';
  const limit = searchParams.get('limit') || '10';
  const offset = searchParams.get('offset') || '0';

  try {
    let url = '';
    
    switch (endpoint) {
      case 'inscriptions':
        url = `https://api.hiro.so/ordinals/v1/inscriptions?limit=${limit}&offset=${offset}`;
        break;
      case 'brc20':
        url = `https://api.hiro.so/ordinals/v1/brc-20/tokens?limit=${limit}&offset=${offset}`;
        break;
      case 'stats':
        url = `https://api.hiro.so/ordinals/v1/stats`;
        break;
      default:
        url = `https://api.hiro.so/ordinals/v1/${endpoint}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Hiro API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Hiro API Error:', error);

    // Return error - NO MOCK DATA
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch real data from Hiro API',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}