/**
 * Fee Addresses Management for CYPHER TRADE
 * Manages fee collection addresses across different networks
 */

export interface FeeAddresses {
  ethereum: string;
  arbitrum: string;
  optimism: string;
  polygon: string;
  base: string;
  avalanche: string;
  bsc: string;
  solana: string;
  bitcoin: string;
}

const CYPHER_FEE_ADDRESSES: FeeAddresses = {
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
 * Get fee addresses for specific network or all networks
 */
export function getFeeAddresses(network?: string): FeeAddresses | string {
  if (network && network in CYPHER_FEE_ADDRESSES) {
    return CYPHER_FEE_ADDRESSES[network as keyof FeeAddresses];
  }
  return CYPHER_FEE_ADDRESSES;
}

/**
 * Get fee address for specific network
 */
export function getFeeAddress(network: keyof FeeAddresses): string {
  return CYPHER_FEE_ADDRESSES[network];
}

/**
 * Validate if network is supported
 */
export function isNetworkSupported(network: string): boolean {
  return network in CYPHER_FEE_ADDRESSES;
}

export default {
  getFeeAddresses,
  getFeeAddress,
  isNetworkSupported,
  CYPHER_FEE_ADDRESSES
};