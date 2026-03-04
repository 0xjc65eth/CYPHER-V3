/**
 * Utility class for formatting numbers with proper notation and precision
 */
export class NumberFormatter {
  /**
   * Format currency values with proper notation
   */
  static formatCurrency(value: number, options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    notation?: 'standard' | 'compact' | 'scientific' | 'engineering';
    currency?: string;
  }): string {
    const defaultOptions = {
      style: 'currency',
      currency: options?.currency || 'USD',
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
      notation: options?.notation || 'standard' as const,
    };

    return new Intl.NumberFormat('en-US', defaultOptions as Intl.NumberFormatOptions).format(value);
  }

  /**
   * Format large numbers with compact notation
   */
  static formatCompact(value: number, decimals: number = 2): string {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(decimals)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(decimals)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(decimals)}K`;
    }
    return value.toFixed(decimals);
  }

  /**
   * Format percentage values
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  }

  /**
   * Format Bitcoin amounts with appropriate precision
   */
  static formatBitcoin(value: number, options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }): string {
    const decimals = value < 0.001 ? 8 : value < 0.01 ? 6 : value < 1 ? 4 : 2;
    return value.toFixed(
      options?.maximumFractionDigits ?? decimals
    );
  }

  /**
   * Format numbers with proper grouping
   */
  static formatNumber(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Truncate long strings with ellipsis
   */
  static truncateText(text: string, maxLength: number = 20): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  }

  /**
   * Format wallet addresses
   */
  static formatAddress(address: string, chars: number = 6): string {
    if (!address || address.length < chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }
}