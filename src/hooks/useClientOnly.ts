/**
 * useClientOnly Hook
 *
 * Solves hydration mismatches by ensuring components only render client-side features
 * after the component has mounted in the browser.
 *
 * This prevents SSR/CSR mismatches when using:
 * - window object
 * - localStorage/sessionStorage
 * - Browser APIs (navigator, document, etc)
 * - Dynamic timestamps or random values
 *
 * @returns {boolean} true if component is mounted in browser, false during SSR
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isClient = useClientOnly();
 *
 *   if (!isClient) {
 *     return <Skeleton />; // or null
 *   }
 *
 *   // Now safe to use window, localStorage, etc
 *   const wallet = window.ethereum;
 *   return <div>{wallet ? 'Connected' : 'Connect Wallet'}</div>;
 * }
 * ```
 */

import { useEffect, useState } from 'react';

export function useClientOnly(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

/**
 * Alternative: useIsClient
 * Alias for useClientOnly for better semantics in some contexts
 */
export const useIsClient = useClientOnly;

/**
 * useHydrated Hook
 * Another semantic alias that emphasizes the hydration aspect
 */
export const useHydrated = useClientOnly;
