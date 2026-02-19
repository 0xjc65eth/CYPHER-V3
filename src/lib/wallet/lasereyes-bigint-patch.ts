'use client';

let isPatched = false;

export const patchBigIntSerialization = async () => {
  if (typeof window === 'undefined' || isPatched) return;
  
  try {
    // Patch BigInt serialization
    (BigInt.prototype as any).toJSON = function() {
      return this.toString();
    };

    // Patch global JSON
    const originalStringify = JSON.stringify;
    JSON.stringify = function(...args) {
      const replacer = args[1];
      const newReplacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return replacer ? replacer(key, value) : value;
      };
      args[1] = newReplacer;
      return originalStringify.apply(this, args as any);
    };

    isPatched = true;
  } catch (error) {
    console.error('❌ Failed to patch BigInt:', error);
  }
};

export const importLaserEyes = async () => {
  try {
    await patchBigIntSerialization();
    
    
    // Usar fallback diretamente
    const fallbackModule = await import('./lasereyes-fallback');
    return fallbackModule;
  } catch (error) {
    console.error('❌ Erro crítico ao importar LaserEyes fallback:', error);
    throw error;
  }
};

// Aplicar patches ANTES de qualquer importação
export const applyLaserEyesPatch = () => {
  if (typeof window !== 'undefined') {
    (window as any).Math = patchedMath;
    
    // Interceptar operadores aritméticos - store original first
    const originalNumber = globalThis.Number;
    (window as any).Number = function(value: any) {
      if (typeof value === 'bigint') {
        return originalNumber(value.toString());
      }
      return originalNumber(value);
    };
    Object.setPrototypeOf((window as any).Number, originalNumber);
    
  }
};

// Auto-aplicar patch se estiver no browser
if (typeof window !== 'undefined') {
  applyLaserEyesPatch();
}

export default {
  safeLaserEyesImport,
  applyLaserEyesPatch,
  safeMath
};