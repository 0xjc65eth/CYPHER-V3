'use client'

// Fix for LaserEyes BigInt to number conversion errors
if (typeof window !== 'undefined') {
  // Store the original Math.pow function
  const originalMathPow = Math.pow;

  // Create a safe version that handles BigInt
  Math.pow = function(base: any, exponent: any): number {
    try {
      // Convert BigInt to number if needed
      if (typeof base === 'bigint') {
        base = Number(base);
      }
      if (typeof exponent === 'bigint') {
        exponent = Number(exponent);
      }

      // Check for safe conversion
      if (base > Number.MAX_SAFE_INTEGER || exponent > Number.MAX_SAFE_INTEGER) {
        return Number.POSITIVE_INFINITY;
      }

      return originalMathPow.call(this, base, exponent);
    } catch (error) {
      console.error('Math.pow BigInt conversion error:', error);
      return 0;
    }
  };

  // Also patch Number constructor to handle BigInt more gracefully
  const originalNumber = Number;
  (window as any).Number = function(value: any) {
    if (typeof value === 'bigint') {
      // Handle large BigInt values
      if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number.MAX_SAFE_INTEGER;
      }
      if (value < BigInt(Number.MIN_SAFE_INTEGER)) {
        return Number.MIN_SAFE_INTEGER;
      }
    }
    return originalNumber(value);
  };

  // Copy static properties
  Object.setPrototypeOf((window as any).Number, originalNumber);
  Object.defineProperties((window as any).Number, Object.getOwnPropertyDescriptors(originalNumber));

}

export {};