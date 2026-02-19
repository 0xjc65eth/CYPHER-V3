// Simple BigInt fix for LaserEyes
// This fixes "Cannot mix BigInt and other types" errors

if (typeof window !== 'undefined') {
  // Store original valueOf
  const originalValueOf = BigInt.prototype.valueOf;
  
  // Override BigInt.prototype.valueOf to handle implicit conversions
  (BigInt.prototype as any).valueOf = function() {
    const value = originalValueOf.call(this);
    // For small BigInts, allow conversion to Number
    if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(value);
    }
    return value;
  };

  // Patch JSON.stringify to handle BigInt
  const originalStringify = JSON.stringify;
  JSON.stringify = function(value: any, replacer?: any, space?: any) {
    const bigintReplacer = (key: string, val: any) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      return val;
    };
    
    if (replacer) {
      const composedReplacer = (key: string, val: any) => {
        val = bigintReplacer(key, val);
        return replacer(key, val);
      };
      return originalStringify(value, composedReplacer, space);
    }
    
    return originalStringify(value, bigintReplacer, space);
  };

  // Simple conversion function
  (window as any).safeBigIntToNumber = function(value: any): number {
    if (typeof value === 'bigint') {
      if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(value);
      }
      return value > 0n ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
    }
    return Number(value);
  };

}