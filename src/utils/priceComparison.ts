/**
 * Price Comparison Utility Functions
 *
 * Formatting helpers used by QuickTradeInterface and other trading UI components.
 */

export function formatPriceImpact(impact: number): string {
  return `${impact > 0 ? '+' : ''}${impact.toFixed(2)}%`;
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-500';
  if (confidence >= 0.7) return 'text-yellow-500';
  return 'text-red-500';
}

export function formatExecutionTime(timeMs: number): string {
  if (timeMs < 1000) return `${timeMs}ms`;
  return `${(timeMs / 1000).toFixed(1)}s`;
}

export function formatSlippage(slippage: number): string {
  return `${slippage.toFixed(3)}%`;
}

export function getRiskColor(risk: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (risk) {
    case 'LOW': return 'text-green-500';
    case 'MEDIUM': return 'text-yellow-500';
    case 'HIGH': return 'text-red-500';
    default: return 'text-gray-500';
  }
}
