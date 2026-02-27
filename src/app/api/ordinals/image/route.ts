import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy for Ordinals Collection Images
 * Proxies images from Magic Eden CDN and other external sources
 * to avoid CORS issues in the browser.
 *
 * Usage: /api/ordinals/image/?url=<encoded_url>
 */

// Simple in-memory cache for image responses (5 min TTL)
const imageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const IMAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed hostnames to prevent SSRF
const ALLOWED_HOSTS = [
  'img-cdn.magiceden.dev',
  'creator-hub-prod.s3.us-east-2.amazonaws.com',
  'api-mainnet.magiceden.dev',
  'ord.cdn.magiceden.dev',
  'ordinals.com',
  'ordinals.hiro.so',
  'api.hiro.so',
];

/**
 * Validates that a hostname is allowed, preventing SSRF subdomain bypass attacks
 */
function isHostnameAllowed(hostname: string): boolean {
  return ALLOWED_HOSTS.some(allowedHost => {
    // Exact match
    if (hostname === allowedHost) {
      return true;
    }

    // Subdomain match - ensure the hostname ends with .allowedHost
    // and that the suffix after removing the subdomain exactly matches allowedHost
    if (hostname.endsWith('.' + allowedHost)) {
      const parts = hostname.split('.');
      const allowedParts = allowedHost.split('.');
      const suffix = parts.slice(-allowedParts.length).join('.');
      return suffix === allowedHost;
    }

    return false;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Enforce HTTPS only
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 400 });
    }

    // Check allowed hosts to prevent SSRF
    if (!isHostnameAllowed(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }

    // Check cache
    const cached = imageCache.get(imageUrl);
    if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_TTL) {
      return new NextResponse(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fetch the image
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CYPHER-ORDi-Future-V3',
        'Accept': 'image/*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    // Validate content-type is an image
    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Response is not an image' }, { status: 400 });
    }

    // Check content-length to prevent memory exhaustion
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
    }

    const arrayBuffer = await response.arrayBuffer();

    // Double-check actual size after download
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(arrayBuffer);

    // Cache the result
    imageCache.set(imageUrl, { buffer, contentType, timestamp: Date.now() });

    // Evict old cache entries if cache gets too large
    if (imageCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of imageCache) {
        if (now - value.timestamp > IMAGE_CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Image fetch timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
