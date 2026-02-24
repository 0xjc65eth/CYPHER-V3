import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect /quicktrade to canonical /quick-trade
  if (request.nextUrl.pathname === '/quicktrade' || request.nextUrl.pathname.startsWith('/quicktrade/')) {
    const url = request.nextUrl.clone();
    url.pathname = url.pathname.replace(/^\/quicktrade/, '/quick-trade');
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

  // CORS headers for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://cypherordifuture.xyz',
      'http://localhost:4444',
      'https://localhost:4444',
      'http://127.0.0.1:4444',
      process.env.NEXTAUTH_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      // No Origin header — allow same-origin navigations and server-to-server
      const fetchSite = request.headers.get('sec-fetch-site');
      if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
        // Cross-origin request without Origin header — deny
        return new Response('Forbidden', { status: 403 });
      }
    } else {
      // Origin present but not in allowed list — deny for mutating methods
      const method = request.method.toUpperCase();
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        return new Response('Forbidden', { status: 403 });
      }
    }
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

  // Content Security Policy - Next.js requires 'unsafe-inline' for hydration scripts
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://api.coingecko.com https://assets.coingecko.com https://ordinals.com https://ordinals.hiro.so https://img-cdn.magiceden.dev https://creator-hub-prod.s3.us-east-2.amazonaws.com https://bis-ord-content.fra1.cdn.digitaloceanspaces.com",
      "connect-src 'self' https://cypherordifuture.xyz https://*.vercel.app https://api.coingecko.com https://pro-api.coingecko.com https://mempool.space https://api.hiro.so https://api-mainnet.magiceden.dev https://open-api.unisat.io https://api.bestinslot.xyz https://api.hyperliquid.xyz https://api.binance.com https://api.coinbase.com https://api.kraken.com https://api.bybit.com https://www.okx.com https://api-pub.bitfinex.com https://api.kucoin.com https://api.gateio.ws wss://stream.binance.com wss://ws-feed.exchange.coinbase.com",
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
