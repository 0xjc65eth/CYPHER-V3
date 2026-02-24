import { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://cypherordifuture.xyz',
  'http://localhost:4444',
  'https://localhost:4444',
  'http://127.0.0.1:4444',
  process.env.NEXTAUTH_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean) as string[];

/**
 * Validate that the request Origin or Referer matches an allowed origin.
 * Returns true if the request is from a trusted origin.
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check Origin header first
  if (origin) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  // Same-origin requests from browsers omit Origin for GET/HEAD
  // Check Sec-Fetch-Site for modern browsers
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'none') {
    return true;
  }

  // No Origin and no Referer — could be server-to-server or curl
  // Deny by default for state-changing methods
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  return false;
}
