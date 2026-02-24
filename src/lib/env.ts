/**
 * Centralized environment helpers for production/development detection.
 * Eliminates hardcoded localhost references throughout the codebase.
 */

/** The canonical site URL — used for CORS, CSRF, internal API calls */
export function getSiteUrl(): string {
  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side: prefer explicit env vars, fallback to localhost for dev
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4444')
  );
}

/** WebSocket URL — no WS server on Vercel/serverless */
export function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  // Only use localhost WS in local development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'ws://localhost:8080';
  }
  return '';
}

/** Whether the app is running in production */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** All allowed origins for CORS/CSRF validation */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  // Always allow the canonical site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL;

  if (siteUrl) origins.add(siteUrl);
  if (nextAuthUrl) origins.add(nextAuthUrl);
  if (appUrl) origins.add(appUrl);
  if (vercelUrl) {
    origins.add(`https://${vercelUrl}`);
  }

  // Production domain
  origins.add('https://cypherordifuture.xyz');

  // Local development
  origins.add('http://localhost:4444');
  origins.add('https://localhost:4444');
  origins.add('http://127.0.0.1:4444');

  return Array.from(origins);
}

/** CORS headers for API responses */
export function getCorsOrigin(requestOrigin?: string | null): string {
  if (!requestOrigin) return getSiteUrl();
  const allowed = getAllowedOrigins();
  return allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
}

/**
 * Validate environment for secret leakage.
 * Call once at server startup to warn about NEXT_PUBLIC_ vars containing secrets.
 */
export function validateEnvSecurity(): string[] {
  if (typeof window !== 'undefined') return []; // Client-side only

  const warnings: string[] = [];
  const sensitivePatterns = /api[_-]?key|secret|password|token|private/i;

  // Check all NEXT_PUBLIC_ vars for potential secrets in their values
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('NEXT_PUBLIC_') || !value) continue;

    // Check if the var name suggests it's a secret
    if (sensitivePatterns.test(key)) {
      warnings.push(
        `WARNING: ${key} is exposed to the client browser via NEXT_PUBLIC_ prefix. ` +
        `Move it to a server-only env var and proxy through an API route.`
      );
    }

    // Check if RPC URLs contain embedded API keys (common with Alchemy/Infura)
    if (key.includes('RPC') && value.includes('/v2/') && !value.includes('your-key')) {
      warnings.push(
        `WARNING: ${key} may contain an embedded API key in the URL. ` +
        `RPC URLs with API keys should not use NEXT_PUBLIC_ prefix.`
      );
    }
  }

  if (warnings.length > 0 && isProduction()) {
    console.error('[ENV SECURITY]', warnings.join('\n'));
  }

  return warnings;
}
