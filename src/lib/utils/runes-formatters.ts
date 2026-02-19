/**
 * Shared formatting utilities for Runes components
 * Centralizes duplicated formatNumber, timeAgo, truncateAddress, etc.
 */

/**
 * Format large numbers into compact form (1.2M, 3.5K, etc.)
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * Format supply values (string input, handles B/M/K)
 */
export function formatSupply(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toLocaleString();
}

/**
 * Format a price in sats to BTC string
 */
export function formatSatsToBtc(sats: number, decimals: number = 8): string {
  return (sats / 100_000_000).toFixed(decimals);
}

/**
 * Format a BTC amount to approximate USD (using provided BTC price)
 */
export function formatBtcToUsd(btcAmount: number, btcPrice: number = 65000): string {
  return `$${(btcAmount * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Relative time from timestamp (number ms)
 */
export function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 0) return '--';
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Relative time from ISO string or date string
 */
export function timeAgoFromString(timestamp: string | null | undefined): string {
  if (!timestamp) return '--';
  const then = new Date(timestamp).getTime();
  if (isNaN(then)) return '--';
  const diff = Date.now() - then;
  if (diff < 0 || diff > 365 * 86_400_000) return '--';
  return timeAgo(then);
}

/**
 * Truncate a Bitcoin address for display
 */
export function truncateAddress(addr: string, prefixLen: number = 8, suffixLen: number = 6): string {
  if (addr.length <= prefixLen + suffixLen + 3) return addr;
  return `${addr.slice(0, prefixLen)}...${addr.slice(-suffixLen)}`;
}

/**
 * Truncate a transaction ID for display
 */
export function truncateTxId(txId: string, prefixLen: number = 8, suffixLen: number = 6): string {
  if (!txId || txId.length < prefixLen + suffixLen + 3) return txId || '---';
  return `${txId.slice(0, prefixLen)}...${txId.slice(-suffixLen)}`;
}

/**
 * Validate Bitcoin address format
 */
export function isValidBtcAddress(addr: string): boolean {
  if (!addr || addr === 'Unknown') return false;
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/.test(addr);
}

/**
 * Validate Bitcoin transaction ID format (64 char hex)
 */
export function isValidTxid(txid: string): boolean {
  if (!txid) return false;
  return /^[0-9a-fA-F]{64}$/.test(txid);
}

/**
 * Color helpers for spread/profit values
 */
export function spreadColor(spread: number): string {
  if (spread > 5) return 'text-green-400';
  if (spread >= 2) return 'text-yellow-400';
  return 'text-gray-400';
}

export function profitColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-gray-400';
}
