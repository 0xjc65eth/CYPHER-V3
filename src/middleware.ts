import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Security headers for all routes
  const response = NextResponse.next();

  // CORS headers for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Only allow same origin for sensitive API endpoints
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:4444',
      'https://localhost:4444',
      process.env.NEXTAUTH_URL,
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Allow same-origin requests (no origin header)
      response.headers.set('Access-Control-Allow-Origin', 'http://localhost:4444');
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
  }

  // Security headers for all routes
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy for enhanced security
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https: wss:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match only API routes and pages, exclude static assets
     */
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.js$|.*\\.css$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.woff$|.*\\.woff2$|.*\\.ttf$|.*\\.eot$).*)'
  ],
};