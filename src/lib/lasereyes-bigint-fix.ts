'use client'

// LaserEyes BigInt fix — patches Math.pow only on the client.
// Number constructor is NOT overridden (breaks React internals and third-party libs).
if (typeof window !== 'undefined') {
  const originalMathPow = Math.pow;

  Math.pow = function (base: any, exponent: any): number {
    try {
      if (typeof base === 'bigint') base = Number(base);
      if (typeof exponent === 'bigint') exponent = Number(exponent);
      return originalMathPow.call(this, base, exponent);
    } catch {
      return 0;
    }
  };
}

export {};
