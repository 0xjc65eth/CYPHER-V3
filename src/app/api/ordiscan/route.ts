import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

const ORDISCAN_API_KEY = process.env.ORDISCAN_API_KEY;
const ORDISCAN_BASE_URL = 'https://api.ordiscan.com/v1';

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, 30, 60);
  if (rateLimitRes) return rateLimitRes;

  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint') || 'collections';
    const limit = searchParams.get('limit') || '20';
    
    if (!ORDISCAN_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Ordiscan API key not configured',
        data: null
      }, { status: 503 });
    }

    let apiUrl = '';
    
    switch (endpoint) {
      case 'collections':
        apiUrl = `${ORDISCAN_BASE_URL}/collections?limit=${limit}`;
        break;
      case 'ordinals':
        apiUrl = `${ORDISCAN_BASE_URL}/ordinals?limit=${limit}`;
        break;
      case 'activity':
        apiUrl = `${ORDISCAN_BASE_URL}/activity?limit=${limit}`;
        break;
      case 'runes':
        apiUrl = `${ORDISCAN_BASE_URL}/runes?limit=${limit}`;
        break;
      default:
        apiUrl = `${ORDISCAN_BASE_URL}/collections?limit=${limit}`;
    }


    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${ORDISCAN_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Ordiscan API returned ${response.status}`,
        data: null
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'Ordiscan',
      endpoint: endpoint
    });

  } catch (error) {
    console.error('Ordiscan API error:', error);
    // Return error - NO MOCK DATA
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch real data from Ordiscan API'
      },
      { status: 503 }
    );
  }
}

// Todas as falhas de API retornam erro apropriado com status 503
