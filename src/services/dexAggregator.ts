/**
 * 🔄 DEX Aggregator Service - CYPHER ORDI FUTURE V3.0
 * Real DEX integration with 1inch, Jupiter, Uniswap, and more
 */

import axios from 'axios';
import { ethers } from 'ethers';
import { getDexFeeRate, MAX_FEE_USD } from '@/config/fee-config';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
}

export interface QuoteRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  chainId: number;
  slippage?: number;
  userAddress?: string;
  isPremium?: boolean;
}

export interface QuoteResponse {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  protocols: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
  tx?: {
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: string;
  };
  cypherFee: string;
  cypherFeeUSD: string;
}

export interface DEXPrice {
  dex: string;
  price: number;
  amount: string;
  fee: number;
  slippage: number;
  liquidity: number;
}

class DEXAggregatorService {
  
  // Chain configurations
  private readonly CHAIN_CONFIG = {
    1: { // Ethereum
      name: 'Ethereum',
      rpcUrl: 'https://eth.llamarpc.com',
      oneInchApi: 'https://api.1inch.dev/swap/v6.0/1',
      nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    },
    137: { // Polygon
      name: 'Polygon',
      rpcUrl: 'https://polygon.llamarpc.com',
      oneInchApi: 'https://api.1inch.dev/swap/v6.0/137',
      nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    },
    56: { // BSC
      name: 'BSC',
      rpcUrl: 'https://bsc.llamarpc.com',
      oneInchApi: 'https://api.1inch.dev/swap/v6.0/56',
      nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    },
    43114: { // Avalanche
      name: 'Avalanche',
      rpcUrl: 'https://avalanche.llamarpc.com',
      oneInchApi: 'https://api.1inch.dev/swap/v6.0/43114',
      nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    }
  };

  // DEX APIs and endpoints
  private readonly DEX_APIS = {
    '1inch': {
      url: 'https://api.1inch.dev/swap/v6.0',
      headers: {
        'Authorization': 'Bearer demo_key', // Use real API key in production
        'accept': 'application/json'
      }
    },
    'paraswap': {
      url: 'https://apiv5.paraswap.io',
      headers: {
        'accept': 'application/json'
      }
    },
    'jupiter': {
      url: 'https://quote-api.jup.ag/v6',
      headers: {
        'accept': 'application/json'
      }
    }
  };

  /**
   * Get the best quote from multiple DEXs
   */
  async getBestQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      console.log('🔄 Getting best quote for:', request);

      // Get quotes from multiple DEXs in parallel
      const [oneInchQuote, paraswapQuote, jupiterQuote] = await Promise.allSettled([
        this.get1InchQuote(request),
        this.getParaswapQuote(request),
        request.chainId === 1 ? this.getJupiterQuote(request) : null // Jupiter for Solana
      ]);

      const quotes = [
        oneInchQuote.status === 'fulfilled' ? oneInchQuote.value : null,
        paraswapQuote.status === 'fulfilled' ? paraswapQuote.value : null,
        jupiterQuote?.status === 'fulfilled' ? jupiterQuote.value : null
      ].filter(Boolean);

      if (quotes.length === 0) {
        throw new Error('No quotes available from any DEX');
      }

      // Find the best quote (highest output amount)
      const bestQuote = quotes.reduce((best, current) => 
        parseFloat(current!.toAmount) > parseFloat(best!.toAmount) ? current : best
      );

      // Calculate Cypher fee
      const cypherFee = this.calculateCypherFee(bestQuote!.toAmount, bestQuote!.toToken, request.isPremium);

      return {
        ...bestQuote!,
        cypherFee: cypherFee.fee,
        cypherFeeUSD: cypherFee.feeUSD
      };

    } catch (error) {
      console.error('❌ Error getting best quote:', error);
      throw new Error(`Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quote from 1inch
   */
  private async get1InchQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    try {
      const chainConfig = this.CHAIN_CONFIG[request.chainId as keyof typeof this.CHAIN_CONFIG];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${request.chainId}`);
      }

      // Get swap data from 1inch
      const swapParams = new URLSearchParams({
        src: request.fromTokenAddress,
        dst: request.toTokenAddress,
        amount: request.amount,
        from: request.userAddress || '0x0000000000000000000000000000000000000000',
        slippage: (request.slippage || 1).toString(),
        disableEstimate: 'true'
      });

      const response = await axios.get(`${chainConfig.oneInchApi}/swap?${swapParams}`, {
        headers: this.DEX_APIS['1inch'].headers,
        timeout: 10000
      });

      if (!response.data) {
        throw new Error('No data received from 1inch');
      }

      const data = response.data;

      return {
        fromToken: data.fromToken,
        toToken: data.toToken,
        fromAmount: data.fromTokenAmount,
        toAmount: data.toTokenAmount,
        estimatedGas: data.tx?.gas || '200000',
        protocols: data.protocols || [{
          name: '1inch',
          part: 100,
          fromTokenAddress: request.fromTokenAddress,
          toTokenAddress: request.toTokenAddress
        }],
        tx: data.tx,
        cypherFee: '0',
        cypherFeeUSD: '0'
      };

    } catch (error) {
      console.warn('⚠️ 1inch quote failed:', error);
      return null;
    }
  }

  /**
   * Get quote from Paraswap
   */
  private async getParaswapQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    try {
      // Get price from Paraswap
      const priceParams = new URLSearchParams({
        srcToken: request.fromTokenAddress,
        destToken: request.toTokenAddress,
        amount: request.amount,
        network: request.chainId.toString(),
        side: 'SELL'
      });

      const priceResponse = await axios.get(`${this.DEX_APIS.paraswap.url}/prices?${priceParams}`, {
        headers: this.DEX_APIS.paraswap.headers,
        timeout: 10000
      });

      if (!priceResponse.data?.priceRoute) {
        throw new Error('No price route from Paraswap');
      }

      const priceRoute = priceResponse.data.priceRoute;

      return {
        fromToken: {
          address: request.fromTokenAddress,
          symbol: priceRoute.srcToken.symbol,
          name: priceRoute.srcToken.name || priceRoute.srcToken.symbol,
          decimals: priceRoute.srcToken.decimals,
          chainId: request.chainId
        },
        toToken: {
          address: request.toTokenAddress,
          symbol: priceRoute.destToken.symbol,
          name: priceRoute.destToken.name || priceRoute.destToken.symbol,
          decimals: priceRoute.destToken.decimals,
          chainId: request.chainId
        },
        fromAmount: priceRoute.srcAmount,
        toAmount: priceRoute.destAmount,
        estimatedGas: priceRoute.gasCost || '200000',
        protocols: priceRoute.bestRoute?.map((route: any) => ({
          name: route.exchange,
          part: route.percent,
          fromTokenAddress: request.fromTokenAddress,
          toTokenAddress: request.toTokenAddress
        })) || [{
          name: 'Paraswap',
          part: 100,
          fromTokenAddress: request.fromTokenAddress,
          toTokenAddress: request.toTokenAddress
        }],
        cypherFee: '0',
        cypherFeeUSD: '0'
      };

    } catch (error) {
      console.warn('⚠️ Paraswap quote failed:', error);
      return null;
    }
  }

  /**
   * Get quote from Jupiter (Solana)
   */
  private async getJupiterQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    try {
      // Jupiter is for Solana, only use if chainId indicates Solana
      if (request.chainId !== 101) { // Solana mainnet
        return null;
      }

      const quoteParams = new URLSearchParams({
        inputMint: request.fromTokenAddress,
        outputMint: request.toTokenAddress,
        amount: request.amount,
        slippageBps: ((request.slippage || 1) * 100).toString()
      });

      const response = await axios.get(`${this.DEX_APIS.jupiter.url}/quote?${quoteParams}`, {
        headers: this.DEX_APIS.jupiter.headers,
        timeout: 10000
      });

      if (!response.data) {
        throw new Error('No data received from Jupiter');
      }

      const data = response.data;

      return {
        fromToken: {
          address: request.fromTokenAddress,
          symbol: 'TOKEN',
          name: 'Token',
          decimals: 9,
          chainId: 101
        },
        toToken: {
          address: request.toTokenAddress,
          symbol: 'TOKEN',
          name: 'Token',
          decimals: 9,
          chainId: 101
        },
        fromAmount: data.inAmount,
        toAmount: data.outAmount,
        estimatedGas: '200000',
        protocols: data.routePlan?.map((route: any) => ({
          name: route.swapInfo.ammKey,
          part: 100 / data.routePlan.length,
          fromTokenAddress: request.fromTokenAddress,
          toTokenAddress: request.toTokenAddress
        })) || [{
          name: 'Jupiter',
          part: 100,
          fromTokenAddress: request.fromTokenAddress,
          toTokenAddress: request.toTokenAddress
        }],
        cypherFee: '0',
        cypherFeeUSD: '0'
      };

    } catch (error) {
      console.warn('⚠️ Jupiter quote failed:', error);
      return null;
    }
  }

  /**
   * Calculate Cypher fee with USD cap
   */
  private calculateCypherFee(toAmount: string, toToken: TokenInfo, isPremium?: boolean): { fee: string; feeUSD: string } {
    try {
      const feeRate = getDexFeeRate(isPremium ?? false);
      if (feeRate === 0) {
        return { fee: '0', feeUSD: '0' };
      }

      const amount = parseFloat(toAmount);
      const feeAmount = amount * feeRate;

      // For stablecoins, assume 1:1 USD ratio
      const isStablecoin = ['USDT', 'USDC', 'DAI', 'BUSD'].includes(toToken.symbol.toUpperCase());
      const estimatedUSD = isStablecoin ? feeAmount : feeAmount * 2000; // Rough ETH price estimate

      // Apply USD cap
      const cappedFeeUSD = Math.min(estimatedUSD, MAX_FEE_USD);
      const cappedFee = isStablecoin ? cappedFeeUSD : cappedFeeUSD / 2000;

      return {
        fee: cappedFee.toFixed(8),
        feeUSD: cappedFeeUSD.toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating Cypher fee:', error);
      return { fee: '0', feeUSD: '0' };
    }
  }

  /**
   * Get multiple DEX prices for comparison
   */
  async getMultipleDEXPrices(request: QuoteRequest): Promise<DEXPrice[]> {
    try {
      const quotes = await Promise.allSettled([
        this.get1InchQuote(request),
        this.getParaswapQuote(request)
      ]);

      const prices: DEXPrice[] = [];

      quotes.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const quote = result.value;
          const dexName = index === 0 ? '1inch' : 'Paraswap';
          
          prices.push({
            dex: dexName,
            price: parseFloat(quote.toAmount) / parseFloat(quote.fromAmount),
            amount: quote.toAmount,
            fee: 0.003, // 0.3% typical DEX fee
            slippage: request.slippage || 1,
            liquidity: 1000000 // Mock liquidity
          });
        }
      });

      return prices.sort((a, b) => b.price - a.price); // Sort by best price
    } catch (error) {
      console.error('Error getting multiple DEX prices:', error);
      return [];
    }
  }

  /**
   * Get token list for a specific chain
   */
  async getTokenList(chainId: number): Promise<TokenInfo[]> {
    try {
      const chainConfig = this.CHAIN_CONFIG[chainId as keyof typeof this.CHAIN_CONFIG];
      if (!chainConfig) {
        return [];
      }

      // Use 1inch token list
      const response = await axios.get(`${chainConfig.oneInchApi}/tokens`, {
        headers: this.DEX_APIS['1inch'].headers,
        timeout: 10000
      });

      const tokens = Object.values(response.data.tokens) as any[];
      
      return tokens.map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        chainId
      }));

    } catch (error) {
      console.error('Error getting token list:', error);
      // Return common tokens as fallback
      return this.getCommonTokens(chainId);
    }
  }

  /**
   * Get common tokens for fallback
   */
  private getCommonTokens(chainId: number): TokenInfo[] {
    const commonTokens: Record<number, TokenInfo[]> = {
      1: [ // Ethereum
        {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: 1
        },
        {
          address: '0xA0b86a33E6441d5a9d29BFC3a2C45e9e7e90d0f7',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 1
        },
        {
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          chainId: 1
        }
      ],
      137: [ // Polygon
        {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'MATIC',
          name: 'Polygon',
          decimals: 18,
          chainId: 137
        }
      ],
      56: [ // BSC
        {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'BNB',
          name: 'Binance Coin',
          decimals: 18,
          chainId: 56
        }
      ]
    };

    return commonTokens[chainId] || [];
  }
}

export const dexAggregator = new DEXAggregatorService();