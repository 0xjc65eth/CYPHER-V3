import { NextRequest, NextResponse } from 'next/server';
import { getFeeAddresses } from '@/lib/fees/feeAddresses';
import { validateFeeAddresses, sanitizeInput } from '@/lib/fees/validation';

// Rate limiting for addresses endpoint (lighter than calculation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRealIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.ip;
  
  return forwarded?.split(',')[0] || realIP || clientIP || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // 100 requests per minute (more lenient for addresses)
  
  const current = rateLimitStore.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getRealIP(request);
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Get network parameter
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network');

    // Validate and sanitize network parameter
    const sanitizedNetwork = sanitizeInput(network);
    
    if (sanitizedNetwork && typeof sanitizedNetwork !== 'string') {
      return NextResponse.json(
        { error: 'Invalid network parameter' },
        { status: 400 }
      );
    }

    // Get fee addresses
    const addresses = getFeeAddresses(sanitizedNetwork);

    // Validate addresses for security
    const validation = validateFeeAddresses(addresses, {
      strictMode: false, // Allow testnet addresses for development
    });

    if (!validation.isValid) {
      console.error('Fee addresses validation failed:', validation.errors);
      return NextResponse.json(
        { 
          error: 'Invalid fee addresses configuration',
          details: validation.errors
        },
        { status: 500 }
      );
    }

    // Log access (for monitoring)

    // Return addresses with warnings if any
    const response: any = addresses;
    if (validation.warnings.length > 0) {
      response.warnings = validation.warnings;
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Rate-Limit-Remaining': '99', // This would be calculated dynamically
      }
    });

  } catch (error: any) {
    console.error('Fee addresses error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error occurred while fetching fee addresses',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use GET to retrieve fee addresses.',
      supportedMethods: ['GET'],
      documentation: '/api/fees/docs'
    },
    { status: 405 }
  );
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4444',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}