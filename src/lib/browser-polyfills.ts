'use client'

// Browser polyfills - ONLY run on client side
// IMPORTANT: Never create fake window/document on the server.
// That breaks typeof window checks and causes hydration mismatches.
if (typeof window !== 'undefined' && typeof self === 'undefined') {
  (globalThis as any).self = globalThis;
}

export {};
