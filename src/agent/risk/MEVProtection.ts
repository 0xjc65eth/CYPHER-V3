/**
 * CYPHER AI Trading Agent - MEV Protection
 * Protects against sandwich attacks and frontrunning
 */

import { Order } from '../core/types';

export class MEVProtection {
  private readonly CHUNK_THRESHOLD_USD = 10000; // Split orders above $10k
  private readonly OPTIMAL_CHUNK_SIZE_USD = 5000;
  private readonly CHUNK_DELAY_MS = 2000; // 2 seconds between chunks

  // Determine if order needs MEV protection
  needsProtection(order: Order, network: string): boolean {
    // Large orders on EVM chains need protection
    if (network === 'ethereum' || network === 'arbitrum' || network === 'base') {
      return order.size * order.price > this.CHUNK_THRESHOLD_USD;
    }
    // Solana orders need Jito protection for large sizes
    if (network === 'solana') {
      return order.size * order.price > this.CHUNK_THRESHOLD_USD;
    }
    // Hyperliquid has built-in MEV protection
    return false;
  }

  // Split large orders into chunks to minimize price impact
  splitLargeOrder(order: Order): Order[] {
    const orderValueUSD = order.size * order.price;

    if (orderValueUSD <= this.CHUNK_THRESHOLD_USD) {
      return [order];
    }

    const numChunks = Math.ceil(orderValueUSD / this.OPTIMAL_CHUNK_SIZE_USD);
    const chunkSize = order.size / numChunks;

    return Array.from({ length: numChunks }, (_, i) => ({
      ...order,
      id: `${order.id}_chunk_${i}`,
      size: chunkSize,
      clientId: `${order.clientId}_${i}`,
    }));
  }

  // Get recommended slippage tolerance based on order size and liquidity
  getRecommendedSlippage(orderValueUSD: number, liquidityUSD: number): number {
    const impactRatio = orderValueUSD / liquidityUSD;

    if (impactRatio < 0.001) return 0.001; // 0.1% for tiny orders
    if (impactRatio < 0.01) return 0.005;  // 0.5% for small orders
    if (impactRatio < 0.05) return 0.01;   // 1% for medium orders
    return 0.02; // 2% max for large orders
  }

  // Calculate optimal execution strategy
  getExecutionStrategy(orderValueUSD: number, network: string): {
    method: 'direct' | 'chunked' | 'flashbots' | 'jito';
    chunks: number;
    delayMs: number;
    maxSlippage: number;
  } {
    if (network === 'hyperliquid') {
      return { method: 'direct', chunks: 1, delayMs: 0, maxSlippage: 0.001 };
    }

    if (orderValueUSD <= this.CHUNK_THRESHOLD_USD) {
      const method = network === 'solana' ? 'jito' : 'flashbots';
      return { method, chunks: 1, delayMs: 0, maxSlippage: 0.005 };
    }

    const chunks = Math.ceil(orderValueUSD / this.OPTIMAL_CHUNK_SIZE_USD);
    const method = network === 'solana' ? 'jito' : 'flashbots';
    return { method, chunks, delayMs: this.CHUNK_DELAY_MS, maxSlippage: 0.01 };
  }
}
