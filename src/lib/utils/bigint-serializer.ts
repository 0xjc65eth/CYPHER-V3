/**
 * BigInt Serialization Utilities
 *
 * Solves the problem of JSON.stringify() failing with BigInt values
 * Used across all API routes that return blockchain data
 */

import { NextResponse } from 'next/server';

/**
 * Serializes an object containing BigInt values to JSON-safe format
 * Converts BigInt to string to prevent JSON.stringify errors
 *
 * @param data - Any object that may contain BigInt values
 * @returns The same object with BigInt values converted to strings
 *
 * @example
 * ```typescript
 * const data = { amount: 1000000000000n, count: 42 };
 * const safe = serializeBigInt(data);
 * // Result: { amount: "1000000000000", count: 42 }
 * ```
 */
export function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

/**
 * Creates a NextResponse with automatic BigInt serialization
 * Drop-in replacement for NextResponse.json() that handles BigInt
 *
 * @param data - Response data (may contain BigInt)
 * @param init - Response init options (status, headers, etc)
 * @returns NextResponse with serialized data
 *
 * @example
 * ```typescript
 * // Before (crashes with BigInt):
 * return NextResponse.json({ satoshis: 100000000n });
 *
 * // After (works correctly):
 * return createSafeBigIntResponse({ satoshis: 100000000n });
 * ```
 */
export function createSafeBigIntResponse<T>(
  data: T,
  init?: ResponseInit
): NextResponse {
  const serialized = serializeBigInt(data);
  return NextResponse.json(serialized, init);
}

/**
 * Type guard to check if a value is BigInt
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Safely converts a value to BigInt, handling strings and numbers
 * Returns null if conversion fails
 */
export function toBigInt(value: string | number | bigint | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Formats a BigInt as a human-readable string with separators
 *
 * @example
 * formatBigInt(1000000n) // "1,000,000"
 */
export function formatBigInt(value: bigint, locale: string = 'en-US'): string {
  return value.toLocaleString(locale);
}
