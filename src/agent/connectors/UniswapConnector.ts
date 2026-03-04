/**
 * CYPHER AI Trading Agent - Uniswap/EVM DEX Connector
 * Handles swaps via 1inch/Paraswap and LP via Uniswap V3
 * Non-custodial: uses session wallet (ethers.Wallet) for signing
 */

import { ethers } from 'ethers';
import { Candle, Position, LPPosition } from '../core/types';
import {
  BaseConnector,
  ConnectorCapabilities,
  ConnectorConfig,
  OrderParams,
  OrderResult,
  OrderBookData,
  BalanceInfo,
  LPCreateParams,
  LPCollectResult,
} from './BaseConnector';
import { CircuitBreaker, createAPICircuitBreaker } from '@/lib/circuit-breaker/CircuitBreaker';

export interface UniswapConfig extends ConnectorConfig {
  rpcUrl: string;
  chainId: number;
  sessionPrivateKey?: string;
  oneInchApiKey?: string;
}

// Common EVM token addresses (Ethereum mainnet)
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  1: { // Ethereum
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  8453: { // Base
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
  },
  42161: { // Arbitrum
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  },
};

// Uniswap V3 contract addresses
const UNISWAP_CONTRACTS: Record<number, { factory: string; router: string; positionManager: string }> = {
  1: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  },
  8453: {
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    positionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  },
  42161: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  },
};

export class UniswapConnector extends BaseConnector {
  private rpcUrl: string;
  private chainId: number;
  private sessionKey: string | null = null;
  private oneInchApiKey: string | null = null;
  private circuitBreaker: CircuitBreaker;

  constructor(config: UniswapConfig) {
    super({ ...config, name: config.name || 'Uniswap', chain: 'evm' });
    this.rpcUrl = config.rpcUrl;
    this.chainId = config.chainId || 1;
    this.sessionKey = config.sessionPrivateKey || null;
    this.oneInchApiKey = config.oneInchApiKey || null;
    this.circuitBreaker = createAPICircuitBreaker('uniswap', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 15000,
    });
  }

  private async fetchWithTimeout(url: string, options?: RequestInit, timeoutMs: number = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  }

  async connect(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: [],
        }),
      }, 5000);
      const data = await response.json();
      const chainId = parseInt(data.result, 16);

      if (chainId !== this.chainId) {
        throw new Error(`Chain mismatch: expected ${this.chainId}, got ${chainId}`);
      }

      this.connected = true;
      return true;
    } catch (error) {
      console.error('[Uniswap] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.sessionKey = null;
  }

  getCapabilities(): ConnectorCapabilities {
    return { spot: true, perps: false, lp: true, options: false };
  }

  setSessionKey(privateKey: string): void {
    this.sessionKey = privateKey;
  }

  async getMidPrice(pair: string): Promise<number> {
    try {
      const [base, quote] = this.parsePair(pair);
      const tokens = TOKEN_ADDRESSES[this.chainId] || {};
      const baseAddr = tokens[base];
      const quoteAddr = tokens[quote] || tokens.USDC;

      if (!baseAddr || !quoteAddr) return 0;

      // Use 1inch API for price
      if (this.oneInchApiKey) {
        const response = await this.fetchWithTimeout(
          `https://api.1inch.dev/price/v1.1/${this.chainId}/${baseAddr}?currency=USD`,
          { headers: { Authorization: `Bearer ${this.oneInchApiKey}` } }
        );
        const data = await response.json();
        return parseFloat(data?.[baseAddr] || '0');
      }

      // Fallback: CoinGecko
      const cgIds: Record<string, string> = { ETH: 'ethereum', WBTC: 'bitcoin', ARB: 'arbitrum' };
      const cgId = cgIds[base];
      if (cgId) {
        const response = await this.fetchWithTimeout(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`
        );
        const data = await response.json();
        return data?.[cgId]?.usd || 0;
      }

      return 0;
    } catch (error) {
      console.error(`[Uniswap] getMidPrice error for ${pair}:`, error);
      return 0;
    }
  }

  async getCandles(_pair: string, _interval: string = '5m', _count: number = 100): Promise<Candle[]> {
    // EVM DEXes don't provide candle data natively
    // Use DexScreener for token chart data
    return [];
  }

  async getOrderBook(pair: string): Promise<OrderBookData> {
    const midPrice = await this.getMidPrice(pair);
    const spread = midPrice * 0.002; // 0.2% estimated spread for EVM AMMs

    return {
      bids: [[midPrice - spread, 10000]],
      asks: [[midPrice + spread, 10000]],
      timestamp: Date.now(),
    };
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    if (!this.connected) return { success: false, error: 'Not connected' };
    if (!this.sessionKey) return { success: false, error: 'No session key configured' };

    try {
      const [base, quote] = this.parsePair(params.pair);
      const tokens = TOKEN_ADDRESSES[this.chainId] || {};
      const inputToken = params.side === 'buy' ? (tokens[quote] || tokens.USDC) : tokens[base];
      const outputToken = params.side === 'buy' ? tokens[base] : (tokens[quote] || tokens.USDC);

      if (!inputToken || !outputToken) {
        return { success: false, error: `Unknown token in pair ${params.pair}` };
      }

      // Use 1inch swap API
      const decimals = this.getTokenDecimals(inputToken);
      const amountRaw = BigInt(Math.floor(params.size * params.price * Math.pow(10, decimals))).toString();
      const walletAddress = this.getAddressFromSession();

      // 1. Get 1inch swap data (via circuit breaker)
      const swapUrl = `https://api.1inch.dev/swap/v6.0/${this.chainId}/swap?src=${inputToken}&dst=${outputToken}&amount=${amountRaw}&from=${walletAddress}&slippage=1&disableEstimate=false`;

      const response = await this.circuitBreaker.execute(() =>
        this.fetchWithTimeout(swapUrl, {
          headers: this.oneInchApiKey ? { Authorization: `Bearer ${this.oneInchApiKey}` } : {},
        })
      );
      const swapData = await response.json();

      if (swapData.error) {
        return { success: false, error: swapData.error || swapData.description };
      }

      // 2. Sign and send the transaction
      // In production: use ethers.Wallet to sign tx from swapData.tx
      const txHash = await this.signAndSendTransaction({
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value,
        gasLimit: swapData.tx.gas,
        gasPrice: swapData.tx.gasPrice,
      });

      return {
        success: !!txHash,
        txHash: txHash || undefined,
        orderId: txHash || undefined,
        error: txHash ? undefined : 'Transaction failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown swap error',
      };
    }
  }

  async cancelOrder(_pair: string, _orderId: string): Promise<boolean> {
    return false; // AMM swaps are atomic
  }

  async cancelAllOrders(): Promise<boolean> {
    return true;
  }

  async getPositions(): Promise<Position[]> {
    return []; // Spot DEX - positions = token balances
  }

  async closePosition(pair: string, size: number, direction: 'long' | 'short'): Promise<OrderResult> {
    return this.placeOrder({
      pair,
      side: direction === 'long' ? 'sell' : 'buy',
      price: await this.getMidPrice(pair),
      size,
      type: 'market',
    });
  }

  async getBalances(): Promise<BalanceInfo[]> {
    if (!this.sessionKey) return [];

    try {
      const address = this.getAddressFromSession();
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
      });
      const data = await response.json();
      const ethBalance = parseInt(data.result, 16) / 1e18;
      const ethPrice = await this.getMidPrice('ETH/USDC');

      return [{
        asset: 'ETH',
        free: ethBalance,
        locked: 0,
        total: ethBalance,
        valueUSD: ethBalance * ethPrice,
      }];
    } catch {
      return [];
    }
  }

  // LP Methods (via Uniswap V3 NonfungiblePositionManager)
  async createLPPosition(params: LPCreateParams): Promise<LPPosition> {
    if (!this.sessionKey) throw new Error('No session key for LP operations');

    const contracts = UNISWAP_CONTRACTS[this.chainId];
    if (!contracts) throw new Error(`Uniswap not deployed on chain ${this.chainId}`);

    const provider = new ethers.JsonRpcProvider(this.rpcUrl);
    const wallet = new ethers.Wallet(this.sessionKey, provider);
    const walletAddress = wallet.address;

    const tokens = TOKEN_ADDRESSES[this.chainId] || {};
    const token0Addr = tokens[params.token0] || params.token0;
    const token1Addr = tokens[params.token1] || params.token1;

    // Fee tier mapping: 0.003 -> 3000 (Uniswap uses basis points * 100)
    const fee = Math.round(params.feeTier * 1_000_000);
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

    const decimals0 = this.getTokenDecimals(token0Addr);
    const decimals1 = this.getTokenDecimals(token1Addr);
    const amount0Desired = ethers.parseUnits(params.amount0.toFixed(decimals0), decimals0);
    const amount1Desired = ethers.parseUnits(params.amount1.toFixed(decimals1), decimals1);
    // 1% slippage tolerance for LP
    const amount0Min = amount0Desired * 99n / 100n;
    const amount1Min = amount1Desired * 99n / 100n;

    // Approve tokens for NonfungiblePositionManager (skip for native ETH)
    const erc20Abi = ['function approve(address spender, uint256 amount) returns (bool)'];
    for (const [addr, amount] of [[token0Addr, amount0Desired], [token1Addr, amount1Desired]] as const) {
      if (addr !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
        const tokenContract = new ethers.Contract(addr, erc20Abi, wallet);
        const approveTx = await tokenContract.approve(contracts.positionManager, amount);
        await approveTx.wait(1);
      }
    }

    // Call NonfungiblePositionManager.mint()
    const npmAbi = [
      'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
    ];
    const npm = new ethers.Contract(contracts.positionManager, npmAbi, wallet);

    const mintParams = {
      token0: token0Addr < token1Addr ? token0Addr : token1Addr,
      token1: token0Addr < token1Addr ? token1Addr : token0Addr,
      fee,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired: token0Addr < token1Addr ? amount0Desired : amount1Desired,
      amount1Desired: token0Addr < token1Addr ? amount1Desired : amount0Desired,
      amount0Min: token0Addr < token1Addr ? amount0Min : amount1Min,
      amount1Min: token0Addr < token1Addr ? amount1Min : amount0Min,
      recipient: walletAddress,
      deadline,
    };

    const value = token0Addr === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? amount0Desired
      : token1Addr === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? amount1Desired
      : 0n;

    const tx = await npm.mint(mintParams, { value });
    const receipt = await tx.wait(1);

    // Parse tokenId from the Transfer event
    const transferLog = receipt.logs.find(
      (log: any) => log.address.toLowerCase() === contracts.positionManager.toLowerCase()
    );
    const tokenId = transferLog ? BigInt(transferLog.topics[3]).toString() : `uni_lp_${Date.now()}`;

    return {
      id: `uni_lp_${this.chainId}_${tokenId}`,
      pair: `${params.token0}/${params.token1}`,
      protocol: 'uniswap-v4' as const,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      liquidity: params.amount0 + params.amount1,
      token0Amount: params.amount0,
      token1Amount: params.amount1,
      feeTier: params.feeTier,
      unclaimedFees: { token0: 0, token1: 0 },
      valueUSD: 0,
      impermanentLoss: 0,
      inRange: true,
      createdAt: Date.now(),
      lastRebalance: Date.now(),
    };
  }

  async collectLPFees(positionId: string): Promise<LPCollectResult> {
    if (!this.sessionKey) {
      return { token0: 0, token1: 0, token0Symbol: 'ETH', token1Symbol: 'USDC', valueUSD: 0 };
    }

    try {
      const contracts = UNISWAP_CONTRACTS[this.chainId];
      if (!contracts) throw new Error(`Uniswap not deployed on chain ${this.chainId}`);

      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      const wallet = new ethers.Wallet(this.sessionKey, provider);

      // Extract tokenId from our position ID format: uni_lp_{chainId}_{tokenId}
      const parts = positionId.split('_');
      const tokenId = parts[parts.length - 1];

      const MAX_UINT128 = (1n << 128n) - 1n;

      const npmAbi = [
        'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) payable returns (uint256 amount0, uint256 amount1)',
      ];
      const npm = new ethers.Contract(contracts.positionManager, npmAbi, wallet);

      const tx = await npm.collect({
        tokenId: BigInt(tokenId),
        recipient: wallet.address,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      });
      const receipt = await tx.wait(1);

      // Parse collected amounts from event logs
      const collectEvent = receipt.logs[0];
      const amount0 = collectEvent ? Number(BigInt(collectEvent.data.slice(0, 66))) / 1e18 : 0;
      const amount1 = collectEvent ? Number(BigInt('0x' + collectEvent.data.slice(66))) / 1e6 : 0;

      return {
        token0: amount0,
        token1: amount1,
        token0Symbol: 'ETH',
        token1Symbol: 'USDC',
        valueUSD: 0, // Would need price oracle
      };
    } catch (error) {
      console.error('[Uniswap] collectLPFees error:', error);
      return { token0: 0, token1: 0, token0Symbol: 'ETH', token1Symbol: 'USDC', valueUSD: 0 };
    }
  }

  // Private helpers
  private parsePair(pair: string): [string, string] {
    const separator = pair.includes('/') ? '/' : pair.includes('-') ? '-' : '/';
    const parts = pair.split(separator);
    return [parts[0] || 'ETH', parts[1] || 'USDC'];
  }

  private getAddressFromSession(): string {
    if (!this.sessionKey) return '';
    return new ethers.Wallet(this.sessionKey).address;
  }

  private getTokenDecimals(address: string): number {
    const tokens = TOKEN_ADDRESSES[this.chainId] || {};
    if (address === tokens.USDC || address === tokens.USDT) return 6;
    if (address === tokens.WBTC) return 8;
    return 18; // ETH and most ERC-20s
  }

  private async signAndSendTransaction(tx: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
    gasPrice?: string;
  }): Promise<string | null> {
    if (!this.sessionKey) return null;

    try {
      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      const wallet = new ethers.Wallet(this.sessionKey, provider);

      const txRequest: ethers.TransactionRequest = {
        to: tx.to,
        data: tx.data,
        value: tx.value || '0x0',
      };

      // Use EIP-1559 gas pricing if available, fall back to legacy
      try {
        const feeData = await provider.getFeeData();
        if (feeData.maxFeePerGas) {
          txRequest.maxFeePerGas = feeData.maxFeePerGas;
          txRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          txRequest.gasPrice = tx.gasPrice ? BigInt(tx.gasPrice) : feeData.gasPrice;
        }
      } catch {
        if (tx.gasPrice) txRequest.gasPrice = BigInt(tx.gasPrice);
      }

      if (tx.gasLimit) {
        txRequest.gasLimit = BigInt(tx.gasLimit);
      }

      const txResponse = await wallet.sendTransaction(txRequest);
      const receipt = await txResponse.wait(1);

      if (!receipt || receipt.status === 0) {
        console.error('[Uniswap] TX reverted:', txResponse.hash);
        return null;
      }

      return txResponse.hash;
    } catch (error) {
      console.error('[Uniswap] signAndSend error:', error);
      return null;
    }
  }
}
