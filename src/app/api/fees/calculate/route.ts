import { NextRequest, NextResponse } from 'next/server';
import { calculateFees } from '@/lib/fees/feeCalculation';
import { validateFeeCalculationRequest, performSecurityValidation, sanitizeInput } from '@/lib/fees/validation';
import { FeeCalculationRequest } from '@/types/fees';

// Rate limiting store (in production, use Redis or similar)
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
  const maxRequests = 50; // 50 requests per minute
  
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

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and security
    const clientIP = getRealIP(request);
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and sanitize request body
    const body = await request.json();
    const sanitizedBody = sanitizeInput(body) as FeeCalculationRequest;

    // Comprehensive security validation
    const securityValidation = performSecurityValidation(sanitizedBody, clientIP, {
      strictMode: true,
      maxAmountUSD: 1000000, // $1M max
      requireKnownTokens: false, // Allow unknown tokens for flexibility
    });

    if (!securityValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: securityValidation.errors,
          warnings: securityValidation.warnings
        },
        { status: 400 }
      );
    }

    // Basic validation
    const validation = validateFeeCalculationRequest(sanitizedBody);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Calculate fees
    const feeCalculation = await calculateFees(sanitizedBody);

    // Log successful calculation (for monitoring)

    // Return calculation with warnings if any
    const response: any = feeCalculation;
    if (validation.warnings.length > 0 || securityValidation.warnings.length > 0) {
      response.warnings = [...validation.warnings, ...securityValidation.warnings];
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Rate-Limit-Remaining': '49', // This would be calculated dynamically
      }
    });

  } catch (error: any) {
    console.error('Fee calculation error:', error);
    
    // Don't expose internal errors
    return NextResponse.json(
      { 
        error: 'Internal server error occurred during fee calculation',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST to calculate fees.',
      supportedMethods: ['POST'],
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}