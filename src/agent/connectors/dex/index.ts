/**
 * DEX Fee Collectors - Unified Exports
 *
 * Three fee collection methods, one per chain family:
 * - Jupiter (Solana): Native platformFeeBps
 * - 1inch/Paraswap (EVM): Native referrer/partner fees
 * - PSBT Output (Bitcoin): Extra output in transaction
 *
 * All methods are FREE - no smart contracts needed.
 */

export {
  getJupiterQuote,
  getJupiterSwapTransaction,
  executeJupiterSwapWithFee,
  calculateJupiterFee,
  getFeeWalletAddress as getSolanaFeeWallet,
} from './JupiterFeeCollector';

export {
  get1inchQuote,
  get1inchSwap,
  getParaswapPrice,
  getParaswapSwapTx,
  getBestEVMQuote,
  getEVMFeeWallet,
  SUPPORTED_EVM_CHAINS,
} from './SwapFeeCollector';

export {
  calculateBitcoinFee,
  getBitcoinFeeOutput,
  validateFeeInPSBT,
  getBitcoinFeeAddress,
  estimateFeeUSD as estimateBtcFeeUSD,
} from './BitcoinFeeCollector';
