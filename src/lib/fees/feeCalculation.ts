/**
 * Fee Calculation Engine for CYPHER TRADE
 * Calculates the 0.34% CYPHER fee for all transactions
 */

export interface FeeCalculationRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  network: string;
  slippage?: number;
  deadline?: number;
}

export interface FeeCalculation {
  cypherFee: {
    amount: string;
    amountUSD: number;
    percentage: number;
    recipient: string;
  };
  dexFees: Array<{
    dex: string;
    amount: string;
    amountUSD: number;
    percentage: number;
  }>;
  gasFees: {
    estimatedGas: string;
    gasPrice: string;
    gasCostUSD: number;
  };
  bridgeFees?: {
    amount: string;
    amountUSD: number;
    fromChain: string;
    toChain: string;
  };
  totalFeeUSD: number;
  totalFeePercentage: number;
}

// CYPHER fee rate: 0.35% (updated for redirection fees system)
export const CYPHER_FEE_RATE = 0.0035;

// Fee recipient addresses
const FEE_RECIPIENTS = {
  ethereum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  arbitrum: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  optimism: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  polygon: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  base: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  avalanche: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  bsc: '0xAE3642A03a1e4bd7AB7D919d14C54ECf1BFdddd3',
  solana: '4boXQgNDQ91UNmeVspdd1wZw2KkQKAZ2xdAd6UyJCwRH',
  bitcoin: '358ecZEHxZQJGj6fvoy7bdTSvw64WWgGFb'
};

/**
 * Calculate fees for a trade
 */
export async function calculateFees(request: FeeCalculationRequest): Promise<FeeCalculation> {
  const { tokenIn, tokenOut, amountIn, network } = request;
  
  // Mock token price (in production, fetch from price oracle)
  const tokenPrice = 2000; // $2000 per token
  const amountInUSD = parseFloat(amountIn) * tokenPrice;
  
  // Calculate CYPHER fee (0.35%)
  const cypherFeeUSD = amountInUSD * CYPHER_FEE_RATE;
  const cypherFeeAmount = cypherFeeUSD / tokenPrice;
  
  // Get recipient address for network
  const recipient = FEE_RECIPIENTS[network as keyof typeof FEE_RECIPIENTS] || FEE_RECIPIENTS.ethereum;
  
  // Mock DEX fees (would be calculated from actual DEX quotes)
  const dexFees = [
    {
      dex: 'Uniswap V3',
      amount: (parseFloat(amountIn) * 0.003).toString(), // 0.3%
      amountUSD: amountInUSD * 0.003,
      percentage: 0.3
    }
  ];
  
  // Mock gas fees
  const gasFees = {
    estimatedGas: '150000',
    gasPrice: '20000000000', // 20 gwei
    gasCostUSD: 25 // $25
  };
  
  // Calculate totals
  const totalDexFeesUSD = dexFees.reduce((sum, fee) => sum + fee.amountUSD, 0);
  const totalFeeUSD = cypherFeeUSD + totalDexFeesUSD + gasFees.gasCostUSD;
  const totalFeePercentage = (totalFeeUSD / amountInUSD) * 100;
  
  return {
    cypherFee: {
      amount: cypherFeeAmount.toString(),
      amountUSD: cypherFeeUSD,
      percentage: CYPHER_FEE_RATE * 100,
      recipient
    },
    dexFees,
    gasFees,
    totalFeeUSD,
    totalFeePercentage
  };
}

/**
 * Calculate just the CYPHER fee
 */
export function calculateCypherFee(amountUSD: number): number {
  return amountUSD * CYPHER_FEE_RATE;
}

/**
 * Get fee percentage as text
 */
export function getFeePercentageText(): string {
  return `${(CYPHER_FEE_RATE * 100).toFixed(2)}%`;
}

export default {
  calculateFees,
  calculateCypherFee,
  getFeePercentageText,
  CYPHER_FEE_RATE
};