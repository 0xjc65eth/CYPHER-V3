/**
 * BigInt safety fix — patches Math functions to tolerate BigInt arguments.
 * Does NOT override Number constructor or BigInt.prototype.valueOf
 * (those cause infinite recursion and break third-party code).
 */

if (typeof globalThis !== 'undefined' && !(globalThis as any).__BIGINT_FIXED__) {
  (globalThis as any).__BIGINT_FIXED__ = true;

  function safeBigIntToNumber(value: any): number {
    if (typeof value === 'bigint') {
      try {
        const n = Number(value);
        if (!isFinite(n)) return 0;
        return n;
      } catch {
        return 0;
      }
    }
    if (typeof value === 'number') {
      return isFinite(value) && !isNaN(value) ? value : 0;
    }
    try {
      const num = Number(value);
      return isFinite(num) && !isNaN(num) ? num : 0;
    } catch {
      return 0;
    }
  }

  const _pow = Math.pow;
  const _max = Math.max;
  const _min = Math.min;
  const _floor = Math.floor;
  const _ceil = Math.ceil;
  const _round = Math.round;
  const _abs = Math.abs;

  Math.pow = function (base: any, exp: any) {
    try { return _pow(safeBigIntToNumber(base), safeBigIntToNumber(exp)); } catch { return 0; }
  };
  Math.max = function (...v: any[]) {
    try { return _max(...v.map(safeBigIntToNumber)); } catch { return 0; }
  };
  Math.min = function (...v: any[]) {
    try { return _min(...v.map(safeBigIntToNumber)); } catch { return 0; }
  };
  Math.floor = function (v: any) {
    try { return _floor(safeBigIntToNumber(v)); } catch { return 0; }
  };
  Math.ceil = function (v: any) {
    try { return _ceil(safeBigIntToNumber(v)); } catch { return 0; }
  };
  Math.round = function (v: any) {
    try { return _round(safeBigIntToNumber(v)); } catch { return 0; }
  };
  Math.abs = function (v: any) {
    try { return _abs(safeBigIntToNumber(v)); } catch { return 0; }
  };
}

export default {};
