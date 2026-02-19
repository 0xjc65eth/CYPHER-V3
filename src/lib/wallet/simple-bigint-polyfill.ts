/**
 * Simple BigInt Polyfill para LaserEyes
 * Versão simplificada que evita loops infinitos
 */

// Função utilitária para conversão segura
export const safeBigInt = (value: any): bigint => {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    if (typeof value === 'string') return BigInt(value);
    return BigInt(0);
  } catch (error) {
    return BigInt(0);
  }
};

// Função para formatação segura de BigInt
export const formatBigInt = (value: bigint | number, decimals: number = 8): string => {
  try {
    const bigintValue = safeBigInt(value);
    const divisor = safeBigInt(Math.pow(10, decimals));
    const quotient = bigintValue / divisor;
    const remainder = bigintValue % divisor;
    
    if (remainder === BigInt(0)) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    return `${quotient}.${remainderStr}`.replace(/\.?0+$/, '');
  } catch (error) {
    return '0';
  }
};

// Operações aritméticas seguras
export const bigIntMath = {
  add: (a: any, b: any): bigint => safeBigInt(a) + safeBigInt(b),
  subtract: (a: any, b: any): bigint => safeBigInt(a) - safeBigInt(b),
  multiply: (a: any, b: any): bigint => safeBigInt(a) * safeBigInt(b),
  divide: (a: any, b: any): bigint => {
    const divisor = safeBigInt(b);
    if (divisor === BigInt(0)) {
      return BigInt(0);
    }
    return safeBigInt(a) / divisor;
  },
  max: (...args: any[]): bigint => {
    const bigints = args.map(safeBigInt);
    return bigints.reduce((max, current) => current > max ? current : max);
  },
  min: (...args: any[]): bigint => {
    const bigints = args.map(safeBigInt);
    return bigints.reduce((min, current) => current < min ? current : min);
  }
};

// Inicialização simples do polyfill
export const initializeSimpleBigIntPolyfill = () => {
  if (typeof window !== 'undefined') {
    // Aplicar patches no window para compatibilidade com LaserEyes
    (window as any).safeBigInt = safeBigInt;
    (window as any).formatBigInt = formatBigInt;
    (window as any).bigIntMath = bigIntMath;
    
  }
};

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  initializeSimpleBigIntPolyfill();
}

export default {
  safeBigInt,
  formatBigInt,
  bigIntMath,
  initializeSimpleBigIntPolyfill
};