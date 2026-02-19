// BigInt Polyfill for LaserEyes compatibility
// Fixes "TypeError: Cannot convert a BigInt value to a number" errors

declare global {
  interface Window {
    __bigIntPolyfillApplied?: boolean;
  }
  
  interface Number {
    __isBigIntSafe?: boolean;
  }
}

// Store original functions
const originalMathPow = Math.pow;
const originalMathMax = Math.max;
const originalMathMin = Math.min;
const originalMathFloor = Math.floor;
const originalMathCeil = Math.ceil;
const originalMathRound = Math.round;
const originalParseInt = parseInt;
const originalParseFloat = parseFloat;
const originalNumber = Number;

// Safe BigInt to Number conversion with precision checking
function safeToNumber(value: any): number {
  if (typeof value === 'bigint') {
    // Convert BigInt to Number safely
    const stringValue = value.toString();
    
    // Check if it's within safe integer range
    if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
      // Use originalNumber to avoid recursion
      return originalNumber(value);
    }
    
    // For large BigInts, try to preserve as much precision as possible
    const parsed = originalParseFloat(stringValue);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
    
    // Fallback: return a reasonable number based on sign
    return value > 0n ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
  }
  
  if (typeof value === 'string' && /^\d+n?$/.test(value)) {
    // Handle string representations of BigInt
    const cleanValue = value.replace(/n$/, '');
    return safeToNumber(BigInt(cleanValue));
  }
  
  // Use originalNumber to avoid recursion
  return originalNumber(value);
}

// Enhanced type checking
function isBigIntLike(value: any): boolean {
  return typeof value === 'bigint' || 
         (typeof value === 'string' && /^\d+n$/.test(value)) ||
         (typeof value === 'object' && value !== null && value.constructor?.name === 'BigInt');
}

// Safe arithmetic operations
function safeBigIntOperation(operation: Function, ...args: any[]): any {
  try {
    const safeArgs = args.map(arg => {
      if (isBigIntLike(arg)) {
        return safeToNumber(arg);
      }
      return arg;
    });
    
    return operation.apply(null, safeArgs);
  } catch (error) {
    return 0;
  }
}

// Patched Math functions that handle BigInt
function patchedMathPow(base: any, exponent: any): number {
  return safeBigIntOperation(originalMathPow, base, exponent);
}

function patchedMathMax(...values: any[]): number {
  return safeBigIntOperation(originalMathMax, ...values);
}

function patchedMathMin(...values: any[]): number {
  return safeBigIntOperation(originalMathMin, ...values);
}

function patchedMathFloor(value: any): number {
  return safeBigIntOperation(originalMathFloor, value);
}

function patchedMathCeil(value: any): number {
  return safeBigIntOperation(originalMathCeil, value);
}

function patchedMathRound(value: any): number {
  return safeBigIntOperation(originalMathRound, value);
}

function patchedParseInt(value: any, radix?: number): number {
  if (isBigIntLike(value)) {
    return safeToNumber(value);
  }
  return originalParseInt(value, radix);
}

function patchedParseFloat(value: any): number {
  if (isBigIntLike(value)) {
    return safeToNumber(value);
  }
  return originalParseFloat(value);
}

// Enhanced JSON stringify/parse for BigInt
const originalJSONStringify = JSON.stringify;
const originalJSONParse = JSON.parse;

function patchedJSONStringify(value: any, replacer?: any, space?: any): string {
  const bigIntReplacer = (key: string, val: any) => {
    if (typeof val === 'bigint') {
      return val.toString() + 'n';
    }
    if (replacer && typeof replacer === 'function') {
      return replacer(key, val);
    }
    return val;
  };
  
  return originalJSONStringify(value, bigIntReplacer, space);
}

function patchedJSONParse(text: string, reviver?: any): any {
  const bigIntReviver = (key: string, val: any) => {
    if (typeof val === 'string' && /^\d+n$/.test(val)) {
      return BigInt(val.slice(0, -1));
    }
    if (reviver && typeof reviver === 'function') {
      return reviver(key, val);
    }
    return val;
  };
  
  return originalJSONParse(text, bigIntReviver);
}

// DO NOT USE - This complex polyfill causes recursion issues
export function applyBigIntPolyfill(): void {
  // Intentionally empty - use the simple polyfill below instead
}

// Remove polyfill (for cleanup)
export function removeBigIntPolyfill(): void {
  if (typeof window !== 'undefined' && window.__bigIntPolyfillApplied) {
    // Restore original Math functions
    Math.pow = originalMathPow;
    Math.max = originalMathMax;
    Math.min = originalMathMin;
    Math.floor = originalMathFloor;
    Math.ceil = originalMathCeil;
    Math.round = originalMathRound;
    
    // Restore global functions
    (window as any).parseInt = originalParseInt;
    (window as any).parseFloat = originalParseFloat;
    
    // Restore JSON functions
    JSON.stringify = originalJSONStringify;
    JSON.parse = originalJSONParse;
    
    // Mark as removed
    window.__bigIntPolyfillApplied = false;
    
  }
}

// The simplified polyfill has been moved to simple-bigint-polyfill.ts

// DO NOT auto-apply the complex polyfill - only the simple one below runs