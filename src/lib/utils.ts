import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export formatters for convenience
export { formatCurrency, formatPercent, formatPercentage, formatNumber } from '@/utils/formatters';
